import { PasswordForm } from '@/components/PasswordForm';
export default function Page() {
 return <div className="mx-auto max-w-xl"><p className="text-xs font-semibold uppercase tracking-widest text-violet-700">Minha conta</p><h1 className="mt-2 text-3xl font-bold text-brand-950">Segurança de acesso</h1><p className="mb-6 mt-3 text-sm leading-relaxed text-slate-600">Escolha uma senha exclusiva. Ao trocar a senha, todas as sessões serão encerradas, inclusive esta. Seu e-mail de acesso não será alterado.</p><PasswordForm mode="change" /></div>;
}
