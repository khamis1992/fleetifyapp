import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import {
  Download,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  Building,
  Users
} from 'lucide-react';
import { useCopyDefaultAccounts } from '@/hooks/useChartOfAccounts';
import { AccountSelectionDialog } from './AccountSelectionDialog';
import { useCopySelectedAccounts } from '@/hooks/useCopySelectedAccounts';
import { useDirectTemplateCopy } from '@/hooks/useDirectTemplateCopy';
import { useTemplateSystem, AccountTemplate } from '@/hooks/useTemplateSystem';
import { supabase } from '@/integrations/supabase/client';
import { TemplatePreviewDialog } from './TemplatePreviewDialog';

interface ExistingAccountsSummary {
  totalAccounts: number;
  hasAccounts: boolean;
  sampleCodes: string[];
}

export const AccountTemplateManager: React.FC = () => {
  const { 
    getAllAccounts, 
    getTemplateStats, 
    getAccountsByType, 
    loading: templateLoading, 
    error: templateError,
    isReady: templateReady,
    totalAccounts,
    getMetadata
  } = useTemplateSystem();
  
  const { companyId } = useUnifiedCompanyAccess();
  const { toast } = useToast();
  const copyDefaultAccounts = useCopyDefaultAccounts();
  const copySelectedAccounts = useCopySelectedAccounts();
  const directTemplateCopy = useDirectTemplateCopy();
  
  const [showSelectionDialog, setShowSelectionDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [existingAccounts, setExistingAccounts] = useState<ExistingAccountsSummary>({
    totalAccounts: 0,
    hasAccounts: false,
    sampleCodes: []
  });

  // Check existing accounts in the company
  useEffect(() => {
    const checkExistingAccounts = async () => {
      if (!companyId) return;

      try {
        const { data: accounts } = await supabase
          .from('chart_of_accounts')
          .select('account_code')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('account_code')
          .limit(10);

        setExistingAccounts({
          totalAccounts: accounts?.length || 0,
          hasAccounts: (accounts?.length || 0) > 0,
          sampleCodes: accounts?.map(acc => acc.account_code) || []
        });
      } catch (error) {
        console.error('Error checking existing accounts:', error);
      }
    };

    checkExistingAccounts();
  }, [companyId]);

  const handleDirectCopy = () => {
    if (!templateReady) {
      toast({
        title: "القالب غير جاهز",
        description: "يرجى انتظار تحميل القالب",
        variant: "destructive"
      });
      return;
    }

    directTemplateCopy.mutate('car_rental');
  };

  const handleSelectedCopy = (selectedAccounts: AccountTemplate[]) => {
    copySelectedAccounts.mutate(selectedAccounts);
    setShowSelectionDialog(false);
  };

  // Template stats
  const stats = getTemplateStats();
  const metadata = getMetadata();

  if (templateLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Clock className="h-5 w-5 animate-spin mr-2" />
            <span>جاري تحميل قالب الحسابات...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (templateError) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center text-red-600">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span>خطأ في تحميل القالب: {templateError}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Template Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            قالب دليل الحسابات - تأجير السيارات
          </CardTitle>
          <CardDescription>
            قالب شامل ومحسن محاسبياً لشركات تأجير السيارات ({totalAccounts} حساب محاسبي)
          </CardDescription>
        </CardHeader>
        <CardContent>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <div className="text-2xl font-bold text-primary">{stats.totalAccounts}</div>
              <div className="text-sm text-muted-foreground">إجمالي الحسابات</div>
              <div className="text-xs text-muted-foreground mt-1">
                {metadata?.total_accounts !== stats.totalAccounts && 
                  `(متوقع: ${metadata?.total_accounts})`
                }
              </div>
            </div>
            <div className="text-center p-4 bg-green-100 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{stats.essentialAccounts}</div>
              <div className="text-sm text-muted-foreground">حسابات أساسية</div>
            </div>
            <div className="text-center p-4 bg-blue-100 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{stats.entryLevelAccounts}</div>
              <div className="text-sm text-muted-foreground">حسابات تشغيلية</div>
            </div>
            <div className="text-center p-4 bg-purple-100 rounded-lg">
              <div className="text-2xl font-bold text-purple-700">6</div>
              <div className="text-sm text-muted-foreground">مستويات هرمية</div>
            </div>
          </div>

          {/* Account Types Distribution */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-6">
            <Badge variant="outline" className="justify-center">
              أصول: {stats.accountsByType.assets || 0}
            </Badge>
            <Badge variant="outline" className="justify-center">
              خصوم: {stats.accountsByType.liabilities || 0}
            </Badge>
            <Badge variant="outline" className="justify-center">
              إيرادات: {stats.accountsByType.revenue || 0}
            </Badge>
            <Badge variant="outline" className="justify-center">
              مصروفات: {stats.accountsByType.expenses || 0}
            </Badge>
            <Badge variant="outline" className="justify-center">
              حقوق الملكية: {stats.accountsByType.equity || 0}
            </Badge>
          </div>

          {/* Existing Accounts Warning */}
          {existingAccounts.hasAccounts && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-amber-800">
                  يوجد {existingAccounts.totalAccounts} حساب موجود مسبقاً
                </span>
              </div>
              <div className="text-sm text-amber-700">
                الحسابات الموجودة: {existingAccounts.sampleCodes.slice(0, 5).join(', ')}
                {existingAccounts.sampleCodes.length > 5 && '...'}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={() => setShowPreviewDialog(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              معاينة القالب
            </Button>

            <Button 
              onClick={handleDirectCopy}
              disabled={directTemplateCopy.isPending || !templateReady}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {directTemplateCopy.isPending ? 'جاري النسخ...' : 'نسخ كامل للقالب'}
            </Button>

            <Button 
              onClick={() => setShowSelectionDialog(true)}
              variant="outline"
              disabled={!templateReady}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              اختيار حسابات محددة
            </Button>

            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              إعادة تحميل
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Template Metadata */}
      {metadata && (
        <Card>
          <CardHeader>
            <CardTitle>معلومات القالب</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">اسم القالب:</span> {metadata.name}
              </div>
              <div>
                <span className="font-medium">النسخة:</span> {metadata.version}
              </div>
              <div>
                <span className="font-medium">تاريخ الإنشاء:</span> {metadata.created_date}
              </div>
              <div>
                <span className="font-medium">نوع النشاط:</span> تأجير السيارات
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <AccountSelectionDialog
        open={showSelectionDialog}
        onOpenChange={setShowSelectionDialog}
        accounts={getAllAccounts()}
        onApply={handleSelectedCopy}
        isApplying={copySelectedAccounts.isPending}
      />

      <TemplatePreviewDialog
        open={showPreviewDialog}
        onOpenChange={setShowPreviewDialog}
        onApply={handleDirectCopy}
        isApplying={directTemplateCopy.isPending}
      />
    </div>
  );
};
