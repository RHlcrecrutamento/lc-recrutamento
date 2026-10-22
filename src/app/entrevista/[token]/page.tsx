import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { Logo } from '@/components/Logo';
import { InterviewChat } from '@/components/InterviewChat';

export const dynamic = 'force-dynamic';

export default async function EntrevistaPage({ params }: { params: Promise<{ token: string }> }) {
  const interview = await db.prepare('SELECT id, status FROM interviews WHERE token = ?').get((await params).token) as any;
  if (!interview) notFound();

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-900 to-brand-800">
      <header className="mx-auto flex max-w-3xl items-center px-4 py-4">
        <Logo size={40} dark />
        <span className="ml-auto rounded-full bg-white/10 px-3 py-1 text-xs text-white">Entrevista online</span>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-10">
        <InterviewChat token={(await params).token} />
      </main>
    </div>
  );
}
