import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { JobStatusBadge, Empty } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function ClienteVagas({searchParams}:{searchParams:Promise<{status?:string}>}) {
  const activeOnly=(await searchParams).status==='ativas';
  const user = await getSessionUser();
  if (!user) redirect('/entrar');
  if (user.role !== 'CLIENTE') redirect('/painel');

  const jobs = await db
    .prepare(
      `SELECT j.*,
              (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id AND a.stage >= 11) AS liberados,
              (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS pipeline
       FROM jobs j WHERE j.company_id = ? ${activeOnly ? "AND j.status NOT IN ('cancelada','concluida')" : ''} ORDER BY j.created_at DESC`
    )
    .all(user.company_id) as any[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">{activeOnly?'Vagas ativas':'Minhas vagas'}</h1>
          <p className="text-sm text-slate-500">Cadastre, acompanhe a aprovação e veja os candidatos liberados.</p>
        </div>
        <Link href="/cliente/vagas/nova" className="btn-primary">+ Cadastrar nova vaga</Link>
      </div>

      {activeOnly && <Link href="/cliente/vagas" className="text-sm text-brand-700 underline">Ver todas as vagas</Link>}
      {jobs.length === 0 && <Empty msg="Você ainda não cadastrou nenhuma vaga." />}
      <div className="grid gap-4 sm:grid-cols-2">
        {jobs.map((j) => (
          <Link key={j.id} href={`/cliente/vagas/${j.id}`} className="card hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold text-brand-900">{j.title}</h2>
                <p className="text-xs text-slate-500">{j.city}/{j.state} · {j.openings} vaga(s) · {j.modality}</p>
              </div>
              <JobStatusBadge status={j.status} />
            </div>
            <div className="mt-3 flex gap-2">
              <span className="badge bg-brand-100 text-brand-800">{j.liberados} liberado(s)</span>
              <span className="badge bg-slate-100 text-slate-600">{j.pipeline} no processo</span>
            </div>
            <p className="mt-2 line-clamp-2 text-xs text-slate-600">{j.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
