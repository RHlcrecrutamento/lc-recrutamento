import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { Logo } from '@/components/Logo';
import { RegisterForm } from '@/components/RegisterForm';
export const dynamic = 'force-dynamic';

export default async function CadastroCandidato({searchParams}: {searchParams: Promise<{vaga?: string}>}) {
  const query = await searchParams;
  const jobId = typeof query.vaga === 'string' ? query.vaga : '';
  const job = jobId ? await db.prepare("SELECT id,title FROM jobs WHERE id = ? AND is_public = 1 AND status IN ('aprovada','em_recrutamento')").get(jobId) : null;
  if (jobId && !job) notFound();
  const user = await getSessionUser();
  if (user?.role === 'CANDIDATO') redirect(job ? `/candidatar/${encodeURIComponent(job.id)}` : '/me');
  return <div className="min-h-screen bg-gradient-to-b from-brand-900 via-brand-800 to-brand-900 px-4 py-10"><div className="mx-auto max-w-2xl"><div className="mb-6 text-center"><Link href="/"><Logo size={48} dark /></Link><h1 className="mt-4 text-xl font-semibold text-white">Cadastro de candidato — gratuito</h1><p className="mt-1 text-sm text-brand-200">{job ? `Cadastre-se para ${job.title} e siga direto para a entrevista on-line.` : 'Preencha seus dados profissionais para participar dos processos seletivos.'}</p></div>
    {user ? <div className="card space-y-3"><p>Você está conectado com uma conta de empresa ou da equipe. Saia da conta pelo menu do painel antes de cadastrar seu perfil de candidato.</p><Link href="/painel" className="btn-outline">Voltar ao painel</Link></div> : <RegisterForm jobId={job?.id} jobTitle={job?.title} />}
  </div></div>;
}
