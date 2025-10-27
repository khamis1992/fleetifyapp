/**
 * Auto-Create Case Triggers Configuration
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
  onSave?: (config: AutoCreateTriggerConfig) => void;
}

const AutoCreateCaseTriggersConfig: React.FC<AutoCreateCaseTriggersConfigProps> = ({
  open,
  onOpenChange,
  onSave,
}) => {
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

  const handleSave = () => {
    // Validate thresholds
    if (config.overdue_days_threshold < 1) {
      toast.error('Overdue days must be at least 1');
      return;
    }
    if (config.overdue_amount_threshold < 100) {
      toast.error('Overdue amount must be at least 100');
      return;
    }
    if (config.broken_promises_count < 1) {
      toast.error('Broken promises count must be at least 1');
      return;
    }

    onSave?.(config);
    toast.success('Auto-create triggers configured successfully');
    onOpenChange(false);
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
            Auto-Create Legal Case Triggers
          </DialogTitle>
          <DialogDescription>
            Configure automatic creation of legal cases based on customer behavior and payment status
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>{countEnabledTriggers} trigger(s) enabled.</strong> Legal cases will be automatically created when these conditions are met.
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
                    Invoice Overdue by Days
                  </CardTitle>
                  <CardDescription>
                    Auto-create case when invoice is overdue for X days
                  </CardDescription>
                </div>
                {config.enable_overdue_invoice_trigger && (
                  <Badge className="bg-green-600">Enabled</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="overdue_days" className="text-sm font-semibold mb-2 block">
                  Number of Days Overdue *
                </Label>
                <Input
                  id="overdue_days"
                  type="number"
                  min="1"
                  value={config.overdue_days_threshold}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      overdue_days_threshold: parseInt(e.target.value) || 1,
                    })
                  }
                  disabled={!config.enable_overdue_invoice_trigger}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Example: If set to 21, a case will be created when invoice is 21+ days overdue
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
                    Total Overdue Amount Threshold
                  </CardTitle>
                  <CardDescription>
                    Auto-create case when customer's total overdue amount exceeds threshold
                  </CardDescription>
                </div>
                {config.enable_overdue_amount_trigger && (
                  <Badge className="bg-green-600">Enabled</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="overdue_amount" className="text-sm font-semibold mb-2 block">
                  Overdue Amount Threshold (Currency Units) *
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
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Example: If set to 15,000, a case will be created when total overdue reaches or exceeds 15,000
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
                    Broken Payment Promises
                  </CardTitle>
                  <CardDescription>
                    Auto-create case when customer breaks X payment promises
                  </CardDescription>
                </div>
                {config.enable_broken_promises_trigger && (
                  <Badge className="bg-green-600">Enabled</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="broken_promises" className="text-sm font-semibold mb-2 block">
                  Number of Broken Promises *
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
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Example: If set to 3, a case will be created when customer breaks 3+ promises
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Default Case Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Default Case Settings</CardTitle>
              <CardDescription>
                These settings will be used for auto-created cases
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="auto_priority" className="text-sm font-semibold mb-2 block">
                  Default Priority for Auto-Created Cases
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
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
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
                  <div className="font-medium">Send Notification</div>
                  <div className="text-sm text-muted-foreground">
                    Notify legal team when case is auto-created
                  </div>
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6 space-y-2">
              <h4 className="font-medium text-blue-900">Configuration Summary</h4>
              <ul className="space-y-1 text-sm text-blue-800">
                {config.enable_overdue_invoice_trigger && (
                  <li>✓ Create case when invoice is {config.overdue_days_threshold}+ days overdue</li>
                )}
                {config.enable_overdue_amount_trigger && (
                  <li>✓ Create case when total overdue ≥ {config.overdue_amount_threshold}</li>
                )}
                {config.enable_broken_promises_trigger && (
                  <li>✓ Create case when {config.broken_promises_count}+ promises are broken</li>
                )}
                {countEnabledTriggers === 0 && (
                  <li className="text-blue-600">No triggers enabled - auto-create is disabled</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AutoCreateCaseTriggersConfig;
