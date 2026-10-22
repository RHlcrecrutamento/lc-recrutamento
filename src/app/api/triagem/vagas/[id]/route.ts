import { requireUser } from '@/lib/auth';
import { assertSameOrigin } from '@/lib/access-security';
import { readJson,ok,handleApiError } from '@/lib/http';
import { reviewJob } from '@/lib/triage';
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){try{assertSameOrigin(req);const u=await requireUser(['ADMIN','RECRUTADOR']);const b=await readJson(req,8000);return ok(await reviewJob((await params).id,String(b.decision),String(b.note||''),u.id));}catch(e){return handleApiError(e);}}
