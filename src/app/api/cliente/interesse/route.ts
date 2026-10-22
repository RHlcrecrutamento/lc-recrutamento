/** Decisão explícita do cliente. Aprovar não paga e não libera contato. */
import { db,audit,setStage } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { assertSameOrigin } from '@/lib/access-security';
import { ok,fail,handleApiError,readJson } from '@/lib/http';
import { isReleasedToClient,hasValidUnlock } from '@/lib/access';
export async function POST(req:Request){try{
 assertSameOrigin(req);const u=await requireUser(['CLIENTE']);const b=await readJson(req,5000);if(b.action!=='decisao'||!['aprovado','recusado'].includes(b.decisao))return fail('Escolha aprovar para pagamento ou reprovar o candidato.',400);
 const result=await db.transaction(async()=>{
 const a=await db.prepare('SELECT a.*,j.company_id FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=? FOR UPDATE OF a').get(String(b.application_id||'')) as any;
 if(!a||a.company_id!==u.company_id)return {error:'Candidatura não encontrada.',status:404};if(!await isReleasedToClient(a.id))return {error:'Perfil ainda não liberado pela equipe.',status:403};
 if(a.client_decision===b.decisao)return {msg:'Esta decisão já foi registrada.'};
 if(a.client_decision||await hasValidUnlock(a.id,u.company_id!))return {error:'A decisão já foi registrada ou há acesso pago. Procure a equipe para revisar.',status:409};
 if(b.decisao==='recusado'&&await db.prepare("SELECT id FROM orders WHERE application_id=? AND gateway='mercadopago' AND status IN ('pendente','aprovado') LIMIT 1").get(a.id))return {error:'Já existe um pedido pendente ou pago para este perfil. Não é possível registrar reprovação enquanto o pagamento está em andamento; procure a equipe.',status:409};
 await db.prepare('UPDATE applications SET client_decision=?,client_decision_note=?,client_interest=? WHERE id=?').run(b.decisao,String(b.justificativa||'').slice(0,1000),b.decisao==='aprovado'?'sim':null,a.id);
 if(b.decisao==='aprovado'&&a.stage<12)await setStage(a.id,'cliente_manifestou_interesse');
 await audit(u.id,'decisao_cliente','applications',a.id,{decision:b.decisao});return {msg:b.decisao==='aprovado'?'Perfil aprovado para prosseguir ao pagamento. Os contatos continuam protegidos.':'Perfil reprovado pela sua empresa. Nenhum pagamento foi iniciado.'};
 })();return 'error' in result?fail(result.error!,result.status):ok(result);
}catch(e){return handleApiError(e);}}
