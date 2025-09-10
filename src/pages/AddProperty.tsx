import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ModuleLayout } from '@/modules/core/components/ModuleLayout';
import { PropertyForm } from '@/modules/properties/components';
import { Link, useNavigate } from 'react-router-dom';
import { Property } from '@/modules/properties/types';

export default function AddProperty() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/properties');
  };

  return (
    <ModuleLayout moduleName="properties">
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/properties">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              العودة للقائمة
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">إضافة عقار جديد</h1>
            <p className="text-muted-foreground mt-2">
              أدخل تفاصيل العقار الجديد
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>معلومات العقار</CardTitle>
          </CardHeader>
          <CardContent>
            <PropertyForm 
              onSubmit={handleSuccess}
              onCancel={() => navigate('/properties')}
            />
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}