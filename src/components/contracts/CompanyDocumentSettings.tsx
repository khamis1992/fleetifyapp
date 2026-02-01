import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Settings, Save } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess'
import type { ContractDocumentSavingSettings } from '@/types/contractDocumentSaving'

interface CompanyDocumentSettingsProps {
  onSettingsChange?: (settings: ContractDocumentSavingSettings) => void
  className?: string
}

export function CompanyDocumentSettings({ 
  onSettingsChange, 
  className = '' 
}: CompanyDocumentSettingsProps) {
  const { companyId } = useUnifiedCompanyAccess()
  const [settings, setSettings] = React.useState<ContractDocumentSavingSettings>({
    auto_save_unsigned_contracts: true,
    auto_save_signed_contracts: true,
    auto_save_condition_reports: true,
    auto_save_signatures: false,
    pdf_generation_priority: 'immediate',
    error_handling_mode: 'lenient',
    notification_preferences: {
      success: true,
      warnings: true,
      errors: true
    }
  })
  
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    loadSettings()
  }, [companyId])

  const loadSettings = async () => {
    if (!companyId) {
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await (supabase
        .from('companies')
        .select('settings') as any)
        .eq('id', companyId)
        .single()

      if (error) {
        console.error('Failed to load company settings:', error)
        throw error
      }

      const settingsData = data?.settings as any
      
      // If no settings exist or document_saving is empty, use defaults
      if (!settingsData || !settingsData.document_saving) {
        console.log('📄 [COMPANY_SETTINGS] No document settings found, using defaults')
        // Settings already initialized with defaults, so keep them
        return
      }

      // Merge with defaults to ensure all properties exist
      const loadedSettings = {
        auto_save_unsigned_contracts: settingsData.document_saving.auto_save_unsigned_contracts ?? true,
        auto_save_signed_contracts: settingsData.document_saving.auto_save_signed_contracts ?? true,
        auto_save_condition_reports: settingsData.document_saving.auto_save_condition_reports ?? true,
        auto_save_signatures: settingsData.document_saving.auto_save_signatures ?? false,
        pdf_generation_priority: settingsData.document_saving.pdf_generation_priority ?? 'immediate',
        error_handling_mode: settingsData.document_saving.error_handling_mode ?? 'lenient',
        notification_preferences: {
          success: settingsData.document_saving.notification_preferences?.success ?? true,
          warnings: settingsData.document_saving.notification_preferences?.warnings ?? true,
          errors: settingsData.document_saving.notification_preferences?.errors ?? true
        }
      }
      
      console.log('📄 [COMPANY_SETTINGS] Loaded settings:', loadedSettings)
      setSettings(loadedSettings)
      
    } catch (error) {
      console.error('Failed to load document settings:', error)
      toast.error('فشل في تحميل إعدادات المستندات')
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!companyId) {
      toast.error('معرف الشركة غير موجود')
      return
    }

    setIsSaving(true)

    try {
      // Get current settings first
      const { data: currentData, error: fetchError } = await (supabase
        .from('companies')
        .select('settings') as any)
        .eq('id', companyId)
        .single()

      if (fetchError) throw fetchError

      const currentSettings = currentData?.settings || {}
      const updatedSettings = {
        ...currentSettings,
        document_saving: settings
      }

      const { error } = await (supabase
        .from('companies')
        .update({ settings: updatedSettings }) as any)
        .eq('id', companyId)

      if (error) throw error

      toast.success('تم حفظ الإعدادات بنجاح')
      onSettingsChange?.(settings)
    } catch (error) {
      console.error('Failed to save document settings:', error)
      toast.error('فشل في حفظ الإعدادات')
    } finally {
      setIsSaving(false)
    }
  }

  const updateSetting = <K extends keyof ContractDocumentSavingSettings>(
    key: K, 
    value: ContractDocumentSavingSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const updateNotificationSetting = (
    key: keyof ContractDocumentSavingSettings['notification_preferences'], 
    value: boolean
  ) => {
    setSettings(prev => ({
      ...prev,
      notification_preferences: {
        ...prev.notification_preferences,
        [key]: value
      }
    }))
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="h-4 bg-slate-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          إعدادات حفظ مستندات العقود
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Auto-save Options */}
        <div className="space-y-4">
          <h3 className="font-semibold text-base">خيارات الحفظ التلقائي</h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-unsigned">حفظ العقود غير الموقعة</Label>
              <p className="text-sm text-muted-foreground">
                حفظ نسخة PDF أولية من العقد قبل التوقيع
              </p>
            </div>
            <Switch
              id="auto-unsigned"
              checked={settings.auto_save_unsigned_contracts}
              onCheckedChange={(checked) => updateSetting('auto_save_unsigned_contracts', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-signed">حفظ العقود الموقعة</Label>
              <p className="text-sm text-muted-foreground">
                حفظ نسخة PDF موقعة من العقد تلقائياً
              </p>
            </div>
            <Switch
              id="auto-signed"
              checked={settings.auto_save_signed_contracts}
              onCheckedChange={(checked) => updateSetting('auto_save_signed_contracts', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-condition">ربط تقارير حالة المركبات</Label>
              <p className="text-sm text-muted-foreground">
                ربط تقارير حالة المركبات بمستندات العقد تلقائياً
              </p>
            </div>
            <Switch
              id="auto-condition"
              checked={settings.auto_save_condition_reports}
              onCheckedChange={(checked) => updateSetting('auto_save_condition_reports', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-signatures">حفظ التوقيعات المنفصلة</Label>
              <p className="text-sm text-muted-foreground">
                حفظ التوقيعات كمستندات منفصلة
              </p>
            </div>
            <Switch
              id="auto-signatures"
              checked={settings.auto_save_signatures}
              onCheckedChange={(checked) => updateSetting('auto_save_signatures', checked)}
            />
          </div>
        </div>

        <Separator />

        {/* Processing Options */}
        <div className="space-y-4">
          <h3 className="font-semibold text-base">خيارات المعالجة</h3>
          
          <div className="space-y-2">
            <Label htmlFor="pdf-priority">أولوية إنشاء PDF</Label>
            <Select
              value={settings.pdf_generation_priority}
              onValueChange={(value: 'immediate' | 'background' | 'manual') => 
                updateSetting('pdf_generation_priority', value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">فوري</SelectItem>
                <SelectItem value="background">في الخلفية</SelectItem>
                <SelectItem value="manual">يدوي</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              تحديد متى يتم إنشاء ملفات PDF للعقود
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="error-handling">نمط معالجة الأخطاء</Label>
            <Select
              value={settings.error_handling_mode}
              onValueChange={(value: 'strict' | 'lenient') => 
                updateSetting('error_handling_mode', value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="strict">صارم - إيقاف العملية عند الخطأ</SelectItem>
                <SelectItem value="lenient">متساهل - متابعة رغم الأخطاء</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              كيفية التعامل مع أخطاء حفظ المستندات
            </p>
          </div>
        </div>

        <Separator />

        {/* Notification Preferences */}
        <div className="space-y-4">
          <h3 className="font-semibold text-base">تفضيلات الإشعارات</h3>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-success">إشعارات النجاح</Label>
            <Switch
              id="notify-success"
              checked={settings.notification_preferences.success}
              onCheckedChange={(checked) => updateNotificationSetting('success', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="notify-warnings">إشعارات التحذيرات</Label>
            <Switch
              id="notify-warnings"
              checked={settings.notification_preferences.warnings}
              onCheckedChange={(checked) => updateNotificationSetting('warnings', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="notify-errors">إشعارات الأخطاء</Label>
            <Switch
              id="notify-errors"
              checked={settings.notification_preferences.errors}
              onCheckedChange={(checked) => updateNotificationSetting('errors', checked)}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4">
          <Button 
            onClick={saveSettings} 
            disabled={isSaving}
            className="w-full"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                حفظ الإعدادات
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}