/**
 * Perfil anonimizado do candidato para o cliente.
 * Rota de API endurecida: mesmo acessando direto por URL/curl, o cliente
 * não recebe dados de candidatos não liberados nem informações protegidas.
 */
import { getSessionUser } from '@/lib/auth';
import { ok, fail, handleApiError } from '@/lib/http';
import { getAnonymizedCandidate, hasValidUnlock, getUnlockPriceCents } from '@/lib/access';
import { db, uj } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return fail('Não autenticado.', 401);

    const applicationId = (await params).id;
    const app = await db
      .prepare(`SELECT a.*, j.company_id, j.title AS job_title FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.id = ?`)
      .get(applicationId) as any;

    if (user.role === 'CLIENTE') {
      if (!app || app.company_id !== user.company_id) return fail('Candidato não encontrado.', 404);
      const anon = await getAnonymizedCandidate(applicationId, user);
      if (!anon) return fail('Este candidato ainda não está disponível para análise.', 403);

      const report = await db
        .prepare(`SELECT id, status, compatibility_score, compatibility_justification, public_summary_json, reviewed_at
                  FROM reports WHERE application_id = ? AND status = 'validado' AND published_at IS NOT NULL`)
        .get(applicationId) as any;

      return ok({
        application: {
          id: app.id,
          job_title: app.job_title,
          stage: app.stage,
          client_interest: app.client_interest,
          client_decision: app.client_decision,
          released_at: app.released_at,
        },
        candidate: anon,
        report: report
          ? {
              id: report.id,
              compatibility_score: report.compatibility_score,
              compatibility_justification: report.compatibility_justification,
              public_summary: uj(report.public_summary_json, {}),
              validated_at: report.reviewed_at,
            }
          : null,
        unlock: {
          price_cents: await getUnlockPriceCents(user.company_id),
          already_unlocked: await hasValidUnlock(applicationId, user.company_id!),
        },
      });
    }

    if (!['ADMIN', 'RECRUTADOR'].includes(user.role)) return fail('Sem permissão.', 403);
    // Equipe interna vê tudo (para trabalho de recrutamento)
    return ok({ application: app, internal: true, full: await db.prepare('SELECT * FROM candidates WHERE id = ?').get(app?.candidate_id) });
  } catch (e) {
    return handleApiError(e);
  }
}
