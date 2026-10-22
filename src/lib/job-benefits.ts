export const SALARY_EXTRAS = ['Adicional noturno','Adicional de assiduidade','Adicional de insalubridade','Adicional de periculosidade','Horas extras','Comissões','Gratificações ou Premiações','Prêmios por produtividade','Adicional por tempo de serviço','Participação nos lucros e resultados (PLR)'];
export const OFFERED_BENEFITS = ['Vale Transporte','Vale Refeição','Vale Alimentação','Alimentação na Empresa','Plano de Saúde','Assistência Odontológica','Seguro de Vida','Cesta Básica','Auxílio Combustível','Carro da Empresa','Transporte da Empresa','Alojamento','Outro'];
export const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export function moneyInput(text: string): number | null {
  const digits = text.replace(/\D/g,'');
  return digits ? Number(digits) : null;
}
export interface BenefitsConfig {extras: string[]; offered: string[]; other: string; meal_vr_cents: number | null; meal_va_cents: number | null; meal_period: 'dia'|'mes'; legacy_text?: string;}
export function readBenefits(raw?: string | null, legacy=''): BenefitsConfig {
  try {if(raw) {const v=JSON.parse(raw);if(v && Array.isArray(v.extras) && Array.isArray(v.offered)) return v;}} catch {}
  return {extras:[],offered:[],other:'',meal_vr_cents:null,meal_va_cents:null,meal_period:'mes',legacy_text:legacy};
}
function invalid(message: string): never {const e: any=new Error(message);e.status=400;throw e;}
export function normalizeJobMoneyAndBenefits(b: any, existing: any = {}) {
  for (const key of ['salary_min','salary_max']) {
    if(b[key]!==undefined && b[key]!==null && b[key]!=='') {
      if(!Number.isSafeInteger(Number(b[key])) || Number(b[key])<0 || Number(b[key])>1000000000) invalid('Salário inválido. Informe o valor em reais no formulário.');
      b[key]=Number(b[key]);
    } else if(b[key]==='') b[key]=null;
  }
  const low=b.salary_min===undefined?existing.salary_min:b.salary_min;
  const high=b.salary_max===undefined?existing.salary_max:b.salary_max;
  if(low!=null&&high!=null&&Number(high)<Number(low))invalid('O salário máximo não pode ser menor que o mínimo.');
  if(b.benefits_config===undefined) return;
  const v=b.benefits_config;
  if(!v || !Array.isArray(v.extras)||!Array.isArray(v.offered))invalid('Selecione os benefícios no formulário.');
  if(v.extras.some((x: string)=>!SALARY_EXTRAS.includes(x))||v.offered.some((x: string)=>!OFFERED_BENEFITS.includes(x)))invalid('Opção de benefício inválida.');
  const c: BenefitsConfig={extras:[...new Set<string>(v.extras)],offered:[...new Set<string>(v.offered)],other:String(v.other||'').trim().slice(0,2000),meal_vr_cents:null,meal_va_cents:null,meal_period:v.meal_period==='dia'?'dia':'mes',legacy_text:String(v.legacy_text||'').slice(0,2000)};
  if(c.offered.includes('Outro')&&!c.other)invalid('Descreva o outro benefício oferecido.');
  for(const [label,key] of [['Vale Refeição','meal_vr_cents'],['Vale Alimentação','meal_va_cents']] as const) {
    if(c.offered.includes(label)) {const n=Number(v[key]);if(!Number.isSafeInteger(n)||n<=0||n>100000000)invalid(`Informe o valor do ${label}.`);c[key]=n;}
  }
  b.benefits_config_json=JSON.stringify(c);
  const parts=[];
  if(c.extras.length)parts.push('Adicionais sobre o salário: '+c.extras.join('; '));
  if(c.offered.length)parts.push('Benefícios oferecidos: '+c.offered.map(x=>x==='Outro'?c.other:x).join('; '));
  if(c.meal_vr_cents)parts.push(`Vale Refeição: ${brl(c.meal_vr_cents)} por ${c.meal_period==='dia'?'dia':'mês'}`);
  if(c.meal_va_cents)parts.push(`Vale Alimentação: ${brl(c.meal_va_cents)} por ${c.meal_period==='dia'?'dia':'mês'}`);
  if(c.legacy_text)parts.push(c.legacy_text);
  b.benefits=parts.join('\n')||null;
}
