import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { Empty } from '@/components/ui';
import { TaskButtons } from '@/components/TaskButtons';

export const dynamic = 'force-dynamic';

export default async function TarefasPage() {
  const user = await getSessionUser();
  if (!user) redirect('/entrar');
  if (!['ADMIN', 'RECRUTADOR'].includes(user.role)) redirect('/painel');

  const rows = await db
    .prepare(
      `SELECT t.*, j.title AS job_title, c.name AS candidate_name
       FROM tasks t
       LEFT JOIN applications a ON a.id = t.application_id
       LEFT JOIN jobs j ON j.id = a.job_id
       LEFT JOIN candidates c ON c.id = a.candidate_id
       WHERE t.owner_id = ? OR ? = 'ADMIN'
       ORDER BY t.status = 'concluida', t.due_date IS NULL, t.due_date`
    )
    .all(user.id, user.role) as any[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-900">Tarefas e lembretes</h1>
      {rows.length === 0 && <Empty msg="Nenhuma tarefa. Crie tarefas para acompanhar contatos e prazos." />}
      <div className="space-y-2">
        {rows.map((t) => (
          <div key={t.id} className={`card flex flex-wrap items-center justify-between gap-3 ${t.status === 'concluida' ? 'opacity-60' : ''}`}>
            <div>
              <p className={`text-sm font-medium ${t.status === 'concluida' ? 'line-through' : ''}`}>{t.title}</p>
              <p className="text-xs text-slate-500">
                {t.candidate_name ? `${t.candidate_name} — ${t.job_title}` : 'Tarefa geral'}
                {t.due_date ? ` · Vence em ${t.due_date}` : ''}
              </p>
              {t.description && <p className="mt-1 text-xs text-slate-600">{t.description}</p>}
            </div>
            {t.status !== 'concluida' && <TaskButtons taskId={t.id} />}
          </div>
        ))}
      </div>
    </div>
  );
}
