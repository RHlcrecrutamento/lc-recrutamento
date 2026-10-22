import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { OrderStatusBadge, Empty } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function ClientePagamentos() {
  const user = await getSessionUser();
  if (!user) redirect('/entrar');
  if (user.role !== 'CLIENTE') redirect('/painel');

  const orders = await db
    .prepare(
      `SELECT o.*, a.stage, j.title AS job_title
       FROM orders o
       JOIN applications a ON a.id = o.application_id
       JOIN jobs j ON j.id = a.job_id
       WHERE o.company_id = ?
       ORDER BY o.created_at DESC`
    )
    .all(user.company_id) as any[];

  const total = orders.filter((o) => o.status === 'aprovado').reduce((s, o) => s + o.amount_cents, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Pagamentos e desbloqueios</h1>
        <p className="text-sm text-slate-500">
          Histórico de compras de acesso a dados de contato. Valores confirmados no servidor.
        </p>
      </div>

      <div className="card">
        <p className="text-sm text-slate-500">Total investido em desbloqueios</p>
        <p className="text-3xl font-bold text-brand-900">R$ {(total / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Pedido</th>
              <th className="th">Vaga</th>
              <th className="th">Candidato</th>
              <th className="th">Valor</th>
              <th className="th">Status</th>
              <th className="th">Data</th>
              <th className="th">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="td font-mono text-xs">{o.id.slice(0, 12)}…</td>
                <td className="td">{o.job_title}</td>
                <td className="td">
                  CAND-{Math.abs([...o.candidate_id].reduce((a: number, c: string) => a + c.charCodeAt(0) * 7, 0) % 900000 + 100000)}
                </td>
                <td className="td">R$ {(o.amount_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="td"><OrderStatusBadge status={o.status} /></td>
                <td className="td">{new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
                <td className="td">
                  {o.status === 'pendente' && (
                    <a href={`/cliente/pagamentos/${o.id}`} className="btn-outline px-3 py-1 text-xs">
                      Verificar / pagar
                    </a>
                  )}
                  {o.status === 'aprovado' && <a href={`/cliente/pagamentos/${o.id}`} className="text-xs text-emerald-700 underline">Ver acesso e confirmação</a>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <div className="p-6"><Empty msg="Nenhum pagamento registrado." /></div>}
      </div>
    </div>
  );
}
