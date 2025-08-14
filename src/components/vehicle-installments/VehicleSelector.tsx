import { useState } from "react";
import { Check, ChevronsUpDown, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDebounce } from "@/hooks/useDebounce";

interface Vehicle {
  id: string;
  plate_number: string;
  make: string;
  model: string;
  year: number;
}

interface VehicleSelectorProps {
  vehicles: Vehicle[];
  selectedVehicleId?: string;
  excludeVehicleIds?: string[];
  onSelect: (vehicleId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  error?: string | null;
}

export function VehicleSelector({
  vehicles = [],
  selectedVehicleId,
  excludeVehicleIds = [],
  onSelect,
  placeholder = "اختر المركبة...",
  disabled = false,
  isLoading = false,
  error = null,
}: VehicleSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearch = useDebounce(searchValue, 300);

  // Ensure vehicles is always an array to prevent iteration errors
  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
  
  // Filter vehicles based on exclusions and search
  const filteredVehicles = safeVehicles
    .filter(vehicle => {
      // Check if vehicle has required properties
      if (!vehicle || !vehicle.id || !vehicle.plate_number) {
        console.warn('مركبة بدون معرف أو رقم لوحة:', vehicle);
        return false;
      }
      return !excludeVehicleIds.includes(vehicle.id);
    })
    .filter(vehicle => {
      if (!debouncedSearch) return true;
      const searchLower = debouncedSearch.toLowerCase();
      return (
        (vehicle.plate_number || '').toLowerCase().includes(searchLower) ||
        (vehicle.make || '').toLowerCase().includes(searchLower) ||
        (vehicle.model || '').toLowerCase().includes(searchLower) ||
        (vehicle.year || '').toString().includes(searchLower)
      );
    });

  const selectedVehicle = safeVehicles.find(v => v?.id === selectedVehicleId);

  const getVehicleDisplayText = (vehicle: Vehicle) => 
    `${vehicle.plate_number || 'غير محدد'} - ${vehicle.make || ''} ${vehicle.model || ''} (${vehicle.year || ''})`;

  // Show loading state
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

  // Show error state
  if (error) {
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || safeVehicles.length === 0}
        >
          {selectedVehicle ? getVehicleDisplayText(selectedVehicle) : 
           safeVehicles.length === 0 ? "لا توجد مركبات متاحة" : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="البحث بواسطة رقم اللوحة، الماركة، أو الموديل..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandEmpty>
            {safeVehicles.length === 0 
              ? "لا توجد مركبات متاحة في النظام" 
              : "لم يتم العثور على مركبات مطابقة لما تبحث عنه"
            }
          </CommandEmpty>
          <CommandGroup className="max-h-[200px] overflow-auto">
            {filteredVehicles && filteredVehicles.length > 0 ? filteredVehicles.map((vehicle) => {
              // Additional safety check for each vehicle
              if (!vehicle || !vehicle.id) {
                console.warn('مركبة غير صالحة في القائمة:', vehicle);
                return null;
              }
              
              return (
                <CommandItem
                  key={vehicle.id}
                  value={vehicle.id}
                  onSelect={() => {
                    try {
                      onSelect(vehicle.id);
                      setOpen(false);
                      setSearchValue("");
                    } catch (error) {
                      console.error('خطأ في اختيار المركبة:', error);
                    }
                  }}
                  className="flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{vehicle.plate_number || 'غير محدد'}</span>
                    <span className="text-sm text-muted-foreground">
                      {vehicle.make || ''} {vehicle.model || ''} ({vehicle.year || ''})
                    </span>
                  </div>
                  <Check
                    className={cn(
                      "ml-2 h-4 w-4",
                      selectedVehicleId === vehicle.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              );
            }).filter(Boolean) : null}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}