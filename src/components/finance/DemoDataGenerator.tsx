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
  contracts: number;
  vehicles: number;
  financialTransactions: number;
  bankAccounts: number;
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
                        companyData?.name === 'إدارة النظام' ||
                        companyData?.name_ar === 'System Administration' ||
                        companyData?.name?.toLowerCase().includes('system') ||
                        companyData?.name?.toLowerCase().includes('administration') ||
                        companyData?.name_ar?.includes('النظام') ||
                        companyData?.name_ar?.includes('إدارة');

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

  // بيانات المركبات الوهمية
  const demoVehicles = [
    { make: 'Toyota', model: 'Camry', year: 2023, license_plate: 'ABC-123', color: 'أبيض' },
    { make: 'Honda', model: 'Accord', year: 2022, license_plate: 'DEF-456', color: 'أسود' },
    { make: 'Nissan', model: 'Altima', year: 2023, license_plate: 'GHI-789', color: 'فضي' },
    { make: 'Hyundai', model: 'Elantra', year: 2022, license_plate: 'JKL-012', color: 'أزرق' },
    { make: 'Kia', model: 'Optima', year: 2023, license_plate: 'MNO-345', color: 'أحمر' },
    { make: 'Chevrolet', model: 'Malibu', year: 2022, license_plate: 'PQR-678', color: 'رمادي' },
    { make: 'Ford', model: 'Fusion', year: 2023, license_plate: 'STU-901', color: 'أبيض' },
    { make: 'Mazda', model: 'Mazda6', year: 2022, license_plate: 'VWX-234', color: 'أسود' }
  ];

  // بيانات الحسابات البنكية الوهمية
  const demoBankAccounts = [
    { bank_name: 'البنك الوطني الكويتي', account_number: '1234567890', currency: 'KWD', opening_balance: 50000 },
    { bank_name: 'بنك الخليج', account_number: '0987654321', currency: 'KWD', opening_balance: 30000 },
    { bank_name: 'بنك بوبيان', account_number: '1357924680', currency: 'KWD', opening_balance: 25000 },
    { bank_name: 'البنك التجاري الكويتي', account_number: '2468013579', currency: 'USD', opening_balance: 15000 }
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
                           companyData?.name === 'إدارة النظام' ||
                           companyData?.name_ar === 'System Administration' ||
                           companyData?.name?.toLowerCase().includes('system') ||
                           companyData?.name?.toLowerCase().includes('administration') ||
                           companyData?.name_ar?.includes('النظام') ||
                           companyData?.name_ar?.includes('إدارة');

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
      
      // التحقق من العملاء الموجودين
      const { data: existingCustomers, error: existingCustomersError } = await supabase
        .from('customers')
        .select('id, company_name')
        .eq('company_id', companyId);
      
      if (existingCustomersError) throw existingCustomersError;
      
      const existingCustomerNames = new Set(existingCustomers?.map(c => c.company_name) || []);
      const customerIds: string[] = [];
      
      // إضافة معرفات العملاء الموجودين
      existingCustomers?.forEach(customer => customerIds.push(customer.id));
      
      let newCustomersCount = 0;
      for (let i = 0; i < demoCustomers.length; i++) {
        const customer = demoCustomers[i];
        
        // تخطي العميل إذا كان موجوداً بالفعل
        if (existingCustomerNames.has(customer.name)) {
          continue;
        }
        
        const { data, error } = await supabase
          .from('customers')
          .insert({
            company_name: customer.name,
            company_name_ar: customer.name_ar,
            email: customer.email,
            phone: customer.phone,
            company_id: companyId,
            customer_type: 'corporate',
            is_active: true,
            credit_limit: 10000
          })
          .select('id')
          .single();
          
        if (error) throw error;
        if (data) {
          customerIds.push(data.id);
          newCustomersCount++;
        }
      }
      
      if (newCustomersCount === 0 && existingCustomers?.length > 0) {
        setCurrentStep(`تم تخطي العملاء (${existingCustomers.length} موجود بالفعل)`);
      } else {
        setCurrentStep(`تم إضافة ${newCustomersCount} عميل جديد`);
      }
      
      setProgress(20);

      // الخطوة 2: إضافة الموردين
      setCurrentStep('إضافة الموردين...');
      
      // التحقق من الموردين الموجودين
      const { data: existingVendors, error: existingVendorsError } = await supabase
        .from('vendors')
        .select('id, vendor_name, vendor_code')
        .eq('company_id', companyId);
      
      if (existingVendorsError) throw existingVendorsError;
      
      const existingVendorNames = new Set(existingVendors?.map(v => v.vendor_name) || []);
      const existingVendorCodes = new Set(existingVendors?.map(v => v.vendor_code) || []);
      const vendorIds: string[] = [];
      
      // إضافة معرفات الموردين الموجودين
      existingVendors?.forEach(vendor => vendorIds.push(vendor.id));
      
      let newVendorsCount = 0;
      for (let i = 0; i < demoVendors.length; i++) {
        const vendor = demoVendors[i];
        const vendorCode = `V${String(i + 1).padStart(3, '0')}`;
        
        // تخطي المورد إذا كان موجوداً بالفعل (بالاسم أو الكود)
        if (existingVendorNames.has(vendor.name) || existingVendorCodes.has(vendorCode)) {
          continue;
        }
        
        const { data, error } = await supabase
          .from('vendors')
          .insert({
            vendor_code: vendorCode,
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
        if (data) {
          vendorIds.push(data.id);
          newVendorsCount++;
        }
      }
      
      if (newVendorsCount === 0 && existingVendors?.length > 0) {
        setCurrentStep(`تم تخطي الموردين (${existingVendors.length} موجود بالفعل)`);
      } else {
        setCurrentStep(`تم إضافة ${newVendorsCount} مورد جديد`);
      }
      
      setProgress(40);

      // الخطوة 3: إضافة المركبات
      setCurrentStep('إضافة المركبات...');
      
      const { data: existingVehicles, error: existingVehiclesError } = await supabase
        .from('vehicles')
        .select('id, license_plate')
        .eq('company_id', companyId);
      
      if (existingVehiclesError) throw existingVehiclesError;
      
      const existingPlates = new Set(existingVehicles?.map(v => v.license_plate) || []);
      const vehicleIds: string[] = [];
      
      // إضافة معرفات المركبات الموجودة
      existingVehicles?.forEach(vehicle => vehicleIds.push(vehicle.id));
      
      let newVehiclesCount = 0;
      for (let i = 0; i < demoVehicles.length; i++) {
        const vehicle = demoVehicles[i];
        
        // تخطي المركبة إذا كانت موجودة بالفعل
        if (existingPlates.has(vehicle.license_plate)) {
          continue;
        }
        
        const { data, error } = await supabase
          .from('vehicles')
          .insert({
            company_id: companyId,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            license_plate: vehicle.license_plate,
            color: vehicle.color,
            status: 'available',
            is_active: true,
            fuel_type: 'gasoline',
            transmission: 'automatic',
            daily_rate: Math.floor(Math.random() * 50) + 20, // 20-70 د.ك يومياً
            weekly_rate: Math.floor(Math.random() * 300) + 120, // 120-420 د.ك أسبوعياً
            monthly_rate: Math.floor(Math.random() * 1000) + 400 // 400-1400 د.ك شهرياً
          })
          .select('id')
          .single();
          
        if (error) throw error;
        if (data) {
          vehicleIds.push(data.id);
          newVehiclesCount++;
        }
      }
      
      if (newVehiclesCount === 0 && existingVehicles?.length > 0) {
        setCurrentStep(`تم تخطي المركبات (${existingVehicles.length} موجود بالفعل)`);
      } else {
        setCurrentStep(`تم إضافة ${newVehiclesCount} مركبة جديدة`);
      }
      
      setProgress(50);

      // الخطوة 4: إضافة الحسابات البنكية
      setCurrentStep('إضافة الحسابات البنكية...');
      
      const { data: existingBankAccounts, error: existingBankError } = await supabase
        .from('bank_accounts')
        .select('id, account_number')
        .eq('company_id', companyId);
      
      if (existingBankError) throw existingBankError;
      
      const existingAccountNumbers = new Set(existingBankAccounts?.map(b => b.account_number) || []);
      const bankAccountIds: string[] = [];
      
      // إضافة معرفات الحسابات البنكية الموجودة
      existingBankAccounts?.forEach(account => bankAccountIds.push(account.id));
      
      let newBankAccountsCount = 0;
      for (let i = 0; i < demoBankAccounts.length; i++) {
        const bankAccount = demoBankAccounts[i];
        
        // تخطي الحساب إذا كان موجوداً بالفعل
        if (existingAccountNumbers.has(bankAccount.account_number)) {
          continue;
        }
        
        const { data, error } = await supabase
          .from('bank_accounts')
          .insert({
            company_id: companyId,
            bank_name: bankAccount.bank_name,
            account_number: bankAccount.account_number,
            currency: bankAccount.currency,
            opening_balance: bankAccount.opening_balance,
            current_balance: bankAccount.opening_balance,
            is_active: true,
            is_primary: i === 0 // الحساب الأول يعتبر رئيسي
          })
          .select('id')
          .single();
          
        if (error) throw error;
        if (data) {
          bankAccountIds.push(data.id);
          newBankAccountsCount++;
        }
      }
      
      if (newBankAccountsCount === 0 && existingBankAccounts?.length > 0) {
        setCurrentStep(`تم تخطي الحسابات البنكية (${existingBankAccounts.length} موجود بالفعل)`);
      } else {
        setCurrentStep(`تم إضافة ${newBankAccountsCount} حساب بنكي جديد`);
      }
      
      setProgress(60);

      // الخطوة 5: إضافة العقود
      setCurrentStep('إضافة عقود الايجار...');
      
      const contracts = [];
      const contractIds: string[] = [];
      
      // إنشاء عقود للعملاء والمركبات
      for (let i = 0; i < Math.min(customerIds.length, vehicleIds.length); i++) {
        const customerId = customerIds[i];
        const vehicleId = vehicleIds[i];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 30)); // آخر 30 يوم
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + Math.floor(Math.random() * 12) + 1); // 1-12 شهر
        
        const contractAmount = Math.floor(Math.random() * 8000) + 2000; // 2000-10000 د.ك
        const monthlyAmount = Math.floor(contractAmount / ((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
        
        const contract = {
          company_id: companyId,
          customer_id: customerId,
          vehicle_id: vehicleId,
          contract_number: `RENT-${String(i + 1).padStart(4, '0')}`,
          contract_type: 'rental',
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          contract_amount: contractAmount,
          monthly_amount: monthlyAmount,
          status: Math.random() > 0.2 ? 'active' : 'draft',
          description: `عقد ايجار رقم ${i + 1}`,
          terms: 'شروط واحكام العقد',
          created_at: new Date().toISOString()
        };
        
        contracts.push(contract);
      }
      
      if (contracts.length > 0) {
        const { data: contractData, error: contractError } = await supabase
          .from('contracts')
          .insert(contracts)
          .select('id');
          
        if (contractError) throw contractError;
        if (contractData) {
          contractData.forEach(contract => contractIds.push(contract.id));
        }
      }
      
      setProgress(70);

      // الخطوة 6: إضافة فواتير المبيعات
      setCurrentStep('إضافة فواتير المبيعات...');
      
      const salesInvoices = [];
      for (let i = 0; i < 15; i++) {
        const customerId = customerIds[Math.floor(Math.random() * customerIds.length)];
        const contractId = contractIds.length > 0 ? contractIds[Math.floor(Math.random() * contractIds.length)] : null;
        const amount = Math.floor(Math.random() * 5000) + 1000; // 1000-6000 د.ك
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 60)); // آخر 60 يوم
        
        salesInvoices.push({
          company_id: companyId,
          customer_id: customerId,
          contract_id: contractId,
          invoice_number: `INV-${String(i + 1).padStart(4, '0')}`,
          invoice_date: date.toISOString().split('T')[0],
          due_date: new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          subtotal: amount,
          tax_amount: amount * 0.05, // ضريبة 5%
          total_amount: amount * 1.05,
          status: Math.random() > 0.3 ? 'sent' : 'draft',
          invoice_type: 'sales',
          notes: `فاتورة مبيعات رقم ${i + 1}`,
          payment_status: Math.random() > 0.4 ? 'paid' : 'pending'
        });
      }
      
      const { error: salesError } = await supabase
        .from('invoices')
        .insert(salesInvoices);
        
      if (salesError) throw salesError;
      
      setProgress(80);

      // الخطوة 7: إضافة فواتير المشتريات
      setCurrentStep('إضافة فواتير المشتريات...');
      
      const purchaseInvoices = [];
      for (let i = 0; i < 12; i++) {
        const vendorId = vendorIds[Math.floor(Math.random() * vendorIds.length)];
        const amount = Math.floor(Math.random() * 3000) + 500; // 500-3500 د.ك
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 45));
        
        purchaseInvoices.push({
          company_id: companyId,
          vendor_id: vendorId,
          invoice_number: `PUR-${String(i + 1).padStart(4, '0')}`,
          invoice_date: date.toISOString().split('T')[0],
          due_date: new Date(date.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          subtotal: amount,
          tax_amount: 0, // بدون ضريبة على المشتريات
          total_amount: amount,
          status: Math.random() > 0.4 ? 'sent' : 'draft',
          invoice_type: 'purchase',
          notes: `فاتورة مشتريات رقم ${i + 1}`,
          payment_status: Math.random() > 0.5 ? 'paid' : 'pending'
        });
      }
      
      const { error: purchaseError } = await supabase
        .from('invoices')
        .insert(purchaseInvoices);
        
      if (purchaseError) throw purchaseError;
      
      setProgress(85);

      // الخطوة 8: إضافة معاملات مالية
      setCurrentStep('إضافة المعاملات المالية...');
      
      const financialTransactions = [];
      
      // معاملات إيداع
      for (let i = 0; i < 8; i++) {
        const bankAccountId = bankAccountIds[Math.floor(Math.random() * bankAccountIds.length)];
        const amount = Math.floor(Math.random() * 10000) + 1000;
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));
        
        financialTransactions.push({
          company_id: companyId,
          bank_account_id: bankAccountId,
          transaction_type: 'deposit',
          amount: amount,
          description: `إيداع نقدي رقم ${i + 1}`,
          reference_number: `DEP-${String(i + 1).padStart(4, '0')}`,
          transaction_date: date.toISOString().split('T')[0],
          status: 'completed',
          created_at: new Date().toISOString()
        });
      }
      
      // معاملات سحب
      for (let i = 0; i < 6; i++) {
        const bankAccountId = bankAccountIds[Math.floor(Math.random() * bankAccountIds.length)];
        const amount = Math.floor(Math.random() * 5000) + 500;
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 20));
        
        financialTransactions.push({
          company_id: companyId,
          bank_account_id: bankAccountId,
          transaction_type: 'withdrawal',
          amount: amount,
          description: `سحب نقدي رقم ${i + 1}`,
          reference_number: `WTH-${String(i + 1).padStart(4, '0')}`,
          transaction_date: date.toISOString().split('T')[0],
          status: 'completed',
          created_at: new Date().toISOString()
        });
      }
      
      // تحويلات بين الحسابات
      for (let i = 0; i < 4; i++) {
        const fromBankId = bankAccountIds[Math.floor(Math.random() * bankAccountIds.length)];
        let toBankId = bankAccountIds[Math.floor(Math.random() * bankAccountIds.length)];
        while (toBankId === fromBankId && bankAccountIds.length > 1) {
          toBankId = bankAccountIds[Math.floor(Math.random() * bankAccountIds.length)];
        }
        
        const amount = Math.floor(Math.random() * 3000) + 1000;
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 15));
        
        financialTransactions.push({
          company_id: companyId,
          bank_account_id: fromBankId,
          transaction_type: 'transfer_out',
          amount: amount,
          description: `تحويل صادر رقم ${i + 1}`,
          reference_number: `TRF-OUT-${String(i + 1).padStart(4, '0')}`,
          transaction_date: date.toISOString().split('T')[0],
          status: 'completed',
          created_at: new Date().toISOString()
        });
        
        financialTransactions.push({
          company_id: companyId,
          bank_account_id: toBankId,
          transaction_type: 'transfer_in',
          amount: amount,
          description: `تحويل وارد رقم ${i + 1}`,
          reference_number: `TRF-IN-${String(i + 1).padStart(4, '0')}`,
          transaction_date: date.toISOString().split('T')[0],
          status: 'completed',
          created_at: new Date().toISOString()
        });
      }
      
      if (financialTransactions.length > 0) {
        const { error: transactionError } = await supabase
          .from('financial_transactions')
          .insert(financialTransactions);
          
        if (transactionError) {
          console.log('تحذير: لم يتم إضافة المعاملات المالية (جدول غير موجود)');
        }
      }
      
      setProgress(90);

      // الخطوة 9: إضافة قيود محاسبية
      setCurrentStep('إضافة القيود المحاسبية...');
      
      // الحصول على حسابات الشركة
      const { data: accounts, error: accountsError } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name, account_type')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .limit(15);
        
      if (accountsError) throw accountsError;
      
      if (accounts && accounts.length > 0) {
        const journalEntries = [];
        for (let i = 0; i < 8; i++) {
          const date = new Date();
          date.setDate(date.getDate() - Math.floor(Math.random() * 20));
          
          journalEntries.push({
            company_id: companyId,
            entry_number: `JE-${String(i + 1).padStart(4, '0')}`,
            entry_date: date.toISOString().split('T')[0],
            description: `قيد محاسبي تجريبي رقم ${i + 1}`,
            total_debit: 1500 + (i * 750), // مبالغ متنوعة
            total_credit: 1500 + (i * 750),
            status: 'posted',
            reference_type: 'manual',
            reference_id: null,
            created_at: new Date().toISOString()
          });
        }
        
        const { error: journalError } = await supabase
          .from('journal_entries')
          .insert(journalEntries);
          
        if (journalError) throw journalError;
      }
      
      setProgress(95);

      // الخطوة 10: إضافة مدفوعات
      setCurrentStep('إضافة مدفوعات العملاء...');
      
      const payments = [];
      
      // مدفوعات نقدية
      for (let i = 0; i < 10; i++) {
        const customerId = customerIds[Math.floor(Math.random() * customerIds.length)];
        const amount = Math.floor(Math.random() * 2000) + 500;
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 25));
        
        payments.push({
          company_id: companyId,
          customer_id: customerId,
          payment_number: `PAY-${String(i + 1).padStart(4, '0')}`,
          payment_method: Math.random() > 0.5 ? 'cash' : 'bank_transfer',
          amount: amount,
          payment_date: date.toISOString().split('T')[0],
          status: 'completed',
          notes: `دفعة نقدية رقم ${i + 1}`,
          created_at: new Date().toISOString()
        });
      }
      
      if (payments.length > 0) {
        const { error: paymentsError } = await supabase
          .from('payments')
          .insert(payments);
          
        if (paymentsError) {
          console.log('تحذير: لم يتم إضافة المدفوعات (جدول غير موجود)');
        }
      }
      
      setProgress(100);
      setCurrentStep('تم إنشاء البيانات التجريبية بنجاح!');
      
      // حساب الإحصائيات
      const newStats: DemoDataStats = {
        customers: newCustomersCount + (existingCustomers?.length || 0),
        vendors: newVendorsCount + (existingVendors?.length || 0),
        vehicles: newVehiclesCount + (existingVehicles?.length || 0),
        bankAccounts: newBankAccountsCount + (existingBankAccounts?.length || 0),
        contracts: contracts.length,
        invoices: salesInvoices.length + purchaseInvoices.length,
        payments: payments.length,
        journalEntries: 8,
        transactions: 0,
        financialTransactions: financialTransactions.length
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
                           companyData?.name === 'إدارة النظام' ||
                           companyData?.name_ar === 'System Administration' ||
                           companyData?.name?.toLowerCase().includes('system') ||
                           companyData?.name?.toLowerCase().includes('administration') ||
                           companyData?.name_ar?.includes('النظام') ||
                           companyData?.name_ar?.includes('إدارة');

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
      
      // حذف المدفوعات أولاً
      await supabase.from('payments').delete().eq('company_id', companyId);
      
      // حذف المعاملات المالية
      try {
        await supabase.from('financial_transactions').delete().eq('company_id', companyId);
      } catch (error) {
        console.log('تحذير: لم يتم حذف المعاملات المالية (جدول غير موجود)');
      }
      
      // حذف القيود المحاسبية
      await supabase.from('journal_entries').delete().eq('company_id', companyId);
      
      // حذف الفواتير
      await supabase.from('invoices').delete().eq('company_id', companyId);
      
      // حذف العقود
      await supabase.from('contracts').delete().eq('company_id', companyId);
      
      // حذف المركبات
      await supabase.from('vehicles').delete().eq('company_id', companyId);
      
      // حذف الحسابات البنكية
      await supabase.from('bank_accounts').delete().eq('company_id', companyId);
      
      // حذف العملاء
      await supabase.from('customers').delete().eq('company_id', companyId);
      
      // حذف الموردين
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <p className="text-sm text-gray-600">العقود</p>
                <p className="font-bold text-teal-600">{stats.contracts}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-lg">
              <Database className="h-5 w-5 text-indigo-600" />
              <div>
                <p className="text-sm text-gray-600">المركبات</p>
                <p className="font-bold text-indigo-600">{stats.vehicles}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-cyan-50 rounded-lg">
              <CreditCard className="h-5 w-5 text-cyan-600" />
              <div>
                <p className="text-sm text-gray-600">حسابات بنكية</p>
                <p className="font-bold text-cyan-600">{stats.bankAccounts}</p>
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
            <li>• 8 مركبات متنوعة مع أسعار ايجار مختلفة</li>
            <li>• 4 حسابات بنكية مع أرصدة افتتاحية</li>
            <li>• عقود ايجار مربوطة بالعملاء والمركبات</li>
            <li>• 15 فاتورة مبيعات بمبالغ وتواريخ متنوعة</li>
            <li>• 12 فاتورة مشتريات من الموردين</li>
            <li>• 10 مدفوعات نقدية وبنكية</li>
            <li>• معاملات مالية متنوعة (إيداع، سحب، تحويلات)</li>
            <li>• 8 قيود محاسبية تجريبية</li>
            <li>• ربط تلقائي مع حسابات دليل الحسابات الموجودة</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
