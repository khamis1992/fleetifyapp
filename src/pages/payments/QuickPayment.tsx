import { QuickPaymentRecording } from '@/components/payments/QuickPaymentRecording';

export default function QuickPayment() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">تسجيل دفعة</h1>
        <p className="text-muted-foreground">
          واجهة سريعة لتسجيل دفعات العملاء
        </p>
      </div>
      <QuickPaymentRecording />
    </div>
  );
}
