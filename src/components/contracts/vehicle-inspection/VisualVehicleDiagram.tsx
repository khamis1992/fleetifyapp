/**
 * Visual Vehicle Diagram Component
 * Interactive vehicle inspection diagram using real vehicle images with clickable zones
 *
 * @component VisualVehicleDiagram
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, Truck, ChevronDown, ChevronUp, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  VehicleType,
  ZoneCategory,
  VehicleZone,
  ZoneSelection,
  getZonesByVehicleType,
  ZoneConditionColors,
} from './types';

// ===== Animation Variants =====
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

// ===== Vehicle Image Paths =====
// WebP format for better performance (90% smaller than PNG)
const VEHICLE_IMAGES: Record<VehicleType, string> = {
  sedan: '/images/vehicles/sedan-top-view.webp',
  suv: '/images/vehicles/suv-top-view.png',
  truck: '/images/vehicles/truck-top-view.png',
};

// Fallback SVG diagram for when no image is available
const FALLBACK_SVG = (type: VehicleType) => (
  <svg width="100%" height="100%" viewBox="0 0 500 500" className="max-w-full">
    {/* Vehicle outline - simplified */}
    <rect
      x="50"
      y="50"
      width="400"
      height="400"
      rx="20"
      fill="none"
      stroke="#94a3b8"
      strokeWidth="2"
      strokeDasharray="5,5"
    />
    {/* Label */}
    <text
      x="250"
      y="250"
      textAnchor="middle"
      dominantBaseline="middle"
      className="text-lg fill-slate-400"
    >
      {type === 'sedan' && 'سيدان'}
      {type === 'suv' && 'أر وي landfill'}
      {type === 'truck' && 'شاحنة'}
    </text>
  </svg>
);

// ===== Props =====
interface VisualVehicleDiagramProps {
  vehicleType: VehicleType;
  onVehicleTypeChange: (type: VehicleType) => void;
  selectedZones: ZoneSelection[];
  onZoneClick: (zone: VehicleZone) => void;
  mode?: 'inspection' | 'view' | 'comparison';
  className?: string;
  defaultCategory?: ZoneCategory;
}

// ===== Category Tabs Configuration =====
const CATEGORY_TABS: { value: ZoneCategory; label: string; label_ar: string; icon: string }[] = [
  { value: 'exterior', label: 'Exterior', label_ar: 'الخارجية', icon: '🚗' },
  { value: 'interior', label: 'Interior', label_ar: 'الداخلية', icon: '🏠' },
  { value: 'mechanical', label: 'Mechanical', label_ar: 'الميكانيكا', icon: '⚙️' },
];

// ===== Vehicle Type Configuration =====
const VEHICLE_TYPES: { value: VehicleType; label: string; label_ar: string; icon: any }[] = [
  { value: 'sedan', label: 'Sedan', label_ar: 'سيدان', icon: Car },
  { value: 'suv', label: 'SUV', label_ar: 'أر 维 landfill', icon: Car },
  { value: 'truck', label: 'Truck', label_ar: 'شاحنة', icon: Truck },
];

