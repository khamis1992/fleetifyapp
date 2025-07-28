import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Lightbulb, 
  TrendingUp, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  X,
  Sparkles,
  Target,
  Users,
  Clock,
  BarChart3
} from 'lucide-react';
import { ROLE_PERMISSIONS, PERMISSIONS, UserRole } from '@/types/permissions';
import { useToast } from '@/hooks/use-toast';

interface PermissionSuggestion {
  id: string;
  type: 'add' | 'remove' | 'modify';
  title: string;
  description: string;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  affectedUsers: number;
  permissions: string[];
  roles?: UserRole[];
  category: 'security' | 'efficiency' | 'compliance' | 'optimization';
  impact: string;
  estimatedTime: string;
}

interface SmartPermissionSuggestionsProps {
  selectedUser?: {
    user_id: string;
    first_name: string;
    last_name: string;
    roles: UserRole[];
  };
  userPermissions?: Set<string>;
  onApplySuggestion?: (suggestion: PermissionSuggestion) => void;
}

export default function SmartPermissionSuggestions({ 
  selectedUser, 
  userPermissions = new Set(),
  onApplySuggestion 
}: SmartPermissionSuggestionsProps) {
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Generate intelligent suggestions based on user data
  const suggestions = useMemo((): PermissionSuggestion[] => {
    if (!selectedUser) return [];

    const currentRoles = selectedUser.roles;
    const allSuggestions: PermissionSuggestion[] = [];

    // 1. Security-based suggestions
    const securitySuggestions = generateSecuritySuggestions(selectedUser, userPermissions);
    allSuggestions.push(...securitySuggestions);

    // 2. Role-based optimization suggestions
    const roleSuggestions = generateRoleOptimizationSuggestions(selectedUser, userPermissions);
    allSuggestions.push(...roleSuggestions);

    // 3. Compliance suggestions
    const complianceSuggestions = generateComplianceSuggestions(selectedUser, userPermissions);
    allSuggestions.push(...complianceSuggestions);

    // 4. Efficiency suggestions
    const efficiencySuggestions = generateEfficiencySuggestions(selectedUser, userPermissions);
    allSuggestions.push(...efficiencySuggestions);

    return allSuggestions.filter(s => !dismissedSuggestions.has(s.id));
  }, [selectedUser, userPermissions, dismissedSuggestions]);

  function generateSecuritySuggestions(user: any, permissions: Set<string>): PermissionSuggestion[] {
    const suggestions: PermissionSuggestion[] = [];

    // Check for over-privileged permissions
    const dangerousPermissions = [
      'system.users.delete',
      'system.backup.delete',
      'finance.transactions.delete'
    ];

    dangerousPermissions.forEach(perm => {
      if (permissions.has(perm) && !user.roles.includes('super_admin')) {
        suggestions.push({
          id: `security-remove-${perm}`,
          type: 'remove',
          title: 'إزالة صلاحية خطيرة',
          description: `صلاحية ${perm} خطيرة للمستخدمين غير المديرين`,
          reason: 'الحد من المخاطر الأمنية',
          priority: 'critical',
          confidence: 95,
          affectedUsers: 1,
          permissions: [perm],
          category: 'security',
          impact: 'تحسين الأمان بشكل كبير',
          estimatedTime: '5 دقائق'
        });
      }
    });

    // Suggest minimum security permissions for employees
    if (user.roles.includes('employee') && !permissions.has('system.audit.read')) {
      suggestions.push({
        id: 'security-add-audit',
        type: 'add',
        title: 'إضافة صلاحية مراجعة الأنشطة',
        description: 'الموظفون يحتاجون لرؤية سجل أنشطتهم الخاصة',
        reason: 'الشفافية والمساءلة',
        priority: 'medium',
        confidence: 80,
        affectedUsers: 1,
        permissions: ['system.audit.read'],
        category: 'security',
        impact: 'تحسين الشفافية',
        estimatedTime: '2 دقيقة'
      });
    }

    return suggestions;
  }

  function generateRoleOptimizationSuggestions(user: any, permissions: Set<string>): PermissionSuggestion[] {
    const suggestions: PermissionSuggestion[] = [];

    // Check for missing role-based permissions
    user.roles.forEach((role: UserRole) => {
      const rolePermissions = ROLE_PERMISSIONS[role]?.permissions || [];
      const missingPermissions = rolePermissions.filter(perm => !permissions.has(perm));

      if (missingPermissions.length > 0) {
        suggestions.push({
          id: `role-optimize-${role}`,
          type: 'add',
          title: `تحسين صلاحيات دور ${role}`,
          description: `يفتقد المستخدم ${missingPermissions.length} صلاحية من دور ${role}`,
          reason: 'استكمال صلاحيات الدور',
          priority: 'high',
          confidence: 90,
          affectedUsers: 1,
          permissions: missingPermissions.slice(0, 3), // Show first 3
          roles: [role],
          category: 'optimization',
          impact: 'تحسين كفاءة العمل',
          estimatedTime: '3 دقائق'
        });
      }
    });

    // Check for unnecessary permissions
    const allRolePermissions = new Set<string>();
    user.roles.forEach((role: UserRole) => {
      ROLE_PERMISSIONS[role]?.permissions.forEach(perm => allRolePermissions.add(perm));
    });

    const extraPermissions = Array.from(permissions).filter(perm => !allRolePermissions.has(perm));
    if (extraPermissions.length > 2) {
      suggestions.push({
        id: 'role-cleanup',
        type: 'remove',
        title: 'تنظيف الصلاحيات الزائدة',
        description: `المستخدم لديه ${extraPermissions.length} صلاحية غير مطلوبة لأدواره`,
        reason: 'تقليل التعقيد الأمني',
        priority: 'medium',
        confidence: 75,
        affectedUsers: 1,
        permissions: extraPermissions.slice(0, 3),
        category: 'optimization',
        impact: 'تبسيط إدارة الصلاحيات',
        estimatedTime: '5 دقائق'
      });
    }

    return suggestions;
  }

  function generateComplianceSuggestions(user: any, permissions: Set<string>): PermissionSuggestion[] {
    const suggestions: PermissionSuggestion[] = [];

    // Financial compliance checks
    if (user.roles.includes('sales_agent') && permissions.has('finance.treasury.admin')) {
      suggestions.push({
        id: 'compliance-finance-separation',
        type: 'remove',
        title: 'فصل الصلاحيات المالية',
        description: 'مندوب المبيعات لا يجب أن يدير الخزينة',
        reason: 'الامتثال للضوابط المالية',
        priority: 'high',
        confidence: 95,
        affectedUsers: 1,
        permissions: ['finance.treasury.admin'],
        category: 'compliance',
        impact: 'تحسين الامتثال',
        estimatedTime: '2 دقيقة'
      });
    }

    // HR compliance checks
    if (!user.roles.includes('company_admin') && permissions.has('hr.salaries.read')) {
      suggestions.push({
        id: 'compliance-hr-confidential',
        type: 'remove',
        title: 'حماية البيانات السرية',
        description: 'بيانات الرواتب يجب أن تكون محدودة للإدارة العليا',
        reason: 'حماية خصوصية البيانات',
        priority: 'high',
        confidence: 90,
        affectedUsers: 1,
        permissions: ['hr.salaries.read'],
        category: 'compliance',
        impact: 'تحسين الخصوصية',
        estimatedTime: '1 دقيقة'
      });
    }

    return suggestions;
  }

  function generateEfficiencySuggestions(user: any, permissions: Set<string>): PermissionSuggestion[] {
    const suggestions: PermissionSuggestion[] = [];

    // Suggest workflow permissions for managers
    if (user.roles.includes('manager') && !permissions.has('contracts.approve')) {
      suggestions.push({
        id: 'efficiency-manager-workflow',
        type: 'add',
        title: 'تفعيل سير عمل الموافقات',
        description: 'المديرون يحتاجون صلاحية الموافقة على العقود',
        reason: 'تسريع العمليات',
        priority: 'medium',
        confidence: 85,
        affectedUsers: 1,
        permissions: ['contracts.approve', 'invoices.approve'],
        category: 'efficiency',
        impact: 'تسريع الموافقات',
        estimatedTime: '3 دقائق'
      });
    }

    // Suggest reporting permissions for analysts
    if (user.roles.includes('sales_agent') && !permissions.has('reports.sales.read')) {
      suggestions.push({
        id: 'efficiency-sales-reports',
        type: 'add',
        title: 'تفعيل تقارير المبيعات',
        description: 'مندوب المبيعات يحتاج لرؤية تقاريره',
        reason: 'تحسين الأداء',
        priority: 'medium',
        confidence: 80,
        affectedUsers: 1,
        permissions: ['reports.sales.read'],
        category: 'efficiency',
        impact: 'تحسين متابعة الأداء',
        estimatedTime: '2 دقيقة'
      });
    }

    return suggestions;
  }

  const handleApplySuggestion = (suggestion: PermissionSuggestion) => {
    if (onApplySuggestion) {
      onApplySuggestion(suggestion);
      toast({
        title: "تم تطبيق الاقتراح",
        description: suggestion.title,
      });
    }
  };

  const handleDismissSuggestion = (suggestionId: string) => {
    setDismissedSuggestions(prev => new Set([...prev, suggestionId]));
    toast({
      title: "تم تجاهل الاقتراح",
      description: "لن يظهر هذا الاقتراح مرة أخرى",
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security': return <Shield className="w-4 h-4" />;
      case 'efficiency': return <TrendingUp className="w-4 h-4" />;
      case 'compliance': return <CheckCircle className="w-4 h-4" />;
      case 'optimization': return <Target className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityLabel = (priority: string) => {
    const labels = {
      critical: 'حرج',
      high: 'عالي',
      medium: 'متوسط',
      low: 'منخفض'
    };
    return labels[priority as keyof typeof labels] || priority;
  };

  if (!selectedUser) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Sparkles className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">الاقتراحات الذكية</h3>
          <p className="text-muted-foreground text-center">
            اختر مستخدماً لعرض الاقتراحات الذكية لتحسين صلاحياته
          </p>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="w-5 h-5 mr-2" />
            الاقتراحات الذكية
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">ممتاز!</h3>
          <p className="text-muted-foreground text-center">
            صلاحيات {selectedUser.first_name} {selectedUser.last_name} محسّنة بشكل مثالي
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="w-5 h-5 mr-2" />
            الاقتراحات الذكية لـ {selectedUser.first_name} {selectedUser.last_name}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {suggestions.length} اقتراح لتحسين الصلاحيات والأمان
          </p>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        {suggestions.map(suggestion => (
          <Card key={suggestion.id} className={`border-2 ${getPriorityColor(suggestion.priority)}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    {getCategoryIcon(suggestion.category)}
                    <h3 className="font-semibold">{suggestion.title}</h3>
                    <Badge variant={suggestion.priority === 'critical' ? 'destructive' : 'secondary'}>
                      {getPriorityLabel(suggestion.priority)}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {suggestion.description}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-muted-foreground" />
                      <span>الثقة: {suggestion.confidence}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>يؤثر على: {suggestion.affectedUsers} مستخدم</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>الوقت المقدر: {suggestion.estimatedTime}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Progress value={suggestion.confidence} className="flex-1 h-2" />
                    <span className="text-xs text-muted-foreground">{suggestion.confidence}%</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {suggestion.permissions.slice(0, 3).map(perm => (
                      <Badge key={perm} variant="outline" className="text-xs">
                        {perm}
                      </Badge>
                    ))}
                    {suggestion.permissions.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{suggestion.permissions.length - 3} أخرى
                      </Badge>
                    )}
                  </div>

                  <Alert className="bg-blue-50 border-blue-200">
                    <Lightbulb className="h-4 w-4" />
                    <AlertDescription>
                      <strong>التأثير المتوقع:</strong> {suggestion.impact}
                    </AlertDescription>
                  </Alert>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <Button
                    size="sm"
                    onClick={() => handleApplySuggestion(suggestion)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    تطبيق
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDismissSuggestion(suggestion.id)}
                  >
                    <X className="w-4 h-4 mr-1" />
                    تجاهل
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}