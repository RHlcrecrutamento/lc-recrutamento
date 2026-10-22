/** Endpoint histórico: publicação agora exige revisão completa e atômica. */
import { requireUser } from '@/lib/auth';
import { assertSameOrigin } from '@/lib/access-security';
import { fail,handleApiError } from '@/lib/http';
export async function POST(req:Request){try{assertSameOrigin(req);await requireUser(['ADMIN','RECRUTADOR']);return fail('Use a análise simples do candidato: revise currículo, respostas e parecer e confirme aprovar ou reprovar em uma única decisão.',409);}catch(e){return handleApiError(e);}}
