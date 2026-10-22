import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db, uj } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { listVisibleCandidatesForClient, candidateCode, getUnlockPriceCents } from '@/lib/access';
import { Empty } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function ClienteCandidatos({ searchParams }: { searchParams: Promise<{ vaga?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect('/entrar');
  if (user.role !== 'CLIENTE') redirect('/painel');

  const jobs = await db.prepare('SELECT id, title FROM jobs WHERE company_id = ? ORDER BY title').all(user.company_id) as any[];
  const candidates = await listVisibleCandidatesForClient(user.company_id!, (await searchParams).vaga || undefined) as any[];
  const price = await getUnlockPriceCents(user.company_id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Candidatos para análise</h1>
        <p className="text-sm text-slate-500">
          Somente candidatos com entrevista concluída e relatório validado pela equipe Triatalent. Dados de contato protegidos
          até o desbloqueio.
        </p>
      </div>

      <form className="card flex flex-wrap items-end gap-3" method="GET">
        <div className="min-w-[220px] flex-1">
          <label className="label">Filtrar por vaga</label>
          <select className="input" name="vaga" defaultValue={(await searchParams).vaga || ''}>
            <option value="">Todas as vagas</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
        </div>
        <button className="btn-primary">Aplicar filtro</button>
      </form>

      {candidates.length === 0 && (
        <Empty msg="Nenhum candidato disponível para análise com os filtros atuais." />
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {candidates.map((c) => {
          const pub = uj<any>(c.public_summary_json, {});
          return (
            <Link key={c.application_id} href={`/cliente/candidato/${c.application_id}`} className="card hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-accent-700">{candidateCode(c.candidate_id)}</p>
                  <p className="mt-1 font-semibold text-brand-900">{c.title || 'Profissional'}</p>
                  <p className="text-xs text-slate-500">{c.job_title}</p>
                </div>
                {typeof c.compatibility_score === 'number' && (
                  <span className="rounded-full bg-brand-100 px-2.5 py-1 text-sm font-bold text-brand-800">{c.compatibility_score}%</span>
                )}
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-slate-600">{pub.summary || c.professional_summary}</p>
              <div className="mt-3">
                {c.unlocked ? (
                  <span className="badge bg-emerald-100 text-emerald-800">✔ Contato desbloqueado</span>
                ) : (
                  <span className="badge bg-amber-100 text-amber-800">🔒 R$ {(price / 100).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})} para desbloquear</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
