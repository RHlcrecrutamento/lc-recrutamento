import { requireUser } from '@/lib/auth';
import { assertSameOrigin } from '@/lib/access-security';
import { readJson,ok,handleApiError } from '@/lib/http';
import { reviewApplication } from '@/lib/triage';
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){try{assertSameOrigin(req);const u=await requireUser(['ADMIN','RECRUTADOR']);return ok(await reviewApplication((await params).id,await readJson(req,150000),u.id));}catch(e){return handleApiError(e);}}
