import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ModuleLayout } from '@/modules/core/components/ModuleLayout';
import { PropertyForm } from '@/modules/properties/components';
import { useCreateProperty } from '@/modules/properties/hooks';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { Link, useNavigate } from 'react-router-dom';
import { Property } from '@/modules/properties/types';
import { SampleDataOptions, SamplePropertyData } from '@/components/properties/SampleDataOptions';
import { useState } from 'react';

export default function AddProperty() {
  const navigate = useNavigate();
  const companyAccess = useUnifiedCompanyAccess();
  const createProperty = useCreateProperty();
  const [sampleData, setSampleData] = useState<SamplePropertyData | null>(null);

  const handleSubmit = async (formData: any) => {
    if (!companyAccess?.user?.id || !companyAccess?.companyId) {
      console.error('Missing user or company information');
      return;
    }

    const propertyData = {
      company_id: companyAccess.companyId,
      created_by: companyAccess.user.id,
      property_code: formData.property_code,
      property_name: formData.property_name,
      property_type: formData.property_type,
      property_status: formData.status,
      address: formData.address,
      area_sqm: formData.area_size,
      bedrooms: formData.bedrooms,
      bathrooms: formData.bathrooms,
      parking_spaces: formData.parking_spaces,
      furnished: formData.is_furnished,
      rental_price: formData.rental_price,
      sale_price: formData.sale_price,
      description: formData.description,
      owner_id: formData.owner_id,
      location_coordinates: formData.latitude && formData.longitude ? {
        latitude: formData.latitude,
        longitude: formData.longitude
      } : null,
      features: {
        has_elevator: formData.has_elevator,
        has_garden: formData.has_garden,
        has_swimming_pool: formData.has_swimming_pool,
        condition_status: formData.condition_status,
        area: formData.area
      }
    };

    try {
      await createProperty.mutateAsync(propertyData);
      navigate('/properties');
    } catch (error) {
      console.error('Error creating property:', error);
    }
  };

  const handleSelectSample = (data: SamplePropertyData) => {
    setSampleData(data);
  };

  const handleClearForm = () => {
    setSampleData(null);
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

        <SampleDataOptions 
          onSelectSample={handleSelectSample}
          onClearForm={handleClearForm}
        />

        <Card>
          <CardHeader>
            <CardTitle>معلومات العقار</CardTitle>
          </CardHeader>
          <CardContent>
            <PropertyForm 
              onSubmit={handleSubmit}
              onCancel={() => navigate('/properties')}
              isLoading={createProperty.isPending}
              initialData={sampleData || undefined}
            />
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}