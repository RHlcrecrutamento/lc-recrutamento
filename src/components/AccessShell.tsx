import Link from 'next/link';
import { Logo } from './Logo';
export function AccessShell({ title, subtitle, children }: {title: string; subtitle: string; children: React.ReactNode}) {
  return <div className="min-h-screen bg-brand-950 lg:grid lg:grid-cols-2">
    <aside className="relative hidden min-h-screen flex-col justify-between overflow-hidden border-r border-white/10 bg-brand-950 p-12 text-white lg:flex">
      <div className="absolute -right-24 top-12 h-80 w-80 rounded-full bg-violet-600/10 blur-3xl" aria-hidden="true" />
      <Link href="/" className="relative"><Logo size={44} dark /></Link>
      <div className="relative mx-auto w-full max-w-lg">
        <img src="/marca/triatalent.webp" alt="Triatalent — Talentos que fazem a diferença" width="600" height="600" className="mx-auto w-full rounded-3xl" />
        <p className="mt-3 text-center text-sm leading-relaxed text-slate-300">Tecnologia para conectar. Pessoas para decidir.</p>
      </div>
      <p className="relative text-xs text-slate-400">Entrevistas estruturadas · Validação humana · Privacidade</p>
    </aside>
    <main className="flex min-h-screen flex-col justify-center bg-slate-50 px-5 py-10 sm:px-12">
      <div className="mx-auto w-full max-w-md">
        <Link href="/" className="mb-10 inline-block lg:hidden"><Logo size={44} /></Link>
        <Link href="/entrar" className="text-sm font-medium text-brand-700 hover:underline">← Escolher outro acesso</Link>
        <p className="mb-2 mt-8 text-xs font-bold uppercase tracking-[0.2em] text-violet-700">Sua próxima conexão começa aqui</p>
        <h1 className="text-3xl font-bold tracking-tight text-brand-950">{title}</h1>
        <p className="mb-7 mt-3 text-sm leading-relaxed text-slate-600">{subtitle}</p>
        {children}
        <div className="mt-8 flex justify-center gap-5 text-xs text-slate-500"><Link href="/privacidade" className="hover:underline">Privacidade</Link><Link href="/termos" className="hover:underline">Termos de uso</Link></div>
      </div>
    </main>
  </div>;
}
