/**
 * IntegratedVehicleInspection Component
 *
 * Purpose: Integrated check-in/check-out system with:
 * - Automatic check-in during contract activation
 * - Check-out reminder when contract ends
 * - Mobile photo capture with camera support
 * - Side-by-side comparison view
 * - Better vehicle condition tracking
 *
 * Impact: Better vehicle condition tracking, reduced disputes, faster processing
 *
 * @module components/vehicles/IntegratedVehicleInspection
 */

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { SignatureInput } from '@/components/ui/SignatureInput';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  Clock,
  Eye,
  AlertTriangle,
  ImagePlus,
  Maximize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateInspection } from '@/hooks/useCreateInspection';
import { useVehicleInspections, useInspectionComparison } from '@/hooks/useVehicleInspections';
import type { DamageRecord, VehicleInspection } from '@/hooks/useVehicleInspections';
import { toast } from 'sonner';

/**
 * IntegratedVehicleInspection Props
 */
interface IntegratedVehicleInspectionProps {
  /** Contract ID */
  contractId: string;
  /** Vehicle ID */
  vehicleId: string;
  /** Inspection type */
  type: 'check_in' | 'check_out';
  /** Vehicle details */
  vehicle?: {
    plate_number: string;
    make: string;
    model: string;
    year?: number;
  };
  /** Contract details */
  contract?: {
    contract_number: string;
    start_date: string;
    end_date: string;
    customer_name?: string;
  };
  /** Callback when inspection is completed */
  onComplete?: () => void;
  /** Callback to cancel */
  onCancel?: () => void;
  /** Show as reminder */
  isReminder?: boolean;
}

/**
 * IntegratedVehicleInspection Component
 *
 * @example
 * <IntegratedVehicleInspection
 *   contractId="xxx"
 *   vehicleId="yyy"
 *   type="check_in"
 *   onComplete={() => activateContract()}
 * />
 */
