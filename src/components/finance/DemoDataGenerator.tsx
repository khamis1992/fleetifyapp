import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Database, 
  Users, 
  Receipt, 
  CreditCard, 
  FileText, 
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

interface DemoDataStats {
  customers: number;
  vendors: number;
  invoices: number;
  payments: number;
  journalEntries: number;
  transactions: number;
}

export const DemoDataGenerator: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [stats, setStats] = useState<DemoDataStats | null>(null);
  const [isSystemCompany, setIsSystemCompany] = useState<boolean | null>(null);
  const [companyName, setCompanyName] = useState<string>('');
  const { toast } = useToast();
  const { companyId } = useUnifiedCompanyAccess();

  // التحقق من نوع الشركة عند تحميل المكون
  React.useEffect(() => {
    const checkCompanyType = async () => {
      if (!companyId) return;

      try {
        const { data: companyData, error } = await supabase
          .from('companies')
          .select('name, name_ar')
          .eq('id', companyId)
          .single();

        if (error) throw error;

        const isSystem = companyData?.name === 'System Company' || 
                        companyData?.name_ar === 'شركة النظام' ||
                        companyData?.name?.toLowerCase().includes('system') ||
                        companyData?.name_ar?.includes('النظام');

        setIsSystemCompany(isSystem);
        setCompanyName(companyData?.name_ar || companyData?.name || 'غير محدد');
      } catch (error) {
        console.error('خطأ في التحقق من نوع الشركة:', error);
        setIsSystemCompany(false);
      }
    };

    checkCompanyType();
  }, [companyId]);

  // بيانات العملاء الوهمية
  const demoCustomers = [
    { name: 'شركة الخليج للتجارة', name_ar: 'شركة الخليج للتجارة', email: 'gulf@example.com', phone: '+965 2222 3333' },
    { name: 'مؤسسة النور للمقاولات', name_ar: 'مؤسسة النور للمقاولات', email: 'noor@example.com', phone: '+965 2333 4444' },
    { name: 'شركة الفجر للاستثمار', name_ar: 'شركة الفجر للاستثمار', email: 'fajer@example.com', phone: '+965 2444 5555' },
    { name: 'مجموعة الصقر التجارية', name_ar: 'مجموعة الصقر التجارية', email: 'saqer@example.com', phone: '+965 2555 6666' },
    { name: 'شركة البحر الأزرق', name_ar: 'شركة البحر الأزرق', email: 'bluesea@example.com', phone: '+965 2666 7777' }
  ];

  // بيانات الموردين الوهمية
  const demoVendors = [
    { name: 'مورد الكهرباء والماء', name_ar: 'مورد الكهرباء والماء', email: 'utilities@mew.gov.kw', phone: '+965 181' },
    { name: 'شركة الاتصالات', name_ar: 'شركة الاتصالات', email: 'billing@stc.com.kw', phone: '+965 102' },
    { name: 'مورد المكتبية والقرطاسية', name_ar: 'مورد المكتبية والقرطاسية', email: 'office@supplies.com', phone: '+965 2777 8888' },
    { name: 'شركة الصيانة والتنظيف', name_ar: 'شركة الصيانة والتنظيف', email: 'maintenance@clean.com', phone: '+965 2888 9999' },
    { name: 'مورد الوقود والمحروقات', name_ar: 'مورد الوقود والمحروقات', email: 'fuel@knpc.com.kw', phone: '+965 2999 1111' }
  ];

  const generateDemoData = async () => {
    if (!companyId) {
      toast({
        title: "خطأ",
        description: "معرف الشركة غير متوفر",
        variant: "destructive"
      });
      return;
    }

    // التحقق من أن الشركة الحالية هي "شركة النظام"
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('name, name_ar')
      .eq('id', companyId)
      .single();

    if (companyError) {
      toast({
        title: "خطأ",
        description: "فشل في التحقق من بيانات الشركة",
        variant: "destructive"
      });
      return;
    }

    // التحقق من أن اسم الشركة هو "شركة النظام" أو "System Company"
    const isSystemCompany = companyData?.name === 'System Company' || 
                           companyData?.name_ar === 'شركة النظام' ||
                           companyData?.name?.toLowerCase().includes('system') ||
                           companyData?.name_ar?.includes('النظام');

    if (!isSystemCompany) {
      toast({
        title: "غير مسموح",
        description: "البيانات التجريبية متاحة فقط لشركة النظام",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    
    try {
      // الخطوة 1: إضافة العملاء
      setCurrentStep('إضافة العملاء...');
      setProgress(10);
      
      const customerIds: string[] = [];
      for (let i = 0; i < demoCustomers.length; i++) {
        const customer = demoCustomers[i];
        const { data, error } = await supabase
          .from('customers')
          .insert({
            customer_code: `C${String(i + 1).padStart(3, '0')}`,
            customer_name: customer.name,
            customer_name_ar: customer.name_ar,
            email: customer.email,
            phone: customer.phone,
            company_id: companyId,
            customer_type: 'corporate',
            is_active: true,
            current_balance: 0,
            credit_limit: 10000
          })
          .select('id')
          .single();
          
        if (error) throw error;
        if (data) customerIds.push(data.id);
      }
      
      setProgress(20);

      // الخطوة 2: إضافة الموردين
      setCurrentStep('إضافة الموردين...');
      
      const vendorIds: string[] = [];
      for (let i = 0; i < demoVendors.length; i++) {
        const vendor = demoVendors[i];
        const { data, error } = await supabase
          .from('vendors')
          .insert({
            vendor_code: `V${String(i + 1).padStart(3, '0')}`,
            vendor_name: vendor.name,
            vendor_name_ar: vendor.name_ar,
            email: vendor.email,
            phone: vendor.phone,
            company_id: companyId,
            is_active: true,
            current_balance: 0,
            payment_terms: 30
          })
          .select('id')
          .single();
          
        if (error) throw error;
        if (data) vendorIds.push(data.id);
      }
      
      setProgress(40);

      // الخطوة 3: إضافة فواتير المبيعات
      setCurrentStep('إضافة فواتير المبيعات...');
      
      const salesInvoices = [];
      for (let i = 0; i < 10; i++) {
        const customerId = customerIds[Math.floor(Math.random() * customerIds.length)];
        const amount = Math.floor(Math.random() * 5000) + 1000; // 1000-6000 د.ك
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 30)); // آخر 30 يوم
        
        salesInvoices.push({
          company_id: companyId,
          customer_id: customerId,
          invoice_number: `INV-${String(i + 1).padStart(4, '0')}`,
          invoice_date: date.toISOString().split('T')[0],
          due_date: new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          subtotal: amount,
          tax_amount: amount * 0.05, // ضريبة 5%
          total_amount: amount * 1.05,
          status: Math.random() > 0.3 ? 'paid' : 'pending',
          invoice_type: 'sales',
          notes: `فاتورة مبيعات رقم ${i + 1}`
        });
      }
      
      const { error: salesError } = await supabase
        .from('invoices')
        .insert(salesInvoices);
        
      if (salesError) throw salesError;
      
      setProgress(60);

      // الخطوة 4: إضافة فواتير المشتريات
      setCurrentStep('إضافة فواتير المشتريات...');
      
      const purchaseInvoices = [];
      for (let i = 0; i < 8; i++) {
        const vendorId = vendorIds[Math.floor(Math.random() * vendorIds.length)];
        const amount = Math.floor(Math.random() * 3000) + 500; // 500-3500 د.ك
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));
        
        purchaseInvoices.push({
          company_id: companyId,
          vendor_id: vendorId,
          invoice_number: `PUR-${String(i + 1).padStart(4, '0')}`,
          invoice_date: date.toISOString().split('T')[0],
          due_date: new Date(date.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          subtotal: amount,
          tax_amount: 0, // بدون ضريبة على المشتريات
          total_amount: amount,
          status: Math.random() > 0.4 ? 'paid' : 'pending',
          invoice_type: 'purchase',
          notes: `فاتورة مشتريات رقم ${i + 1}`
        });
      }
      
      const { error: purchaseError } = await supabase
        .from('invoices')
        .insert(purchaseInvoices);
        
      if (purchaseError) throw purchaseError;
      
      setProgress(80);

      // الخطوة 5: إضافة قيود محاسبية
      setCurrentStep('إضافة القيود المحاسبية...');
      
      // الحصول على حسابات الشركة
      const { data: accounts, error: accountsError } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name')
        .eq('company_id', companyId)
        .limit(10);
        
      if (accountsError) throw accountsError;
      
      if (accounts && accounts.length > 0) {
        const journalEntries = [];
        for (let i = 0; i < 5; i++) {
          const date = new Date();
          date.setDate(date.getDate() - Math.floor(Math.random() * 15));
          
          journalEntries.push({
            company_id: companyId,
            entry_number: `JE-${String(i + 1).padStart(4, '0')}`,
            entry_date: date.toISOString().split('T')[0],
            description: `قيد محاسبي تجريبي رقم ${i + 1}`,
            total_debit: 1000 + (i * 500),
            total_credit: 1000 + (i * 500),
            status: 'posted',
            reference_type: 'manual',
            reference_id: null
          });
        }
        
        const { error: journalError } = await supabase
          .from('journal_entries')
          .insert(journalEntries);
          
        if (journalError) throw journalError;
      }
      
      setProgress(100);
      setCurrentStep('تم إنشاء البيانات التجريبية بنجاح!');
      
      // حساب الإحصائيات
      const newStats: DemoDataStats = {
        customers: demoCustomers.length,
        vendors: demoVendors.length,
        invoices: salesInvoices.length + purchaseInvoices.length,
        payments: 0,
        journalEntries: 5,
        transactions: 0
      };
      
      setStats(newStats);
      
      toast({
        title: "تم بنجاح",
        description: "تم إنشاء البيانات التجريبية بنجاح",
      });
      
    } catch (error: any) {
      console.error('خطأ في إنشاء البيانات التجريبية:', error);
      toast({
        title: "خطأ",
        description: `فشل في إنشاء البيانات التجريبية: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const clearDemoData = async () => {
    if (!companyId) return;

    // التحقق من أن الشركة الحالية هي "شركة النظام"
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('name, name_ar')
      .eq('id', companyId)
      .single();

    if (companyError) {
      toast({
        title: "خطأ",
        description: "فشل في التحقق من بيانات الشركة",
        variant: "destructive"
      });
      return;
    }

    const isSystemCompany = companyData?.name === 'System Company' || 
                           companyData?.name_ar === 'شركة النظام' ||
                           companyData?.name?.toLowerCase().includes('system') ||
                           companyData?.name_ar?.includes('النظام');

    if (!isSystemCompany) {
      toast({
        title: "غير مسموح",
        description: "حذف البيانات التجريبية متاح فقط لشركة النظام",
        variant: "destructive"
      });
      return;
    }
    
    setIsGenerating(true);
    setCurrentStep('حذف البيانات التجريبية...');
    
    try {
      // حذف البيانات بالترتيب الصحيح (بسبب العلاقات الخارجية)
      await supabase.from('journal_entries').delete().eq('company_id', companyId);
      await supabase.from('invoices').delete().eq('company_id', companyId);
      await supabase.from('customers').delete().eq('company_id', companyId);
      await supabase.from('vendors').delete().eq('company_id', companyId);
      
      setStats(null);
      setProgress(0);
      setCurrentStep('');
      
      toast({
        title: "تم الحذف",
        description: "تم حذف جميع البيانات التجريبية",
      });
      
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: `فشل في حذف البيانات: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-6 w-6" />
          مولد البيانات التجريبية
        </CardTitle>
        <CardDescription>
          إضافة بيانات مالية وهمية لتجربة النظام واختبار الميزات
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* معلومات الشركة الحالية */}
        <div className={`p-4 rounded-lg border ${
          isSystemCompany === null ? 'bg-gray-50 border-gray-200' :
          isSystemCompany ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {isSystemCompany === null ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
            ) : isSystemCompany ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <span className="font-semibold">
              {isSystemCompany === null ? 'جاري التحقق...' :
               isSystemCompany ? 'مؤهل للبيانات التجريبية' : 'غير مؤهل للبيانات التجريبية'}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            الشركة الحالية: <strong>{companyName}</strong>
          </p>
          {isSystemCompany === false && (
            <p className="text-sm text-red-600 mt-2">
              البيانات التجريبية متاحة فقط لشركة النظام. يرجى التبديل إلى شركة النظام لاستخدام هذه الميزة.
            </p>
          )}
        </div>

        {/* الإحصائيات الحالية */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">العملاء</p>
                <p className="font-bold text-blue-600">{stats.customers}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">الموردين</p>
                <p className="font-bold text-green-600">{stats.vendors}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
              <Receipt className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">الفواتير</p>
                <p className="font-bold text-purple-600">{stats.invoices}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
              <CreditCard className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">المدفوعات</p>
                <p className="font-bold text-orange-600">{stats.payments}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
              <FileText className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">القيود</p>
                <p className="font-bold text-red-600">{stats.journalEntries}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-teal-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-teal-600" />
              <div>
                <p className="text-sm text-gray-600">المعاملات</p>
                <p className="font-bold text-teal-600">{stats.transactions}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* شريط التقدم */}
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">{currentStep}</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}
        
        {/* الأزرار */}
        <div className="flex gap-3">
          <Button 
            onClick={generateDemoData} 
            disabled={isGenerating || isSystemCompany === false || isSystemCompany === null}
            className="flex items-center gap-2"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            إنشاء بيانات تجريبية
          </Button>
          
          {stats && (
            <Button 
              onClick={clearDemoData} 
              disabled={isGenerating || isSystemCompany === false || isSystemCompany === null}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              حذف البيانات التجريبية
            </Button>
          )}
        </div>
        
        {/* معلومات إضافية */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            ما سيتم إنشاؤه:
          </h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 5 عملاء وهميين مع معلومات الاتصال</li>
            <li>• 5 موردين وهميين (كهرباء، اتصالات، مكتبية، صيانة، وقود)</li>
            <li>• 10 فواتير مبيعات بمبالغ وتواريخ متنوعة</li>
            <li>• 8 فواتير مشتريات من الموردين</li>
            <li>• 5 قيود محاسبية تجريبية</li>
            <li>• ربط تلقائي مع حسابات دليل الحسابات الموجودة</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
