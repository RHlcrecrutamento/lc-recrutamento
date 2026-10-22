import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { Empty } from '@/components/ui';
import { UserActions, NewUserForm } from '@/components/UserAdmin';

export const dynamic = 'force-dynamic';

export default async function AdminUsuarios() {
  const user = await getSessionUser();
  if (!user || user.role !== 'ADMIN') redirect('/painel');

  const users = await db
    .prepare(
      `SELECT u.*, c.name AS company_name FROM users u
       LEFT JOIN companies c ON c.id = u.company_id
       ORDER BY u.created_at DESC`
    )
    .all() as any[];
  const companies = await db.prepare('SELECT id, name FROM companies WHERE active = 1 ORDER BY name').all() as any[];

  const roleLabel: Record<string, string> = {
    ADMIN: 'Administrador',
    RECRUTADOR: 'Recrutador',
    CLIENTE: 'Cliente',
    CANDIDATO: 'Candidato',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-900">Usuários</h1>

      <NewUserForm companies={companies} />

      <div className="card overflow-x-auto p-0">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Nome</th>
              <th className="th">E-mail</th>
              <th className="th">Perfil</th>
              <th className="th">Empresa</th>
              <th className="th">Status</th>
              <th className="th">Último login</th>
              <th className="th">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="td font-medium">{u.name}</td>
                <td className="td">{u.email}</td>
                <td className="td">{roleLabel[u.role] || u.role}</td>
                <td className="td">{u.company_name || '—'}</td>
                <td className="td">
                  {u.active ? (
                    <span className="badge bg-emerald-100 text-emerald-800">Ativo</span>
                  ) : (
                    <span className="badge bg-red-100 text-red-700">Bloqueado</span>
                  )}
                </td>
                <td className="td">{u.last_login ? new Date(u.last_login).toLocaleString('pt-BR') : '—'}</td>
                <td className="td"><UserActions role={u.role} userId={u.id} active={!!u.active} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <div className="p-6"><Empty msg="Nenhum usuário." /></div>}
      </div>
    </div>
  );
}
