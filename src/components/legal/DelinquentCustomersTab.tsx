import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, FileText, AlertTriangle, Download, Users } from 'lucide-react';
import DelinquentSummaryCards from './DelinquentSummaryCards';
import DelinquentCustomersTable from './DelinquentCustomersTable';
import { useConvertToLegalCase } from '@/hooks/useConvertToLegalCase';
import { toast } from 'sonner';
import type { DelinquentCustomer } from '@/hooks/useDelinquentCustomers';

export const DelinquentCustomersTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [riskLevelFilter, setRiskLevelFilter] = useState<string>('all');
  const [overduePeriodFilter, setOverduePeriodFilter] = useState<string>('all');
  const [violationsFilter, setViolationsFilter] = useState<string>('all');
  const [selectedCustomers, setSelectedCustomers] = useState<DelinquentCustomer[]>([]);

  const convertToCase = useConvertToLegalCase();

  // Build filters object
  const filters = {
    search: searchTerm || undefined,
    riskLevel: riskLevelFilter !== 'all' ? riskLevelFilter as any : undefined,
    overduePeriod: overduePeriodFilter !== 'all' ? overduePeriodFilter as any : undefined,
    hasViolations: violationsFilter !== 'all' 
      ? violationsFilter === 'yes' 
      : undefined,
  };

  // Handle create case for single customer
  const handleCreateCase = async (customer: DelinquentCustomer) => {
    try {
      await convertToCase.mutateAsync({
        delinquentCustomer: customer,
      });
    } catch (error) {
      console.error('Error creating case:', error);
    }
  };

  // Handle view details
  const handleViewDetails = (customer: DelinquentCustomer) => {
    toast.info('عرض التفاصيل', {
      description: `سيتم فتح صفحة تفاصيل العميل: ${customer.customer_name}`,
    });
    // TODO: Implement navigation to customer details
  };

  // Handle send warning
  const handleSendWarning = (customer: DelinquentCustomer) => {
    toast.info('إرسال إنذار', {
      description: `سيتم إرسال إنذار للعميل: ${customer.customer_name}`,
    });
    // TODO: Implement warning generation
  };

  // Handle bulk create cases
  const handleBulkCreateCases = async () => {
    if (selectedCustomers.length === 0) {
      toast.error('لم يتم تحديد أي عملاء');
      return;
    }

    toast.info(`جاري إنشاء ${selectedCustomers.length} قضية قانونية...`);
    
    // TODO: Implement bulk case creation
    for (const customer of selectedCustomers) {
      try {
        await convertToCase.mutateAsync({
          delinquentCustomer: customer,
        });
      } catch (error) {
        console.error(`Failed to create case for ${customer.customer_name}:`, error);
      }
    }
  };

  // Handle export
  const handleExport = () => {
    toast.info('تصدير البيانات', {
      description: 'سيتم تصدير البيانات إلى Excel',
    });
    // TODO: Implement export functionality
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <Card className="bg-gradient-to-br from-destructive/5 via-destructive/3 to-background border-destructive/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-destructive/10">
                <Users className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-2xl">العملاء المتأخرون عن الدفع</CardTitle>
                <CardDescription className="text-base mt-1">
                  تتبع ومتابعة العملاء المتأخرين - جاهز للتحويل إلى قضايا قانونية
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <DelinquentSummaryCards />

      {/* Filters and Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Search and Filters Row */}
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث في العملاء... (الاسم، رقم العميل، العقد، المركبة)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>

              {/* Risk Level Filter */}
              <Select value={riskLevelFilter} onValueChange={setRiskLevelFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="مستوى المخاطر" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المستويات</SelectItem>
                  <SelectItem value="CRITICAL">خطر حرج (85-100)</SelectItem>
                  <SelectItem value="HIGH">خطر عالي (70-84)</SelectItem>
                  <SelectItem value="MEDIUM">خطر متوسط (60-69)</SelectItem>
                  <SelectItem value="LOW">خطر منخفض (40-59)</SelectItem>
                  <SelectItem value="MONITOR">مراقبة (0-39)</SelectItem>
                </SelectContent>
              </Select>

              {/* Overdue Period Filter */}
              <Select value={overduePeriodFilter} onValueChange={setOverduePeriodFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="فترة التأخير" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفترات</SelectItem>
                  <SelectItem value="<30">أقل من 30 يوم</SelectItem>
                  <SelectItem value="30-60">30-60 يوم</SelectItem>
                  <SelectItem value="60-90">60-90 يوم</SelectItem>
                  <SelectItem value=">90">أكثر من 90 يوم</SelectItem>
                </SelectContent>
              </Select>

              {/* Violations Filter */}
              <Select value={violationsFilter} onValueChange={setViolationsFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="المخالفات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="yes">يوجد مخالفات</SelectItem>
                  <SelectItem value="no">لا يوجد مخالفات</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bulk Actions Row */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleBulkCreateCases}
                disabled={selectedCustomers.length === 0}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                إنشاء قضايا ({selectedCustomers.length})
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={selectedCustomers.length === 0}
                className="gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                إرسال إنذارات ({selectedCustomers.length})
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="gap-2 mr-auto"
              >
                <Download className="h-4 w-4" />
                تصدير Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardContent className="pt-6">
          <DelinquentCustomersTable
            filters={filters}
            onSelectCustomers={setSelectedCustomers}
            onViewDetails={handleViewDetails}
            onCreateCase={handleCreateCase}
            onSendWarning={handleSendWarning}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default DelinquentCustomersTab;
