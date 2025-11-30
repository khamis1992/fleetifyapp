/**
 * Pricing Suggestions Component
 * Displays smart pricing suggestions with quick action buttons
 * Integrates with usePricingSuggestions hook
 */

import React from 'react';
import { usePricingSuggestions } from '@/hooks/usePricingSuggestions';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Lightbulb,
  History,
  Car,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PricingSuggestionsProps {
  /** Contract type */
  contractType: string;
  /** Rental duration in days */
  rentalDays: number;
  /** Vehicle ID (optional) */
  vehicleId?: string;
  /** Customer ID (optional) */
  customerId?: string;
  /** Current price value */
  currentPrice?: number;
  /** Callback when user selects a suggestion */
  onSelectPrice: (price: number) => void;
  /** Show expanded details */
  defaultExpanded?: boolean;
  /** Compact mode */
  compact?: boolean;
}

// Confidence badge component
const ConfidenceBadge: React.FC<{ confidence: 'high' | 'medium' | 'low' }> = ({ confidence }) => {
  const config = {
    high: { label: 'موثوقية عالية', color: 'bg-green-100 text-green-800' },
    medium: { label: 'موثوقية متوسطة', color: 'bg-amber-100 text-amber-800' },
    low: { label: 'تقدير أولي', color: 'bg-neutral-100 text-neutral-800' },
  };

  return (
    <Badge className={cn('text-xs', config[confidence].color)}>
      {config[confidence].label}
    </Badge>
  );
};

// Quick action button
const QuickPriceButton: React.FC<{
  label: string;
  price: number;
  icon: React.ElementType;
  isSelected: boolean;
  onClick: () => void;
  tooltip?: string;
}> = ({ label, price, icon: Icon, isSelected, onClick, tooltip }) => {
  const { formatCurrency } = useCurrencyFormatter();

  const button = (
    <Button
      type="button"
      variant={isSelected ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 h-auto py-2 px-3',
        isSelected && 'bg-coral-500 hover:bg-coral-600'
      )}
    >
      <Icon className="h-4 w-4" />
      <div className="text-right">
        <div className="text-xs opacity-80">{label}</div>
        <div className="font-semibold">{formatCurrency(price)}</div>
      </div>
      {isSelected && <Check className="h-4 w-4 mr-1" />}
    </Button>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
};

// Loading skeleton
const PricingSkeleton: React.FC = () => (
  <Card>
    <CardHeader className="pb-2">
      <Skeleton className="h-5 w-32" />
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="flex gap-2">
        <Skeleton className="h-14 w-28" />
        <Skeleton className="h-14 w-28" />
        <Skeleton className="h-14 w-28" />
      </div>
    </CardContent>
  </Card>
);

// Main component
export const PricingSuggestions: React.FC<PricingSuggestionsProps> = ({
  contractType,
  rentalDays,
  vehicleId,
  customerId,
  currentPrice,
  onSelectPrice,
  defaultExpanded = false,
  compact = false,
}) => {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  const { formatCurrency } = useCurrencyFormatter();

  const { data: pricing, isLoading, error } = usePricingSuggestions({
    contractType,
    rentalDays,
    vehicleId,
    customerId,
    enabled: !!contractType && rentalDays > 0,
  });

  if (isLoading) {
    return <PricingSkeleton />;
  }

  if (error || !pricing) {
    return null;
  }

  // Build available price options
  const priceOptions: {
    key: string;
    label: string;
    price: number;
    icon: React.ElementType;
    tooltip: string;
  }[] = [];

  // Option 1: Customer's last price
  if (pricing.customerHistory?.lastPrice) {
    priceOptions.push({
      key: 'customer_last',
      label: 'آخر سعر للعميل',
      price: pricing.customerHistory.lastPrice,
      icon: History,
      tooltip: `آخر عقد: ${new Date(pricing.customerHistory.lastDate).toLocaleDateString('ar-QA')}`,
    });
  }

  // Option 2: Similar contracts average
  if (pricing.similarContractsAverage) {
    priceOptions.push({
      key: 'similar_avg',
      label: 'متوسط العقود',
      price: pricing.similarContractsAverage,
      icon: TrendingUp,
      tooltip: `متوسط ${pricing.sampleSize} عقود مشابهة`,
    });
  }

  // Option 3: Vehicle default price
  if (pricing.vehicleDefaultPrice) {
    priceOptions.push({
      key: 'vehicle_default',
      label: 'سعر المركبة',
      price: pricing.vehicleDefaultPrice,
      icon: Car,
      tooltip: 'السعر الافتراضي المسجل للمركبة',
    });
  }

  // Option 4: Smart suggestion (always available)
  priceOptions.push({
    key: 'smart',
    label: 'اقتراح ذكي',
    price: pricing.suggestedPrice,
    icon: Sparkles,
    tooltip: 'سعر محسوب بناءً على البيانات المتاحة',
  });

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2 items-center p-2 bg-amber-50 rounded-lg border border-amber-200">
        <Lightbulb className="h-4 w-4 text-amber-600" />
        <span className="text-sm text-amber-800">اقتراحات:</span>
        {priceOptions.slice(0, 3).map((option) => (
          <Button
            key={option.key}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onSelectPrice(option.price)}
            className={cn(
              'h-7 px-2 text-xs',
              currentPrice === option.price && 'bg-amber-200'
            )}
          >
            {formatCurrency(option.price)}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
            <Lightbulb className="h-4 w-4" />
            مساعدات التسعير الذكية
            <ConfidenceBadge confidence={pricing.confidence} />
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-6 px-2"
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Price Buttons */}
        <div className="flex flex-wrap gap-2">
          {priceOptions.map((option) => (
            <QuickPriceButton
              key={option.key}
              label={option.label}
              price={option.price}
              icon={option.icon}
              isSelected={currentPrice === option.price}
              onClick={() => onSelectPrice(option.price)}
              tooltip={option.tooltip}
            />
          ))}
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div className="space-y-3 pt-2 border-t border-amber-200">
            {/* Customer History */}
            {pricing.customerHistory && (
              <div className="flex items-start gap-2 text-sm">
                <History className="h-4 w-4 text-amber-600 mt-0.5" />
                <div>
                  <span className="font-medium">تاريخ العميل:</span>
                  <span className="text-neutral-600 mr-1">
                    {pricing.customerHistory.contractCount} عقود سابقة، 
                    متوسط {formatCurrency(pricing.customerHistory.averagePrice)}
                  </span>
                </div>
              </div>
            )}

            {/* Breakdown */}
            <div className="bg-white rounded-lg p-3 space-y-2">
              <div className="text-xs font-medium text-neutral-500 mb-2">تفاصيل الحساب:</div>
              {pricing.breakdown.map((item, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex items-center justify-between text-sm',
                    item.type === 'discount' && 'text-green-600'
                  )}
                >
                  <span>{item.label}</span>
                  <span className="font-medium">
                    {item.value > 0 ? '+' : ''}{formatCurrency(item.value)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm font-bold pt-2 border-t">
                <span>السعر المقترح</span>
                <span className="text-coral-600">{formatCurrency(pricing.suggestedPrice)}</span>
              </div>
            </div>

            {/* Info Note */}
            <div className="flex items-start gap-2 text-xs text-neutral-500">
              <Info className="h-3.5 w-3.5 mt-0.5" />
              <span>
                هذه اقتراحات مبنية على البيانات التاريخية. السعر النهائي يُحدد بالاتفاق مع العميل.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PricingSuggestions;

