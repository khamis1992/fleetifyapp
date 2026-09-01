import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, FileText, Scale, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ContractWithoutSignedLease {
  id: string;
  contract_number: string;
  customer_id: string;
  vehicle_id: string | null;
  status: string;
  legal_status: string | null;
  balance_due: number | null;
  first_name_ar: string | null;
  last_name_ar: string | null;
  company_name_ar: string | null;
  national_id: string | null;
  phone: string | null;
  plate_number: string | null;
  make: string | null;
  model: string | null;
  case_number: string | null;
  case_status: string | null;
}

type UntypedViewQueryResult = {
  data: unknown[] | null;
  error: unknown;
};

const queryUntypedView = supabase.from as unknown as (
  relation: string,
) => {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      order: (
        column: string,
        options: { ascending: boolean },
      ) => Promise<UntypedViewQueryResult>;
    };
  };
};

export default function ContractsWithoutSignedLease() {
  const navigate = useNavigate();
  const { companyId } = useUnifiedCompanyAccess();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: contracts, isLoading, error } = useQuery({
    queryKey: ['legal-contracts-without-signed-lease', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await queryUntypedView('legal_contracts_without_signed_lease')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ContractWithoutSignedLease[];
    },
    enabled: !!companyId,
  });

  const filteredContracts = contracts?.filter((contract) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      contract.contract_number?.toLowerCase().includes(search) ||
      contract.first_name_ar?.toLowerCase().includes(search) ||
      contract.last_name_ar?.toLowerCase().includes(search) ||
      contract.company_name_ar?.toLowerCase().includes(search) ||
      contract.national_id?.toLowerCase().includes(search) ||
      contract.phone?.toLowerCase().includes(search) ||
      contract.plate_number?.toLowerCase().includes(search) ||
      contract.case_number?.toLowerCase().includes(search)
    );
  });

  const getCustomerName = (contract: ContractWithoutSignedLease) => {
    if (contract.company_name_ar) return contract.company_name_ar;
    if (contract.first_name_ar || contract.last_name_ar) {
      return `${contract.first_name_ar || ''} ${contract.last_name_ar || ''}`.trim();
    }
    return 'غير محدد';
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'under_legal_procedure':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const handleViewContract = (contractId: string) => {
    navigate(`/legal/lawsuit-preparation/${contractId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          حدث خطأ في تحميل البيانات: {(error as Error).message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-orange-500" />
                عقود تحت القانوني بلا عقد موقّع مطابق
              </CardTitle>
              <CardDescription>
                قائمة العقود في الإجراءات القانونية التي تفتقد إلى نسخة العقد الموقع
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {filteredContracts?.length || 0} عقد
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="بحث برقم العقد، اسم العميل، رقم اللوحة، رقم القضية..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          {filteredContracts && filteredContracts.length === 0 && (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                {searchTerm
                  ? 'لا توجد نتائج تطابق البحث'
                  : 'لا توجد عقود قانونية بدون عقد موقع. جميع العقود القانونية لديها عقود موقعة! ✅'}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4">
            {filteredContracts?.map((contract) => (
              <Card
                key={contract.id}
                className="border-r-4 border-r-orange-400 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleViewContract(contract.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="font-mono text-base">
                          {contract.contract_number}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={getStatusBadgeColor(contract.status)}
                        >
                          {contract.status === 'under_legal_procedure'
                            ? 'تحت الإجراء القانوني'
                            : contract.status}
                        </Badge>
                        {contract.legal_status && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700">
                            {contract.legal_status}
                          </Badge>
                        )}
                        {contract.case_number && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Scale className="h-3 w-3" />
                            {contract.case_number}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                        <div>
                          <span className="text-gray-500">العميل:</span>{' '}
                          <span className="font-medium">{getCustomerName(contract)}</span>
                        </div>
                        {contract.national_id && (
                          <div>
                            <span className="text-gray-500">الهوية:</span>{' '}
                            <span className="font-mono">{contract.national_id}</span>
                          </div>
                        )}
                        {contract.phone && (
                          <div>
                            <span className="text-gray-500">الهاتف:</span>{' '}
                            <span className="font-mono" dir="ltr">
                              {contract.phone}
                            </span>
                          </div>
                        )}
                        {contract.plate_number && (
                          <div>
                            <span className="text-gray-500">اللوحة:</span>{' '}
                            <span className="font-mono">{contract.plate_number}</span>
                          </div>
                        )}
                        {contract.make && contract.model && (
                          <div>
                            <span className="text-gray-500">المركبة:</span>{' '}
                            <span>
                              {contract.make} {contract.model}
                            </span>
                          </div>
                        )}
                        {contract.balance_due != null && (
                          <div>
                            <span className="text-gray-500">المتبقي:</span>{' '}
                            <span className="font-medium text-red-600">
                              {contract.balance_due.toLocaleString('ar-QA')} ر.ق
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                        <AlertTriangle className="h-3 w-3" />
                        <span>يجب رفع نسخة العقد الموقع قبل التحديث أو إعادة الرفع</span>
                      </div>
                    </div>

                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 ml-2" />
                      إعداد الحزمة
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
