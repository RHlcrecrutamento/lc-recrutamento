import Link from 'next/link';
import { Logo } from '@/components/Logo';
export const metadata = { title: 'Escolha seu acesso | Triatalent' };
export default function Page() {
  return <main className="min-h-screen bg-brand-950 px-5 py-12 text-white">
    <div className="mx-auto max-w-5xl"><Link href="/"><Logo dark size={48} /></Link>
      <div className="mx-auto mb-12 mt-20 max-w-xl text-center"><p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">Conexões que fazem a diferença</p><h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Bem-vindo à Triatalent</h1><p className="mt-5 leading-relaxed text-slate-300">Escolha seu perfil para acessar um ambiente feito para você.</p></div>
      <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
        {[
          {href: '/entrar/empresa', label: 'Sou empresa', badge: 'PARA CONTRATAR', text: 'Acompanhe vagas, analise relatórios validados e encontre os talentos certos.', color: 'bg-cyan-400', note: 'Cadastro aberto, sem convite'},
          {href: '/entrar/candidato', label: 'Sou candidato', badge: 'PARA CRESCER', text: 'Atualize seu perfil, participe de entrevistas e acompanhe suas oportunidades.', color: 'bg-violet-400', note: 'Gratuito em todas as etapas'},
        ].map(item => <Link key={item.href} href={item.href} className="group rounded-2xl border border-white/15 bg-white/5 p-8 transition hover:-translate-y-1 hover:border-cyan-300/50 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400"><span className={`mb-7 block h-1 w-12 rounded-full ${item.color}`} /><span className="text-[10px] font-semibold tracking-widest text-slate-300">{item.badge}</span><h2 className="mt-3 text-2xl font-bold">{item.label} <span aria-hidden="true">→</span></h2><p className="mt-4 text-sm leading-relaxed text-slate-300">{item.text}</p><p className="mt-7 text-xs font-semibold text-cyan-200">{item.note}</p></Link>)}
      </div>
      <p className="mt-12 text-center text-sm text-slate-400">Já faz parte da nossa operação? <Link href="/entrar/equipe" className="text-slate-200 underline underline-offset-4">Acesso da equipe</Link></p>
      <div className="mt-14 flex justify-center gap-6 text-xs text-slate-400"><Link href="/">Página inicial</Link><Link href="/privacidade">Privacidade</Link><Link href="/termos">Termos de uso</Link></div>
    </div>
  </main>;
}
