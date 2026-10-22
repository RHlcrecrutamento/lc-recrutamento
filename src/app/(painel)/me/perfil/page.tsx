import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { CandidateProfileForm } from '@/components/CandidateProfileForm';

export const dynamic = 'force-dynamic';

export default async function MeuPerfil() {
  const user = await getSessionUser();
  if (!user) redirect('/entrar');
  if (user.role !== 'CANDIDATO') redirect('/painel');
  const cand = await db.prepare('SELECT * FROM candidates WHERE id = ?').get(user.candidate_id) as any;
  if (!cand) redirect('/painel');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Meu perfil</h1>
        <p className="text-sm text-slate-500">
          Mantenha seus dados atualizados. Você pode solicitar correção ou exclusão a qualquer momento (LGPD).
        </p>
      </div>
      <CandidateProfileForm candidate={cand} />
    </div>
  );
}
