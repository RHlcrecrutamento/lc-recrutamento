/**
 * Regras CENTRAIS de visibilidade — aplicadas no servidor, nunca só na interface.
 *
 * REGRA INEGOCIÁVEL: um cliente só vê um candidato DEPOIS de:
 *   1) entrevista online CONCLUÍDA  2) relatório VALIDADO por humano da Triatalent
 *   3) candidato LIBERADO para o cliente.
 *
 * Dados de contato só aparecem após pagamento CONFIRMADO no servidor.
 */
import { validUnlockSql } from './payment-rules';
import { redactPublicText, reviewedResume } from './resumes';
import { db, uj, getSetting } from './db';
import type { SessionUser } from './auth';

export interface AnonymizedCandidate {
  code: string;
  title: string | null;
  professional_summary: string | null;
  education: string | null;
  courses: string | null;
  skills: string | null;
  experience: string | null;
  availability: string | null;
  salary_expectation: string | null;
  city_region: string | null;
  resume_text: string | null;
  contact: {
    unlocked: boolean;
    name?: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    unlocked_at?: string;
    expires_at?: string | null;
  };
}

export async function isReleasedToClient(applicationId: string): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT a.stage, a.team_decision, a.closed_reason, i.status AS interview_status, r.status AS report_status, r.published_at
       FROM applications a
       LEFT JOIN interviews i ON i.application_id = a.id
       LEFT JOIN reports r ON r.application_id = a.id
       WHERE a.id = ?`
    )
    .get(applicationId) as any;
  if (!row) return false;
  return (
    row.team_decision !== 'reprovado' && !row.closed_reason && row.stage >= 11 &&
    row.interview_status === 'concluida' &&
    row.report_status === 'validado' &&
    !!row.published_at
  );
}

/** Código estável e não identificável do candidato para exibição ao cliente. */
export function candidateCode(candidateId: string): string {
  const n = Math.abs(
    [...candidateId].reduce((a, c) => a + c.charCodeAt(0) * 7, 0) % 900000 + 100000
  );
  return `CAND-${n}`;
}

function regionOf(city?: string | null, state?: string | null): string | null {
  const c = (city || '').trim();
  const s = (state || '').trim().toUpperCase();
  if (c && s) return `${c}/${s}`;
  if (c) return c;
  if (s) return s;
  return null;
}

/**
 * Monta o perfil anonimizado. Sempre remove: nome, CPF, telefone, e-mail,
 * endereço residencial, foto, links pessoais e arquivos originais.
 * Contato só entra se houver unlock válido para a MESMA empresa.
 */
export async function getAnonymizedCandidate(applicationId: string, viewer: SessionUser): Promise<AnonymizedCandidate | null> {
  const row = await db
    .prepare(
      `SELECT a.id AS application_id, a.stage, a.team_decision, a.closed_reason, j.company_id, c.*, i.status AS interview_status,
              r.status AS report_status, r.published_at
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN candidates c ON c.id = a.candidate_id
       LEFT JOIN interviews i ON i.application_id = a.id
       LEFT JOIN reports r ON r.application_id = a.id
       WHERE a.id = ?`
    )
    .get(applicationId) as any;
  if (!row) return null;

  const isClient = viewer.role === 'CLIENTE';
  const isInternal = viewer.role === 'ADMIN' || viewer.role === 'RECRUTADOR';

  if (isClient) {
    // Isolamento entre empresas + fluxo obrigatório
    if (row.company_id !== viewer.company_id) return null;
    if (!(row.team_decision !== 'reprovado' && !row.closed_reason && row.stage >= 11 && row.interview_status === 'concluida' && row.report_status === 'validado' && row.published_at)) {
      return null;
    }
  } else if (!isInternal) {
    return null;
  }

  // Unlock válido para esta empresa?
  let contact: AnonymizedCandidate['contact'] = { unlocked: false };
  const unlock = await db
    .prepare(
      `SELECT u.fields_json, u.created_at, u.expires_at, u.revoked_at
       FROM unlocks u WHERE u.application_id = ? AND u.company_id = ? AND ${validUnlockSql()}
       ORDER BY u.created_at DESC LIMIT 1`
    )
    .get(applicationId, row.company_id) as any;

  if (unlock && (!unlock.expires_at || new Date(unlock.expires_at) > new Date())) {
    const fields = uj<{ name?: boolean; email?: boolean; phone?: boolean; whatsapp?: boolean }>(unlock.fields_json, {});
    contact = {
      unlocked: true,
      unlocked_at: unlock.created_at,
      expires_at: unlock.expires_at,
    };
    // Libera SOMENTE os campos autorizados no unlock (nada além deles)
    if (fields.name) contact.name = row.name;
    if (fields.email) contact.email = row.email;
    if (fields.phone) contact.phone = row.phone;
    if (fields.whatsapp) contact.whatsapp = row.whatsapp || row.phone;
  }

  return {
    code: candidateCode(row.id),
    title: redactPublicText(row.title, row) || null,
    professional_summary: redactPublicText(row.professional_summary, row) || null,
    education: redactPublicText(row.education, row) || null,
    courses: redactPublicText(row.courses, row) || null,
    skills: redactPublicText(row.skills, row) || null,
    experience: redactPublicText(row.experience, row) || null,
    availability: redactPublicText(row.availability, row) || null,
    salary_expectation: redactPublicText(row.salary_expectation, row) || null,
    city_region: regionOf(row.city, row.state),
    resume_text: await reviewedResume(row),
    contact,
  };
}

/**
 * Lista para o painel do cliente — filtra por empresa, entrevista
 * concluída, relatório validado e publicado. Nunca retorna pendentes.
 */
export async function listVisibleCandidatesForClient(companyId: string, jobId?: string) {
  const params: unknown[] = [companyId, companyId];
  let jobFilter = '';
  if (jobId) {
    jobFilter = ' AND a.job_id = ?';
    params.push(jobId);
  }
  const rows = await db
    .prepare(
      `SELECT c.name AS _private_name, c.email AS _private_email, c.phone AS _private_phone, c.whatsapp AS _private_whatsapp, c.cpf AS _private_cpf, NULL AS _private_address, a.id AS application_id, a.job_id, a.stage, a.client_interest, a.client_decision,
              a.released_at, c.id AS candidate_id, c.title, c.city, c.state, c.skills,
              c.professional_summary, c.salary_expectation, c.availability,
              j.title AS job_title,
              r.compatibility_score, r.public_summary_json,
              (SELECT COUNT(*) FROM unlocks u WHERE u.application_id = a.id AND u.company_id = ? AND ${validUnlockSql()}) AS unlocked
       FROM applications a
       JOIN candidates c ON c.id = a.candidate_id
       JOIN jobs j ON j.id = a.job_id
       JOIN interviews i ON i.application_id = a.id AND i.status = 'concluida'
       JOIN reports r ON r.application_id = a.id AND r.status = 'validado' AND r.published_at IS NOT NULL
       WHERE j.company_id = ? AND a.stage >= 11 AND COALESCE(a.team_decision,'') <> 'reprovado' AND a.closed_reason IS NULL ${jobFilter}
       ORDER BY a.released_at DESC`
    )
    .all(...params);
  return rows.map((row: any) => {
    const {_private_name:name,_private_email:email,_private_phone:phone,_private_whatsapp:whatsapp,_private_cpf:cpf,_private_address:address,...safe}=row;
    const identity={name,email,phone,whatsapp,cpf,address};
    for(const key of ['title','professional_summary','skills','availability','salary_expectation']) safe[key]=redactPublicText(safe[key],identity);
    safe.unlocked=Number(safe.unlocked)>0;
    return safe;
  });
}

/** Preço do desbloqueio: SEMPRE do servidor, nunca do navegador. */
export async function getUnlockPriceCents(companyId?: string | null): Promise<number> {
  if (companyId) {
    const c = await db.prepare('SELECT price_per_unlock_cents FROM companies WHERE id = ?').get(companyId) as any;
    if (c && c.price_per_unlock_cents != null) return c.price_per_unlock_cents;
  }
  return await getSetting<number>('price_per_unlock_cents') || 4990;
}

export async function hasValidUnlock(applicationId: string, companyId: string): Promise<boolean> {
  const u = await db
    .prepare(
      `SELECT 1 FROM unlocks u WHERE u.application_id = ? AND u.company_id = ? AND ${validUnlockSql()} LIMIT 1`
    )
    .get(applicationId, companyId);
  return !!u;
}
