'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SettingsForm({ settings }: { settings: Record<string, any> }) {
  const router = useRouter();
  const [f, setF] = useState({
    price_per_unlock_cents: settings.price_per_unlock_cents ?? 4990,
    unlock_validity_days: settings.unlock_validity_days ?? 365,
    allow_candidate_registration: settings.allow_candidate_registration ?? true,
    allow_public_jobs: settings.allow_public_jobs ?? true,
    support_email: settings.support_email ?? '',
    retention_days_candidates: settings.retention_days_candidates ?? 730,
  });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    const res = await fetch('/api/admin/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(f),
    });
    const data = await res.json();
    setLoading(false);
    setMsg(data.ok ? 'Configurações salvas.' : data.error || 'Erro.');
    router.refresh();
  }

  return (
    <form onSubmit={save} className="card space-y-4">
      <h2 className="font-semibold text-brand-900">Parâmetros comerciais e operacionais</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Preço padrão do desbloqueio (centavos — 4990 = R$ 49,90)</label>
          <input className="input" type="number" value={f.price_per_unlock_cents} onChange={(e) => setF({ ...f, price_per_unlock_cents: Number(e.target.value) })} />
        </div>
        <div>
          <label className="label">Validade do desbloqueio (dias)</label>
          <input className="input" type="number" value={f.unlock_validity_days} onChange={(e) => setF({ ...f, unlock_validity_days: Number(e.target.value) })} />
        </div>
        <div>
          <label className="label">E-mail de suporte (direitos do titular LGPD)</label>
          <input className="input" value={f.support_email} onChange={(e) => setF({ ...f, support_email: e.target.value })} />
        </div>
        <div>
          <label className="label">Retenção de dados de candidatos (dias)</label>
          <input className="input" type="number" value={f.retention_days_candidates} onChange={(e) => setF({ ...f, retention_days_candidates: Number(e.target.value) })} />
        </div>
      </div>

      <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">A entrevista inclui sempre as cinco perguntas essenciais, questões sobre os requisitos da vaga e confirmação de dados profissionais. A quantidade varia por vaga. Gemini e Mercado Pago são configurados no servidor, não neste formulário. WhatsApp é manual.</p>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!f.allow_candidate_registration}
            onChange={(e) => setF({ ...f, allow_candidate_registration: e.target.checked })}
          />
          <span>Permitir autocadastro de candidatos no portal</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!f.allow_public_jobs}
            onChange={(e) => setF({ ...f, allow_public_jobs: e.target.checked })}
          />
          <span>Exibir página pública de vagas</span>
        </label>
      </div>

      {msg && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</p>}
      <button className="btn-primary" disabled={loading}>
        {loading ? 'Salvando…' : 'Salvar configurações'}
      </button>
    </form>
  );
}
