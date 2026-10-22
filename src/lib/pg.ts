/**
 * Driver de banco de dados PostgreSQL (Supabase / Neon / Render).
 *
 * Por que este arquivo existe:
 *   O sistema foi criado com SQLite (arquivo local). Hospedagens gratuitas
 *   (Render, Railway, Vercel...) APAGAM o disco a cada reinício — o banco e os
 *   currículos sumiriam. Por isso o banco passou a morar num PostgreSQL na nuvem,
 *   que mantém os dados com garantia.
 *
 * Compatibilidade:
 *   Mantém a MESMA interface do driver antigo (prepare/get/all/run/exec/
 *   transaction), só que ASSÍNCRONA. Além disso o driver TRADUZ o SQL
 *   automaticamente, para não ser preciso reescrever as consultas:
 *
 *     ?                    ->  $1, $2, $3 ...   (placeholders do PostgreSQL)
 *     datetime('now')      ->  now_utc_text()   (função criada aqui, mesmo formato ISO)
 *     LIKE                 ->  ILIKE            (SQLite não diferencia maiúsculas;
 *                                                o PostgreSQL diferencia — ILIKE preserva o comportamento)
 *
 * Zero compilação: o pacote "pg" é JavaScript puro (não usa node-gyp/Python).
 */
import { Pool, PoolClient } from 'pg';
import { AsyncLocalStorage } from 'async_hooks';

/* ============================ TIPOS ============================ */

export interface Stmt {
  get(...params: unknown[]): Promise<any>;
  all(...params: unknown[]): Promise<any[]>;
  run(...params: unknown[]): Promise<{ changes: number; lastInsertRowid: number | bigint }>;
}

export interface Db {
  prepare(sql: string): Stmt;
  exec(sql: string): Promise<void>;
  /** Mantido só para compatibilidade — no PostgreSQL não há PRAGMA. */
  pragma(s: string): void;
  transaction<T extends (...args: any[]) => any>(fn: T): T;
  close(): Promise<void>;
}

/* ================== TRADUÇÃO DE SQL (SQLite -> PostgreSQL) ================== */

/**
 * Aplica `fn` apenas nos trechos de código do SQL, preservando intacto o
 * conteúdo de strings entre aspas simples (inclusive '' escapado).
 * Sem isso, um placeholder dentro de texto viraria $1 por engano.
 */
function mapCodeParts(sql: string, fn: (code: string) => string): string {
  let out = '';
  let buf = '';
  const flush = () => {
    if (buf) {
      out += fn(buf);
      buf = '';
    }
  };
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'") {
      flush();
      let j = i + 1;
      let literal = "'";
      while (j < sql.length) {
        if (sql[j] === "'") {
          if (sql[j + 1] === "'") {
            literal += "''";
            j += 2;
            continue;
          }
          literal += "'";
          j++;
          break;
        }
        literal += sql[j];
        j++;
      }
      out += literal;
      i = j - 1;
      continue;
    }
    buf += ch;
  }
  flush();
  return out;
}

/** Converte o SQL escrito em dialeto SQLite para o dialeto do PostgreSQL. */
export function translateSql(sql: string): string {
  // 1) datetime('now') -> now_utc_text()  (feito ANTES, porque contém aspas)
  let out = sql.replace(/datetime\s*\(\s*'now'\s*\)/gi, 'now_utc_text()');

  // 2) placeholders ? -> $n  e  LIKE -> ILIKE, sem tocar em strings literais
  let n = 0;
  out = mapCodeParts(out, (code) =>
    code
      .replace(/\?/g, () => `$${++n}`)
      .replace(/\bLIKE\b/g, 'ILIKE')
  );
  return out;
}

/** Parâmetros vindos de JSON podem trazer boolean/undefined — normaliza. */
function normalizeParam(v: unknown): unknown {
  if (v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v instanceof Date) return v.toISOString();
  return v;
}

/* ============================ CONEXÃO ============================ */

let pool: Pool | null = null;
let initPromise: Promise<void> | null = null;

/** Roteia as consultas de uma transação para a conexão certa. */
const txStore = new AsyncLocalStorage<PoolClient>();

