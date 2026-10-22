import Link from 'next/link';
import { validUnlockSql } from '@/lib/payment-rules';
import { redirect } from 'next/navigation';
import { db, uj } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { listVisibleCandidatesForClient, candidateCode, getUnlockPriceCents } from '@/lib/access';
import { KpiGrid } from '@/components/DashboardCards';
import { JobStatusBadge, Empty } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function ClienteHome() {
  const user = await getSessionUser();
  if (!user) redirect('/entrar');
  if (user.role !== 'CLIENTE') redirect('/painel');

  const one = async (sql: string, ...p: unknown[]) => (await db.prepare(sql).get(...p) as any)?.n ?? 0;
  const companyId = user.company_id!;

  const kpis = [
    { label: 'Vagas ativas', value: await one(`SELECT COUNT(*) n FROM jobs WHERE company_id = ? AND status NOT IN ('cancelada','concluida')`, companyId), href:'/cliente/vagas?status=ativas' },
    {
      label: 'Candidatos liberados',
      value: await one(
        `SELECT COUNT(*) n FROM applications a JOIN jobs j ON j.id = a.job_id
         JOIN interviews i ON i.application_id = a.id AND i.status='concluida'
         JOIN reports r ON r.application_id = a.id AND r.status='validado' AND r.published_at IS NOT NULL
         WHERE j.company_id = ? AND a.stage >= 11`,
        companyId
      ),
      accent: true,
      href: '/cliente/candidatos',
    },
    { label: 'Desbloqueios ativos', value: await one(`SELECT COUNT(*) n FROM unlocks u WHERE u.company_id = ? AND ${validUnlockSql()}`, companyId), href:'/cliente/desbloqueios' },
  ];

  const jobs = await db
    .prepare(
      `SELECT j.*, (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id AND a.stage >= 11) AS liberados
       FROM jobs j WHERE j.company_id = ? ORDER BY j.created_at DESC`
    )
    .all(companyId) as any[];

  const candidates = ((await listVisibleCandidatesForClient(companyId)) as any[]).slice(0, 6);
  const price = await getUnlockPriceCents(companyId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Área do cliente</h1>
          <p className="text-sm text-slate-500">
            Somente candidatos com entrevista concluída e relatório validado pela equipe Triatalent aparecem aqui.
          </p>
        </div>
        <Link href="/cliente/vagas/nova" className="btn-primary">
          + Cadastrar nova vaga
        </Link>
      </div>

      <KpiGrid items={kpis} />

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-brand-900">Candidatos liberados para análise</h2>
          <Link href="/cliente/candidatos" className="text-sm font-medium text-brand-700 hover:underline">
            Ver todos →
          </Link>
        </div>
        {candidates.length === 0 && (
          <Empty msg="Nenhum candidato liberado ainda. Os perfis aparecem aqui após a entrevista online e a validação do relatório pela equipe Triatalent." />
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {candidates.map((c) => {
            const pub = uj<any>(c.public_summary_json, {});
            return (
              <Link key={c.application_id} href={`/cliente/candidato/${c.application_id}`} className="rounded-xl border border-slate-200 p-4 hover:border-accent-400 hover:shadow-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-accent-700">{candidateCode(c.candidate_id)}</p>
                    <p className="mt-1 text-sm font-semibold text-brand-900">{c.title || 'Profissional'}</p>
                    <p className="text-xs text-slate-500">{c.city}/{c.state}</p>
                  </div>
                  {typeof c.compatibility_score === 'number' && (
                    <span className="rounded-full bg-brand-100 px-2.5 py-1 text-sm font-bold text-brand-800">
                      {c.compatibility_score}%
                    </span>
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-slate-600">{pub.summary || c.professional_summary}</p>
                <div className="mt-3 flex items-center gap-2">
                  {c.unlocked ? (
                    <span className="badge bg-emerald-100 text-emerald-800">Contato desbloqueado</span>
                  ) : (
                    <span className="badge bg-amber-100 text-amber-800">Desbloquear · R$ {(price / 100).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold text-brand-900">Minhas vagas</h2>
        {jobs.length === 0 && <Empty msg='Nenhuma vaga cadastrada. Clique em "Cadastrar nova vaga" para começar.' />}
        <div className="space-y-2">
          {jobs.map((j) => (
            <Link key={j.id} href={`/cliente/vagas/${j.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 p-3 hover:bg-slate-50">
              <div>
                <p className="text-sm font-medium text-slate-800">{j.title}</p>
                <p className="text-xs text-slate-500">{j.city}/{j.state} · {j.openings} vaga(s)</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge bg-emerald-100 text-emerald-800">{j.liberados} candidato(s) liberado(s)</span>
                <JobStatusBadge status={j.status} />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
