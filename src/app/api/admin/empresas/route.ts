/** Empresas clientes (admin). */
import { db, id, audit } from '@/lib/db';
import { getSessionUser, getClientIp } from '@/lib/auth';
import { ok, fail, handleApiError, readJson } from '@/lib/http';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || !['ADMIN', 'RECRUTADOR'].includes(user.role)) return fail('Sem permissão.', 403);
    return ok(await db.prepare('SELECT * FROM companies ORDER BY name').all());
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'ADMIN') return fail('Somente administradores.', 403);
    const b = await readJson(req);
    const name = String(b.name || '').trim();
    if (name.length < 2) return fail('Informe o nome da empresa.', 400);
    const cid = id('emp');
    await db.prepare(
      `INSERT INTO companies (id, name, cnpj, segment, city, state, contact_email, contact_phone, plan, price_per_unlock_cents)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    ).run(
      cid, name, String(b.cnpj || ''), String(b.segment || ''), String(b.city || ''), String(b.state || ''),
      String(b.contact_email || ''), String(b.contact_phone || ''), String(b.plan || 'padrao'),
      b.price_per_unlock_cents != null && b.price_per_unlock_cents !== '' ? Number(b.price_per_unlock_cents) : null
    );
    await audit(user.id, 'empresa_criada', 'companies', cid, { name }, await getClientIp());
    return ok({ id: cid }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
