import { SectionFilters } from '@/components/SectionFilters';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { Empty } from '@/components/ui';
import { NewCompanyForm } from '@/components/CompanyAdmin';

export const dynamic = 'force-dynamic';

export default async function AdminEmpresas({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== 'ADMIN') redirect('/painel');

  const activeOnly = (await searchParams).filtro === 'ativas';
  const allRows = await db
    .prepare(
      `SELECT c.*,
              (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id AND u.role = 'CLIENTE') AS users_count,
              (SELECT COUNT(*) FROM jobs j WHERE j.company_id = c.id) AS jobs_count,
              (SELECT COALESCE(SUM(o.amount_cents),0) FROM orders o WHERE o.company_id = c.id AND o.status = 'aprovado') AS spent
       FROM companies c ORDER BY c.name`
    )
    .all() as any[];

  const companies = activeOnly ? allRows.filter((row) => row.active === 1) : allRows;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-900">Empresas clientes</h1>
      <NewCompanyForm />
      <SectionFilters items={[
        {label: 'Todas', href: '/admin/empresas', active: !activeOnly},
        {label: 'Empresas ativas', href: '/admin/empresas?filtro=ativas', active: activeOnly},
      ]} />
      {activeOnly && <p role="status" className="text-sm text-slate-600">Filtro: empresas ativas · {companies.length} registro(s).</p>}
      <div className="card overflow-x-auto p-0">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Empresa</th>
              <th className="th">CNPJ</th>
              <th className="th">Cidade</th>
              <th className="th">Usuários</th>
              <th className="th">Vagas</th>
              <th className="th">Investido</th>
              <th className="th">Preço/unlock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {companies.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="td font-medium">{c.name}</td>
                <td className="td">{c.cnpj || '—'}</td>
                <td className="td">{c.city}/{c.state}</td>
                <td className="td">{c.users_count}</td>
                <td className="td">{c.jobs_count}</td>
                <td className="td">R$ {((c.spent || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="td">
                  {c.price_per_unlock_cents != null
                    ? `R$ ${(c.price_per_unlock_cents / 100).toLocaleString('pt-BR')} (específico)`
                    : 'Padrão'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {companies.length === 0 && <div className="p-6"><Empty msg="Nenhuma empresa cadastrada." /></div>}
      </div>
    </div>
  );
}
