import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { Empty } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function AdminCandidatos() {
  const user = await getSessionUser();
  if (!user || !['ADMIN', 'RECRUTADOR'].includes(user.role)) redirect('/painel');
  const rows = await db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM applications a WHERE a.candidate_id = c.id) AS total_vagas
       FROM candidates c ORDER BY c.created_at DESC LIMIT 200`
    )
    .all() as any[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-900">Banco de talentos</h1>
        <Link href="/recrutamento/candidatos" className="btn-outline">Candidatos em análise →</Link>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Nome</th>
              <th className="th">Perfil</th>
              <th className="th">Cidade</th>
              <th className="th">Vagas</th>
              <th className="th">Cadastro</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="td font-medium">{c.name}</td>
                <td className="td">{c.title || '—'}</td>
                <td className="td">{c.city || '—'}</td>
                <td className="td">{c.total_vagas}</td>
                <td className="td">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                <td className="td text-right">
                  <Link href={`/recrutamento/candidatos/${c.id}`} className="btn-outline px-3 py-1.5 text-xs">Ver</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="p-6"><Empty msg="Nenhum candidato cadastrado." /></div>}
      </div>
    </div>
  );
}
