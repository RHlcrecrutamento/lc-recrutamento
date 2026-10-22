import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { JobForm } from '@/components/JobForm';

export const dynamic = 'force-dynamic';

export default async function NovaVagaInterna() {
  const user = await getSessionUser();
  if (!user) redirect('/entrar');
  if (!['ADMIN', 'RECRUTADOR'].includes(user.role)) redirect('/painel');
  const companies = await db.prepare('SELECT id, name FROM companies WHERE active = 1 ORDER BY name').all() as any[];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Cadastrar nova vaga</h1>
        <p className="text-sm text-slate-500">Preencha os dados completos da vaga para iniciar o recrutamento.</p>
      </div>
      <JobForm mode="interno" companies={companies} canSetCompany />
    </div>
  );
}
