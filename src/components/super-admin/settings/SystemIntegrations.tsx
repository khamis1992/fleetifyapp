import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, Code, Database, MessageSquare, CreditCard, Mail, Webhook } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const SystemIntegrations: React.FC = () => {
  const { toast } = useToast();
  
  const [integrations] = useState([
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Payment processing and subscription management',
      icon: CreditCard,
      status: 'connected',
      category: 'payment',
      lastSync: '2024-01-15 14:30',
    },
    {
      id: 'mailgun',
      name: 'Mailgun',
      description: 'Email delivery and transactional emails',
      icon: Mail,
      status: 'connected',
      category: 'email',
      lastSync: '2024-01-15 14:25',
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Team notifications and alerts',
      icon: MessageSquare,
      status: 'disconnected',
      category: 'notification',
      lastSync: null,
    },
    {
      id: 'zapier',
      name: 'Zapier',
      description: 'Workflow automation and integrations',
      icon: Zap,
      status: 'connected',
      category: 'automation',
      lastSync: '2024-01-15 13:45',
    },
  ]);

  const [apiSettings] = useState({
    rateLimit: '1000',
    enableCors: true,
    requireAuth: true,
    enableWebhooks: true,
    webhookSecret: 'whsec_1234567890abcdef',
  });

  const [webhooks] = useState([
    {
      id: '1',
      name: 'User Registration Webhook',
      url: 'https://api.example.com/webhooks/user-register',
      events: ['user.created', 'user.updated'],
      status: 'active',
      lastTriggered: '2024-01-15 14:30',
    },
    {
      id: '2',
      name: 'Invoice Webhook',
      url: 'https://api.example.com/webhooks/invoice',
      events: ['invoice.created', 'invoice.paid'],
      status: 'active',
      lastTriggered: '2024-01-15 12:15',
    },
    {
      id: '3',
      name: 'System Alert Webhook',
      url: 'https://api.example.com/webhooks/alerts',
      events: ['system.alert'],
      status: 'inactive',
      lastTriggered: null,
    },
  ]);

  const handleIntegrationToggle = (integrationId: string, enabled: boolean) => {
    toast({
      title: `Integration ${enabled ? 'enabled' : 'disabled'}`,
      description: `${integrationId} integration has been ${enabled ? 'connected' : 'disconnected'}.`,
    });
  };

  const testWebhook = (webhookId: string) => {
    toast({
      title: "Webhook test sent",
      description: "A test payload has been sent to the webhook endpoint.",
    });
  };

  const generateApiKey = () => {
    toast({
      title: "API key generated",
      description: "A new API key has been generated. Please store it securely.",
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="integrations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="api">API Management</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-6">
          {/* Available Integrations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                System Integrations
              </CardTitle>
              <CardDescription>
                Manage third-party integrations and external services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {integrations.map((integration) => (
                  <Card key={integration.id} className="border-l-4 border-l-primary/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <integration.icon className="h-8 w-8 text-primary" />
                          <div>
                            <CardTitle className="text-base">{integration.name}</CardTitle>
                            <CardDescription className="text-sm">
                              {integration.description}
                            </CardDescription>
                          </div>
                        </div>
                        <Switch
                          checked={integration.status === 'connected'}
                          onCheckedChange={(checked) => handleIntegrationToggle(integration.id, checked)}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant={integration.status === 'connected' ? 'default' : 'secondary'}>
                            {integration.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground capitalize">
                            {integration.category}
                          </span>
                        </div>
                        {integration.lastSync && (
                          <p className="text-xs text-muted-foreground">
                            Last sync: {integration.lastSync}
                          </p>
                        )}
                        <Button variant="outline" size="sm" className="w-full">
                          Configure
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          {/* API Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                API Configuration
              </CardTitle>
              <CardDescription>
                Manage API access, rate limiting, and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="rate-limit">Rate Limit (requests/hour)</Label>
                    <Input
                      id="rate-limit"
                      type="number"
                      value={apiSettings.rateLimit}
                      placeholder="1000"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="cors">Enable CORS</Label>
                    <Switch
                      id="cors"
                      checked={apiSettings.enableCors}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="auth">Require Authentication</Label>
                    <Switch
                      id="auth"
                      checked={apiSettings.requireAuth}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>API Key Management</Label>
                    <div className="flex gap-2">
                      <Button onClick={generateApiKey}>
                        Generate New Key
                      </Button>
                      <Button variant="outline">
                        View Keys
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>API Documentation</Label>
                    <div className="flex gap-2">
                      <Button variant="outline">
                        View Docs
                      </Button>
                      <Button variant="outline">
                        Download OpenAPI
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* API Usage Stats */}
              <div className="pt-6 border-t">
                <h4 className="font-medium mb-4">API Usage Statistics</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-primary">45,231</div>
                    <div className="text-sm text-muted-foreground">Total Requests</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-primary">98.5%</div>
                    <div className="text-sm text-muted-foreground">Success Rate</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-primary">125ms</div>
                    <div className="text-sm text-muted-foreground">Avg Response</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-primary">15</div>
                    <div className="text-sm text-muted-foreground">Active Keys</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6">
          {/* Webhook Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5 text-primary" />
                Webhook Configuration
              </CardTitle>
              <CardDescription>
                Manage webhook endpoints for real-time event notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="webhooks-enabled">Enable Webhooks</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow the system to send webhook notifications
                  </p>
                </div>
                <Switch
                  id="webhooks-enabled"
                  checked={apiSettings.enableWebhooks}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhook-secret">Webhook Secret</Label>
                <Input
                  id="webhook-secret"
                  type="password"
                  value={apiSettings.webhookSecret}
                  placeholder="Webhook signing secret"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Configured Webhooks</h4>
                  <Button>Add Webhook</Button>
                </div>

                {webhooks.map((webhook) => (
                  <div key={webhook.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium">{webhook.name}</h5>
                      <Badge variant={webhook.status === 'active' ? 'default' : 'secondary'}>
                        {webhook.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>URL: {webhook.url}</p>
                      <p>Events: {webhook.events.join(', ')}</p>
                      {webhook.lastTriggered && (
                        <p>Last triggered: {webhook.lastTriggered}</p>
                      )}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm" onClick={() => testWebhook(webhook.id)}>
                        Test
                      </Button>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        Logs
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};