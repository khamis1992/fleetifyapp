import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Check, AlertTriangle } from 'lucide-react';
import {
  isValidHexColor,
  normalizeHexColor,
  getContrastRatio,
  getContrastLevel,
  hexToHsl
} from '@/lib/color-utils';

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  description?: string;
  showContrastCheck?: boolean;
  contrastBackgroundColor?: string;
  disabled?: boolean;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  label,
  description,
  showContrastCheck = false,
  contrastBackgroundColor = '#ffffff',
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync input value when external value changes
  React.useEffect(() => {
    setInputValue(value);
    setError(null);
  }, [value]);

  const handleColorPickerChange = (newValue: string) => {
    const normalized = normalizeHexColor(newValue);
    setInputValue(normalized);
    onChange(normalized);
    setError(null);
  };

  const handleTextInputChange = (newValue: string) => {
    setInputValue(newValue);

    if (newValue === '' || newValue === '#') {
      setError(null);
      return;
    }

    if (!isValidHexColor(newValue)) {
      setError('صيغة غير صالحة. استخدم #RRGGBB');
      return;
    }

    setError(null);
    const normalized = normalizeHexColor(newValue);
    onChange(normalized);
  };

  const handleBlur = () => {
    if (!isValidHexColor(inputValue)) {
      setInputValue(value);
      setError(null);
    } else {
      const normalized = normalizeHexColor(inputValue);
      setInputValue(normalized);
      onChange(normalized);
    }
  };

  // Calculate contrast info
  const contrastInfo = React.useMemo(() => {
    if (!showContrastCheck || !isValidHexColor(value)) return null;

    const ratio = getContrastRatio(value, contrastBackgroundColor);
    return {
      ratio: ratio.toFixed(2),
      ...getContrastLevel(ratio)
    };
  }, [value, contrastBackgroundColor, showContrastCheck]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={`color-${label}`} className="text-sm font-medium">
          {label}
        </Label>
        {contrastInfo && (
          <Badge
            variant={contrastInfo.variant}
            className="text-xs"
            title={`نسبة التباين: ${contrastInfo.ratio}:1`}
          >
            {contrastInfo.ratio}:1
            {contrastInfo.level === 'fail' && (
              <AlertTriangle className="h-3 w-3 mr-1" />
            )}
          </Badge>
        )}
      </div>

      <div className="flex gap-3 items-center">
        {/* Color Picker Input */}
        <div className="relative group">
          <Input
            id={`color-${label}`}
            type="color"
            value={value}
            onChange={(e) => handleColorPickerChange(e.target.value)}
            disabled={disabled}
            className="w-16 h-16 p-1 border rounded-lg cursor-pointer"
            title="اختر اللون"
          />
          {/* Quick preview tooltip */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-1 -right-1 h-6 w-6 p-0 bg-background shadow-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={disabled}
              >
                <Eye className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" side="right">
              <div className="space-y-2">
                <p className="text-xs font-medium">معاينة اللون</p>
                <div className="flex gap-2">
                  <div
                    className="w-16 h-16 rounded border shadow-sm"
                    style={{ backgroundColor: value }}
                  />
                  <div className="space-y-1 text-xs">
                    <div>HEX: {value}</div>
                    <div>HSL: {hexToHsl(value)}</div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Visual Preview Bar */}
        <div className="flex-1">
          <div
            className="w-full h-10 rounded border shadow-sm transition-colors"
            style={{ backgroundColor: value }}
          />
        </div>
      </div>

      {/* Text Input */}
      {showAdvanced && (
        <div className="relative">
          <Input
            value={inputValue}
            onChange={(e) => handleTextInputChange(e.target.value)}
            onBlur={handleBlur}
            placeholder="#2563eb"
            className="font-mono text-sm pr-10"
            disabled={disabled}
            maxLength={7}
          />
          {error && (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {error}
            </p>
          )}
          {!error && isValidHexColor(inputValue) && (
            <Check className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
          )}
        </div>
      )}

      {description && !error && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      {/* Toggle Advanced Button */}
      <Button
        variant="link"
        size="sm"
        className="h-auto p-0 text-xs"
        onClick={() => setShowAdvanced(!showAdvanced)}
        type="button"
      >
        {showAdvanced ? (
          <>
            <EyeOff className="h-3 w-3 mr-1" />
            إخفاء الإدخال اليدوي
          </>
        ) : (
          <>
            <Eye className="h-3 w-3 mr-1" />
            إدخال يدوي
          </>
        )}
      </Button>

      {/* Contrast Warning */}
      {contrastInfo && contrastInfo.level === 'fail' && (
        <div className="flex items-start gap-2 p-2 bg-destructive/10 rounded-md border border-destructive/20">
          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
          <div className="text-xs text-destructive">
            <p className="font-medium">تنبيه: تباين منخفض</p>
            <p className="opacity-80">هذا اللون قد لا يكون مقروءاً على الخلفية الحالية. يُنصح باستخدام لون أفتح أو أغمق لتحسين إمكانية الوصول.</p>
          </div>
        </div>
      )}
    </div>
  );
};
