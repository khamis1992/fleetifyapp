import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Search, Plus, User, Building2, Check, ChevronsUpDown } from 'lucide-react';
import { useTenants } from '@/hooks/useTenants';
import { useDebounce } from '@/hooks/useDebounce';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { TenantForm } from '@/modules/tenants/components/TenantForm';
import { cn } from '@/lib/utils';
import { Tenant } from '@/types/tenant';

interface TenantSelectorProps {
  value?: string;
  onValueChange: (tenantId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const TenantSelector: React.FC<TenantSelectorProps> = ({
  value,
  onValueChange,
  placeholder = "ابحث عن مستأجر أو أنشئ جديد...",
  disabled = false
}) => {
  const { companyId, browsedCompany, isBrowsingMode, isAuthenticating, authError } = useUnifiedCompanyAccess();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const [tenantFormOpen, setTenantFormOpen] = React.useState(false);
  
  // Use debounced search like the tenant page
  const debouncedSearch = useDebounce(searchValue, 300);
  const filters = { search: debouncedSearch };

  // Debug logging for company context
  console.log('🏢 [TenantSelector] Company context:', {
    companyId,
    isAuthenticating,
    authError,
    isBrowsingMode,
    browsedCompany: browsedCompany ? { id: browsedCompany.id, name: browsedCompany.name } : null,
    searchValue,
    selectedValue: value
  });

  // Show loading while authenticating
  if (isAuthenticating) {
    return (
      <div className="space-y-2">
        <Label>المستأجر *</Label>
        <div className="flex items-center justify-center p-4 border rounded-md">
          <LoadingSpinner />
          <span className="mr-2 text-sm text-muted-foreground">جاري تحميل بيانات المستخدم...</span>
        </div>
      </div>
    );
  }

  // Show error if no company ID available
  if (!companyId) {
    return (
      <div className="space-y-2">
        <Label>المستأجر *</Label>
        <div className="flex flex-col items-center justify-center p-4 border border-destructive/20 rounded-md bg-destructive/5">
          <div className="text-sm text-destructive font-medium">لا يمكن تحديد الشركة الحالية</div>
          <div className="text-xs text-muted-foreground mt-1">
            {authError || 'المستخدم غير مرتبط بأي شركة'}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()} 
            className="mt-2"
          >
            إعادة تحميل الصفحة
          </Button>
        </div>
      </div>
    );
  }

  // Use the useTenants hook for consistent behavior
  const { data: tenants, isLoading: tenantsLoading, isFetching: tenantsFetching, error: tenantsError } = useTenants(filters);
  
  const filteredTenants = tenants || [];

  console.log('🔍 [TenantSelector] Search results:', {
    searchValue,
    debouncedSearch,
    tenantsCount: filteredTenants.length,
    isLoading: tenantsLoading,
    isFetching: tenantsFetching,
    hasError: !!tenantsError
  });

  const selectedTenant = tenants?.find(tenant => tenant.id === value);

  const handleTenantSubmit = (tenantData: any) => {
    console.log('✅ [TenantSelector] Tenant data submitted:', tenantData);
    // Here we would normally call the create tenant mutation
    // For now, just close the form and handle the callback when the actual create happens
    setTenantFormOpen(false);
  };

  const getTenantDisplayName = (tenant: Tenant) => {
    return tenant.full_name || 'بدون اسم';
  };

  return (
    <>
      <div className="space-y-2">
        <Label>المستأجر *</Label>
        <div className="flex gap-2">
          {/* Tenant Search Selector */}
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={searchOpen}
                className="flex-1 justify-between h-auto min-h-[2.5rem] text-right"
                disabled={disabled}
              >
                {selectedTenant ? (
                  <div className="flex items-center gap-2">
                    {selectedTenant.tenant_type === 'individual' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Building2 className="h-4 w-4" />
                    )}
                    <div className="flex flex-col items-start">
                      <span className="font-medium">
                        {getTenantDisplayName(selectedTenant)}
                      </span>
                      {selectedTenant.phone && (
                        <span className="text-xs text-muted-foreground" dir="ltr">
                          {selectedTenant.phone}
                        </span>
                      )}
                    </div>
                     {selectedTenant.status === 'suspended' && (
                       <Badge variant="destructive" className="text-xs">معلق</Badge>
                     )}
                     {selectedTenant.status === 'inactive' && (
                       <Badge variant="secondary" className="text-xs">غير نشط</Badge>
                     )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">{placeholder}</span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 min-w-[400px]" align="start">
              <Command shouldFilter={false}>
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <CommandInput
                    placeholder="البحث بالاسم، الهاتف، أو البريد الإلكتروني..."
                    value={searchValue}
                    onValueChange={(value) => {
                      console.log('🔍 [TenantSelector] Search value changed:', value);
                      setSearchValue(value);
                    }}
                    className="flex h-11"
                  />
                </div>
                <CommandList className="max-h-[300px]">
                  {(tenantsLoading || tenantsFetching) ? (
                    <div className="flex items-center justify-center py-6">
                      <LoadingSpinner />
                      <span className="mr-2 text-sm text-muted-foreground">
                        {tenantsFetching ? 'جاري البحث...' : 'جاري تحميل المستأجرين...'}
                      </span>
                    </div>
                  ) : tenantsError ? (
                    <div className="flex items-center justify-center py-6 text-red-500">
                      <span className="text-sm">خطأ في تحميل المستأجرين: {tenantsError.message}</span>
                    </div>
                  ) : (
                    <>
                      <CommandEmpty>
                        <div className="py-6 text-center">
                          <p className="text-sm text-muted-foreground mb-2">
                            {searchValue ? `لا توجد نتائج للبحث "${searchValue}"` : 'لا يوجد مستأجرين'}
                          </p>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSearchOpen(false);
                              setTenantFormOpen(true);
                            }}
                            className="flex items-center gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            إنشاء مستأجر جديد
                          </Button>
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                         {filteredTenants.map((tenant) => {
                           const displayName = getTenantDisplayName(tenant);
                           const searchableValue = `${displayName} ${tenant.phone || ''} ${tenant.email || ''}`.toLowerCase();
                           
                           return (
                           <CommandItem
                             key={tenant.id}
                             value={searchableValue}
                             onSelect={() => {
                              onValueChange(tenant.id);
                              setSearchOpen(false);
                              setSearchValue("");
                            }}
                            disabled={tenant.status === 'suspended' || !tenant.is_active}
                            className="flex items-center justify-between py-2"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              {tenant.tenant_type === 'individual' ? (
                                <User className="h-4 w-4" />
                              ) : (
                                <Building2 className="h-4 w-4" />
                              )}
                              <div className="flex flex-col items-start flex-1">
                                <span className="font-medium">
                                  {getTenantDisplayName(tenant)}
                                </span>
                                <div className="flex gap-2 text-xs text-muted-foreground">
                                  {tenant.phone && <span dir="ltr">{tenant.phone}</span>}
                                  {tenant.email && <span>{tenant.email}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                               {tenant.status === 'suspended' && (
                                 <Badge variant="destructive" className="text-xs">معلق</Badge>
                               )}
                               {tenant.status === 'inactive' && (
                                 <Badge variant="secondary" className="text-xs">غير نشط</Badge>
                               )}
                              <Check
                                className={cn(
                                  "h-4 w-4",
                                  value === tenant.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </div>
                           </CommandItem>
                           );
                         })}
                      </CommandGroup>
                    </>
                  )}
                </CommandList>
                {!tenantsLoading && !tenantsFetching && !tenantsError && (
                  <div className="border-t p-2 text-xs text-muted-foreground text-center">
                    {filteredTenants.length} مستأجر
                    {debouncedSearch && ` للبحث "${debouncedSearch}"`}
                    {companyId && (
                      <span className="block text-[10px] opacity-70">
                        معرف الشركة: {companyId}
                      </span>
                    )}
                  </div>
                )}
              </Command>
            </PopoverContent>
          </Popover>

          {/* Add New Tenant Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTenantFormOpen(true)}
            disabled={disabled}
            className="flex items-center gap-2 px-3"
          >
            <Plus className="h-4 w-4" />
            مستأجر جديد
          </Button>
        </div>
      </div>

      {/* Tenant Creation Dialog */}
      <Dialog open={tenantFormOpen} onOpenChange={setTenantFormOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>إنشاء مستأجر جديد</DialogTitle>
          </DialogHeader>
          <TenantForm
            onSubmit={handleTenantSubmit}
            onCancel={() => setTenantFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};