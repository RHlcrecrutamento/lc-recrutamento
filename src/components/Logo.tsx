/** Símbolo recortado do logotipo original fornecido pelo cliente. */
export function Logo({ size = 40, dark = false, showText = true }: { size?: number; dark?: boolean; showText?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <img src="/marca/simbolo.webp" width={size} height={size} alt={showText ? '' : 'Triatalent'} className="shrink-0 rounded-xl object-cover" />
      {showText && <span className={`leading-tight ${dark ? 'text-white' : 'text-brand-950'}`}>
        <span className="block text-xl font-bold tracking-tight">triatalent<span className="text-accent-600">.</span></span>
        <span className={`block text-[9px] font-medium uppercase tracking-[0.12em] ${dark ? 'text-brand-200' : 'text-slate-500'}`}>Talentos que fazem a diferença</span>
      </span>}
    </span>
  );
}
