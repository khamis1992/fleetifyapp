/**
 * صفحة إدارة المتعثرات المالية - النظام اليدوي
 * يتم إدراج العملاء يدوياً وتتبع التحصيل مع التكامل مع المدفوعات
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Gavel,
  Plus,
  Search,
  DollarSign,
  User,
  Phone,
  Calendar,
  MoreVertical,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Filter
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AddLegalCaseDialog } from '@/components/legal/AddLegalCaseDialog';
import { useLegalCollectionCases, useDeleteLegalCase, useCloseLegalCase, LegalCollectionCase } from '@/hooks/useLegalCollectionCases';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatCurrency, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// ===== System Colors =====
const colors = {
  primary: '174 80% 40%',      // Teal
  destructive: '0 65% 51%',    // Red
  warning: '25 85% 55%',       // Orange
  success: '142 56% 42%',      // Green
};

const FinancialDelinquencyPage: React.FC = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: cases, isLoading } = useLegalCollectionCases();
  const deleteCase = useDeleteLegalCase();
  const closeCase = useCloseLegalCase();

  // Filter cases
  const filteredCases = cases?.filter(c => {
    const customerName = c.customers.company_name || `${c.customers.first_name} ${c.customers.last_name}`;
    const matchesSearch = customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.customers.phone?.includes(searchTerm) ||
                          c.case_number?.includes(searchTerm);
    return matchesSearch;
  });

  // Calculate stats
  const stats = React.useMemo(() => {
    if (!cases) return { total: 0, totalClaim: 0, totalCollected: 0, activeCount: 0 };
    return {
      total: cases.length,
      totalClaim: cases.reduce((sum, c) => sum + Number(c.claim_amount), 0),
      totalCollected: cases.reduce((sum, c) => sum + Number(c.collected_amount), 0),
      activeCount: cases.filter(c => c.status === 'open').length,
    };
  }, [cases]);

  return (
    <div className="w-full min-h-screen bg-neutral-50/50 font-sans text-right pb-8" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-red-500 to-red-600 p-3 rounded-2xl shadow-lg shadow-red-500/20">
              <Gavel className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">التحصيل القانوني</h1>
              <p className="text-neutral-500 mt-1">إدارة ومتابعة قضايا التحصيل والعملاء المتعثرين</p>
            </div>
          </div>

          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white gap-2 h-11 px-6 rounded-xl shadow-md transition-all"
          >
            <Plus className="h-5 w-5" />
            إضافة عميل للقائمة
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-1 h-full bg-red-500" />
            <CardContent className="p-5">
              <p className="text-neutral-500 text-sm font-medium mb-1">إجمالي المطالبات</p>
              <p className="text-2xl font-bold text-neutral-900">{formatCurrency(stats.totalClaim)}</p>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-1 h-full bg-green-500" />
            <CardContent className="p-5">
              <p className="text-neutral-500 text-sm font-medium mb-1">المحصل فعلياً</p>
              <p className="text-2xl font-bold text-neutral-900">{formatCurrency(stats.totalCollected)}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-1 h-full bg-orange-500" />
            <CardContent className="p-5">
              <p className="text-neutral-500 text-sm font-medium mb-1">المتبقي للتحصيل</p>
              <p className="text-2xl font-bold text-neutral-900">{formatCurrency(stats.totalClaim - stats.totalCollected)}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-1 h-full bg-blue-500" />
            <CardContent className="p-5">
              <p className="text-neutral-500 text-sm font-medium mb-1">الحالات النشطة</p>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-neutral-900">{stats.activeCount}</p>
                <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                  {stats.total} إجمالي
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-neutral-100">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="بحث باسم العميل، رقم الهاتف، أو رقم الملف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 border-none bg-transparent focus-visible:ring-0"
            />
          </div>
          <div className="w-px h-6 bg-neutral-200" />
          <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-neutral-700">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Cases List */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : !filteredCases?.length ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-neutral-200">
            <div className="bg-neutral-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-neutral-400" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 mb-1">لا توجد حالات تحصيل</h3>
            <p className="text-neutral-500 mb-4">قم بإضافة عملاء للقائمة لبدء تتبع التحصيل</p>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              إضافة حالة جديدة
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence>
              {filteredCases.map((legalCase) => {
                const customerName = legalCase.customers.company_name || `${legalCase.customers.first_name} ${legalCase.customers.last_name}`;
                const progress = Math.min((legalCase.collected_amount / legalCase.claim_amount) * 100, 100);
                
                return (
                  <motion.div
                    key={legalCase.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    layout
                  >
                    <Card className="border-none shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden">
                      <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row">
                          {/* Status Strip */}
                          <div className={cn(
                            "w-full md:w-2 h-2 md:h-auto",
                            legalCase.status === 'open' ? 'bg-red-500' : 'bg-green-500'
                          )} />
                          
                          <div className="flex-1 p-5">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center text-xl font-bold text-neutral-600">
                                  {customerName.charAt(0)}
                                </div>
                                <div>
                                  <h3 className="font-bold text-lg text-neutral-900">{customerName}</h3>
                                  <div className="flex items-center gap-3 text-sm text-neutral-500 mt-1">
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {legalCase.customers.phone || 'لا يوجد رقم'}
                                    </span>
                                    {legalCase.case_number && (
                                      <span className="flex items-center gap-1 bg-neutral-100 px-2 py-0.5 rounded text-xs">
                                        <FileText className="h-3 w-3" />
                                        {legalCase.case_number}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className={cn(
                                  "px-3 py-1",
                                  legalCase.status === 'open' 
                                    ? "bg-red-50 text-red-700" 
                                    : "bg-green-50 text-green-700"
                                )}>
                                  {legalCase.status === 'open' ? 'نشط' : 'مغلق'}
                                </Badge>
                                
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="rounded-full">
                                      <MoreVertical className="h-4 w-4 text-neutral-400" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => closeCase.mutate(legalCase.id)}>
                                      <CheckCircle2 className="h-4 w-4 ml-2" />
                                      إغلاق الحالة
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => deleteCase.mutate(legalCase.id)} className="text-red-600">
                                      <Trash2 className="h-4 w-4 ml-2" />
                                      حذف
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center bg-neutral-50/50 p-4 rounded-xl border border-neutral-100">
                              <div>
                                <p className="text-xs text-neutral-500 mb-1">المطالبة</p>
                                <p className="font-bold text-lg text-neutral-900">{formatCurrency(legalCase.claim_amount)}</p>
                              </div>
                              
                              <div>
                                <p className="text-xs text-neutral-500 mb-1">تم تحصيله</p>
                                <p className="font-bold text-lg text-green-600">{formatCurrency(legalCase.collected_amount)}</p>
                              </div>

                              <div>
                                <div className="flex justify-between text-xs text-neutral-500 mb-1">
                                  <span>نسبة التحصيل</span>
                                  <span>{Math.round(progress)}%</span>
                                </div>
                                <div className="h-2.5 bg-neutral-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-green-500 rounded-full transition-all duration-500" 
                                    style={{ width: `${progress}%` }} 
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between text-xs text-neutral-400 px-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                تاريخ الإضافة: {format(new Date(legalCase.created_at), 'dd MMM yyyy', { locale: ar })}
                              </span>
                              {legalCase.notes && (
                                <span className="max-w-[50%] truncate" title={legalCase.notes}>
                                  {legalCase.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        <AddLegalCaseDialog 
          open={isAddDialogOpen} 
          onOpenChange={setIsAddDialogOpen} 
        />
      </div>
    </div>
  );
};

export default FinancialDelinquencyPage;
