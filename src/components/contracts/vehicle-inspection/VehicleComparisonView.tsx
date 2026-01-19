/**
 * Vehicle Comparison View Component
 * Side-by-side comparison of pickup vs return vehicle condition
 *
 * @component VehicleComparisonView
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, AlertTriangle, Shield, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  VisualInspectionData,
  InspectionComparison,
  ZoneCondition,
  ZoneConditionColors,
  getZonesByVehicleType,
  VehicleType,
  ZoneCategory,
} from './types';
import { VisualVehicleDiagram } from './VisualVehicleDiagram';

// ===== Props =====
interface VehicleComparisonViewProps {
  pickupData: VisualInspectionData | null;
  returnData: VisualInspectionData | null;
  className?: string;
}

// ===== Animation Variants =====
const slideIn = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3 }
  }
};

// ===== Main Component =====
export function VehicleComparisonView({
  pickupData,
  returnData,
  className,
}: VehicleComparisonViewProps) {
  // Calculate comparison
  const comparison = useMemo(() => {
    if (!pickupData || !returnData) return null;

    const pickupZones = new Map(pickupData.zones.map(z => [z.zone_id, z]));
    const returnZones = new Map(returnData.zones.map(z => [z.zone_id, z]));

    const newDamages: typeof returnData.zones = [];
    const existingDamages: typeof returnData.zones = [];
    const worsenedDamages: typeof returnData.zones = [];

    returnData.zones.forEach(returnZone => {
      const pickupZone = pickupZones.get(returnZone.zone_id);

      if (!pickupZone || pickupZone.condition === 'clean') {
        // Was clean, now damaged
        newDamages.push(returnZone);
      } else if (pickupZone.condition !== 'clean') {
        // Was already damaged
        existingDamages.push(returnZone);

        // Check if severity worsened
        const severityOrder = ['minor', 'moderate', 'severe'];
        const pickupSeverityIndex = severityOrder.indexOf(pickupZone.severity);
        const returnSeverityIndex = severityOrder.indexOf(returnZone.severity);

        if (returnSeverityIndex > pickupSeverityIndex) {
          worsenedDamages.push(returnZone);
        }
      }
    });

    return {
      pickup: pickupData,
      return: returnData,
      new_damages: newDamages,
      existing_damages: existingDamages,
      worsened_damages: worsenedDamages,
    };
  }, [pickupData, returnData]);

  if (!comparison) {
    return (
      <Card className={className}>
        <CardContent className="p-12 text-center text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>لا توجد بيانات كافية للمقارنة</p>
          <p className="text-sm mt-2">يجب إكمال فحص الاستلام والتسليم</p>
        </CardContent>
      </Card>
    );
  }

  const vehicleType = returnData.vehicle_type || 'sedan';

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div variants={slideIn} initial="hidden" animate="visible">
          <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
                أضرار جديدة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-700 dark:text-red-400">
                {comparison.new_damages.length}
              </div>
              <p className="text-sm text-red-600 dark:text-red-500 mt-1">
                منطقة تضررت خلال الاستخدام
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={slideIn} initial="hidden" animate="visible" transition={{ delay: 0.1 }}>
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-orange-700 dark:text-orange-400">
                <ArrowRight className="h-5 w-5" />
                زيادة الخطورة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-700 dark:text-orange-400">
                {comparison.worsened_damages.length}
              </div>
              <p className="text-sm text-orange-600 dark:text-orange-500 mt-1">
                منطقة ازدادت خطورتها
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={slideIn} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <Shield className="h-5 w-5" />
                أضرار سابقة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                {comparison.existing_damages.length}
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-500 mt-1">
                منطقة كانت متضررة مسبقاً
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Side-by-Side Diagrams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pickup Inspection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              فحص الاستلام
              <Badge variant="outline" className="mr-auto">
                {new Date(pickupData?.inspection_date || '').toLocaleDateString('ar-EG')}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <VisualVehicleDiagram
              vehicleType={vehicleType}
              onVehicleTypeChange={() => {}}
              selectedZones={pickupData?.zones || []}
              onZoneClick={() => {}}
              mode="view"
            />
          </CardContent>
        </Card>

        {/* Return Inspection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              فحص التسليم
              <Badge variant="outline" className="mr-auto">
                {new Date(returnData?.inspection_date || '').toLocaleDateString('ar-EG')}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <VisualVehicleDiagram
              vehicleType={vehicleType}
              onVehicleTypeChange={() => {}}
              selectedZones={returnData?.zones || []}
              onZoneClick={() => {}}
              mode="view"
            />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Damage List */}
      {comparison.new_damages.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700 dark:text-red-400">
              تفاصيل الأضرار الجديدة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {comparison.new_damages.map((zone) => (
                <div
                  key={zone.zone_id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                >
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: ZoneConditionColors[zone.condition] }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{zone.zone_name_ar}</span>
                      <Badge variant="outline" className="text-xs">
                        {zone.condition === 'scratch' && 'خدش'}
                        {zone.condition === 'dent' && 'مثني'}
                        {zone.condition === 'crack' && 'كسر'}
                        {zone.condition === 'broken' && 'معطل'}
                        {zone.condition === 'missing' && 'مفقود'}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {zone.severity === 'minor' && 'طفيف'}
                        {zone.severity === 'moderate' && 'متوسط'}
                        {zone.severity === 'severe' && 'شديد'}
                      </Badge>
                    </div>
                    {zone.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {zone.description}
                      </p>
                    )}
                    {zone.photo_urls.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        {zone.photo_urls.slice(0, 3).map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt={`Damage photo ${i + 1}`}
                            className="w-16 h-16 object-cover rounded border"
                          />
                        ))}
                        {zone.photo_urls.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{zone.photo_urls.length - 3} صور
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Worsened Damages */}
      {comparison.worsened_damages.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="text-orange-700 dark:text-orange-400">
              مناطق زادت خطورتها
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {comparison.worsened_damages.map((zone) => {
                const pickupZone = pickupData?.zones.find(z => z.zone_id === zone.zone_id);

                return (
                  <div
                    key={zone.zone_id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
                  >
                    <ArrowRight className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{zone.zone_name_ar}</div>
                      <div className="flex items-center gap-2 mt-1 text-sm">
                        <Badge variant="outline" className="text-xs">
                          من:
                          {pickupZone?.severity === 'minor' && ' طفيف'}
                          {pickupZone?.severity === 'moderate' && ' متوسط'}
                          {pickupZone?.severity === 'severe' && ' شديد'}
                        </Badge>
                        <ArrowRight className="h-3 w-3" />
                        <Badge variant="default" className="text-xs">
                          إلى:
                          {zone.severity === 'minor' && ' طفيف'}
                          {zone.severity === 'moderate' && ' متوسط'}
                          {zone.severity === 'severe' && ' شديد'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ===== Export Types =====
export type { VehicleComparisonViewProps };
