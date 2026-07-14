import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { useImageUpload } from './useImageUpload';

export interface BrandingSettings {
  id?: string;
  system_name?: string;
  system_name_ar?: string;
  logo_url?: string;
  favicon_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  font_family: string;
  theme_preset: string;
  custom_css?: string;
  sidebar_background_color: string;
  sidebar_foreground_color: string;
  sidebar_accent_color: string;
  sidebar_border_color: string;
}

const DEFAULT_BRANDING_SETTINGS: BrandingSettings = {
  primary_color: '#2563eb',
  secondary_color: '#f59e0b',
  accent_color: '#dc2626',
  background_color: '#ffffff',
  text_color: '#1f2937',
  font_family: 'cairo',
  theme_preset: 'default',
  sidebar_background_color: '#ffffff',
  sidebar_foreground_color: '#1f2937',
  sidebar_accent_color: '#2563eb',
  sidebar_border_color: '#e5e7eb'
};

const normalizeBrandingSettings = (
  data: Record<string, unknown>
): BrandingSettings => ({
  id: typeof data.id === 'string' ? data.id : undefined,
  system_name: typeof data.system_name === 'string' ? data.system_name : undefined,
  system_name_ar: typeof data.system_name_ar === 'string' ? data.system_name_ar : undefined,
  logo_url: typeof data.logo_url === 'string' ? data.logo_url : undefined,
  favicon_url: typeof data.favicon_url === 'string' ? data.favicon_url : undefined,
  custom_css: typeof data.custom_css === 'string' ? data.custom_css : undefined,
  primary_color: typeof data.primary_color === 'string' ? data.primary_color : DEFAULT_BRANDING_SETTINGS.primary_color,
  secondary_color: typeof data.secondary_color === 'string' ? data.secondary_color : DEFAULT_BRANDING_SETTINGS.secondary_color,
  accent_color: typeof data.accent_color === 'string' ? data.accent_color : DEFAULT_BRANDING_SETTINGS.accent_color,
  background_color: typeof data.background_color === 'string' ? data.background_color : DEFAULT_BRANDING_SETTINGS.background_color,
  text_color: typeof data.text_color === 'string' ? data.text_color : DEFAULT_BRANDING_SETTINGS.text_color,
  font_family: typeof data.font_family === 'string' ? data.font_family : DEFAULT_BRANDING_SETTINGS.font_family,
  theme_preset: typeof data.theme_preset === 'string' ? data.theme_preset : DEFAULT_BRANDING_SETTINGS.theme_preset,
  sidebar_background_color: typeof data.sidebar_background_color === 'string' ? data.sidebar_background_color : DEFAULT_BRANDING_SETTINGS.sidebar_background_color,
  sidebar_foreground_color: typeof data.sidebar_foreground_color === 'string' ? data.sidebar_foreground_color : DEFAULT_BRANDING_SETTINGS.sidebar_foreground_color,
  sidebar_accent_color: typeof data.sidebar_accent_color === 'string' ? data.sidebar_accent_color : DEFAULT_BRANDING_SETTINGS.sidebar_accent_color,
  sidebar_border_color: typeof data.sidebar_border_color === 'string' ? data.sidebar_border_color : DEFAULT_BRANDING_SETTINGS.sidebar_border_color,
});

