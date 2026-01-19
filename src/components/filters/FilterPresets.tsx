/**
 * FilterPresets Component
 * Phase 8 - Agent 1: Advanced Filters & Search
 *
 * Save, load, and manage filter presets with localStorage persistence
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Save,
  Star,
  Download,
  Upload,
  Trash2,
  Edit2,
  Check,
  X,
  MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  FilterPreset,
  FilterState,
  FilterPresetModule,
  FILTER_STORAGE_KEYS,
  isFilterPreset
} from '@/types/filter.types';

// ============================================================================
// Local Storage Helpers
// ============================================================================

const loadPresets = (): FilterPreset[] => {
  try {
    const stored = localStorage.getItem(FILTER_STORAGE_KEYS.PRESETS);
    if (!stored) return [];
    const presets = JSON.parse(stored) as FilterPreset[];
    return presets.map((preset) => ({
      ...preset,
      createdAt: new Date(preset.createdAt),
      updatedAt: preset.updatedAt ? new Date(preset.updatedAt) : undefined
    }));
  } catch (error) {
    console.error('Failed to load filter presets:', error);
    return [];
  }
};

const savePresets = (presets: FilterPreset[]): void => {
  try {
    localStorage.setItem(FILTER_STORAGE_KEYS.PRESETS, JSON.stringify(presets));
  } catch (error) {
    console.error('Failed to save filter presets:', error);
  }
};

const generatePresetId = (): string => {
  return `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// ============================================================================
// Component Props
// ============================================================================

export interface FilterPresetsProps {
  currentFilters: FilterState;
  onApplyPreset: (preset: FilterPreset) => void;
  module?: FilterPresetModule;
  widgetId?: string;
  className?: string;
  showSaveButton?: boolean;
  showLoadButton?: boolean;
  showImportExport?: boolean;
}

// ============================================================================
// FilterPresets Component
// ============================================================================

export const FilterPresets: React.FC<FilterPresetsProps> = ({
  currentFilters,
  onApplyPreset,
  module = 'general',
  widgetId,
  className,
  showSaveButton = true,
  showLoadButton = true,
  showImportExport = true
}) => {
  const { toast } = useToast();
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);

  // Form state for saving preset
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // ============================================================================
  // Load Presets on Mount
  // ============================================================================

  useEffect(() => {
    setPresets(loadPresets());
  }, []);

  // ============================================================================
  // Filtered Presets by Module and Widget
  // ============================================================================

  const filteredPresets = useMemo(() => {
    return presets.filter(
      (preset) =>
        preset.module === module &&
        (!widgetId || !preset.widgetId || preset.widgetId === widgetId)
    );
  }, [presets, module, widgetId]);

  // ============================================================================
  // Save Preset
  // ============================================================================

  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) {
      toast({
        title: 'خطأ',
        description: 'الرجاء إدخال اسم للتصفية',
        variant: 'destructive'
      });
      return;
    }

    const newPreset: FilterPreset = {
      id: editingPresetId || generatePresetId(),
      name: presetName.trim(),
      description: presetDescription.trim() || undefined,
      filters: currentFilters,
      module,
      widgetId,
      createdAt: new Date(),
      isDefault
    };

    const updatedPresets = editingPresetId
      ? presets.map((p) => (p.id === editingPresetId ? { ...newPreset, createdAt: p.createdAt, updatedAt: new Date() } : p))
      : [...presets, newPreset];

    setPresets(updatedPresets);
    savePresets(updatedPresets);

    toast({
      title: 'نجاح',
      description: editingPresetId ? 'تم تحديث التصفية بنجاح' : 'تم حفظ التصفية بنجاح'
    });

    // Reset form
    setPresetName('');
    setPresetDescription('');
    setIsDefault(false);
    setEditingPresetId(null);
    setIsSaveDialogOpen(false);
  }, [presetName, presetDescription, currentFilters, module, widgetId, isDefault, editingPresetId, presets, toast]);

  // ============================================================================
  // Load Preset
  // ============================================================================

  const handleLoadPreset = useCallback(
    (preset: FilterPreset) => {
      onApplyPreset(preset);
      setIsLoadDialogOpen(false);
      toast({
        title: 'نجاح',
        description: `تم تطبيق التصفية: ${preset.name}`
      });
    },
    [onApplyPreset, toast]
  );

  // ============================================================================
  // Delete Preset
  // ============================================================================

  const handleDeletePreset = useCallback(
    (presetId: string) => {
      const updatedPresets = presets.filter((p) => p.id !== presetId);
      setPresets(updatedPresets);
      savePresets(updatedPresets);
      toast({
        title: 'نجاح',
        description: 'تم حذف التصفية بنجاح'
      });
    },
    [presets, toast]
  );

  // ============================================================================
  // Edit Preset
  // ============================================================================

  const handleEditPreset = useCallback((preset: FilterPreset) => {
    setEditingPresetId(preset.id);
    setPresetName(preset.name);
    setPresetDescription(preset.description || '');
    setIsDefault(preset.isDefault || false);
    setIsSaveDialogOpen(true);
  }, []);

  // ============================================================================
  // Export Preset
  // ============================================================================

  const handleExportPreset = useCallback((preset: FilterPreset) => {
    try {
      const dataStr = JSON.stringify(preset, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `filter-preset-${preset.name.replace(/\s+/g, '-')}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast({
        title: 'نجاح',
        description: 'تم تصدير التصفية بنجاح'
      });
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل تصدير التصفية',
        variant: 'destructive'
      });
    }
  }, [toast]);

  // ============================================================================
  // Import Preset
  // ============================================================================

  const handleImportPreset = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (!isFilterPreset(imported)) {
            throw new Error('Invalid preset format');
          }

          const newPreset: FilterPreset = {
            ...imported,
            id: generatePresetId(), // Generate new ID
            createdAt: new Date()
          };

          const updatedPresets = [...presets, newPreset];
          setPresets(updatedPresets);
          savePresets(updatedPresets);

          toast({
            title: 'نجاح',
            description: `تم استيراد التصفية: ${newPreset.name}`
          });
        } catch (error) {
          toast({
            title: 'خطأ',
            description: 'فشل استيراد التصفية - تنسيق غير صحيح',
            variant: 'destructive'
          });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [presets, toast]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Save Preset Button */}
      {showSaveButton && (
        <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Save className="h-4 w-4 ml-2" />
              حفظ التصفية
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]" dir="rtl">
            <DialogHeader>
              <DialogTitle>
                {editingPresetId ? 'تحديث التصفية' : 'حفظ التصفية'}
              </DialogTitle>
              <DialogDescription>
                احفظ التصفية الحالية لاستخدامها لاحقاً
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="preset-name">الاسم *</Label>
                <Input
                  id="preset-name"
                  placeholder="مثال: تصفية الشهر الحالي"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="text-right"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="preset-description">الوصف</Label>
                <Textarea
                  id="preset-description"
                  placeholder="وصف قصير للتصفية..."
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                  className="text-right"
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is-default"
                  checked={isDefault}
                  onCheckedChange={(checked) => setIsDefault(checked as boolean)}
                />
                <Label htmlFor="is-default" className="cursor-pointer">
                  تعيين كتصفية افتراضية
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
                إلغاء
              </Button>
              <Button type="button" onClick={handleSavePreset}>
                <Save className="h-4 w-4 ml-2" />
                حفظ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Load Preset Button */}
      {showLoadButton && (
        <Dialog open={isLoadDialogOpen} onOpenChange={setIsLoadDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Star className="h-4 w-4 ml-2" />
              تحميل تصفية ({filteredPresets.length})
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]" dir="rtl">
            <DialogHeader>
              <DialogTitle>التصفيات المحفوظة</DialogTitle>
              <DialogDescription>اختر تصفية لتطبيقها</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[400px] pr-4">
              {filteredPresets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد تصفيات محفوظة
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredPresets.map((preset) => (
                    <div
                      key={preset.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                    >
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleLoadPreset(preset)}>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm truncate">
                            {preset.name}
                          </h4>
                          {preset.isDefault && (
                            <Badge variant="secondary" className="text-xs">
                              افتراضي
                            </Badge>
                          )}
                        </div>
                        {preset.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {preset.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          تم الإنشاء: {preset.createdAt.toLocaleDateString('en-US')}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" dir="rtl">
                          <DropdownMenuItem onClick={() => handleLoadPreset(preset)}>
                            <Check className="h-4 w-4 ml-2" />
                            تطبيق
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditPreset(preset)}>
                            <Edit2 className="h-4 w-4 ml-2" />
                            تعديل
                          </DropdownMenuItem>
                          {showImportExport && (
                            <DropdownMenuItem onClick={() => handleExportPreset(preset)}>
                              <Download className="h-4 w-4 ml-2" />
                              تصدير
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeletePreset(preset.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 ml-2" />
                            حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      {/* Import Preset Button */}
      {showImportExport && (
        <Button variant="outline" size="sm" onClick={handleImportPreset}>
          <Upload className="h-4 w-4 ml-2" />
          استيراد
        </Button>
      )}
    </div>
  );
};

export default FilterPresets;
