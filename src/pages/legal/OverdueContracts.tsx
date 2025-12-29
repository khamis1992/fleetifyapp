/**
 * صفحة العقود المتعثرة عن الدفع
 * لعرض العقود التي تأخر أصحابها عن السداد وإتاحة رفع دعاوى
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { 
  AlertTriangle, 
  Search, 
  Gavel,
  DollarSign,
  Clock,
  User,
  Car,
  FileText,
  Filter,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { lawsuitService, OverdueContract } from '@/services/LawsuitService';

export default function OverdueContracts() {
  const navigate = useNavigate();
  const { companyId, isLoading: companyLoading } = useUnifiedCompanyAccess();
  
  // الحالات
  const [searchTerm, setSearchTerm] = useState('');
  const [minDaysFilter, setMinDaysFilter] = useState('30');
  const [sortBy, setSortBy] = useState<'amount' | 'days'>('amount');

  // جلب العقود المتعثرة
  const { data: contracts = [], isLoading, refetch } = useQuery({
    queryKey: ['overdue-contracts', companyId, minDaysFilter],
    queryFn: () => lawsuitService.getOverdueContracts(companyId!, parseInt(minDaysFilter)),
    enabled: !!companyId,
  });

  // فلترة وترتيب العقود
  const filteredContracts = contracts
    .filter(contract => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        contract.customer_name.toLowerCase().includes(search) ||
        contract.contract_number.toLowerCase().includes(search) ||
        contract.vehicle_info.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'amount') return b.total_overdue - a.total_overdue;
      return b.days_overdue - a.days_overdue;
    });

  // إحصائيات
  const totalOverdue = contracts.reduce((sum, c) => sum + c.total_overdue, 0);
  const avgDaysOverdue = contracts.length > 0
    ? Math.round(contracts.reduce((sum, c) => sum + c.days_overdue, 0) / contracts.length)
    : 0;
  const withLawsuitCount = contracts.filter(c => c.has_lawsuit).length;

  // تحديد لون حسب عدد أيام التأخير
  const getDaysColor = (days: number) => {
    if (days >= 90) return 'destructive';
    if (days >= 60) return 'warning';
    return 'secondary';
  };

  // الذهاب لصفحة تجهيز الدعوى
  const handlePrepareLawsuit = (contract: OverdueContract) => {
    if (contract.has_lawsuit) {
      toast.info('يوجد دعوى جارية لهذا العقد');
      return;
    }
    navigate(`/legal/lawsuit/prepare/${contract.contract_id}`);
  };

  if (companyLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl" dir="rtl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-destructive/10 rounded-xl">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">العقود المتعثرة عن الدفع</h1>
              <p className="text-muted-foreground">
                عرض العقود التي تأخر أصحابها عن السداد لرفع دعاوى قضائية
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث
          </Button>
        </div>
      </motion.div>

      {/* الإحصائيات */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-4 md:grid-cols-4 mb-6"
      >
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المتأخرات</p>
                <p className="text-2xl font-bold text-destructive">
                  {totalOverdue.toLocaleString('ar-QA')} ر.ق
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-destructive/30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">عدد العقود المتعثرة</p>
                <p className="text-2xl font-bold">{contracts.length}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">متوسط أيام التأخير</p>
                <p className="text-2xl font-bold">{avgDaysOverdue} يوم</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">دعاوى مرفوعة</p>
                <p className="text-2xl font-bold text-primary">{withLawsuitCount}</p>
              </div>
              <Gavel className="h-8 w-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* الفلاتر */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث بالاسم أو رقم العقد أو السيارة..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>
              
              <Select value={minDaysFilter} onValueChange={setMinDaysFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 ml-2" />
                  <SelectValue placeholder="الحد الأدنى للتأخير" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">جميع المتأخرات</SelectItem>
                  <SelectItem value="15">15+ يوم</SelectItem>
                  <SelectItem value="30">30+ يوم</SelectItem>
                  <SelectItem value="60">60+ يوم</SelectItem>
                  <SelectItem value="90">90+ يوم</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'amount' | 'days')}>
                <SelectTrigger className="w-[150px]">
                  <TrendingUp className="h-4 w-4 ml-2" />
                  <SelectValue placeholder="ترتيب حسب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">المبلغ</SelectItem>
                  <SelectItem value="days">أيام التأخير</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* جدول العقود */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              العقود المتعثرة ({filteredContracts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredContracts.length === 0 ? (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {contracts.length === 0 
                    ? 'لا توجد عقود متعثرة عن الدفع حالياً. ممتاز!'
                    : 'لا توجد نتائج تطابق البحث.'}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المستأجر</TableHead>
                      <TableHead>رقم العقد</TableHead>
                      <TableHead>السيارة</TableHead>
                      <TableHead>المبلغ المتأخر</TableHead>
                      <TableHead>أيام التأخير</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>الإجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContracts.map((contract, index) => (
                      <motion.tr
                        key={contract.contract_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-muted rounded-lg">
                              <User className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-medium">{contract.customer_name}</p>
                              {contract.customer_id_number && (
                                <p className="text-xs text-muted-foreground">
                                  {contract.customer_id_number}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{contract.contract_number}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{contract.vehicle_info}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-destructive">
                            {contract.total_overdue.toLocaleString('ar-QA')} ر.ق
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getDaysColor(contract.days_overdue)}>
                            {contract.days_overdue} يوم
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {contract.has_lawsuit ? (
                            <Badge variant="secondary" className="bg-primary/10 text-primary">
                              <Gavel className="h-3 w-3 ml-1" />
                              دعوى جارية
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-300">
                              <AlertCircle className="h-3 w-3 ml-1" />
                              بانتظار إجراء
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant={contract.has_lawsuit ? 'outline' : 'default'}
                            onClick={() => handlePrepareLawsuit(contract)}
                            disabled={contract.has_lawsuit}
                          >
                            <Gavel className="h-4 w-4 ml-2" />
                            {contract.has_lawsuit ? 'عرض الدعوى' : 'رفع دعوى'}
                          </Button>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

