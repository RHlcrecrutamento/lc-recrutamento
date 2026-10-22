import { AccessShell } from '@/components/AccessShell';
import { LoginForm } from '@/components/LoginForm';
export const metadata = { title: 'Acesso da equipe | Triatalent' };
export default function Page() { return <AccessShell title="Acesso da equipe" subtitle="Ambiente exclusivo de administradores e recrutadores Triatalent."><LoginForm portal="equipe" /></AccessShell>; }