// ===== Main Component =====
export function VisualVehicleDiagram({
  vehicleType,
  onVehicleTypeChange,
  selectedZones,
  onZoneClick,
  mode = 'inspection',
  className,
  defaultCategory = 'exterior',
}: VisualVehicleDiagramProps) {
  const [activeCategory, setActiveCategory] = useState<ZoneCategory>(defaultCategory);
  const [scale, setScale] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Get zones for current vehicle type and category
  const zones = getZonesByVehicleType(vehicleType, activeCategory);

  // Get condition for a zone
  const getZoneCondition = useCallback((zoneId: string) => {
    return selectedZones.find(z => z.zone_id === zoneId);
  }, [selectedZones]);

  // Get fill color based on condition
  const getZoneColor = useCallback((zoneId: string) => {
    const selection = getZoneCondition(zoneId);
    if (selection) {
      return ZoneConditionColors[selection.condition];
    }
    return 'rgba(200, 200, 200, 0.5)'; // Default semi-transparent gray
  }, [getZoneCondition]);

  // Handle zone click
  const handleZoneClick = useCallback((zone: VehicleZone, e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode === 'inspection') {
      onZoneClick(zone);
    }
  }, [mode, onZoneClick]);

  // Zoom handlers
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => setScale(1);

  // Calculate zone position as percentage
  const getZoneStyle = useCallback((zone: VehicleZone) => {
    return {
      position: 'absolute' as const,
      left: `${(zone.position.x / 500) * 100}%`,
      top: `${(zone.position.y / 500) * 100}%`,
      width: `${(zone.position.width / 500) * 100}%`,
      height: `${(zone.position.height / 500) * 100}%`,
      cursor: mode === 'inspection' ? 'pointer' : 'default',
      transition: 'all 0.2s ease',
    };
  }, [mode]);

  const getBadgeStyle = useCallback((zone: VehicleZone) => {
    return {
      position: 'absolute' as const,
      left: `${(zone.badge_position.x / 500) * 100}%`,
      top: `${(zone.badge_position.y / 500) * 100}%`,
      transform: 'translate(-50%, -50%)',
    };
  }, []);

  // Handle image load to capture actual displayed dimensions
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions({
      width: img.clientWidth,
      height: img.clientHeight,
    });
    setImageLoaded(true);
  };

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        {/* Vehicle Type Selector */}
        <div className="flex items-center gap-2">
          {VEHICLE_TYPES.map(({ value, label, label_ar, icon: Icon }) => (
            <Button
              key={value}
              variant={vehicleType === value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onVehicleTypeChange(value)}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label_ar}</span>
            </Button>
          ))}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleResetZoom}>
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Badge variant="outline" className="ml-2">
            {Math.round(scale * 100)}%
          </Badge>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 border-b pb-2">
        {CATEGORY_TABS.map(({ value, label, label_ar, icon }) => {
          const categoryZones = getZonesByVehicleType(vehicleType, value);
          const damagedCount = categoryZones.filter(z => getZoneCondition(z.id)).length;

          return (
            <button
              key={value}
              onClick={() => setActiveCategory(value)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
                activeCategory === value
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'hover:bg-muted'
              )}
            >
              <span className="text-xl">{icon}</span>
              <span className="font-medium">{label_ar}</span>
              {damagedCount > 0 && (
                <Badge
                  variant={activeCategory === value ? 'secondary' : 'destructive'}
                  className="ml-1"
                >
                  {damagedCount}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Diagram Container */}
      <motion.div
        key={`${vehicleType}-${activeCategory}`}
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        exit="exit"
        ref={containerRef}
        className="relative bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 p-8 overflow-hidden"
        style={{ minHeight: '500px' }}
      >
        {/* Image or Fallback SVG */}
        <div
          className="relative flex items-center justify-center transition-transform duration-200"
          style={{ transform: `scale(${scale})` }}
        >
          {/* Try to load actual vehicle image */}
          {!imageError ? (
            <>
              <img
                ref={imageRef}
                src={VEHICLE_IMAGES[vehicleType]}
                alt={`${vehicleType} vehicle`}
                className="max-w-full h-auto"
                style={{ maxHeight: '450px' }}
                onLoad={handleImageLoad}
                onError={() => {
                  setImageError(true);
                  setImageLoaded(false);
                }}
              />
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-slate-300 border-t-teal-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-slate-500">جاري تحميل الصورة...</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Fallback SVG diagram */
            <div style={{ width: '500px', height: '450px' }}>
              {FALLBACK_SVG(vehicleType)}
            </div>
          )}

          {/* Clickable Zone Overlays */}
          <div className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: 'none' }}>
            <div
              style={{
                width: imageDimensions ? `${imageDimensions.width}px` : 'auto',
                height: imageDimensions ? `${imageDimensions.height}px` : '450px',
                position: 'relative',
                pointerEvents: 'auto'
              }}
            >
              {zones.map((zone) => {
                const selection = getZoneCondition(zone.id);
                const zoneColor = getZoneColor(zone.id);

                return (
                  <div key={zone.id}>
                    {/* Zone overlay */}
                    <div
                      style={getZoneStyle(zone)}
                      className={cn(
                        'rounded-sm border-2 hover:opacity-80',
                        mode === 'inspection' && 'hover:border-white hover:border-opacity-50',
                        selection && 'animate-pulse'
                      )}
                      onClick={(e) => handleZoneClick(zone, e)}
                    >
                      {/* Zone tint */}
                      <div
                        className="w-full h-full rounded-sm"
                        style={{ backgroundColor: zoneColor }}
                      />
                    </div>

                    {/* Zone Number Badge */}
                    <div
                      style={getBadgeStyle(zone)}
                      onClick={(e) => handleZoneClick(zone, e)}
                      className={cn(
                        'cursor-pointer flex items-center justify-center',
                        mode === 'inspection' && 'hover:scale-110 transition-transform'
                      )}
                      style={{ pointerEvents: 'auto' }}
                    >
                      <div
                        className={cn(
                          'w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold border-2 shadow-md',
                          selection
                            ? 'border-white text-white'
                            : 'border-slate-600 bg-white text-slate-700'
                        )}
                        style={{ backgroundColor: selection ? zoneColor : undefined }}
                      >
                        {zone.number}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 right-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur rounded-lg border p-3 shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4 text-sm">
              <span className="font-medium">الحالة:</span>
              {Object.entries(ZoneConditionColors).map(([key, color]) => (
                <div key={key} className="flex items-center gap-1">
                  <div
                    className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {key === 'clean' && 'سليم'}
                    {key === 'scratch' && 'خدش'}
                    {key === 'dent' && 'مثني'}
                    {key === 'crack' && 'كسر'}
                    {key === 'broken' && 'معطل'}
                    {key === 'missing' && 'مفقود'}
                  </span>
                </div>
              ))}
            </div>

            <div className="text-sm text-muted-foreground">
              <span className="font-medium">
                {selectedZones.filter(z =>
                  zones.some(zn => zn.id === z.zone_id)
                ).length}
              </span>
              {' / '}
              {zones.length}
              {' منطقة مميزة'}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Instructions */}
      {mode === 'inspection' && (
        <div className="text-sm text-muted-foreground text-center p-3 bg-muted rounded-lg">
          <p>انقر على المناطق المرقمة لتسجيل الحالة. اختر نوع الضرر وأضف الصور.</p>
        </div>
      )}

      {/* Zone Summary */}
      <AnimatePresence>
        {selectedZones.filter(z =>
          zones.some(zn => zn.id === z.zone_id)
        ).length > 0 && (
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"
          >
            {selectedZones
              .filter(z => zones.some(zn => zn.id === z.zone_id))
              .map((zone) => {
                const zoneDef = zones.find(z => z.id === zone.zone_id);
                if (!zoneDef) return null;

                return (
                  <div
                    key={zone.zone_id}
                    className="flex items-center gap-2 p-2 rounded-lg border bg-card shadow-sm"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0 border-2 border-white shadow-sm"
                      style={{ backgroundColor: ZoneConditionColors[zone.condition] }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">
                        {zoneDef.name_ar}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {zone.description || 'بدون وصف'}
                      </div>
                    </div>
                    {zone.photo_urls.length > 0 && (
                      <Badge variant="secondary" className="text-[10px]">
                        📷 {zone.photo_urls.length}
                      </Badge>
                    )}
                  </div>
                );
              })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ===== Export Types =====
export type { VisualVehicleDiagramProps };
