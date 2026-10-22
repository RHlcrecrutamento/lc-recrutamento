'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function StartApplication({jobId}: {jobId: string}) {
  const router = useRouter();
  const started = useRef(false);
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(true);
  async function start() {
    setError('');setLoading(true);
    try {
      const res = await fetch('/api/candidaturas/inscricao', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({job_id:jobId})});
      const data = await res.json();
      if (res.status === 401) {router.replace(`/entrar/candidato?vaga=${encodeURIComponent(jobId)}`);return;}
      if (!data.ok) {setError(data.error || 'Não foi possível abrir a entrevista.');setLoading(false);return;}
      const path = String(data.data.interview_url || '');
      if (!/^\/entrevista\/[A-Za-z0-9_-]+$/.test(path)) throw new Error('Destino inválido.');
      router.replace(path);router.refresh();
    } catch {setError('Não foi possível conectar. Tente novamente. Sua candidatura não será duplicada.');setLoading(false);}
  }
  useEffect(()=>{if (!started.current) {started.current=true;void start();}},[]); // O servidor também garante idempotência.
  return <div className="card space-y-4">
    {loading ? <p role="status" className="text-sm text-slate-600">Preparando sua entrevista… Você não precisa aguardar aprovação da equipe.</p> : <><p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p><button type="button" className="btn-primary" onClick={start}>Tentar novamente</button></>}
    <p className="text-xs text-slate-500">Depois da entrevista, a equipe analisa suas respostas antes de qualquer apresentação à empresa.</p>
    <Link href="/me/candidaturas" className="block text-sm font-medium text-brand-700 underline">Minhas candidaturas</Link>
  </div>;
}
