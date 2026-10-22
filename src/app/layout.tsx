import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Triatalent — Talentos que fazem a diferença',
  robots: { index: false, follow: false },
  description:
    'Gestão de vagas, recrutamento e seleção, entrevistas online assistidas por IA e banco de currículos.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
