/**
 * Importação e extração de texto de currículos (PDF / DOCX).
 * Os arquivos ficam guardados NO BANCO (tabela resume_files), nunca em disco
 * local — na nuvem o disco é apagado a cada reinício. Nunca são servidos
 * diretamente ao público.
 */
import { db } from './db';

export const ALLOWED_RESUME_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'docx', // tenta extrair; doc binário antigo pode falhar
};

export const MAX_RESUME_BYTES = 5 * 1024 * 1024; // 5 MB

export async function extractTextFromResume(buffer: Buffer, mime: string, filename: string): Promise<{ text: string; kind: string; error?: string }> {
  const kind = ALLOWED_RESUME_TYPES[mime] || (filename.toLowerCase().endsWith('.pdf') ? 'pdf' : filename.toLowerCase().endsWith('.docx') ? 'docx' : null);
  if (!kind) return { text: '', kind: '', error: 'Formato não suportado. Envie PDF ou DOCX.' };

  try {
    if (kind === 'pdf') {
      const { extractText, getDocumentProxy } = await import('unpdf');
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await extractText(pdf, { mergePages: true });
      return { text: (text || '').slice(0, 20000), kind };
    }
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return { text: (result.value || '').slice(0, 20000), kind };
  } catch (e: any) {
    return { text: '', kind, error: 'Não foi possível extrair o texto do arquivo. Você pode preencher os dados manualmente.' };
  }
}

/** Extrações simples e seguras para pré-preencher o cadastro. */
export function parseResumeFields(text: string) {
  const email = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)?.[0] || '';
  const phone =
    text.match(/(?:\+?55\s?)?\(?\d{2}\)?\s?\d{4,5}[-.\s]?\d{4}/)?.[0]?.trim() || '';
  const nameGuess = text
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 4 && l.length < 80 && !/[@\d]/.test(l) && !/curricul|currículo|resume|endere[çc]o|telefone|email|e-mail/i.test(l));
  return { email, phone, name: nameGuess || '' };
}

/**
 * Guarda o arquivo do currículo NO BANCO (tabela resume_files).
 * Na nuvem o disco local é temporário — apagado a cada reinício —, então o
 * arquivo precisa morar junto com os dados. O identificador devolvido vai em
 * candidates.resume_path e nunca é exposto publicamente.
 */
export async function saveResume(buffer: Buffer, ext: string): Promise<string> {
  const fileId = `file_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  await db
    .prepare('INSERT INTO resume_files (id, ext, bytes, size_bytes) VALUES (?, ?, ?, ?)')
    .run(fileId, ext, buffer, buffer.length);
  return fileId;
}

export async function readResume(fileId: string): Promise<Buffer | null> {
  if (!fileId) return null;
  const row = (await db
    .prepare('SELECT bytes FROM resume_files WHERE id = ?')
    .get(fileId)) as { bytes: Buffer } | undefined;
  return row ? Buffer.from(row.bytes) : null;
}

export async function deleteResume(fileId: string) {
  if (!fileId) return;
  try {
    await db.prepare('DELETE FROM resume_files WHERE id = ?').run(fileId);
  } catch {
    /* já não existia */
  }
}
