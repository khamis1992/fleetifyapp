import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, FileText, AlertTriangle, Phone, Mail } from 'lucide-react';
import { useDelinquentCustomers, type DelinquentCustomer } from '@/hooks/useDelinquentCustomers';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import RiskScoreIndicator from './RiskScoreIndicator';
import RecommendedActionBadge from './RecommendedActionBadge';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

interface DelinquentCustomersTableProps {
  filters?: any;
  onSelectCustomers?: (selected: DelinquentCustomer[]) => void;
  onViewDetails?: (customer: DelinquentCustomer) => void;
  onCreateCase?: (customer: DelinquentCustomer) => void;
  onSendWarning?: (customer: DelinquentCustomer) => void;
}

export const Delinquent CustomersTable: React.FC<DelinquentCustomersTableProps> = ({
  filters,
  onSelectCustomers,
  onViewDetails,
  onCreateCase,
  onSendWarning,
}) => {
  const { data: customers, isLoading, error } = useDelinquentCustomers(filters);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked && customers) {
      const allIds = new Set(customers.map(c => c.customer_id));
      setSelectedIds(allIds);
      onSelectCustomers?.(customers);
    } else {
      setSelectedIds(new Set());
      onSelectCustomers?.([]);
    }
  };

  // Handle select individual
  const handleSelectCustomer = (customer: DelinquentCustomer, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(customer.customer_id);
    } else {
      newSelected.delete(customer.customer_id);
    }
    setSelectedIds(newSelected);
    
    if (customers) {
      const selectedCustomers = customers.filter(c => newSelected.has(c.customer_id));
      onSelectCustomers?.(selectedCustomers);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.
        </AlertDescription>
      </Alert>
    );
  }

  if (!customers || customers.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          لا يوجد عملاء متأخرين في الوقت الحالي. جميع العملاء يدفعون في الوقت المحدد! 🎉
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox
                checked={selectedIds.size === customers.length}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead>العميل</TableHead>
            <TableHead>الاتصال</TableHead>
            <TableHead>العقد</TableHead>
            <TableHead>المركبة</TableHead>
            <TableHead className="text-center">أشهر متأخرة</TableHead>
            <TableHead className="text-right">الإيجارات</TableHead>
            <TableHead className="text-right">الغرامات</TableHead>
            <TableHead className="text-right">المخالفات</TableHead>
            <TableHead className="text-right">الإجمالي</TableHead>
            <TableHead className="text-center">أيام التأخير</TableHead>
            <TableHead className="text-center">المخاطر</TableHead>
            <TableHead className="text-center">الإجراء الموصى</TableHead>
            <TableHead className="text-center">إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow
              key={customer.customer_id}
              className={`cursor-pointer hover:bg-muted/50 ${
                selectedIds.has(customer.customer_id) ? 'bg-muted' : ''
              }`}
            >
              <TableCell>
                <Checkbox
                  checked={selectedIds.has(customer.customer_id)}
                  onCheckedChange={(checked) => handleSelectCustomer(customer, checked as boolean)}
                />
              </TableCell>
              
              {/* Customer Name */}
              <TableCell>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{customer.customer_name}</span>
                    {customer.is_blacklisted && (
                      <Badge variant="destructive" className="text-xs">
                        قائمة سوداء
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {customer.customer_code}
                  </span>
                </div>
              </TableCell>

              {/* Contact */}
              <TableCell>
                <div className="flex flex-col gap-1 text-xs">
                  {customer.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <span className="truncate max-w-[150px]">{customer.email}</span>
                    </div>
                  )}
                </div>
              </TableCell>

              {/* Contract */}
              <TableCell className="text-sm">
                {customer.contract_number}
              </TableCell>

              {/* Vehicle */}
              <TableCell className="text-sm font-mono">
                {customer.vehicle_plate || '-'}
              </TableCell>

              {/* Months Unpaid */}
              <TableCell className="text-center">
                <Badge variant="outline" className="font-bold">
                  {customer.months_unpaid} شهر
                </Badge>
              </TableCell>

              {/* Overdue Amount */}
              <TableCell className="text-right font-medium">
                {formatCurrency(customer.overdue_amount)}
              </TableCell>

              {/* Penalties */}
              <TableCell className="text-right text-orange-600">
                {formatCurrency(customer.late_penalty)}
              </TableCell>

              {/* Violations */}
              <TableCell className="text-right">
                {customer.violations_count > 0 ? (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">
                      {formatCurrency(customer.violations_amount)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({customer.violations_count} مخالفة)
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>

              {/* Total Debt */}
              <TableCell className="text-right">
                <span className="font-bold text-base text-destructive">
                  {formatCurrency(customer.total_debt)}
                </span>
              </TableCell>

              {/* Days Overdue */}
              <TableCell className="text-center">
                <Badge
                  variant={customer.days_overdue > 90 ? 'destructive' : 'secondary'}
                  className="font-mono"
                >
                  {customer.days_overdue} يوم
                </Badge>
              </TableCell>

              {/* Risk Score */}
              <TableCell className="text-center">
                <RiskScoreIndicator
                  score={customer.risk_score}
                  label={customer.risk_level}
                  size="md"
                />
              </TableCell>

              {/* Recommended Action */}
              <TableCell className="text-center">
                <RecommendedActionBadge
                  action={customer.recommended_action}
                  size="sm"
                />
              </TableCell>

              {/* Actions */}
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onViewDetails?.(customer)}
                    title="عرض التفاصيل"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  {(customer.recommended_action.action === 'FILE_LEGAL_CASE' ||
                    customer.recommended_action.action === 'BLACKLIST_AND_FILE_CASE') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onCreateCase?.(customer)}
                      title="إنشاء قضية"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  )}

                  {(customer.recommended_action.action === 'SEND_WARNING' ||
                    customer.recommended_action.action === 'SEND_FORMAL_NOTICE') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-orange-600 hover:text-orange-600 hover:bg-orange-100"
                      onClick={() => onSendWarning?.(customer)}
                      title="إرسال إنذار"
                    >
                      <AlertTriangle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Selection Summary */}
      {selectedIds.size > 0 && (
        <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-sm font-medium">
            تم تحديد {selectedIds.size} عميل
          </p>
        </div>
      )}
    </div>
  );
};

export default DelinquentCustomersTable;
