import { SectionFilters } from '@/components/SectionFilters';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db, JOB_STATUSES } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { JobStatusBadge, Empty } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function AdminVagas({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const user = await getSessionUser();
  if (!user || !['ADMIN', 'RECRUTADOR'].includes(user.role)) redirect('/painel');

  const activeOnly = (await searchParams).filtro === 'ativas';
  const allRows = await db
    .prepare(
      `SELECT j.*, c.name AS company_name,
              (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS total
       FROM jobs j JOIN companies c ON c.id = j.company_id
       ORDER BY j.created_at DESC`
    )
    .all() as any[];

  const jobs = activeOnly ? allRows.filter((row) => ['aprovada','em_recrutamento','aguardando_avaliacao_cliente'].includes(row.status)) : allRows;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-900">Todas as vagas</h1>
        <Link href="/recrutamento/vagas/nova" className="btn-primary">+ Nova vaga</Link>
      </div>
      <SectionFilters items={[
        {label: 'Todas', href: '/admin/vagas', active: !activeOnly},
        {label: 'Vagas ativas', href: '/admin/vagas?filtro=ativas', active: activeOnly},
      ]} />
      {activeOnly && <p role="status" className="text-sm text-slate-600">Filtro: vagas ativas · {jobs.length} registro(s).</p>}
      <div className="card overflow-x-auto p-0">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Vaga</th>
              <th className="th">Empresa</th>
              <th className="th">Local</th>
              <th className="th">Candidatos</th>
              <th className="th">Status</th>
              <th className="th">Criada em</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {jobs.map((j) => (
              <tr key={j.id} className="hover:bg-slate-50">
                <td className="td font-medium">{j.title}</td>
                <td className="td">{j.company_name}</td>
                <td className="td">{j.city}/{j.state}</td>
                <td className="td">{j.total}</td>
                <td className="td"><JobStatusBadge status={j.status} /></td>
                <td className="td">{new Date(j.created_at).toLocaleDateString('pt-BR')}</td>
                <td className="td text-right">
                  <Link href={`/recrutamento/vagas/${j.id}`} className="btn-outline px-3 py-1.5 text-xs">Abrir</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {jobs.length === 0 && <div className="p-6"><Empty msg="Nenhuma vaga." /></div>}
      </div>
    </div>
  );
}
