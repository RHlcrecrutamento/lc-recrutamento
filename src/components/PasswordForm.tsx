'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
export function PasswordForm({ mode }: { mode: 'recover' | 'reset' | 'change' }) {
  const [email, setEmail] = useState('');
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [token, setToken] = useState('');
  const [ready, setReady] = useState(false);
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (mode === 'reset') {
      setToken(new URLSearchParams(window.location.hash.slice(1)).get('token') || '');
      window.history.replaceState(null, '', window.location.pathname);
    }
    setReady(true);
  }, [mode]);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setMessage('');
    if (mode !== 'recover' && password !== confirm) { setError('As senhas não coincidem.'); return; }
    setLoading(true);
    try {
      const path = mode === 'recover' ? 'recuperar' : mode === 'reset' ? 'redefinir' : 'senha';
      const res = await fetch(`/api/auth/${path}`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email, current, password, token})});
      const data = await res.json();
      if (!data.ok) { setError(data.error || 'Não foi possível concluir.'); return; }
      setMessage(data.data.msg); setPassword(''); setConfirm(''); setCurrent('');
    } catch { setError('Erro de conexão. Tente novamente.'); }
    finally { setLoading(false); }
  }
  if (mode === 'reset' && ready && !token) return <div className="card"><p role="alert">Link ausente ou inválido. Abra o link completo recebido por e-mail.</p><Link href="/recuperar-senha" className="btn-primary mt-4">Solicitar novo link</Link></div>;
  return <form className="card space-y-5" onSubmit={submit}>
    {mode === 'recover' ? <div><label htmlFor="recover-email" className="label">E-mail cadastrado</label><input id="recover-email" className="input py-3" type="email" autoComplete="email" maxLength={254} required value={email} onChange={e => setEmail(e.target.value)} /></div> : <>
      {mode === 'change' && <div><label htmlFor="current-pass" className="label">Senha atual</label><input id="current-pass" className="input" type="password" autoComplete="current-password" required value={current} onChange={e => setCurrent(e.target.value)} /></div>}
      <div><label htmlFor="new-pass" className="label">Nova senha</label><input id="new-pass" className="input" type={show ? 'text' : 'password'} autoComplete="new-password" minLength={10} maxLength={72} required value={password} onChange={e => setPassword(e.target.value)} /><p className="mt-2 text-xs text-slate-500">Ao menos 10 caracteres com letra maiúscula, minúscula e número. Não reutilize senhas de outros serviços.</p></div>
      <div><label htmlFor="confirm-pass" className="label">Confirme a nova senha</label><input id="confirm-pass" className="input" type={show ? 'text' : 'password'} autoComplete="new-password" minLength={10} maxLength={72} required value={confirm} onChange={e => setConfirm(e.target.value)} /></div>
      <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} />Mostrar nova senha</label>
    </>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <div role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}{mode !== 'recover' && <Link href="/entrar" className="mt-3 block font-bold underline">Voltar para o acesso</Link>}</div>}
    {(!message || mode === 'recover') && <button className="btn-primary w-full py-3" disabled={loading || !ready}>{loading ? 'Aguarde…' : mode === 'recover' ? 'Solicitar link de recuperação' : 'Salvar nova senha'}</button>}
  </form>;
}
