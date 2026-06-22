import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield, Key, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { useFleetifyTranslation } from "@/hooks/useTranslation";
export const SystemSecuritySettings: React.FC = () => {
  const { t } = useFleetifyTranslation("ui");
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    enforcePasswordPolicy: true,
    sessionTimeout: '24',
    enableTwoFactor: true,
    allowAnonymousUsers: false,
    maxFailedLogins: '5',
    passwordMinLength: '8',
    requireSpecialChars: true,
    requireNumbers: true,
    enableAuditLog: true,
    autoSignupConfirmation: false,
  });

  const handleSave = () => {
    toast({
      title: t("securitySettingsUpdated"),
      description: t("systemSecurityConfigurationHas"),
    });
  };

  const securityRules = [
    { name: 'Password Policy', status: 'active', description: t("minimum8CharactersWith") },
    { name: 'Session Management', status: 'active', description: '24-hour automatic timeout' },
    { name: 'Failed Login Protection', status: 'active', description: t("accountLockoutAfter5") },
    { name: 'Audit Logging', status: 'active', description: t("allSystemActionsAre") },
  ];

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {securityRules.map((rule) => (
          <Card key={rule.name} className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{rule.name}</CardTitle>
                <Badge variant={rule.status === 'active' ? 'default' : 'secondary'}>
                  {rule.status === 'active' ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 mr-1" />
                  )}
                  {rule.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{rule.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Authentication Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />{t("authenticationAccessControl")}</CardTitle>
          <CardDescription>{t("configureSystemwideAuthenticationPolicies")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="password-policy">{t("enforceStrongPasswordPolicy")}</Label>
                <Switch
                  id="password-policy"
                  checked={settings.enforcePasswordPolicy}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, enforcePasswordPolicy: checked }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="min-length">{t("minimumPasswordLength")}</Label>
                <Input
                  id="min-length"
                  type="number"
                  value={settings.passwordMinLength}
                  onChange={(e) => 
                    setSettings(prev => ({ ...prev, passwordMinLength: e.target.value }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="special-chars">{t("requireSpecialCharacters")}</Label>
                <Switch
                  id="special-chars"
                  checked={settings.requireSpecialChars}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, requireSpecialChars: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="require-numbers">{t("requireNumbers")}</Label>
                <Switch
                  id="require-numbers"
                  checked={settings.requireNumbers}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, requireNumbers: checked }))
                  }
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="two-factor">{t("enableTwofactorAuthentication")}</Label>
                <Switch
                  id="two-factor"
                  checked={settings.enableTwoFactor}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, enableTwoFactor: checked }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="session-timeout">{t("sessionTimeoutHours")}</Label>
                <Select value={settings.sessionTimeout} onValueChange={(value) => 
                  setSettings(prev => ({ ...prev, sessionTimeout: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="8">8 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="72">3 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="failed-logins">{t("maxFailedLoginAttempts")}</Label>
                <Input
                  id="failed-logins"
                  type="number"
                  value={settings.maxFailedLogins}
                  onChange={(e) => 
                    setSettings(prev => ({ ...prev, maxFailedLogins: e.target.value }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="anonymous">{t("allowAnonymousUsers")}</Label>
                <Switch
                  id="anonymous"
                  checked={settings.allowAnonymousUsers}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, allowAnonymousUsers: checked }))
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit & Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />{t("auditMonitoring")}</CardTitle>
          <CardDescription>{t("configureSystemMonitoringAnd")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="audit-log">{t("enableSystemAuditLogging")}</Label>
              <p className="text-sm text-muted-foreground">{t("logAllSystemActions")}</p>
            </div>
            <Switch
              id="audit-log"
              checked={settings.enableAuditLog}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, enableAuditLog: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-signup">{t("autoconfirmEmailSignups")}</Label>
              <p className="text-sm text-muted-foreground">{t("automaticallyConfirmUserEmail")}</p>
            </div>
            <Switch
              id="auto-signup"
              checked={settings.autoSignupConfirmation}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, autoSignupConfirmation: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="flex items-center gap-2">
          <Shield className="h-4 w-4" />{t("saveSecuritySettings")}</Button>
      </div>
    </div>
  );
};