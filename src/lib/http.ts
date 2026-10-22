/** Resposta padronizada das rotas de API. */
import { NextResponse } from 'next/server';

export function ok(data: unknown, init?: number) {
  return NextResponse.json({ ok: true, data }, { status: init || 200 });
}

export function fail(message: string, status = 400, extra?: unknown) {
  return NextResponse.json({ ok: false, error: message, ...(extra ? { extra } : {}) }, { status });
}

export function handleApiError(e: any) {
  const status = e?.status || 500;
  const message = e?.status ? e.message : 'Erro interno. Tente novamente.';
  if (status === 500) console.error('API error:', e);
  return fail(message, status);
}

/** Lê corpo JSON com limite de tamanho. */
export async function readJson(req: Request, maxBytes = 200_000): Promise<any> {
  const text = await req.text();
  if (text.length > maxBytes) {
    const err: any = new Error('Dados muito grandes.');
    err.status = 413;
    throw err;
  }
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    const err: any = new Error('JSON inválido.');
    err.status = 400;
    throw err;
  }
}
