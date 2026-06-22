import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VehicleGallerySelector, VehicleGalleryItem } from './VehicleGallerySelector';

interface VehicleGalleryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: VehicleGalleryItem[];
  selectedVehicleId?: string;
  onSelect: (vehicleId: string) => void;
  title?: string;
  showPricing?: boolean;
  filterByAvailability?: boolean;
}

export function VehicleGalleryDialog({
  open,
  onOpenChange,
  vehicles,
  selectedVehicleId,
  onSelect,
  title = 'اختر المركبة',
  showPricing = true,
  filterByAvailability = true
}: VehicleGalleryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right text-xl">{title}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-1">
          <VehicleGallerySelector
            vehicles={vehicles}
            selectedVehicleId={selectedVehicleId}
            onSelect={onSelect}
            onClose={() => onOpenChange(false)}
            showPricing={showPricing}
            filterByAvailability={filterByAvailability}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
