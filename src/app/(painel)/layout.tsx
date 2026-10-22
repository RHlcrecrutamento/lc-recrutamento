import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';

export const dynamic = 'force-dynamic';

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/entrar');

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Sidebar no mobile vira barra superior */}
      <div className="hidden lg:block">
        <Sidebar user={{ name: user.name, email: user.email, role: user.role }} />
      </div>
      <div className="w-full lg:hidden">
        <details className="bg-brand-900 px-4 py-3 text-white">
          <summary className="cursor-pointer text-sm font-semibold">☰ Menu — {user.name}</summary>
          <div className="mt-3">
            <Sidebar inline user={{ name: user.name, email: user.email, role: user.role }} />
          </div>
        </details>
      </div>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
