import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Loader2, AlertCircle, Car, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebounce } from "@/hooks/useDebounce";
import { useCurrentCompanyId } from "@/hooks/useUnifiedCompanyAccess";

export interface Vehicle {
  id: string;
  plate_number: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  status?: string;
  daily_rate?: number;
  weekly_rate?: number;
  monthly_rate?: number;
  minimum_rental_price?: number;
  enforce_minimum_price?: boolean;
  company_id?: string;
}

interface VehicleSelectorProps {
  vehicles?: Vehicle[] | null;
  selectedVehicleId?: string;
  excludeVehicleIds?: string[] | null;
  onSelect?: (vehicleId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  error?: string | null;
}

export function VehicleSelector({
  vehicles = [],
  selectedVehicleId = "",
  excludeVehicleIds = [],
  onSelect,
  placeholder = "اختر المركبة...",
  disabled = false,
  isLoading = false,
  error = null,
}: VehicleSelectorProps) {
  const currentCompanyId = useCurrentCompanyId();
  // إضافة تصفية إضافية للمركبات حسب الشركة الحالية للأمان
  const companyFilteredVehicles = vehicles?.filter(vehicle => {
    // التحقق من أن المركبة تنتمي للشركة الحالية
    const vehicleCompanyId = (vehicle as any)?.company_id;
    if (vehicleCompanyId && currentCompanyId && vehicleCompanyId !== currentCompanyId) {
      console.warn('⚠️ [VEHICLE_SELECTOR] مركبة من شركة مختلفة تم تصفيتها:', {
        vehicleId: vehicle.id,
        plateNumber: vehicle.plate_number,
        vehicleCompanyId,
        currentCompanyId
      });
      return false;
    }
    return true;
  }) || [];

  console.log('🔄 VehicleSelector تم تهيئته مع:', {
    originalVehiclesCount: vehicles?.length || 0,
    companyFilteredCount: companyFilteredVehicles.length,
    currentCompanyId,
    selectedVehicleId,
    excludeCount: excludeVehicleIds?.length || 0,
    isLoading,
    error,
    // إضافة تفاصيل المركبات للتحقق من الشركة
    sampleVehicles: companyFilteredVehicles?.slice(0, 3)?.map(v => ({ 
      id: v.id, 
      plate_number: v.plate_number,
      company_id: (v as any)?.company_id 
    })) || []
  });

  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [selectedMakeFilter, setSelectedMakeFilter] = useState<string>("all");
  const debouncedSearch = useDebounce(searchValue, 300);

  // استخراج قائمة الماركات المتاحة
  const availableMakes = useMemo(() => {
    const makes = new Set<string>();
    companyFilteredVehicles?.forEach(vehicle => {
      if (vehicle.make && vehicle.make.trim()) {
        makes.add(vehicle.make.trim());
      }
    });
    return Array.from(makes).sort();
  }, [companyFilteredVehicles]);

  try {
    // ULTRA-SAFE data processing - ABSOLUTE PROTECTION against undefined iteration
    const safeVehicles = (() => {
      try {
        console.log('🔍 معالجة بيانات المركبات...');
        
        // Handle null/undefined vehicles (استخدام المركبات المصفاة حسب الشركة)
        if (!companyFilteredVehicles) {
          console.warn('⚠️ companyFilteredVehicles is null/undefined');
          return [];
        }

        // Handle non-array vehicles  
        if (!Array.isArray(companyFilteredVehicles)) {
          console.warn('⚠️ companyFilteredVehicles is not an array:', typeof companyFilteredVehicles);
          return [];
        }

        // Filter and validate each vehicle
        const validVehicles = companyFilteredVehicles.filter(vehicle => {
          // Null check
          if (!vehicle) {
            console.warn('⚠️ Found null/undefined vehicle');
            return false;
          }
          
          // Type check
          if (typeof vehicle !== 'object') {
            console.warn('⚠️ Vehicle is not an object:', typeof vehicle);
            return false;
          }
          
          // Required fields check
          if (!vehicle.id || typeof vehicle.id !== 'string' || vehicle.id.length === 0) {
            console.warn('⚠️ Vehicle missing valid id:', vehicle.id);
            return false;
          }
          
          if (!vehicle.plate_number || typeof vehicle.plate_number !== 'string' || vehicle.plate_number.length === 0) {
            console.warn('⚠️ Vehicle missing valid plate_number:', vehicle.plate_number);
            return false;
          }
          
          return true;
        });

        console.log(`✅ تمت معالجة ${validVehicles.length} من ${vehicles.length} مركبة بنجاح`);
        return validVehicles;
      } catch (error) {
        console.error('💥 خطأ في معالجة المركبات:', error);
        return [];
      }
    })();

    // ULTRA-SAFE exclusion processing
    const safeExcludeIds = (() => {
      try {
        console.log('🔍 معالجة قائمة الاستثناءات...');
        
        // Handle null/undefined excludeVehicleIds
        if (!excludeVehicleIds) {
          console.log('✅ لا توجد استثناءات');
          return [];
        }

        // Handle non-array excludeVehicleIds
        if (!Array.isArray(excludeVehicleIds)) {
          console.warn('⚠️ excludeVehicleIds is not an array:', typeof excludeVehicleIds);
          return [];
        }

        // Filter and validate each exclude ID
        const validExcludeIds = excludeVehicleIds.filter(id => {
          if (!id) return false;
          if (typeof id !== 'string') {
            console.warn('⚠️ Invalid exclude ID type:', typeof id);
            return false;
          }
          if (id.length === 0) {
            console.warn('⚠️ Empty exclude ID');
            return false;
          }
          return true;
        });

        console.log(`✅ تمت معالجة ${validExcludeIds.length} معرف استثناء`);
        return validExcludeIds;
      } catch (error) {
        console.error('💥 خطأ في معالجة الاستثناءات:', error);
        return [];
      }
    })();

    // ULTRA-SAFE filtering with comprehensive protection
    const filteredVehicles = (() => {
      try {
        console.log('🔍 تطبيق الفلاتر...');
        
        // Ensure we have a valid array to work with
        if (!Array.isArray(safeVehicles)) {
          console.error('❌ safeVehicles is not an array:', safeVehicles);
          return [];
        }

        let result = [...safeVehicles]; // Create a safe copy

        // Apply exclusion filter
        if (Array.isArray(safeExcludeIds) && safeExcludeIds.length > 0) {
          result = result.filter(vehicle => {
            if (!vehicle || !vehicle.id) return false;
            return !safeExcludeIds.includes(vehicle.id);
          });
          console.log(`✅ تم استثناء ${safeExcludeIds.length} مركبة، المتبقي: ${result.length}`);
        }

        // Apply make filter
        if (selectedMakeFilter && selectedMakeFilter.trim().length > 0 && selectedMakeFilter !== 'all') {
          result = result.filter(vehicle => {
            if (!vehicle || !vehicle.make) return false;
            return vehicle.make.trim() === selectedMakeFilter.trim();
          });
          console.log(`✅ تطبيق فلتر الماركة "${selectedMakeFilter}"، النتائج: ${result.length}`);
        }

        // Apply search filter
        if (debouncedSearch && typeof debouncedSearch === 'string' && debouncedSearch.trim().length > 0) {
          const searchLower = debouncedSearch.toLowerCase().trim();
          result = result.filter(vehicle => {
            if (!vehicle) return false;
            
            const plateNumber = (vehicle.plate_number || '').toString().toLowerCase();
            const make = (vehicle.make || '').toString().toLowerCase();
            const model = (vehicle.model || '').toString().toLowerCase();
            const year = (vehicle.year || '').toString().toLowerCase();
            
            return (
              plateNumber.includes(searchLower) ||
              make.includes(searchLower) ||
              model.includes(searchLower) ||
              year.includes(searchLower)
            );
          });
          console.log(`✅ تطبيق البحث "${searchLower}"، النتائج: ${result.length}`);
        }

        // Final safety check - ensure result is always an array
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.error('💥 خطأ في الفلترة:', error);
        return [];
      }
    })();

    // Safe selected vehicle finding
    const selectedVehicle = (() => {
      try {
        if (!selectedVehicleId || typeof selectedVehicleId !== 'string') return null;
        return safeVehicles.find(v => v && v.id === selectedVehicleId) || null;
      } catch (error) {
        console.error('💥 خطأ في العثور على المركبة المحددة:', error);
        return null;
      }
    })();

    // Safe display text function
    const getVehicleDisplayText = (vehicle: Vehicle) => {
      try {
        if (!vehicle) return 'غير محدد';
        const plateNumber = vehicle.plate_number || 'غير محدد';
        const make = vehicle.make || '';
        const model = vehicle.model || '';
        const year = vehicle.year || '';
        return `${plateNumber} - ${make} ${model} (${year})`.trim();
      } catch (error) {
        console.error('💥 خطأ في تكوين نص العرض:', error);
        return 'خطأ في البيانات';
      }
    };

    // Loading state
    if (isLoading) {
      return (
        <Button
          variant="outline"
          className="w-full justify-between"
          disabled
        >
          <span className="flex items-center">
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            جاري تحميل المركبات...
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      );
    }

    // Error state  
    if (error && typeof error === 'string' && error.length > 0) {
      return (
        <Button
          variant="outline"
          className="w-full justify-between text-red-600 border-red-300"
          disabled
        >
          <span className="flex items-center">
            <AlertCircle className="ml-2 h-4 w-4" />
            {error}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      );
    }

    // Main component render with ABSOLUTE SAFETY
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled || (Array.isArray(safeVehicles) && safeVehicles.length === 0)}
          >
            {selectedVehicle ? 
              getVehicleDisplayText(selectedVehicle) : 
              (Array.isArray(safeVehicles) && safeVehicles.length === 0) ? 
                "لا توجد مركبات متاحة" : 
                placeholder
            }
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          {/* CRITICAL: Only render Command when absolutely safe */}
          {(() => {
            try {
              // Triple-check all data before Command render
              const isDataSafe = (
                Array.isArray(filteredVehicles) &&
                typeof searchValue === 'string' &&
                Array.isArray(safeVehicles) &&
                Array.isArray(safeExcludeIds)
              );

              if (!isDataSafe) {
                console.error('❌ البيانات غير آمنة للعرض');
                return (
                  <div className="p-4 text-center text-red-600">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>خطأ في تحضير البيانات</p>
                  </div>
                );
              }

              return (
                <div className="w-full">
                  {/* فلتر الماركة */}
                  <div className="p-3 border-b">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">فلترة حسب الماركة</span>
                      </div>
                      {selectedMakeFilter && selectedMakeFilter !== 'all' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => setSelectedMakeFilter("all")}
                        >
                          مسح الفلتر
                        </Button>
                      )}
                    </div>
                    <Select value={selectedMakeFilter} onValueChange={setSelectedMakeFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="جميع الماركات" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الماركات</SelectItem>
                        {availableMakes.map((make) => (
                          <SelectItem key={make} value={make}>
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4" />
                              {make}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedMakeFilter && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        عرض مركبات {selectedMakeFilter} فقط
                      </div>
                    )}
                  </div>

                  <Command 
                    shouldFilter={false}
                    value={selectedVehicleId || ''}
                    onValueChange={() => {}} // Controlled externally
                  >
                    <CommandInput 
                      placeholder="البحث بواسطة رقم اللوحة، الماركة، أو الموديل..." 
                      value={searchValue || ''}
                      onValueChange={(value) => {
                        try {
                          console.log('🔍 تغيير نص البحث:', value);
                          setSearchValue(typeof value === 'string' ? value : '');
                        } catch (error) {
                          console.error('💥 خطأ في تحديث البحث:', error);
                        }
                      }}
                    />
                    <CommandList>
                    <CommandEmpty>
                      {Array.isArray(safeVehicles) && safeVehicles.length === 0 
                        ? "لا توجد مركبات متاحة في النظام" 
                        : "لم يتم العثور على مركبات مطابقة"
                      }
                    </CommandEmpty>
                    <CommandGroup className="max-h-[200px] overflow-auto">
                      {(() => {
                        try {
                          console.log('🔄 عرض قائمة المركبات:', filteredVehicles.length);
                          
                          // Final safety check
                          if (!Array.isArray(filteredVehicles)) {
                            console.error('❌ filteredVehicles ليس مصفوفة');
                            return (
                              <div className="p-4 text-center text-red-600">
                                خطأ في بيانات المركبات
                              </div>
                            );
                          }

                          if (filteredVehicles.length === 0) {
                            return (
                              <div className="p-4 text-center text-muted-foreground">
                                لا توجد مركبات متاحة للاختيار
                              </div>
                            );
                          }

                          // Map vehicles with ultimate safety
                          const vehicleItems = filteredVehicles
                            .map((vehicle, index) => {
                              // Vehicle safety check
                              if (!vehicle || typeof vehicle !== 'object') {
                                console.warn('⚠️ مركبة غير صالحة:', vehicle);
                                return null;
                              }
                              
                              if (!vehicle.id || typeof vehicle.id !== 'string' || vehicle.id.length === 0) {
                                console.warn('⚠️ مركبة بدون معرف صالح:', vehicle);
                                return null;
                              }

                              try {
                                return (
                                  <CommandItem
                                    key={`vehicle-${vehicle.id}-${index}`}
                                    value={vehicle.id}
                                    onSelect={(currentValue) => {
                                      try {
                                        console.log('🎯 تم اختيار المركبة:', currentValue);
                                        
                                        if (!currentValue || typeof currentValue !== 'string') {
                                          console.error('❌ قيمة غير صالحة:', currentValue);
                                          return;
                                        }

                                        if (typeof onSelect === 'function') {
                                          onSelect(currentValue);
                                          setOpen(false);
                                          setSearchValue("");
                                          console.log('✅ تم تحديد المركبة بنجاح');
                                        } else {
                                          console.error('❌ onSelect ليس دالة');
                                        }
                                      } catch (error) {
                                        console.error('💥 خطأ في معالجة الاختيار:', error);
                                      }
                                    }}
                                    className="flex items-center justify-between cursor-pointer"
                                  >
                                     <div className="flex flex-col">
                                       <span className="font-medium">
                                         {vehicle.plate_number || 'غير محدد'}
                                       </span>
                                       <span className="text-sm text-muted-foreground">
                                         {[vehicle.make, vehicle.model, vehicle.year]
                                           .filter(Boolean)
                                           .join(' ') || 'معلومات غير متاحة'}
                                       </span>
                                       {/* عرض الأسعار */}
                                       <div className="text-xs text-muted-foreground flex gap-2 mt-1">
                                         {vehicle.daily_rate && <span>يومي: {vehicle.daily_rate.toLocaleString()} د.ك</span>}
                                         {vehicle.weekly_rate && <span>أسبوعي: {vehicle.weekly_rate.toLocaleString()} د.ك</span>}
                                         {vehicle.monthly_rate && <span>شهري: {vehicle.monthly_rate.toLocaleString()} د.ك</span>}
                                       </div>
                                     </div>
                                    <Check
                                      className={cn(
                                        "ml-2 h-4 w-4",
                                        selectedVehicleId === vehicle.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                  </CommandItem>
                                );
                              } catch (error) {
                                console.error('💥 خطأ في إنشاء عنصر المركبة:', error);
                                return null;
                              }
                            })
                            .filter(Boolean); // Remove null items

                          return vehicleItems.length > 0 ? vehicleItems : (
                            <div className="p-4 text-center text-muted-foreground">
                              حدث خطأ في عرض المركبات
                            </div>
                          );
                        } catch (error) {
                          console.error('💥 خطأ شامل في عرض المركبات:', error);
                          return (
                            <div className="p-4 text-center text-red-600">
                              حدث خطأ في عرض قائمة المركبات
                            </div>
                          );
                        }
                      })()}
                    </CommandGroup>
                    </CommandList>
                  </Command>
                </div>
              );
            } catch (error) {
              console.error('💥 خطأ شامل في Command:', error);
              return (
                <div className="p-4 text-center text-red-600">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>حدث خطأ في واجهة الاختيار</p>
                </div>
              );
            }
          })()}
        </PopoverContent>
      </Popover>
    );
  } catch (error) {
    console.error('💥 خطأ شامل في VehicleSelector:', error);
    return (
      <Button
        variant="outline"
        className="w-full justify-between text-red-600 border-red-300"
        disabled
      >
        <span className="flex items-center">
          <AlertCircle className="ml-2 h-4 w-4" />
          خطأ في منتقي المركبات
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    );
  }
}