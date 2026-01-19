import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ChevronDown, ChevronUp, Receipt, Info, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import type { InspectionComparison } from '@/types/contracts.types';

interface CheckInChargesBreakdownProps {
  /** Inspection comparison data with check-in and check-out details */
  inspectionComparison?: InspectionComparison | null;
  /** Fuel difference charge (expected - actual) */
  fuelCharge?: {
    expectedLevel: number;
    actualLevel: number;
    difference: number;
    pricePerUnit: number;
    totalCharge: number;
  };
  /** Mileage overage charge */
  mileageCharge?: {
    allowedKm: number;
    actualKm: number;
    excessKm: number;
    ratePerKm: number;
    totalCharge: number;
  };
  /** Damage charges with photo evidence */
  damageCharges?: Array<{
    location: string;
    description: string;
    severity: 'minor' | 'moderate' | 'severe';
    estimatedCost: number;
    photoUrl?: string;
  }>;
  /** Late return charge */
  lateReturnCharge?: {
    expectedReturnDate: Date;
    actualReturnDate: Date;
    lateHours: number;
    hourlyRate: number;
    totalCharge: number;
  };
  /** Cleaning fee (if vehicle returned dirty) */
  cleaningFee?: {
    expectedCleanliness: number;
    actualCleanliness: number;
    charge: number;
    notes?: string;
  };
  /** Whether to start expanded */
  defaultExpanded?: boolean;
  /** Optional className */
  className?: string;
}

/**
 * CheckInChargesBreakdown - Transparent check-in charges calculator
 *
 * Shows detailed breakdown of additional charges when vehicle is returned:
 * - Fuel difference (expected vs actual)
 * - Mileage overage (excess km × rate)
 * - Damage charges (with photo evidence)
 * - Late return fees (hours × hourly rate)
 * - Cleaning fees (if applicable)
 *
 * Features:
 * - Side-by-side comparison (expected vs actual)
 * - Photo evidence linking for damages
 * - Clear calculation formulas
 * - Mobile-responsive
 * - Expandable/collapsible
 *
 * Usage:
 * ```tsx
 * <CheckInChargesBreakdown
 *   fuelCharge={{
 *     expectedLevel: 100,
 *     actualLevel: 50,
 *     difference: 50,
 *     pricePerUnit: 2.5,
 *     totalCharge: 125
 *   }}
 *   mileageCharge={{
 *     allowedKm: 1000,
 *     actualKm: 1500,
 *     excessKm: 500,
 *     ratePerKm: 0.5,
 *     totalCharge: 250
 *   }}
 * />
 * ```
 *
 * Part of K1 Fix #213 - Make check-in calculations transparent
 */
