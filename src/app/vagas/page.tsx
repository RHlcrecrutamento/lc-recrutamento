/** Páginas públicas de vagas. */
import Link from 'next/link';
import { db, getSetting, JOB_STATUSES } from '@/lib/db';
import { Logo } from '@/components/Logo';

export const dynamic = 'force-dynamic';

function PublicHeader() {
  return (
    <header className="border-b border-slate-100 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/">
          <Logo size={38} />
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/entrar" className="btn-outline">
            Entrar
          </Link>
          <Link href="/cadastro" className="btn-primary">
            Sou candidato
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default async function VagasPublicas() {
  const jobs = await db
    .prepare(
      `SELECT j.*, c.name AS company_name FROM jobs j JOIN companies c ON c.id = j.company_id
       WHERE j.is_public = 1 AND j.status IN ('aprovada','em_recrutamento') ORDER BY j.created_at DESC`
    )
    .all() as any[];

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicHeader />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-bold text-brand-900">Vagas abertas</h1>
        <p className="mt-1 text-slate-600">
          Candidate-se gratuitamente. Após o cadastro, você poderá participar da entrevista online.
        </p>
        <div className="mt-8 grid gap-4">
          {jobs.length === 0 && (
            <div className="card text-center text-slate-500">Nenhuma vaga pública no momento.</div>
          )}
          {jobs.map((j) => (
            <Link key={j.id} href={`/vagas/${j.id}`} className="card block transition-shadow hover:shadow-md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-brand-900">{j.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {j.company_name} · {j.city}/{j.state} · {j.modality} · {j.contract_type}
                    {j.openings > 1 ? ` · ${j.openings} vagas` : ''}
                  </p>
                </div>
                <div className="text-right">
                  {j.salary_disclosed && j.salary_min ? (
                    <p className="text-sm font-semibold text-accent-700">
                      R$ {(j.salary_min / 100).toLocaleString('pt-BR')}
                      {j.salary_max ? ` – R$ ${(j.salary_max / 100).toLocaleString('pt-BR')}` : ''}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500">Salário a combinar</p>
                  )}
                  <span className="badge mt-1 bg-brand-100 text-brand-800">Candidatar-se</span>
                </div>
              </div>
              {j.description && <p className="mt-3 line-clamp-2 text-sm text-slate-600">{j.description}</p>}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
