'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const NEXT_ACTIONS: Record<string, { to: string; label: string; cls: string }[]> = {
  rascunho: [{ to: 'aguardando_aprovacao', label: 'Enviar para aprovação', cls: 'btn-primary' }],
  aguardando_aprovacao: [
    { to: 'aprovada', label: '✓ Aprovar vaga', cls: 'btn-accent' },
    { to: 'rascunho', label: 'Devolver ao rascunho', cls: 'btn-outline' },
  ],
  aprovada: [
    { to: 'em_recrutamento', label: 'Iniciar recrutamento', cls: 'btn-primary' },
    { to: 'pausada', label: 'Pausar', cls: 'btn-outline' },
  ],
  em_recrutamento: [
    { to: 'aguardando_avaliacao_cliente', label: 'Enviar para avaliação do cliente', cls: 'btn-accent' },
    { to: 'pausada', label: 'Pausar', cls: 'btn-outline' },
    { to: 'concluida', label: 'Concluir vaga', cls: 'btn-outline' },
    { to: 'cancelada', label: 'Cancelar vaga', cls: 'btn-danger' },
  ],
  aguardando_avaliacao_cliente: [
    { to: 'em_recrutamento', label: 'Voltar ao recrutamento', cls: 'btn-outline' },
    { to: 'concluida', label: 'Concluir vaga', cls: 'btn-primary' },
  ],
  pausada: [
    { to: 'em_recrutamento', label: 'Retomar recrutamento', cls: 'btn-primary' },
    { to: 'cancelada', label: 'Cancelar', cls: 'btn-danger' },
  ],
};

export function JobActions({ job }: { job: { id: string; status: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState('');
  const [msg, setMsg] = useState('');

  async function transition(to: string) {
    setLoading(to);
    setMsg('');
    const res = await fetch(`/api/vagas/${job.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: to }),
    });
    const data = await res.json();
    setLoading('');
    if (!data.ok) {
      setMsg(data.error || 'Erro na transição.');
      return;
    }
    router.refresh();
  }

  const actions = NEXT_ACTIONS[job.status] || [];
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <a href={`/api/vagas/${job.id}`} className="btn-outline px-3 py-1.5 text-xs" target="_blank">
          Exportar JSON
        </a>
        {actions.map((a) => (
          <button key={a.to} className={`${a.cls} px-3 py-1.5 text-xs`} disabled={!!loading} onClick={() => transition(a.to)}>
            {loading === a.to ? '…' : a.label}
          </button>
        ))}
      </div>
      {msg && <p className="text-xs text-red-600">{msg}</p>}
    </div>
  );
}
