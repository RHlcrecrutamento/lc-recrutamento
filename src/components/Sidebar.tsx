'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';

const MENUS: Record<string, { href: string; label: string }[]> = {
  ADMIN: [
    { href: '/recrutamento', label: '📋 Revisão e aprovação' },
    { href: '/recrutamento/vagas', label: '💼 Vagas para revisar' },
    { href: '/recrutamento/candidatos', label: '👥 Candidatos para analisar' },
    { href: '/recrutamento/avisos', label: '💬 WhatsApp — envio manual' },
  ],
  RECRUTADOR: [
    { href: '/recrutamento', label: '📋 Revisão e aprovação' },
    { href: '/recrutamento/vagas', label: '💼 Vagas para revisar' },
    { href: '/recrutamento/candidatos', label: '👥 Candidatos para analisar' },
    { href: '/recrutamento/avisos', label: '💬 WhatsApp — envio manual' },
  ],
  CLIENTE: [
    { href: '/cliente', label: '📊 Visão geral' },
    { href: '/cliente/vagas', label: '💼 Minhas vagas' },
    { href: '/cliente/candidatos', label: '👥 Candidatos liberados' },
    { href: '/cliente/pagamentos', label: '💳 Pagamentos e desbloqueios' },
  ],
  CANDIDATO: [
    { href: '/me', label: '📊 Visão geral' },
    { href: '/me/perfil', label: '👤 Meu perfil' },
    { href: '/me/candidaturas', label: '💼 Minhas candidaturas' },
    { href: '/vagas', label: '🔎 Vagas abertas' },
  ],
};

export function Sidebar({ user, inline = false }: { user: { name: string; email: string; role: string }; inline?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const items = [...(MENUS[user.role] || []), { href: '/conta/seguranca', label: '🔐 Minha senha' }];

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  const roleLabel: Record<string, string> = {
    ADMIN: 'Administrador Triatalent',
    RECRUTADOR: 'Recrutador Triatalent',
    CLIENTE: 'Cliente',
    CANDIDATO: 'Candidato',
  };

  return (
    <aside className={`flex flex-col bg-brand-900 text-white ${inline ? 'relative w-full rounded-xl' : 'fixed inset-y-0 left-0 z-30 w-64 lg:static'}`}>
      <div className="border-b border-white/10 px-4 py-4">
        <Logo size={38} dark />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active ? 'bg-accent-600 font-semibold text-white' : 'text-brand-100 hover:bg-white/10'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-4 py-4">
        <p className="truncate text-sm font-semibold">{user.name}</p>
        <p className="truncate text-xs text-brand-200">{roleLabel[user.role] || user.role}</p>
        <button onClick={logout} className="mt-3 w-full rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/20">
          Sair
        </button>
      </div>
    </aside>
  );
}
