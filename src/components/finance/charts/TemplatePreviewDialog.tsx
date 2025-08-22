import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { 
  TreePine, 
  BarChart3, 
  Search, 
  CheckCircle, 
  AlertTriangle,
  FileCode,
  Info,
  Clock,
  Download
} from 'lucide-react';
import { useCompleteCarRentalTemplate, CompleteTemplateAccount } from '@/hooks/useCompleteCarRentalTemplate';

interface TemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: () => void;
  isApplying: boolean;
}

export const TemplatePreviewDialog: React.FC<TemplatePreviewDialogProps> = ({
  open,
  onOpenChange,
  onApply,
  isApplying
}) => {
  const { 
    template, 
    loading, 
    error, 
    metadata,
    accounts,
    getTemplateStats,
    getAccountsByLevel,
    getAccountsByType,
    searchAccounts,
    validateHierarchy,
    isReady
  } = useCompleteCarRentalTemplate();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  if (!isReady) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">معاينة القالب</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            {loading && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 animate-spin" />
                <span>جاري تحميل القالب...</span>
              </div>
            )}
            {error && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const stats = getTemplateStats();
  const accountsByType = getAccountsByType();
  const validation = validateHierarchy();
  const filteredAccounts = searchTerm ? searchAccounts(searchTerm) : accounts;

  // تحويل AccountTemplate إلى CompleteTemplateAccount للتوافق
  const convertToCompleteAccounts = (templateAccounts: any[]): CompleteTemplateAccount[] => {
    return templateAccounts.map(account => ({
      code: account.code,
      name_ar: account.nameAr || account.name_ar,
      name_en: account.nameEn || account.name_en,
      account_type: account.accountType || account.account_type,
      level: account.accountLevel || account.level,
      balance_type: account.balanceType || account.balance_type,
      parent_code: account.parentCode || account.parent_code,
      is_header: account.isHeader ?? account.is_header ?? false,
      is_entry: account.isEntryLevel ?? account.is_entry ?? false,
      essential: account.essential ?? false,
      description: account.description || ''
    }));
  };

  const renderAccountsList = (accountsToShow: CompleteTemplateAccount[]) => (
    <ScrollArea className="h-96">
      <div className="space-y-2">
        {accountsToShow.map((account) => (
          <Card key={account.code} className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {account.code}
                </Badge>
                <Badge 
                  variant={account.is_header ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  مستوى {account.level}
                </Badge>
                {account.essential && (
                  <Badge variant="destructive" className="text-xs">
                    أساسي
                  </Badge>
                )}
              </div>
              <div className="text-right">
                <div className="font-medium text-sm">{account.name_ar}</div>
                <div className="text-xs text-muted-foreground">{account.name_en}</div>
              </div>
            </div>
            {account.description && (
              <div className="text-xs text-muted-foreground mt-2 text-right">
                {account.description}
              </div>
            )}
          </Card>
        ))}
      </div>
    </ScrollArea>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <FileCode className="h-5 w-5" />
            معاينة قالب دليل الحسابات
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="hierarchy">التسلسل الهرمي</TabsTrigger>
            <TabsTrigger value="types">تصنيف الحسابات</TabsTrigger>
            <TabsTrigger value="search">البحث</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-right">{metadata?.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">{stats.total}</div>
                    <div className="text-sm text-muted-foreground">إجمالي الحسابات</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{stats.assets}</div>
                    <div className="text-sm text-blue-600">الأصول</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{stats.liabilities}</div>
                    <div className="text-sm text-red-600">الخصوم</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{stats.revenue}</div>
                    <div className="text-sm text-green-600">الإيرادات</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{stats.expenses}</div>
                    <div className="text-sm text-orange-600">المصروفات</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{stats.equity}</div>
                    <div className="text-sm text-purple-600">حقوق الملكية</div>
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-2">
                  {Object.entries(stats.byLevel).map(([level, count]) => (
                    <div key={level} className="text-center p-2 bg-gray-50 rounded">
                      <div className="font-bold">{count}</div>
                      <div className="text-xs">مستوى {level}</div>
                    </div>
                  ))}
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-right">
                    <div className="space-y-1">
                      <p><strong>النسخة:</strong> {metadata?.version}</p>
                      <p><strong>تاريخ الإنشاء:</strong> {metadata?.created_date}</p>
                      <p><strong>نوع النشاط:</strong> {metadata?.business_type}</p>
                      <p><strong>حسابات رأس:</strong> {stats.headerAccounts} | <strong>حسابات تفصيلية:</strong> {stats.entryAccounts}</p>
                    </div>
                  </AlertDescription>
                </Alert>

                {/* نتائج التحقق من التسلسل الهرمي */}
                <Alert className={validation.valid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  {validation.valid ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className="text-right">
                    {validation.valid ? (
                      <span className="text-green-700">✅ التسلسل الهرمي للقالب صحيح ومنظم</span>
                    ) : (
                      <div className="text-red-700">
                        <div className="font-medium">⚠️ مشاكل في التسلسل الهرمي:</div>
                        <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                          {validation.issues.map((issue, index) => (
                            <li key={index}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hierarchy" className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant={selectedLevel === null ? 'default' : 'outline'}
                onClick={() => setSelectedLevel(null)}
              >
                جميع المستويات
              </Button>
              {[1, 2, 3, 4, 5, 6].map(level => (
                <Button
                  key={level}
                  size="sm"
                  variant={selectedLevel === level ? 'default' : 'outline'}
                  onClick={() => setSelectedLevel(level)}
                >
                  المستوى {level} ({stats.byLevel[level] || 0})
                </Button>
              ))}
            </div>
            {renderAccountsList(
              selectedLevel 
                ? getAccountsByLevel(selectedLevel)
                : accounts
            )}
          </TabsContent>

          <TabsContent value="types" className="space-y-4">
            <Tabs defaultValue="assets" dir="rtl">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="assets">الأصول ({stats.assets})</TabsTrigger>
                <TabsTrigger value="liabilities">الخصوم ({stats.liabilities})</TabsTrigger>
                <TabsTrigger value="equity">حقوق الملكية ({stats.equity})</TabsTrigger>
                <TabsTrigger value="revenue">الإيرادات ({stats.revenue})</TabsTrigger>
                <TabsTrigger value="expenses">المصروفات ({stats.expenses})</TabsTrigger>
              </TabsList>
              <TabsContent value="assets">
                {renderAccountsList(convertToCompleteAccounts(accountsByType.assets))}
              </TabsContent>
              <TabsContent value="liabilities">
                {renderAccountsList(convertToCompleteAccounts(accountsByType.liabilities))}
              </TabsContent>
              <TabsContent value="equity">
                {renderAccountsList(convertToCompleteAccounts(accountsByType.equity))}
              </TabsContent>
              <TabsContent value="revenue">
                {renderAccountsList(convertToCompleteAccounts(accountsByType.revenue))}
              </TabsContent>
              <TabsContent value="expenses">
                {renderAccountsList(convertToCompleteAccounts(accountsByType.expenses))}
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="search" className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <Input
                placeholder="ابحث في الحسابات بالاسم، الكود، أو الوصف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-right"
              />
            </div>
            <div className="text-sm text-muted-foreground text-right">
              {searchTerm ? `${filteredAccounts.length} حساب من أصل ${accounts.length}` : `${accounts.length} حساب متاح`}
            </div>
            {renderAccountsList(filteredAccounts)}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button 
            onClick={onApply}
            disabled={isApplying || !validation.valid}
            className="gap-2"
          >
            {isApplying ? (
              <>
                <Clock className="h-4 w-4 animate-spin" />
                جاري التطبيق...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                تطبيق القالب ({stats.total} حساب)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};