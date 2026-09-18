import type { NavItem } from './navigation';

export function activeNavigationHref(items: NavItem[], pathname: string) {
  return items.flatMap(item => item.children || (item.href ? [item] : []))
    .map(item => item.href).filter((href): href is string => !!href)
    .filter(href => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

const normalize = (value: string) => value.toLowerCase().replace(/[\u064B-\u065F\u0670ـ]/g, '').replace(/[أإآ]/g, 'ا').trim();

export function filterNavigation(items: NavItem[], query: string): NavItem[] {
  const term = normalize(query);
  if (!term) return items;
  return items.flatMap(item => {
    if (normalize(item.label).includes(term)) return [item];
    const children = item.children?.filter(child => normalize(child.label).includes(term));
    return children?.length ? [{ ...item, children }] : [];
  });
}
