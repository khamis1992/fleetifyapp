import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Home, 
  ShoppingBag, 
  Building, 
  Warehouse, 
  MapPin,
  Sparkles,
  RotateCcw
} from 'lucide-react';

export interface SamplePropertyData {
  property_name: string;
  property_code: string;
  address: string;
  area: string;
  property_type: 'apartment' | 'villa' | 'office' | 'shop' | 'warehouse' | 'land';
  status: 'available' | 'rented' | 'sold' | 'maintenance' | 'reserved';
  condition_status: 'excellent' | 'very_good' | 'good' | 'fair' | 'poor';
  area_size: number;
  bedrooms: number;
  bathrooms: number;
  parking_spaces: number;
  is_furnished: boolean;
  has_elevator: boolean;
  has_garden: boolean;
  has_swimming_pool: boolean;
  sale_price?: number;
  rental_price?: number;
  description: string;
  latitude?: number;
  longitude?: number;
}

const sampleData: Record<string, SamplePropertyData> = {
  apartment: {
    property_name: 'شقة عائلية - السالمية',
    property_code: 'APT-001',
    address: 'شارع سالم المبارك، السالمية',
    area: 'السالمية',
    property_type: 'apartment',
    status: 'available',
    condition_status: 'very_good',
    area_size: 120,
    bedrooms: 3,
    bathrooms: 2,
    parking_spaces: 1,
    is_furnished: true,
    has_elevator: true,
    has_garden: false,
    has_swimming_pool: false,
    rental_price: 400,
    description: 'شقة عائلية واسعة في موقع ممتاز بالسالمية، مفروشة بالكامل مع إطلالة على البحر. تحتوي على 3 غرف نوم رئيسية و2 حمام ومطبخ مجهز وصالة واسعة.',
    latitude: 29.3375,
    longitude: 48.0758
  },
  villa: {
    property_name: 'فيلا فاخرة - الجابرية',
    property_code: 'VIL-001',
    address: 'منطقة الجابرية، قطعة 3',
    area: 'الجابرية',
    property_type: 'villa',
    status: 'available',
    condition_status: 'excellent',
    area_size: 350,
    bedrooms: 5,
    bathrooms: 4,
    parking_spaces: 3,
    is_furnished: false,
    has_elevator: false,
    has_garden: true,
    has_swimming_pool: true,
    rental_price: 1200,
    sale_price: 180000,
    description: 'فيلا فاخرة بتصميم عصري في الجابرية، تحتوي على 5 غرف نوم رئيسية و4 حمامات وصالات واسعة ومطبخ كبير وحديقة خاصة مع مسبح.',
    latitude: 29.3156,
    longitude: 47.9774
  },
  shop: {
    property_name: 'محل تجاري - شارع فهد السالم',
    property_code: 'SHP-001',
    address: 'شارع فهد السالم، العاصمة',
    area: 'العاصمة',
    property_type: 'shop',
    status: 'available',
    condition_status: 'good',
    area_size: 80,
    bedrooms: 0,
    bathrooms: 1,
    parking_spaces: 2,
    is_furnished: false,
    has_elevator: false,
    has_garden: false,
    has_swimming_pool: false,
    rental_price: 600,
    description: 'محل تجاري في موقع استراتيجي على شارع فهد السالم بواجهة زجاجية واسعة ومساحة مناسبة للأنشطة التجارية المختلفة.',
    latitude: 29.3759,
    longitude: 47.9774
  },
  office: {
    property_name: 'مكتب إداري - مدينة الكويت',
    property_code: 'OFF-001',
    address: 'برج التجارة، مدينة الكويت',
    area: 'مدينة الكويت',
    property_type: 'office',
    status: 'available',
    condition_status: 'excellent',
    area_size: 150,
    bedrooms: 0,
    bathrooms: 2,
    parking_spaces: 3,
    is_furnished: true,
    has_elevator: true,
    has_garden: false,
    has_swimming_pool: false,
    rental_price: 800,
    description: 'مكتب إداري فاخر في برج التجارة مع إطلالة بانورامية على المدينة، مجهز بالكامل بأثاث مكتبي عالي الجودة وقاعة اجتماعات.',
    latitude: 29.3759,
    longitude: 47.9774
  },
  warehouse: {
    property_name: 'مستودع صناعي - الشويخ',
    property_code: 'WH-001',
    address: 'المنطقة الصناعية، الشويخ',
    area: 'الشويخ',
    property_type: 'warehouse',
    status: 'available',
    condition_status: 'good',
    area_size: 500,
    bedrooms: 0,
    bathrooms: 2,
    parking_spaces: 5,
    is_furnished: false,
    has_elevator: false,
    has_garden: false,
    has_swimming_pool: false,
    rental_price: 1000,
    description: 'مستودع صناعي واسع في المنطقة الصناعية بالشويخ مع رافعة شوكية وبوابات واسعة لسهولة التحميل والتفريغ.',
    latitude: 29.3375,
    longitude: 47.9208
  },
  land: {
    property_name: 'أرض سكنية - صباح السالم',
    property_code: 'LND-001',
    address: 'صباح السالم، قطعة 5',
    area: 'صباح السالم',
    property_type: 'land',
    status: 'available',
    condition_status: 'good',
    area_size: 600,
    bedrooms: 0,
    bathrooms: 0,
    parking_spaces: 0,
    is_furnished: false,
    has_elevator: false,
    has_garden: false,
    has_swimming_pool: false,
    sale_price: 95000,
    description: 'قطعة أرض سكنية في موقع ممتاز بصباح السالم، مناسبة لبناء فيلا أو مجمع سكني، مع إمكانية الوصول لجميع الخدمات.',
    latitude: 29.2694,
    longitude: 48.0419
  }
};

