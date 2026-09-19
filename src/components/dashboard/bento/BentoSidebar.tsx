import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight, ArrowUpLeft, BarChart3, Bell, BookOpen, Building2, CalendarDays,
  CheckCircle2, ChevronDown, ClipboardCheck, ClipboardList, CreditCard, FileText,
  History, Landmark, LayoutDashboard, Library, Link2, ListTree, Lock, LogOut,
  PanelRightClose, PanelRightOpen, PieChart, PiggyBank, Receipt, Search, Settings2,
  Shield, ShieldCheck, Sparkles, Target, Tags, TrendingUp, Truck, X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTourGuide } from '@/components/tour-guide';
import { isWorkspaceOnlyEmployee } from '@/lib/workspaceAccess';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { navigation, workspaceOnlyNavigation, categoryLabels, type NavItem, type SubItem } from '@/components/navigation/sidebar-workspace/navigation';
import { activeNavigationHref, filterNavigation } from '@/components/navigation/sidebar-workspace/model';
import { useFinanceNavigation } from '@/components/finance/workspace/useFinanceNavigation';
import { resolveFinanceLocation } from '@/components/finance/workspace/financeRouteAliases';
import type { FinanceDestination } from '@/components/finance/workspace/financeNavigation';
import '@/components/navigation/sidebar-workspace/sidebar-workspace.css';

/** Distinct icons for well-known finance destinations; groups fall back to their own icon. */
const financeChildIcons: Record<string, NavItem['icon']> = {
  overview: LayoutDashboard,
  alerts: Bell,
  invoices: Receipt,
  payments: CreditCard,
  'ai-collections': TrendingUp,
  deposits: PiggyBank,
  entries: FileText,
  'opening-balances': Landmark,
  ledger: BookOpen,
  chart: ListTree,
  'journal-demo': ClipboardList,
  treasury: Landmark,
  'bank-reconciliation': CheckCircle2,
  obligations: CalendarDays,
  'bank-transactions': ArrowLeftRight,
  vendors: Truck,
  'purchase-orders': ClipboardList,
  'vendor-categories': Tags,
  assets: Building2,
  budgets: PieChart,
  'cost-centers': Target,
  reports: Library,
  analysis: BarChart3,
  approvals: ShieldCheck,
  integrity: ShieldCheck,
  close: Lock,
  audit: History,
  'monthly-close-audit': ClipboardCheck,
  'invoice-journal': Link2,
  mappings: Link2,
  permissions: Shield,
  'system-settings': Settings2,
  wizard: Sparkles,
  'system-analysis': BarChart3,
  'journal-settings': Settings2,
  'accounts-settings': Settings2,
  'centers-settings': Settings2,
  'automatic-accounts': Settings2,
};

const toSubItem = (item: FinanceDestination, fallbackIcon: NavItem['icon']): SubItem => ({
  id: `finance-${item.id}`,
  label: item.ar,
  href: item.href,
  icon: financeChildIcons[item.id] ?? fallbackIcon,
});

