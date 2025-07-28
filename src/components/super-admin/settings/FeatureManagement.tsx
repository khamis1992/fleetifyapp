import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Users, Car, DollarSign, FileText, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const FeatureManagement: React.FC = () => {
  const { toast } = useToast();
  const [features, setFeatures] = useState({
    fleetManagement: { enabled: true, plans: ['professional', 'enterprise'] },
    hrManagement: { enabled: true, plans: ['professional', 'enterprise'] },
    financialReporting: { enabled: true, plans: ['basic', 'professional', 'enterprise'] },
    advancedAnalytics: { enabled: true, plans: ['professional', 'enterprise'] },
    multiCompany: { enabled: true, plans: ['enterprise'] },
    apiAccess: { enabled: true, plans: ['professional', 'enterprise'] },
    customBranding: { enabled: true, plans: ['professional', 'enterprise'] },
    backupRestore: { enabled: true, plans: ['enterprise'] },
  });

  const subscriptionPlans = [
    {
      id: 'free',
      name: 'Free',
      description: 'Basic features for small teams',
      price: '$0',
      features: ['Basic dashboard', 'Limited users (5)', 'Basic reporting'],
      userLimit: 5,
      storageLimit: '1GB',
    },
    {
      id: 'basic',
      name: 'Basic',
      description: 'Essential features for growing businesses',
      price: '$29',
      features: ['Full dashboard', 'Up to 25 users', 'Standard reporting', 'Email support'],
      userLimit: 25,
      storageLimit: '10GB',
    },
    {
      id: 'professional',
      name: 'Professional',
      description: 'Advanced features for established companies',
      price: '$79',
      features: ['All basic features', 'Up to 100 users', 'Advanced analytics', 'Priority support', 'API access'],
      userLimit: 100,
      storageLimit: '100GB',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'Complete solution with all features',
      price: '$199',
      features: ['All features', 'Unlimited users', 'Custom integrations', '24/7 support', 'Advanced security'],
      userLimit: -1,
      storageLimit: 'Unlimited',
    },
  ];

  const featureCategories = [
    {
      name: 'Fleet Management',
      key: 'fleetManagement',
      icon: Car,
      description: 'Vehicle tracking, maintenance, and fleet analytics',
    },
    {
      name: 'HR Management',
      key: 'hrManagement',
      icon: Users,
      description: 'Employee management, payroll, and attendance tracking',
    },
    {
      name: 'Financial Reporting',
      key: 'financialReporting',
      icon: DollarSign,
      description: 'Accounting, invoicing, and financial analytics',
    },
    {
      name: 'Advanced Analytics',
      key: 'advancedAnalytics',
      icon: BarChart3,
      description: 'Business intelligence and advanced reporting',
    },
    {
      name: 'Multi-Company',
      key: 'multiCompany',
      icon: Settings,
      description: 'Manage multiple companies from one dashboard',
    },
    {
      name: 'API Access',
      key: 'apiAccess',
      icon: FileText,
      description: 'REST API access for custom integrations',
    },
  ];

  const handleFeatureToggle = (featureKey: string, enabled: boolean) => {
    setFeatures(prev => ({
      ...prev,
      [featureKey]: { ...prev[featureKey], enabled }
    }));
    
    toast({
      title: `Feature ${enabled ? 'enabled' : 'disabled'}`,
      description: `${featureKey} has been ${enabled ? 'enabled' : 'disabled'} system-wide.`,
    });
  };

  const handlePlanUpdate = (planId: string) => {
    toast({
      title: "Plan updated",
      description: `${planId} plan configuration has been saved.`,
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="features" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="features">Feature Gates</TabsTrigger>
          <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="features" className="space-y-6">
          {/* Feature Gates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                System Feature Gates
              </CardTitle>
              <CardDescription>
                Control which features are available across the platform and which plans they require
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {featureCategories.map((category) => (
                  <Card key={category.key} className="border-l-4 border-l-primary/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <category.icon className="h-5 w-5 text-primary" />
                          <div>
                            <CardTitle className="text-base">{category.name}</CardTitle>
                            <CardDescription className="text-sm">
                              {category.description}
                            </CardDescription>
                          </div>
                        </div>
                        <Switch
                          checked={features[category.key]?.enabled || false}
                          onCheckedChange={(enabled) => handleFeatureToggle(category.key, enabled)}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Required Plans:</Label>
                        <div className="flex flex-wrap gap-1">
                          {features[category.key]?.plans?.map((plan) => (
                            <Badge key={plan} variant="secondary" className="text-xs">
                              {plan}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          {/* Subscription Plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {subscriptionPlans.map((plan) => (
              <Card key={plan.id} className="relative">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <Badge variant={plan.id === 'enterprise' ? 'default' : 'secondary'}>
                      {plan.price}/month
                    </Badge>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>User Limit:</span>
                      <span className="font-medium">
                        {plan.userLimit === -1 ? 'Unlimited' : plan.userLimit}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Storage:</span>
                      <span className="font-medium">{plan.storageLimit}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Features:</Label>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-primary rounded-full" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => handlePlanUpdate(plan.id)}
                  >
                    Edit Plan
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Plan Management Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Plan Management</CardTitle>
              <CardDescription>
                Global subscription plan settings and configurations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="trial-period">Free Trial Period (days)</Label>
                  <Input id="trial-period" type="number" defaultValue="14" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grace-period">Payment Grace Period (days)</Label>
                  <Input id="grace-period" type="number" defaultValue="3" />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => handlePlanUpdate('global')}>
                  Save Settings
                </Button>
                <Button variant="outline">
                  Export Plan Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};