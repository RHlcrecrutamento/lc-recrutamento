import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { CompanyRegisterForm } from '@/components/CompanyRegisterForm';
export const metadata = {title:'Cadastro de empresa | Triatalent'};
export default function Page() {
  return <main className="min-h-screen bg-gradient-to-b from-brand-950 to-brand-900 px-4 py-10"><div className="mx-auto max-w-2xl"><div className="mb-7 text-center"><Link className="inline-block" href="/"><Logo dark size={48} /></Link><h1 className="mt-6 text-3xl font-bold text-white">Sua empresa, seus próximos talentos</h1><p className="mt-3 text-sm leading-relaxed text-brand-100">Cadastre-se sem convite e acesse seu painel para começar a cadastrar vagas.</p></div><CompanyRegisterForm /><p className="mt-6 text-center text-sm text-brand-200">Está buscando emprego? <Link className="font-semibold text-white underline" href="/cadastro">Cadastre-se como candidato</Link></p></div></main>;
}
