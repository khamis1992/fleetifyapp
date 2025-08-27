import { CustomerAccountStatement } from '@/components/customers/CustomerAccountStatement';

export default function CustomerAccountStatementPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">كشوف حسابات العملاء</h1>
        <p className="text-muted-foreground mt-1">
          عرض وتصدير كشوف الحسابات التفصيلية للعملاء
        </p>
      </div>
      
      <CustomerAccountStatement />
    </div>
  );
}