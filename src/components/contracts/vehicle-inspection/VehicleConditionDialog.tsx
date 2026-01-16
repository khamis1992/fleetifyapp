/**
 * Vehicle Condition Dialog Component
 * Dialog for selecting zone condition, severity, description, and uploading photos
 *
 * @component VehicleConditionDialog
 */

import { useState, useCallback } from 'react';
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
import { Camera, Upload, X, Check, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  VehicleZone,
  ZoneCondition,
  ZoneSeverity,
  ZoneSelection,
  ZoneConditionColors,
  ZoneConditionLabels,
  ZoneSeverityLabels,
} from './types';

// ===== Props =====
interface VehicleConditionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zone: VehicleZone | null;
  existingSelection: ZoneSelection | null;
  onSave: (selection: ZoneSelection) => void;
  onDelete?: (zoneId: string) => void;
  contractId?: string;
}

// ===== Condition Options =====
const CONDITION_OPTIONS: { value: ZoneCondition; icon: string; color: string }[] = [
  { value: 'clean', icon: '✓', color: ZoneConditionColors.clean },
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
export function VehicleConditionDialog({
  open,
  onOpenChange,
  zone,
  existingSelection,
  onSave,
  onDelete,
  contractId = '',
}: VehicleConditionDialogProps) {
  const { toast } = useToast();

  // Form state
  const [condition, setCondition] = useState<ZoneCondition>(existingSelection?.condition || 'clean');
  const [severity, setSeverity] = useState<ZoneSeverity>(existingSelection?.severity || 'minor');
  const [description, setDescription] = useState(existingSelection?.description || '');
  const [photoUrls, setPhotoUrls] = useState<string[]>(existingSelection?.photo_urls || []);
  const [uploading, setUploading] = useState(false);

  // Reset form when zone changes
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setCondition('clean');
      setSeverity('minor');
      setDescription('');
      setPhotoUrls([]);
    }
    onOpenChange(newOpen);
  }, [onOpenChange]);

  // Handle photo upload
  const handlePhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).asyncMap(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `vehicle-zone-photos/${contractId}/${zone?.id}/${fileName}`;

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
  }, [contractId, zone?.id, toast]);

  // Remove photo
  const handleRemovePhoto = useCallback((index: number) => {
    setPhotoUrls(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Save selection
  const handleSave = useCallback(() => {
    if (!zone) return;

    // If condition is clean, clear selection
    if (condition === 'clean') {
      onDelete?.(zone.id);
      handleOpenChange(false);
      return;
    }

    const selection: ZoneSelection = {
      zone_id: zone.id,
      zone_name: zone.name,
      zone_name_ar: zone.name_ar,
      category: zone.category,
      condition,
      severity,
      description,
      photo_urls: photoUrls,
      marked_by: '', // Will be set by parent
      marked_at: new Date().toISOString(),
    };

    onSave(selection);
    handleOpenChange(false);
  }, [zone, condition, severity, description, photoUrls, onDelete, onSave, handleOpenChange]);

  // Delete selection
  const handleDelete = useCallback(() => {
    if (!zone) return;
    onDelete?.(zone.id);
    handleOpenChange(false);
  }, [zone, onDelete, handleOpenChange]);

  if (!zone) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="text-2xl">{zone.number}</span>
            <span>{zone.name_ar}</span>
          </DialogTitle>
          <DialogDescription>
            سجل الحالة الحالية للمنطقة وأضف الصور إذا لزم الأمر
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-1">
          <div className="space-y-6 py-4">
            {/* Condition Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">الحالة</Label>
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

            {/* Severity Selection */}
            {condition !== 'clean' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <Label className="text-base font-semibold">الخطورة</Label>
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

            {/* Description */}
            {condition !== 'clean' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <Label htmlFor="description" className="text-base font-semibold">
                  الوصف (اختياري)
                </Label>
                <Textarea
                  id="description"
                  placeholder="صف الضرر بالتفصيل..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </motion.div>
            )}

            {/* Photo Upload */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">الصور</Label>

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
                <Badge variant="secondary">
                  {photoUrls.length} صور
                </Badge>
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

            {/* Warning if clean but has photos */}
            {condition === 'clean' && photoUrls.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-semibold">تنبيه</p>
                  <p>لقد قمت بتحميل صور ولكن الحالة "سليم". سيتم حذف الصور عند الحفظ.</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex items-center gap-2 pt-4 border-t">
          {existingSelection && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={condition !== 'clean' && !description && photoUrls.length === 0}
            >
              حذف
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSave}>
            حفظ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===== Export Types =====
export type { VehicleConditionDialogProps };
