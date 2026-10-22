import { getSessionUser, getClientIp } from '@/lib/auth';
import { db, audit } from '@/lib/db';
import { ok, fail, handleApiError, readJson } from '@/lib/http';
import { redactPublicText, resumeSourceHash } from '@/lib/resumes';
export async function POST(req: Request,{params}:{params:Promise<{id:string}>}) {
  try {
    const user=await getSessionUser();
    if(!user||!['ADMIN','RECRUTADOR'].includes(user.role))return fail('Somente a equipe Triatalent pode revisar currículos.',403);
    const b=await readJson(req);
    if(b.reviewed!==true)return fail('Confirme a revisão humana e a retirada de dados pessoais.',400);
    const result=await db.transaction(async()=>{
      const c=await db.prepare('SELECT * FROM candidates WHERE id = ? FOR UPDATE').get((await params).id) as any;
      if(!c)return {error:'Candidato não encontrado.',status:404};
      if(!c.resume_text?.trim())return {error:'O candidato ainda não informou o currículo.',status:400};
      if(resumeSourceHash(c)!==b.source_hash)return {error:'O currículo mudou. Recarregue a página e revise a nova versão.',status:409};
      const text=String(b.public_text||'').trim();
      if(text.length<20||text.length>50000)return {error:'A versão pública deve ter entre 20 e 50.000 caracteres.',status:400};
      if(redactPublicText(text,c)!==text)return {error:'A versão ainda contém dados pessoais detectáveis. Remova nome, contatos, documentos, endereço e links.',status:400};
      await db.prepare(`INSERT INTO candidate_public_resumes(candidate_id,source_hash,public_text,reviewed_by) VALUES (?,?,?,?) ON CONFLICT(candidate_id) DO UPDATE SET source_hash=EXCLUDED.source_hash, public_text=EXCLUDED.public_text, reviewed_by=EXCLUDED.reviewed_by, reviewed_at=datetime('now')`).run(c.id,b.source_hash,text,user.id);
      await audit(user.id,'curriculo_anonimizado_revisado','candidates',c.id,undefined,await getClientIp());
      return {ok:true};
    })();
    if('error' in result)return fail(result.error!,result.status);
    return ok({msg:'Currículo anonimizado revisado. A liberação ao cliente continua dependendo da entrevista e do relatório validado.'});
  }catch(e){return handleApiError(e);}
}