export const CheckInChargesBreakdown: React.FC<CheckInChargesBreakdownProps> = ({
  inspectionComparison,
  fuelCharge,
  mileageCharge,
  damageCharges = [],
  lateReturnCharge,
  cleaningFee,
  defaultExpanded = true,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const { formatCurrency } = useCurrencyFormatter();

  // Calculate total additional charges
  const totalCharges =
    (fuelCharge?.totalCharge || 0) +
    (mileageCharge?.totalCharge || 0) +
    damageCharges.reduce((sum, damage) => sum + damage.estimatedCost, 0) +
    (lateReturnCharge?.totalCharge || 0) +
    (cleaningFee?.charge || 0);

  // If no charges, show "no additional charges" message
  const hasCharges = totalCharges > 0;

  return (
    <Card className={`border-2 ${hasCharges ? 'border-warning/40' : 'border-success/40'} ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${hasCharges ? 'bg-warning/10' : 'bg-success/10'}`}>
              <Receipt className={`h-5 w-5 ${hasCharges ? 'text-warning' : 'text-success'}`} />
            </div>
            <div>
              <CardTitle className="text-lg">رسوم الإرجاع الإضافية</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {hasCharges ? 'تفاصيل الرسوم المستحقة' : 'لا توجد رسوم إضافية'}
              </p>
            </div>
          </div>
          {hasCharges && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="gap-2"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  إخفاء التفاصيل
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  عرض التفاصيل
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* No Charges State */}
        {!hasCharges && (
          <div className="flex items-center gap-2 p-4 bg-success/10 rounded-lg">
            <Badge variant="outline" className="bg-success text-success-foreground">
              ✓
            </Badge>
            <span className="text-sm font-medium">تم إرجاع المركبة بحالة ممتازة - لا توجد رسوم إضافية</span>
          </div>
        )}

        {/* Has Charges - Collapsed View */}
        {hasCharges && !isExpanded && (
          <div className="flex items-center justify-between py-2">
            <span className="text-lg font-semibold">إجمالي الرسوم الإضافية</span>
            <span className="text-2xl font-bold text-warning">
              {formatCurrency(totalCharges)}
            </span>
          </div>
        )}

        {/* Has Charges - Expanded View */}
        {hasCharges && isExpanded && (
          <div className="space-y-4">
            {/* Fuel Charge */}
            {fuelCharge && fuelCharge.totalCharge > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  فرق الوقود
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p className="text-sm">
                        يتم احتساب فرق الوقود بناءً على الفرق بين مستوى الوقود المتوقع والفعلي
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </h4>
                <div className="bg-warning/5 border border-warning/20 rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">المتوقع:</span>
                      <span className="font-medium ml-2">{fuelCharge.expectedLevel}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">الفعلي:</span>
                      <span className="font-medium ml-2">{fuelCharge.actualLevel}%</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {fuelCharge.difference}% × {formatCurrency(fuelCharge.pricePerUnit)} للوحدة
                    </span>
                    <span className="font-bold text-warning">{formatCurrency(fuelCharge.totalCharge)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Mileage Overage */}
            {mileageCharge && mileageCharge.totalCharge > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  تجاوز المسافة المسموحة
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p className="text-sm">
                        يتم احتساب رسوم إضافية عند تجاوز المسافة المسموحة في العقد
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </h4>
                <div className="bg-warning/5 border border-warning/20 rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">المسموح:</span>
                      <span className="font-medium ml-2">{mileageCharge.allowedKm.toLocaleString()} كم</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">الفعلي:</span>
                      <span className="font-medium ml-2">{mileageCharge.actualKm.toLocaleString()} كم</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {mileageCharge.excessKm.toLocaleString()} كم × {formatCurrency(mileageCharge.ratePerKm)} للكيلومتر
                    </span>
                    <span className="font-bold text-warning">{formatCurrency(mileageCharge.totalCharge)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Damage Charges */}
            {damageCharges.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  أضرار المركبة
                </h4>
                <div className="space-y-2">
                  {damageCharges.map((damage, index) => (
                    <div key={index} className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{damage.location}</span>
                            <Badge
                              variant={
                                damage.severity === 'severe'
                                  ? 'destructive'
                                  : damage.severity === 'moderate'
                                  ? 'default'
                                  : 'secondary'
                              }
                              className="text-xs"
                            >
                              {damage.severity === 'severe' ? 'شديد' : damage.severity === 'moderate' ? 'متوسط' : 'بسيط'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{damage.description}</p>
                          {damage.photoUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => setSelectedPhoto(damage.photoUrl || null)}
                            >
                              <ImageIcon className="h-3 w-3" />
                              عرض الصورة
                            </Button>
                          )}
                        </div>
                        <span className="font-bold text-destructive whitespace-nowrap">
                          {formatCurrency(damage.estimatedCost)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Late Return Charge */}
            {lateReturnCharge && lateReturnCharge.totalCharge > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">رسوم التأخير</h4>
                <div className="bg-warning/5 border border-warning/20 rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">المتوقع:</span>
                      <span className="font-medium ml-2">
                        {lateReturnCharge.expectedReturnDate.toLocaleDateString('en-US')}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">الفعلي:</span>
                      <span className="font-medium ml-2">
                        {lateReturnCharge.actualReturnDate.toLocaleDateString('en-US')}
                      </span>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {lateReturnCharge.lateHours} ساعة × {formatCurrency(lateReturnCharge.hourlyRate)} للساعة
                    </span>
                    <span className="font-bold text-warning">{formatCurrency(lateReturnCharge.totalCharge)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Cleaning Fee */}
            {cleaningFee && cleaningFee.charge > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">رسوم التنظيف</h4>
                <div className="bg-warning/5 border border-warning/20 rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">النظافة المتوقعة:</span>
                      <span className="font-medium ml-2">{cleaningFee.expectedCleanliness}/5</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">النظافة الفعلية:</span>
                      <span className="font-medium ml-2">{cleaningFee.actualCleanliness}/5</span>
                    </div>
                  </div>
                  {cleaningFee.notes && (
                    <p className="text-xs text-muted-foreground">{cleaningFee.notes}</p>
                  )}
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">رسوم تنظيف</span>
                    <span className="font-bold text-warning">{formatCurrency(cleaningFee.charge)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Total */}
            <Separator />
            <div className="bg-warning/10 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">إجمالي الرسوم الإضافية</span>
                <span className="text-2xl font-bold text-warning">
                  {formatCurrency(totalCharges)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-right">
                سيتم إضافة هذا المبلغ إلى الفاتورة النهائية
              </p>
            </div>
          </div>
        )}
      </CardContent>

      {/* Photo Modal (simple implementation) */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={selectedPhoto}
              alt="صورة الضرر"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-4 right-4"
              onClick={() => setSelectedPhoto(null)}
            >
              إغلاق
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
