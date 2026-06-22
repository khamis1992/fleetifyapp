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
import { ChevronDown, ChevronUp, Calculator, Info, TrendingDown } from 'lucide-react';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import type { ContractCalculation } from '@/hooks/useContractCalculations';

interface ContractPricingBreakdownProps {
  /** Calculation data from useContractCalculations hook */
  calculation: ContractCalculation | null;
  /** Number of rental days */
  rentalDays: number;
  /** Optional additional fees (future enhancement) */
  additionalFees?: Array<{
    name: string;
    amount: number;
    description?: string;
  }>;
  /** Optional insurance amount (future enhancement) */
  insurance?: number;
  /** Optional tax rate (e.g., 0.15 for 15% VAT) */
  taxRate?: number;
  /** Whether to start expanded */
  defaultExpanded?: boolean;
  /** Optional className for styling */
  className?: string;
}

/**
 * ContractPricingBreakdown - Transparent pricing calculator display
 *
 * Shows detailed breakdown of contract pricing including:
 * - Base rental calculation (rate × period)
 * - Mixed pricing optimization details
 * - Minimum price enforcement notices
 * - Savings vs daily rate
 * - Additional fees (when provided)
 * - Insurance (when provided)
 * - Tax/VAT calculation (when provided)
 *
 * Features:
 * - Expandable/collapsible for space efficiency
 * - Color-coded for clarity
 * - Tooltips with explanations
 * - Mobile-responsive
 *
 * Usage:
 * ```tsx
 * const calculation = useContractCalculations(vehicle, contractType, rentalDays);
 * <ContractPricingBreakdown
 *   calculation={calculation}
 *   rentalDays={rentalDays}
 *   taxRate={0.15}
 * />
 * ```
 *
 * Part of K1 Fix #205 - Make calculations transparent
 */
