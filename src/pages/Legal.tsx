import React from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EnhancedLegalAIInterface_v2 } from '@/components/legal';
import { useAuth } from '@/contexts/AuthContext';
import { Scale, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export const Legal: React.FC = () => {
  const { user } = useAuth();
  const companyId = user?.user_metadata?.company_id;

  if (!companyId) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertDescription>
            خطأ: لم يتم العثور على معرف الشركة. يرجى تسجيل الدخول مرة أخرى.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <Card className="bg-gradient-to-br from-primary/5 via-primary/3 to-background border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Scale className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl flex items-center gap-2">
                المستشار القانوني الذكي
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              </CardTitle>
              <CardDescription className="text-base mt-2">
                نظام متقدم للاستشارات القانونية وإدارة القضايا المدعوم بالذكاء الاصطناعي
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Legal AI Interface */}
      <EnhancedLegalAIInterface_v2
        companyId={companyId}
        onDocumentGenerated={(document) => {
          console.log('Document generated:', document);
        }}
        onRiskAnalysis={(analysis) => {
          console.log('Risk analysis completed:', analysis);
        }}
      />
    </div>
  );
};

export default Legal;
