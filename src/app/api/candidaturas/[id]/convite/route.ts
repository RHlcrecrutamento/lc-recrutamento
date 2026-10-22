/** Candidato escolhe e acompanha a própria entrevista, sem nova convocação manual. */
import { requireUser } from '@/lib/auth';
import { assertSameOrigin } from '@/lib/access-security';
import { fail,handleApiError } from '@/lib/http';
export async function POST(req:Request){try{assertSameOrigin(req);await requireUser(['ADMIN','RECRUTADOR']);return fail('O candidato acessa a entrevista pela própria área de candidaturas. O reenvio/novo vínculo manual foi desativado.',409);}catch(e){return handleApiError(e);}}
