import { useParams, useNavigate } from "react-router-dom";
import { useCustomerById } from "@/hooks/useEnhancedCustomers";
import { EditCustomerForm } from "@/components/customers/EditCustomerForm";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";

export default function EditCustomer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: customer, isLoading, error } = useCustomerById(id || '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">جاري تحميل بيانات العميل...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            حدث خطأ أثناء تحميل بيانات العميل. يرجى المحاولة مرة أخرى.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => navigate('/customers')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            العودة إلى قائمة العملاء
          </Button>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            العميل غير موجود أو لا تملك صلاحية للوصول إليه.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => navigate('/customers')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            العودة إلى قائمة العملاء
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button 
          onClick={() => navigate('/customers')} 
          variant="outline"
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          العودة إلى قائمة العملاء
        </Button>
      </div>

      <EditCustomerForm
        customer={customer}
        onSuccess={() => {
          navigate('/customers');
        }}
        onCancel={() => {
          navigate('/customers');
        }}
      />
    </div>
  );
}