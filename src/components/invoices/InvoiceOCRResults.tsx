import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ExtractedInvoiceData } from '@/types/invoiceOCR';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface InvoiceOCRResultsProps {
  data: ExtractedInvoiceData;
  confidence: number;
  imageUrl: string;
  onChange: (field: keyof ExtractedInvoiceData, value: any) => void;
}

export const InvoiceOCRResults = ({ 
  data, 
  confidence, 
  imageUrl,
  onChange 
}: InvoiceOCRResultsProps) => {
  const getConfidenceBadge = () => {
    if (confidence >= 80) {
      return (
        <Badge className="bg-green-500">
          <CheckCircle className="h-3 w-3 mr-1" />
          ثقة عالية ({confidence}%)
        </Badge>
      );
    } else if (confidence >= 50) {
      return (
        <Badge className="bg-yellow-500">
          <AlertCircle className="h-3 w-3 mr-1" />
          ثقة متوسطة ({confidence}%)
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-500">
          <XCircle className="h-3 w-3 mr-1" />
          ثقة منخفضة ({confidence}%)
        </Badge>
      );
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Image Preview */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">الصورة الأصلية</h3>
        <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden">
          <img
            src={imageUrl}
            alt="Invoice"
            className="w-full h-full object-contain"
          />
        </div>
      </Card>

      {/* Extracted Data */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">البيانات المستخرجة</h3>
          {getConfidenceBadge()}
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="invoice_number">رقم الفاتورة</Label>
            <Input
              id="invoice_number"
              value={data.invoice_number || ''}
              onChange={(e) => onChange('invoice_number', e.target.value)}
              placeholder="رقم الفاتورة"
            />
          </div>

          <div>
            <Label htmlFor="invoice_date">تاريخ الفاتورة</Label>
            <Input
              id="invoice_date"
              type="date"
              value={data.invoice_date || ''}
              onChange={(e) => onChange('invoice_date', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="customer_name">اسم العميل</Label>
            <Input
              id="customer_name"
              value={data.customer_name || ''}
              onChange={(e) => onChange('customer_name', e.target.value)}
              placeholder="اسم العميل"
            />
          </div>

          <div>
            <Label htmlFor="contract_number">رقم العقد</Label>
            <Input
              id="contract_number"
              value={data.contract_number || ''}
              onChange={(e) => onChange('contract_number', e.target.value)}
              placeholder="رقم العقد (إن وجد)"
            />
          </div>

          <div>
            <Label htmlFor="total_amount">المبلغ الإجمالي</Label>
            <Input
              id="total_amount"
              type="number"
              step="0.001"
              value={data.total_amount || ''}
              onChange={(e) => onChange('total_amount', parseFloat(e.target.value) || 0)}
              placeholder="0.000"
            />
          </div>

          <div>
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              value={data.notes || ''}
              onChange={(e) => onChange('notes', e.target.value)}
              placeholder="ملاحظات إضافية"
              rows={3}
            />
          </div>
        </div>
      </Card>
    </div>
  );
};
