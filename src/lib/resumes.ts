import { createHash } from 'crypto';
import { db } from './db';
export function resumeSourceHash(candidate: any): string {
  return createHash('sha256').update(JSON.stringify([candidate.resume_text||'',candidate.name,candidate.email,candidate.phone,candidate.whatsapp,candidate.cpf,candidate.address])).digest('hex');
}
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
/** Auxílio à revisão, não substitui a conferência humana de texto livre. */
export function redactPublicText(text: unknown, candidate: any): string {
  let s=String(text||'');
  const markers:string[]=[];
  const hide=(label:string)=>{markers.push('['+label+']');return '\uE000'+(markers.length-1)+'\uE001';};
  // Marcadores já revisados são preservados: aplicar a redução duas vezes não volta a expor dados.
  s=s.replace(/\[(?:dado protegido|e-mail protegido|link protegido|documento protegido|telefone protegido|dado pessoal protegido)\]/g,m=>hide(m.slice(1,-1)));
  const contacts=[candidate.email,candidate.phone,candidate.whatsapp,candidate.cpf,candidate.address].filter(Boolean).map(String).sort((a,b)=>b.length-a.length);
  if(contacts.length)s=s.replace(new RegExp(contacts.map(escape).join('|'),'giu'),()=>hide('dado protegido'));
  const names=[candidate.name,...String(candidate.name||'').split(/\s+/).filter(x=>x.length>=3)].filter(Boolean).map(String).sort((a,b)=>b.length-a.length);
  if(names.length)s=s.replace(new RegExp('(?<![\\p{L}\\p{N}])(?:'+names.map(escape).join('|')+')(?![\\p{L}\\p{N}])','giu'),()=>hide('dado protegido'));
  s=s.replace(/[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+/g,()=>hide('e-mail protegido'))
    .replace(/(?:https?:\/\/|www\.)[^\s]+/gi,()=>hide('link protegido'))
    .replace(/\b\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}\b/g,()=>hide('documento protegido'))
    .replace(/(?:\+?55[\s.-]*)?(?:\(?\d{2}\)?[\s.-]*)?\d{4,5}[\s.-]*\d{4}\b/g,()=>hide('telefone protegido'))
    .replace(/^.*(?:endereço|residência|data de nascimento|linkedin|instagram|facebook|cpf\s*:|rg\s*:).*$/gim,()=>hide('dado pessoal protegido'));
  return s.replace(/\uE000(\d+)\uE001/g,(_,i)=>markers[Number(i)]||'');
}
export async function reviewedResume(candidate: any): Promise<string | null> {
  if(!String(candidate.resume_text||'').trim())return null;
  const row=await db.prepare('SELECT * FROM candidate_public_resumes WHERE candidate_id = ?').get(candidate.id) as any;
  return row && row.source_hash===resumeSourceHash(candidate) ? row.public_text : null;
}
export async function resumeReviewData(candidateId: string) {
  const candidate=await db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId) as any;
  if(!candidate)return null;
  return {candidateId, original:String(candidate.resume_text||''), suggested:redactPublicText(candidate.resume_text,candidate), reviewed:await reviewedResume(candidate), sourceHash:resumeSourceHash(candidate)};
}
