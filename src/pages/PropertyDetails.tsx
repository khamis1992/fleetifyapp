import { ArrowLeft, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModuleLayout } from '@/modules/core/components/ModuleLayout';
import { PropertyDetailsView } from '@/modules/properties/components';
import { useProperty } from '@/modules/properties/hooks';
import { Link, useParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function PropertyDetails() {
  const { id } = useParams<{ id: string }>();
  const { data: property, isLoading, error } = useProperty(id);

  if (isLoading) {
    return (
      <ModuleLayout moduleName="properties">
        <div className="container mx-auto p-6">
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="h-9 w-32" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </ModuleLayout>
    );
  }

  if (error || !property) {
    return (
      <ModuleLayout moduleName="properties">
        <div className="container mx-auto p-6">
          <Alert variant="destructive">
            <AlertDescription>
              حدث خطأ في تحميل تفاصيل العقار أو أن العقار غير موجود.
            </AlertDescription>
          </Alert>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout moduleName="properties">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/properties">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                العودة للقائمة
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {property.property_name || `عقار ${property.property_code}`}
              </h1>
              <p className="text-muted-foreground mt-2">
                كود العقار: {property.property_code}
              </p>
            </div>
          </div>
          <Link to={`/properties/${id}/edit`}>
            <Button className="gap-2">
              <Edit className="h-4 w-4" />
              تعديل العقار
            </Button>
          </Link>
        </div>

        <PropertyDetailsView property={property} />
      </div>
    </ModuleLayout>
  );
}