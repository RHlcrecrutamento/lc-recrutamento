'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ImportResume() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setMsg(null);
    const fd = new FormData();
    fd.append('arquivo', file);
    if (name) fd.append('name', name);
    const res = await fetch('/api/candidatos/importar', { method: 'POST', body: fd });
    const data = await res.json();
    setLoading(false);
    if (!data.ok) {
      setMsg({ ok: false, text: data.error || 'Erro na importação.' });
      return;
    }
    setMsg({ ok: true, text: `Currículo importado! Candidato criado: ${data.data.extraido.name || name}` });
    setTimeout(() => router.push(`/recrutamento/candidatos/${data.data.id}`), 1200);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div>
        <label className="label">Arquivo do currículo (PDF ou DOCX, máx. 5 MB)</label>
        <input
          className="input"
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          required
        />
      </div>
      <div>
        <label className="label">Nome do candidato (se não for detectado no arquivo)</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {msg && (
        <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
          {msg.text}
        </p>
      )}
      <button className="btn-primary" disabled={loading || !file}>
        {loading ? 'Importando…' : 'Importar currículo'}
      </button>
    </form>
  );
}
