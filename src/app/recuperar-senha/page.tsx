import { AccessShell } from '@/components/AccessShell';
import { PasswordForm } from '@/components/PasswordForm';
export const metadata = { title: 'Recuperar acesso | Triatalent', robots: {index: false, follow: false} };
export default function Page() { return <AccessShell title="Recuperar acesso" subtitle="Informe seu e-mail para solicitar um link temporário."><PasswordForm mode="recover" /></AccessShell>; }
