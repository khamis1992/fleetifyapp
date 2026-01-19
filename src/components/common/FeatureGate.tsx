import React from 'react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Lock } from 'lucide-react';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradeMessage?: boolean;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  showUpgradeMessage = true
}) => {
  const { data: hasAccess, isLoading } = useFeatureAccess(feature);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradeMessage) {
    return null;
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center pb-2">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Crown className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="flex items-center gap-2 justify-center">
          <Lock className="w-4 h-4" />
          ميزة محدودة
        </CardTitle>
        <CardDescription>
          هذه الميزة تتطلب ترقية خطة الاشتراك
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-sm text-muted-foreground mb-4">
          للوصول إلى هذه الميزة، يرجى ترقية خطة الاشتراك الخاصة بك
        </p>
        <Button className="w-full">
          <Crown className="w-4 h-4 mr-2" />
          ترقية الخطة
        </Button>
      </CardContent>
    </Card>
  );
};