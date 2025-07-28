import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useCompanyFeatures } from '@/hooks/useFeatureAccess';
import { 
  Crown, 
  Users, 
  Car, 
  FileText, 
  Calendar,
  CheckCircle,
  XCircle,
  TrendingUp,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export const SubscriptionManagement: React.FC = () => {
  const { user } = useAuth();
  const { data: features } = useCompanyFeatures();

  const { data: subscriptionData, isLoading } = useQuery({
    queryKey: ['subscription-data', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return null;

      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          subscription_plans!inner(*),
          company_usage(*)
        `)
        .eq('id', user.profile.company_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.profile?.company_id
  });

  const { data: availablePlans } = useQuery({
    queryKey: ['available-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentPlan = subscriptionData?.subscription_plans;
  const usage = subscriptionData?.company_usage?.[0];

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            الاشتراك الحالي
          </CardTitle>
          <CardDescription>
            إدارة خطة الاشتراك والاستخدام
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Plan Info */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">
                  {currentPlan?.name_ar || currentPlan?.name}
                </span>
                <Badge variant={currentPlan?.plan_code === 'free' ? 'secondary' : 'default'}>
                  {currentPlan?.plan_code === 'free' ? 'مجاني' : 'مدفوع'}
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {currentPlan?.description_ar || currentPlan?.description}
              </p>

              {currentPlan?.price && currentPlan.price > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{currentPlan.price} د.ك</span>
                  <span className="text-muted-foreground">/ شهرياً</span>
                </div>
              )}

              {/* Subscription end date would come from a separate subscriptions table */}
            </div>

            {/* Usage Stats */}
            <div className="space-y-4">
              <h4 className="font-medium">الاستخدام الحالي</h4>
              
              {usage && (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>المستخدمين</span>
                      <span>{usage.users_count} / {currentPlan?.max_users || '∞'}</span>
                    </div>
                    {currentPlan?.max_users && (
                      <Progress value={(usage.users_count / currentPlan.max_users) * 100} />
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>المركبات</span>
                      <span>{usage.vehicles_count} / {currentPlan?.max_vehicles || '∞'}</span>
                    </div>
                    {currentPlan?.max_vehicles && (
                      <Progress value={(usage.vehicles_count / currentPlan.max_vehicles) * 100} />
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>العقود</span>
                      <span>{usage.contracts_count} / {currentPlan?.max_contracts || '∞'}</span>
                    </div>
                    {currentPlan?.max_contracts && (
                      <Progress value={(usage.contracts_count / currentPlan.max_contracts) * 100} />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Features */}
      {features && features.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>الميزات المتاحة</CardTitle>
            <CardDescription>
              الميزات المضمنة في خطة الاشتراك الحالية
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {features.map((feature) => (
                <div key={feature.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">{feature.description_ar || feature.description}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      {availablePlans && availablePlans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>الخطط المتاحة</CardTitle>
            <CardDescription>
              ترقية خطة الاشتراك للحصول على ميزات إضافية
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {availablePlans.map((plan) => (
                <Card key={plan.id} className={plan.id === currentPlan?.id ? 'ring-2 ring-primary' : ''}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{plan.name_ar || plan.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {plan.description_ar || plan.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-center">
                        {plan.price > 0 ? (
                          <div>
                            <span className="text-3xl font-bold">{plan.price}</span>
                            <span className="text-muted-foreground"> د.ك/شهر</span>
                          </div>
                        ) : (
                          <span className="text-2xl font-bold text-green-600">مجاني</span>
                        )}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>المستخدمين:</span>
                          <span>{plan.max_users || 'غير محدود'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>المركبات:</span>
                          <span>{plan.max_vehicles || 'غير محدود'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>العقود:</span>
                          <span>{plan.max_contracts || 'غير محدود'}</span>
                        </div>
                      </div>

                      <Button 
                        className="w-full" 
                        variant={plan.id === currentPlan?.id ? 'secondary' : 'default'}
                        disabled={plan.id === currentPlan?.id}
                      >
                        {plan.id === currentPlan?.id ? 'الخطة الحالية' : 'ترقية'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};