interface SampleDataOptionsProps {
  onSelectSample: (data: SamplePropertyData) => void;
  onClearForm: () => void;
}

export const SampleDataOptions: React.FC<SampleDataOptionsProps> = ({ 
  onSelectSample, 
  onClearForm 
}) => {
  const sampleTypes = [
    { 
      key: 'apartment', 
      label: 'شقة عائلية', 
      icon: Building2, 
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      description: '3 غرف، مفروشة، السالمية'
    },
    { 
      key: 'villa', 
      label: 'فيلا فاخرة', 
      icon: Home, 
      color: 'bg-green-50 text-green-700 border-green-200',
      description: '5 غرف، حديقة ومسبح، الجابرية'
    },
    { 
      key: 'shop', 
      label: 'محل تجاري', 
      icon: ShoppingBag, 
      color: 'bg-purple-50 text-purple-700 border-purple-200',
      description: 'واجهة زجاجية، شارع فهد السالم'
    },
    { 
      key: 'office', 
      label: 'مكتب إداري', 
      icon: Building, 
      color: 'bg-orange-50 text-orange-700 border-orange-200',
      description: 'مجهز، برج التجارة، مدينة الكويت'
    },
    { 
      key: 'warehouse', 
      label: 'مستودع', 
      icon: Warehouse, 
      color: 'bg-gray-50 text-gray-700 border-gray-200',
      description: '500 م²، المنطقة الصناعية'
    },
    { 
      key: 'land', 
      label: 'أرض سكنية', 
      icon: MapPin, 
      color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      description: '600 م²، صباح السالم'
    }
  ];

  return (
    <Card className="mb-6 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">البيانات التجريبية السريعة</CardTitle>
          <Badge variant="secondary" className="mr-auto">توفير الوقت</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          اختر نوع العقار لتعبئة النموذج بالبيانات التجريبية وتسريع عملية الإنشاء
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {sampleTypes.map((type) => {
            const Icon = type.icon;
            return (
              <Button
                key={type.key}
                variant="outline"
                className={`h-auto p-4 flex flex-col items-start gap-2 hover:scale-105 transition-all ${type.color}`}
                onClick={() => onSelectSample(sampleData[type.key])}
              >
                <div className="flex items-center gap-2 w-full">
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{type.label}</span>
                </div>
                <p className="text-xs opacity-80 text-right w-full">
                  {type.description}
                </p>
              </Button>
            );
          })}
        </div>
        
        <div className="flex justify-center pt-2 border-t border-primary/10">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearForm}
            className="text-muted-foreground hover:text-destructive"
          >
            <RotateCcw className="h-4 w-4 ml-2" />
            مسح جميع البيانات
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};