import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  Car, 
  CheckSquare, 
  Square, 
  X, 
  Filter,
  ChevronDown,
  ChevronUp,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Vehicle {
  id: string;
  plate_number: string;
  make?: string;
  model?: string;
  year?: number;
}

interface SelectedVehicle extends Vehicle {
  allocated_amount: number;
}

interface VehicleBulkSelectorProps {
  vehicles: Vehicle[];
  selectedVehicles: SelectedVehicle[];
  onSelectionChange: (vehicles: SelectedVehicle[]) => void;
  isLoading?: boolean;
}

export function VehicleBulkSelector({
  vehicles,
  selectedVehicles,
  onSelectionChange,
  isLoading,
}: VehicleBulkSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMake, setSelectedMake] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(true);

  // استخراج قائمة الماركات
  const makes = useMemo(() => {
    const makeSet = new Set<string>();
    vehicles.forEach(v => {
      if (v.make?.trim()) makeSet.add(v.make.trim());
    });
    return Array.from(makeSet).sort();
  }, [vehicles]);

  // المركبات المفلترة
  const filteredVehicles = useMemo(() => {
    let result = vehicles;

    // فلتر الماركة
    if (selectedMake !== "all") {
      result = result.filter(v => v.make?.trim() === selectedMake);
    }

    // فلتر البحث
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      result = result.filter(v =>
        v.plate_number?.toLowerCase().includes(search) ||
        v.make?.toLowerCase().includes(search) ||
        v.model?.toLowerCase().includes(search) ||
        String(v.year).includes(search)
      );
    }

    return result;
  }, [vehicles, selectedMake, searchTerm]);

  // IDs المركبات المختارة
  const selectedIds = useMemo(() => 
    new Set(selectedVehicles.map(v => v.id)), 
    [selectedVehicles]
  );

  // إحصائيات الماركات
  const makeStats = useMemo(() => {
    const stats: { [key: string]: { total: number; selected: number } } = {};
    vehicles.forEach(v => {
      const make = v.make?.trim() || "غير محدد";
      if (!stats[make]) stats[make] = { total: 0, selected: 0 };
      stats[make].total++;
      if (selectedIds.has(v.id)) stats[make].selected++;
    });
    return stats;
  }, [vehicles, selectedIds]);

  // اختيار/إلغاء اختيار مركبة
  const toggleVehicle = (vehicle: Vehicle) => {
    if (selectedIds.has(vehicle.id)) {
      onSelectionChange(selectedVehicles.filter(v => v.id !== vehicle.id));
    } else {
      onSelectionChange([
        ...selectedVehicles,
        { ...vehicle, allocated_amount: 0 }
      ]);
    }
  };

  // اختيار كل المركبات المفلترة
  const selectAllFiltered = () => {
    const newVehicles = filteredVehicles
      .filter(v => !selectedIds.has(v.id))
      .map(v => ({ ...v, allocated_amount: 0 }));
    onSelectionChange([...selectedVehicles, ...newVehicles]);
  };

  // إلغاء اختيار كل المركبات المفلترة
  const deselectAllFiltered = () => {
    const filteredIds = new Set(filteredVehicles.map(v => v.id));
    onSelectionChange(selectedVehicles.filter(v => !filteredIds.has(v.id)));
  };

  // اختيار كل مركبات ماركة معينة
  const selectByMake = (make: string) => {
    const makeVehicles = vehicles
      .filter(v => v.make?.trim() === make && !selectedIds.has(v.id))
      .map(v => ({ ...v, allocated_amount: 0 }));
    onSelectionChange([...selectedVehicles, ...makeVehicles]);
  };

  // هل كل المركبات المفلترة مختارة؟
  const allFilteredSelected = filteredVehicles.length > 0 && 
    filteredVehicles.every(v => selectedIds.has(v.id));

  // هل بعض المركبات المفلترة مختارة؟
  const someFilteredSelected = filteredVehicles.some(v => selectedIds.has(v.id));

  // إزالة مركبة من المختارة
  const removeSelected = (vehicleId: string) => {
    onSelectionChange(selectedVehicles.filter(v => v.id !== vehicleId));
  };

  // تحديث مبلغ مركبة
  const updateAmount = (vehicleId: string, amount: number) => {
    onSelectionChange(
      selectedVehicles.map(v => 
        v.id === vehicleId ? { ...v, allocated_amount: amount } : v
      )
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-coral-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* شريط البحث والفلاتر */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث برقم اللوحة، الماركة، الموديل..."
            className="pr-10 h-9"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          الفلاتر
          {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>
      </div>

      {/* فلاتر الماركات */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 flex-wrap p-3 bg-neutral-50 rounded-lg">
              <Button
                type="button"
                variant={selectedMake === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMake("all")}
                className={cn(
                  "h-7 text-xs",
                  selectedMake === "all" && "bg-coral-500 hover:bg-coral-600"
                )}
              >
                الكل ({vehicles.length})
              </Button>
              {makes.map(make => (
                <Button
                  key={make}
                  type="button"
                  variant={selectedMake === make ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedMake(make)}
                  className={cn(
                    "h-7 text-xs gap-1",
                    selectedMake === make && "bg-coral-500 hover:bg-coral-600"
                  )}
                >
                  {make}
                  <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                    {makeStats[make]?.selected || 0}/{makeStats[make]?.total || 0}
                  </Badge>
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* أزرار التحديد السريع */}
      <div className="flex gap-2 flex-wrap items-center justify-between">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={allFilteredSelected ? deselectAllFiltered : selectAllFiltered}
            className="gap-2 h-8"
          >
            {allFilteredSelected ? (
              <>
                <Square className="w-4 h-4" />
                إلغاء تحديد الكل
              </>
            ) : (
              <>
                <CheckSquare className="w-4 h-4" />
                تحديد الكل ({filteredVehicles.length})
              </>
            )}
          </Button>
          {selectedMake !== "all" && !allFilteredSelected && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => selectByMake(selectedMake)}
              className="gap-2 h-8 text-coral-600 border-coral-200 hover:bg-coral-50"
            >
              <Car className="w-4 h-4" />
              تحديد كل {selectedMake}
            </Button>
          )}
        </div>
        <Badge variant="secondary" className="h-7 px-3">
          تم اختيار {selectedVehicles.length} مركبة
        </Badge>
      </div>

      {/* قائمة المركبات */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* المركبات المتاحة */}
        <div className="border rounded-xl overflow-hidden">
          <div className="bg-neutral-100 px-4 py-2 border-b">
            <h4 className="font-semibold text-sm">المركبات المتاحة ({filteredVehicles.length})</h4>
          </div>
          <ScrollArea className="h-[280px]">
            <div className="p-2 space-y-1">
              {filteredVehicles.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  <Car className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">لا توجد مركبات مطابقة</p>
                </div>
              ) : (
                filteredVehicles.map(vehicle => {
                  const isSelected = selectedIds.has(vehicle.id);
                  return (
                    <motion.div
                      key={vehicle.id}
                      whileHover={{ backgroundColor: isSelected ? "#fef2f2" : "#f9fafb" }}
                      onClick={() => toggleVehicle(vehicle)}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors",
                        isSelected ? "bg-coral-50 border border-coral-200" : "hover:bg-neutral-50"
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        className="data-[state=checked]:bg-coral-500 data-[state=checked]:border-coral-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {vehicle.plate_number}
                        </p>
                        <p className="text-xs text-neutral-500 truncate">
                          {[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(" • ")}
                        </p>
                      </div>
                      {isSelected && (
                        <Badge className="bg-coral-500 text-white text-[10px]">
                          محدد
                        </Badge>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* المركبات المختارة */}
        <div className="border rounded-xl overflow-hidden">
          <div className="bg-coral-50 px-4 py-2 border-b border-coral-100">
            <h4 className="font-semibold text-sm text-coral-700">
              المركبات المختارة ({selectedVehicles.length})
            </h4>
          </div>
          <ScrollArea className="h-[280px]">
            <div className="p-2 space-y-1">
              {selectedVehicles.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">اختر المركبات من القائمة</p>
                </div>
              ) : (
                selectedVehicles.map(vehicle => (
                  <motion.div
                    key={vehicle.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-2 p-2 rounded-lg bg-white border"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {vehicle.plate_number}
                      </p>
                      <p className="text-[10px] text-neutral-500 truncate">
                        {vehicle.make} {vehicle.model}
                      </p>
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      value={vehicle.allocated_amount || ''}
                      onChange={(e) => updateAmount(vehicle.id, parseFloat(e.target.value) || 0)}
                      placeholder="المبلغ"
                      className="w-24 h-7 text-xs"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSelected(vehicle.id)}
                      className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </motion.div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* ملخص سريع للماركات المختارة */}
      {selectedVehicles.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {Object.entries(makeStats)
            .filter(([_, stats]) => stats.selected > 0)
            .map(([make, stats]) => (
              <Badge key={make} variant="outline" className="gap-1">
                <Car className="w-3 h-3" />
                {make}: {stats.selected}
              </Badge>
            ))}
        </div>
      )}
    </div>
  );
}

