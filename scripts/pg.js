/**
 * Driver PostgreSQL para os SCRIPTS (CommonJS).
 * É a mesma lógica de src/lib/pg.ts, só que em require() para os scripts
 * de preparação (setup), dados de exemplo (seed) e testes.
 *
 * Traduz o SQL escrito em dialeto SQLite:
 *   ?               -> $1, $2 ...
 *   datetime('now') -> now_utc_text()
 *   LIKE            -> ILIKE
 */
const { Pool } = require('pg');
const { AsyncLocalStorage } = require('async_hooks');

function mapCodeParts(sql, fn) {
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

function translateSql(sql) {
  let out = sql.replace(/datetime\s*\(\s*'now'\s*\)/gi, 'now_utc_text()');
  let n = 0;
  out = mapCodeParts(out, (code) => code.replace(/\?/g, () => `$${++n}`).replace(/\bLIKE\b/g, 'ILIKE'));
  return out;
}

function normalizeParam(v) {
  if (v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v instanceof Date) return v.toISOString();
  return v;
}

let pool = null;
let initPromise = null;
const txStore = new AsyncLocalStorage();

function getPool() {
  if (!pool) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
    if (!url) {
      console.error(
        '\n  [ERRO] A variável DATABASE_URL não está definida.\n' +
          '  Ela diz ao sistema ONDE está o banco de dados.\n'
      );
      process.exit(1);
    }
    const remote = !url.includes('localhost') && !url.includes('127.0.0.1');
    pool = new Pool({
      connectionString: url,
      max: Number(process.env.PG_POOL_MAX || 5),
      ssl: remote ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

async function ensureInit(client) {
  if (initPromise) return initPromise;
  initPromise = client.query(`
    CREATE OR REPLACE FUNCTION now_utc_text()
    RETURNS text LANGUAGE sql STABLE
    AS $fn$ SELECT to_char((now() AT TIME ZONE 'utc'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') $fn$
  `);
  try {
    await initPromise;
  } catch (e) {
    initPromise = null;
    throw e;
  }
}

async function withClient(fn) {
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

function openDatabase() {
  const stmtFor = (rawSql) => {
    const sql = translateSql(rawSql);
    return {
      async all(...params) {
        const r = await withClient((c) => c.query(sql, params.map(normalizeParam)));
        return r.rows;
      },
      async get(...params) {
        const r = await withClient((c) => c.query(sql, params.map(normalizeParam)));
        return r.rows[0];
      },
      async run(...params) {
        const r = await withClient((c) => c.query(sql, params.map(normalizeParam)));
        return { changes: r.rowCount || 0, lastInsertRowid: 0 };
      },
    };
  };

  return {
    prepare: (sql) => stmtFor(sql),
    async exec(sql) {
      await withClient((c) => c.query(translateSql(sql)));
    },
    pragma() {},
    transaction(fn) {
      return async (...args) => {
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
          } catch {}
          throw e;
        } finally {
          client.release();
        }
      };
    },
    async close() {
      if (pool) {
        await pool.end();
        pool = null;
      }
    },
  };
}

module.exports = { openDatabase, translateSql };
