import { AccessShell } from '@/components/AccessShell';
import { LoginForm } from '@/components/LoginForm';
export const metadata = { title: 'Portal da empresa | Triatalent' };
export default function Page() { return <AccessShell title="Portal da empresa" subtitle="Gerencie suas vagas e conheça os talentos apresentados pela nossa equipe. Ainda não tem acesso? Cadastre sua empresa sem convite."><LoginForm portal="empresa" /></AccessShell>; }
