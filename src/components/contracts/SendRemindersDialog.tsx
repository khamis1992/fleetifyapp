// @ts-nocheck
/**
 * Send Reminders Dialog Component
 * Allows manual sending of payment reminders to customers via WhatsApp
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCustomerName } from '@/utils/formatCustomerName';
import { 
  MessageSquare, 
  Send, 
  Clock, 
  Users, 
  CheckCircle, 
  AlertCircle,
  Info,
  Loader2,
  TestTube,
  Phone
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSendManualReminders } from '@/hooks/useSendManualReminders';
import { toast } from 'sonner';
import { 
  sendBulkWhatsAppMessages, 
  sendWhatsAppMessage,
  defaultTemplates
} from '@/utils/whatsappWebSender';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

interface Contract {
  id: string;
  contract_number: string;
  customer_name?: string;
  customer_phone?: string;
  customers?: {
    phone?: string;
    first_name_ar?: string;
    last_name_ar?: string;
    first_name?: string;
    last_name?: string;
    company_name_ar?: string;
    company_name?: string;
    customer_type?: string;
  };
  monthly_rent?: number;
  monthly_amount?: number;
  status?: string;
}

interface SendRemindersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contracts?: Contract[];
}

type ReminderType = 'pre_due' | 'due_date' | 'overdue' | 'escalation' | 'general';

const SendRemindersDialog: React.FC<SendRemindersDialogProps> = ({
  open,
  onOpenChange,
  contracts = [],
}) => {
  const { companyId } = useUnifiedCompanyAccess();
  const [selectedType, setSelectedType] = useState<ReminderType>('general');
  const [selectedContracts, setSelectedContracts] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [allActiveContracts, setAllActiveContracts] = useState<Contract[]>([]);
  const [isLoadingContracts, setIsLoadingContracts] = useState(false);
  
  // Test Mode States
  const [activeTab, setActiveTab] = useState<'send' | 'test'>('send');
  const [testPhone, setTestPhone] = useState('');
  const [testName, setTestName] = useState('عميل تجريبي');
  const [testContractNumber, setTestContractNumber] = useState('TEST-001');
  const [testAmount, setTestAmount] = useState('1000');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Fetch all active contracts with valid phone numbers when dialog opens
  useEffect(() => {
    if (open && companyId) {
      fetchAllActiveContracts();
    }
  }, [open, companyId]);

  const fetchAllActiveContracts = async () => {
    if (!companyId) return;
    
    setIsLoadingContracts(true);
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          monthly_amount,
          status,
          customer:customers!customer_id(
            id,
            first_name_ar,
            last_name_ar,
            first_name,
            last_name,
            company_name_ar,
            company_name,
            customer_type,
            phone
          )
        `)
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching contracts:', error);
        toast.error('فشل في جلب العقود');
        return;
      }

      console.log('📋 [SendRemindersDialog] Raw data from Supabase:', data?.length, data?.[0]);

      // Map to Contract interface
      const mappedContracts: Contract[] = (data || []).map((c: any) => ({
        id: c.id,
        contract_number: c.contract_number,
        customer_phone: c.customer?.phone,
        customers: c.customer,
        monthly_rent: c.monthly_amount || 0,
        monthly_amount: c.monthly_amount,
        status: c.status,
      }));

      setAllActiveContracts(mappedContracts);
      console.log('📋 [SendRemindersDialog] Loaded all active contracts:', mappedContracts.length);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoadingContracts(false);
    }
  };

  // Helper function to get customer phone from contract
  const getCustomerPhone = (contract: Contract): string | undefined => {
    return contract.customer_phone || contract.customers?.phone;
  };

  // Helper function to check if contract is active
  const isActiveContract = (contract: Contract): boolean => {
    const status = contract.status?.toLowerCase();
    return status === 'active' || status === 'rented' || status === 'approved';
  };

  // Use allActiveContracts if available, otherwise fallback to passed contracts
  const contractsToUse = useMemo(() => {
    return allActiveContracts.length > 0 ? allActiveContracts : contracts;
  }, [allActiveContracts, contracts]);

  // Filter contracts with phone numbers and active status
  const eligibleContracts = useMemo(() => {
    const filtered = contractsToUse.filter(c => {
      const phone = getCustomerPhone(c);
      const isActive = isActiveContract(c);
      return phone && phone.trim() !== '' && phone !== '000000000' && isActive;
    });

    // Log for debugging
    if (open) {
      console.log('📋 [SendRemindersDialog] Contracts Analysis:', {
        totalContractsToUse: contractsToUse.length,
        totalContractsPassed: contracts.length,
        totalAllActiveContracts: allActiveContracts.length,
        eligibleContracts: filtered.length,
        sampleContract: contractsToUse[0],
        sampleEligible: filtered[0],
      });
    }

    return filtered;
  }, [contractsToUse, open]);

  const handleSend = async () => {
    if (selectedContracts.length === 0) {
      toast.error('يرجى اختيار عقد واحد على الأقل');
      return;
    }

    const contractsToSend = eligibleContracts
      .filter(c => selectedContracts.includes(c.id))
      .map(c => ({
        ...c,
        customer_phone: getCustomerPhone(c) || '',
        customer_name: c.customer_name || formatCustomerName(c.customers),
        monthly_rent: c.monthly_rent || c.monthly_amount,
      }));

    if (contractsToSend.length === 0) {
      toast.error('لا توجد عقود صالحة للإرسال');
      return;
    }

    console.log('📤 [SendRemindersDialog] Sending reminders via Ultramsg API:', {
      count: contractsToSend.length,
      reminderType: selectedType,
      contracts: contractsToSend.map(c => ({
        id: c.id,
        contract_number: c.contract_number,
        customer_phone: c.customer_phone,
      })),
    });

    setIsSending(true);
    
    try {
      // Prepare messages
      const messages = contractsToSend.map(contract => {
        const customerName = contract.customer_name || 'عزيزي العميل';
        const contractNumber = contract.contract_number;
        
        // Generate message based on type
        let message = customMessage;
        
        if (!message) {
          switch (selectedType) {
            case 'general':
              message = defaultTemplates.general(customerName, contractNumber);
              break;
            case 'pre_due':
              message = defaultTemplates.pre_due(
                customerName,
                contractNumber,
                contract.monthly_rent || contract.monthly_amount || 0,
                'قريباً'
              );
              break;
            case 'due_date':
              message = defaultTemplates.due_date(
                customerName,
                contractNumber,
                contract.monthly_rent || contract.monthly_amount || 0
              );
              break;
            case 'overdue':
              message = defaultTemplates.overdue(
                customerName,
                contractNumber,
                contract.monthly_rent || contract.monthly_amount || 0
              );
              break;
            case 'escalation':
              message = defaultTemplates.escalation(
                customerName,
                contractNumber,
                contract.monthly_rent || contract.monthly_amount || 0
              );
              break;
            default:
              message = defaultTemplates.general(customerName, contractNumber);
          }
        }
        
        return {
          phone: contract.customer_phone,
          message,
          customerName,
        };
      });

      // Show confirmation
      const confirmMessage = `سيتم إرسال ${messages.length} رسالة عبر Ultramsg API.\n\nالرسائل ستُرسل تلقائياً بدون تدخل.\n\nهل تريد المتابعة؟`;
      
      if (!confirm(confirmMessage)) {
        setIsSending(false);
        return;
      }

      // Send messages via Ultramsg API
      toast.info('جاري إرسال الرسائل عبر Ultramsg...', {
        description: `سيتم إرسال ${messages.length} رسالة`,
      });

      const result = await sendBulkWhatsAppMessages(messages, 2000);

      if (result.sent > 0) {
        toast.success(`تم إرسال ${result.sent} رسالة بنجاح!`, {
          description: result.failed > 0 ? `فشل إرسال ${result.failed} رسالة` : undefined,
        });
      }

      if (result.failed > 0 && result.errors.length > 0) {
        console.error('❌ Failed messages:', result.errors);
        toast.error(`فشل إرسال ${result.failed} رسالة`, {
          description: result.errors[0],
        });
      }

      onOpenChange(false);
      setSelectedContracts([]);
      setCustomMessage('');
    } catch (error: any) {
      console.error('❌ [SendRemindersDialog] Error sending via Ultramsg:', error);
      toast.error('حدث خطأ أثناء الإرسال: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedContracts.length === eligibleContracts.length) {
      setSelectedContracts([]);
    } else {
      setSelectedContracts(eligibleContracts.map(c => c.id));
    }
  };

  // Handle Test Send
  const handleTestSend = async () => {
    if (!testPhone.trim()) {
      toast.error('يرجى إدخال رقم الهاتف للتجربة');
      return;
    }

    setIsSendingTest(true);

    try {
      // Generate test message
      let message = customMessage;
      
      if (!message) {
        switch (selectedType) {
          case 'general':
            message = defaultTemplates.general(testName, testContractNumber);
            break;
          case 'pre_due':
            message = defaultTemplates.pre_due(testName, testContractNumber, parseFloat(testAmount) || 1000, 'قريباً');
            break;
          case 'due_date':
            message = defaultTemplates.due_date(testName, testContractNumber, parseFloat(testAmount) || 1000);
            break;
          case 'overdue':
            message = defaultTemplates.overdue(testName, testContractNumber, parseFloat(testAmount) || 1000);
            break;
          case 'escalation':
            message = defaultTemplates.escalation(testName, testContractNumber, parseFloat(testAmount) || 1000);
            break;
          default:
            message = defaultTemplates.general(testName, testContractNumber);
        }
      }

      // Format phone number
      let phone = testPhone.replace(/\s+/g, '').replace(/-/g, '');
      if (!phone.startsWith('+')) {
        // Assume Qatar number if no country code
        if (!phone.startsWith('974')) {
          phone = '974' + phone;
        }
        phone = '+' + phone;
      }

      // Show confirmation
      const confirmMessage = `سيتم إرسال رسالة تجريبية عبر Ultramsg إلى:\n\nالرقم: ${phone}\nالاسم: ${testName}\n\nهل تريد المتابعة؟`;
      
      if (!confirm(confirmMessage)) {
        setIsSendingTest(false);
        return;
      }

      // Send via Ultramsg API
      toast.info('جاري إرسال الرسالة التجريبية...');
      
      const result = await sendWhatsAppMessage({
        phone: phone,
        message: message,
        customerName: testName,
      });

      if (result.success) {
        toast.success('تم إرسال الرسالة التجريبية بنجاح! ✅', {
          description: `تم الإرسال إلى ${phone}`,
        });
      } else {
        toast.error('فشل إرسال الرسالة', {
          description: result.error,
        });
      }

    } catch (error: any) {
      console.error('❌ [SendRemindersDialog] Error in test send:', error);
      toast.error('حدث خطأ أثناء الإرسال: ' + error.message);
    } finally {
      setIsSendingTest(false);
    }
  };

  const reminderTypes = [
    {
      value: 'general' as ReminderType,
      label: 'تذكير عام',
      description: 'رسالة تذكير عامة للعميل',
      icon: MessageSquare,
      color: 'blue',
    },
    {
      value: 'pre_due' as ReminderType,
      label: 'تذكير مسبق',
      description: 'تنبيه قبل موعد الاستحقاق',
      icon: Clock,
      color: 'green',
    },
    {
      value: 'due_date' as ReminderType,
      label: 'يوم الاستحقاق',
      description: 'تذكير بموعد الدفع',
      icon: AlertCircle,
      color: 'yellow',
    },
    {
      value: 'overdue' as ReminderType,
      label: 'متأخر',
      description: 'تنبيه بتأخر الدفع',
      icon: AlertCircle,
      color: 'orange',
    },
    {
      value: 'escalation' as ReminderType,
      label: 'إنذار نهائي',
      description: 'تحذير قبل الإجراءات القانونية',
      icon: AlertCircle,
      color: 'red',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <MessageSquare className="h-6 w-6 text-purple-600" />
            إرسال تنبيهات واتساب
          </DialogTitle>
          <DialogDescription>
            إرسال تذكيرات دفع للعملاء عبر واتساب
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Tabs for Send / Test */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'send' | 'test')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white border border-slate-200 p-1 rounded-xl h-auto mb-6">
              <TabsTrigger 
                value="send" 
                className="gap-2 data-[state=active]:bg-[#00A896] data-[state=active]:text-white rounded-lg py-2.5 transition-all"
              >
                <Send className="h-4 w-4" />
                إرسال للعملاء
              </TabsTrigger>
              <TabsTrigger 
                value="test" 
                className="gap-2 data-[state=active]:bg-[#00A896] data-[state=active]:text-white rounded-lg py-2.5 transition-all"
              >
                <TestTube className="h-4 w-4" />
                تجربة الإرسال
              </TabsTrigger>
            </TabsList>

            {/* Test Tab Content */}
            <TabsContent value="test" className="mt-4 space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <TestTube className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900">
                  <strong>وضع التجربة:</strong> أرسل رسالة تجريبية عبر Ultramsg API لأي رقم تختاره لاختبار النظام.
                </AlertDescription>
              </Alert>

              <Card className="border-2 border-dashed border-orange-300">
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="testPhone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        رقم الهاتف للتجربة *
                      </Label>
                      <Input
                        id="testPhone"
                        type="tel"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        placeholder="مثال: 55123456 أو +97455123456"
                        className="text-left"
                        dir="ltr"
                      />
                      <p className="text-xs text-muted-foreground">
                        أدخل رقمك الشخصي أو أي رقم للتجربة
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="testName">اسم المستلم (للرسالة)</Label>
                      <Input
                        id="testName"
                        value={testName}
                        onChange={(e) => setTestName(e.target.value)}
                        placeholder="اسم تجريبي"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="testContractNumber">رقم العقد (للرسالة)</Label>
                      <Input
                        id="testContractNumber"
                        value={testContractNumber}
                        onChange={(e) => setTestContractNumber(e.target.value)}
                        placeholder="TEST-001"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="testAmount">المبلغ (للرسالة)</Label>
                      <Input
                        id="testAmount"
                        type="number"
                        value={testAmount}
                        onChange={(e) => setTestAmount(e.target.value)}
                        placeholder="1000"
                      />
                    </div>
                  </div>

                  {/* Reminder Type Selection for Test */}
                  <div>
                    <Label className="mb-2 block">نوع الرسالة</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {reminderTypes.map((type) => (
                        <Button
                          key={type.value}
                          variant={selectedType === type.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedType(type.value)}
                          className="justify-start gap-2"
                        >
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Message for Test */}
                  <div>
                    <Label>رسالة مخصصة (اختياري)</Label>
                    <textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="اترك فارغاً لاستخدام القالب الافتراضي..."
                      className="w-full min-h-[80px] p-3 border border-slate-300 rounded-lg mt-2"
                      maxLength={1000}
                    />
                  </div>

                  <Button
                    onClick={handleTestSend}
                    disabled={!testPhone.trim() || isSendingTest}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                  >
                    {isSendingTest ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        جاري الإرسال عبر Ultramsg...
                      </>
                    ) : (
                      <>
                        <TestTube className="h-4 w-4 mr-2" />
                        إرسال رسالة تجريبية
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Send Tab Content */}
            <TabsContent value="send" className="mt-4 space-y-4">
              {/* Send Method Info */}
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900">
                  <strong>إرسال تلقائي عبر Ultramsg API:</strong> الرسائل ستُرسل تلقائياً بدون فتح نوافذ! ✅
                </AlertDescription>
              </Alert>

              {/* Statistics */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  {isLoadingContracts ? (
                    <Loader2 className="h-5 w-5 text-blue-600 mx-auto mb-2 animate-spin" />
                  ) : (
                    <Users className="h-5 w-5 text-blue-600 mx-auto mb-2" />
                  )}
                  <div className="text-2xl font-bold text-slate-900">
                    {isLoadingContracts ? '...' : eligibleContracts.length}
                  </div>
                  <div className="text-xs text-slate-600">عقود مؤهلة</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-slate-900">{selectedContracts.length}</div>
                  <div className="text-xs text-slate-600">محدد</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <MessageSquare className="h-5 w-5 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-slate-900">
                    {eligibleContracts.length - selectedContracts.length}
                  </div>
                  <div className="text-xs text-slate-600">متبقي</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Reminder Type Selection */}
          <div>
            <h3 className="font-semibold mb-3">نوع التذكير</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {reminderTypes.map((type) => (
                <Card
                  key={type.value}
                  className={`cursor-pointer transition-all ${
                    selectedType === type.value
                      ? 'border-purple-500 bg-purple-50'
                      : 'hover:border-slate-300'
                  }`}
                  onClick={() => setSelectedType(type.value)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-${type.color}-100 flex items-center justify-center flex-shrink-0`}>
                        <type.icon className={`h-5 w-5 text-${type.color}-600`} />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">{type.label}</div>
                        <div className="text-sm text-slate-600">{type.description}</div>
                      </div>
                      {selectedType === type.value && (
                        <CheckCircle className="h-5 w-5 text-purple-600" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Custom Message (Optional) */}
          <div>
            <label className="font-semibold mb-2 block">رسالة مخصصة (اختياري)</label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="أدخل رسالة مخصصة أو اترك فارغاً لاستخدام القالب الافتراضي..."
              className="w-full min-h-[100px] p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              maxLength={1000}
            />
            <div className="text-xs text-slate-500 mt-1">
              {customMessage.length}/1000 حرف
            </div>
          </div>

          {/* Contracts Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">اختر العقود ({eligibleContracts.length})</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
              >
                {selectedContracts.length === eligibleContracts.length ? 'إلغاء الكل' : 'تحديد الكل'}
              </Button>
            </div>

            {isLoadingContracts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                <span className="mr-3 text-slate-600">جاري تحميل العقود...</span>
              </div>
            ) : eligibleContracts.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  لا توجد عقود نشطة مع أرقام هواتف صحيحة.
                  {allActiveContracts.length > 0 && (
                    <span className="block mt-2 text-sm">
                      تم جلب {allActiveContracts.length} عقد نشط، لكن جميعهم لديهم أرقام هواتف غير صالحة أو مفقودة.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="border border-slate-200 rounded-lg max-h-64 overflow-y-auto">
                {eligibleContracts.map((contract) => (
                  <div
                    key={contract.id}
                    className="flex items-center gap-3 p-3 hover:bg-slate-50 border-b last:border-b-0 cursor-pointer"
                    onClick={() => {
                      if (selectedContracts.includes(contract.id)) {
                        setSelectedContracts(selectedContracts.filter(id => id !== contract.id));
                      } else {
                        setSelectedContracts([...selectedContracts, contract.id]);
                      }
                    }}
                  >
                    <Checkbox
                      checked={selectedContracts.includes(contract.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedContracts([...selectedContracts, contract.id]);
                        } else {
                          setSelectedContracts(selectedContracts.filter(id => id !== contract.id));
                        }
                      }}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">{contract.contract_number}</div>
                      <div className="text-sm text-slate-600">
                        {contract.customer_name || formatCustomerName(contract.customers)}
                      </div>
                    </div>
                    <div className="text-left">
                      <Badge variant="outline" className="gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {getCustomerPhone(contract) || 'لا يوجد رقم'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            onClick={handleSend}
            disabled={selectedContracts.length === 0 || isSending}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                جاري الإرسال عبر Ultramsg...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                إرسال عبر Ultramsg ({selectedContracts.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendRemindersDialog;

