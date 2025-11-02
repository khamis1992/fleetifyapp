/**
 * Send Reminders Dialog Component
 * Allows manual sending of payment reminders to customers via WhatsApp
 */

import React, { useState } from 'react';
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

interface Contract {
  id: string;
  contract_number: string;
  customer_name?: string;
  customer_phone?: string;
  monthly_rent?: number;
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
  
  const sendReminders = useSendManualReminders();

  // Filter contracts with phone numbers
  const eligibleContracts = contracts.filter(c => 
    c.customer_phone && c.status === 'active'
  );

  const handleSend = async () => {
    if (selectedContracts.length === 0) {
      toast.error('يرجى اختيار عقد واحد على الأقل');
      return;
    }

    const contractsToSend = eligibleContracts.filter(c => 
      selectedContracts.includes(c.id)
    );

    try {
      await sendReminders.mutateAsync({
        contracts: contractsToSend,
        reminderType: selectedType,
        customMessage: customMessage || undefined,
      });

      onOpenChange(false);
      setSelectedContracts([]);
      setCustomMessage('');
    } catch (error) {
      console.error('Error sending reminders:', error);
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
            إرسال تذكيرات دفع للعملاء عبر واتساب بشكل فوري
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Info Alert */}
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>ملاحظة:</strong> سيتم إرسال التذكيرات فوراً للعقود المحددة. 
              تأكد من أن أرقام الهواتف صحيحة قبل الإرسال.
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
                      <div className="text-sm text-gray-600">{contract.customer_name}</div>
                    </div>
                    <div className="text-left">
                      <Badge variant="outline" className="gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {contract.customer_phone}
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
            disabled={selectedContracts.length === 0 || sendReminders.isPending}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
          >
            {sendReminders.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                جاري الإرسال...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                إرسال ({selectedContracts.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendRemindersDialog;

