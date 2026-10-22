/** Transições de status da vaga (aprovação, recrutamento, pausa etc.). */
import { reviewJob } from '@/lib/triage';
import { db, audit, JOB_STATUSES } from '@/lib/db';
import { getSessionUser, getClientIp } from '@/lib/auth';
import { ok, fail, handleApiError, readJson } from '@/lib/http';

const TRANSITIONS: Record<string, string[]> = {
  rascunho: ['aguardando_aprovacao', 'cancelada'],
  aguardando_aprovacao: ['aprovada', 'rascunho', 'cancelada'],
  aprovada: ['em_recrutamento', 'pausada', 'cancelada'],
  em_recrutamento: ['aguardando_avaliacao_cliente', 'pausada', 'concluida', 'cancelada'],
  aguardando_avaliacao_cliente: ['em_recrutamento', 'concluida', 'pausada', 'cancelada'],
  pausada: ['em_recrutamento', 'cancelada', 'concluida'],
  concluida: [],
  cancelada: [],
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return fail('Não autenticado.', 401);
    if(!['ADMIN','RECRUTADOR','CLIENTE'].includes(user.role)) return fail('Sem permissão.',403);
    const b = await readJson(req);
    const next = String(b.status || '');
    const job = await db.prepare('SELECT * FROM jobs WHERE id = ?').get((await params).id) as any;
    if (!job) return fail('Vaga não encontrada.', 404);
    if (user.role === 'CLIENTE' && job.company_id !== user.company_id) return fail('Sem permissão.', 403);

    if (!TRANSITIONS[job.status]?.includes(next)) {
      return fail(`Transição inválida: ${JOB_STATUSES[job.status]} → ${JOB_STATUSES[next] || next}.`, 400);
    }
    // Aprovação é ato da equipe Triatalent
    if (next === 'aprovada' && user.role === 'CLIENTE') {
      return fail('A aprovação da vaga é realizada pela equipe Triatalent.', 403);
    }

    if(next === 'aprovada') return ok(await reviewJob(job.id,'aprovada','',user.id));
    await db.prepare(`UPDATE jobs SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(next, (await params).id);
    if (next === 'aprovada') {
      await db.prepare(`UPDATE jobs SET approved_by = ?, approved_at = datetime('now') WHERE id = ?`).run(user.id, (await params).id);
      // vaga aprovada entra em recrutamento automaticamente no painel Triatalent
    }
    await audit(user.id, 'vaga_status', 'jobs', (await params).id, { from: job.status, to: next }, await getClientIp());
    return ok({ status: next });
  } catch (e) {
    return handleApiError(e);
  }
}
