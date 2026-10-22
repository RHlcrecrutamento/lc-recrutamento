import { destroySession, getSessionUser, SESSION_COOKIE } from '@/lib/auth';
import { audit } from '@/lib/db';
import { ok } from '@/lib/http';
import { cookies } from 'next/headers';

export async function POST() {
  const user = await getSessionUser();
  await destroySession();
  (await cookies()).delete(SESSION_COOKIE);
  if (user) await audit(user.id, 'logout', 'users', user.id);
  return ok({ msg: 'Sessão encerrada.' });
}
