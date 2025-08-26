import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { 
  Settings, 
  Users, 
  Building, 
  UserCheck, 
  Search,
  CheckCircle,
  XCircle,
  Save,
  RefreshCw,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AccountLinkingMigration } from './AccountLinkingMigration';

interface AccountMovementRule {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountLevel: number;
  isHeader: boolean;
  isMovementAllowed: boolean;
  canLinkToCustomers: boolean;
  canLinkToVendors: boolean;
  canLinkToEmployees: boolean;
  movementType: 'detail' | 'header' | 'system';
}

export const AccountMovementSettings: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [rules, setRules] = useState<AccountMovementRule[]>([]);
  const { toast } = useToast();
  const { companyId } = useUnifiedCompanyAccess();
  const { data: accounts, isLoading } = useChartOfAccounts();

  // تحويل الحسابات إلى قواعد حركة
  const accountRules = useMemo(() => {
    if (!accounts) return [];

    return accounts.map(account => {
      // القواعد الافتراضية بناءً على مستوى الحساب ونوعه
      const isDetailAccount = !account.is_header; // الحسابات غير الرئيسية
      const isSystemAccount = account.is_system || false;
      
      // تحديد نوع الحساب
      let movementType: 'detail' | 'header' | 'system' = 'header';
      if (isSystemAccount) {
        movementType = 'system';
      } else if (isDetailAccount) {
        movementType = 'detail';
      }

      // القواعد الافتراضية للربط بناءً على رمز الحساب
      const canLinkToCustomers = account.account_code.startsWith('113') || // العملاء
                                account.account_code.startsWith('114'); // أوراق القبض
      
      const canLinkToVendors = account.account_code.startsWith('213') || // الموردين
                              account.account_code.startsWith('214'); // أوراق الدفع
      
      const canLinkToEmployees = account.account_code.startsWith('215') || // رواتب الموظفين
                                account.account_code.startsWith('216'); // التأمينات

      return {
        accountId: account.id,
        accountCode: account.account_code,
        accountName: account.account_name_ar || account.account_name,
        accountLevel: account.account_level,
        isHeader: account.is_header,
        isMovementAllowed: isDetailAccount && !isSystemAccount,
        canLinkToCustomers: canLinkToCustomers && isDetailAccount,
        canLinkToVendors: canLinkToVendors && isDetailAccount,
        canLinkToEmployees: canLinkToEmployees && isDetailAccount,
        movementType
      } as AccountMovementRule;
    });
  }, [accounts]);

  // تصفية الحسابات بناءً على البحث
  const filteredRules = useMemo(() => {
    if (!searchTerm) return accountRules;
    
    return accountRules.filter(rule => 
      rule.accountCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.accountName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [accountRules, searchTerm]);

  // إحصائيات الحسابات
  const stats = useMemo(() => {
    return {
      total: accountRules.length,
      headers: accountRules.filter(r => r.movementType === 'header').length,
      details: accountRules.filter(r => r.movementType === 'detail').length,
      system: accountRules.filter(r => r.movementType === 'system').length,
      canLinkCustomers: accountRules.filter(r => r.canLinkToCustomers).length,
      canLinkVendors: accountRules.filter(r => r.canLinkToVendors).length,
      canLinkEmployees: accountRules.filter(r => r.canLinkToEmployees).length
    };
  }, [accountRules]);

  // تحديث قاعدة حساب
  const updateRule = (accountId: string, updates: Partial<AccountMovementRule>) => {
    setRules(prev => {
      const existing = prev.find(r => r.accountId === accountId);
      if (existing) {
        return prev.map(r => r.accountId === accountId ? { ...r, ...updates } : r);
      } else {
        const originalRule = accountRules.find(r => r.accountId === accountId);
        if (originalRule) {
          return [...prev, { ...originalRule, ...updates }];
        }
      }
      return prev;
    });
  };

  // الحصول على قاعدة حساب (مع التحديثات)
  const getRule = (accountId: string): AccountMovementRule => {
    const customRule = rules.find(r => r.accountId === accountId);
    const defaultRule = accountRules.find(r => r.accountId === accountId);
    return customRule || defaultRule!;
  };

  // حفظ الإعدادات
  const saveSettings = async () => {
    if (!companyId) return;

    setIsSaving(true);
    try {
      // تحديث الحسابات في قاعدة البيانات
      for (const rule of rules) {
        const { error } = await supabase
          .from('chart_of_accounts')
          .update({
            can_link_customers: rule.canLinkToCustomers,
            can_link_vendors: rule.canLinkToVendors,
            can_link_employees: rule.canLinkToEmployees
          })
          .eq('id', rule.accountId)
          .eq('company_id', companyId);

        if (error) throw error;
      }

      toast({
        title: "تم الحفظ",
        description: `تم حفظ إعدادات ${rules.length} حساب بنجاح`,
      });

      // إعادة تعيين القواعد المخصصة
      setRules([]);

    } catch (error: any) {
      toast({
        title: "خطأ",
        description: `فشل في حفظ الإعدادات: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // إعادة تعيين إلى الافتراضي
  const resetToDefaults = () => {
    setRules([]);
    toast({
      title: "تم الإعادة",
      description: "تم إعادة تعيين جميع الإعدادات إلى القيم الافتراضية",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>جاري تحميل الحسابات...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="settings" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="settings">إعدادات الحركة</TabsTrigger>
        <TabsTrigger value="migration">تحديث قاعدة البيانات</TabsTrigger>
      </TabsList>

      <TabsContent value="settings" className="space-y-6">
      {/* الإحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-gray-600">إجمالي الحسابات</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.details}</p>
                <p className="text-sm text-gray-600">حسابات تفصيلية</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-2xl font-bold">{stats.headers}</p>
                <p className="text-sm text-gray-600">حسابات رئيسية</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{stats.system}</p>
                <p className="text-sm text-gray-600">حسابات النظام</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* معلومات عامة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            إعدادات حركة الحسابات
          </CardTitle>
          <CardDescription>
            تحديد الحسابات التي يمكن أن تكون لها حركات مالية وربطها بالعملاء والموردين والموظفين
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-blue-800">حسابات التفاصيل</span>
              </div>
              <p className="text-sm text-blue-600">
                الحسابات التي يمكن أن تكون لها حركات مالية (المستوى 4+)
              </p>
              <p className="text-xs text-blue-500 mt-1">
                {stats.canLinkCustomers} للعملاء • {stats.canLinkVendors} للموردين • {stats.canLinkEmployees} للموظفين
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-5 w-5 text-gray-600" />
                <span className="font-semibold text-gray-800">حسابات الرؤوس</span>
              </div>
              <p className="text-sm text-gray-600">
                حسابات التجميع التي لا تقبل حركات مباشرة (المستوى 1-3)
              </p>
            </div>
            
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="font-semibold text-red-800">حسابات النظام</span>
              </div>
              <p className="text-sm text-red-600">
                حسابات محمية لا يمكن تعديل إعداداتها
              </p>
            </div>
          </div>

          {/* البحث */}
          <div className="relative mb-6">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="البحث في الحسابات (الرمز أو الاسم)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
              dir="rtl"
            />
          </div>

          {/* الأزرار */}
          <div className="flex gap-3 mb-6">
            <Button 
              onClick={saveSettings} 
              disabled={isSaving || rules.length === 0}
              className="flex items-center gap-2"
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              حفظ الإعدادات ({rules.length})
            </Button>
            
            <Button 
              onClick={resetToDefaults} 
              variant="outline"
              disabled={rules.length === 0}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              إعادة تعيين
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* جدول الحسابات */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الحسابات ({filteredRules.length})</CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-right p-3 font-semibold">رمز الحساب</th>
                  <th className="text-right p-3 font-semibold">اسم الحساب</th>
                  <th className="text-center p-3 font-semibold">المستوى</th>
                  <th className="text-center p-3 font-semibold">نوع الحساب</th>
                  <th className="text-center p-3 font-semibold">السماح بالحركة</th>
                  <th className="text-center p-3 font-semibold">ربط العملاء</th>
                  <th className="text-center p-3 font-semibold">ربط الموردين</th>
                  <th className="text-center p-3 font-semibold">ربط الموظفين</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map((rule) => {
                  const currentRule = getRule(rule.accountId);
                  const isSystemAccount = currentRule.movementType === 'system';
                  const hasChanges = rules.some(r => r.accountId === rule.accountId);
                  
                  return (
                    <tr key={rule.accountId} className={`border-b hover:bg-gray-50 ${hasChanges ? 'bg-blue-50' : ''}`}>
                      <td className="p-3 font-mono">{rule.accountCode}</td>
                      <td className="p-3">{rule.accountName}</td>
                      <td className="p-3 text-center">
                        <Badge variant="outline">
                          المستوى {rule.accountLevel}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Badge 
                          variant={
                            currentRule.movementType === 'detail' ? 'default' :
                            currentRule.movementType === 'system' ? 'destructive' : 'secondary'
                          }
                        >
                          {currentRule.movementType === 'detail' ? 'تفصيلي' :
                           currentRule.movementType === 'system' ? 'نظام' : 'رئيسي'}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center">
                          {currentRule.isMovementAllowed ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <Switch
                          checked={currentRule.canLinkToCustomers}
                          disabled={isSystemAccount || !currentRule.isMovementAllowed}
                          onCheckedChange={(checked) => 
                            updateRule(rule.accountId, { canLinkToCustomers: checked })
                          }
                        />
                      </td>
                      <td className="p-3 text-center">
                        <Switch
                          checked={currentRule.canLinkToVendors}
                          disabled={isSystemAccount || !currentRule.isMovementAllowed}
                          onCheckedChange={(checked) => 
                            updateRule(rule.accountId, { canLinkToVendors: checked })
                          }
                        />
                      </td>
                      <td className="p-3 text-center">
                        <Switch
                          checked={currentRule.canLinkToEmployees}
                          disabled={isSystemAccount || !currentRule.isMovementAllowed}
                          onCheckedChange={(checked) => 
                            updateRule(rule.accountId, { canLinkToEmployees: checked })
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* معلومات إضافية */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            القواعد الافتراضية للربط
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                ربط العملاء:
              </h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1 mr-6">
                <li>حسابات العملاء (113xxx) - ذمم العملاء</li>
                <li>حسابات أوراق القبض (114xxx) - الكمبيالات والشيكات</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Building className="h-4 w-4 text-green-500" />
                ربط الموردين:
              </h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1 mr-6">
                <li>حسابات الموردين (213xxx) - ذمم الموردين</li>
                <li>حسابات أوراق الدفع (214xxx) - الكمبيالات والشيكات</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-purple-500" />
                ربط الموظفين:
              </h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1 mr-6">
                <li>حسابات رواتب الموظفين (215xxx) - المستحقات والخصومات</li>
                <li>حسابات التأمينات الاجتماعية (216xxx)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="migration">
        <AccountLinkingMigration />
      </TabsContent>
    </Tabs>
  );
};
