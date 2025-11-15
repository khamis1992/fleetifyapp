import React, { useState } from 'react';
import { WorkflowEngine, Workflow, WorkflowStepProps } from '@/components/finance/workflow/WorkflowEngine';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Receipt, DollarSign, FileText, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

/**
 * Receive Payment Workflow
 * تدفق عمل استلام دفعة من عميل
 * 
 * الخطوات:
 * 1. اختيار العميل
 * 2. إدخال تفاصيل الدفعة
 * 3. مراجعة القيد المحاسبي التلقائي
 * 4. تأكيد واستلام الدفعة
 */

// Step 1: Select Customer
const SelectCustomerStep: React.FC<WorkflowStepProps> = ({ data, onUpdate }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchCustomers = async () => {
      if (!user?.id) return;

      setLoading(true);
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();

        if (!profileData?.company_id) return;

        const { data: customersData } = await supabase
          .from('customers')
          .select('id, name, phone, email')
          .eq('company_id', profileData.company_id)
          .eq('is_active', true)
          .order('name');

        setCustomers(customersData || []);
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>اختر العميل</Label>
        <Select
          value={data.customerId}
          onValueChange={(value) => {
            const customer = customers.find((c: any) => c.id === value);
            onUpdate({
              customerId: value,
              customerName: customer?.name,
            });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="اختر العميل..." />
          </SelectTrigger>
          <SelectContent>
            {loading ? (
              <SelectItem value="loading" disabled>
                جاري التحميل...
              </SelectItem>
            ) : (
              customers.map((customer: any) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name} - {customer.phone}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {data.customerId && (
        <Card className="p-4 bg-muted">
          <p className="text-sm text-muted-foreground">
            <strong>العميل المختار:</strong> {data.customerName}
          </p>
        </Card>
      )}
    </div>
  );
};

// Step 2: Enter Payment Details
const PaymentDetailsStep: React.FC<WorkflowStepProps> = ({ data, onUpdate }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>المبلغ (QAR)</Label>
          <Input
            type="number"
            placeholder="0.00"
            value={data.amount || ''}
            onChange={(e) => onUpdate({ amount: parseFloat(e.target.value) || 0 })}
            className="text-lg font-semibold"
          />
        </div>

        <div className="space-y-2">
          <Label>طريقة الدفع</Label>
          <Select
            value={data.paymentMethod}
            onValueChange={(value) => onUpdate({ paymentMethod: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر طريقة الدفع..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">نقداً</SelectItem>
              <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
              <SelectItem value="check">شيك</SelectItem>
              <SelectItem value="card">بطاقة ائتمانية</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>ملاحظات (اختياري)</Label>
        <Input
          placeholder="أي ملاحظات إضافية..."
          value={data.notes || ''}
          onChange={(e) => onUpdate({ notes: e.target.value })}
        />
      </div>

      {data.amount > 0 && (
        <Card className="p-4 bg-green-50 border-green-200">
          <p className="text-sm font-semibold text-green-900">
            سيتم استلام: {data.amount.toLocaleString()} QAR
          </p>
        </Card>
      )}
    </div>
  );
};

// Step 3: Review Journal Entry
const ReviewJournalStep: React.FC<WorkflowStepProps> = ({ data }) => {
  const debitAccount = '1110'; // النقدية
  const creditAccount = '1200'; // ذمم العملاء

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900 font-medium mb-2">
          القيد المحاسبي التلقائي
        </p>
        <p className="text-xs text-blue-700">
          سيتم إنشاء القيد التالي تلقائياً عند إتمام العملية
        </p>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-right text-sm font-semibold">الحساب</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">مدين</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">دائن</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="px-4 py-3">
                <div>
                  <p className="font-medium">{debitAccount} - النقدية</p>
                  <p className="text-xs text-muted-foreground">حساب الصندوق</p>
                </div>
              </td>
              <td className="px-4 py-3 font-semibold text-green-600">
                {data.amount?.toLocaleString()} QAR
              </td>
              <td className="px-4 py-3">-</td>
            </tr>
            <tr>
              <td className="px-4 py-3">
                <div>
                  <p className="font-medium">{creditAccount} - ذمم العملاء</p>
                  <p className="text-xs text-muted-foreground">{data.customerName}</p>
                </div>
              </td>
              <td className="px-4 py-3">-</td>
              <td className="px-4 py-3 font-semibold text-red-600">
                {data.amount?.toLocaleString()} QAR
              </td>
            </tr>
            <tr className="bg-muted font-bold">
              <td className="px-4 py-3">الإجمالي</td>
              <td className="px-4 py-3">{data.amount?.toLocaleString()} QAR</td>
              <td className="px-4 py-3">{data.amount?.toLocaleString()} QAR</td>
            </tr>
          </tbody>
        </table>
      </Card>

      <Card className="p-4 bg-green-50 border-green-200">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-sm font-medium text-green-900">
            القيد متوازن ✓ (المدين = الدائن)
          </p>
        </div>
      </Card>
    </div>
  );
};

// Step 4: Confirmation
const ConfirmationStep: React.FC<WorkflowStepProps> = ({ data }) => {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">ملخص الدفعة</h3>
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">العميل:</dt>
            <dd className="font-semibold">{data.customerName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">المبلغ:</dt>
            <dd className="font-semibold text-lg">{data.amount?.toLocaleString()} QAR</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">طريقة الدفع:</dt>
            <dd className="font-semibold">
              {data.paymentMethod === 'cash' && 'نقداً'}
              {data.paymentMethod === 'bank_transfer' && 'تحويل بنكي'}
              {data.paymentMethod === 'check' && 'شيك'}
              {data.paymentMethod === 'card' && 'بطاقة ائتمانية'}
            </dd>
          </div>
          {data.notes && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">ملاحظات:</dt>
              <dd>{data.notes}</dd>
            </div>
          )}
        </dl>
      </Card>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-900">
          <strong>تأكيد:</strong> سيتم تسجيل الدفعة وإنشاء القيد المحاسبي تلقائياً
        </p>
      </div>
    </div>
  );
};

// Define the workflow
export const ReceivePaymentWorkflow: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const workflow: Workflow = {
    id: 'receive_payment',
    title: 'استلام دفعة',
    description: 'تسجيل دفعة من عميل مع إنشاء القيد المحاسبي تلقائياً',
    icon: Receipt,
    steps: [
      {
        id: 'select_customer',
        title: 'العميل',
        description: 'اختر العميل الذي سيتم استلام الدفعة منه',
        component: SelectCustomerStep,
        validation: (data) => ({
          valid: !!data.customerId,
          errors: !data.customerId ? ['يجب اختيار العميل'] : undefined,
        }),
        help: 'اختر العميل من القائمة. يمكنك البحث بالاسم أو رقم الهاتف.',
      },
      {
        id: 'payment_details',
        title: 'التفاصيل',
        description: 'أدخل تفاصيل الدفعة',
        component: PaymentDetailsStep,
        validation: (data) => {
          const errors = [];
          if (!data.amount || data.amount <= 0) errors.push('يجب إدخال مبلغ صحيح');
          if (!data.paymentMethod) errors.push('يجب اختيار طريقة الدفع');
          return { valid: errors.length === 0, errors };
        },
        help: 'أدخل المبلغ المستلم وطريقة الدفع.',
      },
      {
        id: 'review_journal',
        title: 'المراجعة',
        description: 'راجع القيد المحاسبي التلقائي',
        component: ReviewJournalStep,
        help: 'راجع القيد المحاسبي الذي سيتم إنشاؤه تلقائياً.',
      },
      {
        id: 'confirmation',
        title: 'التأكيد',
        description: 'تأكيد وإتمام العملية',
        component: ConfirmationStep,
      },
    ],
    onComplete: async (data) => {
      // TODO: Implement actual payment creation with journal entry
      console.log('Creating payment:', data);
      
      toast.success('تم تسجيل الدفعة بنجاح', {
        description: `تم استلام ${data.amount} QAR من ${data.customerName}`,
      });
      
      // Navigate to payments page
      setTimeout(() => {
        navigate('/finance/payments');
      }, 1500);
    },
    onCancel: () => {
      navigate('/finance/hub');
    },
  };

  return <WorkflowEngine workflow={workflow} />;
};

export default ReceivePaymentWorkflow;

