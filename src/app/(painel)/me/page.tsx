import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db, uj, STAGES } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { Empty, StageBadge } from '@/components/ui';

export const dynamic = 'force-dynamic';

const STATUS_PT: Record<string, string> = {
  convite_enviado: 'Entrevista disponível — você já pode responder',
  convite_visualizado: 'Convite visualizado',
  em_andamento: 'Entrevista em andamento — continue quando quiser',
  concluida: 'Entrevista concluída — em análise pela equipe',
  cancelada: 'Entrevista cancelada',
};

export default async function CandidatoHome() {
  const user = await getSessionUser();
  if (!user) redirect('/entrar');
  if (user.role !== 'CANDIDATO') redirect('/painel');

  const apps = await db
    .prepare(
      `SELECT a.*, j.title AS job_title, j.company_id, j.city, j.state, j.modality, j.contract_type,
              i.id AS interview_id, i.token AS interview_token, i.status AS interview_status
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       LEFT JOIN interviews i ON i.application_id = a.id
       WHERE a.candidate_id = ?
       ORDER BY a.created_at DESC`
    )
    .all(user.candidate_id) as any[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Olá, {user.name.split(' ')[0]}! 👋</h1>
        <p className="text-sm text-slate-500">Acompanhe suas candidaturas e entrevistas.</p>
      </div>

      <div className="rounded-xl border border-accent-200 bg-accent-50 p-4 text-sm text-accent-900">
        <strong>Participar é gratuito.</strong> Você nunca será cobrado por participar dos processos seletivos da Triatalent. Seus dados são protegidos conforme a LGPD.
      </div>

      <section className="card">
        <h2 className="mb-3 font-semibold text-brand-900">Minhas candidaturas</h2>
        {apps.length === 0 && (
          <Empty msg="Você ainda não se candidatou a nenhuma vaga. Confira as vagas abertas!" />
        )}
        <div className="space-y-3">
          {apps.map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-brand-900">{a.job_title}</p>
                  <p className="text-xs text-slate-500">
                    {a.city}/{a.state} · {a.modality} · {a.contract_type}
                  </p>
                </div>
                <StageBadge stage={a.stage} stageKey={a.stage_key} />
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Status da entrevista: {STATUS_PT[a.interview_status] || 'Convite será enviado pela equipe'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {a.interview_token && a.interview_status !== 'concluida' && a.interview_status !== 'cancelada' && (
                  <Link href={`/entrevista/${a.interview_token}`} className="btn-primary text-xs">
                    {a.interview_status === 'em_andamento' ? 'Continuar entrevista' : 'Iniciar entrevista'}
                  </Link>
                )}
                {a.interview_status === 'concluida' && (
                  <span className="badge bg-emerald-100 text-emerald-800">
                    Entrevista concluída — resultado em análise
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
