import Link from 'next/link';
import { brl } from '@/lib/job-benefits';
import { redirect, notFound } from 'next/navigation';
import { db, uj, JOB_STATUSES } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { listVisibleCandidatesForClient, candidateCode, getUnlockPriceCents } from '@/lib/access';
import { JobStatusBadge, Empty } from '@/components/ui';
import { JobActions } from '@/components/JobActions';

export const dynamic = 'force-dynamic';

export default async function ClienteVagaDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect('/entrar');
  if (user.role !== 'CLIENTE') redirect('/painel');

  const job = await db.prepare('SELECT * FROM jobs WHERE id = ?').get((await params).id) as any;
  if (!job || job.company_id !== user.company_id) notFound();
  // Informações confidenciais jamais chegam ao cliente
  delete job.confidential_info; delete job.review_note;

  const candidates = await listVisibleCandidatesForClient(user.company_id!, (await params).id) as any[];
  const price = await getUnlockPriceCents(user.company_id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-brand-900">{job.title}</h1>
            <JobStatusBadge status={job.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {job.city}/{job.state} · {job.modality} · {job.openings} vaga(s) · {JOB_STATUSES[job.status]}
          </p>
        </div>
        <Link href={`/cliente/vagas/${job.id}/editar`} className="btn-outline">
          ✏️ Editar vaga
        </Link>
      </div>

      <section className="card">
        <h2 className="font-semibold text-brand-900">Andamento do processo</h2>
        <p className="mt-2 text-sm text-slate-600">
          A equipe Triatalent conduz a busca, as entrevistas online e a validação dos relatórios. Os candidatos aparecem abaixo
          somente após a conclusão dessas etapas.
        </p>
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          <p><strong>Descrição:</strong> {job.description || '—'}</p>
          <p className="mt-1"><strong>Salário:</strong> {job.salary_min != null ? brl(job.salary_min) : 'A combinar'}{job.salary_max != null ? ` até ${brl(job.salary_max)}` : ''}</p>
          {job.benefits && <p className="mt-1 whitespace-pre-wrap"><strong>Benefícios:</strong> {job.benefits}</p>}
          <p className="mt-1"><strong>Atividades:</strong> {job.activities || '—'}</p>
          <p className="mt-1"><strong>Requisitos:</strong> {job.requirements_mandatory || '—'}</p>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-brand-900">Candidatos liberados para análise ({candidates.length})</h2>
          <p className="text-xs text-slate-500">Currículos anonimizados · desbloqueio de contato: R$ {(price / 100).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
        </div>
        {candidates.length === 0 && (
          <Empty msg="Nenhum candidato liberado ainda. Lembre-se: entrevista online + validação do relatório são obrigatórias antes da apresentação." />
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
                    <p className="text-xs text-slate-500">{c.city}/{c.state}</p>
                  </div>
                  {typeof c.compatibility_score === 'number' && (
                    <span className="rounded-full bg-brand-100 px-2.5 py-1 text-sm font-bold text-brand-800">{c.compatibility_score}%</span>
                  )}
                </div>
                <p className="mt-2 line-clamp-3 text-xs text-slate-600">{pub.summary || c.professional_summary}</p>
                <div className="mt-3">
                  {c.unlocked ? (
                    <span className="badge bg-emerald-100 text-emerald-800">✔ Contato desbloqueado</span>
                  ) : (
                    <span className="badge bg-amber-100 text-amber-800">🔒 Desbloquear contato</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
