/** Configurações administrativas (preços, integrações, parâmetros). */
import { aiConfigured } from '@/lib/ai';
import { db, audit, getSetting, setSetting } from '@/lib/db';
import { getSessionUser, getClientIp } from '@/lib/auth';
import { ok, fail, handleApiError, readJson } from '@/lib/http';

const EDITABLE_KEYS = [
  'price_per_unlock_cents', 'unlock_validity_days', 'demo_payments', 'interview_min_questions',
  'interview_max_questions', 'allow_candidate_registration', 'allow_public_jobs', 'support_email',
  'retention_days_candidates', 'smtp_host', 'smtp_port', 'smtp_user', 'smtp_from',
];

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'ADMIN') return fail('Somente administradores.', 403);
    const all = await db.prepare('SELECT key, value_json, updated_at FROM settings').all();
    const settings: Record<string, unknown> = {};
    for (const row of all as any[]) settings[row.key] = JSON.parse(row.value_json);
    return ok({
      settings,
      env: {
        ai_configured: aiConfigured(),
        ai_model: process.env.GEMINI_MODEL || 'não definido',
        mp_configured: !!process.env.MP_ACCESS_TOKEN,
        app_url: process.env.APP_URL || '(não definida)',
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'ADMIN') return fail('Somente administradores.', 403);
    const b = await readJson(req);
    const changed: Record<string, unknown> = {};
    for (const key of EDITABLE_KEYS) {
      if (b[key] !== undefined) {
        await setSetting(key, b[key]);
        changed[key] = b[key];
      }
    }
    await audit(user.id, 'configuracoes_alteradas', 'settings', undefined, changed, await getClientIp());
    return ok({ msg: 'Configurações salvas.', changed });
  } catch (e) {
    return handleApiError(e);
  }
}
