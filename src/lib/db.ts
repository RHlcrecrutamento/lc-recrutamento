/**
 * Núcleo do banco de dados (PostgreSQL na nuvem — Supabase).
 *
 * Toda regra de segurança de consulta (isolamento entre empresas,
 * anonimização e fluxo obrigatório) é aplicada no servidor.
 *
 * Importante: as funções que tocam o banco agora são ASSÍNCRONAS —
 * é preciso usar "await" ao chamá-las (getSetting, setSetting, audit, setStage).
 */
import path from 'path';
import fs from 'fs';
import { openDatabase, Db } from './pg';

export const db: Db = openDatabase();

/* ============================ HELPERS ============================ */
export function now() {
  return new Date().toISOString();
}
export function id(prefix = 'id') {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
}
export function j(v: unknown) {
  return JSON.stringify(v ?? null);
}
export function uj<T = any>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

/** Cria as tabelas caso ainda não existam (usado pelo script de preparação). */
export async function initSchema() {
  const schemaPath = path.join(process.cwd(), 'schema.sql');
  await db.exec(fs.readFileSync(schemaPath, 'utf8'));
}

/* ============================ SETTINGS ============================ */
const DEFAULT_SETTINGS: Record<string, unknown> = {
  price_per_unlock_cents: 4990,
  unlock_validity_days: 365,
  demo_payments: false,
  interview_min_questions: 8,
  interview_max_questions: 12,
  allow_candidate_registration: true,
  allow_public_jobs: true,
  company_name: 'Triatalent',
  support_email: 'contato@lcrecrutamento.com.br',
  retention_days_candidates: 730,
};

export function defaultSettings(): Record<string, unknown> {
  return { ...DEFAULT_SETTINGS };
}

export async function getSetting<T = any>(key: string): Promise<T> {
  const row = (await db
    .prepare('SELECT value_json FROM settings WHERE key = ?')
    .get(key)) as { value_json: string } | undefined;
  if (row) return uj(row.value_json, null as any);
  return DEFAULT_SETTINGS[key] as T;
}

export async function setSetting(key: string, value: unknown) {
  await db
    .prepare(
      `INSERT INTO settings (key, value_json, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = datetime('now')`
    )
    .run(key, j(value));
}

/** Garante que as configurações padrão existam (rodado na preparação). */
export async function ensureDefaultSettings() {
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
    const exists = await db.prepare('SELECT 1 FROM settings WHERE key = ?').get(k);
    if (!exists) await setSetting(k, v);
  }
}

/* ============================ AUDITORIA ============================ */
export async function audit(
  userId: string | null,
  action: string,
  entity?: string,
  entityId?: string,
  details?: unknown,
  ip?: string
) {
  try {
    await db
      .prepare(
        `INSERT INTO audit_logs (id, user_id, action, entity, entity_id, details_json, ip) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id('log'), userId, action, entity ?? null, entityId ?? null, details ? j(details) : null, ip ?? null);
  } catch (e) {
    console.error('audit error', e);
  }
}

/* ============================ TIPOS DE DOMÍNIO ============================ */
export type Role = 'ADMIN' | 'RECRUTADOR' | 'CLIENTE' | 'CANDIDATO';

export const STAGES = [
  { key: 'candidato_identificado', n: 1, label: 'Candidato identificado' },
  { key: 'vinculado_vaga', n: 2, label: 'Vinculado à vaga' },
  { key: 'convite_enviado', n: 3, label: 'Convite de entrevista enviado' },
  { key: 'entrevista_pendente', n: 4, label: 'Entrevista pendente' },
  { key: 'entrevista_agendada', n: 5, label: 'Entrevista agendada' },
  { key: 'entrevista_em_andamento', n: 6, label: 'Entrevista em andamento' },
  { key: 'entrevista_concluida', n: 7, label: 'Entrevista concluída' },
  { key: 'relatorio_aguardando_revisao', n: 8, label: 'Relatório aguardando revisão da Triatalent' },
  { key: 'informacoes_complementares', n: 9, label: 'Informações complementares' },
  { key: 'validado', n: 10, label: 'Entrevista e relatório validados' },
  { key: 'liberado_para_cliente', n: 11, label: 'Liberado para análise do cliente' },
  { key: 'cliente_manifestou_interesse', n: 12, label: 'Cliente manifestou interesse' },
  { key: 'dados_desbloqueados', n: 13, label: 'Dados de contato desbloqueados' },
  { key: 'entrevista_empresa', n: 14, label: 'Entrevista com a empresa / seleção' },
  { key: 'encerramento', n: 15, label: 'Encerramento do processo' },
] as const;

export const JOB_STATUSES: Record<string, string> = {
  rascunho: 'Rascunho',
  aguardando_aprovacao: 'Aguardando aprovação',
  aprovada: 'Aprovada',
  em_recrutamento: 'Em recrutamento',
  aguardando_avaliacao_cliente: 'Aguardando avaliação do cliente',
  pausada: 'Pausada',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

export async function setStage(applicationId: string, stageKey: string, extra?: Record<string, unknown>) {
  const st = STAGES.find((s) => s.key === stageKey);
  if (!st) throw new Error(`Etapa inválida: ${stageKey}`);
  const sets = ['stage = ?', 'stage_key = ?', "updated_at = datetime('now')"];
  const params: unknown[] = [st.n, st.key];
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      sets.push(`${k} = ?`);
      params.push(v);
    }
  }
  params.push(applicationId);
  await db.prepare(`UPDATE applications SET ${sets.join(', ')} WHERE id = ?`).run(...params);
}
