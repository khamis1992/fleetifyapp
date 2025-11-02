import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBanks } from "@/hooks/useTreasury";
import { useCostCenters } from "@/hooks/useCostCenters";
import { useActiveContracts } from "@/hooks/useContracts";
import { useEntryAllowedAccounts } from "@/hooks/useEntryAllowedAccounts";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { usePermissions } from "@/hooks/usePermissions";
import { TestTube, AlertTriangle, Info, FileText, Eye, EyeOff } from "lucide-react";
import { AccountLevelBadge } from "@/components/finance/AccountLevelBadge";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";

interface PaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: string;
  vendorId?: string;
  invoiceId?: string;
  contractId?: string;
  type: 'receipt' | 'payment';
  onSuccess?: () => void;
}

export function PaymentForm({ open, onOpenChange, customerId, vendorId, invoiceId, contractId, type, onSuccess }: PaymentFormProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  
  // Access control and company validation
  const { companyId, hasCompanyAdminAccess, filter } = useUnifiedCompanyAccess();
  const { hasAccess: canCreatePayments, isLoading: permissionsLoading, reason: permissionReason } = usePermissions({
    permissions: ['payments.create'],
    requireCompanyAdmin: false
  });
  
  // Data hooks
  const { data: costCenters } = useCostCenters();
  const { data: banks } = useBanks();
  const { data: entryAllowedAccounts } = useEntryAllowedAccounts();

  // Fetch contracts for the customer/vendor
  const { data: contracts } = useActiveContracts(customerId, vendorId);
  const { currency: companyCurrency } = useCompanyCurrency();

  const [paymentData, setPaymentData] = useState({
    payment_number: '',
    payment_date: new Date().toISOString().split('T')[0],
    amount: 0,
    payment_method: 'cash',
    reference_number: '',
    check_number: '',
    bank_account: '',
    cost_center_id: 'none',
    bank_id: 'none',
    account_id: 'none',
    currency: companyCurrency,
    notes: '',
    contract_id: contractId || '',
  });
  
  const [showJournalPreview, setShowJournalPreview] = useState(false);
  const [journalPreview, setJournalPreview] = useState<any>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Debug user roles and permissions on component mount
  useEffect(() => {
    if (user && open) {
      const debug = {
        userId: user.id,
        userEmail: user.email,
        companyId: user.profile?.company_id,
        userRoles: user.roles || [],
        hasCompanyAdminAccess,
        canCreatePayments,
        permissionReason,
        permissionsLoading,
        costCentersCount: costCenters?.length || 0,
        banksCount: banks?.length || 0,
        accountsCount: entryAllowedAccounts?.length || 0
      };
      
      console.log('PaymentForm Debug Info:', debug);
      setDebugInfo(debug);
    }
  }, [user, open, hasCompanyAdminAccess, canCreatePayments, permissionReason, permissionsLoading, costCenters, banks, entryAllowedAccounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enhanced validation with detailed error messages
    console.log('Starting payment submission...', {
      user: user?.id,
      companyId: user?.profile?.company_id,
      type,
      paymentData
    });

    if (!user) {
      console.error('User not authenticated');
      toast.error("المستخدم غير مسجل الدخول");
      return;
    }

    if (!user.profile?.company_id) {
      console.error('User company not found', user);
      toast.error("لم يتم العثور على شركة المستخدم");
      return;
    }

    if (!canCreatePayments && !permissionsLoading) {
      console.error('User lacks payment creation permissions', { 
        canCreatePayments, 
        permissionReason,
        userRoles: user.roles 
      });
      toast.error(`ليس لديك صلاحية إنشاء الدفعات: ${permissionReason || 'غير محدد'}`);
      return;
    }

    if (!paymentData.payment_number) {
      toast.error("رقم الدفعة مطلوب");
      return;
    }

    if (paymentData.amount <= 0) {
      toast.error("المبلغ يجب أن يكون أكبر من صفر");
      return;
    }

    // Validate foreign key references
    if (paymentData.cost_center_id !== 'none' && !costCenters?.find(cc => cc.id === paymentData.cost_center_id)) {
      console.error('Invalid cost center selected', paymentData.cost_center_id);
      toast.error("مركز التكلفة المحدد غير صالح");
      return;
    }

    if (paymentData.bank_id !== 'none' && !banks?.find(bank => bank.id === paymentData.bank_id)) {
      console.error('Invalid bank selected', paymentData.bank_id);
      toast.error("البنك المحدد غير صالح");
      return;
    }

    if (paymentData.account_id !== 'none' && !entryAllowedAccounts?.find(acc => acc.id === paymentData.account_id)) {
      console.error('Invalid account selected', paymentData.account_id);
      toast.error("الحساب المحاسبي المحدد غير صالح");
      return;
    }

    setIsLoading(true);

    try {
      const insertData = {
        ...paymentData,
        company_id: user.profile.company_id,
        payment_method: type === 'receipt' ? 'received' : 'made', // النوع الجديد للعملية
        payment_type: paymentData.payment_method, // طريقة الدفع الفعلية
        transaction_type: type,
        customer_id: type === 'receipt' ? customerId : null,
        vendor_id: type === 'payment' ? vendorId : null,
        invoice_id: invoiceId,
        contract_id: paymentData.contract_id === 'none' || !paymentData.contract_id ? null : paymentData.contract_id,
        cost_center_id: paymentData.cost_center_id === 'none' ? null : paymentData.cost_center_id,
        bank_id: paymentData.bank_id === 'none' ? null : paymentData.bank_id,
        account_id: paymentData.account_id === 'none' ? null : paymentData.account_id,
        payment_status: 'completed', // تم تحديث قاعدة البيانات لتقبل 'completed'
        created_by: user.id,
      };

      console.log('🔧 Debug: Final payment data being sent:', {
        payment_method: insertData.payment_method,
        payment_type: insertData.payment_type,
        payment_status: insertData.payment_status,
        fullData: insertData
      });

      console.log('Inserting payment data:', insertData);

      const { data, error } = await supabase.from('payments').insert(insertData).select();

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('Payment created successfully:', data);
      toast.success(`تم إنشاء ${type === 'receipt' ? 'إيصال القبض' : 'إيصال الصرف'} بنجاح`);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      onOpenChange(false);
      
      // Reset form
      setPaymentData({
        payment_number: '',
        payment_date: new Date().toISOString().split('T')[0],
        amount: 0,
        payment_method: 'cash',
        reference_number: '',
        check_number: '',
        bank_account: '',
        cost_center_id: 'none',
        bank_id: 'none',
        account_id: 'none',
        currency: companyCurrency,
        notes: '',
        contract_id: 'none',
      });
    } catch (error: unknown) {
      console.error('Error creating payment:', error);
      
      // Provide more specific error messages
      let errorMessage = "حدث خطأ في إنشاء الدفعة";
      
      if (error?.code === 'PGRST116') {
        errorMessage = "ليس لديك صلاحية لإنشاء الدفعات";
      } else if (error?.code === '23503') {
        errorMessage = "خطأ في البيانات المرجعية - تأكد من صحة البيانات المحددة";
      } else if (error?.code === '23505') {
        errorMessage = "رقم الدفعة موجود مسبقاً";
      } else if (error?.message) {
        errorMessage = `خطأ: ${error.message}`;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const generateJournalPreview = async () => {
    if (!user?.profile?.company_id || paymentData.amount <= 0) {
      toast.error("يرجى إدخال المبلغ أولاً");
      return;
    }

    setIsPreviewLoading(true);
    try {
      // محاكاة إنشاء القيد المحاسبي
      const preview = {
        entry_number: `JE-${new Date().getFullYear().toString().slice(-2)}-XXXX`,
        entry_date: paymentData.payment_date,
        description: type === 'payment' 
          ? `Payment #${paymentData.payment_number || 'NEW'}`
          : `Receipt #${paymentData.payment_number || 'NEW'}`,
        total_amount: paymentData.amount,
        lines: []
      };

      // تحديد الحسابات للقيد
      const selectedAccount = entryAllowedAccounts?.find(acc => acc.id === paymentData.account_id);
      const selectedCostCenter = costCenters?.find(cc => cc.id === paymentData.cost_center_id);
      const selectedBank = banks?.find(b => b.id === paymentData.bank_id);

      // إنشاء سطور القيد حسب النوع
      if (type === 'payment') {
        // مدفوعات: مدين المصروف/المورد، دائن النقدية/البنك
        preview.lines.push({
          line_number: 1,
          account_name: selectedAccount?.account_name || 'حساب المصروفات العامة',
          account_code: selectedAccount?.account_code || '5010',
          cost_center_name: selectedCostCenter?.center_name || 'الإدارة',
          description: `Payment - ${paymentData.payment_number || 'NEW'}`,
          debit_amount: paymentData.amount,
          credit_amount: 0
        });

        preview.lines.push({
          line_number: 2,
          account_name: paymentData.payment_method === 'cash' 
            ? 'النقدية' 
            : selectedBank?.bank_name || 'البنك الرئيسي',
          account_code: paymentData.payment_method === 'cash' ? '1110' : '1120',
          cost_center_name: selectedCostCenter?.center_name || 'الإدارة',
          description: paymentData.payment_method === 'cash' 
            ? `Cash payment - ${paymentData.payment_number || 'NEW'}`
            : `Bank payment - ${paymentData.payment_number || 'NEW'}`,
          debit_amount: 0,
          credit_amount: paymentData.amount
        });
      } else {
        // مقبوضات: مدين النقدية/البنك، دائن الإيرادات/العملاء
        preview.lines.push({
          line_number: 1,
          account_name: paymentData.payment_method === 'cash' 
            ? 'النقدية' 
            : selectedBank?.bank_name || 'البنك الرئيسي',
          account_code: paymentData.payment_method === 'cash' ? '1110' : '1120',
          cost_center_name: selectedCostCenter?.center_name || 'الإدارة',
          description: paymentData.payment_method === 'cash' 
            ? `Cash receipt - ${paymentData.payment_number || 'NEW'}`
            : `Bank receipt - ${paymentData.payment_number || 'NEW'}`,
          debit_amount: paymentData.amount,
          credit_amount: 0
        });

        preview.lines.push({
          line_number: 2,
          account_name: selectedAccount?.account_name || 'الإيرادات الأخرى',
          account_code: selectedAccount?.account_code || '4020',
          cost_center_name: selectedCostCenter?.center_name || 'الإدارة',
          description: `Receipt - ${paymentData.payment_number || 'NEW'}`,
          debit_amount: 0,
          credit_amount: paymentData.amount
        });
      }

      setJournalPreview(preview);
      setShowJournalPreview(true);
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error("خطأ في إنشاء المعاينة");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const fillTestData = () => {
    setPaymentData({
      payment_number: `PAY-${Date.now()}`,
      payment_date: new Date().toISOString().split('T')[0],
      amount: 1500.00,
      payment_method: 'bank_transfer',
      reference_number: `REF-${Math.floor(Math.random() * 10000)}`,
      check_number: '',
      bank_account: '1234567890',
      cost_center_id: costCenters?.[0]?.id || 'none',
      bank_id: banks?.[0]?.id || 'none',
      account_id: entryAllowedAccounts?.[0]?.id || 'none',
      currency: companyCurrency,
      notes: 'هذه بيانات تجريبية للاختبار',
      contract_id: contracts?.[0]?.id || 'none'
    });
    toast.success("تم تعبئة البيانات التجريبية");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {type === 'receipt' ? 'إنشاء إيصال قبض جديد' : 'إنشاء إيصال صرف جديد'}
          </DialogTitle>
          <DialogDescription>
            {type === 'receipt' 
              ? 'أدخل تفاصيل المبلغ المقبوض من العميل' 
              : 'أدخل تفاصيل المبلغ المدفوع للمورد'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Permission and validation alerts */}
        {!canCreatePayments && !permissionsLoading && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              ليس لديك صلاحية إنشاء الدفعات. السبب: {permissionReason || 'غير محدد'}
            </AlertDescription>
          </Alert>
        )}

        {!user?.profile?.company_id && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              لم يتم ربط حسابك بشركة. يرجى التواصل مع المشرف.
            </AlertDescription>
          </Alert>
        )}

        {debugInfo && import.meta.env.DEV && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <details>
                <summary>معلومات التشخيص (للمطورين)</summary>
                <pre className="text-xs mt-2 whitespace-pre-wrap">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>معلومات الدفعة</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_number">رقم الإيصال *</Label>
                <Input
                  id="payment_number"
                  value={paymentData.payment_number}
                  onChange={(e) => setPaymentData({...paymentData, payment_number: e.target.value})}
                  placeholder={type === 'receipt' ? "REC-2024-001" : "PAY-2024-001"}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_date">تاريخ الدفعة *</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={paymentData.payment_date}
                  onChange={(e) => setPaymentData({...paymentData, payment_date: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">المبلغ *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({...paymentData, amount: parseFloat(e.target.value) || 0})}
                  placeholder="0.000"
                  min="0"
                  step="0.001"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">العملة</Label>
                <Select value={paymentData.currency} onValueChange={(value) => setPaymentData({...paymentData, currency: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KWD">دينار كويتي (KWD)</SelectItem>
                    <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                    <SelectItem value="EUR">يورو (EUR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_id">الحساب المحاسبي</Label>
                <Select value={paymentData.account_id} onValueChange={(value) => setPaymentData({...paymentData, account_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحساب المحاسبي" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون حساب</SelectItem>
                    {entryAllowedAccounts?.filter(account => 
                      account.account_type === 'assets' || 
                      account.account_type === 'expenses' ||
                      account.account_type === 'liabilities'
                    )?.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{account.account_code} - {account.account_name}</span>
                          <AccountLevelBadge accountLevel={account.account_level} isHeader={false} />
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  يمكن اختيار الحسابات الفرعية فقط (المستوى 5 أو 6) للقيود المحاسبية
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost_center_id">مركز التكلفة</Label>
                <Select value={paymentData.cost_center_id} onValueChange={(value) => setPaymentData({...paymentData, cost_center_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر مركز التكلفة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون مركز تكلفة</SelectItem>
                    {costCenters?.filter(center => center.id && center.id.trim() !== '').map((center) => (
                      <SelectItem key={center.id} value={center.id}>
                        {center.center_name_ar || center.center_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_id">البنك</Label>
                <Select value={paymentData.bank_id} onValueChange={(value) => setPaymentData({...paymentData, bank_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر البنك" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون بنك</SelectItem>
                    {banks?.filter(bank => bank.id && bank.id.trim() !== '').map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.bank_name_ar || bank.bank_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method">طريقة الدفع *</Label>
                <Select value={paymentData.payment_method} onValueChange={(value) => setPaymentData({...paymentData, payment_method: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">نقداً</SelectItem>
                    <SelectItem value="check">شيك</SelectItem>
                    <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                    <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
                    <SelectItem value="debit_card">بطاقة خصم</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contract_id">العقد المرتبط (اختياري)</Label>
                <Select value={paymentData.contract_id} onValueChange={(value) => setPaymentData({...paymentData, contract_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر العقد" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون عقد</SelectItem>
                    {contracts?.map(contract => (
                      <SelectItem key={contract.id} value={contract.id}>
                        {contract.contract_number} - {contract.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference_number">رقم المرجع</Label>
                <Input
                  id="reference_number"
                  value={paymentData.reference_number}
                  onChange={(e) => setPaymentData({...paymentData, reference_number: e.target.value})}
                  placeholder="رقم المرجع أو التحويل"
                />
              </div>

              {paymentData.payment_method === 'check' && (
                <div className="space-y-2">
                  <Label htmlFor="check_number">رقم الشيك</Label>
                  <Input
                    id="check_number"
                    value={paymentData.check_number}
                    onChange={(e) => setPaymentData({...paymentData, check_number: e.target.value})}
                    placeholder="رقم الشيك"
                  />
                </div>
              )}

              {(paymentData.payment_method === 'bank_transfer' || paymentData.payment_method === 'check') && (
                <div className="space-y-2">
                  <Label htmlFor="bank_account">الحساب البنكي</Label>
                  <Input
                    id="bank_account"
                    value={paymentData.bank_account}
                    onChange={(e) => setPaymentData({...paymentData, bank_account: e.target.value})}
                    placeholder="رقم الحساب البنكي"
                  />
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">ملاحظات</Label>
                <Textarea
                  id="notes"
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                  placeholder="ملاحظات إضافية..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* معاينة القيد المحاسبي */}
          {showJournalPreview && journalPreview && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  معاينة القيد المحاسبي
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">رقم القيد:</span> {journalPreview.entry_number}
                    </div>
                    <div>
                      <span className="font-medium">تاريخ القيد:</span> {journalPreview.entry_date}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">البيان:</span> {journalPreview.description}
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse border border-border">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border border-border p-2 text-right">رقم الحساب</th>
                          <th className="border border-border p-2 text-right">اسم الحساب</th>
                          <th className="border border-border p-2 text-right">مركز التكلفة</th>
                          <th className="border border-border p-2 text-right">البيان</th>
                          <th className="border border-border p-2 text-right">مدين</th>
                          <th className="border border-border p-2 text-right">دائن</th>
                        </tr>
                      </thead>
                      <tbody>
                        {journalPreview.lines.map((line: any, index: number) => (
                          <tr key={index}>
                            <td className="border border-border p-2">{line.account_code}</td>
                            <td className="border border-border p-2">{line.account_name}</td>
                            <td className="border border-border p-2">{line.cost_center_name}</td>
                            <td className="border border-border p-2">{line.description}</td>
                            <td className="border border-border p-2 text-right">
                              {line.debit_amount > 0 && `${line.debit_amount.toFixed(3)} ${paymentData.currency}`}
                            </td>
                            <td className="border border-border p-2 text-right">
                              {line.credit_amount > 0 && `${line.credit_amount.toFixed(3)} ${paymentData.currency}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted font-medium">
                          <td colSpan={4} className="border border-border p-2 text-right">الإجمالي:</td>
                          <td className="border border-border p-2 text-right">
                            {journalPreview.total_amount.toFixed(3)} {paymentData.currency}
                          </td>
                          <td className="border border-border p-2 text-right">
                            {journalPreview.total_amount.toFixed(3)} {paymentData.currency}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={fillTestData}
                className="flex items-center gap-2"
              >
                <TestTube className="h-4 w-4" />
                بيانات تجريبية
              </Button>
              
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  if (showJournalPreview) {
                    setShowJournalPreview(false);
                  } else {
                    generateJournalPreview();
                  }
                }}
                disabled={isPreviewLoading || paymentData.amount <= 0}
                className="flex items-center gap-2"
              >
                {showJournalPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {isPreviewLoading ? "جاري التحضير..." : showJournalPreview ? "إخفاء المعاينة" : "معاينة القيد"}
              </Button>
            </div>
            
            <div className="flex space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "جاري الحفظ..." : "حفظ الإيصال"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}