export const ContractPricingBreakdown: React.FC<ContractPricingBreakdownProps> = ({
  calculation,
  rentalDays,
  additionalFees = [],
  insurance = 0,
  taxRate = 0,
  defaultExpanded = false,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { formatCurrency } = useCurrencyFormatter();

  if (!calculation) {
    return null;
  }

  // Calculate subtotal (base + fees + insurance)
  const feesTotal = additionalFees.reduce((sum, fee) => sum + fee.amount, 0);
  const subtotal = calculation.totalAmount + feesTotal + insurance;
  const taxAmount = subtotal * taxRate;
  const grandTotal = subtotal + taxAmount;

  return (
    <Card className={`border-2 border-primary/20 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calculator className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">تفاصيل الحساب</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                شفافية كاملة في احتساب المبلغ
              </p>
            </div>
          </div>
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
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Collapsed View - Show only total */}
        {!isExpanded && (
          <div className="flex items-center justify-between py-2">
            <span className="text-lg font-semibold">المبلغ الإجمالي</span>
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(grandTotal)}
            </span>
          </div>
        )}

        {/* Expanded View - Show full breakdown */}
        {isExpanded && (
          <div className="space-y-4">
            {/* Base Rental Calculation */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">تكلفة الإيجار الأساسية</h4>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p className="text-sm">
                      يتم احتساب أفضل سعر تلقائياً بناءً على عدد الأيام (يومي، أسبوعي، شهري، أو مزيج محسّن)
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                {/* Rate Type Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">نوع التسعير</span>
                  <Badge variant="secondary">{calculation.breakdown.rateType}</Badge>
                </div>

                {/* Mixed Pricing Details */}
                {calculation.breakdown.mixedDetails && (
                  <div className="space-y-2 border-t pt-2 mt-2">
                    <span className="text-xs font-medium text-muted-foreground">التفاصيل المحسّنة:</span>
                    {calculation.breakdown.mixedDetails.months > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span>{calculation.breakdown.mixedDetails.months} شهر × {formatCurrency(calculation.monthlyRate)}</span>
                        <span className="font-medium">{formatCurrency(calculation.breakdown.mixedDetails.monthlyPortion)}</span>
                      </div>
                    )}
                    {calculation.breakdown.mixedDetails.weeks > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span>{calculation.breakdown.mixedDetails.weeks} أسبوع × {formatCurrency(calculation.weeklyRate)}</span>
                        <span className="font-medium">{formatCurrency(calculation.breakdown.mixedDetails.weeklyPortion)}</span>
                      </div>
                    )}
                    {calculation.breakdown.mixedDetails.remainingDays > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span>{calculation.breakdown.mixedDetails.remainingDays} يوم × {formatCurrency(calculation.dailyRate)}</span>
                        <span className="font-medium">{formatCurrency(calculation.breakdown.mixedDetails.dailyPortion)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Standard Rate Calculation */}
                {!calculation.breakdown.mixedDetails && !calculation.isCustomAmount && (
                  <div className="flex items-center justify-between text-sm">
                    <span>
                      {calculation.breakdown.period} × {formatCurrency(
                        calculation.breakdown.baseAmount / calculation.breakdown.period
                      )}
                    </span>
                    <span className="font-medium">{formatCurrency(calculation.breakdown.baseAmount)}</span>
                  </div>
                )}

                {/* Custom Amount */}
                {calculation.isCustomAmount && (
                  <div className="flex items-center justify-between text-sm">
                    <span>مبلغ مخصص ({rentalDays} يوم)</span>
                    <span className="font-medium">{formatCurrency(calculation.customAmount || 0)}</span>
                  </div>
                )}

                {/* Minimum Price Enforcement Notice */}
                {calculation.breakdown.minimumPriceEnforced && (
                  <div className="mt-2 p-2 bg-warning/10 border border-warning/30 rounded text-xs">
                    <span className="text-warning font-medium">تنبيه:</span> تم تطبيق الحد الأدنى للسعر
                    {calculation.breakdown.originalAmount && (
                      <> (السعر الأصلي: {formatCurrency(calculation.breakdown.originalAmount)})</>
                    )}
                  </div>
                )}

                {/* Savings Badge */}
                {calculation.breakdown.savings && calculation.breakdown.savings > 0 && (
                  <div className="mt-2 p-2 bg-success/10 border border-success/30 rounded flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-success" />
                    <span className="text-xs text-success font-medium">
                      وفّرت {formatCurrency(calculation.breakdown.savings)} مقارنة بالسعر اليومي!
                    </span>
                  </div>
                )}

                {/* Total Base Amount */}
                <Separator className="my-2" />
                <div className="flex items-center justify-between font-semibold">
                  <span>المجموع الأساسي</span>
                  <span className="text-lg text-primary">{formatCurrency(calculation.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Additional Fees (if any) */}
            {additionalFees.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">رسوم إضافية</h4>
                <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                  {additionalFees.map((fee, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span>{fee.name}</span>
                        {fee.description && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{fee.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <span className="font-medium">{formatCurrency(fee.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Insurance (if any) */}
            {insurance > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">التأمين</span>
                <span className="font-medium">{formatCurrency(insurance)}</span>
              </div>
            )}

            {/* Subtotal (if there are fees/insurance) */}
            {(feesTotal > 0 || insurance > 0) && (
              <>
                <Separator />
                <div className="flex items-center justify-between font-semibold">
                  <span>المجموع قبل الضريبة</span>
                  <span className="text-lg">{formatCurrency(subtotal)}</span>
                </div>
              </>
            )}

            {/* Tax/VAT (if applicable) */}
            {taxRate > 0 && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    ضريبة القيمة المضافة ({(taxRate * 100).toFixed(0)}%)
                  </span>
                  <span className="font-medium">{formatCurrency(taxAmount)}</span>
                </div>
                <Separator />
              </>
            )}

            {/* Grand Total */}
            <div className="bg-primary/10 rounded-lg p-4 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">المبلغ الإجمالي النهائي</span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
              {rentalDays > 0 && (
                <p className="text-xs text-muted-foreground mt-2 text-right">
                  (معدل {formatCurrency(grandTotal / rentalDays)} في اليوم)
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
