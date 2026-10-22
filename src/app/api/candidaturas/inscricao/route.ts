/** Candidatura autenticada com acesso imediato à entrevista; nunca publica o candidato. */
import { db, id, j, setStage, audit } from '@/lib/db';
import { requireUser, getClientIp } from '@/lib/auth';
import { assertSameOrigin, limit } from '@/lib/access-security';
import { ok, fail, handleApiError, readJson } from '@/lib/http';
import { buildInterviewPlan, newToken } from '@/lib/ai';

function reject(message: string, status = 400): never {
  const error: any = new Error(message);
  error.status = status;
  throw error;
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser(['CANDIDATO']);
    if (!user.candidate_id) return fail('Seu perfil de candidato não está vinculado à conta. Procure a equipe.', 409);
    await limit('candidate-apply', user.id, 30, 60);
    const body = await readJson(req, 4000);
    const jobId = String(body.job_id || '');
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(jobId)) return fail('Vaga inválida.', 400);

    const result = await db.transaction(async () => {
      // Repetir o clique, atualizar a página ou abrir duas abas não duplica entrevista.
      await db.prepare('SELECT pg_advisory_xact_lock(hashtext(?))').get(`apply:${user.candidate_id}:${jobId}`);
      const job = await db.prepare('SELECT * FROM jobs WHERE id = ? FOR SHARE').get(jobId);
      if (!job || !job.is_public) reject('Vaga não encontrada.', 404);
      if (!['aprovada', 'em_recrutamento'].includes(job.status)) reject('Esta vaga não está aberta para novas candidaturas.', 409);
      const candidate = await db.prepare('SELECT * FROM candidates WHERE id = ? AND user_id = ?').get(user.candidate_id, user.id);
      if (!candidate) reject('Não foi possível confirmar seu perfil de candidato. Procure a equipe.', 409);
      let application = await db.prepare('SELECT * FROM applications WHERE candidate_id = ? AND job_id = ?').get(candidate.id, jobId);
      if (application) {
        if (application.stage >= 15 || application.closed_reason) reject('Sua participação neste processo foi encerrada. Procure a equipe para mais informações.', 409);
        const previous = await db.prepare('SELECT * FROM interviews WHERE application_id = ? ORDER BY created_at DESC, id DESC LIMIT 1').get(application.id);
        if (previous) {
          if (previous.status === 'cancelada') reject('Esta entrevista foi cancelada pela equipe. Procure a Triatalent.', 410);
          return {application_id: application.id, token: previous.token, status: previous.status, reused: true};
        }
        // Não regredir processos já avaliados por inconsistência em registros antigos.
        if (application.stage >= 7) reject('Este processo já avançou para análise da equipe. Consulte suas candidaturas.', 409);
      }

      const plan = await buildInterviewPlan(job, candidate);
      if (!application) {
        const applicationId = id('apl');
        await db.prepare(`INSERT INTO applications (id,candidate_id,job_id,stage,stage_key,source)
          VALUES (?,?,?,2,'vinculado_vaga','Candidatura direta do portal')`).run(applicationId, candidate.id, jobId);
        application = {id: applicationId};
      }
      const token = newToken();
      await db.prepare(`INSERT INTO interviews (id,application_id,token,status,mode,ai_enabled,question_plan_json,invite_sent_at)
        VALUES (?,?,?,'convite_enviado',?,?,?,datetime('now'))`).run(id('int'), application.id, token, plan.mode, plan.mode === 'ia' ? 1 : 0, j(plan));
      await setStage(application.id, 'convite_enviado');
      return {application_id: application.id, token, status: 'convite_enviado', reused: false};
    })();
    if (!result.reused) await audit(user.id, 'candidatura_direta_entrevista', 'applications', result.application_id, {job_id: jobId}, await getClientIp());
    // O token é retornado somente para o candidato autenticado dono deste vínculo.
    return ok({application_id: result.application_id, interview_url: `/entrevista/${encodeURIComponent(result.token)}`, interview_status: result.status, reused: result.reused}, result.reused ? 200 : 201);
  } catch (e) { return handleApiError(e); }
}
