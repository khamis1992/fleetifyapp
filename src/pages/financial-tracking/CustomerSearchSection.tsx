// @ts-nocheck
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Loader2 } from 'lucide-react';
import type { CustomerWithRental, CustomerVehicle } from '@/hooks/useRentalPayments';

interface CustomerSearchSectionProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  showDropdown: boolean;
  onShowDropdownChange: (show: boolean) => void;
  filteredCustomers: CustomerWithRental[];
  selectedCustomer: CustomerWithRental | null;
  loadingCustomers: boolean;
  onSelectCustomer: (customer: CustomerWithRental) => void;
  onCreateCustomerClick: (name: string) => void;
  editingCustomerName: boolean;
  editedCustomerName: string;
  onEditedCustomerNameChange: (name: string) => void;
  onEditCustomerName: () => void;
  onSaveCustomerName: () => void;
  onCancelEditName: () => void;
  isUpdatingName: boolean;
  editingMonthlyRent: boolean;
  newMonthlyRent: string;
  onNewMonthlyRentChange: (rent: string) => void;
  onEditMonthlyRent: () => void;
  onSaveMonthlyRent: () => void;
  onCancelEditRent: () => void;
  isUpdatingRent: boolean;
  loadingVehicles: boolean;
  customerVehicles: CustomerVehicle[];
  selectedVehicleId: string | null;
  onSelectedVehicleIdChange: (id: string) => void;
}

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const CustomerSearchSection: React.FC<CustomerSearchSectionProps> = ({
  searchTerm,
  onSearchTermChange,
  showDropdown,
  onShowDropdownChange,
  filteredCustomers,
  selectedCustomer,
  loadingCustomers,
  onSelectCustomer,
  onCreateCustomerClick,
  editingCustomerName,
  editedCustomerName,
  onEditedCustomerNameChange,
  onEditCustomerName,
  onSaveCustomerName,
  onCancelEditName,
  isUpdatingName,
  editingMonthlyRent,
  newMonthlyRent,
  onNewMonthlyRentChange,
  onEditMonthlyRent,
  onSaveMonthlyRent,
  onCancelEditRent,
  isUpdatingRent,
  loadingVehicles,
  customerVehicles,
  selectedVehicleId,
  onSelectedVehicleIdChange,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          البحث عن عميل
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <Input
            placeholder="ابحث عن عميل... (مثال: محمد)"
            value={searchTerm}
            onChange={(e) => {
              onSearchTermChange(e.target.value);
              onShowDropdownChange(true);
            }}
            onFocus={() => onShowDropdownChange(true)}
            className="text-lg"
            disabled={loadingCustomers}
          />
          
          {loadingCustomers && (
            <div className="absolute top-full left-0 right-0 mt-1 p-4 bg-white border rounded-md shadow-lg">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">جاري التحميل...</span>
              </div>
            </div>
          )}
          {showDropdown && searchTerm.trim() && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
                    onClick={() => onSelectCustomer(customer)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{customer.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {(customer?.monthly_rent || 0).toLocaleString('en-US')} ريال/شهر
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    لم يتم العثور على عميل باسم "{searchTerm}"
                  </p>
                  <Button
                    onClick={() => onCreateCustomerClick(searchTerm)}
                    className="w-full"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    إنشاء عميل جديد: {searchTerm}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {selectedCustomer && (
          <div className="mt-4 p-4 bg-primary/10 rounded-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">العميل المحدد</p>
                {editingCustomerName ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="text"
                      value={editedCustomerName}
                      onChange={(e) => onEditedCustomerNameChange(e.target.value)}
                      className="w-64 h-8 text-sm"
                      placeholder="اسم العميل..."
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={onSaveCustomerName}
                      disabled={isUpdatingName}
                      className="h-8"
                      title="حفظ"
                    >
                      {isUpdatingName ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        '✓'
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={onCancelEditName}
                      disabled={isUpdatingName}
                      className="h-8"
                      title="إلغاء"
                    >
                      ✕
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-lg sm:text-xl font-bold">{selectedCustomer.name}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={onEditCustomerName}
                      className="h-6 w-6 p-0"
                      title="تعديل اسم العميل"
                    >
                      <EditIcon />
                    </Button>
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">الإيجار الشهري</p>
                {editingMonthlyRent ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newMonthlyRent}
                      onChange={(e) => onNewMonthlyRentChange(e.target.value)}
                      className="w-32 h-8 text-sm"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={onSaveMonthlyRent}
                      disabled={isUpdatingRent}
                      className="h-8"
                    >
                      {isUpdatingRent ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        '✓'
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={onCancelEditRent}
                      disabled={isUpdatingRent}
                      className="h-8"
                    >
                      ✕
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-lg sm:text-xl font-bold text-primary">
                      {(selectedCustomer?.monthly_rent || 0).toLocaleString('en-US')} ريال
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={onEditMonthlyRent}
                      className="h-6 w-6 p-0"
                      title="تعديل الإيجار الشهري"
                    >
                      <EditIcon />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Vehicle Information */}
            {loadingVehicles ? (
              <div className="mt-3 flex items-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                جاري تحميل معلومات السيارة...
              </div>
            ) : customerVehicles.length > 0 ? (
              <div className="mt-4 pt-4 border-t border-primary/20">
                <p className="text-sm text-muted-foreground mb-2">
                  {customerVehicles.length === 1 ? 'السيارة المخصصة' : 'السيارات المخصصة'}
                </p>
                {customerVehicles.length === 1 ? (
                  <div className="flex items-center gap-2">
                    <div className="bg-white px-4 py-2 rounded-lg border border-primary/30">
                      <p className="text-sm font-semibold text-primary">
                        🚗 {customerVehicles[0].make} {customerVehicles[0].model}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {customerVehicles[0].plate_number} • {customerVehicles[0].year || 'N/A'} • {customerVehicles[0].color_ar || ''}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-orange-600 mb-2">
                      ⚠️ لدى هذا العميل {customerVehicles.length} سيارات - يجب تحديد السيارة عند إضافة دفعة
                    </p>
                    {customerVehicles.map((vehicle) => (
                      <div
                        key={vehicle.id}
                        className={`flex items-center justify-between gap-2 p-3 rounded-lg border transition-all cursor-pointer ${
                          selectedVehicleId === vehicle.id
                            ? 'bg-primary/10 border-primary'
                            : 'bg-white border-slate-200 hover:border-primary/50'
                        }`}
                        onClick={() => onSelectedVehicleIdChange(vehicle.id)}
                      >
                        <div>
                          <p className="text-sm font-semibold">
                            🚗 {vehicle.make} {vehicle.model}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {vehicle.plate_number} • {vehicle.year || 'N/A'} • {vehicle.color_ar || ''}
                          </p>
                        </div>
                        {selectedVehicleId === vehicle.id && (
                          <Badge className="bg-green-500">
                            <span className="mr-1">✓</span>
                            محدد
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-3 text-xs text-muted-foreground">
                ⚠️ لا توجد سيارة مخصصة لهذا العميل
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerSearchSection;
