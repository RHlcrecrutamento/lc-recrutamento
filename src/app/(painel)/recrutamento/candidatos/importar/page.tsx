import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { ImportResume } from '@/components/ImportResume';

export const dynamic = 'force-dynamic';

export default async function ImportarCurriculo() {
  const user = await getSessionUser();
  if (!user) redirect('/entrar');
  if (!['ADMIN', 'RECRUTADOR'].includes(user.role)) redirect('/painel');
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Importar currículo (PDF ou DOCX)</h1>
        <p className="text-sm text-slate-500">
          O texto é extraído automaticamente para pré-preencher o cadastro. O arquivo fica em armazenamento privado.
        </p>
      </div>
      <ImportResume />
    </div>
  );
}
