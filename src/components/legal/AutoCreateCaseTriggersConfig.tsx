/**
 * Auto-Create Case Triggers Configuration
 * محفزات الإنشاء التلقائي للقضايا القانونية
 * 
 * Configure automatic legal case creation based on:
 * - Invoice overdue > X days (configurable)
 * - Total overdue > threshold amount (configurable)
 * - Customer broke 3+ payment promises
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { autoCreateTriggersTranslations as t } from './translations/autoCreateTriggers';
import { useLegalCaseAutoTriggers } from '@/hooks/useLegalCaseAutoTriggers';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface AutoCreateTriggerConfig {
  enable_overdue_invoice_trigger: boolean;
  overdue_days_threshold: number;
  
  enable_overdue_amount_trigger: boolean;
  overdue_amount_threshold: number;
  
  enable_broken_promises_trigger: boolean;
  broken_promises_count: number;
  
  auto_case_priority: 'low' | 'medium' | 'high' | 'urgent';
  auto_case_type: string;
  notify_on_auto_create: boolean;
}

interface AutoCreateCaseTriggersConfigProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSave?: (config: AutoCreateTriggerConfig) => void;
}

const AutoCreateCaseTriggersConfig: React.FC<AutoCreateCaseTriggersConfigProps> = ({
  open,
  onOpenChange,
  companyId,
  onSave,
}) => {
  const { config: savedConfig, isLoading, saveConfig } = useLegalCaseAutoTriggers(companyId);
  const [config, setConfig] = useState<AutoCreateTriggerConfig>({
    enable_overdue_invoice_trigger: true,
    overdue_days_threshold: 21,
    enable_overdue_amount_trigger: true,
    overdue_amount_threshold: 15000,
    enable_broken_promises_trigger: true,
    broken_promises_count: 3,
    auto_case_priority: 'high',
    auto_case_type: 'payment_collection',
    notify_on_auto_create: true,
  });

  // Load saved config when dialog opens
  React.useEffect(() => {
    if (open && savedConfig) {
      setConfig(savedConfig);
    }
  }, [open, savedConfig]);

  const handleSave = async () => {
    // Validate thresholds
    if (config.overdue_days_threshold < 1) {
      toast.error(t.messages.errorDays);
      return;
    }
    if (config.overdue_amount_threshold < 100) {
      toast.error(t.messages.errorAmount);
      return;
    }
    if (config.broken_promises_count < 1) {
      toast.error(t.messages.errorPromises);
      return;
    }

    try {
      await saveConfig.mutateAsync(config);
      onSave?.(config);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving config:', error);
    }
  };

  const countEnabledTriggers = [
    config.enable_overdue_invoice_trigger,
    config.enable_overdue_amount_trigger,
    config.enable_broken_promises_trigger,
  ].filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            {t.dialog.title}
          </DialogTitle>
          <DialogDescription>
            {t.dialog.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>{t.alert.enabledCount(countEnabledTriggers)}</strong> {t.alert.description}
            </AlertDescription>
          </Alert>

          {/* Trigger 1: Invoice Overdue by Days */}
          <Card className={config.enable_overdue_invoice_trigger ? 'border-primary' : 'opacity-60'}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Checkbox
                      checked={config.enable_overdue_invoice_trigger}
                      onCheckedChange={(checked) =>
                        setConfig({
                          ...config,
                          enable_overdue_invoice_trigger: !!checked,
                        })
                      }
                    />
                    {t.triggers.overdueInvoice.title}
                  </CardTitle>
                  <CardDescription>
                    {t.triggers.overdueInvoice.description}
                  </CardDescription>
                </div>
                {config.enable_overdue_invoice_trigger && (
                  <Badge className="bg-green-600">{t.badges.enabled}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="overdue_days" className="text-sm font-semibold mb-2 block">
                  {t.triggers.overdueInvoice.label} *
                </Label>
                <Input
                  id="overdue_days"
                  type="number"
                  min="1"
                  max="365"
                  value={config.overdue_days_threshold}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      overdue_days_threshold: parseInt(e.target.value) || 1,
                    })
                  }
                  disabled={!config.enable_overdue_invoice_trigger}
                  placeholder={t.triggers.overdueInvoice.placeholder}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {t.triggers.overdueInvoice.example}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Trigger 2: Total Overdue Amount */}
          <Card className={config.enable_overdue_amount_trigger ? 'border-primary' : 'opacity-60'}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Checkbox
                      checked={config.enable_overdue_amount_trigger}
                      onCheckedChange={(checked) =>
                        setConfig({
                          ...config,
                          enable_overdue_amount_trigger: !!checked,
                        })
                      }
                    />
                    {t.triggers.overdueAmount.title}
                  </CardTitle>
                  <CardDescription>
                    {t.triggers.overdueAmount.description}
                  </CardDescription>
                </div>
                {config.enable_overdue_amount_trigger && (
                  <Badge className="bg-green-600">{t.badges.enabled}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="overdue_amount" className="text-sm font-semibold mb-2 block">
                  {t.triggers.overdueAmount.label} *
                </Label>
                <Input
                  id="overdue_amount"
                  type="number"
                  min="100"
                  step="100"
                  value={config.overdue_amount_threshold}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      overdue_amount_threshold: parseInt(e.target.value) || 100,
                    })
                  }
                  disabled={!config.enable_overdue_amount_trigger}
                  placeholder={t.triggers.overdueAmount.placeholder}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {t.triggers.overdueAmount.example}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Trigger 3: Broken Payment Promises */}
          <Card className={config.enable_broken_promises_trigger ? 'border-primary' : 'opacity-60'}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Checkbox
                      checked={config.enable_broken_promises_trigger}
                      onCheckedChange={(checked) =>
                        setConfig({
                          ...config,
                          enable_broken_promises_trigger: !!checked,
                        })
                      }
                    />
                    {t.triggers.brokenPromises.title}
                  </CardTitle>
                  <CardDescription>
                    {t.triggers.brokenPromises.description}
                  </CardDescription>
                </div>
                {config.enable_broken_promises_trigger && (
                  <Badge className="bg-green-600">{t.badges.enabled}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="broken_promises" className="text-sm font-semibold mb-2 block">
                  {t.triggers.brokenPromises.label} *
                </Label>
                <Input
                  id="broken_promises"
                  type="number"
                  min="1"
                  max="10"
                  value={config.broken_promises_count}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      broken_promises_count: parseInt(e.target.value) || 1,
                    })
                  }
                  disabled={!config.enable_broken_promises_trigger}
                  placeholder={t.triggers.brokenPromises.placeholder}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {t.triggers.brokenPromises.example}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Default Case Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.settings.title}</CardTitle>
              <CardDescription>
                {t.settings.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="auto_priority" className="text-sm font-semibold mb-2 block">
                  {t.settings.priority.label}
                </Label>
                <select
                  id="auto_priority"
                  value={config.auto_case_priority}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      auto_case_priority: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="low">{t.settings.priority.options.low}</option>
                  <option value="medium">{t.settings.priority.options.medium}</option>
                  <option value="high">{t.settings.priority.options.high}</option>
                  <option value="urgent">{t.settings.priority.options.urgent}</option>
                </select>
              </div>

              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Checkbox
                  checked={config.notify_on_auto_create}
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      notify_on_auto_create: !!checked,
                    })
                  }
                  id="notify_toggle"
                />
                <Label htmlFor="notify_toggle" className="flex-1 cursor-pointer">
                  <div className="font-medium">{t.settings.notify.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {t.settings.notify.description}
                  </div>
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6 space-y-2">
              <h4 className="font-medium text-blue-900">{t.summary.title}</h4>
              <ul className="space-y-1 text-sm text-blue-800">
                {config.enable_overdue_invoice_trigger && (
                  <li>{t.summary.overdueInvoice(config.overdue_days_threshold)}</li>
                )}
                {config.enable_overdue_amount_trigger && (
                  <li>{t.summary.overdueAmount(config.overdue_amount_threshold)}</li>
                )}
                {config.enable_broken_promises_trigger && (
                  <li>{t.summary.brokenPromises(config.broken_promises_count)}</li>
                )}
                {countEnabledTriggers === 0 && (
                  <li className="text-blue-600">{t.summary.noTriggers}</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.buttons.cancel}
          </Button>
          <Button onClick={handleSave}>
            {t.buttons.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AutoCreateCaseTriggersConfig;
