/**
 * Verificação de saúde do sistema.
 *
 * Duas utilidades:
 *  1. O Render usa esta rota para saber se o site está funcionando;
 *  2. Um monitor gratuito (UptimeRobot / cron-job.org) chama esta rota a cada
 *     10 minutos para impedir que o plano gratuito "adormeça".
 *
 * Não expõe nenhum dado sensível — só o status.
 */
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const inicio = Date.now();
  try {
    const row = (await db.prepare('SELECT 1 AS ok').get()) as { ok: number } | undefined;
    return NextResponse.json({
      status: row?.ok === 1 ? 'ok' : 'erro',
      banco: 'conectado',
      versao: '1.1-triatalent',
      ms: Date.now() - inicio,
      hora: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error('Verificação de saúde: banco indisponível.');
    return NextResponse.json(
      { status: 'erro', banco: 'sem conexão', hora: new Date().toISOString() },
      { status: 503 }
    );
  }
}
