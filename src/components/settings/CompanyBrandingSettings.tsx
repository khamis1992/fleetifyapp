import React from 'react';
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
  Info, CheckCircle, AlertCircle, Menu
} from 'lucide-react';
import { useCompanyBranding } from '@/hooks/useCompanyBranding';
import { useAuth } from '@/contexts/AuthContext';
import { ImageUploadField } from './ImageUploadField';

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

  const [localSettings, setLocalSettings] = React.useState(settings);
  const [isPreviewMode, setIsPreviewMode] = React.useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  React.useEffect(() => {
    setLocalSettings(settings);
    setHasUnsavedChanges(false);
  }, [settings]);

  const handleSettingChange = (key: string, value: string) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    setHasUnsavedChanges(true);
    
    if (isPreviewMode) {
      previewChanges(newSettings);
    }
  };

  const handleThemePresetChange = (preset: typeof THEME_PRESETS[0]) => {
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
  };

  const handleSave = async () => {
    try {
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
      setIsPreviewMode(false);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error resetting settings:', error);
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          يمكنك تخصيص ألوان النظام واسمه من هنا. استخدم زر المعاينة لرؤية التغييرات قبل الحفظ.
        </AlertDescription>
      </Alert>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 justify-start flex-wrap">
        <Button 
          onClick={togglePreview}
          variant={isPreviewMode ? "default" : "outline"}
          size="sm"
        >
          <Eye className="h-4 w-4 ml-2" />
          {isPreviewMode ? 'إيقاف المعاينة' : 'معاينة التغييرات'}
        </Button>
        
        <Button 
          onClick={handleSave}
          disabled={saving || !hasUnsavedChanges}
          size="sm"
          className={hasUnsavedChanges ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          <Save className="h-4 w-4 ml-2" />
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </Button>
        
        <Button 
          onClick={handleReset}
          variant="outline"
          size="sm"
        >
          <RotateCcw className="h-4 w-4 ml-2" />
          إعادة تعيين
        </Button>
        
        <div className="flex items-center gap-2">
          {isPreviewMode && (
            <Badge variant="secondary">وضع المعاينة مفعل</Badge>
          )}
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-orange-600 border-orange-600">
              <AlertCircle className="h-3 w-3 ml-1" />
              تغييرات غير محفوظة
            </Badge>
          )}
        </div>
      </div>

      {/* System Name Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Type className="h-5 w-5 text-primary" />
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="system_name_ar">اسم النظام (بالعربية)</Label>
              <Input
                id="system_name_ar"
                value={localSettings.system_name_ar || ''}
                onChange={(e) => handleSettingChange('system_name_ar', e.target.value)}
                placeholder="نظام إدارة الأسطول"
              />
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? 'إخفاء' : 'عرض'} التفاصيل
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <Label htmlFor="primary_color" className="text-sm font-medium">
                  اللون الأساسي
                </Label>
                <div className="space-y-2">
                  <div className="flex gap-3 items-center">
                    <Input
                      id="primary_color"
                      type="color"
                      value={localSettings.primary_color}
                      onChange={(e) => handleSettingChange('primary_color', e.target.value)}
                      className="w-16 h-16 p-1 border rounded-lg cursor-pointer"
                      title="اختر اللون الأساسي"
                    />
                    <div className="flex-1">
                      <div 
                        className="w-full h-8 rounded border"
                        style={{ backgroundColor: localSettings.primary_color }}
                      ></div>
                    </div>
                  </div>
                  {showAdvanced && (
                    <Input
                      value={localSettings.primary_color}
                      onChange={(e) => handleSettingChange('primary_color', e.target.value)}
                      placeholder="#2563eb"
                      className="font-mono text-xs"
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">يُستخدم للأزرار والروابط الرئيسية</p>
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="secondary_color" className="text-sm font-medium">
                  اللون الثانوي
                </Label>
                <div className="space-y-2">
                  <div className="flex gap-3 items-center">
                    <Input
                      id="secondary_color"
                      type="color"
                      value={localSettings.secondary_color}
                      onChange={(e) => handleSettingChange('secondary_color', e.target.value)}
                      className="w-16 h-16 p-1 border rounded-lg cursor-pointer"
                      title="اختر اللون الثانوي"
                    />
                    <div className="flex-1">
                      <div 
                        className="w-full h-8 rounded border"
                        style={{ backgroundColor: localSettings.secondary_color }}
                      ></div>
                    </div>
                  </div>
                  {showAdvanced && (
                    <Input
                      value={localSettings.secondary_color}
                      onChange={(e) => handleSettingChange('secondary_color', e.target.value)}
                      placeholder="#f59e0b"
                      className="font-mono text-xs"
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">يُستخدم للعناصر المساعدة والتحديدات</p>
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="accent_color" className="text-sm font-medium">
                  لون التمييز
                </Label>
                <div className="space-y-2">
                  <div className="flex gap-3 items-center">
                    <Input
                      id="accent_color"
                      type="color"
                      value={localSettings.accent_color}
                      onChange={(e) => handleSettingChange('accent_color', e.target.value)}
                      className="w-16 h-16 p-1 border rounded-lg cursor-pointer"
                      title="اختر لون التمييز"
                    />
                    <div className="flex-1">
                      <div 
                        className="w-full h-8 rounded border"
                        style={{ backgroundColor: localSettings.accent_color }}
                      ></div>
                    </div>
                  </div>
                  {showAdvanced && (
                    <Input
                      value={localSettings.accent_color}
                      onChange={(e) => handleSettingChange('accent_color', e.target.value)}
                      placeholder="#dc2626"
                      className="font-mono text-xs"
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">يُستخدم للتنبيهات والعناصر المهمة</p>
              </div>
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
                <div className="w-8 h-6 rounded border bg-white border-gray-300"></div>
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
                <div className="w-8 h-6 rounded bg-gray-800 border border-gray-600"></div>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="sidebar_background_color">خلفية الشريط</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="sidebar_background_color"
                  type="color"
                  value={localSettings.sidebar_background_color}
                  onChange={(e) => handleSettingChange('sidebar_background_color', e.target.value)}
                  className="w-12 h-10 p-1 border rounded"
                />
                <Input
                  value={localSettings.sidebar_background_color}
                  onChange={(e) => handleSettingChange('sidebar_background_color', e.target.value)}
                  className="flex-1"
                  placeholder="#ffffff"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="sidebar_foreground_color">لون النص</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="sidebar_foreground_color"
                  type="color"
                  value={localSettings.sidebar_foreground_color}
                  onChange={(e) => handleSettingChange('sidebar_foreground_color', e.target.value)}
                  className="w-12 h-10 p-1 border rounded"
                />
                <Input
                  value={localSettings.sidebar_foreground_color}
                  onChange={(e) => handleSettingChange('sidebar_foreground_color', e.target.value)}
                  className="flex-1"
                  placeholder="#1f2937"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="sidebar_accent_color">لون التمييز</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="sidebar_accent_color"
                  type="color"
                  value={localSettings.sidebar_accent_color}
                  onChange={(e) => handleSettingChange('sidebar_accent_color', e.target.value)}
                  className="w-12 h-10 p-1 border rounded"
                />
                <Input
                  value={localSettings.sidebar_accent_color}
                  onChange={(e) => handleSettingChange('sidebar_accent_color', e.target.value)}
                  className="flex-1"
                  placeholder="#2563eb"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="sidebar_border_color">لون الحدود</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="sidebar_border_color"
                  type="color"
                  value={localSettings.sidebar_border_color}
                  onChange={(e) => handleSettingChange('sidebar_border_color', e.target.value)}
                  className="w-12 h-10 p-1 border rounded"
                />
                <Input
                  value={localSettings.sidebar_border_color}
                  onChange={(e) => handleSettingChange('sidebar_border_color', e.target.value)}
                  className="flex-1"
                  placeholder="#e5e7eb"
                />
              </div>
            </div>
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