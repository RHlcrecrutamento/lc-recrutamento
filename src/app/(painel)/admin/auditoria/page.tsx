import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { Empty } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function AdminAuditoria({ searchParams }: { searchParams: Promise<{ acao?: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== 'ADMIN') redirect('/painel');

  const acao = (await searchParams).acao || '';
  let sql = `SELECT l.*, u.name AS user_name, u.email AS user_email
             FROM audit_logs l LEFT JOIN users u ON u.id = l.user_id`;
  const params: unknown[] = [];
  if (acao) {
    sql += ' WHERE l.action LIKE ?';
    params.push(`%${acao}%`);
  }
  sql += ' ORDER BY l.created_at DESC LIMIT 300';
  const logs = await db.prepare(sql).all(...params) as any[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Trilha de auditoria</h1>
        <p className="text-sm text-slate-500">
          Registro imutável de acessos, alterações, validações, liberações, desbloqueios e pagamentos.
        </p>
      </div>

      <form className="card flex flex-wrap items-end gap-3" method="GET">
        <div className="min-w-[220px] flex-1">
          <label className="label">Filtrar por ação</label>
          <input className="input" name="acao" defaultValue={acao} placeholder="Ex.: pagamento, relatorio, login…" />
        </div>
        <button className="btn-primary">Filtrar</button>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Data</th>
              <th className="th">Usuário</th>
              <th className="th">Ação</th>
              <th className="th">Entidade</th>
              <th className="th">Detalhes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="td whitespace-nowrap text-xs">{new Date(l.created_at).toLocaleString('pt-BR')}</td>
                <td className="td text-xs">{l.user_name || 'Sistema'}</td>
                <td className="td">
                  <span className="badge bg-brand-50 text-brand-800">{l.action}</span>
                </td>
                <td className="td text-xs">{l.entity}{l.entity_id ? ` · ${String(l.entity_id).slice(0, 10)}…` : ''}</td>
                <td className="td max-w-[280px] truncate text-xs text-slate-500">{l.details_json || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <div className="p-6"><Empty msg="Nenhum registro de auditoria." /></div>}
      </div>
    </div>
  );
}
