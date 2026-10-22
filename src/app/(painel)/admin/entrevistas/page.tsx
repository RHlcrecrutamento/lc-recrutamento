import { SectionFilters } from '@/components/SectionFilters';
/** Entrevistas e relatórios — visão administrativa/recrutador. */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { ReportStatusBadge, Empty, StageBadge } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function AdminEntrevistas({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const user = await getSessionUser();
  if (!user || !['ADMIN', 'RECRUTADOR'].includes(user.role)) redirect('/painel');

  const requested = (await searchParams).filtro || '';
  const filtro = ['pendentes', 'em_andamento', 'concluidas', 'revisar'].includes(requested) ? requested : '';
  const allReports = await db
    .prepare(
      `SELECT r.*, a.stage, a.stage_key, c.name AS candidate_name, j.title AS job_title, co.name AS company_name
       FROM reports r
       JOIN applications a ON a.id = r.application_id
       JOIN candidates c ON c.id = a.candidate_id
       JOIN jobs j ON j.id = a.job_id
       JOIN companies co ON co.id = j.company_id
       ORDER BY CASE r.status WHEN 'aguardando_revisao' THEN 0 WHEN 'complementacao_solicitada' THEN 1 ELSE 2 END, r.created_at DESC`
    )
    .all() as any[];

  const allInterviews = await db
    .prepare(
      `SELECT i.*, c.name AS candidate_name, j.title AS job_title
       FROM interviews i
       JOIN applications a ON a.id = i.application_id
       JOIN candidates c ON c.id = a.candidate_id
       JOIN jobs j ON j.id = a.job_id
       ORDER BY CASE i.status WHEN 'convite_enviado' THEN 0 WHEN 'em_andamento' THEN 1 ELSE 2 END, i.created_at DESC
`
    )
    .all() as any[];

  const reports = filtro === 'revisar' ? allReports.filter(r => r.status === 'aguardando_revisao') : allReports;
  const interviews = allInterviews.filter(i => !filtro || (filtro === 'pendentes' ? ['convite_enviado','convite_visualizado'].includes(i.status) : filtro === 'em_andamento' ? i.status === 'em_andamento' : filtro === 'concluidas' ? i.status === 'concluida' : false));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Entrevistas e relatórios</h1>
        <p className="text-sm text-slate-500">
          A revisão humana é obrigatória: relatórios da IA nunca são validados automaticamente.
        </p>
      </div>

      <SectionFilters items={[
        {label: 'Tudo', href: '/admin/entrevistas', active: !filtro},
        {label: 'Entrevistas pendentes', href: '/admin/entrevistas?filtro=pendentes', active: filtro === 'pendentes'},
        {label: 'Em andamento', href: '/admin/entrevistas?filtro=em_andamento', active: filtro === 'em_andamento'},
        {label: 'Concluídas', href: '/admin/entrevistas?filtro=concluidas', active: filtro === 'concluidas'},
        {label: 'Relatórios a revisar', href: '/admin/entrevistas?filtro=revisar', active: filtro === 'revisar'},
      ]} />
      {(!filtro || filtro === 'revisar') && <section className="card">
        <h2 className="mb-3 font-semibold text-brand-900">Relatórios ({reports.length})</h2>
        <div className="space-y-2">
          {reports.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 p-3">
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {r.candidate_name} — {r.job_title} <span className="text-xs text-slate-400">({r.company_name})</span>
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <ReportStatusBadge status={r.status} />
                  <StageBadge stage={r.stage} stageKey={r.stage_key} />
                  {typeof r.compatibility_score === 'number' && (
                    <span className="badge bg-brand-100 text-brand-800">{r.compatibility_score}%</span>
                  )}
                </div>
              </div>
              <Link href={`/recrutamento/relatorio/${r.id}`} className="btn-primary px-3 py-1.5 text-xs">
                {r.status === 'aguardando_revisao' ? 'Revisar' : 'Abrir'}
              </Link>
            </div>
          ))}
          {reports.length === 0 && <Empty msg="Nenhum relatório gerado." />}
        </div>
      </section>}

      {filtro !== 'revisar' && <section className="card">
        <h2 className="mb-3 font-semibold text-brand-900">Entrevistas ({interviews.length})</h2>
        <div className="space-y-2">
          {interviews.map((i) => (
            <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 p-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{i.candidate_name} — {i.job_title}</p>
                <p className="text-xs text-slate-500">
                  Status: {i.status.replace(/_/g, ' ')} · Convites enviados: {i.invite_count}
                  {i.completed_at ? ` · Concluída ${new Date(i.completed_at).toLocaleString('pt-BR')}` : ''}
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">/entrevista/{i.token.slice(0, 12)}…</span>
            </div>
          ))}
        </div>
        {interviews.length === 0 && <Empty msg="Nenhuma entrevista neste filtro." />}
      </section>}
    </div>
  );
}
