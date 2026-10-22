import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { JobForm } from '@/components/JobForm';

export const dynamic = 'force-dynamic';

export default async function ClienteNovaVaga() {
  const user = await getSessionUser();
  if (!user) redirect('/entrar');
  if (user.role !== 'CLIENTE') redirect('/painel');

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Cadastrar nova vaga</h1>
        <p className="text-sm text-slate-500">
          Preencha os dados e solicite a aprovação da equipe Triatalent para iniciar a busca de profissionais.
        </p>
      </div>
      <JobForm mode="cliente" defaultCompany={user.company_id!} />
    </div>
  );
}
