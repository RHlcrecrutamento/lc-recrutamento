'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DemoCheckout({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState('');
  const [msg, setMsg] = useState('');

  async function act(acao: string) {
    setLoading(acao);
    setMsg('');
    const res = await fetch(`/api/pagamentos/demo/${orderId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao }),
    });
    const data = await res.json();
    setLoading('');
    if (!data.ok) {
      setMsg(data.error || 'Erro.');
      return;
    }
    if (acao === 'aprovar') {
      setMsg('Pagamento confirmado! Liberando dados…');
      setTimeout(() => router.push(`/cliente/candidato/${''}`), 500);
      router.push('/cliente/pagamentos');
      router.refresh();
    } else {
      setMsg(data.data.msg);
      router.refresh();
    }
  }

  return (
    <div className="space-y-2">
      <button className="btn-accent w-full" disabled={!!loading} onClick={() => act('aprovar')}>
        {loading === 'aprovar' ? 'Processando…' : '💳 Simular pagamento APROVADO (demonstração)'}
      </button>
      <button className="btn-outline w-full" disabled={!!loading} onClick={() => act('recusar')}>
        Simular pagamento RECUSADO
      </button>
      <button className="btn-outline w-full" disabled={!!loading} onClick={() => act('cancelar')}>
        Cancelar pedido
      </button>
      {msg && <p className="rounded-lg bg-slate-100 px-3 py-2 text-center text-sm text-slate-700">{msg}</p>}
    </div>
  );
}
