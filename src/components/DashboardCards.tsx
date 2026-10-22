import Link from 'next/link';
import { StatCard } from '@/components/ui';

type Kpi = { label: string; value: string | number; hint?: string; accent?: boolean; href?: string };
export function KpiGrid({ items }: { items: Kpi[] }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {items.map(({href, ...item}) => href ? (
      <Link key={item.label} href={href} aria-label={`${item.label}: ${item.value}. Abrir seção`} title={`Abrir ${item.label.toLowerCase()}`} className="block rounded-xl transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
        <StatCard {...item} hint={item.hint || 'Abrir seção →'} />
      </Link>
    ) : <StatCard key={item.label} {...item} />)}
  </div>;
}