export const useCompanyBranding = () => {
  const { user } = useAuth();
  const { companyId } = useUnifiedCompanyAccess();
  const { toast } = useToast();
  const { deleteImage } = useImageUpload();
  const [settings, setSettings] = useState<BrandingSettings>(DEFAULT_BRANDING_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (companyId) {
      loadBrandingSettings();
    }
  }, [companyId]);

  const loadBrandingSettings = async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('company_branding_settings')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(normalizeBrandingSettings(data));
      }
    } catch (error) {
      console.error('Error loading branding settings:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل إعدادات الهوية البصرية",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveBrandingSettings = async (newSettings: Partial<BrandingSettings>) => {
    if (!companyId || !user) return;

    try {
      setSaving(true);
      const updatedSettings = { ...settings, ...newSettings };

      // Delete old images if they were replaced with new uploads
      if (settings?.logo_url && 
          newSettings.logo_url && 
          settings.logo_url !== newSettings.logo_url &&
          settings.logo_url.includes('supabase')) {
        await deleteImage(settings.logo_url);
      }
      
      if (settings?.favicon_url && 
          newSettings.favicon_url && 
          settings.favicon_url !== newSettings.favicon_url &&
          settings.favicon_url.includes('supabase')) {
        await deleteImage(settings.favicon_url);
      }

      const { data, error } = await supabase
        .from('company_branding_settings')
        .upsert({
          company_id: companyId,
          ...updatedSettings,
          created_by: user.id,
        }, {
          onConflict: 'company_id'
        })
        .select()
        .single();

      if (error) throw error;

      const normalizedSettings = normalizeBrandingSettings(data);
      setSettings(normalizedSettings);
      applyBrandingToSystem(normalizedSettings);
      
      toast({
        title: "تم الحفظ",
        description: "تم حفظ إعدادات الهوية البصرية بنجاح",
      });

      return data;
    } catch (error) {
      console.error('Error saving branding settings:', error);
      toast({
        title: "خطأ",
        description: "فشل في حفظ إعدادات الهوية البصرية",
        variant: "destructive",
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const applyBrandingToSystem = (brandingSettings: BrandingSettings) => {
    const root = document.documentElement;
    
    // Convert hex to HSL for CSS variables
    const hexToHsl = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }

      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    // Apply colors to CSS variables
    root.style.setProperty('--primary', hexToHsl(brandingSettings.primary_color));
    root.style.setProperty('--secondary', hexToHsl(brandingSettings.secondary_color));
    root.style.setProperty('--accent', hexToHsl(brandingSettings.accent_color));
    
    // Apply sidebar colors
    root.style.setProperty('--sidebar-background', hexToHsl(brandingSettings.sidebar_background_color));
    root.style.setProperty('--sidebar-foreground', hexToHsl(brandingSettings.sidebar_foreground_color));
    root.style.setProperty('--sidebar-accent', hexToHsl(brandingSettings.sidebar_accent_color));
    root.style.setProperty('--sidebar-border', hexToHsl(brandingSettings.sidebar_border_color));
    
    // Apply font family
    if (brandingSettings.font_family) {
      root.style.setProperty('--font-sans', brandingSettings.font_family);
    }

    // Apply custom CSS if provided
    if (brandingSettings.custom_css) {
      let customStyleElement = document.getElementById('custom-branding-styles');
      if (!customStyleElement) {
        customStyleElement = document.createElement('style');
        customStyleElement.id = 'custom-branding-styles';
        document.head.appendChild(customStyleElement);
      }
      customStyleElement.textContent = brandingSettings.custom_css;
    }
  };

  const resetToDefaults = async () => {
    const defaultSettings: BrandingSettings = {
      primary_color: '#2563eb',
      secondary_color: '#f59e0b',
      accent_color: '#dc2626',
      background_color: '#ffffff',
      text_color: '#1f2937',
      font_family: 'cairo',
      theme_preset: 'default',
      system_name: '',
      system_name_ar: '',
      logo_url: '',
      favicon_url: '',
      custom_css: '',
      sidebar_background_color: '#ffffff',
      sidebar_foreground_color: '#1f2937',
      sidebar_accent_color: '#2563eb',
      sidebar_border_color: '#e5e7eb'
    };

    return await saveBrandingSettings(defaultSettings);
  };

  const previewChanges = (previewSettings: Partial<BrandingSettings>) => {
    const tempSettings = { ...settings, ...previewSettings };
    applyBrandingToSystem(tempSettings);
  };

  return {
    settings,
    loading,
    saving,
    saveBrandingSettings,
    resetToDefaults,
    previewChanges,
    applyBrandingToSystem
  };
};
