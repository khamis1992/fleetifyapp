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
import { ChevronDown, ChevronUp, Receipt, Info, Percent, Calculator } from 'lucide-react';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number; // Percentage (0-100) or fixed amount
  discountType?: 'percentage' | 'fixed';
  taxRate?: number; // Percentage (e.g., 0.15 for 15% VAT)
  notes?: string;
}

interface InvoiceLineItemBreakdownProps {
  /** Array of line items */
  lineItems: InvoiceLineItem[];
  /** Overall discount applied to subtotal (optional) */
  overallDiscount?: {
    amount: number;
    type: 'percentage' | 'fixed';
    description?: string;
  };
  /** Tax rate applied to final amount (e.g., 0.15 for 15% VAT) */
  taxRate?: number;
  /** Tax name (e.g., "VAT", "Sales Tax") */
  taxName?: string;
  /** Additional fees (shipping, handling, etc.) */
  additionalFees?: Array<{
    name: string;
    amount: number;
    taxable?: boolean;
  }>;
  /** Whether to start expanded */
  defaultExpanded?: boolean;
  /** Optional className */
  className?: string;
  /** Show calculation formulas */
  showFormulas?: boolean;
}

/**
 * InvoiceLineItemBreakdown - Transparent invoice calculation display
 *
 * Shows detailed breakdown of invoice calculations:
 * - Each line item: Quantity × Unit Price = Line Total
 * - Per-item discounts
 * - Subtotal calculation
 * - Overall discount (if any)
 * - Additional fees
 * - Tax calculation
 * - Grand total with formula
 *
 * Features:
 * - Expandable/collapsible
 * - Formula display
 * - Color-coded sections
 * - Tooltips with explanations
 * - Mobile-responsive
 *
 * Usage:
 * ```tsx
 * <InvoiceLineItemBreakdown
 *   lineItems={[
 *     {
 *       id: '1',
 *       description: 'Car Rental - Toyota Camry',
 *       quantity: 7,
 *       unitPrice: 150,
 *       discount: 10,
 *       discountType: 'percentage'
 *     }
 *   ]}
 *   taxRate={0.15}
 *   taxName="VAT"
 * />
 * ```
 *
 * Part of K1 Fix #215 - Make invoice calculations transparent
 */
