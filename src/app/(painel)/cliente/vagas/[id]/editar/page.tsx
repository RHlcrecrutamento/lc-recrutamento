import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { JobForm } from '@/components/JobForm';

export const dynamic = 'force-dynamic';

export default async function ClienteEditarVaga({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect('/entrar');
  if (user.role !== 'CLIENTE') redirect('/painel');
  const job = await db.prepare('SELECT * FROM jobs WHERE id = ?').get((await params).id) as any;
  if (!job || job.company_id !== user.company_id) notFound();
  delete job.confidential_info; delete job.review_note; // Nunca serializar notas internas no formulário do cliente.

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-brand-900">Editar vaga</h1>
      <JobForm mode="cliente" initial={job} defaultCompany={user.company_id!} />
    </div>
  );
}
