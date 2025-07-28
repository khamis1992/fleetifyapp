import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Upload, 
  Palette, 
  Image as ImageIcon, 
  Eye, 
  Save,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface BrandingSettings {
  logo_url?: string;
  company_name: string;
  company_name_ar?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
  favicon_url?: string;
  custom_css?: string;
}

export const CompanyBrandingSettings: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<BrandingSettings>({
    company_name: user?.company?.name || '',
    company_name_ar: user?.company?.name_ar || '',
    primary_color: '#3b82f6',
    secondary_color: '#64748b',
    accent_color: '#f59e0b',
    font_family: 'Inter',
    custom_css: ''
  });
  
  const [isUploading, setIsUploading] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const faviconFileRef = useRef<HTMLInputElement>(null);

  const colorPresets = [
    { name: 'الأزرق الكلاسيكي', primary: '#3b82f6', secondary: '#64748b', accent: '#f59e0b' },
    { name: 'الأخضر الطبيعي', primary: '#10b981', secondary: '#6b7280', accent: '#f97316' },
    { name: 'البنفسجي الملكي', primary: '#8b5cf6', secondary: '#64748b', accent: '#06b6d4' },
    { name: 'الأحمر الجريء', primary: '#ef4444', secondary: '#71717a', accent: '#22c55e' },
    { name: 'الوردي الأنيق', primary: '#ec4899', secondary: '#6b7280', accent: '#84cc16' }
  ];

  const fontOptions = [
    { value: 'Inter', label: 'Inter' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Cairo', label: 'Cairo (عربي)' },
    { value: 'Noto Sans Arabic', label: 'Noto Sans Arabic (عربي)' },
    { value: 'Amiri', label: 'Amiri (عربي)' }
  ];

  const handleFileUpload = async (file: File, type: 'logo' | 'favicon') => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة صالح');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم الملف كبير جداً. الحد الأقصى 2 ميجابايت');
      return;
    }

    setIsUploading(true);
    
    try {
      // Create a preview URL for now
      const previewUrl = URL.createObjectURL(file);
      
      setSettings(prev => ({
        ...prev,
        [type === 'logo' ? 'logo_url' : 'favicon_url']: previewUrl
      }));
      
      toast.success(`تم رفع ${type === 'logo' ? 'الشعار' : 'الأيقونة'} بنجاح`);
      
      // TODO: Implement actual file upload to storage
      console.log(`Uploading ${type}:`, file);
      
    } catch (error) {
      toast.error('حدث خطأ أثناء رفع الملف');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const applyColorPreset = (preset: typeof colorPresets[0]) => {
    setSettings(prev => ({
      ...prev,
      primary_color: preset.primary,
      secondary_color: preset.secondary,
      accent_color: preset.accent
    }));
    toast.success(`تم تطبيق نمط الألوان: ${preset.name}`);
  };

  const previewChanges = () => {
    // Apply the changes temporarily to see the preview
    const root = document.documentElement;
    root.style.setProperty('--primary', settings.primary_color);
    root.style.setProperty('--secondary', settings.secondary_color);
    root.style.setProperty('--accent', settings.accent_color);
    
    toast.success('تم تطبيق المعاينة مؤقتاً');
  };

  const resetToDefaults = () => {
    setSettings({
      company_name: user?.company?.name || '',
      company_name_ar: user?.company?.name_ar || '',
      primary_color: '#3b82f6',
      secondary_color: '#64748b',
      accent_color: '#f59e0b',
      font_family: 'Inter',
      custom_css: ''
    });
    toast.success('تم إعادة تعيين الإعدادات إلى القيم الافتراضية');
  };

  const saveSettings = () => {
    // TODO: Implement save to database
    console.log('Saving branding settings:', settings);
    toast.success('تم حفظ إعدادات الهوية البصرية بنجاح');
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Logo and Company Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            الشعار ومعلومات الشركة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Logo Upload */}
            <div className="space-y-4">
              <Label>شعار الشركة</Label>
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={settings.logo_url} alt="شعار الشركة" />
                  <AvatarFallback>
                    <ImageIcon className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    onClick={() => logoFileRef.current?.click()}
                    disabled={isUploading}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? 'جاري الرفع...' : 'رفع شعار جديد'}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG حتى 2MB
                  </p>
                </div>
              </div>
              <input
                ref={logoFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'logo');
                }}
              />
            </div>

            {/* Favicon Upload */}
            <div className="space-y-4">
              <Label>أيقونة الموقع (Favicon)</Label>
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center bg-muted/50">
                  {settings.favicon_url ? (
                    <img src={settings.favicon_url} alt="Favicon" className="h-8 w-8" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    onClick={() => faviconFileRef.current?.click()}
                    disabled={isUploading}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    رفع أيقونة
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    32x32px مفضل
                  </p>
                </div>
              </div>
              <input
                ref={faviconFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'favicon');
                }}
              />
            </div>
          </div>

          {/* Company Names */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company_name">اسم الشركة (بالإنجليزية)</Label>
              <Input
                id="company_name"
                value={settings.company_name}
                onChange={(e) => setSettings(prev => ({...prev, company_name: e.target.value}))}
                placeholder="Company Name"
              />
            </div>
            <div>
              <Label htmlFor="company_name_ar">اسم الشركة (بالعربية)</Label>
              <Input
                id="company_name_ar"
                value={settings.company_name_ar}
                onChange={(e) => setSettings(prev => ({...prev, company_name_ar: e.target.value}))}
                placeholder="اسم الشركة"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Color Scheme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            نظام الألوان
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Color Presets */}
          <div>
            <Label className="text-base font-medium">الأنماط المحددة مسبقاً</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
              {colorPresets.map((preset, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="justify-start h-auto p-3"
                  onClick={() => applyColorPreset(preset)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div 
                        className="w-4 h-4 rounded-full border border-border"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <div 
                        className="w-4 h-4 rounded-full border border-border"
                        style={{ backgroundColor: preset.secondary }}
                      />
                      <div 
                        className="w-4 h-4 rounded-full border border-border"
                        style={{ backgroundColor: preset.accent }}
                      />
                    </div>
                    <span className="text-sm">{preset.name}</span>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Colors */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="primary_color">اللون الأساسي</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="primary_color"
                  type="color"
                  value={settings.primary_color}
                  onChange={(e) => setSettings(prev => ({...prev, primary_color: e.target.value}))}
                  className="w-12 h-10 p-1 border border-border"
                />
                <Input
                  value={settings.primary_color}
                  onChange={(e) => setSettings(prev => ({...prev, primary_color: e.target.value}))}
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="secondary_color">اللون الثانوي</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="secondary_color"
                  type="color"
                  value={settings.secondary_color}
                  onChange={(e) => setSettings(prev => ({...prev, secondary_color: e.target.value}))}
                  className="w-12 h-10 p-1 border border-border"
                />
                <Input
                  value={settings.secondary_color}
                  onChange={(e) => setSettings(prev => ({...prev, secondary_color: e.target.value}))}
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="accent_color">لون التمييز</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="accent_color"
                  type="color"
                  value={settings.accent_color}
                  onChange={(e) => setSettings(prev => ({...prev, accent_color: e.target.value}))}
                  className="w-12 h-10 p-1 border border-border"
                />
                <Input
                  value={settings.accent_color}
                  onChange={(e) => setSettings(prev => ({...prev, accent_color: e.target.value}))}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Typography */}
      <Card>
        <CardHeader>
          <CardTitle>إعدادات الخطوط</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="font_family">خط النظام</Label>
              <Select 
                value={settings.font_family} 
                onValueChange={(value) => setSettings(prev => ({...prev, font_family: value}))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontOptions.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom CSS */}
      <Card>
        <CardHeader>
          <CardTitle>CSS مخصص</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Label htmlFor="custom_css">كود CSS إضافي</Label>
            <Textarea
              id="custom_css"
              value={settings.custom_css}
              onChange={(e) => setSettings(prev => ({...prev, custom_css: e.target.value}))}
              placeholder="/* أضف كود CSS مخصص هنا */"
              className="min-h-32 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              احرص على كتابة كود CSS صالح. الكود الخاطئ قد يؤثر على مظهر النظام.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={previewChanges} variant="outline">
          <Eye className="h-4 w-4 mr-2" />
          معاينة التغييرات
        </Button>
        <Button onClick={resetToDefaults} variant="outline">
          <RotateCcw className="h-4 w-4 mr-2" />
          إعادة تعيين
        </Button>
        <Button onClick={saveSettings}>
          <Save className="h-4 w-4 mr-2" />
          حفظ الإعدادات
        </Button>
      </div>
    </div>
  );
};