import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { StageBadge, Empty } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function MinhasCandidaturas() {
  const user = await getSessionUser();
  if (!user) redirect('/entrar');
  if (user.role !== 'CANDIDATO') redirect('/painel');

  const apps = await db
    .prepare(
      `SELECT a.*, j.title AS job_title, j.city, j.state, j.modality, j.description,
              i.status AS interview_status, i.token AS interview_token
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       LEFT JOIN interviews i ON i.application_id = a.id
       WHERE a.candidate_id = ?
       ORDER BY a.created_at DESC`
    )
    .all(user.candidate_id) as any[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-900">Minhas candidaturas</h1>
      {apps.length === 0 && <Empty msg="Nenhuma candidatura ainda." />}
      <div className="space-y-4">
        {apps.map((a) => (
          <div key={a.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold text-brand-900">{a.job_title}</h2>
                <p className="text-xs text-slate-500">{a.city}/{a.state} · {a.modality}</p>
              </div>
              <span className="badge bg-brand-50 text-brand-800">{a.team_decision==='aprovado'?'Aprovado para apresentação à empresa':a.team_decision==='reprovado'?'Não aprovado nesta seleção':a.interview_status==='concluida'?'Aguardando análise da Triatalent':'Entrevista disponível / em andamento'}</span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-slate-600">{a.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {a.interview_token && a.interview_status !== 'concluida' && a.interview_status !== 'cancelada' && (
                <Link href={`/entrevista/${a.interview_token}`} className="btn-primary text-xs">
                  {a.interview_status === 'em_andamento' ? 'Continuar entrevista' : 'Fazer entrevista'}
                </Link>
              )}
              {a.interview_status === 'concluida' && (
                <span className="badge bg-emerald-100 text-emerald-800">Entrevista concluída ✔</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
