import { SectionFilters } from '@/components/SectionFilters';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { OrderStatusBadge, Empty } from '@/components/ui';
import { RefundButton } from '@/components/RefundButton';

export const dynamic = 'force-dynamic';

export default async function AdminPagamentos({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== 'ADMIN') redirect('/painel');

  const requested = (await searchParams).filtro || '';
  const filtro = ['pendentes','aprovados','desbloqueios'].includes(requested) ? requested : '';
  const allOrders = await db
    .prepare(
      `SELECT o.*, co.name AS company_name, u.name AS client_name, j.title AS job_title,
         (SELECT COUNT(*) FROM unlocks un WHERE un.order_id = o.id AND un.revoked_at IS NULL) AS active_unlocks
       FROM orders o
       JOIN companies co ON co.id = o.company_id
       JOIN users u ON u.id = o.client_user_id
       JOIN applications a ON a.id = o.application_id
       JOIN jobs j ON j.id = a.job_id
       ORDER BY o.created_at DESC`
    )
    .all() as any[];

  const orders = allOrders.filter(o => !filtro || (filtro === 'pendentes' ? o.status === 'pendente' : filtro === 'aprovados' ? o.status === 'aprovado' : Number(o.active_unlocks) > 0));
  const receita = allOrders.filter((o) => o.status === 'aprovado').reduce((s, o) => s + o.amount_cents, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-900">Pagamentos e desbloqueios</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-xs text-slate-500">Receita confirmada</p>
          <p className="text-2xl font-bold text-emerald-700">R$ {(receita / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500">Pedidos pendentes</p>
          <p className="text-2xl font-bold text-amber-600">{allOrders.filter((o) => o.status === 'pendente').length}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500">Desbloqueios ativos</p>
          <p className="text-2xl font-bold text-brand-800">{(await db.prepare('SELECT COUNT(*) n FROM unlocks WHERE revoked_at IS NULL').get() as any).n}</p>
        </div>
      </div>

      <SectionFilters items={[
        {label: 'Todos', href: '/admin/pagamentos', active: !filtro},
        {label: 'Pagamentos pendentes', href: '/admin/pagamentos?filtro=pendentes', active: filtro === 'pendentes'},
        {label: 'Pagamentos aprovados', href: '/admin/pagamentos?filtro=aprovados', active: filtro === 'aprovados'},
        {label: 'Desbloqueios ativos', href: '/admin/pagamentos?filtro=desbloqueios', active: filtro === 'desbloqueios'},
      ]} />
      <p role="status" className="text-sm text-slate-500">{orders.length} pedido(s) na seleção. Os indicadores acima são totais gerais.</p>
      <div className="card overflow-x-auto p-0">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Pedido</th>
              <th className="th">Empresa</th>
              <th className="th">Vaga</th>
              <th className="th">Valor</th>
              <th className="th">Gateway</th>
              <th className="th">Status</th>
              <th className="th">Data</th>
              <th className="th">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="td font-mono text-xs">{o.id.slice(0, 12)}…</td>
                <td className="td">{o.company_name}</td>
                <td className="td">{o.job_title}</td>
                <td className="td">R$ {(o.amount_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="td">{o.gateway}</td>
                <td className="td"><OrderStatusBadge status={o.status} /></td>
                <td className="td">{new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
                <td className="td">{o.status === 'aprovado' && <RefundButton orderId={o.id} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <div className="p-6"><Empty msg="Nenhum pedido registrado." /></div>}
      </div>
    </div>
  );
}
