import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { Logo } from '@/components/Logo';
import { StartApplication } from '@/components/StartApplication';
export const dynamic = 'force-dynamic';
export default async function Candidatar({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const job = await db.prepare('SELECT id,title,status,is_public FROM jobs WHERE id = ?').get(id);
  if (!job || !job.is_public) notFound();
  const user = await getSessionUser();
  if (!user) redirect(`/cadastro?vaga=${encodeURIComponent(job.id)}`);
  return <main className="min-h-screen bg-gradient-to-b from-brand-950 to-brand-900 px-4 py-12"><div className="mx-auto max-w-xl space-y-6"><Link href="/" className="inline-block"><Logo dark size={48} /></Link><div><h1 className="text-2xl font-bold text-white">{job.title}</h1><p className="mt-2 text-sm text-brand-100">Cadastro → entrevista on-line → análise da equipe Triatalent</p></div>
    {user.role !== 'CANDIDATO' ? <div className="card space-y-3"><p>Você está conectado com uma conta de empresa ou da equipe. Saia dessa conta pelo menu do painel e entre com sua conta de candidato para participar.</p><Link href="/painel" className="btn-outline">Voltar ao meu painel</Link></div> : !['aprovada','em_recrutamento'].includes(job.status) ? <div className="card space-y-3"><p>Esta vaga não está aberta para novas candidaturas.</p><Link href="/me/candidaturas" className="btn-outline">Consultar minhas candidaturas</Link><Link href="/vagas" className="ml-2 text-brand-700 underline">Ver outras vagas</Link></div> : <StartApplication key={job.id} jobId={job.id} />}
  </div></main>;
}
