'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
const STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
export function CompanyRegisterForm() {
  const router = useRouter();
  const [form,setForm] = useState({company:'',cnpj:'',segment:'',name:'',email:'',phone:'',city:'',state:'',password:'',confirm:'',website:'',accept:false});
  const [show,setShow] = useState(false);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const text = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f=>({...f,[key]:e.target.value}));
  async function submit(e: React.FormEvent) {
    e.preventDefault();setError('');
    if (form.password !== form.confirm) {setError('As senhas não coincidem.');return;}
    setLoading(true);
    try {
      const res = await fetch('/api/auth/cadastro-empresa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
      const data=await res.json();
      if (!data.ok) {setError(data.error || 'Não foi possível concluir o cadastro.');return;}
      router.push('/cliente');router.refresh();
    } catch {setError('Erro de conexão. Tente novamente.');}
    finally {setLoading(false);}
  }
  return <form onSubmit={submit} className="card space-y-6 sm:p-8">
    <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-4 text-sm leading-relaxed text-slate-700">Crie sua conta sem convite. O cadastro é gratuito; desbloqueios de contatos seguem os preços e as regras da plataforma.</div>
    <fieldset className="space-y-4"><legend className="mb-3 text-lg font-semibold text-brand-950">Dados da empresa</legend>
      <div><label className="label" htmlFor="company">Nome da empresa *</label><input id="company" className="input" autoComplete="organization" required minLength={3} maxLength={160} value={form.company} onChange={text('company')} /></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><label className="label" htmlFor="cnpj">CNPJ (opcional)</label><input id="cnpj" className="input uppercase" maxLength={18} value={form.cnpj} onChange={text('cnpj')} placeholder="Informe se disponível" /></div><div><label className="label" htmlFor="segment">Segmento</label><input id="segment" className="input" maxLength={120} value={form.segment} onChange={text('segment')} placeholder="Ex.: Tecnologia" /></div></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><label className="label" htmlFor="city">Cidade</label><input id="city" className="input" autoComplete="address-level2" maxLength={120} value={form.city} onChange={text('city')} /></div><div><label className="label" htmlFor="state">Estado</label><select id="state" className="input" autoComplete="address-level1" value={form.state} onChange={text('state')}><option value="">Selecione</option>{STATES.map(s=><option key={s}>{s}</option>)}</select></div></div>
    </fieldset>
    <fieldset className="space-y-4"><legend className="mb-3 text-lg font-semibold text-brand-950">Responsável e acesso</legend>
      <div><label className="label" htmlFor="responsible">Nome do responsável *</label><input id="responsible" className="input" autoComplete="name" required minLength={3} maxLength={120} value={form.name} onChange={text('name')} /></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><label className="label" htmlFor="company-email">E-mail de acesso *</label><input id="company-email" className="input" type="email" autoComplete="username" required maxLength={254} value={form.email} onChange={text('email')} /></div><div><label className="label" htmlFor="company-phone">Telefone com DDD *</label><input id="company-phone" className="input" type="tel" autoComplete="tel" required maxLength={25} value={form.phone} onChange={text('phone')} placeholder="(31) 99999-9999" /></div></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><label className="label" htmlFor="company-password">Senha *</label><input id="company-password" className="input" type={show?'text':'password'} autoComplete="new-password" required minLength={10} maxLength={72} value={form.password} onChange={text('password')} /></div><div><label className="label" htmlFor="company-confirm">Confirme a senha *</label><input id="company-confirm" className="input" type={show?'text':'password'} autoComplete="new-password" required minLength={10} maxLength={72} value={form.confirm} onChange={text('confirm')} /></div></div>
      <p className="text-xs text-slate-500">Use ao menos 10 caracteres com maiúscula, minúscula e número.</p><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={show} onChange={e=>setShow(e.target.checked)} />Mostrar senhas</label>
    </fieldset>
    <div className="hidden" aria-hidden="true"><label htmlFor="company-website">Website</label><input id="company-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={text('website')} /></div>
    <label className="flex items-start gap-3 text-sm leading-relaxed text-slate-600"><input className="mt-1" type="checkbox" required checked={form.accept} onChange={e=>setForm(f=>({...f,accept:e.target.checked}))} /><span>Declaro estar autorizado a representar esta empresa, aceito os <Link className="font-semibold text-brand-700 underline" href="/termos" target="_blank" rel="noopener noreferrer">Termos de Uso</Link> e estou ciente da <Link className="font-semibold text-brand-700 underline" href="/privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade</Link>.</span></label>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <button className="btn-primary w-full py-3" disabled={loading}>{loading?'Criando sua conta…':'Criar conta da empresa'}</button>
    <p className="text-center text-sm text-slate-500">Já possui acesso? <Link href="/entrar/empresa" className="font-semibold text-brand-700 hover:underline">Entrar como empresa</Link></p>
  </form>;
}
