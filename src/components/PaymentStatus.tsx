'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClientCandidateActions } from './ClientCandidateActions';
export function PaymentStatus({orderId,applicationId,amountCents,initialStatus,initialUnlocked,checkoutUrl}:{orderId:string;applicationId:string;amountCents:number;initialStatus:string;initialUnlocked:boolean;checkoutUrl:string|null}) {
  const router=useRouter();
  const [status,setStatus]=useState(initialStatus);const [unlocked,setUnlocked]=useState(initialUnlocked);const [message,setMessage]=useState('');const [checking,setChecking]=useState(false);const [url,setUrl]=useState(checkoutUrl);
  const busy=useRef(false);const lastAccess=useRef(initialUnlocked);
  async function check(){if(busy.current)return;busy.current=true;setChecking(true);try{
    const r=await fetch(`/api/pagamentos/pedido/${orderId}`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});const b=await r.json();
    if(b.ok){setStatus(b.data.status);setUnlocked(b.data.unlocked);setUrl(b.data.payment_url);setMessage('');if(b.data.unlocked!==lastAccess.current){lastAccess.current=b.data.unlocked;router.refresh();}}
    else setMessage(b.error||'Não foi possível consultar agora. Nenhum contato foi liberado por esta tela.');
  }catch{setMessage('Falha de conexão ao verificar. Tente novamente em instantes.');}finally{busy.current=false;setChecking(false);}}
  useEffect(()=>{let count=0;void check();const timer=setInterval(()=>{if(++count>=40){clearInterval(timer);return;}void check();},15000);return()=>clearInterval(timer);},[orderId]); // Dez minutos de atualização; depois, botão manual.
  return <section className="card space-y-4"><h2 className="text-lg font-semibold text-brand-900">{unlocked?'Pagamento confirmado — contatos liberados':status==='reembolsado'?'Acesso revogado por estorno ou contestação':status==='aprovado'?'Pagamento registrado — confira o ambiente e a validade do acesso':'Aguardando confirmação do pagamento'}</h2>
    <p className="text-sm text-slate-600">Voltar do Mercado Pago não confirma a compra. Esta tela consulta o servidor, que verifica o pagamento diretamente no Mercado Pago. Se pagou, não faça um novo pagamento enquanto aguarda.</p>
    {unlocked?<><Link className="btn-primary inline-flex" href={`/cliente/candidato/${applicationId}`}>Ver candidato e contatos</Link><p className="text-sm text-slate-500">Não é necessário registrar entrevista ou resultado depois da compra.</p></>:status!=='reembolsado'&&status!=='aprovado'&&(url?<a className="btn-primary inline-flex" href={url}>Continuar no Mercado Pago</a>:<ClientCandidateActions applicationId={applicationId} decision="aprovado" unlocked={false} priceCents={amountCents}/>)}
    <div><button className="btn-outline" disabled={checking} onClick={check}>{checking?'Verificando no servidor…':'Verificar pagamento novamente'}</button></div>
    {message&&<p role="status" className="text-sm text-amber-800">{message}</p>}
    <p className="text-xs text-slate-500">A atualização automática desta tela dura até 10 minutos. Você pode verificar novamente a qualquer momento. O webhook continua recebendo confirmações mesmo com esta tela fechada.</p>
  </section>;
}
