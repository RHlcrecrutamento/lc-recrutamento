/** Ações sobre a candidatura: etapa do pipeline, encerrar, reenviar convite. */
import { assertSameOrigin } from '@/lib/access-security';
import { db, id, audit, setStage, STAGES, j } from '@/lib/db';
import { getSessionUser, getClientIp } from '@/lib/auth';
import { ok, fail, handleApiError, readJson } from '@/lib/http';
import { buildInterviewPlan, newToken } from '@/lib/ai';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return fail('Não autenticado.', 401);
  const app = await db
    .prepare(
      `SELECT a.id, a.candidate_id, a.job_id, a.recruiter_id, a.stage, a.stage_key, a.source,
              a.released_at, a.released_by, a.client_interest, a.client_interest_at,
              a.client_decision, a.client_decision_note, a.closed_reason,
              a.created_at AS application_created_at, a.updated_at AS application_updated_at,
              c.name AS candidate_name, c.email AS candidate_email, c.phone AS candidate_phone,
              j.title AS job_title, j.company_id, co.name AS company_name
       FROM applications a
       JOIN candidates c ON c.id = a.candidate_id
       JOIN jobs j ON j.id = a.job_id
       JOIN companies co ON co.id = j.company_id
       WHERE a.id = ?`
    )
    .get((await params).id) as any;
    if (!app) return fail('Candidatura não encontrada.', 404);
    if (user.role === 'CLIENTE') {
      if (app.company_id !== user.company_id) return fail('Sem permissão.', 403);
      const { getAnonymizedCandidate } = await import('@/lib/access');
      const anon = await getAnonymizedCandidate((await params).id, user);
      if (!anon) return fail('Este candidato ainda não está disponível para análise.', 403);
      return ok({ application: { id: app.id, stage: app.stage, stage_key: app.stage_key, job_title: app.job_title }, candidate: anon });
    }
    if (!['ADMIN', 'RECRUTADOR'].includes(user.role)) return fail('Sem permissão.', 403);

    const interviews = await db.prepare('SELECT * FROM interviews WHERE application_id = ?').all((await params).id);
    const reports = await db.prepare('SELECT * FROM reports WHERE application_id = ?').all((await params).id);
    const attempts = await db.prepare('SELECT * FROM contact_attempts WHERE application_id = ? ORDER BY created_at DESC').all((await params).id);
    return ok({ application: app, interviews, reports, contact_attempts: attempts });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user || !['ADMIN', 'RECRUTADOR'].includes(user.role)) return fail('Sem permissão.', 403);
    assertSameOrigin(req);
    const b = await readJson(req);
    const app = await db.prepare('SELECT * FROM applications WHERE id = ?').get((await params).id) as any;
    if (!app) return fail('Candidatura não encontrada.', 404);

    if(['encerrar','etapa'].includes(b.action))return fail('O pipeline manual foi substituído. Abra a análise do candidato e aprove ou reprove pela revisão simples.',409);
    if (b.action === 'registro_contato') {
      await db.prepare(`INSERT INTO contact_attempts (id, application_id, recruiter_id, attempt_type, notes) VALUES (?,?,?,?,?)`).run(
        id('cta'), (await params).id, user.id, String(b.tipo || 'Outro'), String(b.notas || '')
      );
      await audit(user.id, 'contato_registrado', 'applications', (await params).id, { tipo: b.tipo }, await getClientIp());
      return ok({ msg: 'Tentativa de contato registrada.' });
    }
    return fail('Ação inválida.', 400);
  } catch (e) {
    return handleApiError(e);
  }
}
