/**
 * Vinculação de candidato a vaga → cria entrevista e envia convite.
 * FLUXO OBRIGATÓRIO: a vinculação SEMPRE gera convite de entrevista.
 * Nenhuma liberação ao cliente acontece aqui.
 */
import { db, id, audit, setStage, now, j } from '@/lib/db';
import { getSessionUser, getClientIp } from '@/lib/auth';
import { ok, fail, handleApiError, readJson } from '@/lib/http';
import { buildInterviewPlan, newToken } from '@/lib/ai';

export async function POST(req:Request){
 const user=await getSessionUser();
 if(!user||!['ADMIN','RECRUTADOR'].includes(user.role))return fail('Sem permissão.',403);
 return fail('A inscrição deve ser feita pelo próprio candidato na vaga escolhida. A vinculação manual foi desativada.',403);
}

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return fail('Não autenticado.', 401);
    const url = new URL(req.url);
    const jobId = url.searchParams.get('job_id') || '';
    const stage = url.searchParams.get('etapa') || '';

    if (user.role === 'CLIENTE') {
      // Lista de liberados — usa a função central de visibilidade
      const { listVisibleCandidatesForClient } = await import('@/lib/access');
      return ok(await listVisibleCandidatesForClient(user.company_id!, jobId || undefined));
    }
    if (!['ADMIN', 'RECRUTADOR'].includes(user.role)) return fail('Sem permissão.', 403);

    let sql = `SELECT a.*, c.name AS candidate_name, c.title AS candidate_title, c.city, c.email, c.phone,
                      j.title AS job_title, j.company_id, co.name AS company_name,
                      i.status AS interview_status, i.token AS interview_token, i.completed_at,
                      r.status AS report_status, r.id AS report_id, r.compatibility_score
               FROM applications a
               JOIN candidates c ON c.id = a.candidate_id
               JOIN jobs j ON j.id = a.job_id
               JOIN companies co ON co.id = j.company_id
               LEFT JOIN interviews i ON i.application_id = a.id
               LEFT JOIN reports r ON r.application_id = a.id
               WHERE 1=1`;
    const params: unknown[] = [];
    if (jobId) {
      sql += ' AND a.job_id = ?';
      params.push(jobId);
    }
    if (stage) {
      sql += ' AND a.stage_key = ?';
      params.push(stage);
    }
    sql += ' ORDER BY a.updated_at DESC LIMIT 300';
    return ok(await db.prepare(sql).all(...params));
  } catch (e) {
    return handleApiError(e);
  }
}
