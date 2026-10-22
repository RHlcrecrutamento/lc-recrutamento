'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function UserActions({ userId, active, role }: { userId: string; active: boolean; role?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function act(action: string) {
    const motivo = action === 'bloquear' ? prompt('Motivo do bloqueio (registrado na auditoria):') || '' : undefined;
    if (action === 'bloquear' && motivo === null) return;
    setLoading(true);
    await fetch('/api/admin/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId, action, motivo }),
    });
    setLoading(false);
    router.refresh();
  }

  async function invite() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/convites', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id: userId}) });
      const data = await res.json();
      alert(data.ok ? data.data.msg : data.error);
    } catch { alert('Erro de conexão ao enviar convite.'); }
    finally { setLoading(false); }
  }

  async function resetPassword() {
    const nova = prompt('Nova senha (mínimo 10 caracteres, com maiúscula, minúscula e número):');
    if (!nova) return;
    setLoading(true);
    const response = await fetch('/api/admin/usuarios', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId, action: 'resetar_senha', password: nova }),
    });
    const data = await response.json();
    setLoading(false);
    alert(data.ok ? 'Senha redefinida e sessões encerradas.' : data.error);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-1">
      {active && role === 'CLIENTE' && <button className="btn-outline px-2 py-1 text-xs" disabled={loading} onClick={invite}>Enviar convite</button>}
      {active ? (
        <button className="btn-outline px-2 py-1 text-xs text-red-600" disabled={loading} onClick={() => act('bloquear')}>
          Bloquear
        </button>
      ) : (
        <button className="btn-outline px-2 py-1 text-xs text-emerald-700" disabled={loading} onClick={() => act('ativar')}>
          Ativar
        </button>
      )}
      <button className="btn-outline px-2 py-1 text-xs" disabled={loading} onClick={resetPassword}>
        Resetar senha
      </button>
    </div>
  );
}

export function NewUserForm({ companies }: { companies: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'RECRUTADOR', company_id: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/admin/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(f),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.ok) {
      setError(data.error || 'Erro ao criar usuário.');
      return;
    }
    setOpen(false);
    setF({ name: '', email: '', password: '', role: 'RECRUTADOR', company_id: '', phone: '' });
    router.refresh();
  }

  if (!open) {
    return (
      <button className="btn-primary" onClick={() => setOpen(true)}>
        + Novo usuário
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-semibold text-brand-900">Novo usuário</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Nome</label>
          <input className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </div>
        <div>
          <label className="label">E-mail</label>
          <input className="input" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </div>
        <div>
          <label className="label">Senha (mín. 8)</label>
          <input className="input" type="password" required minLength={10} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        </div>
        <div>
          <label className="label">Perfil</label>
          <select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            <option value="RECRUTADOR">Recrutador Triatalent</option>
            <option value="ADMIN">Administrador Triatalent</option>
            <option value="CLIENTE">Cliente</option>
          </select>
        </div>
        {f.role === 'CLIENTE' && (
          <div>
            <label className="label">Empresa</label>
            <select className="input" required value={f.company_id} onChange={(e) => setF({ ...f, company_id: e.target.value })}>
              <option value="">Selecione…</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="label">Telefone</label>
          <input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </div>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button className="btn-primary" disabled={loading}>{loading ? 'Criando…' : 'Criar usuário'}</button>
        <button type="button" className="btn-outline" onClick={() => setOpen(false)}>Cancelar</button>
      </div>
    </form>
  );
}
