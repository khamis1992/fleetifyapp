/**
 * VehicleCheckInOut Component
 *
 * Purpose: Complete vehicle inspection workflow for rental start (check-in) and end (check-out)
 * Features:
 * - Fuel level tracking with slider
 * - Odometer reading input
 * - Cleanliness rating (1-5 stars)
 * - Photo upload with preview
 * - Damage documentation (simplified textarea)
 * - Customer signature capture
 * - Comparison with previous inspection (for check-out)
 *
 * @module components/vehicles/VehicleCheckInOut
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { SignatureInput } from '@/components/ui/SignatureInput';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Star,
  Upload,
  X,
  Camera,
  FileText,
  Fuel,
  Gauge,
  Sparkles,
  AlertCircle,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateInspection } from '@/hooks/useCreateInspection';
import { useVehicleInspections, useInspectionComparison } from '@/hooks/useVehicleInspections';
import type { DamageRecord } from '@/hooks/useVehicleInspections';

/**
 * VehicleCheckInOut Props
 */
interface VehicleCheckInOutProps {
  /** Contract ID */
  contractId: string;
  /** Vehicle ID */
  vehicleId: string;
  /** Inspection type */
  type: 'check_in' | 'check_out';
  /** Callback when inspection is completed */
  onComplete?: () => void;
  /** Callback to cancel */
  onCancel?: () => void;
}

/**
 * VehicleCheckInOut Component
 *
 * @example
 * <VehicleCheckInOut
 *   contractId="xxx"
 *   vehicleId="yyy"
 *   type="check_in"
 *   onComplete={() => navigate('/contracts')}
 * />
 */
