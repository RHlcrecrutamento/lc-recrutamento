/** Importação de currículos PDF/DOCX — equipe interna. */
import { db, id, audit, now } from '@/lib/db';
import { getSessionUser, getClientIp } from '@/lib/auth';
import { ok, fail, handleApiError } from '@/lib/http';
import { extractTextFromResume, parseResumeFields, saveResume, ALLOWED_RESUME_TYPES, MAX_RESUME_BYTES } from '@/lib/resume';

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !['ADMIN', 'RECRUTADOR'].includes(user.role)) return fail('Sem permissão.', 403);

    const form = await req.formData();
    const file = form.get('arquivo') as File | null;
    if (!file) return fail('Envie um arquivo PDF ou DOCX.', 400);
    if (file.size > MAX_RESUME_BYTES) return fail('Arquivo muito grande (máximo 5 MB).', 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    const { text, kind, error } = await extractTextFromResume(buffer, file.type, file.name);
    if (error && !text) return fail(error, 400);

    const parsed = parseResumeFields(text);
    const fname = await saveResume(buffer, kind === 'pdf' ? 'pdf' : 'docx');

    const name = String(form.get('name') || parsed.name || file.name.replace(/\.[^.]+$/, '')).trim();
    if (name.length < 3) return fail('Informe o nome do candidato.', 400);

    const candId = id('cnd');
    await db.prepare(
      `INSERT INTO candidates (id, name, email, phone, city, state, title, professional_summary, skills,
        experience, resume_path, resume_text, origin, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      candId, name, String(form.get('email') || parsed.email || ''), String(form.get('phone') || parsed.phone || ''),
      String(form.get('city') || ''), String(form.get('state') || ''), String(form.get('title') || ''),
      text.slice(0, 1500), String(form.get('skills') || ''), text.slice(0, 4000),
      fname, text, 'Importação de currículo', user.id
    );
    await audit(user.id, 'curriculo_importado', 'candidates', candId, { arquivo: fname }, await getClientIp());
    return ok({ id: candId, extraido: { name, email: parsed.email, phone: parsed.phone }, aviso: text ? undefined : 'Não foi possível extrair o texto — preencha manualmente.' }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
