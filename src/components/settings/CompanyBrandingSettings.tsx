import React, { useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Palette, Upload, RotateCcw, Save, Eye, Settings, Type, Image,
  Info, CheckCircle, AlertCircle, Menu, Undo2, History
} from 'lucide-react';
import { useCompanyBranding } from '@/hooks/useCompanyBranding';
import { useAuth } from '@/contexts/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { ImageUploadField } from './ImageUploadField';
import { ColorPicker } from './ColorPicker';
import { ConfirmDialog } from './ConfirmDialog';
import { isValidHexColor } from '@/lib/color-utils';

const THEME_PRESETS = [
  {
    name: 'الافتراضي',
    description: 'الألوان الأساسية للنظام',
    value: 'default',
    colors: {
      primary: '#2563eb',
      secondary: '#f59e0b', 
      accent: '#dc2626'
    }
  },
  {
    name: 'المحيط',
    description: 'ألوان زرقاء هادئة',
    value: 'ocean',
    colors: {
      primary: '#0ea5e9',
      secondary: '#06b6d4',
      accent: '#8b5cf6'
    }
  },
  {
    name: 'الغابة',
    description: 'ألوان خضراء طبيعية',
    value: 'forest',
    colors: {
      primary: '#059669',
      secondary: '#65a30d',
      accent: '#dc2626'
    }
  },
  {
    name: 'الغروب',
    description: 'ألوان دافئة وحيوية',
    value: 'sunset',
    colors: {
      primary: '#ea580c',
      secondary: '#f59e0b',
      accent: '#dc2626'
    }
  },
  {
    name: 'البنفسجي',
    description: 'ألوان أنيقة ومميزة',
    value: 'purple',
    colors: {
      primary: '#7c3aed',
      secondary: '#a855f7',
      accent: '#ec4899'
    }
  },
  {
    name: 'الوردي',
    description: 'ألوان ناعمة ومريحة',
    value: 'rose',
    colors: {
      primary: '#e11d48',
      secondary: '#f43f5e',
      accent: '#06b6d4'
    }
  }
];

const FONT_OPTIONS = [
  { name: 'Cairo', value: 'cairo' },
  { name: 'Tajawal', value: 'tajawal' },
  { name: 'Amiri', value: 'amiri' },
  { name: 'Noto Sans Arabic', value: 'noto-sans-arabic' }
];

