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

export const SystemSecuritySettings: React.FC = () => {
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
      title: "Security settings updated",
      description: "System security configuration has been saved successfully.",
    });
  };

  const securityRules = [
    { name: 'Password Policy', status: 'active', description: 'Minimum 8 characters with special chars' },
    { name: 'Session Management', status: 'active', description: '24-hour automatic timeout' },
    { name: 'Failed Login Protection', status: 'active', description: 'Account lockout after 5 attempts' },
    { name: 'Audit Logging', status: 'active', description: 'All system actions are logged' },
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
            <Key className="h-5 w-5 text-primary" />
            Authentication & Access Control
          </CardTitle>
          <CardDescription>
            Configure system-wide authentication policies and access controls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="password-policy">Enforce Strong Password Policy</Label>
                <Switch
                  id="password-policy"
                  checked={settings.enforcePasswordPolicy}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, enforcePasswordPolicy: checked }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="min-length">Minimum Password Length</Label>
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
                <Label htmlFor="special-chars">Require Special Characters</Label>
                <Switch
                  id="special-chars"
                  checked={settings.requireSpecialChars}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, requireSpecialChars: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="require-numbers">Require Numbers</Label>
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
                <Label htmlFor="two-factor">Enable Two-Factor Authentication</Label>
                <Switch
                  id="two-factor"
                  checked={settings.enableTwoFactor}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, enableTwoFactor: checked }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="session-timeout">Session Timeout (hours)</Label>
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
                <Label htmlFor="failed-logins">Max Failed Login Attempts</Label>
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
                <Label htmlFor="anonymous">Allow Anonymous Users</Label>
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
            <Shield className="h-5 w-5 text-primary" />
            Audit & Monitoring
          </CardTitle>
          <CardDescription>
            Configure system monitoring and audit logging settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="audit-log">Enable System Audit Logging</Label>
              <p className="text-sm text-muted-foreground">
                Log all system actions and user activities
              </p>
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
              <Label htmlFor="auto-signup">Auto-confirm Email Signups</Label>
              <p className="text-sm text-muted-foreground">
                Automatically confirm user email addresses upon signup
              </p>
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
          <Shield className="h-4 w-4" />
          Save Security Settings
        </Button>
      </div>
    </div>
  );
};