export function VehicleCheckInOut({
  contractId,
  vehicleId,
  type,
  onComplete,
  onCancel,
}: VehicleCheckInOutProps) {
  // State
  const [fuelLevel, setFuelLevel] = useState(100);
  const [odometerReading, setOdometerReading] = useState(0);
  const [cleanlinessRating, setCleanlinessRating] = useState(5);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string[]>([]);
  const [damageNotes, setDamageNotes] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [customerSignature, setCustomerSignature] = useState<string | null>(null);

  // Hooks
  const createInspection = useCreateInspection();
  const { data: previousInspections } = useVehicleInspections({
    contractId,
    inspectionType: 'check_in',
    enabled: type === 'check_out',
  });
  const { data: comparison } = useInspectionComparison(contractId);

  // Get previous check-in data for comparison
  const previousCheckIn = previousInspections?.[0];

  /**
   * Handle photo upload
   */
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    // Limit to 10 photos
    const remainingSlots = 10 - photos.length;
    const filesToAdd = files.slice(0, remainingSlots);

    // Add files
    setPhotos([...photos, ...filesToAdd]);

    // Generate previews
    filesToAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  /**
   * Remove photo
   */
  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
    setPhotoPreview(photoPreview.filter((_, i) => i !== index));
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    // Validation
    if (!customerSignature) {
      alert('يرجى إضافة توقيع العميل');
      return;
    }

    if (odometerReading <= 0) {
      alert('يرجى إدخال قراءة العداد');
      return;
    }

    // Parse damage notes into structured format (simplified)
    const damages: DamageRecord[] = damageNotes
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => ({
        location: 'غير محدد',
        severity: 'minor' as const,
        description: line.trim(),
      }));

    // Create inspection
    await createInspection.mutateAsync({
      contract_id: contractId,
      vehicle_id: vehicleId,
      inspection_type: type,
      fuel_level: fuelLevel,
      odometer_reading: odometerReading,
      cleanliness_rating: cleanlinessRating,
      exterior_condition: damages,
      interior_condition: [],
      notes: generalNotes,
      customer_signature: customerSignature,
      photos,
    });

    // Callback
    if (onComplete) {
      onComplete();
    }
  };

  // Inspection type display
  const isCheckIn = type === 'check_in';
  const title = isCheckIn ? 'استلام المركبة' : 'تسليم المركبة';
  const submitButtonText = isCheckIn ? 'تأكيد الاستلام' : 'تأكيد التسليم';

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">{title}</h2>
          <p className="text-muted-foreground mt-1">
            {isCheckIn
              ? 'قم بفحص المركبة وتوثيق حالتها قبل تسليمها للعميل'
              : 'قم بفحص المركبة وتوثيق حالتها عند استلامها من العميل'}
          </p>
        </div>
        <Badge variant={isCheckIn ? 'default' : 'secondary'} className="text-lg px-4 py-2">
          {isCheckIn ? 'استلام' : 'تسليم'}
        </Badge>
      </div>

      {/* Comparison Alert (for check-out) */}
      {!isCheckIn && previousCheckIn && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            تم استلام المركبة في {new Date(previousCheckIn.inspection_date).toLocaleDateString('ar-SA')} مع
            مستوى وقود {previousCheckIn.fuel_level}% وقراءة عداد {previousCheckIn.odometer_reading?.toLocaleString()} كم
          </AlertDescription>
        </Alert>
      )}

      {/* Fuel Level */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fuel className="h-5 w-5" />
            مستوى الوقود
          </CardTitle>
          <CardDescription>حرك الشريط لتحديد مستوى الوقود الحالي</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">فارغ</span>
            <span className="text-3xl font-bold text-primary">{fuelLevel}%</span>
            <span className="text-sm text-muted-foreground">ممتلئ</span>
          </div>
          <Slider
            value={[fuelLevel]}
            onValueChange={([value]) => setFuelLevel(value)}
            min={0}
            max={100}
            step={5}
            className="w-full"
          />
          {!isCheckIn && previousCheckIn && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>مستوى الاستلام: {previousCheckIn.fuel_level}%</span>
              {fuelLevel < (previousCheckIn.fuel_level || 0) && (
                <Badge variant="destructive">نقص {(previousCheckIn.fuel_level || 0) - fuelLevel}%</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Odometer Reading */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            قراءة العداد
          </CardTitle>
          <CardDescription>أدخل قراءة العداد الحالية بالكيلومتر</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              type="number"
              value={odometerReading}
              onChange={(e) => setOdometerReading(Number(e.target.value))}
              placeholder="مثال: 50000"
              className="text-2xl font-bold text-center"
              min={0}
            />
            <span className="text-lg text-muted-foreground">كم</span>
          </div>
          {!isCheckIn && previousCheckIn && previousCheckIn.odometer_reading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>قراءة الاستلام: {previousCheckIn.odometer_reading.toLocaleString()} كم</span>
              </div>
              {odometerReading > previousCheckIn.odometer_reading && (
                <Alert>
                  <ArrowRight className="h-4 w-4" />
                  <AlertDescription>
                    المسافة المقطوعة: {(odometerReading - previousCheckIn.odometer_reading).toLocaleString()} كم
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cleanliness Rating */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            تقييم النظافة
          </CardTitle>
          <CardDescription>اختر تقييم نظافة المركبة من 1 إلى 5 نجوم</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <Button
                key={rating}
                type="button"
                variant={cleanlinessRating >= rating ? 'default' : 'outline'}
                size="lg"
                onClick={() => setCleanlinessRating(rating)}
                className="w-16 h-16"
              >
                <Star
                  className={cn(
                    'h-8 w-8',
                    cleanlinessRating >= rating && 'fill-current'
                  )}
                />
              </Button>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            {cleanlinessRating === 5 && 'ممتازة - نظيفة جداً'}
            {cleanlinessRating === 4 && 'جيدة جداً - نظيفة'}
            {cleanlinessRating === 3 && 'جيدة - نظافة مقبولة'}
            {cleanlinessRating === 2 && 'متوسطة - تحتاج تنظيف'}
            {cleanlinessRating === 1 && 'ضعيفة - تحتاج تنظيف شامل'}
          </p>
        </CardContent>
      </Card>

      {/* Photo Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            صور المركبة
          </CardTitle>
          <CardDescription>التقط صور للمركبة من جميع الزوايا (حد أقصى 10 صور)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              disabled={photos.length >= 10}
              className="hidden"
              id="photo-upload"
            />
            <Label
              htmlFor="photo-upload"
              className={cn(
                'flex items-center justify-center gap-2 border-2 border-dashed rounded-md p-4 cursor-pointer hover:bg-accent transition-colors',
                photos.length >= 10 && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Upload className="h-5 w-5" />
              <span>اختر صور ({photos.length}/10)</span>
            </Label>
          </div>

          {photoPreview.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {photoPreview.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`صورة ${index + 1}`}
                    className="rounded-md w-full h-32 object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removePhoto(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Damage Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            توثيق الأضرار
          </CardTitle>
          <CardDescription>
            سجل أي أضرار أو خدوش على المركبة (سطر واحد لكل ضرر)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={damageNotes}
            onChange={(e) => setDamageNotes(e.target.value)}
            placeholder={'مثال:\nخدش بسيط على الباب الأمامي الأيمن\nكسر في المرآة اليسرى\nصدأ على الصادم الخلفي'}
            rows={6}
            className="font-mono"
          />
          {damageNotes && (
            <p className="text-sm text-muted-foreground mt-2">
              عدد الأضرار المسجلة: {damageNotes.split('\n').filter((l) => l.trim()).length}
            </p>
          )}
        </CardContent>
      </Card>

      {/* General Notes */}
      <Card>
        <CardHeader>
          <CardTitle>ملاحظات عامة</CardTitle>
          <CardDescription>أي ملاحظات إضافية عن حالة المركبة</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            placeholder="اكتب أي ملاحظات إضافية هنا..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Customer Signature */}
      <Card>
        <CardHeader>
          <CardTitle>توقيع العميل</CardTitle>
          <CardDescription>يؤكد العميل بتوقيعه على دقة المعلومات المذكورة أعلاه</CardDescription>
        </CardHeader>
        <CardContent>
          <SignatureInput
            onSignatureChange={setCustomerSignature}
            label="توقيع العميل"
            required
          />
        </CardContent>
      </Card>

      <Separator />

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-4">
        <Button type="button" variant="outline" onClick={onCancel} size="lg">
          إلغاء
        </Button>

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={createInspection.isPending || !customerSignature}
          size="lg"
          className="min-w-[200px]"
        >
          {createInspection.isPending ? (
            'جاري الحفظ...'
          ) : (
            <>
              <CheckCircle className="mr-2 h-5 w-5" />
              {submitButtonText}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