export function IntegratedVehicleInspection({
  contractId,
  vehicleId,
  type,
  vehicle,
  contract,
  onComplete,
  onCancel,
  isReminder = false,
}: IntegratedVehicleInspectionProps) {
  // State
  const [fuelLevel, setFuelLevel] = useState(100);
  const [odometerReading, setOdometerReading] = useState(0);
  const [cleanlinessRating, setCleanlinessRating] = useState(5);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string[]>([]);
  const [damageNotes, setDamageNotes] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [customerSignature, setCustomerSignature] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [viewMode, setViewMode] = useState<'form' | 'comparison'>('form');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Refs for camera
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
   * Handle camera capture (mobile)
   */
  const handleCameraCapture = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  /**
   * Handle file upload
   */
  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  /**
   * Process uploaded/captured photos
   */
  const processPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    // Limit to 10 photos
    const remainingSlots = 10 - photos.length;
    const filesToAdd = files.slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      toast.warning(`يمكنك إضافة ${remainingSlots} صور فقط`);
    }

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

    toast.success(`تم إضافة ${filesToAdd.length} صورة`);
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
      toast.error('يرجى إضافة توقيع العميل');
      return;
    }

    if (odometerReading <= 0) {
      toast.error('يرجى إدخال قراءة العداد');
      return;
    }

    if (photos.length === 0) {
      toast.error('يرجى إضافة صورة واحدة على الأقل');
      return;
    }

    try {
      // Parse damage notes into structured format
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

      toast.success(
        type === 'check_in'
          ? 'تم توثيق استلام المركبة بنجاح'
          : 'تم توثيق تسليم المركبة بنجاح'
      );

      // Callback
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Error creating inspection:', error);
      toast.error('حدث خطأ أثناء حفظ الفحص');
    }
  };

  // Inspection type display
  const isCheckIn = type === 'check_in';
  const title = isCheckIn ? 'استلام المركبة' : 'تسليم المركبة';
  const submitButtonText = isCheckIn ? 'تأكيد الاستلام' : 'تأكيد التسليم';

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4" dir="rtl">
      {/* Header with Reminder Badge */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            {title}
            {isReminder && (
              <Badge variant="destructive" className="animate-pulse">
                <Clock className="h-3 w-3 ml-1" />
                تذكير
              </Badge>
            )}
          </h2>
          <p className="text-muted-foreground mt-1">
            {isCheckIn
              ? 'قم بفحص المركبة وتوثيق حالتها قبل تسليمها للعميل'
              : 'قم بفحص المركبة وتوثيق حالتها عند استلامها من العميل'}
          </p>
          {vehicle && (
            <p className="text-sm text-muted-foreground mt-2">
              <strong>{vehicle.plate_number}</strong> - {vehicle.make} {vehicle.model}{' '}
              {vehicle.year && `(${vehicle.year})`}
            </p>
          )}
          {contract && (
            <p className="text-sm text-muted-foreground">
              عقد رقم: <strong>{contract.contract_number}</strong>
              {contract.customer_name && ` - ${contract.customer_name}`}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Badge variant={isCheckIn ? 'default' : 'secondary'} className="text-lg px-4 py-2">
            {isCheckIn ? 'استلام' : 'تسليم'}
          </Badge>
          {!isCheckIn && previousCheckIn && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'form' ? 'comparison' : 'form')}
            >
              <Eye className="h-4 w-4 ml-2" />
              {viewMode === 'form' ? 'عرض المقارنة' : 'عرض النموذج'}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs for Form and Comparison */}
      {!isCheckIn && previousCheckIn && (
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="form">نموذج الفحص</TabsTrigger>
            <TabsTrigger value="comparison">مقارنة مع الاستلام</TabsTrigger>
          </TabsList>

          {/* Comparison View */}
          <TabsContent value="comparison">
            <ComparisonView
              checkIn={previousCheckIn}
              currentFuel={fuelLevel}
              currentOdometer={odometerReading}
              currentCleanliness={cleanlinessRating}
            />
          </TabsContent>

          {/* Form View */}
          <TabsContent value="form" className="space-y-6">
            {renderInspectionForm()}
          </TabsContent>
        </Tabs>
      )}

      {/* Form only (for check-in) */}
      {(isCheckIn || !previousCheckIn) && renderInspectionForm()}

      {/* Image Viewer Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          <img src={selectedImage || ''} alt="معاينة الصورة" className="w-full h-auto" />
        </DialogContent>
      </Dialog>
    </div>
  );

  /**
   * Render inspection form
   */
  function renderInspectionForm() {
    return (
      <>
        {/* Reminder Alert */}
        {isReminder && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>تذكير مهم</AlertTitle>
            <AlertDescription>
              {isCheckIn
                ? 'يرجى إجراء فحص الاستلام قبل تفعيل العقد لضمان توثيق حالة المركبة'
                : 'اقترب موعد انتهاء العقد - يرجى إجراء فحص التسليم وتوثيق حالة المركبة'}
            </AlertDescription>
          </Alert>
        )}

        {/* Comparison Alert (for check-out) */}
        {!isCheckIn && previousCheckIn && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p>
                  <strong>تاريخ الاستلام:</strong>{' '}
                  {new Date(previousCheckIn.inspection_date).toLocaleDateString('en-US')}
                </p>
                <p>
                  <strong>مستوى الوقود:</strong> {previousCheckIn.fuel_level}%
                </p>
                <p>
                  <strong>قراءة العداد:</strong>{' '}
                  {previousCheckIn.odometer_reading?.toLocaleString()} كم
                </p>
                <p>
                  <strong>تقييم النظافة:</strong> {previousCheckIn.cleanliness_rating}/5
                </p>
              </div>
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
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  مستوى الاستلام: {previousCheckIn.fuel_level}%
                </span>
                {fuelLevel < (previousCheckIn.fuel_level || 0) && (
                  <Badge variant="destructive">
                    نقص {(previousCheckIn.fuel_level || 0) - fuelLevel}%
                  </Badge>
                )}
                {fuelLevel > (previousCheckIn.fuel_level || 0) && (
                  <Badge variant="default">
                    زيادة {fuelLevel - (previousCheckIn.fuel_level || 0)}%
                  </Badge>
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
                value={odometerReading || ''}
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
                      المسافة المقطوعة:{' '}
                      <strong>
                        {(odometerReading - previousCheckIn.odometer_reading).toLocaleString()} كم
                      </strong>
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
                  <Star className={cn('h-8 w-8', cleanlinessRating >= rating && 'fill-current')} />
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
            {!isCheckIn && previousCheckIn && cleanlinessRating < (previousCheckIn.cleanliness_rating || 5) && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  انخفاض في مستوى النظافة من {previousCheckIn.cleanliness_rating}/5 إلى{' '}
                  {cleanlinessRating}/5
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Photo Upload with Mobile Camera Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              صور المركبة
              <Badge variant="outline">{photos.length}/10</Badge>
            </CardTitle>
            <CardDescription>
              التقط صور للمركبة من جميع الزوايا - يجب إضافة صورة واحدة على الأقل
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Photo Capture Buttons */}
            <div className="grid grid-cols-2 gap-3">
              {/* Camera Button (Mobile) */}
              <Button
                type="button"
                variant="outline"
                onClick={handleCameraCapture}
                disabled={photos.length >= 10}
                className="h-24 flex-col gap-2"
              >
                <Camera className="h-8 w-8" />
                <span>التقاط صورة</span>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={processPhotos}
                  className="hidden"
                />
              </Button>

              {/* Gallery Button */}
              <Button
                type="button"
                variant="outline"
                onClick={handleFileUpload}
                disabled={photos.length >= 10}
                className="h-24 flex-col gap-2"
              >
                <ImagePlus className="h-8 w-8" />
                <span>اختر من المعرض</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={processPhotos}
                  className="hidden"
                />
              </Button>
            </div>

            {/* Photo Grid */}
            {photoPreview.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {photoPreview.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`صورة ${index + 1}`}
                      className="rounded-md w-full h-40 object-cover cursor-pointer"
                      onClick={() => setSelectedImage(preview)}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removePhoto(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setSelectedImage(preview)}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {photos.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>يجب إضافة صورة واحدة على الأقل للمتابعة</AlertDescription>
              </Alert>
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
            <CardTitle>توقيع العميل *</CardTitle>
            <CardDescription>
              يؤكد العميل بتوقيعه على دقة المعلومات المذكورة أعلاه
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignatureInput onSignatureChange={setCustomerSignature} label="توقيع العميل" required />
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
            disabled={createInspection.isPending || !customerSignature || photos.length === 0}
            size="lg"
            className="min-w-[200px]"
          >
            {createInspection.isPending ? (
              'جاري الحفظ...'
            ) : (
              <>
                <CheckCircle className="ml-2 h-5 w-5" />
                {submitButtonText}
              </>
            )}
          </Button>
        </div>
      </>
    );
  }
}

/**
 * ComparisonView Component
 * Side-by-side comparison of check-in and current values
 */
interface ComparisonViewProps {
  checkIn: VehicleInspection;
  currentFuel: number;
  currentOdometer: number;
  currentCleanliness: number;
}

function ComparisonView({
  checkIn,
  currentFuel,
  currentOdometer,
  currentCleanliness,
}: ComparisonViewProps) {
  const fuelDiff = currentFuel - (checkIn.fuel_level || 0);
  const odometerDiff = currentOdometer - (checkIn.odometer_reading || 0);
  const cleanlinessDiff = currentCleanliness - (checkIn.cleanliness_rating || 0);

  return (
    <div className="space-y-6">
      <Alert>
        <Eye className="h-4 w-4" />
        <AlertTitle>مقارنة حالة المركبة</AlertTitle>
        <AlertDescription>
          مقارنة بين حالة الاستلام والحالة الحالية لتوثيق التغييرات
        </AlertDescription>
      </Alert>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Fuel Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Fuel className="h-4 w-4" />
              مستوى الوقود
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">عند الاستلام:</span>
                <span className="font-bold text-lg">{checkIn.fuel_level}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">حالياً:</span>
                <span className="font-bold text-lg">{currentFuel}%</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">الفرق:</span>
                <Badge variant={fuelDiff < 0 ? 'destructive' : fuelDiff > 0 ? 'default' : 'secondary'}>
                  {fuelDiff > 0 ? '+' : ''}
                  {fuelDiff}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Odometer Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              قراءة العداد
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">عند الاستلام:</span>
                <span className="font-bold text-lg">{checkIn.odometer_reading?.toLocaleString()} كم</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">حالياً:</span>
                <span className="font-bold text-lg">{currentOdometer.toLocaleString()} كم</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">المسافة:</span>
                <Badge variant={odometerDiff > 0 ? 'default' : 'secondary'}>
                  {odometerDiff.toLocaleString()} كم
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cleanliness Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              تقييم النظافة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">عند الاستلام:</span>
                <div className="flex gap-1">
                  {Array.from({ length: checkIn.cleanliness_rating || 0 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current text-yellow-500" />
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">حالياً:</span>
                <div className="flex gap-1">
                  {Array.from({ length: currentCleanliness }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current text-yellow-500" />
                  ))}
                </div>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">الفرق:</span>
                <Badge
                  variant={
                    cleanlinessDiff < 0 ? 'destructive' : cleanlinessDiff > 0 ? 'default' : 'secondary'
                  }
                >
                  {cleanlinessDiff > 0 ? '+' : ''}
                  {cleanlinessDiff} نجوم
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Damages Comparison */}
      {checkIn.exterior_condition && checkIn.exterior_condition.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">الأضرار المسجلة عند الاستلام</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {checkIn.exterior_condition.map((damage, index) => (
                <div key={index} className="flex items-start gap-2 p-2 bg-muted rounded-md">
                  <Badge variant="outline" className="mt-0.5">
                    {damage.severity === 'minor' && 'بسيط'}
                    {damage.severity === 'moderate' && 'متوسط'}
                    {damage.severity === 'severe' && 'شديد'}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{damage.location}</p>
                    <p className="text-sm text-muted-foreground">{damage.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photos Comparison */}
      {checkIn.photo_urls && checkIn.photo_urls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">صور الاستلام</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {checkIn.photo_urls.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`صورة استلام ${index + 1}`}
                  className="rounded-md w-full h-32 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => window.open(url, '_blank')}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
