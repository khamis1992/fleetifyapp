import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Building, Crown, TrendingUp, Trash2 } from 'lucide-react';

interface OwnerFormData {
  full_name: string;
  full_name_ar: string;
  owner_code: string;
  civil_id: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  bank_name?: string;
  bank_account?: string;
  iban_number?: string;
  notes?: string;
}

// Sample property owner data
const sampleData: Record<string, OwnerFormData> = {
  local_owner: {
    full_name: "Khalid Saad Al-Mutairi",
    full_name_ar: "خالد سعد المطيري",
    owner_code: "OWN-001",
    civil_id: "123456789",
    phone: "99445566",
    email: "khalid.mutairi@example.com",
    address: "الفروانية، قطعة 2، شارع الكويت، بيت 45",
    city: "الفروانية",
    emergency_contact: "محمد المطيري",
    emergency_phone: "99778899",
    bank_name: "بنك الكويت الوطني",
    bank_account: "1234567890",
    iban_number: "KW12NBOK0000000001234567890",
    notes: "مالك محلي - يملك عدة عقارات سكنية"
  },
  resident_owner: {
    full_name: "Fatima Ahmed Al-Rashid",
    full_name_ar: "فاطمة أحمد الراشد",
    owner_code: "OWN-002",
    civil_id: "987654321",
    phone: "99332211",
    email: "fatima.rashid@example.com",
    address: "الجابرية، قطعة 5، شارع 20، فيلا 8",
    city: "الجابرية",
    emergency_contact: "أحمد الراشد",
    emergency_phone: "99665544",
    bank_name: "بنك الخليج",
    bank_account: "9876543210",
    iban_number: "KW12GULF0000000009876543210",
    notes: "مالكة مقيمة - تملك فيلا واحدة للإيجار"
  },
  company_owner: {
    full_name: "Modern Real Estate Company",
    full_name_ar: "شركة العقارات الحديثة",
    owner_code: "OWN-003",
    civil_id: "COM456789123",
    phone: "22557788",
    email: "info@modernrealestate.com.kw",
    address: "مدينة الكويت، المنطقة التجارية، برج التجارة، الطابق 8",
    city: "مدينة الكويت",
    emergency_contact: "عبدالله العتيبي",
    emergency_phone: "22998866",
    bank_name: "البنك التجاري الكويتي",
    bank_account: "5555666677",
    iban_number: "KW12CBK00000000005555666677",
    notes: "شركة تطوير عقاري - تملك مجمعات سكنية وتجارية"
  },
  investor_owner: {
    full_name: "Abdullah Mohammed Al-Saleh",
    full_name_ar: "عبدالله محمد الصالح",
    owner_code: "OWN-004",
    civil_id: "159753486",
    phone: "99112244",
    email: "abdullah.saleh@investment.com",
    address: "السالمية، قطعة 1، شارع الخليج العربي، فيلا 12",
    city: "السالمية",
    emergency_contact: "محمد الصالح",
    emergency_phone: "99887755",
    bank_name: "بيت التمويل الكويتي",
    bank_account: "7777888899",
    iban_number: "KW12KFH00000000007777888899",
    notes: "مستثمر عقاري - محفظة استثمارية متنوعة"
  }
};

// Sample data options with icons and descriptions
const sampleOptions = [
  {
    key: 'local_owner',
    icon: User,
    label: 'مالك محلي',
    description: 'مالك كويتي - عقارات متعددة',
    color: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
  },
  {
    key: 'resident_owner',
    icon: Crown,
    label: 'مالك مقيم',
    description: 'مالك مقيم - عقار واحد',
    color: 'bg-green-50 hover:bg-green-100 border-green-200'
  },
  {
    key: 'company_owner',
    icon: Building,
    label: 'شركة عقارية',
    description: 'شركة تطوير عقاري',
    color: 'bg-purple-50 hover:bg-purple-100 border-purple-200'
  },
  {
    key: 'investor_owner',
    icon: TrendingUp,
    label: 'مستثمر عقاري',
    description: 'مستثمر - محفظة متنوعة',
    color: 'bg-orange-50 hover:bg-orange-100 border-orange-200'
  }
];

interface PropertyOwnerSampleDataOptionsProps {
  onSelectSample: (data: OwnerFormData) => void;
  onClearForm: () => void;
}

export function PropertyOwnerSampleDataOptions({ onSelectSample, onClearForm }: PropertyOwnerSampleDataOptionsProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-primary">
          البيانات التجريبية السريعة للمالكين
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