import { AccessShell } from '@/components/AccessShell';
import { PasswordForm } from '@/components/PasswordForm';
export const metadata = { title: 'Crie uma nova senha | Triatalent', robots: {index: false, follow: false} };
export default function Page() { return <AccessShell title="Crie uma nova senha" subtitle="O link é de uso único e expira em 30 minutos."><PasswordForm mode="reset" /></AccessShell>; }
