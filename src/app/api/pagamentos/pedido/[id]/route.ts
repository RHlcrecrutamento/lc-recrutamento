import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { assertSameOrigin } from '@/lib/access-security';
import { hasValidUnlock } from '@/lib/access';
import { reconcileOrder, safeCheckoutUrl } from '@/lib/payments';
import { ok,fail,handleApiError } from '@/lib/http';
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    assertSameOrigin(req);
    const u=await getSessionUser();if(!u||u.role!=='CLIENTE')return fail('Acesso restrito.',403);
    let o=await db.prepare('SELECT * FROM orders WHERE id=? AND company_id=?').get((await params).id,u.company_id) as any;
    if(!o)return fail('Pedido não encontrado.',404);
    await reconcileOrder(o.id,u.company_id!);
    o=await db.prepare('SELECT * FROM orders WHERE id=? AND company_id=?').get(o.id,u.company_id) as any;
    return ok({status:o.status,unlocked:await hasValidUnlock(o.application_id,u.company_id!),application_id:o.application_id,payment_url:o.status==='pendente'&&new Date(o.checkout_expires_at).getTime()>Date.now()?safeCheckoutUrl(o.checkout_url):null});
  }catch(e){return handleApiError(e);}
}
