import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bell, Mail, MessageSquare, Phone, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const GlobalNotificationSettings: React.FC = () => {
  const { toast } = useToast();
  const [emailSettings, setEmailSettings] = useState({
    smtpHost: 'smtp.example.com',
    smtpPort: '587',
    smtpUsername: '',
    smtpPassword: '',
    smtpSecurity: 'tls',
    fromEmail: 'noreply@yourcompany.com',
    fromName: 'Your Company',
    enableBounceTracking: true,
    enableClickTracking: true,
  });

  const [notificationTypes, setNotificationTypes] = useState({
    systemAlerts: { email: true, sms: false, push: true },
    securityAlerts: { email: true, sms: true, push: true },
    billing: { email: true, sms: false, push: false },
    updates: { email: true, sms: false, push: true },
    maintenance: { email: true, sms: false, push: true },
  });

  const [templates, setTemplates] = useState([
    {
      id: 'welcome',
      name: 'Welcome Email',
      subject: 'Welcome to the platform!',
      status: 'active',
      lastModified: '2024-01-15',
    },
    {
      id: 'password-reset',
      name: 'Password Reset',
      subject: 'Reset your password',
      status: 'active',
      lastModified: '2024-01-10',
    },
    {
      id: 'invoice',
      name: 'Invoice Notification',
      subject: 'New invoice available',
      status: 'active',
      lastModified: '2024-01-12',
    },
    {
      id: 'system-alert',
      name: 'System Alert',
      subject: 'System notification',
      status: 'active',
      lastModified: '2024-01-08',
    },
  ]);

  const handleSaveEmailSettings = () => {
    toast({
      title: "Email settings saved",
      description: "SMTP configuration has been updated successfully.",
    });
  };

  const handleNotificationToggle = (type: string, channel: string, enabled: boolean) => {
    setNotificationTypes(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [channel]: enabled
      }
    }));
  };

  const testEmailConfiguration = () => {
    toast({
      title: "Test email sent",
      description: "A test email has been sent to verify the configuration.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Email Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Email Configuration
          </CardTitle>
          <CardDescription>
            Configure SMTP settings for system-wide email delivery
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="smtp-host">SMTP Host</Label>
                <Input
                  id="smtp-host"
                  value={emailSettings.smtpHost}
                  onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpHost: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-port">SMTP Port</Label>
                <Input
                  id="smtp-port"
                  value={emailSettings.smtpPort}
                  onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpPort: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-security">Security</Label>
                <Select 
                  value={emailSettings.smtpSecurity} 
                  onValueChange={(value) => setEmailSettings(prev => ({ ...prev, smtpSecurity: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="tls">TLS</SelectItem>
                    <SelectItem value="ssl">SSL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="smtp-username">SMTP Username</Label>
                <Input
                  id="smtp-username"
                  value={emailSettings.smtpUsername}
                  onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpUsername: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-password">SMTP Password</Label>
                <Input
                  id="smtp-password"
                  type="password"
                  value={emailSettings.smtpPassword}
                  onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpPassword: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="from-email">From Email</Label>
                <Input
                  id="from-email"
                  type="email"
                  value={emailSettings.fromEmail}
                  onChange={(e) => setEmailSettings(prev => ({ ...prev, fromEmail: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSaveEmailSettings}>
              Save Email Settings
            </Button>
            <Button variant="outline" onClick={testEmailConfiguration}>
              Test Configuration
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Global Notification Preferences
          </CardTitle>
          <CardDescription>
            Configure which notification types are sent through different channels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(notificationTypes).map(([type, channels]) => (
              <div key={type} className="border rounded-lg p-4">
                <h4 className="font-medium mb-4 capitalize">
                  {type.replace(/([A-Z])/g, ' $1').trim()}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <Label>Email</Label>
                    </div>
                    <Switch
                      checked={channels.email}
                      onCheckedChange={(checked) => handleNotificationToggle(type, 'email', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <Label>SMS</Label>
                    </div>
                    <Switch
                      checked={channels.sms}
                      onCheckedChange={(checked) => handleNotificationToggle(type, 'sms', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      <Label>Push</Label>
                    </div>
                    <Switch
                      checked={channels.push}
                      onCheckedChange={(checked) => handleNotificationToggle(type, 'push', checked)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Email Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Email Templates
          </CardTitle>
          <CardDescription>
            Manage system-wide email templates used for notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {templates.map((template) => (
              <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <h4 className="font-medium">{template.name}</h4>
                  <p className="text-sm text-muted-foreground">{template.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    Last modified: {template.lastModified}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={template.status === 'active' ? 'default' : 'secondary'}>
                    {template.status}
                  </Badge>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex gap-2 mt-6">
            <Button>Create New Template</Button>
            <Button variant="outline">Import Templates</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};