/** Criação de pedido de desbloqueio (cliente). Preço sempre do servidor. */
import { assertSameOrigin, limit } from '@/lib/access-security';
import { db, audit, setStage } from '@/lib/db';
import { getSessionUser, getClientIp } from '@/lib/auth';
import { ok, fail, handleApiError, readJson } from '@/lib/http';
import { createUnlockOrder } from '@/lib/payments';
import { isReleasedToClient, hasValidUnlock, getUnlockPriceCents } from '@/lib/access';

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await getSessionUser();
    if (!user || user.role !== 'CLIENTE') return fail('Somente clientes podem comprar desbloqueios.', 403);
    await limit('checkout-company', user.company_id || user.id, 30, 60);
    const b = await readJson(req);
    const applicationId = String(b.application_id || '');

    const app = await db
      .prepare(
        `SELECT a.*, j.company_id FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.id = ?`
      )
      .get(applicationId) as any;
    if (!app) return fail('Candidatura não encontrada.', 404);
    if (app.company_id !== user.company_id) return fail('Esta candidatura não pertence à sua empresa.', 403);
    if (!await isReleasedToClient(applicationId)) {
      return fail('Este candidato ainda não está disponível para desbloqueio.', 403);
    }
    if (await hasValidUnlock(applicationId, user.company_id!)) {
      return fail('Dados já desbloqueados.', 409);
    }

    if(app.client_decision !== 'aprovado')return fail('Aprove o candidato para continuar ao pagamento.',403);
    const result = await createUnlockOrder({
      clientUserId: user.id,
      companyId: user.company_id!,
      applicationId,
      candidateId: app.candidate_id,
      ip: await getClientIp(),
    });
    return ok(result, 201);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return fail('Não autenticado.', 401);
    if (user.role === 'CLIENTE') {
      const linhas = await db
        .prepare(
          `SELECT o.*, a.stage, j.title AS job_title, c.name AS candidate_name_internal
           FROM orders o
           JOIN applications a ON a.id = o.application_id
           JOIN jobs j ON j.id = a.job_id
           JOIN candidates c ON c.id = o.candidate_id
           WHERE o.company_id = ? ORDER BY o.created_at DESC`
        )
        .all(user.company_id);
      // nome interno NÃO vai ao cliente — mascaramos aqui
      const rows = linhas.map((r: any) => {
        const { candidate_name_internal, ...rest } = r;
        return { ...rest, candidate_ref: `CAND-${Math.abs([...r.candidate_id].reduce((a: number, c: string) => a + c.charCodeAt(0) * 7, 0) % 900000 + 100000)}` };
      });
      return ok(rows);
    }
    if (!['ADMIN', 'RECRUTADOR'].includes(user.role)) return fail('Sem permissão.', 403);
    return ok(await db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 300').all());
  } catch (e) {
    return handleApiError(e);
  }
}
