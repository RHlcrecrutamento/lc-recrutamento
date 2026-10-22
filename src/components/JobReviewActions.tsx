'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function JobReviewActions({jobId,status,decision}:{jobId:string;status:string;decision?:string}){
 const router=useRouter();const [note,setNote]=useState(''),[loading,setLoading]=useState(false),[message,setMessage]=useState('');
 async function decide(value:string){setLoading(true);setMessage('');try{const r=await fetch(`/api/triagem/vagas/${jobId}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({decision:value,note})});const b=await r.json();setMessage(b.data?.msg||b.error);if(b.ok)router.refresh();}catch{setMessage('Falha de conexão. Atualize a página antes de repetir.');}finally{setLoading(false);}}
 return <section className="card space-y-3"><h2 className="font-semibold">Decisão da vaga</h2>{status==='aguardando_aprovacao'?<><label className="label">Anotação interna da revisão (não enviada ao cliente)<textarea className="input mt-1" rows={2} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}/></label><div className="flex flex-wrap gap-3"><button className="btn-primary" disabled={loading} onClick={()=>decide('aprovada')}>Aprovar vaga</button><button className="btn-danger" disabled={loading} onClick={()=>decide('reprovada')}>Reprovar vaga</button></div></>:<p className="text-sm">Situação: {decision||status}. As alterações do formulário não aprovam a vaga automaticamente.</p>}{message&&<p role="status" className="text-sm">{message}</p>}<Link href="/recrutamento/avisos" className="text-sm text-brand-700 underline">Abrir avisos de WhatsApp — envio manual</Link></section>;
}