export const CompanyBrandingSettings = () => {
  const { user } = useAuth();
  const {
    settings,
    loading,
    saving,
    saveBrandingSettings,
    resetToDefaults,
    previewChanges
  } = useCompanyBranding();

  // State management
  const [localSettings, setLocalSettings] = React.useState(settings);
  const [previousSettings, setPreviousSettings] = React.useState(settings);
  const [isPreviewMode, setIsPreviewMode] = React.useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  // Dialog states
  const [showResetDialog, setShowResetDialog] = React.useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = React.useState(false);

  // Validation state
  const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

  // Debounce local settings for preview
  const debouncedLocalSettings = useDebounce(localSettings, 300);

  // Sync with loaded settings
  React.useEffect(() => {
    setLocalSettings(settings);
    setPreviousSettings(settings);
    setHasUnsavedChanges(false);
    setValidationErrors({});
  }, [settings]);

  // Auto-preview when in preview mode (debounced)
  useEffect(() => {
    if (isPreviewMode && !loading) {
      previewChanges(debouncedLocalSettings);
    }
  }, [debouncedLocalSettings, isPreviewMode, loading, previewChanges]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Validation helper
  const validateColor = useCallback((key: string, value: string): boolean => {
    if (!value || value === '#') return true; // Empty is ok (will use default)

    if (!isValidHexColor(value)) {
      setValidationErrors(prev => ({
        ...prev,
        [key]: 'صيغة اللون غير صالحة. استخدم تنسيق #RRGGBB'
      }));
      return false;
    }

    setValidationErrors(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    return true;
  }, []);

  const handleSettingChange = useCallback((key: string, value: string) => {
    // Validate color inputs
    if (key.includes('color') && !validateColor(key, value)) {
      return;
    }

    // Validate system name length
    if ((key === 'system_name' || key === 'system_name_ar') && value.length > 100) {
      setValidationErrors(prev => ({
        ...prev,
        [key]: 'الاسم طويل جداً (حد أقصى 100 حرف)'
      }));
      return;
    }

    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    setHasUnsavedChanges(true);

    // Clear validation error for this field
    setValidationErrors(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, [localSettings, validateColor]);

  const handleThemePresetChange = useCallback((preset: typeof THEME_PRESETS[0]) => {
    const newSettings = {
      ...localSettings,
      theme_preset: preset.value,
      primary_color: preset.colors.primary,
      secondary_color: preset.colors.secondary,
      accent_color: preset.colors.accent
    };
    setLocalSettings(newSettings);
    setHasUnsavedChanges(true);

    if (isPreviewMode) {
      previewChanges(newSettings);
    }
  }, [localSettings, isPreviewMode, previewChanges]);

  const handleSave = async () => {
    // Validate all colors before saving
    const colorFields = ['primary_color', 'secondary_color', 'accent_color',
      'sidebar_background_color', 'sidebar_foreground_color',
      'sidebar_accent_color', 'sidebar_border_color'];

    let hasErrors = false;
    for (const field of colorFields) {
      if (localSettings[field] && !validateColor(field, localSettings[field])) {
        hasErrors = true;
      }
    }

    if (hasErrors) {
      return;
    }

    try {
      setPreviousSettings(localSettings);
      await saveBrandingSettings(localSettings);
      setHasUnsavedChanges(false);
      setIsPreviewMode(false);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleReset = async () => {
    try {
      await resetToDefaults();
      setPreviousSettings(settings);
      setIsPreviewMode(false);
      setHasUnsavedChanges(false);
      setShowResetDialog(false);
    } catch (error) {
      console.error('Error resetting settings:', error);
    }
  };

  const handleDiscardChanges = () => {
    setLocalSettings(previousSettings);
    setHasUnsavedChanges(false);
    setValidationErrors({});
    setIsPreviewMode(false);
    setShowDiscardDialog(false);

    // Revert preview
    previewChanges(previousSettings);
  };

  const togglePreview = () => {
    if (isPreviewMode) {
      // Exit preview mode - reload the saved settings
      previewChanges(settings);
    } else {
      // Enter preview mode - apply current local settings
      previewChanges(localSettings);
    }
    setIsPreviewMode(!isPreviewMode);
  };

  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8" role="status" aria-label="جاري التحميل">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" aria-hidden="true"></div>
          <p className="text-muted-foreground">جاري تحميل إعدادات الهوية البصرية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Info */}
      <Alert>
        <Info className="h-4 w-4" aria-hidden="true" />
        <AlertDescription>
          يمكنك تخصيص ألوان النظام واسمه من هنا. استخدم زر المعاينة لرؤية التغييرات قبل الحفظ.
        </AlertDescription>
      </Alert>

      {/* Validation Errors Alert */}
      {hasValidationErrors && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>
            يوجد أخطاء في الإدخال. يرجى تصحيحها قبل الحفظ.
            <ul className="mt-2 list-disc list-inside">
              {Object.values(validationErrors).map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3 justify-start flex-wrap">
        <Button
          onClick={togglePreview}
          variant={isPreviewMode ? "default" : "outline"}
          size="sm"
          aria-pressed={isPreviewMode}
        >
          <Eye className="h-4 w-4 ml-2" aria-hidden="true" />
          {isPreviewMode ? 'إيقاف المعاينة' : 'معاينة التغييرات'}
        </Button>

        <Button
          onClick={handleSave}
          disabled={saving || !hasUnsavedChanges || hasValidationErrors}
          size="sm"
          className={hasUnsavedChanges && !hasValidationErrors ? 'bg-green-600 hover:bg-green-700' : ''}
          aria-label={hasUnsavedChanges ? 'حفظ التغييرات' : 'لا توجد تغييرات للحفظ'}
        >
          <Save className="h-4 w-4 ml-2" aria-hidden="true" />
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </Button>

        {hasUnsavedChanges && (
          <Button
            onClick={() => setShowDiscardDialog(true)}
            variant="outline"
            size="sm"
            aria-label="تجاهل التغييرات والعودة للإعدادات السابقة"
          >
            <Undo2 className="h-4 w-4 ml-2" aria-hidden="true" />
            تجاهل التغييرات
          </Button>
        )}

        <Button
          onClick={() => setShowResetDialog(true)}
          variant="outline"
          size="sm"
          aria-label="إعادة تعيين جميع الإعدادات إلى القيم الافتراضية"
        >
          <RotateCcw className="h-4 w-4 ml-2" aria-hidden="true" />
          إعادة تعيين
        </Button>

        <div className="flex items-center gap-2">
          {isPreviewMode && (
            <Badge variant="secondary" className="animate-pulse">
              <Eye className="h-3 w-3 ml-1" aria-hidden="true" />
              وضع المعاينة مفعل
            </Badge>
          )}
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-orange-600 border-orange-600">
              <AlertCircle className="h-3 w-3 ml-1" aria-hidden="true" />
              تغييرات غير محفوظة
            </Badge>
          )}
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        onConfirm={handleReset}
        title="إعادة تعيين الإعدادات"
        description="هل أنت متأكد من إعادة تعيين جميع إعدادات الهوية البصرية إلى القيم الافتراضية؟ سيتم فقدان جميع التخصيصات الحالية."
        confirmText="نعم، إعادة تعيين"
        cancelText="إلغاء"
        variant="danger"
      />

      {/* Discard Changes Dialog */}
      <ConfirmDialog
        open={showDiscardDialog}
        onOpenChange={setShowDiscardDialog}
        onConfirm={handleDiscardChanges}
        title="تجاهل التغييرات"
        description="هل أنت متأكد من تجاهل جميع التغييرات غير المحفوظة؟ سيتم التراجع عن جميع التعديلات التي قمت بها."
        confirmText="نعم، تجاهل التغييرات"
        cancelText="إلغاء"
        variant="warning"
      />

      {/* System Name Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Type className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <CardTitle className="text-lg">اسم النظام</CardTitle>
              <CardDescription>تخصيص اسم النظام المعروض في الواجهة</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="system_name">اسم النظام (بالإنجليزية)</Label>
              <Input
                id="system_name"
                value={localSettings.system_name || ''}
                onChange={(e) => handleSettingChange('system_name', e.target.value)}
                placeholder="Fleet Management System"
                maxLength={100}
                aria-invalid={!!validationErrors.system_name}
                aria-describedby={validationErrors.system_name ? 'system_name_error' : undefined}
              />
              {validationErrors.system_name && (
                <p id="system_name_error" className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" aria-hidden="true" />
                  {validationErrors.system_name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="system_name_ar">اسم النظام (بالعربية)</Label>
              <Input
                id="system_name_ar"
                value={localSettings.system_name_ar || ''}
                onChange={(e) => handleSettingChange('system_name_ar', e.target.value)}
                placeholder="نظام إدارة الأسطول"
                maxLength={100}
                dir="rtl"
                aria-invalid={!!validationErrors.system_name_ar}
                aria-describedby={validationErrors.system_name_ar ? 'system_name_ar_error' : undefined}
              />
              {validationErrors.system_name_ar && (
                <p id="system_name_ar_error" className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" aria-hidden="true" />
                  {validationErrors.system_name_ar}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme Presets Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Palette className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">قوالب الألوان</CardTitle>
              <CardDescription>اختر من القوالب الجاهزة لتغيير ألوان النظام بنقرة واحدة</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {THEME_PRESETS.map((preset) => (
              <div
                key={preset.value}
                className={`
                  border rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg
                  ${localSettings.theme_preset === preset.value 
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/20' 
                    : 'border-border hover:border-primary/50 hover:bg-accent/5'
                  }
                `}
                onClick={() => handleThemePresetChange(preset)}
              >
                <div className="text-center space-y-3">
                  <div className="flex justify-center gap-2">
                    <div 
                      className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: preset.colors.primary }}
                      title="اللون الأساسي"
                    ></div>
                    <div 
                      className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: preset.colors.secondary }}
                      title="اللون الثانوي"
                    ></div>
                    <div 
                      className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: preset.colors.accent }}
                      title="لون التمييز"
                    ></div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{preset.name}</p>
                    <p className="text-xs text-muted-foreground">{preset.description}</p>
                  </div>
                  {localSettings.theme_preset === preset.value && (
                    <div className="flex items-center justify-center text-primary">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-6" />

          {/* Custom Colors */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">تخصيص الألوان بدقة</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ColorPicker
                value={localSettings.primary_color}
                onChange={(value) => handleSettingChange('primary_color', value)}
                label="اللون الأساسي"
                description="يُستخدم للأزرار والروابط الرئيسية"
                showContrastCheck={true}
                contrastBackgroundColor="#ffffff"
              />

              <ColorPicker
                value={localSettings.secondary_color}
                onChange={(value) => handleSettingChange('secondary_color', value)}
                label="اللون الثانوي"
                description="يُستخدم للعناصر المساعدة والتحديدات"
                showContrastCheck={true}
                contrastBackgroundColor="#ffffff"
              />

              <ColorPicker
                value={localSettings.accent_color}
                onChange={(value) => handleSettingChange('accent_color', value)}
                label="لون التمييز"
                description="يُستخدم للتنبيهات والعناصر المهمة"
                showContrastCheck={true}
                contrastBackgroundColor="#ffffff"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sidebar Colors Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Menu className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">ألوان الشريط الجانبي</CardTitle>
              <CardDescription>تخصيص ألوان الشريط الجانبي للتنقل</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sidebar Presets */}
          <div>
            <Label className="text-base font-medium">قوالب الشريط الجانبي</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              <Button
                variant="outline"
                className="h-auto p-3 flex flex-col items-center gap-2"
                onClick={() => {
                  handleSettingChange('sidebar_background_color', '#ffffff');
                  handleSettingChange('sidebar_foreground_color', '#1f2937');
                  handleSettingChange('sidebar_accent_color', '#2563eb');
                  handleSettingChange('sidebar_border_color', '#e5e7eb');
                }}
              >
                <div className="w-8 h-6 rounded border bg-white border-slate-300"></div>
                <span className="text-xs">فاتح</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-3 flex flex-col items-center gap-2"
                onClick={() => {
                  handleSettingChange('sidebar_background_color', '#1f2937');
                  handleSettingChange('sidebar_foreground_color', '#ffffff');
                  handleSettingChange('sidebar_accent_color', '#3b82f6');
                  handleSettingChange('sidebar_border_color', '#374151');
                }}
              >
                <div className="w-8 h-6 rounded bg-slate-800 border border-slate-600"></div>
                <span className="text-xs">داكن</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-3 flex flex-col items-center gap-2"
                onClick={() => {
                  handleSettingChange('sidebar_background_color', localSettings.primary_color);
                  handleSettingChange('sidebar_foreground_color', '#ffffff');
                  handleSettingChange('sidebar_accent_color', '#ffffff');
                  handleSettingChange('sidebar_border_color', 'rgba(255,255,255,0.2)');
                }}
              >
                <div 
                  className="w-8 h-6 rounded border"
                  style={{ backgroundColor: localSettings.primary_color }}
                ></div>
                <span className="text-xs">ملون</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-3 flex flex-col items-center gap-2"
                onClick={() => {
                  handleSettingChange('sidebar_background_color', 'rgba(255,255,255,0.8)');
                  handleSettingChange('sidebar_foreground_color', '#1f2937');
                  handleSettingChange('sidebar_accent_color', localSettings.primary_color);
                  handleSettingChange('sidebar_border_color', 'rgba(0,0,0,0.1)');
                }}
              >
                <div className="w-8 h-6 rounded border bg-white/80 border-black/10"></div>
                <span className="text-xs">شفاف</span>
              </Button>
            </div>
          </div>

          {/* Individual Sidebar Colors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ColorPicker
              value={localSettings.sidebar_background_color}
              onChange={(value) => handleSettingChange('sidebar_background_color', value)}
              label="خلفية الشريط"
            />
            <ColorPicker
              value={localSettings.sidebar_foreground_color}
              onChange={(value) => handleSettingChange('sidebar_foreground_color', value)}
              label="لون النص"
              showContrastCheck={true}
              contrastBackgroundColor={localSettings.sidebar_background_color}
            />
            <ColorPicker
              value={localSettings.sidebar_accent_color}
              onChange={(value) => handleSettingChange('sidebar_accent_color', value)}
              label="لون التمييز"
              showContrastCheck={true}
              contrastBackgroundColor={localSettings.sidebar_background_color}
            />
            <ColorPicker
              value={localSettings.sidebar_border_color}
              onChange={(value) => handleSettingChange('sidebar_border_color', value)}
              label="لون الحدود"
            />
          </div>
        </CardContent>
      </Card>

      {/* Typography Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Type className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">الخطوط</CardTitle>
              <CardDescription>اختيار نوع الخط المستخدم في النظام</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="font_family">نوع الخط</Label>
            <select
              id="font_family"
              value={localSettings.font_family}
              onChange={(e) => handleSettingChange('font_family', e.target.value)}
              className="w-full p-2 border rounded-md bg-background"
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Logo and Images Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Image className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">الشعار والصور</CardTitle>
              <CardDescription>رفع وإدارة الشعار وأيقونة الموقع</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ImageUploadField
              label="شعار الشركة"
              value={localSettings.logo_url || ''}
              onChange={(url) => handleSettingChange('logo_url', url)}
              placeholder="اسحب صورة الشعار هنا أو انقر للاختيار"
              folder="logos"
              aspectRatio="auto"
              maxWidth={250}
            />
            
            <ImageUploadField
              label="أيقونة الموقع (Favicon)"
              value={localSettings.favicon_url || ''}
              onChange={(url) => handleSettingChange('favicon_url', url)}
              placeholder="اسحب أيقونة الموقع هنا أو انقر للاختيار"
              folder="favicons"
              aspectRatio="square"
              maxWidth={150}
            />
          </div>
        </CardContent>
      </Card>

      {/* Advanced CSS Section - Only show if advanced mode is enabled */}
      {showAdvanced && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">CSS مخصص</CardTitle>
                <CardDescription>للمستخدمين المتقدمين - إضافة أكواد CSS مخصصة</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                تحذير: استخدام CSS مخصص قد يؤثر على مظهر النظام. تأكد من المعاينة قبل الحفظ.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor="custom_css">كود CSS مخصص</Label>
              <Textarea
                id="custom_css"
                value={localSettings.custom_css || ''}
                onChange={(e) => handleSettingChange('custom_css', e.target.value)}
                placeholder="/* أدخل كود CSS المخصص هنا */"
                rows={6}
                className="font-mono text-sm"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};