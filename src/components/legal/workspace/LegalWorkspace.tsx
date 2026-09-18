import { legalDestinations, isLegalDestinationActive } from './legalNavigation';
import { useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Scale, ChevronDown, ArrowUpLeft } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import './legal-workspace.css';

export function LegalWorkspace({ children }: { children: ReactNode }) {
  const { pathname, search } = useLocation();
  useEffect(() => {
    document.body.setAttribute('data-legal-active', '');
    return () => document.body.removeAttribute('data-legal-active');
  }, []);
  const primary = [legalDestinations[0], legalDestinations[1], legalDestinations[3], legalDestinations[6], legalDestinations[11]];
  return <div className="legal-workspace" dir="rtl">
    <div className="lw-masthead"><Link to="/legal/cases?view=dashboard" className="lw-brand"><Scale size={21} /><span>الشؤون القانونية<small>العراف لتأجير السيارات</small></span></Link><span className="lw-masthead-caption">إدارة الملفات والحقوق والمتابعة</span></div>
    <nav className="lw-navigation" aria-label="أقسام الشؤون القانونية">
      <div className="lw-navigation-links">{primary.map(item => <Link key={item.to} to={item.to} aria-current={isLegalDestinationActive(item.to, pathname, search) ? 'page' : undefined}><item.icon size={17} /><span>{item.label}</span></Link>)}</div>
      <DropdownMenu dir="rtl"><DropdownMenuTrigger className="lw-services-trigger">جميع الخدمات <ChevronDown size={15} /></DropdownMenuTrigger><DropdownMenuContent className="lw-services-menu" align="end">
        {['المتابعة', 'التقاضي', 'المطالبات', 'المستندات', 'الإدارة'].map((group, index) => <div key={group}>{index > 0 && <DropdownMenuSeparator />}<DropdownMenuLabel>{group}</DropdownMenuLabel>{legalDestinations.filter(item => item.group === group).map(item => <DropdownMenuItem key={item.to} asChild><Link to={item.to}><item.icon size={15} /><span>{item.label}</span><ArrowUpLeft size={13} className="ms-auto" /></Link></DropdownMenuItem>)}</div>)}
      </DropdownMenuContent></DropdownMenu>
    </nav>
    <div className="lw-page-body">{children}</div>
  </div>;
}
