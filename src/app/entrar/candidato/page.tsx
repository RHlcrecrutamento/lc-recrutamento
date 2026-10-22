import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { AccessShell } from '@/components/AccessShell';
import { LoginForm } from '@/components/LoginForm';
export const metadata = { title: 'Seu próximo passo começa aqui | Triatalent' };
export const dynamic = 'force-dynamic';
export default async function Page({searchParams}: {searchParams: Promise<{vaga?: string}>}) {
  const query = await searchParams;
  const jobId = typeof query.vaga === 'string' ? query.vaga : '';
  const job = jobId ? await db.prepare('SELECT id,title FROM jobs WHERE id = ? AND is_public = 1').get(jobId) : null;
  if (jobId && !job) notFound();
  const user = await getSessionUser();
  if (user?.role === 'CANDIDATO') redirect(job ? `/candidatar/${encodeURIComponent(job.id)}` : '/me');
  return <AccessShell title="Seu próximo passo começa aqui" subtitle={job ? `Entre na sua conta para continuar a candidatura a ${job.title} e acessar a entrevista on-line.` : 'Acesse seu currículo, acompanhe candidaturas e participe das entrevistas. Sempre gratuito para candidatos.'}>
    {user ? <div className="card space-y-3"><p>Saia da conta de empresa ou da equipe antes de entrar como candidato.</p><Link href="/painel" className="btn-outline">Voltar ao painel</Link></div> : <LoginForm portal="candidato" jobId={job?.id} />}
  </AccessShell>;
}
