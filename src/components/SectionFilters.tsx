import Link from 'next/link';
export function SectionFilters({ items }: {items: {label: string; href: string; active: boolean}[]}) {
  return <nav aria-label="Filtros da seção" className="flex flex-wrap gap-2">
    {items.map(item => <Link key={item.href} href={item.href} aria-current={item.active ? 'page' : undefined} className={item.active ? 'btn-primary' : 'btn-outline'}>{item.label}</Link>)}
  </nav>;
}
