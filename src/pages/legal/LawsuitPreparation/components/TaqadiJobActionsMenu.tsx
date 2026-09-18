import type { ReactNode } from 'react';
import { ChevronDown, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export const TAQADI_PORTAL_URL = 'https://taqadi.sjc.gov.qa/itc/login';

/** Read-only actions remain available in every job state, including uncertain submission. */
export function TaqadiJobActionsMenu({ requiresVerification, refreshing, onRefresh, children }: {
  requiresVerification: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  children?: ReactNode;
}) {
  return (
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline">
          إجراءات إضافية
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56 rounded-lg border-[#E5EAF1]">
        <DropdownMenuItem asChild>
          <a href={TAQADI_PORTAL_URL} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            {requiresVerification ? 'فتح تقاضي للتحقق من الطلب' : 'فتح تقاضي'}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem disabled={refreshing} onSelect={onRefresh}>
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {refreshing ? 'جارٍ تحديث الحالة...' : 'تحديث حالة العملية'}
        </DropdownMenuItem>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
