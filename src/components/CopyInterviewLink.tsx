'use client';

import { useState } from 'react';

/** Interações do navegador ficam isoladas da ficha renderizada no servidor. */
export function CopyInterviewLink({ token }: { token: string }) {
  const [message, setMessage] = useState('');
  const [manualLink, setManualLink] = useState('');
  const [copying, setCopying] = useState(false);
  const path = `/entrevista/${encodeURIComponent(token)}`;

  async function copyLink() {
    setCopying(true);
    setMessage('');
    const url = new URL(path, window.location.origin).href;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Área de transferência indisponível.');
      await navigator.clipboard.writeText(url);
      setManualLink('');
      setMessage('Link copiado!');
    } catch {
      // Falta de permissão do navegador nunca deve derrubar a ficha.
      setManualLink(url);
      setMessage('Não foi possível copiar automaticamente. Selecione e copie o endereço abaixo.');
    } finally {
      setCopying(false);
    }
  }

  if (!token) return <p className="mt-2 text-xs text-slate-500">Link de entrevista indisponível.</p>;
  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded bg-slate-50 px-2 py-1 text-xs text-slate-600">{path}</code>
        <button type="button" className="btn-outline shrink-0 px-2 py-1 text-xs" onClick={copyLink} disabled={copying}>
          {copying ? 'Copiando…' : 'Copiar link'}
        </button>
      </div>
      {message && <p role="status" aria-live="polite" className="text-xs text-slate-600">{message}</p>}
      {manualLink && <input aria-label="Link completo da entrevista para cópia manual" className="input text-xs" readOnly value={manualLink} onFocus={e => e.currentTarget.select()} />}
    </div>
  );
}
