'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function LoginForm({ portal = 'candidato', jobId }: {portal?: 'empresa' | 'candidato' | 'equipe'; jobId?: string}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email, password, portal}) });
      const data = await res.json();
      if (!data.ok) { setError(data.error || 'Não foi possível entrar.'); return; }
      router.push(portal === 'candidato' && jobId ? `/candidatar/${encodeURIComponent(jobId)}` : '/painel'); router.refresh();
    } catch { setError('Não foi possível conectar. Tente novamente.'); }
    finally { setLoading(false); }
  }
  return <form onSubmit={submit} className="card space-y-5 p-6 sm:p-8">
    <div><label htmlFor="email" className="label">E-mail</label><input id="email" className="input py-3" type="email" maxLength={254} autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Seu e-mail cadastrado" /></div>
    <div><label htmlFor="password" className="label">Senha</label><div className="relative"><input id="password" className="input py-3 pr-20" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /><button type="button" className="absolute right-3 top-3 text-xs font-semibold text-brand-700" aria-label={show ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShow(!show)}>{show ? 'Ocultar' : 'Mostrar'}</button></div></div>
    <div className="text-right"><Link href="/recuperar-senha" className="text-sm font-medium text-brand-700 hover:underline">Esqueci minha senha</Link></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <button className="btn-primary w-full py-3" disabled={loading}>{loading ? 'Entrando…' : 'Entrar com segurança'}</button>
    {portal === 'candidato' && <p className="text-center text-sm text-slate-500">Ainda não tem conta? <Link href={jobId ? `/cadastro?vaga=${encodeURIComponent(jobId)}` : '/cadastro'} className="font-semibold text-brand-700 hover:underline">Cadastre-se gratuitamente</Link></p>}
    {portal === 'empresa' && <p className="text-sm leading-relaxed text-slate-500">Ainda não tem conta? <Link href="/cadastro/empresa" className="font-semibold text-brand-700 hover:underline">Cadastre sua empresa</Link> — sem necessidade de convite.</p>}
    {portal === 'equipe' && <p className="text-center text-xs text-slate-500">Área restrita a administradores e recrutadores autorizados.</p>}
  </form>;
}
