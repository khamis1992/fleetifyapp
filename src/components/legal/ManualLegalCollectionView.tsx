
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { FileText, Plus, Folder, Trash2, Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useManualLegalCollections, ManualCollectionItem } from '@/hooks/useManualLegalCollections';
import { useCustomerFinancialSummary } from '@/hooks/useCustomerFinancialSummary';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyFilter } from '@/hooks/useCompanyScope';

// Custom hook to fetch customers directly from Supabase
const useCustomersForLegalCollection = () => {
  const companyFilter = useCompanyFilter();
  
  return useQuery({
    queryKey: ['customers-for-legal', companyFilter.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, phone')
        .eq('company_id', companyFilter.company_id)
        .order('first_name', { ascending: true });
      
      if (error) throw error;
      
      return data?.map(c => ({
        id: c.id,
        name: c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'عميل بدون اسم',
        phone: c.phone || ''
      })) || [];
    },
    enabled: !!companyFilter.company_id,
  });
};

export const ManualLegalCollectionView: React.FC = () => {
  // Hooks
  const { 
    collections, 
    isLoading, 
    createCollection, 
    addRepaymentPlan, 
    updateRepaymentStatus,
    deleteCollection 
  } = useManualLegalCollections();
  
  const { data: customers, isLoading: customersLoading } = useCustomersForLegalCollection();
  
  // State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<ManualCollectionItem | null>(null);
  const [openCombobox, setOpenCombobox] = useState(false);
  
  // Form States
  const [formData, setFormData] = useState({
    customer_name: '',
    client_id: '',
    amount: 0,
    description: ''
  });

  // Fetch financial summary when client is selected
  const { data: financialSummary } = useCustomerFinancialSummary(formData.client_id);

  // Auto-populate amount when financial summary is loaded
  useEffect(() => {
    if (financialSummary && formData.client_id) {
      setFormData(prev => ({
        ...prev,
        amount: financialSummary.totalOutstanding || 0
      }));
    }
  }, [financialSummary, formData.client_id]);

  const [planData, setPlanData] = useState({
    amount: 0,
    due_date: '',
    notes: ''
  });

  // Handlers
  const handleCreate = async () => {
    try {
      await createCollection.mutateAsync(formData);
      setIsAddOpen(false);
      setFormData({ customer_name: '', client_id: '', amount: 0, description: '' });
    } catch (e) {
      // Error handled in hook
    }
  };

  const handleAddPlan = async () => {
    if (!selectedCollection) return;
    try {
      await addRepaymentPlan.mutateAsync({
        case_id: selectedCollection.id,
        amount: planData.amount,
        due_date: planData.due_date,
        notes: planData.notes,
        status: 'pending'
      });
      setIsPlanOpen(false);
      setPlanData({ amount: 0, due_date: '', notes: '' });
    } catch (e) {
      // Error handled in hook
    }
  };
  
  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه الذمة؟')) {
      await deleteCollection.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-xl font-bold text-slate-800">تفاصيل الذمم تحت التحصيل القانوني (يدوي)</h2>
           <p className="text-sm text-slate-500">تسجيل ومتابعة الذمم المالية والخطط السداد يدوياً</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="bg-rose-600 hover:bg-rose-700 text-white gap-2">
          <Plus size={16} />
          تسجيل ذمة جديدة
        </Button>
      </div>

      {/* Collections Table */}
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-rose-500" />
              قائمة الذمم المسجلة
            </CardTitle>
            <Badge variant="secondary" className="text-sm bg-slate-100 text-slate-600 border-slate-200">
              {collections.length} ذمة
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {collections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Folder className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-lg font-semibold text-slate-700">لا توجد ذمم مسجلة</p>
              <p className="text-sm text-slate-500 mt-1">قم بإضافة ذمة جديدة للبدء في المتابعة</p>
              <Button variant="outline" onClick={() => setIsAddOpen(true)} className="mt-4">
                إضافة ذمة
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="text-right font-semibold text-slate-600">العميل</TableHead>
                    <TableHead className="text-right font-semibold text-slate-600">رقم الملف</TableHead>
                    <TableHead className="text-right font-semibold text-slate-600">المبلغ المستحق</TableHead>
                    <TableHead className="text-right font-semibold text-slate-600">المحصل</TableHead>
                    <TableHead className="text-right font-semibold text-slate-600">المتبقي</TableHead>
                    <TableHead className="text-right font-semibold text-slate-600">حالة السداد</TableHead>
                    <TableHead className="text-right font-semibold text-slate-600">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collections.map((item) => (
                    <React.Fragment key={item.id}>
                      <TableRow className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-medium">{item.customer_name}</TableCell>
                        <TableCell className="font-mono text-xs">{item.case_number}</TableCell>
                        <TableCell className="font-bold text-rose-600">{formatCurrency(item.amount)}</TableCell>
                        <TableCell className="text-emerald-600">{formatCurrency(item.collected_amount)}</TableCell>
                        <TableCell className="font-bold">{formatCurrency(item.remaining_amount)}</TableCell>
                        <TableCell>
                           <div className="flex items-center gap-2">
                             <div className="w-full bg-slate-100 rounded-full h-2 w-24">
                               <div 
                                 className="bg-emerald-500 h-2 rounded-full" 
                                 style={{ width: `${Math.min(100, (item.collected_amount / item.amount) * 100)}%` }} 
                               />
                             </div>
                             <span className="text-xs text-slate-500">
                               {Math.round((item.collected_amount / item.amount) * 100)}%
                             </span>
                           </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                setSelectedCollection(item);
                                setIsPlanOpen(true);
                              }}
                              className="text-xs h-8"
                            >
                              خطة السداد
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(item.id)}
                              className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {/* Plans Expansion */}
                      {item.repayment_plans.length > 0 && (
                         <TableRow className="bg-slate-50/50">
                           <TableCell colSpan={7} className="p-4 pt-0 border-b">
                             <div className="mt-2 mr-4 border-r-2 border-slate-200 pr-4">
                               <h4 className="text-xs font-bold text-slate-500 mb-2">جدول الدفعات:</h4>
                               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                 {item.repayment_plans.map(plan => (
                                   <div key={plan.id} className={cn(
                                     "flex items-center justify-between p-2 rounded-lg border text-xs",
                                     plan.status === 'paid' ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
                                     plan.status === 'overdue' ? "bg-rose-50 border-rose-100 text-rose-700" :
                                     "bg-white border-slate-200 text-slate-700"
                                   )}>
                                      <span>{new Date(plan.due_date).toLocaleDateString('ar-EG')}</span>
                                      <span className="font-bold">{formatCurrency(plan.amount)}</span>
                                      <Badge 
                                        variant="outline" 
                                        className={cn(
                                          "text-[10px] h-5 px-1 cursor-pointer hover:bg-opacity-80", 
                                          plan.status === 'paid' ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600"
                                        )}
                                        onClick={() => {
                                          if (plan.status !== 'paid') {
                                            if (confirm('هل تريد تغيير الحالة إلى مدفوع؟')) {
                                              updateRepaymentStatus.mutate({ id: plan.id, status: 'paid' });
                                            }
                                          } else {
                                             if (confirm('هل تريد إلغاء حالة الدفع؟')) {
                                              updateRepaymentStatus.mutate({ id: plan.id, status: 'pending' });
                                            }
                                          }
                                        }}
                                      >
                                        {plan.status === 'paid' ? 'تم الدفع' : 'معلق'}
                                      </Badge>
                                   </div>
                                 ))}
                               </div>
                             </div>
                           </TableCell>
                         </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Collection Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تسجيل ذمة جديدة</DialogTitle>
            <DialogDescription>أدخل بيانات الذمة المالية للمتابعة</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>العميل</Label>
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox}
                    className="w-full justify-between"
                  >
                    {formData.client_id
                      ? customers?.find((customer) => customer.id === formData.client_id)?.name || "اختر العميل..."
                      : "اختر العميل..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="بحث باسم العميل أو رقم الجوال..." />
                    <CommandList>
                      <CommandEmpty>
                        {customersLoading ? "جاري التحميل..." : "لم يتم العثور على عملاء."}
                      </CommandEmpty>
                      <CommandGroup heading="العملاء">
                        {customers?.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={`${customer.name} ${customer.phone}`}
                            onSelect={() => {
                              setFormData(prev => ({
                                ...prev,
                                client_id: customer.id === prev.client_id ? "" : customer.id,
                                customer_name: customer.name
                              }));
                              setOpenCombobox(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.client_id === customer.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{customer.name}</span>
                              {customer.phone && (
                                <span className="text-xs text-muted-foreground">{customer.phone}</span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Financial Summary Display */}
            {formData.client_id && financialSummary && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500 mb-2">الملخص المالي للعميل:</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-600">إجمالي الفواتير: </span>
                    <span className="font-medium">{formatCurrency(financialSummary.totalInvoices)}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">المدفوع: </span>
                    <span className="font-medium text-emerald-600">{formatCurrency(financialSummary.totalPaid)}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">المتبقي: </span>
                    <span className="font-bold text-rose-600">{formatCurrency(financialSummary.totalOutstanding)}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">المتأخر: </span>
                    <span className="font-medium text-amber-600">{formatCurrency(financialSummary.overdueAmount)}</span>
                  </div>
                </div>
              </div>
            )}
            
             <div className="space-y-2">
              <Label>اسم العميل (أو جهة أخرى)</Label>
              <Input 
                value={formData.customer_name} 
                onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                placeholder="أدخل الاسم يدوياً إذا لم يكن في القائمة"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>المبلغ المستحق</Label>
                {formData.client_id && financialSummary && (
                  <span className="text-xs text-slate-500">(تم التعبئة تلقائياً)</span>
                )}
              </div>
              <Input 
                type="number" 
                value={formData.amount} 
                onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>ملاحظات / وصف</Label>
              <Textarea 
                value={formData.description} 
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>إلغاء</Button>
            <Button onClick={handleCreate} disabled={!formData.amount || !formData.customer_name}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Repayment Plan Dialog */}
      <Dialog open={isPlanOpen} onOpenChange={setIsPlanOpen}>
        <DialogContent>
           <DialogHeader>
            <DialogTitle>إضافة دفعة للسداد</DialogTitle>
            <DialogDescription>جدولة دفعة جديدة لـ {selectedCollection?.customer_name}</DialogDescription>
          </DialogHeader>
           <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>تاريخ الاستحقاق</Label>
              <Input 
                type="date" 
                value={planData.due_date} 
                onChange={(e) => setPlanData(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>مبلغ الدفعة</Label>
              <Input 
                type="number" 
                value={planData.amount} 
                onChange={(e) => setPlanData(prev => ({ ...prev, amount: Number(e.target.value) }))}
              />
            </div>
             <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Input 
                value={planData.notes} 
                onChange={(e) => setPlanData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
           </div>
           <DialogFooter>
            <Button variant="outline" onClick={() => setIsPlanOpen(false)}>إلغاء</Button>
            <Button onClick={handleAddPlan} disabled={!planData.amount || !planData.due_date}>إضافة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