function connectionString(): string {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.SUPABASE_DB_URL ||
    '';
  if (!url) {
    console.error(
      '\n  [ERRO] A variável DATABASE_URL não está definida.\n' +
        '  Ela diz ao sistema ONDE está o banco de dados na nuvem.\n' +
        '  Veja o guia: GUIA-PUBLICAR-NA-INTERNET.md\n'
    );
    throw new Error('DATABASE_URL não definida');
  }
  return url;
}

function getPool(): Pool {
  if (!pool) {
    const url = connectionString();
    // Supabase/Neon exigem TLS. rejectUnauthorized=false evita problema de
    // certificado em provedores gerenciados; o canal continua criptografado.
    const disableSsl = String(process.env.PGSSL || '').toLowerCase() === 'off';
    const wantsSsl = !disableSsl && (!url.includes('localhost') && !url.includes('127.0.0.1'));
    pool = new Pool({
      connectionString: url,
      max: Number(process.env.PG_POOL_MAX || 5),
      ssl: wantsSsl ? { rejectUnauthorized: false } : undefined,
      statement_timeout: 25_000,
      idleTimeoutMillis: 30_000,
    });
    pool.on('error', (e) => console.error('[pg] erro de conexão ociosa:', e.message));
  }
  return pool;
}

/**
 * Cria a função now_utc_text() uma única vez.
 * Ela devolve a data/hora no MESMO formato do JavaScript (toISOString),
 * ex.: 2026-10-16T17:33:00.123Z — assim as comparações de texto do sistema
 * continuam funcionando exatamente como no SQLite.
 */
async function ensureInit(client: PoolClient): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    await client.query(`
      CREATE OR REPLACE FUNCTION now_utc_text()
      RETURNS text
      LANGUAGE sql
      STABLE
      AS $fn$
        SELECT to_char((now() AT TIME ZONE 'utc'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
      $fn$
    `);
  })();
  try {
    await initPromise;
  } catch (e) {
    initPromise = null;
    throw e;
  }
}

async function withClient<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const active = txStore.getStore();
  if (active) return fn(active);
  const client = await getPool().connect();
  try {
    await ensureInit(client);
    return await fn(client);
  } finally {
    client.release();
  }
}

/* ============================ API ============================ */

function wrap(client: PoolClient, sql: string, params: unknown[]) {
  return client.query(sql, params.map(normalizeParam));
}

export function openDatabase(_ignored?: string): Db {
  const stmtFor = (rawSql: string): Stmt => {
    const sql = translateSql(rawSql);
    return {
      async all(...params: unknown[]) {
        const r = await withClient((c) => wrap(c, sql, params));
        return r.rows as any[];
      },
      async get(...params: unknown[]) {
        const r = await withClient((c) => wrap(c, sql, params));
        const row = r.rows[0];
        return row === undefined ? undefined : row;
      },
      async run(...params: unknown[]) {
        const r = await withClient((c) => wrap(c, sql, params));
        return { changes: r.rowCount ?? 0, lastInsertRowid: 0 };
      },
    };
  };

  return {
    prepare(sql: string) {
      return stmtFor(sql);
    },
    async exec(sql: string) {
      const translated = translateSql(sql);
      await withClient(async (c) => {
        await c.query(translated);
      });
    },
    pragma(_s: string) {
      /* no-op: PRAGMA é específico do SQLite */
    },
    transaction<T extends (...args: any[]) => any>(fn: T): T {
      const wrapped = (async (...args: any[]) => {
        const client = await getPool().connect();
        try {
          await ensureInit(client);
          await client.query('BEGIN');
          const result = await txStore.run(client, async () => fn(...args));
          await client.query('COMMIT');
          return result;
        } catch (e) {
          try {
            await client.query('ROLLBACK');
          } catch {
            /* ignore */
          }
          throw e;
        } finally {
          client.release();
        }
      }) as unknown as T;
      return wrapped;
    },
    async close() {
      if (pool) {
        await pool.end();
        pool = null;
      }
    },
  };
}