interface BentoSidebarProps {
  isMobile?: boolean;
  onCloseMobile?: () => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export default function BentoSidebar({ isMobile = false, onCloseMobile, collapsed: controlledCollapsed, onCollapsedChange }: BentoSidebarProps) {
  const { user, signOut } = useAuth();
  const { hasCompanyAdminAccess, hasGlobalAccess } = useUnifiedCompanyAccess();
  const workspaceOnly = isWorkspaceOnlyEmployee(user);
  const { groups: financeGroups } = useFinanceNavigation();
  const { startTour } = useTourGuide();
  const location = useLocation();
  const navigate = useNavigate();
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const collapsed = !isMobile && (controlledCollapsed ?? localCollapsed);
  const setCollapsed = (value: boolean) => { setLocalCollapsed(value); onCollapsedChange?.(value); };
  const [query, setQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [recentHrefs, setRecentHrefs] = useState<string[]>([]);
  const navRef = useRef<HTMLElement>(null);
  const storageKey = `fleetify:sidebar-workspace:${isMobile ? 'mobile' : 'desktop'}`;

  // Finance centers join the system groups as one list; they are already permission-filtered.
  // Secondary destinations (individual reports and tools) nest under their parent item,
  // mirroring the dedicated finance menu they replaced.
  const financeItems = useMemo<NavItem[]>(() => {
    if (workspaceOnly || !(hasCompanyAdminAccess || hasGlobalAccess)) return [];
    return financeGroups.map(group => {
      const children = group.items.map(item => {
        const nested = group.secondaryItems.filter(secondary => secondary.parentId === item.id);
        const child = toSubItem(item, group.icon);
        return nested.length ? { ...child, children: nested.map(secondary => toSubItem(secondary, group.icon)) } : child;
      });
      // Secondary entries without a resolvable parent stay reachable at the group level.
      const parentIds = new Set(group.items.map(item => item.id));
      const orphans = group.secondaryItems
        .filter(secondary => !secondary.parentId || !parentIds.has(secondary.parentId))
        .map(secondary => toSubItem(secondary, group.icon));
      return {
        id: `finance-${group.id}`,
        label: group.ar,
        icon: group.icon,
        category: 'finance',
        children: [...children, ...orphans],
      };
    });
  }, [financeGroups, workspaceOnly, hasCompanyAdminAccess, hasGlobalAccess]);

  const visibleNavigation = useMemo(() => {
    const base = (workspaceOnly ? workspaceOnlyNavigation : navigation)
      .filter(item => !item.requiresAdmin || hasCompanyAdminAccess || hasGlobalAccess);
    // Keep the finance centers where the dedicated finance entry used to sit: before HR.
    const hrIndex = base.findIndex(item => item.id === 'hr');
    base.splice(hrIndex === -1 ? base.length : hrIndex, 0, ...financeItems);
    return base;
  }, [financeItems, workspaceOnly, hasCompanyAdminAccess, hasGlobalAccess]);

  // Historic finance links (e.g. /finance/billing?tab=…) resolve to their canonical child first.
  const canonicalPathname = useMemo(() => {
    if (!location.pathname.startsWith('/finance')) return location.pathname;
    try { return resolveFinanceLocation(location.pathname, location.search); } catch { return location.pathname; }
  }, [location.pathname, location.search]);

  const activeHref = activeNavigationHref(visibleNavigation, canonicalPathname);
  const activeParent = visibleNavigation.find(item => item.children?.some(child =>
    child.href === activeHref || child.children?.some(grandchild => grandchild.href === activeHref)))?.id;
  const filteredNavigation = filterNavigation(visibleNavigation, query);
  const groupedNavigation = filteredNavigation.reduce<Record<string, NavItem[]>>((groups, item) => {
    (groups[item.category || 'main'] ||= []).push(item); return groups;
  }, {});
  const recentPages = recentHrefs.filter(href => href !== activeHref)
    .map(href => visibleNavigation.flatMap(item => item.children?.flatMap(child => [child, ...(child.children || [])]) || [item]).find(item => item.href === href))
    .filter((item): item is NonNullable<typeof item> => !!item).slice(0, 2);

  useEffect(() => {
    if (activeHref) setRecentHrefs(previous => [activeHref, ...previous.filter(href => href !== activeHref)].slice(0, 4));
    if (activeParent) setExpandedItems(previous => previous.includes(activeParent) ? previous : [...previous, activeParent]);
    setQuery('');
  }, [activeHref, activeParent]);

  useEffect(() => {
    try { if (navRef.current) navRef.current.scrollTop = Number(sessionStorage.getItem(storageKey)) || 0; } catch { /* Navigation works when storage is unavailable. */ }
  }, [storageKey]);

  const saveScroll = () => {
    try { sessionStorage.setItem(storageKey, String(navRef.current?.scrollTop || 0)); } catch { /* Storage is optional. */ }
  };
  const onNavigate = () => { saveScroll(); onCloseMobile?.(); };
  const openSearch = () => {
    onCloseMobile?.();
    // Close the mobile focus trap before opening the global search dialog.
    window.setTimeout(() => document.dispatchEvent(new Event('fleetify:open-global-search')), isMobile ? 200 : 0);
  };
  const toggleGroup = (id: string) => {
    if (collapsed) { setCollapsed(false); setExpandedItems(previous => previous.includes(id) ? previous : [...previous, id]); return; }
    setExpandedItems(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]);
  };
  const startContextTour = () => {
    onCloseMobile?.();
    const path = location.pathname;
    if (path.startsWith('/finance/accounting')) { startTour('accounting-center'); return; }
    if (path.startsWith('/finance/billing')) { startTour('billing-center'); return; }
    const finance = path.startsWith('/finance');
    const tour = finance ? 'finance-overview' : 'dashboard-overview';
    const destination = finance ? '/finance/overview' : '/dashboard';
    if (path === destination || (finance && ['/finance', '/finance/hub'].includes(path))) { startTour(tour); return; }
    try { sessionStorage.setItem('fleetify:pending-tour', tour); } catch { /* The destination remains accessible. */ }
    navigate(destination);
  };
  const userName = [user?.profile?.first_name, user?.profile?.last_name].filter(Boolean).join(' ') || user?.email?.split('@')[0] || 'مستخدم';
  const userInitials = userName.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();

  return <div className={`sidebar-workspace ${collapsed ? 'is-collapsed' : ''} ${isMobile ? 'is-mobile' : ''}`} dir="rtl">
    <header className="sw-header">
      <Link to={workspaceOnly ? '/employee-workspace' : '/dashboard'} className="sw-brand" onClick={onNavigate} aria-label="فليتيفاي — الصفحة الرئيسية">
        <span className="sw-monogram">ف<span/></span>
        {!collapsed && <span className="sw-brand-copy"><strong>فليتيفاي</strong><small>إدارة الأسطول والأعمال</small></span>}
      </Link>
      <button className="sw-icon-button sw-collapse" onClick={() => isMobile ? onCloseMobile?.() : setCollapsed(!collapsed)}
        aria-label={isMobile ? 'إغلاق القائمة' : collapsed ? 'توسيع القائمة' : 'طي القائمة'} title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}>
        {isMobile ? <X size={18}/> : collapsed ? <PanelRightOpen size={17}/> : <PanelRightClose size={17}/>}
      </button>
    </header>
    {!collapsed && <div className="sw-workspace-label"><span className="sw-company-mark"/>العراف لتأجير السيارات<small>مساحة العمل</small></div>}
    {!workspaceOnly && <div className="sw-search-area">
      {collapsed ? <button className="sw-icon-button" onClick={openSearch} aria-label="البحث في النظام" title="البحث في النظام"><Search size={19}/></button> :
        <div className="sw-search"><Search size={16}/><input aria-label="البحث في أقسام القائمة" placeholder="ابحث عن قسم…" value={query} onChange={event => setQuery(event.target.value)}/>
          {query && <button className="sw-icon-button" onClick={() => setQuery('')} aria-label="مسح بحث الأقسام"><X size={14}/></button>}
        </div>}
    </div>}
    <nav className="sw-navigation" aria-label="أقسام النظام" ref={navRef} onScroll={saveScroll}>
      {Object.entries(groupedNavigation).map(([category, items]) => <div className="sw-group" key={category}>
        {categoryLabels[category] && <div className="sw-group-heading">{collapsed ? <span className="sw-group-divider"/> : <><span>{categoryLabels[category]}</span><small>{String(Object.keys(categoryLabels).indexOf(category)).padStart(2, '0')}</small></>}</div>}
        <ul>{items.map(item => {
          const active = item.href ? item.href === activeHref : item.children?.some(child =>
            child.href === activeHref || child.children?.some(grandchild => grandchild.href === activeHref));
          const expanded = !collapsed && (query.trim().length > 0 || expandedItems.includes(item.id));
          const groupId = `sw-${isMobile ? 'mobile' : 'desktop'}-${item.id}`;
          return <li key={item.id}>
            {item.children ? <>
              <button className={`sw-nav-item ${active ? 'is-parent-active' : ''}`} onClick={() => toggleGroup(item.id)} aria-label={item.label} title={collapsed ? item.label : undefined} aria-expanded={expanded} aria-controls={expanded ? groupId : undefined}>
                <item.icon size={19}/>{!collapsed && <><span>{item.label}</span><ChevronDown size={14} className={expanded ? 'sw-chevron is-open' : 'sw-chevron'}/></>}
              </button>
              {expanded && <ul className="sw-subnavigation" id={groupId}>{item.children.map(child => {
                const childActive = child.href === activeHref;
                const parentOfActive = !childActive && !!child.children?.some(grandchild => grandchild.href === activeHref);
                return <li key={child.id}>
                  <Link to={child.href} onClick={onNavigate} className={`sw-subitem ${childActive || parentOfActive ? 'is-active' : ''}`} aria-current={childActive ? 'page' : parentOfActive ? 'location' : undefined}>
                    <child.icon size={15}/><span>{child.label}</span>{childActive && <i className="sw-active-dot"/>}
                  </Link>
                  {child.children?.length ? <ul className="sw-subnavigation">
                    {child.children.map(grandchild => <li key={grandchild.id}>
                      <Link to={grandchild.href} onClick={onNavigate} className={`sw-subitem ${grandchild.href === activeHref ? 'is-active' : ''}`} aria-current={grandchild.href === activeHref ? 'page' : undefined}>
                        <grandchild.icon size={15}/><span>{grandchild.label}</span>{grandchild.href === activeHref && <i className="sw-active-dot"/>}
                      </Link>
                    </li>)}
                  </ul> : null}
                </li>;
              })}</ul>}
            </> : <Link to={item.href || '/dashboard'} className={`sw-nav-item ${active ? 'is-active' : ''}`} onClick={onNavigate} aria-label={item.label} title={collapsed ? item.label : undefined} aria-current={active ? 'page' : undefined}>
              <item.icon size={19}/>{!collapsed && <><span>{item.label}</span>{active && <i className="sw-active-dot"/>}</>}
            </Link>}
          </li>;
        })}</ul>
      </div>)}
      {!filteredNavigation.length && <div className="sw-empty" role="status"><Search size={23}/><strong>لا توجد أقسام مطابقة</strong><p>جرّب اسماً آخر للقسم الذي تبحث عنه.</p><button onClick={() => setQuery('')}>عرض جميع الأقسام</button></div>}
      {!collapsed && !query && recentPages.length > 0 && <div className="sw-recent"><div className="sw-group-heading"><span>زرتها مؤخراً</span><button onClick={() => setRecentHrefs([])} aria-label="مسح الصفحات الأخيرة"><X size={13}/></button></div>
        {recentPages.map(page => <Link to={page.href || '/dashboard'} key={page.id} onClick={onNavigate}><page.icon size={14}/>{page.label}<ArrowUpLeft size={13}/></Link>)}
      </div>}
    </nav>

    <footer className="sw-footer">
      {!workspaceOnly && <div className="sw-help-row"><button onClick={startContextTour} aria-label="ابدأ جولة تعريفية" title="ابدأ جولة تعريفية"><Sparkles size={16}/>{!collapsed && <span>دليل الاستخدام</span>}</button>
        {!collapsed && <button onClick={openSearch} aria-label="البحث في النظام" title="البحث في النظام"><Search size={16}/></button>}
      </div>}
      <div className="sw-account">
        <button className="sw-profile" disabled={workspaceOnly} onClick={() => { onNavigate(); navigate('/profile'); }} aria-label={`الملف الشخصي: ${userName}`} title={userName}>
          <span className="sw-avatar">{userInitials}</span>{!collapsed && <span className="sw-profile-copy"><strong>{userName}</strong><small>{user?.email}</small></span>}
        </button>
        <button className="sw-logout" onClick={async () => { await signOut(); navigate('/auth'); }} aria-label="تسجيل الخروج" title="تسجيل الخروج"><LogOut size={17}/></button>
      </div>
    </footer>
  </div>;
}
