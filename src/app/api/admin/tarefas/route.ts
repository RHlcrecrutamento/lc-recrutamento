/** Tarefas e lembretes da equipe + reembolso administrativo. */
import { db, id, audit } from '@/lib/db';
import { getSessionUser, getClientIp } from '@/lib/auth';
import { ok, fail, handleApiError, readJson } from '@/lib/http';
import { refundOrder } from '@/lib/payments';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || !['ADMIN', 'RECRUTADOR'].includes(user.role)) return fail('Sem permissão.', 403);
    const rows = await db
      .prepare(
        `SELECT t.*, a.stage_key, j.title AS job_title, c.name AS candidate_name
         FROM tasks t
         LEFT JOIN applications a ON a.id = t.application_id
         LEFT JOIN jobs j ON j.id = a.job_id
         LEFT JOIN candidates c ON c.id = a.candidate_id
         WHERE t.owner_id = ? OR ? = 'ADMIN'
         ORDER BY t.due_date IS NULL, t.due_date LIMIT 100`
      )
      .all(user.id, user.role);
    return ok(rows);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !['ADMIN', 'RECRUTADOR'].includes(user.role)) return fail('Sem permissão.', 403);
    const b = await readJson(req);

    if (b.action === 'concluir') {
      await db.prepare(`UPDATE tasks SET status = 'concluida' WHERE id = ?`).run(String(b.id));
      return ok({ msg: 'Tarefa concluída.' });
    }

    const title = String(b.title || '').trim();
    if (title.length < 3) return fail('Informe o título da tarefa.', 400);
    await db.prepare(
      `INSERT INTO tasks (id, owner_id, application_id, title, description, due_date, status) VALUES (?,?,?,?,?,?,'pendente')`
    ).run(id('tsk'), b.owner_id || user.id, b.application_id || null, title, String(b.description || ''), b.due_date || null);
    await audit(user.id, 'tarefa_criada', 'tasks', undefined, { title }, await getClientIp());
    return ok({ msg: 'Tarefa criada.' }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
