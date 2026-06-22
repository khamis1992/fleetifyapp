import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Building2, UserCheck, Globe, Trash2 } from 'lucide-react';
import type { CreateTenantRequest } from '@/types/tenant';

// Sample tenant data
const sampleData: Record<string, CreateTenantRequest> = {
  individual_kuwaiti: {
    full_name: "Ahmed Mohammed Al-Ali",
    full_name_ar: "أحمد محمد العلي",
    tenant_type: "individual",
    phone: "99887766",
    email: "ahmed.ali@example.com",
    civil_id: "287654321",
    nationality: "Kuwaiti",
    date_of_birth: "1985-05-15",
    occupation: "مهندس مدني",
    employer_name: "وزارة الأشغال العامة",
    monthly_income: 800,
    current_address: "Jabriya, Block 4, Street 15, House 25",
    current_address_ar: "الجابرية، قطعة 4، شارع 15، منزل 25",
    emergency_contact_name: "Saad Al-Ali",
    emergency_contact_phone: "99112233",
    notes: "مستأجر نموذجي كويتي - موظف حكومي"
  },
  individual_expat: {
    full_name: "John Smith",
    full_name_ar: "جون سميث",
    tenant_type: "individual",
    phone: "99776655",
    email: "john.smith@example.com",
    passport_number: "A12345678",
    nationality: "American",
    date_of_birth: "1980-08-20",
    occupation: "Marketing Manager",
    employer_name: "Kuwait International Company",
    monthly_income: 1200,
    current_address: "Salmiya, Block 2, Street 5, Apartment 304",
    current_address_ar: "السالمية، قطعة 2، شارع 5، شقة 304",
    emergency_contact_name: "Sarah Smith",
    emergency_contact_phone: "99334455",
    notes: "مستأجر أجنبي - مدير تسويق في شركة دولية"
  },
  company_local: {
    full_name: "Gulf Trading Company",
    full_name_ar: "شركة الخليج للتجارة",
    tenant_type: "company",
    phone: "22445566",
    email: "info@gulftrading.com.kw",
    civil_id: "KWT123456789",
    nationality: "Kuwaiti",
    occupation: "تجارة عامة",
    employer_name: "شركة الخليج للتجارة",
    monthly_income: 2500,
    current_address: "Kuwait City, Commercial Area, Building 15, Floor 3",
    current_address_ar: "مدينة الكويت، المنطقة التجارية، مبنى 15، الطابق الثالث",
    emergency_contact_name: "Mohammed Al-Rashid",
    emergency_contact_phone: "22887799",
    notes: "شركة تجارية محلية - مستأجر موثوق"
  },
  company_international: {
    full_name: "Gulf International Co.",
    full_name_ar: "شركة الخليج الدولية",
    tenant_type: "company",
    phone: "22334455",
    email: "kuwait@gulfinternational.com",
    passport_number: "UAE987654321",
    nationality: "Emirati",
    occupation: "خدمات مالية",
    employer_name: "Gulf International Co.",
    monthly_income: 3500,
    current_address: "Kuwait City, Financial District, Tower A, Floor 12",
    current_address_ar: "مدينة الكويت، الحي المالي، برج أ، الطابق 12",
    emergency_contact_name: "Ahmad Al-Mansouri",
    emergency_contact_phone: "22998877",
    notes: "شركة دولية - فرع الكويت"
  }
};

// Sample data options with icons and descriptions
const sampleOptions = [
  {
    key: 'individual_kuwaiti',
    icon: User,
    label: 'مستأجر كويتي',
    description: 'فرد كويتي - موظف حكومي',
    color: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
  },
  {
    key: 'individual_expat',
    icon: Globe,
    label: 'مستأجر أجنبي',
    description: 'فرد أجنبي - موظف في القطاع الخاص',
    color: 'bg-green-50 hover:bg-green-100 border-green-200'
  },
  {
    key: 'company_local',
    icon: Building2,
    label: 'شركة محلية',
    description: 'شركة كويتية - تجارة عامة',
    color: 'bg-purple-50 hover:bg-purple-100 border-purple-200'
  },
  {
    key: 'company_international',
    icon: UserCheck,
    label: 'شركة دولية',
    description: 'شركة أجنبية - خدمات مالية',
    color: 'bg-orange-50 hover:bg-orange-100 border-orange-200'
  }
];

interface TenantSampleDataOptionsProps {
  onSelectSample: (data: CreateTenantRequest) => void;
  onClearForm: () => void;
}

export function TenantSampleDataOptions({ onSelectSample, onClearForm }: TenantSampleDataOptionsProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-primary">
          البيانات التجريبية السريعة للمستأجرين
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {sampleOptions.map((option) => {
            const IconComponent = option.icon;
            return (
              <Button
                key={option.key}
                variant="outline"
                onClick={() => onSelectSample(sampleData[option.key])}
                className={`h-auto p-4 flex flex-col items-center space-y-2 ${option.color} transition-all duration-200`}
              >
                <IconComponent className="h-8 w-8 text-primary" />
                <div className="text-center">
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {option.description}
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
        
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={onClearForm}
            className="flex items-center gap-2 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            مسح جميع البيانات
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}