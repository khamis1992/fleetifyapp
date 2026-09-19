import type { NavItem, SubItem } from './navigation';

/** Collect every href in the tree, including finance destinations nested under their parent item. */
function collectHrefs(nodes: Array<NavItem | SubItem>): string[] {
  return nodes.flatMap(node => [
    ...(node.href ? [node.href] : []),
    ...(node.children ? collectHrefs(node.children) : []),
  ]);
}

export function activeNavigationHref(items: NavItem[], pathname: string) {
  return collectHrefs(items)
    .filter(href => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

const normalize = (value: string) => value.toLowerCase().replace(/[\u064B-\u065F\u0670ـ]/g, '').replace(/[أإآ]/g, 'ا').trim();

export function filterNavigation(items: NavItem[], query: string): NavItem[] {
  const term = normalize(query);
  if (!term) return items;
  return items.flatMap(item => {
    if (normalize(item.label).includes(term)) return [item];
    const children = item.children?.flatMap((child): SubItem[] => {
      if (normalize(child.label).includes(term)) return [child];
      const grandchildren = child.children?.filter(grandchild => normalize(grandchild.label).includes(term)) || [];
      return grandchildren.length ? [{ ...child, children: grandchildren }] : [];
    }) || [];
    return children.length ? [{ ...item, children }] : [];
  });
}
