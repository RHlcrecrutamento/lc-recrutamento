import crypto from 'crypto';
import { db, audit } from './db';
import { getClientIp } from './auth';

export function digest(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/** Contador atômico e persistente: reiniciar o serviço não remove o limite. */
export async function limit(scope: string, identity: string, max: number, minutes: number) {
  const key = digest(`${scope}:${identity}`);
  const now = new Date().toISOString();
  const expiry = new Date(Date.now() + minutes * 60_000).toISOString();
  const row = await db.prepare(`INSERT INTO auth_rate_limits (key, attempts, expires_at) VALUES (?, 1, ?)
    ON CONFLICT (key) DO UPDATE SET
      attempts = CASE WHEN auth_rate_limits.expires_at <= ? THEN 1 ELSE auth_rate_limits.attempts + 1 END,
      expires_at = CASE WHEN auth_rate_limits.expires_at <= ? THEN excluded.expires_at ELSE auth_rate_limits.expires_at END
    RETURNING attempts`).get(key, expiry, now, now);
  if (row.attempts > max) {
    const error: any = new Error('Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.');
    error.status = 429;
    throw error;
  }
}

/** Origin é apenas uma defesa adicional; autorização continua obrigatória. */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return;
  const allowed = new Set([new URL(req.url).origin]);
  if (process.env.APP_URL) {
    allowed.add(new URL(process.env.APP_URL).origin);
  } else {
    // Next pode construir req.url com 0.0.0.0 atrás do proxy. Sem URL canônica,
    // comparar com Host real é a verificação same-origin padrão do navegador.
    const host = req.headers.get('host');
    if (host && new URL(origin).host === host) return;
  }
  if (!allowed.has(origin)) {
    const error: any = new Error('Origem da solicitação inválida.');
    error.status = 403;
    throw error;
  }
}

export function validPassword(value: string) {
  // bcrypt considera no máximo 72 bytes; não aceitar truncamento silencioso.
  return value.length >= 10 && Buffer.byteLength(value, 'utf8') <= 72 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value);
}
export const PASSWORD_RULE = 'Use ao menos 10 caracteres, com maiúscula, minúscula e número (máximo 72 bytes).';

export function mailConfigured() {
  try {
    const sender = process.env.EMAIL_FROM;
    const delivery = process.env.BREVO_API_KEY || process.env.RESEND_API_KEY;
    return !!(sender && delivery && new URL(process.env.APP_URL || '').protocol === 'https:');
  } catch { return false; }
}

/** Link nunca usa Host recebido do navegador. Token só é armazenado como hash. */
export async function sendPasswordLink(user: {id: string; email: string; password_hash: string}, invite = false) {
  if (!mailConfigured()) throw new Error('Envio de e-mail não configurado.');
  const token = crypto.randomBytes(32).toString('hex');
  const hash = digest(token);
  const expires = new Date(Date.now() + 30 * 60_000).toISOString();
  await db.prepare('DELETE FROM password_resets WHERE expires_at <= ?').run(new Date().toISOString());
  await db.prepare('DELETE FROM auth_rate_limits WHERE expires_at <= ?').run(new Date().toISOString());
  await db.prepare('INSERT INTO password_resets (token_hash, user_id, password_hash_at_issue, expires_at) VALUES (?, ?, ?, ?)')
    .run(hash, user.id, user.password_hash, expires);
  const url = new URL('/redefinir-senha', process.env.APP_URL!);
  // Fragmento evita que o token seja enviado nos logs de requisição da página.
  url.hash = `token=${token}`;
  try {
    const message = {
      from: process.env.EMAIL_FROM!,
      to: user.email,
      subject: invite ? 'Seu convite para a Triatalent' : 'Redefinição de senha • Triatalent',
      text: `${invite ? 'Você recebeu um convite para acessar a Triatalent.' : 'Recebemos uma solicitação de redefinição de senha.'}\n\nDefina sua senha neste link (válido por 30 minutos):\n${url.toString()}\n\nSe não reconhece esta solicitação, ignore a mensagem. Nenhuma senha será alterada sem usar o link.\n\nTriatalent — Talentos que fazem a diferença`,
    };
    if (process.env.BREVO_API_KEY) {
      const from = message.from.match(/<([^>]+)>/)?.[1] || message.from;
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json'},
        body: JSON.stringify({sender: {name: 'Triatalent', email: from}, to: [{email: user.email}], subject: message.subject, textContent: message.text}),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error('Provedor não aceitou o envio.');
    } else {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({...message, to: [user.email]}),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error('Provedor não aceitou o envio.');
    }
    await audit(user.id, invite ? 'convite_enviado' : 'recuperacao_solicitada', 'users', user.id, undefined, await getClientIp());
  } catch {
    await db.prepare('DELETE FROM password_resets WHERE token_hash = ?').run(hash);
    // Não registrar resposta do provedor: pode conter e-mail ou conteúdo sensível.
    throw new Error('Falha no serviço de e-mail.');
  }
}
