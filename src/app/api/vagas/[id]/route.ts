/** Detalhe, edição e exclusão de vaga — com isolamento por empresa. */
import { normalizeJobMoneyAndBenefits } from '@/lib/job-benefits';
import { listVisibleCandidatesForClient } from '@/lib/access';
import { db, audit, JOB_STATUSES } from '@/lib/db';
import { getSessionUser, getClientIp } from '@/lib/auth';
import { ok, fail, handleApiError, readJson } from '@/lib/http';

async function getJobForUser(jobId: string, user: any, write = false) {
  const job = await db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as any;
  if (!job) {
    const err: any = new Error('Vaga não encontrada.');
    err.status = 404;
    throw err;
  }
  if (user.role === 'CLIENTE' && job.company_id !== user.company_id) {
    const err: any = new Error('Você não tem acesso a esta vaga.');
    err.status = 403;
    throw err;
  }
  return job;
}

const EDITABLE = [
  'title', 'openings', 'description', 'objectives', 'activities', 'requirements_mandatory',
  'requirements_desirable', 'education', 'courses', 'experience', 'competencies', 'salary_min',
  'salary_max', 'salary_disclosed', 'benefits_config_json', 'benefits', 'contract_type', 'work_schedule', 'work_scale',
  'work_days', 'modality', 'address', 'city', 'state', 'neighborhood', 'start_date',
  'hiring_deadline', 'notes', 'confidential_info', 'is_public',
];

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return fail('Não autenticado.', 401);
    if (!['ADMIN','RECRUTADOR','CLIENTE'].includes(user.role)) return fail('Sem permissão.',403);
    const job = await getJobForUser((await params).id, user);
    // Informações confidenciais: só equipe interna
    if (user.role === 'CLIENTE') {delete job.confidential_info; delete job.review_note;}
    const apps = await db
      .prepare(
        `SELECT a.id, a.stage, a.stage_key, a.created_at, c.name AS candidate_name, c.title AS candidate_title,
                (SELECT COUNT(*) FROM unlocks u WHERE u.application_id = a.id) AS desbloqueado
         FROM applications a JOIN candidates c ON c.id = a.candidate_id
         WHERE a.job_id = ? ORDER BY a.created_at DESC`
      )
      .all((await params).id);
    // Cliente só vê candidatos já liberados — regra repetida aqui de propósito
    const visibleApps = user.role === 'CLIENTE' ? await listVisibleCandidatesForClient(user.company_id!, (await params).id) : apps;
    return ok({ job, applications: visibleApps });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return fail('Não autenticado.', 401);
    if (!['ADMIN','RECRUTADOR','CLIENTE'].includes(user.role)) return fail('Sem permissão.',403);
    const job = await getJobForUser((await params).id, user, true);
    if (user.role === 'CLIENTE' && !['rascunho', 'aguardando_aprovacao', 'pausada'].includes(job.status) && job.company_id === user.company_id) {
      // cliente pode editar rascunho ou devolver pausada; vaga em recrutamento fica com a Triatalent
    }
    const b = await readJson(req);
    delete b.benefits_config_json;
    normalizeJobMoneyAndBenefits(b,job);
    if(user.role === 'CLIENTE') {delete b.experience;delete b.competencies;delete b.requirements_desirable;delete b.confidential_info;}
    const sets: string[] = [];
    const params2: unknown[] = [];
    for (const field of EDITABLE) {
      if (b[field] !== undefined) {
        sets.push(`${field} = ?`);
        params2.push(typeof b[field] === 'boolean' ? (b[field] ? 1 : 0) : b[field]);
      }
    }
    if (!sets.length) return fail('Nada para atualizar.', 400);
    params2.push((await params).id);
    await db.prepare(`UPDATE jobs SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...params2);
    await audit(user.id, 'vaga_editada', 'jobs', (await params).id, undefined, await getClientIp());
    return ok({ msg: 'Vaga atualizada.' });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user || !['ADMIN'].includes(user.role)) return fail('Apenas administradores podem excluir vagas.', 403);
    await getJobForUser((await params).id, user);
    const hasApps = await db.prepare('SELECT id FROM applications WHERE job_id = ? LIMIT 1').get((await params).id);
    if (hasApps) return fail('Há candidatos vinculados a esta vaga. Cancele a vaga em vez de excluí-la.', 400);
    await db.prepare('DELETE FROM jobs WHERE id = ?').run((await params).id);
    await audit(user.id, 'vaga_excluida', 'jobs', (await params).id, undefined, await getClientIp());
    return ok({ msg: 'Vaga excluída.' });
  } catch (e) {
    return handleApiError(e);
  }
}
