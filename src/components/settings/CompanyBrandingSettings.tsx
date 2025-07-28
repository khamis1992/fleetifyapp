import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Palette, Upload, RotateCcw, Save, Eye, Settings, Type, Image
} from 'lucide-react';
import { useCompanyBranding } from '@/hooks/useCompanyBranding';
import { useAuth } from '@/contexts/AuthContext';

const THEME_PRESETS = [
  {
    name: 'الافتراضي',
    value: 'default',
    colors: {
      primary: '#2563eb',
      secondary: '#f59e0b', 
      accent: '#dc2626'
    }
  },
  {
    name: 'المحيط',
    value: 'ocean',
    colors: {
      primary: '#0ea5e9',
      secondary: '#06b6d4',
      accent: '#8b5cf6'
    }
  },
  {
    name: 'الغابة',
    value: 'forest',
    colors: {
      primary: '#059669',
      secondary: '#65a30d',
      accent: '#dc2626'
    }
  },
  {
    name: 'الغروب',
    value: 'sunset',
    colors: {
      primary: '#ea580c',
      secondary: '#f59e0b',
      accent: '#dc2626'
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

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSettingChange = (key: string, value: string) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    
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
    
    if (isPreviewMode) {
      previewChanges(newSettings);
    }
  };

  const handleSave = async () => {
    try {
      await saveBrandingSettings(localSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleReset = async () => {
    try {
      await resetToDefaults();
      setIsPreviewMode(false);
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
      {/* Action Buttons */}
      <div className="flex items-center gap-3 justify-start">
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
          disabled={saving}
          size="sm"
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
        
        {isPreviewMode && (
          <Badge variant="secondary">وضع المعاينة مفعل</Badge>
        )}
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
              <CardDescription>اختر من القوالب الجاهزة أو خصص الألوان يدوياً</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {THEME_PRESETS.map((preset) => (
              <div
                key={preset.value}
                className={`
                  border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md
                  ${localSettings.theme_preset === preset.value 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                  }
                `}
                onClick={() => handleThemePresetChange(preset)}
              >
                <div className="text-center space-y-3">
                  <div className="flex justify-center gap-2">
                    <div 
                      className="w-6 h-6 rounded-full border"
                      style={{ backgroundColor: preset.colors.primary }}
                    ></div>
                    <div 
                      className="w-6 h-6 rounded-full border"
                      style={{ backgroundColor: preset.colors.secondary }}
                    ></div>
                    <div 
                      className="w-6 h-6 rounded-full border"
                      style={{ backgroundColor: preset.colors.accent }}
                    ></div>
                  </div>
                  <p className="text-sm font-medium">{preset.name}</p>
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-6" />

          {/* Custom Colors */}
          <div className="space-y-4">
            <h4 className="font-medium">تخصيص الألوان</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary_color">اللون الأساسي (الأزرق)</Label>
                <div className="flex gap-2">
                  <Input
                    id="primary_color"
                    type="color"
                    value={localSettings.primary_color}
                    onChange={(e) => handleSettingChange('primary_color', e.target.value)}
                    className="w-16 h-10 p-1 border rounded"
                  />
                  <Input
                    value={localSettings.primary_color}
                    onChange={(e) => handleSettingChange('primary_color', e.target.value)}
                    placeholder="#2563eb"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="secondary_color">اللون الثانوي (الأصفر)</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondary_color"
                    type="color"
                    value={localSettings.secondary_color}
                    onChange={(e) => handleSettingChange('secondary_color', e.target.value)}
                    className="w-16 h-10 p-1 border rounded"
                  />
                  <Input
                    value={localSettings.secondary_color}
                    onChange={(e) => handleSettingChange('secondary_color', e.target.value)}
                    placeholder="#f59e0b"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="accent_color">لون التمييز (الأحمر)</Label>
                <div className="flex gap-2">
                  <Input
                    id="accent_color"
                    type="color"
                    value={localSettings.accent_color}
                    onChange={(e) => handleSettingChange('accent_color', e.target.value)}
                    className="w-16 h-10 p-1 border rounded"
                  />
                  <Input
                    value={localSettings.accent_color}
                    onChange={(e) => handleSettingChange('accent_color', e.target.value)}
                    placeholder="#dc2626"
                  />
                </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="logo_url">رابط الشعار</Label>
              <Input
                id="logo_url"
                value={localSettings.logo_url || ''}
                onChange={(e) => handleSettingChange('logo_url', e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="favicon_url">رابط أيقونة الموقع</Label>
              <Input
                id="favicon_url"
                value={localSettings.favicon_url || ''}
                onChange={(e) => handleSettingChange('favicon_url', e.target.value)}
                placeholder="https://example.com/favicon.ico"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced CSS Section */}
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
    </div>
  );
};