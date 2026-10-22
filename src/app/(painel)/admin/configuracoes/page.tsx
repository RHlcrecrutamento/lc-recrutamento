import { redirect } from 'next/navigation';
import { aiConfigured } from '@/lib/ai';
import { db, getSetting } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { SettingsForm } from '@/components/SettingsForm';

export const dynamic = 'force-dynamic';

export default async function AdminConfiguracoes() {
  const user = await getSessionUser();
  if (!user || user.role !== 'ADMIN') redirect('/painel');

  const all = await db.prepare('SELECT key, value_json FROM settings').all() as any[];
  const settings: Record<string, any> = {};
  for (const r of all) settings[r.key] = JSON.parse(r.value_json);

  const envInfo = {
    ai_configured: aiConfigured(),
    ai_model: process.env.GEMINI_MODEL || 'não definido',
    mp_configured: !!process.env.MP_ACCESS_TOKEN,
    app_url: process.env.APP_URL || '(não definida — links usam o endereço atual)',
    database: (process.env.DATABASE_URL || '').replace(/:[^:@/]*@/, ':****@') || '(DATABASE_URL não definida)',
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Configurações do sistema</h1>
        <p className="text-sm text-slate-500">Preços, integrações, parâmetros de entrevista e privacidade.</p>
      </div>

      <section className="card space-y-3">
        <h2 className="font-semibold text-brand-900">Integrações (configuradas via variáveis de ambiente)</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={`rounded-lg border p-3 ${envInfo.ai_configured ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
            <p className="text-sm font-semibold">Google Gemini — revisão humana</p>
            <p className="text-xs text-slate-600">
              {envInfo.ai_configured
                ? `Parâmetros preenchidos — modelo: ${envInfo.ai_model}`
                : 'Desativado ou com parâmetros incompletos. Sem Gemini, a entrevista usa questionário estruturado, sem simular IA. Verifique modelo, política de dados e público adulto antes de ativar.'}
            </p>
          </div>
          <div className={`rounded-lg border p-3 ${envInfo.mp_configured ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
            <p className="text-sm font-semibold">Mercado Pago (pagamentos)</p>
            <p className="text-xs text-slate-600">
              {envInfo.mp_configured
                ? 'Credencial presente. Configure ambiente/webhook e homologue antes de usar pagamentos reais.'
                : 'Sem credenciais: pagamento indisponível. Nenhum pagamento de demonstração libera contatos em produção.'}
            </p>
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          <p><strong>APP_URL:</strong> {envInfo.app_url}</p>
          <p><strong>Banco de dados:</strong> {envInfo.database}</p>
          <p className="mt-1">
            Chaves secretas ficam no arquivo <code>.env.local</code>, nunca no navegador. Veja o README para instruções.
          </p>
        </div>
      </section>

      <SettingsForm settings={settings} />
    </div>
  );
}
