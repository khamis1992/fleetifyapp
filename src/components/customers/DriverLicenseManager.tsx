import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Trash2,
  Eye,
  Upload,
  Calendar,
} from 'lucide-react';
import { useDriverLicenses } from '@/hooks/useDriverLicenses';
import { useDriverLicenseActions } from '@/hooks/useDriverLicenseActions';
import { DriverLicense, DriverLicenseFormData } from '@/types/customer';
import { formatDateInGregorian } from '@/utils/dateFormatter';
import { differenceInDays, parseISO } from 'date-fns';

interface DriverLicenseManagerProps {
  customerId: string;
}

/**
 * Driver License Manager Component
 * Manages driver license upload, tracking, and verification for customers
 */
export function DriverLicenseManager({ customerId }: DriverLicenseManagerProps) {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    open: boolean;
    license: DriverLicense | null;
  }>({ open: false, license: null });

  // Form state
  const [formData, setFormData] = useState<DriverLicenseFormData>({
    license_number: '',
    issue_date: '',
    expiry_date: '',
    issuing_country: 'SA',
    notes: '',
  });
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [frontImagePreview, setFrontImagePreview] = useState<string | null>(null);
  const [backImagePreview, setBackImagePreview] = useState<string | null>(null);

  // Hooks
  const { data: licenses = [], isLoading } = useDriverLicenses(customerId);
  const {
    createLicense,
    updateVerificationStatus,
    deleteLicense,
  } = useDriverLicenseActions();

  /**
   * Handle file selection for front/back images
   */
  const handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
    side: 'front' | 'back'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const preview = reader.result as string;
      if (side === 'front') {
        setFrontImage(file);
        setFrontImagePreview(preview);
      } else {
        setBackImage(file);
        setBackImagePreview(preview);
      }
    };
    reader.readAsDataURL(file);
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    // Validation
    if (!formData.license_number.trim()) {
      return;
    }
    if (!formData.expiry_date) {
      return;
    }
    if (!frontImage) {
      return;
    }

    await createLicense.mutateAsync({
      customerId,
      formData: {
        ...formData,
        front_image: frontImage,
        back_image: backImage || undefined,
      },
    });

    // Reset form
    handleCloseDialog();
  };

  /**
   * Reset and close dialog
   */
  const handleCloseDialog = () => {
    setShowUploadDialog(false);
    setFormData({
      license_number: '',
      issue_date: '',
      expiry_date: '',
      issuing_country: 'SA',
      notes: '',
    });
    setFrontImage(null);
    setBackImage(null);
    setFrontImagePreview(null);
    setBackImagePreview(null);
  };

  /**
   * Get verification status badge
   */
  const getVerificationBadge = (status: DriverLicense['verification_status']) => {
    switch (status) {
      case 'verified':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="h-3 w-3 ml-1" />
            محقق
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 ml-1" />
            مرفوض
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="secondary" className="bg-slate-500 text-white">
            <AlertTriangle className="h-3 w-3 ml-1" />
            منتهي
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 ml-1" />
            قيد المراجعة
          </Badge>
        );
    }
  };

  /**
   * Get expiry warning badge
   */
  const getExpiryWarning = (expiryDate: string) => {
    const days = differenceInDays(parseISO(expiryDate), new Date());

    if (days < 0) {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 ml-1" />
          منتهي
        </Badge>
      );
    } else if (days <= 30) {
      return (
        <Badge variant="destructive" className="bg-orange-500">
          <AlertTriangle className="h-3 w-3 ml-1" />
          ينتهي خلال {days} يوم
        </Badge>
      );
    }

    return null;
  };

  /**
   * Handle view image
   */
  const handleViewImage = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowImageDialog(true);
  };

  /**
   * Handle delete license
   */
  const handleDeleteLicense = (license: DriverLicense) => {
    setDeleteConfirmDialog({ open: true, license });
  };

  const confirmDelete = async () => {
    if (deleteConfirmDialog.license) {
      await deleteLicense.mutateAsync({ licenseId: deleteConfirmDialog.license.id });
      setDeleteConfirmDialog({ open: false, license: null });
    }
  };

  /**
   * Handle verification status change
   */
  const handleVerificationChange = async (
    licenseId: string,
    status: 'verified' | 'rejected'
  ) => {
    await updateVerificationStatus.mutateAsync({ licenseId, status });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-32 bg-muted/50 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">رخص القيادة</h3>
        <Button onClick={() => setShowUploadDialog(true)}>
          <Plus className="h-4 w-4 ml-2" />
          إضافة رخصة
        </Button>
      </div>

      {/* Licenses List */}
      {licenses.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium">لا توجد رخص قيادة</p>
              <p className="text-sm mt-2">ابدأ بإضافة رخصة قيادة للعميل</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowUploadDialog(true)}
              >
                <Plus className="h-4 w-4 ml-2" />
                إضافة رخصة
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {licenses.map((license) => (
            <Card key={license.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      رخصة رقم: {license.license_number}
                    </CardTitle>
                    <div className="flex gap-2 flex-wrap">
                      {getVerificationBadge(license.verification_status)}
                      {getExpiryWarning(license.expiry_date)}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {license.verification_status === 'pending' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVerificationChange(license.id, 'verified')}
                          disabled={updateVerificationStatus.isPending}
                          title="تحقق"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVerificationChange(license.id, 'rejected')}
                          disabled={updateVerificationStatus.isPending}
                          title="رفض"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteLicense(license)}
                      disabled={deleteLicense.isPending}
                      title="حذف"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* License Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الدولة المصدرة:</span>
                      <span className="font-medium">{license.issuing_country}</span>
                    </div>
                    {license.issue_date && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">تاريخ الإصدار:</span>
                        <span className="font-medium">
                          {formatDateInGregorian(license.issue_date)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">تاريخ الانتهاء:</span>
                      <span className="font-medium">
                        {formatDateInGregorian(license.expiry_date)}
                      </span>
                    </div>
                    {license.notes && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-muted-foreground text-xs">ملاحظات:</p>
                        <p className="text-sm mt-1">{license.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* License Images */}
                  <div className="space-y-2">
                    {license.front_image_url && (
                      <div>
                        <Label className="text-xs text-muted-foreground">الوجه الأمامي</Label>
                        <div
                          className="mt-1 relative h-32 border rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => handleViewImage(license.front_image_url!)}
                        >
                          <img
                            src={license.front_image_url}
                            alt="Front"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                            <Eye className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      </div>
                    )}
                    {license.back_image_url && (
                      <div>
                        <Label className="text-xs text-muted-foreground">الوجه الخلفي</Label>
                        <div
                          className="mt-1 relative h-32 border rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => handleViewImage(license.back_image_url!)}
                        >
                          <img
                            src={license.back_image_url}
                            alt="Back"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                            <Eye className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Verification Info */}
                {license.verification_status === 'verified' && license.verified_at && (
                  <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                    تم التحقق في: {formatDateInGregorian(license.verified_at)}
                  </div>
                )}
                {license.verification_notes && (
                  <div className="mt-2 p-2 bg-muted rounded text-xs">
                    <strong>ملاحظات التحقق:</strong> {license.verification_notes}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة رخصة قيادة</DialogTitle>
            <DialogDescription>
              قم برفع صور رخصة القيادة وإدخال البيانات المطلوبة
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* License Number */}
            <div className="space-y-2">
              <Label htmlFor="license_number">
                رقم الرخصة <span className="text-destructive">*</span>
              </Label>
              <Input
                id="license_number"
                value={formData.license_number}
                onChange={(e) =>
                  setFormData({ ...formData, license_number: e.target.value })
                }
                placeholder="أدخل رقم رخصة القيادة"
              />
            </div>

            {/* Issuing Country */}
            <div className="space-y-2">
              <Label htmlFor="issuing_country">
                الدولة المصدرة <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.issuing_country}
                onValueChange={(value) =>
                  setFormData({ ...formData, issuing_country: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SA">السعودية (SA)</SelectItem>
                  <SelectItem value="AE">الإمارات (AE)</SelectItem>
                  <SelectItem value="KW">الكويت (KW)</SelectItem>
                  <SelectItem value="QA">قطر (QA)</SelectItem>
                  <SelectItem value="BH">البحرين (BH)</SelectItem>
                  <SelectItem value="OM">عمان (OM)</SelectItem>
                  <SelectItem value="EG">مصر (EG)</SelectItem>
                  <SelectItem value="JO">الأردن (JO)</SelectItem>
                  <SelectItem value="LB">لبنان (LB)</SelectItem>
                  <SelectItem value="OTHER">دولة أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issue_date">تاريخ الإصدار</Label>
                <Input
                  id="issue_date"
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) =>
                    setFormData({ ...formData, issue_date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiry_date">
                  تاريخ الانتهاء <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="expiry_date"
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) =>
                    setFormData({ ...formData, expiry_date: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Front Image Upload */}
            <div className="space-y-2">
              <Label htmlFor="front_image">
                صورة الوجه الأمامي <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="front_image"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileSelect(e, 'front')}
                  className="flex-1"
                />
              </div>
              {frontImagePreview && (
                <div className="relative h-48 border rounded-lg overflow-hidden">
                  <img
                    src={frontImagePreview}
                    alt="Front Preview"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
            </div>

            {/* Back Image Upload */}
            <div className="space-y-2">
              <Label htmlFor="back_image">صورة الوجه الخلفي (اختياري)</Label>
              <div className="flex gap-2">
                <Input
                  id="back_image"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileSelect(e, 'back')}
                  className="flex-1"
                />
              </div>
              {backImagePreview && (
                <div className="relative h-48 border rounded-lg overflow-hidden">
                  <img
                    src={backImagePreview}
                    alt="Back Preview"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">ملاحظات</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="أي ملاحظات إضافية..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                createLicense.isPending ||
                !formData.license_number.trim() ||
                !formData.expiry_date ||
                !frontImage
              }
            >
              {createLicense.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>عرض الصورة</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="relative w-full h-[70vh]">
              <img
                src={selectedImage}
                alt="License"
                className="w-full h-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirmDialog.open}
        onOpenChange={(open) => setDeleteConfirmDialog({ open, license: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف الرخصة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف رخصة القيادة رقم{' '}
              <strong>{deleteConfirmDialog.license?.license_number}</strong>؟
              <br />
              <br />
              <span className="text-destructive font-medium">
                سيتم حذف الرخصة وجميع الصور المرتبطة بها نهائياً.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteLicense.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteLicense.isPending ? 'جاري الحذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
