import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function PainelIndex() {
  const user = await getSessionUser();
  if (!user) redirect('/entrar');
  switch (user.role) {
    case 'ADMIN':
      redirect('/admin');
    case 'RECRUTADOR':
      redirect('/recrutamento');
    case 'CLIENTE':
      redirect('/cliente');
    case 'CANDIDATO':
      redirect('/me');
    default:
      redirect('/');
  }
}
