'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function NewCompanyForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', cnpj: '', segment: '', city: '', state: 'MG', contact_email: '', contact_phone: '', plan: 'padrao', price_per_unlock_cents: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/admin/empresas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(f),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.ok) {
      setError(data.error || 'Erro.');
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) return <button className="btn-primary" onClick={() => setOpen(true)}>+ Nova empresa</button>;

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-semibold text-brand-900">Nova empresa cliente</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="label">Nome da empresa *</label>
          <input className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </div>
        <div>
          <label className="label">CNPJ</label>
          <input className="input" value={f.cnpj} onChange={(e) => setF({ ...f, cnpj: e.target.value })} />
        </div>
        <div>
          <label className="label">Segmento</label>
          <input className="input" value={f.segment} onChange={(e) => setF({ ...f, segment: e.target.value })} />
        </div>
        <div>
          <label className="label">Cidade</label>
          <input className="input" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
        </div>
        <div>
          <label className="label">Estado</label>
          <input className="input" maxLength={2} value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} />
        </div>
        <div>
          <label className="label">E-mail de contato</label>
          <input className="input" type="email" value={f.contact_email} onChange={(e) => setF({ ...f, contact_email: e.target.value })} />
        </div>
        <div>
          <label className="label">Telefone</label>
          <input className="input" value={f.contact_phone} onChange={(e) => setF({ ...f, contact_phone: e.target.value })} />
        </div>
        <div>
          <label className="label">Plano</label>
          <select className="input" value={f.plan} onChange={(e) => setF({ ...f, plan: e.target.value })}>
            <option value="padrao">Padrão</option>
            <option value="premium">Premium</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
        <div>
          <label className="label">Preço específico por desbloqueio (centavos)</label>
          <input className="input" type="number" placeholder="Deixe vazio para usar o padrão" value={f.price_per_unlock_cents} onChange={(e) => setF({ ...f, price_per_unlock_cents: e.target.value })} />
        </div>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button className="btn-primary" disabled={loading}>{loading ? 'Salvando…' : 'Salvar empresa'}</button>
        <button type="button" className="btn-outline" onClick={() => setOpen(false)}>Cancelar</button>
      </div>
    </form>
  );
}
