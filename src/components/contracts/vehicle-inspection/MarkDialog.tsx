/**
 * Mark Dialog Component
 * Dialog for adding/editing vehicle marks with description, condition, severity, and photos
 *
 * @component MarkDialog
 */

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Camera, X, Check, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  VehicleMark,
  ZoneCondition,
  ZoneSeverity,
  ZoneConditionColors,
  ZoneConditionLabels,
  ZoneSeverityLabels,
} from './types';

// ===== Props =====
interface MarkDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    description: string;
    condition?: ZoneCondition;
    severity?: ZoneSeverity;
    photos: string[];
  }) => void;
  onDelete?: (markId: string) => void;
  existingMark?: VehicleMark | null;
  contractId?: string;
}

// ===== Condition Options =====
const CONDITION_OPTIONS: { value: ZoneCondition; icon: string; color: string }[] = [
  { value: 'scratch', icon: '⚠', color: ZoneConditionColors.scratch },
  { value: 'dent', icon: '◐', color: ZoneConditionColors.dent },
  { value: 'crack', icon: '✕', color: ZoneConditionColors.crack },
  { value: 'broken', icon: '✖', color: ZoneConditionColors.broken },
  { value: 'missing', icon: '○', color: ZoneConditionColors.missing },
];

// ===== Severity Options =====
const SEVERITY_OPTIONS: { value: ZoneSeverity; label: string; label_ar: string }[] = [
  { value: 'minor', label: 'Minor', label_ar: 'طفيف' },
  { value: 'moderate', label: 'Moderate', label_ar: 'متوسط' },
  { value: 'severe', label: 'Severe', label_ar: 'شديد' },
];

// ===== Main Component =====
export function MarkDialog({
  open,
  onClose,
  onSave,
  onDelete,
  existingMark,
  contractId = '',
}: MarkDialogProps) {
  const { toast } = useToast();

  // Form state
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState<ZoneCondition | undefined>(undefined);
  const [severity, setSeverity] = useState<ZoneSeverity>('minor');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Load existing mark data when editing
  useEffect(() => {
    if (existingMark) {
      setDescription(existingMark.description);
      setCondition(existingMark.condition);
      setSeverity(existingMark.severity || 'minor');
      setPhotoUrls(existingMark.photo_urls || []);
    } else {
      // Reset for new mark
      setDescription('');
      setCondition(undefined);
      setSeverity('minor');
      setPhotoUrls([]);
    }
  }, [existingMark, open]);

  // Handle photo upload
  const handlePhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `vehicle-mark-photos/${contractId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('vehicle-documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('vehicle-documents')
          .getPublicUrl(filePath);

        return data.publicUrl;
      });

      const urls = await Promise.all(uploadPromises);
      setPhotoUrls(prev => [...prev, ...urls]);

      toast({
        title: 'تم رفع الصور',
        description: `تم رفع ${urls.length} صور بنجاح`,
      });
    } catch (error) {
      console.error('Photo upload error:', error);
      toast({
        variant: 'destructive',
        title: 'فشل رفع الصور',
        description: 'حدث خطأ أثناء رفع الصور. يرجى المحاولة مرة أخرى.',
      });
    } finally {
      setUploading(false);
    }
  }, [contractId, toast]);

  // Remove photo
  const handleRemovePhoto = useCallback((index: number) => {
    setPhotoUrls(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Save mark
  const handleSave = useCallback(() => {
    if (!description.trim()) {
      toast({
        variant: 'destructive',
        title: 'الوصف مطلوب',
        description: 'يرجى إدخال وصف للعلامة',
      });
      return;
    }

    onSave({
      description: description.trim(),
      condition,
      severity,
      photos: photoUrls,
    });

    // Reset form
    setDescription('');
    setCondition(undefined);
    setSeverity('minor');
    setPhotoUrls([]);
    onClose();
  }, [description, condition, severity, photoUrls, onSave, onClose, toast]);

  // Delete mark
  const handleDelete = useCallback(() => {
    if (existingMark && onDelete) {
      onDelete(existingMark.id);
      onClose();
    }
  }, [existingMark, onDelete, onClose]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {existingMark ? 'تعديل العلامة' : 'إضافة علامة جديدة'}
          </DialogTitle>
          <DialogDescription>
            صف المشكلة أو الضرر في الموقع المحدد
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-1">
          <div className="space-y-6 py-4">
            {/* Description (Required) */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-base font-semibold">
                الوصف *
              </Label>
              <Textarea
                id="description"
                placeholder="مثال: خدش صغير على الباب الأمامي الأيسر..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Condition Selection (Optional) */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                نوع المشكلة (اختياري)
              </Label>
              <div className="grid grid-cols-3 gap-3">
                {CONDITION_OPTIONS.map(({ value, icon, color }) => (
                  <Card
                    key={value}
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-md',
                      condition === value && 'ring-2 ring-primary shadow-md'
                    )}
                    onClick={() => setCondition(value)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold"
                          style={{ backgroundColor: color }}
                        >
                          {icon}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm">
                            {ZoneConditionLabels[value].ar}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {ZoneConditionLabels[value].en}
                          </div>
                        </div>
                        {condition === value && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Severity Selection (Optional) */}
            {condition && condition !== 'clean' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <Label className="text-base font-semibold">الخطورة (اختياري)</Label>
                <div className="flex gap-2">
                  {SEVERITY_OPTIONS.map(({ value, label_ar }) => (
                    <Button
                      key={value}
                      variant={severity === value ? 'default' : 'outline'}
                      onClick={() => setSeverity(value)}
                      className="flex-1"
                    >
                      {label_ar}
                    </Button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Photo Upload (Optional) */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">الصور (اختياري)</Label>

              {/* Upload Button */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={uploading}
                  onClick={() => document.getElementById('photo-input')?.click()}
                >
                  <Camera className="h-4 w-4 ml-2" />
                  {uploading ? 'جاري الرفع...' : 'إضافة صور'}
                  <input
                    id="photo-input"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </Button>
                {photoUrls.length > 0 && (
                  <Badge variant="secondary">
                    {photoUrls.length} صور
                  </Badge>
                )}
              </div>

              {/* Photo Preview Grid */}
              {photoUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photoUrls.map((url, index) => (
                    <div key={index} className="relative group aspect-square">
                      <img
                        src={url}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg border"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemovePhoto(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex items-center gap-2 pt-4 border-t">
          {existingMark && onDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              حذف
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={!description.trim()}>
            <Check className="w-4 h-4 ml-2" />
            حفظ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===== Export Types =====
export type { MarkDialogProps };
