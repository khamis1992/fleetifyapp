import { CSSProperties } from 'react';
import { AlertTriangle, ArrowUpLeft, Car, FileText, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { systemColorPattern } from '@/lib/design-system/systemColorPattern';
import { formatCustomerName } from '@/utils/formatCustomerName';

interface Contract {
  id: string;
  contract_number: string;
  customer_id: string | null;
  vehicle_id: string | null;
  contract_amount: number | null;
  monthly_amount: number | null;
  status: string;
  end_date: string | null;
  customers?: {
    first_name?: string;
    last_name?: string;
    first_name_ar?: string;
    last_name_ar?: string;
    company_name?: string;
    company_name_ar?: string;
    customer_type?: string;
  };
  vehicles?: {
    plate_number?: string;
    make?: string;
    model?: string;
  };
}

interface ContractsNeedingAttentionProps {
  contracts: Contract[];
}

type IssueTone = 'info' | 'alert' | 'focus';

const attentionTheme = systemColorPattern.colors;
const attentionStyle = {
  '--attention-text': attentionTheme.text,
  '--attention-surface': attentionTheme.surface,
  '--attention-inner': attentionTheme.innerSurface,
  '--attention-muted': attentionTheme.secondaryText,
  '--attention-border': attentionTheme.border,
  '--attention-info': attentionTheme.info,
  '--attention-alert': attentionTheme.alert,
  '--attention-focus': attentionTheme.focus,
  '--attention-success': attentionTheme.success,
} as CSSProperties;

export const ContractsNeedingAttention = ({ contracts }: ContractsNeedingAttentionProps) => {
  const navigate = useNavigate();

  const needsAttention = contracts.filter((contract) => {
    const isZeroAmount =
      (contract.contract_amount === 0 || contract.contract_amount === null) &&
      (contract.monthly_amount === 0 || contract.monthly_amount === null);
    const missingCustomer = !contract.customer_id;
    const missingVehicle = !contract.vehicle_id;
    const isExpired =
      contract.end_date &&
      new Date(contract.end_date) < new Date() &&
      contract.status === 'active';

    return isZeroAmount || missingCustomer || missingVehicle || isExpired;
  });

  const categorized = {
    zeroAmount: needsAttention.filter(
      (contract) =>
        (contract.contract_amount === 0 || contract.contract_amount === null) &&
        (contract.monthly_amount === 0 || contract.monthly_amount === null),
    ),
    missingCustomer: needsAttention.filter((contract) => !contract.customer_id),
    missingVehicle: needsAttention.filter((contract) => !contract.vehicle_id),
    expired: needsAttention.filter(
      (contract) =>
        contract.end_date &&
        new Date(contract.end_date) < new Date() &&
        contract.status === 'active',
    ),
  };

  if (needsAttention.length === 0) {
    return null;
  }

  const getIssueType = (contract: Contract): Array<{ label: string; tone: IssueTone }> => {
    const issues: Array<{ label: string; tone: IssueTone }> = [];

    if (
      (contract.contract_amount === 0 || contract.contract_amount === null) &&
      (contract.monthly_amount === 0 || contract.monthly_amount === null)
    ) {
      issues.push({ label: 'قيمة صفرية', tone: 'info' });
    }

    if (!contract.customer_id) {
      issues.push({ label: 'بدون عميل', tone: 'alert' });
    }

    if (!contract.vehicle_id) {
      issues.push({ label: 'بدون مركبة', tone: 'alert' });
    }

    if (contract.end_date && new Date(contract.end_date) < new Date() && contract.status === 'active') {
      issues.push({ label: 'منتهي', tone: 'focus' });
    }

    return issues;
  };

  return (
    <Card
      className="contracts-attention-card overflow-hidden border bg-white shadow-sm"
      style={{
        ...attentionStyle,
        borderColor: 'rgba(251, 107, 122, 0.28)',
      }}
    >
      <CardHeader className="border-b px-3 py-2.5 sm:px-4">
        <CardTitle className="flex items-center justify-between gap-3 text-sm sm:text-base">
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <span className="truncate">عقود تحتاج انتباهك</span>
          </span>
          <Badge variant="outline" className="h-7 rounded-lg px-2.5 text-xs font-bold">
            {needsAttention.length}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-3">
        <div className="space-y-2.5">
          <div className="flex flex-wrap gap-2">
            {categorized.zeroAmount.length > 0 && (
              <div className="attention-summary attention-summary-info">
                <div className="text-xs font-semibold">قيمة صفرية</div>
                <div className="text-xl font-bold">{categorized.zeroAmount.length}</div>
              </div>
            )}
            {categorized.missingCustomer.length > 0 && (
              <div className="attention-summary attention-summary-alert">
                <div className="text-xs font-semibold">بدون عميل</div>
                <div className="text-xl font-bold">{categorized.missingCustomer.length}</div>
              </div>
            )}
            {categorized.missingVehicle.length > 0 && (
              <div className="attention-summary attention-summary-alert">
                <div className="text-xs font-semibold">بدون مركبة</div>
                <div className="text-xl font-bold">{categorized.missingVehicle.length}</div>
              </div>
            )}
            {categorized.expired.length > 0 && (
              <div className="attention-summary attention-summary-focus">
                <div className="text-xs font-semibold">منتهي ونشط</div>
                <div className="text-xl font-bold">{categorized.expired.length}</div>
              </div>
            )}
          </div>

          <div className="divide-y overflow-hidden rounded-lg border bg-white">
            {needsAttention.slice(0, 3).map((contract) => {
              const issues = getIssueType(contract);

              return (
                <button
                  key={contract.id}
                  type="button"
                  className="attention-row grid w-full grid-cols-[1fr_auto] items-center gap-3 px-3 py-1.5 text-right transition-colors"
                  onClick={() => navigate(`/contracts/${contract.id}`)}
                >
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate text-sm font-bold">{contract.contract_number}</span>
                    </div>
                    <div className="mt-1 grid gap-1 text-xs sm:grid-cols-2">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <User className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{formatCustomerName(contract.customers)}</span>
                      </span>
                      <span className="flex min-w-0 items-center gap-1.5">
                        <Car className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{contract.vehicles?.plate_number || 'غير محدد'}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex flex-wrap justify-end gap-1">
                      {issues.map((issue, index) => (
                        <Badge
                          key={`${issue.label}-${index}`}
                          variant="outline"
                          className={`attention-badge attention-badge-${issue.tone}`}
                        >
                          {issue.label}
                        </Badge>
                      ))}
                    </div>
                    <ArrowUpLeft className="hidden h-4 w-4 sm:block" />
                  </div>
                </button>
              );
            })}
          </div>

          {needsAttention.length > 3 && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/contracts?filter=needs-attention')}
                className="attention-view-all h-8 rounded-lg px-3 text-xs"
              >
                عرض جميع العقود ({needsAttention.length})
              </Button>
            </div>
          )}
        </div>
      </CardContent>

      <style>{`
          .contracts-system .contracts-attention-card,
          .contracts-attention-card {
            border-color: rgba(251, 107, 122, 0.28) !important;
            border-radius: 8px !important;
            color: var(--attention-text);
          }

        .contracts-system .contracts-attention-card > div:first-child,
        .contracts-attention-card > div:first-child {
          background: linear-gradient(90deg, rgba(251, 107, 122, 0.08), #fff 42%);
          border-color: var(--attention-border);
        }

        .contracts-attention-card .lucide-alert-triangle,
        .contracts-attention-card .lucide-arrow-up-left {
          color: var(--attention-alert);
        }

        .contracts-attention-card .lucide-file-text,
        .contracts-attention-card .lucide-user,
        .contracts-attention-card .lucide-car {
          color: var(--attention-muted);
        }

        .contracts-attention-card .attention-summary {
          min-height: 0;
          border: 1px solid var(--attention-border);
          border-radius: 8px;
          padding: 6px 10px;
          background: var(--attention-inner);
          display: flex;
          align-items: center;
          gap: 8px;
          line-height: 1;
        }

        .contracts-attention-card .attention-summary div:first-child {
          font-size: 11px;
          font-weight: 700;
        }

        .contracts-attention-card .attention-summary div:last-child {
          font-size: 14px;
          font-weight: 800;
        }

        .contracts-attention-card .attention-summary-info {
          background: rgba(56, 189, 248, 0.1);
          color: var(--attention-info);
          border-color: rgba(56, 189, 248, 0.28);
        }

        .contracts-attention-card .attention-summary-alert {
          background: rgba(251, 107, 122, 0.1);
          color: var(--attention-alert);
          border-color: rgba(251, 107, 122, 0.28);
        }

        .contracts-attention-card .attention-summary-focus {
          background: rgba(124, 131, 246, 0.1);
          color: var(--attention-focus);
          border-color: rgba(124, 131, 246, 0.28);
        }

        .contracts-attention-card .divide-y,
        .contracts-attention-card .border {
          border-color: var(--attention-border) !important;
        }

        .contracts-attention-card .attention-row:hover {
          background: rgba(56, 189, 248, 0.06);
        }

        .contracts-attention-card .attention-row span {
          color: var(--attention-muted);
        }

        .contracts-attention-card .attention-row .font-bold {
          color: var(--attention-text);
        }

        .contracts-attention-card .attention-badge {
          border-radius: 999px !important;
          font-size: 11px;
          line-height: 1;
          padding: 4px 8px;
          white-space: nowrap;
        }

        .contracts-attention-card .attention-badge-info {
          background: rgba(56, 189, 248, 0.1);
          color: var(--attention-info);
          border-color: rgba(56, 189, 248, 0.32);
        }

        .contracts-attention-card .attention-badge-alert {
          background: rgba(251, 107, 122, 0.1);
          color: var(--attention-alert);
          border-color: rgba(251, 107, 122, 0.32);
        }

        .contracts-attention-card .attention-badge-focus {
          background: rgba(124, 131, 246, 0.1);
          color: var(--attention-focus);
          border-color: rgba(124, 131, 246, 0.32);
        }

        .contracts-attention-card .attention-view-all {
          border-color: rgba(251, 107, 122, 0.32) !important;
          color: var(--attention-alert) !important;
          background: #fff !important;
        }

        .contracts-attention-card .attention-view-all:hover {
          background: rgba(251, 107, 122, 0.08) !important;
        }

        @media (max-width: 640px) {
          .contracts-attention-card .attention-row {
            grid-template-columns: 1fr;
          }

          .contracts-attention-card .attention-row > div:last-child {
            justify-content: flex-start;
          }
        }
      `}</style>
    </Card>
  );
};