export const InvoiceLineItemBreakdown: React.FC<InvoiceLineItemBreakdownProps> = ({
  lineItems = [],
  overallDiscount,
  taxRate = 0,
  taxName = 'ضريبة القيمة المضافة',
  additionalFees = [],
  defaultExpanded = false,
  className = '',
  showFormulas = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { formatCurrency } = useCurrencyFormatter();

  // Calculate line item totals
  const lineItemsWithTotals = lineItems.map((item) => {
    const baseAmount = item.quantity * item.unitPrice;
    let discountAmount = 0;

    if (item.discount && item.discount > 0) {
      discountAmount =
        item.discountType === 'percentage'
          ? (baseAmount * item.discount) / 100
          : item.discount;
    }

    const lineTotal = baseAmount - discountAmount;
    const lineTax = item.taxRate ? lineTotal * item.taxRate : 0;
    const lineTotalWithTax = lineTotal + lineTax;

    return {
      ...item,
      baseAmount,
      discountAmount,
      lineTotal,
      lineTax,
      lineTotalWithTax,
    };
  });

  // Calculate subtotal (sum of all line totals before overall discount)
  const subtotal = lineItemsWithTotals.reduce((sum, item) => sum + item.lineTotal, 0);

  // Calculate overall discount
  let overallDiscountAmount = 0;
  if (overallDiscount) {
    overallDiscountAmount =
      overallDiscount.type === 'percentage'
        ? (subtotal * overallDiscount.amount) / 100
        : overallDiscount.amount;
  }

  const subtotalAfterDiscount = subtotal - overallDiscountAmount;

  // Calculate additional fees
  const taxableFees = additionalFees
    .filter((fee) => fee.taxable !== false)
    .reduce((sum, fee) => sum + fee.amount, 0);

  const nonTaxableFees = additionalFees
    .filter((fee) => fee.taxable === false)
    .reduce((sum, fee) => sum + fee.amount, 0);

  const totalBeforeTax = subtotalAfterDiscount + taxableFees;

  // Calculate tax
  const taxAmount = totalBeforeTax * taxRate;

  // Calculate grand total
  const grandTotal = totalBeforeTax + taxAmount + nonTaxableFees;

  return (
    <Card className={`border-2 border-primary/20 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Receipt className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">تفاصيل الفاتورة</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                احتساب شفاف لجميع البنود
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
            <span className="text-lg font-semibold">الإجمالي النهائي</span>
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(grandTotal)}
            </span>
          </div>
        )}

        {/* Expanded View - Show full breakdown */}
        {isExpanded && (
          <div className="space-y-4">
            {/* Line Items */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">بنود الفاتورة</h4>
                <Badge variant="secondary">{lineItems.length} بند</Badge>
              </div>

              {lineItemsWithTotals.map((item, index) => (
                <div
                  key={item.id}
                  className="bg-muted/50 rounded-lg p-4 space-y-2"
                >
                  {/* Item Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <span className="font-medium">{item.description}</span>
                      {item.notes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Calculation */}
                  {showFormulas && (
                    <div className="text-sm space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>
                          {item.quantity} × {formatCurrency(item.unitPrice)}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(item.baseAmount)}
                        </span>
                      </div>

                      {/* Item Discount */}
                      {item.discountAmount > 0 && (
                        <div className="flex items-center justify-between text-success">
                          <span className="flex items-center gap-1">
                            <Percent className="h-3 w-3" />
                            خصم
                            {item.discountType === 'percentage' && (
                              <> ({item.discount}%)</>
                            )}
                          </span>
                          <span>-{formatCurrency(item.discountAmount)}</span>
                        </div>
                      )}

                      {/* Item Tax */}
                      {item.lineTax > 0 && (
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>ضريبة ({(item.taxRate! * 100).toFixed(0)}%)</span>
                          <span>+{formatCurrency(item.lineTax)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <Separator className="my-2" />

                  {/* Line Total */}
                  <div className="flex items-center justify-between font-semibold">
                    <span>المجموع</span>
                    <span className="text-lg text-primary">
                      {formatCurrency(item.lineTotal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Subtotal */}
            <Separator />
            <div className="flex items-center justify-between font-semibold">
              <span>المجموع الفرعي</span>
              <span className="text-lg">{formatCurrency(subtotal)}</span>
            </div>

            {/* Overall Discount */}
            {overallDiscount && overallDiscountAmount > 0 && (
              <div className="bg-success/10 border border-success/20 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-success" />
                    <span className="font-medium text-success">
                      {overallDiscount.description || 'خصم إجمالي'}
                      {overallDiscount.type === 'percentage' && (
                        <> ({overallDiscount.amount}%)</>
                      )}
                    </span>
                  </div>
                  <span className="font-semibold text-success">
                    -{formatCurrency(overallDiscountAmount)}
                  </span>
                </div>
              </div>
            )}

            {/* Subtotal After Discount */}
            {overallDiscountAmount > 0 && (
              <>
                <div className="flex items-center justify-between font-semibold">
                  <span>المجموع بعد الخصم</span>
                  <span className="text-lg">{formatCurrency(subtotalAfterDiscount)}</span>
                </div>
              </>
            )}

            {/* Additional Fees */}
            {additionalFees.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">رسوم إضافية</h4>
                {additionalFees.map((fee, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span>{fee.name}</span>
                      {!fee.taxable && (
                        <Badge variant="outline" className="text-xs">
                          معفى من الضريبة
                        </Badge>
                      )}
                    </div>
                    <span className="font-medium">{formatCurrency(fee.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Tax */}
            {taxRate > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {taxName} ({(taxRate * 100).toFixed(0)}%)
                      </span>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p className="text-sm">
                            يتم احتساب الضريبة على المجموع بعد الخصم + الرسوم الخاضعة للضريبة
                          </p>
                          <p className="text-xs mt-1 text-muted-foreground">
                            {formatCurrency(totalBeforeTax)} × {(taxRate * 100).toFixed(0)}% = {formatCurrency(taxAmount)}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <span className="font-semibold">{formatCurrency(taxAmount)}</span>
                  </div>
                </div>
              </>
            )}

            {/* Grand Total */}
            <Separator />
            <div className="bg-primary/10 rounded-lg p-4 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  <span className="text-lg font-bold">الإجمالي النهائي</span>
                </div>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(grandTotal)}
                </span>
              </div>

              {/* Formula */}
              {showFormulas && (
                <div className="mt-3 pt-3 border-t border-primary/20 text-xs text-muted-foreground">
                  <p className="text-center">
                    ({formatCurrency(subtotal)}
                    {overallDiscountAmount > 0 && (
                      <> - {formatCurrency(overallDiscountAmount)}</>
                    )}
                    {taxableFees > 0 && <> + {formatCurrency(taxableFees)}</>}
                    ) × {((1 + taxRate) * 100).toFixed(0)}%
                    {nonTaxableFees > 0 && <> + {formatCurrency(nonTaxableFees)}</>}
                    {' = '}
                    {formatCurrency(grandTotal)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
