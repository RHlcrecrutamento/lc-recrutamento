'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function ResumeReview({data}:{data:{candidateId:string;original:string;suggested:string;reviewed:string|null;sourceHash:string}}) {
  const router=useRouter();
  const [text,setText]=useState(data.reviewed||data.suggested);
  const [checked,setChecked]=useState(false);
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState('');
  async function save(){setLoading(true);setMessage('');try{
    const res=await fetch(`/api/candidatos/${data.candidateId}/curriculo-publico`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({public_text:text,source_hash:data.sourceHash,reviewed:checked})});
    const b=await res.json();setMessage(b.data?.msg||b.error);if(b.ok)router.refresh();
  }catch{setMessage('Falha de conexão. Tente novamente.');}finally{setLoading(false);}}
  return <section className="card space-y-3"><h2 className="font-semibold text-brand-900">Currículo colado pelo candidato — revisão para o cliente</h2>
    {!data.original.trim()?<p className="text-sm text-slate-500">Este candidato ainda não colou um currículo. Ele pode adicioná-lo em Meu perfil.</p>:<>
    <details><summary className="cursor-pointer text-sm font-medium">Ver original (somente equipe interna)</summary><pre className="mt-2 whitespace-pre-wrap break-words rounded bg-slate-50 p-3 text-xs">{data.original}</pre></details>
    <p className="text-xs text-slate-600">O texto abaixo é uma sugestão com remoções automáticas, não uma garantia de anonimização. Confira todo o conteúdo. Retire nome, documentos, contatos, endereço, links pessoais e outras informações que identifiquem o candidato. Preserve formação e experiências úteis à análise.</p>
    <label className="label">Versão anonimizada do currículo<textarea className="input mt-1" rows={12} maxLength={50000} value={text} onChange={e=>{setText(e.target.value);setChecked(false);}} /></label>
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)} />Revisei manualmente esta versão e removi os dados pessoais identificáveis.</label>
    <button className="btn-primary" disabled={loading||!checked} onClick={save}>{loading?'Salvando…':'Salvar currículo revisado'}</button>
    <p className="text-xs text-slate-500">{data.reviewed?'Há uma versão revisada para o currículo atual.':'Ainda não há versão revisada para o currículo atual. Revise antes de liberar ao cliente.'} Alterar o currículo original exige nova revisão.</p>
    </>}{message&&<p role="status" className="text-sm">{message}</p>}</section>;
}
