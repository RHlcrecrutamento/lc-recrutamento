/** Só notificações assinadas; payload/status da URL nunca aprovam um pagamento. */
import { ok, fail, handleApiError } from '@/lib/http';
import { verifyWebhookSignature, syncMercadoPagoPayment } from '@/lib/payments';
export async function POST(req: Request) {
  try {
    const url=new URL(req.url);
    const paymentId=url.searchParams.get('data.id')||'';
    if(!verifyWebhookSignature(paymentId,req.headers.get('x-signature'),req.headers.get('x-request-id')))return fail('Assinatura inválida ou expirada.',401);
    if(!/^\d{1,30}$/.test(paymentId))return fail('Identificador de pagamento inválido.',400);
    let b:any;try{b=JSON.parse(await req.text());}catch{return fail('JSON inválido.',400);}
    const topic=url.searchParams.get('type')||b.type;
    if(topic!=='payment')return ok({msg:'Evento ignorado.'});
    if(b.data?.id!=null&&String(b.data.id)!==paymentId)return fail('Identificador inconsistente.',400);
    const result=await syncMercadoPagoPayment(paymentId);
    return result.ok?ok(result):fail(result.message,409);
  }catch(e){return handleApiError(e);}
}
