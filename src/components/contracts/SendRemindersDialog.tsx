/**
 * Send Reminders Dialog Component
 * Allows manual sending of payment reminders to customers via WhatsApp
 */

import React, { useState, useMemo } from 'react';
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
import { 
  MessageSquare, 
  Send, 
  Clock, 
  Users, 
  CheckCircle, 
  AlertCircle,
  Info,
  Loader2
} from 'lucide-react';
import { useSendManualReminders } from '@/hooks/useSendManualReminders';
import { toast } from 'sonner';
import { sendBulkWhatsAppMessages, formatPhoneForWhatsApp, defaultTemplates } from '@/utils/whatsappWebSender';

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
  const [selectedType, setSelectedType] = useState<ReminderType>('general');
  const [selectedContracts, setSelectedContracts] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Helper function to get customer phone from contract
  const getCustomerPhone = (contract: Contract): string | undefined => {
    return contract.customer_phone || contract.customers?.phone;
  };

  // Helper function to check if contract is active
  const isActiveContract = (contract: Contract): boolean => {
    const status = contract.status?.toLowerCase();
    return status === 'active' || status === 'rented' || status === 'approved';
  };

  // Filter contracts with phone numbers and active status
  const eligibleContracts = useMemo(() => {
    const filtered = contracts.filter(c => {
      const phone = getCustomerPhone(c);
      const isActive = isActiveContract(c);
      return phone && phone.trim() !== '' && phone !== '000000000' && isActive;
    });

    // Log for debugging
    if (open && contracts.length > 0) {
      console.log('📋 [SendRemindersDialog] Contracts Analysis:', {
        totalContracts: contracts.length,
        eligibleContracts: filtered.length,
        sampleContract: contracts[0],
        sampleEligible: filtered[0],
      });
    }

    return filtered;
  }, [contracts, open]);

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
        customer_name: c.customer_name || 
          (c.customers?.customer_type === 'corporate'
            ? (c.customers?.company_name_ar || c.customers?.company_name)
            : `${c.customers?.first_name_ar || c.customers?.first_name || ''} ${c.customers?.last_name_ar || c.customers?.last_name || ''}`.trim()),
        monthly_rent: c.monthly_rent || c.monthly_amount,
      }));

    if (contractsToSend.length === 0) {
      toast.error('لا توجد عقود صالحة للإرسال');
      return;
    }

    console.log('📤 [SendRemindersDialog] Sending reminders via WhatsApp Web:', {
      count: contractsToSend.length,
      reminderType: selectedType,
      contracts: contractsToSend.map(c => ({
        id: c.id,
        contract_number: c.contract_number,
        customer_phone: c.customer_phone,
      })),
    });

    // Direct sending via WhatsApp Web (فوري - يعمل الآن!)
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
      const confirmMessage = `سيتم فتح ${messages.length} نافذة واتساب ويب.\n\nكل نافذة ستحتوي على رسالة جاهزة للإرسال.\nفقط اضغط "إرسال" في كل نافذة.\n\nهل تريد المتابعة؟`;
      
      if (!confirm(confirmMessage)) {
        setIsSending(false);
        return;
      }

      // Send messages
      toast.info('جاري فتح نوافذ واتساب ويب...', {
        description: `سيتم فتح ${messages.length} نافذة بفاصل 2 ثانية`,
      });

      const result = await sendBulkWhatsAppMessages(messages, 2000);

      toast.success(`تم فتح ${result.sent} نافذة واتساب بنجاح!`, {
        description: 'يرجى الضغط على "إرسال" في كل نافذة',
      });

      onOpenChange(false);
      setSelectedContracts([]);
      setCustomMessage('');
    } catch (error: any) {
      console.error('❌ [SendRemindersDialog] Error in direct send:', error);
      toast.error('حدث خطأ أثناء فتح واتساب: ' + error.message);
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
          {/* Send Method Selection */}
          <Alert className="border-green-200 bg-green-50">
            <Info className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              <strong>إرسال فوري عبر واتساب ويب:</strong> سيتم فتح نوافذ واتساب ويب مع الرسائل جاهزة. 
              فقط اضغط "إرسال" في كل نافذة. لا يحتاج إعدادات إضافية! ✅
            </AlertDescription>
          </Alert>

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <Users className="h-5 w-5 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{eligibleContracts.length}</div>
                  <div className="text-xs text-gray-600">عقود مؤهلة</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{selectedContracts.length}</div>
                  <div className="text-xs text-gray-600">محدد</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <MessageSquare className="h-5 w-5 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">
                    {eligibleContracts.length - selectedContracts.length}
                  </div>
                  <div className="text-xs text-gray-600">متبقي</div>
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
                      : 'hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedType(type.value)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-${type.color}-100 flex items-center justify-center flex-shrink-0`}>
                        <type.icon className={`h-5 w-5 text-${type.color}-600`} />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{type.label}</div>
                        <div className="text-sm text-gray-600">{type.description}</div>
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
              className="w-full min-h-[100px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              maxLength={1000}
            />
            <div className="text-xs text-gray-500 mt-1">
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

            {eligibleContracts.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  لا توجد عقود نشطة مع أرقام هواتف صحيحة
                </AlertDescription>
              </Alert>
            ) : (
              <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                {eligibleContracts.map((contract) => (
                  <div
                    key={contract.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 border-b last:border-b-0 cursor-pointer"
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
                      <div className="font-medium text-gray-900">{contract.contract_number}</div>
                      <div className="text-sm text-gray-600">
                        {contract.customer_name || 
                         (contract.customers?.customer_type === 'corporate'
                           ? (contract.customers?.company_name_ar || contract.customers?.company_name)
                           : `${contract.customers?.first_name_ar || contract.customers?.first_name || ''} ${contract.customers?.last_name_ar || contract.customers?.last_name || ''}`.trim()) ||
                         'غير محدد'}
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
                جاري فتح واتساب...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                إرسال عبر واتساب ويب ({selectedContracts.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendRemindersDialog;

