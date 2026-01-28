/**
 * Employee Contracts List Component
 * قائمة عقود الموظف
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Phone, Eye, DollarSign } from 'lucide-react';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface EmployeeContractsListProps {
  contracts: any[];
  isLoading: boolean;
}

export const EmployeeContractsList: React.FC<EmployeeContractsListProps> = ({
  contracts,
  isLoading
}) => {
  const [search, setSearch] = useState('');
  const { formatCurrency } = useCurrencyFormatter();

  const filteredContracts = contracts.filter(contract =>
    contract.contract_number?.toLowerCase().includes(search.toLowerCase()) ||
    contract.customers?.first_name_ar?.toLowerCase().includes(search.toLowerCase()) ||
    contract.customers?.last_name_ar?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    expired: 'bg-red-100 text-red-800',
    suspended: 'bg-yellow-100 text-yellow-800'
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>📋 عقودي ({contracts.length})</CardTitle>
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="بحث بالاسم أو رقم العقد..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {filteredContracts.map((contract) => {
            const customerName = contract.customers?.customer_type === 'corporate'
              ? contract.customers?.company_name_ar
              : `${contract.customers?.first_name_ar || ''} ${contract.customers?.last_name_ar || ''}`;

            return (
              <div key={contract.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">عقد #{contract.contract_number}</h3>
                      <Badge className={statusColors[contract.status]}>
                        {contract.status === 'active' && 'نشط'}
                        {contract.status === 'expired' && 'منتهي'}
                        {contract.status === 'suspended' && 'موقوف'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{customerName}</p>
                    {contract.vehicles?.plate_number && (
                      <p className="text-xs text-gray-500">🚗 {contract.vehicles.plate_number}</p>
                    )}
                    <div className="flex gap-4 mt-2 text-sm">
                      <span>💰 {formatCurrency(contract.monthly_amount || 0)}/شهر</span>
                      {contract.balance_due > 0 && (
                        <span className="text-red-600 font-semibold">
                          متأخر: {formatCurrency(contract.balance_due)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm">
                      <Phone className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
