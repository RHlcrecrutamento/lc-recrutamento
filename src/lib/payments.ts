/** Checkout Pro: sem fallback silencioso, confirmação sempre feita pelo servidor. */
import { createHmac, timingSafeEqual } from 'crypto';
import { db, id, getSetting, audit, setStage } from './db';
import { getUnlockPriceCents, hasValidUnlock, isReleasedToClient } from './access';
import { localDemoAllowed } from './payment-rules';

function paymentError(message: string,status=503): never {const e:any=new Error(message);e.status=status;throw e;}
function mpConfig() {
  const {MP_ACCESS_TOKEN,MP_WEBHOOK_SECRET,APP_URL,MP_ENVIRONMENT}=process.env;
  if(!MP_ACCESS_TOKEN||!MP_WEBHOOK_SECRET||!APP_URL||!['test','production'].includes(MP_ENVIRONMENT||''))paymentError('Pagamento ainda não configurado. A equipe Triatalent precisa concluir a configuração do Mercado Pago.');
  let origin: URL;try{origin=new URL(APP_URL);}catch{paymentError('Configure a URL pública do site para receber pagamentos.');}
  if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)paymentError('APP_URL deve ser a origem HTTPS pública do site, sem caminhos.');
  return {token:MP_ACCESS_TOKEN,secret:MP_WEBHOOK_SECRET,origin:origin.origin,test:MP_ENVIRONMENT==='test'};
}
async function mpFetch(path: string, init: RequestInit = {}) {
  const c=mpConfig();
  try {
    const res=await fetch(`https://api.mercadopago.com${path}`,{...init,cache:'no-store',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${c.token}`,'Content-Type':'application/json',...init.headers}});
    if(!res.ok){console.error('Mercado Pago: falha na API',res.status,path.split('?')[0]);paymentError('Não foi possível concluir a operação no Mercado Pago. Tente novamente em instantes.');}
    return await res.json();
  }catch(e){if((e as any)?.status)throw e;paymentError('O Mercado Pago não respondeu. Tente novamente em instantes.');}
}
export function safeCheckoutUrl(value: unknown): string | null {
  try {const u=new URL(String(value));return u.protocol==='https:'&&['www.mercadopago.com.br','sandbox.mercadopago.com.br','mercadopago.com.br'].includes(u.hostname)&&!u.username&&!u.password?u.toString():null;}catch{return null;}
}
export interface CreateOrderResult {order_id:string;status:string;amount_cents:number;payment_url?:string;gateway:string;message?:string;}
export async function createUnlockOrder(p:{clientUserId:string;companyId:string;applicationId:string;candidateId:string;ip?:string}): Promise<CreateOrderResult> {
  const config=mpConfig(); // Sem credenciais: nenhuma cobrança nem pedido demo é criado.
  return db.transaction(async()=>{
    await db.prepare('SELECT pg_advisory_xact_lock(hashtext(?))').get(`checkout:${p.companyId}:${p.applicationId}`);
    const app=await db.prepare('SELECT a.*, j.company_id FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=?').get(p.applicationId) as any;
    if(!app||app.company_id!==p.companyId||app.candidate_id!==p.candidateId||!await isReleasedToClient(p.applicationId))paymentError('Candidato indisponível para esta empresa.',403);
    if(app.client_decision !== 'aprovado')paymentError('A empresa precisa aprovar o candidato antes de iniciar o pagamento.',403);
    if(await hasValidUnlock(p.applicationId,p.companyId))paymentError('Os contatos já estão desbloqueados.',409);
    let order=await db.prepare("SELECT * FROM orders WHERE application_id=? AND company_id=? AND status='pendente' AND gateway='mercadopago' AND gateway_environment=? ORDER BY created_at DESC LIMIT 1 FOR UPDATE").get(p.applicationId,p.companyId,config.test?'test':'production') as any;
    if(!order){
      const amount=Number(await getUnlockPriceCents(p.companyId));
      if(!Number.isSafeInteger(amount)||amount<=0)paymentError('O preço do desbloqueio precisa ser configurado pela equipe.',400);
      const orderId=id('ord');
      await db.prepare("INSERT INTO orders(id,client_user_id,company_id,application_id,candidate_id,amount_cents,currency,status,gateway,gateway_environment) VALUES(?,?,?,?,?,?,'BRL','pendente','mercadopago',?)").run(orderId,p.clientUserId,p.companyId,p.applicationId,p.candidateId,amount,config.test?'test':'production');
      order=await db.prepare('SELECT * FROM orders WHERE id=?').get(orderId);
      await audit(p.clientUserId,'pedido_criado','orders',order.id,{applicationId:p.applicationId,amount,gateway:'mercadopago'},p.ip);
    }
    let url=safeCheckoutUrl(order.checkout_url);
    if(!url||!order.checkout_expires_at||new Date(order.checkout_expires_at).getTime()<=Date.now()){
      const expires=new Date(Date.now()+86400000).toISOString();
      const returnUrl=`${config.origin}/cliente/pagamentos/${order.id}`;
      const pref=await mpFetch('/checkout/preferences',{method:'POST',headers:{'X-Idempotency-Key':order.id},body:JSON.stringify({
        items:[{id:p.applicationId,title:'Triatalent — Acesso aos contatos de candidato',quantity:1,unit_price:order.amount_cents/100,currency_id:'BRL'}],
        external_reference:order.id,notification_url:`${config.origin}/api/pagamentos/webhook`,
        back_urls:{success:returnUrl,failure:returnUrl,pending:returnUrl},auto_return:'approved',
        expires:true,expiration_date_from:new Date().toISOString(),expiration_date_to:expires,
      })});
      url=safeCheckoutUrl(config.test?pref.sandbox_init_point:pref.init_point);
      if(!url||!pref.id)paymentError('O Mercado Pago não retornou um checkout válido. Nenhum contato foi liberado.');
      await db.prepare('UPDATE orders SET gateway_preference_id=?,checkout_url=?,checkout_expires_at=? WHERE id=?').run(String(pref.id),url,expires,order.id);
    }
    await db.prepare("UPDATE applications SET client_interest='sim',client_interest_at=COALESCE(client_interest_at,datetime('now')) WHERE id=?").run(p.applicationId);
    if(app.stage < 12) await setStage(p.applicationId,'cliente_manifestou_interesse');
    if(app.client_interest !== 'sim') await audit(p.clientUserId,'cliente_interesse','applications',p.applicationId,{orderId:order.id},p.ip);
    return {order_id:order.id,status:order.status,amount_cents:order.amount_cents,payment_url:url,gateway:'mercadopago'};
  })();
}

export function verifyWebhookSignature(dataId:string,signature:string|null,requestId:string|null): boolean {
  const secret=process.env.MP_WEBHOOK_SECRET;
  if(!secret||!signature||!dataId)return false;
  try{
    const parts=Object.fromEntries(signature.split(',').map(x=>x.trim().split('=')));
    if(!/^\d{10,13}$/.test(parts.ts||'')||!/^[a-f0-9]{64}$/i.test(parts.v1||''))return false;
    const timestamp=Number(parts.ts)*(parts.ts.length<=10?1000:1);
    if(Math.abs(Date.now()-timestamp)>15*60*1000)return false;
    const manifest=`id:${dataId.toLowerCase()};${requestId?`request-id:${requestId};`:''}ts:${parts.ts};`;
    const expected=createHmac('sha256',secret).update(manifest).digest();
    return timingSafeEqual(expected,Buffer.from(parts.v1,'hex'));
  }catch{return false;}
}
export interface ConfirmedPayment {id:string;status:string;amount:number;currency:string;external_reference:string;refunded:number;}
/** Lê /payments e confere o recebedor através do próprio token em /users/me. */
export async function confirmWithMercadoPago(paymentId:string): Promise<ConfirmedPayment|null> {
  if(!/^\d{1,30}$/.test(paymentId))return null;
  const c=mpConfig();
  const d=await mpFetch(`/v1/payments/${paymentId}`);
  const account=await mpFetch('/users/me');
  if(String(d.id)!==paymentId||!account.id||String(d.collector_id)!==String(account.id)||typeof d.live_mode!=='boolean'||d.live_mode===c.test) return null;
  if(!Number.isFinite(Number(d.transaction_amount))||Number(d.transaction_amount)<=0)return null;
  return {id:paymentId,status:String(d.status),amount:Math.round(Number(d.transaction_amount)*100),currency:String(d.currency_id),external_reference:String(d.external_reference||''),refunded:Math.round(Number(d.transaction_amount_refunded||0)*100)};
}

/** A transação e o bloqueio do vínculo impedem dois unlocks em notificações concorrentes. */
export async function approvePayment(p:{orderId:string;gatewayPaymentId:string;paidAmountCents?:number;currency?:string;source:'webhook'|'demo';rawPayload?:unknown;ip?:string}):Promise<{ok:boolean;message:string;unlock_id?:string}> {
  return db.transaction(async()=>{
    await db.prepare('SELECT pg_advisory_xact_lock(hashtext(?))').get(`payment:${p.gatewayPaymentId}`);
    const initial=await db.prepare('SELECT * FROM orders WHERE id=?').get(p.orderId) as any;
    if(!initial)return {ok:false,message:'Pedido não encontrado.'};
    await db.prepare('SELECT pg_advisory_xact_lock(hashtext(?))').get(`unlock:${initial.company_id}:${initial.application_id}`);
    const o=await db.prepare('SELECT * FROM orders WHERE id=? FOR UPDATE').get(p.orderId) as any;
    if(p.source==='demo'&&(!localDemoAllowed()||o.gateway!=='demo'||!await getSetting<boolean>('demo_payments')))return {ok:false,message:'Demonstração desativada ou pedido incompatível.'};
    if(p.source==='webhook'&&o.gateway!=='mercadopago')return {ok:false,message:'Gateway incompatível.'};
    if(p.paidAmountCents!==o.amount_cents||p.currency!==o.currency||!p.gatewayPaymentId)return {ok:false,message:'Valor ou moeda não confere com o pedido.'};
    if(o.status==='aprovado')return {ok:true,message:'Pagamento já confirmado.',unlock_id:(await db.prepare('SELECT id FROM unlocks WHERE order_id=?').get(o.id) as any)?.id};
    if(!['pendente','recusado','cancelado'].includes(o.status))return {ok:false,message:'Pedido encerrado; não pode liberar contatos novamente.'};
    const dup=await db.prepare('SELECT id FROM orders WHERE gateway_payment_id=?').get(p.gatewayPaymentId) as any;
    if(dup&&dup.id!==o.id)return {ok:false,message:'Transação já vinculada a outro pedido.'};
    const days=Number(await getSetting<number>('unlock_validity_days'))||365;
    const unlockId=id('unl');
    await db.prepare("UPDATE orders SET status='aprovado',gateway_payment_id=?,gateway_status='approved',paid_at=datetime('now') WHERE id=?").run(p.gatewayPaymentId,o.id);
    // Se já houver desbloqueio válido por outro pedido, a compra é auditada, sem gerar outro acesso.
    if(!await hasValidUnlock(o.application_id,o.company_id))await db.prepare('INSERT INTO unlocks(id,order_id,application_id,candidate_id,company_id,unlocked_by,fields_json,expires_at) VALUES(?,?,?,?,?,?,?,?)').run(unlockId,o.id,o.application_id,o.candidate_id,o.company_id,o.client_user_id,JSON.stringify({name:true,email:true,phone:true,whatsapp:true}),new Date(Date.now()+days*86400000).toISOString());
    await db.prepare('INSERT INTO payment_events(id,order_id,event_type,payload_json) VALUES(?,?,?,?)').run(id('evt'),o.id,'aprovado_'+p.source,JSON.stringify({payment_id:p.gatewayPaymentId}));
    await audit(o.client_user_id,'pagamento_aprovado','orders',o.id,{paymentId:p.gatewayPaymentId,source:p.source},p.ip);
    return {ok:true,message:'Pagamento confirmado. Contatos liberados.',unlock_id:unlockId};
  })();
}

export async function syncMercadoPagoPayment(paymentId:string,expectedOrderId?:string) {
  const p=await confirmWithMercadoPago(paymentId);
  if(!p)paymentError('Pagamento com identidade, recebedor ou ambiente incompatível.',409);
  if(expectedOrderId&&p.external_reference!==expectedOrderId)paymentError('Pagamento não pertence a este pedido.',409);
  const o=await db.prepare('SELECT * FROM orders WHERE id=?').get(p.external_reference) as any;
  if(!o)return {ok:true,message:'Pagamento sem pedido Triatalent correspondente; ignorado.'};
  if(o.gateway_environment!==(mpConfig().test?'test':'production'))paymentError('O pedido pertence a outro ambiente de pagamentos.',409);
  if(o.gateway!=='mercadopago'||o.amount_cents!==p.amount||o.currency!==p.currency)paymentError('Referência, valor ou moeda incompatível com o pedido.',409);
  if(['refunded','charged_back'].includes(p.status)||p.refunded>0){
    await db.transaction(async()=>{
      const locked=await db.prepare('SELECT * FROM orders WHERE id=? FOR UPDATE').get(o.id) as any;
      if(locked.gateway_payment_id&&locked.gateway_payment_id!==p.id)return;
      await db.prepare("UPDATE orders SET status='reembolsado',gateway_payment_id=?,gateway_status=?,refunded_at=datetime('now') WHERE id=?").run(p.id,p.status,o.id);
      await db.prepare("UPDATE unlocks SET revoked_at=COALESCE(revoked_at,datetime('now')) WHERE order_id=?").run(o.id);
      await audit(null,'pagamento_estornado_gateway','orders',o.id,{paymentId:p.id,status:p.status});
    })();
    return {ok:true,message:'Estorno ou contestação confirmado; acesso revogado.'};
  }
  if(p.status==='approved')return approvePayment({orderId:o.id,gatewayPaymentId:p.id,paidAmountCents:p.amount,currency:p.currency,source:'webhook'});
  // Recusa de uma tentativa não encerra a preferência: o comprador pode tentar outro meio.
  await db.prepare("UPDATE orders SET gateway_status=? WHERE id=? AND status <> 'aprovado' AND status <> 'reembolsado'").run(p.status,o.id);
  return {ok:true,message:'Pagamento ainda não aprovado. Os contatos permanecem protegidos.'};
}
/** Consulta autenticada por external_reference; ignora qualquer status vindo da URL de retorno. */
export async function reconcileOrder(orderId:string,companyId:string) {
  const allowed=await db.transaction(async()=>{
    const o=await db.prepare('SELECT * FROM orders WHERE id=? AND company_id=? FOR UPDATE').get(orderId,companyId) as any;
    if(!o)paymentError('Pedido não encontrado.',404);
    if(o.gateway!=='mercadopago')return null;
    if(o.gateway_environment!==(process.env.MP_ENVIRONMENT==='test'?'test':'production'))return null;
    if(o.last_checked_at&&Date.now()-new Date(o.last_checked_at).getTime()<15000)return null;
    await db.prepare("UPDATE orders SET last_checked_at=datetime('now') WHERE id=?").run(o.id);
    return o;
  })();
  if(!allowed)return;
  if(allowed.gateway_payment_id){await syncMercadoPagoPayment(String(allowed.gateway_payment_id),orderId);return;}
  const matches=await mpFetch(`/v1/payments/search?external_reference=${encodeURIComponent(orderId)}&sort=date_created&criteria=desc&limit=50`);
  const list=Array.isArray(matches.results)?matches.results:[];
  // Processa os aprovados antes das recusas e não libera por um resultado da busca sem nova consulta.
  for(const p of [...list].sort((a:any,b:any)=>Number(b.status==='approved')-Number(a.status==='approved'))) {
    if(p.external_reference===orderId&&/^\d+$/.test(String(p.id)))await syncMercadoPagoPayment(String(p.id),orderId);
  }
}
export async function rejectPayment(orderId:string,reason:string,source:string) {
  await db.prepare("UPDATE orders SET status='recusado' WHERE id=? AND status='pendente'").run(orderId);
  await audit(null,'pagamento_recusado','orders',orderId,{reason,source});
}
/** Reembolso real só revoga depois de confirmado pela API do Mercado Pago. */
export async function refundOrder(orderId:string,adminId:string) {
  const o=await db.prepare('SELECT * FROM orders WHERE id=?').get(orderId) as any;
  if(!o||o.status!=='aprovado')paymentError('Apenas pedidos aprovados podem ser reembolsados.',400);
  if(o.gateway==='mercadopago'){
    if(o.gateway_environment!==(mpConfig().test?'test':'production') || !/^\d+$/.test(String(o.gateway_payment_id||'')))paymentError('O pedido não pertence ao ambiente configurado ou não tem pagamento confirmado no gateway.',400);
    await mpFetch(`/v1/payments/${encodeURIComponent(o.gateway_payment_id)}/refunds`,{method:'POST',headers:{'X-Idempotency-Key':`refund-${o.id}`},body:'{}'});
    await syncMercadoPagoPayment(String(o.gateway_payment_id),o.id);
    const updated=await db.prepare('SELECT status FROM orders WHERE id=?').get(o.id) as any;
    if(updated.status!=='reembolsado')paymentError('Reembolso solicitado ao Mercado Pago, ainda aguardando confirmação. O acesso não foi alterado.');
  }else{
    if(!localDemoAllowed())paymentError('Reembolso demonstrativo indisponível em produção.',403);
    await db.transaction(async()=>{await db.prepare("UPDATE orders SET status='reembolsado',refunded_at=datetime('now') WHERE id=?").run(o.id);await db.prepare("UPDATE unlocks SET revoked_at=datetime('now') WHERE order_id=?").run(o.id);})();
  }
  await audit(adminId,'pagamento_reembolsado','orders',o.id,{revogado:true});
}
