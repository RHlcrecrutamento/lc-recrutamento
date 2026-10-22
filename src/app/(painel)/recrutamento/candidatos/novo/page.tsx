import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { CandidateForm } from '@/components/CandidateForm';

export const dynamic = 'force-dynamic';

export default async function NovoCandidato() {
  const user = await getSessionUser();
  if (!user) redirect('/entrar');
  if (!['ADMIN', 'RECRUTADOR'].includes(user.role)) redirect('/painel');
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Cadastrar candidato</h1>
        <p className="text-sm text-slate-500">Dados completos ficam disponíveis apenas à equipe interna.</p>
      </div>
      <CandidateForm />
    </div>
  );
}
