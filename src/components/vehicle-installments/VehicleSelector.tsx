import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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
}

export function VehicleSelector({
  vehicles,
  selectedVehicleId,
  excludeVehicleIds = [],
  onSelect,
  placeholder = "اختر المركبة...",
  disabled = false,
}: VehicleSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearch = useDebounce(searchValue, 300);

  // Filter vehicles based on exclusions and search
  const filteredVehicles = vehicles
    .filter(vehicle => !excludeVehicleIds.includes(vehicle.id))
    .filter(vehicle => {
      if (!debouncedSearch) return true;
      const searchLower = debouncedSearch.toLowerCase();
      return (
        vehicle.plate_number.toLowerCase().includes(searchLower) ||
        vehicle.make.toLowerCase().includes(searchLower) ||
        vehicle.model.toLowerCase().includes(searchLower) ||
        vehicle.year.toString().includes(searchLower)
      );
    });

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  const getVehicleDisplayText = (vehicle: Vehicle) => 
    `${vehicle.plate_number} - ${vehicle.make} ${vehicle.model} (${vehicle.year})`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedVehicle ? getVehicleDisplayText(selectedVehicle) : placeholder}
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
          <CommandEmpty>لم يتم العثور على مركبات مطابقة</CommandEmpty>
          <CommandGroup className="max-h-[200px] overflow-auto">
            {filteredVehicles.map((vehicle) => (
              <CommandItem
                key={vehicle.id}
                value={vehicle.id}
                onSelect={() => {
                  onSelect(vehicle.id);
                  setOpen(false);
                  setSearchValue("");
                }}
                className="flex items-center justify-between"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{vehicle.plate_number}</span>
                  <span className="text-sm text-muted-foreground">
                    {vehicle.make} {vehicle.model} ({vehicle.year})
                  </span>
                </div>
                <Check
                  className={cn(
                    "ml-2 h-4 w-4",
                    selectedVehicleId === vehicle.id ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}