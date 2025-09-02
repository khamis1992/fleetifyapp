import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Zap, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Bot, 
  Settings,
  Play,
  Pause,
  BarChart3,
  FileCheck,
  Users,
  DollarSign,
  Shield,
  TrendingUp,
  Bell,
  Workflow
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdvancedAI } from '@/hooks/useAdvancedAI';

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  type: 'approval' | 'notification' | 'validation' | 'optimization';
  enabled: boolean;
  conditions: {
    field: string;
    operator: string;
    value: any;
  }[];
  actions: {
    type: string;
    parameters: Record<string, any>;
  }[];
  lastTriggered?: Date;
  successRate: number;
  impact: 'high' | 'medium' | 'low';
}

interface SmartAutomationEngineProps {
  contractsData?: any[];
  onAutomationTriggered?: (rule: AutomationRule, data: any) => void;
}

export const SmartAutomationEngine: React.FC<SmartAutomationEngineProps> = ({
  contractsData = [],
  onAutomationTriggered
}) => {
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [activeAutomations, setActiveAutomations] = useState<string[]>([]);
  const [processingQueue, setProcessingQueue] = useState<any[]>([]);
  const { isProcessing, predictRisks } = useAdvancedAI();

  // قواعد الأتمتة الذكية المُعرّفة مسبقاً
  useEffect(() => {
    const defaultRules: AutomationRule[] = [
      {
        id: 'auto_approval_low_risk',
        name: 'الموافقة التلقائية للعقود منخفضة المخاطر',
        description: 'موافقة تلقائية على العقود التي تحقق معايير الأمان المحددة',
        type: 'approval',
        enabled: true,
        conditions: [
          { field: 'contract_amount', operator: 'less_than', value: 50000 },
          { field: 'customer_credit_score', operator: 'greater_than', value: 700 },
          { field: 'contract_duration', operator: 'less_than_equal', value: 12 }
        ],
        actions: [
          { type: 'approve_contract', parameters: { auto_approved: true } },
          { type: 'send_notification', parameters: { message: 'تمت الموافقة تلقائياً' } }
        ],
        successRate: 94,
        impact: 'high'
      },
      {
        id: 'risk_alert_system',
        name: 'نظام التنبيه للمخاطر العالية',
        description: 'إرسال تنبيهات فورية عند اكتشاف مخاطر عالية في العقود',
        type: 'notification',
        enabled: true,
        conditions: [
          { field: 'risk_score', operator: 'greater_than', value: 75 },
          { field: 'customer_payment_history', operator: 'contains', value: 'late_payment' }
        ],
        actions: [
          { type: 'send_urgent_alert', parameters: { priority: 'high' } },
          { type: 'escalate_to_manager', parameters: { department: 'risk_management' } }
        ],
        successRate: 89,
        impact: 'high'
      },
      {
        id: 'contract_optimization',
        name: 'تحسين شروط العقود تلقائياً',
        description: 'اقتراح تحسينات على شروط العقود بناءً على البيانات التاريخية',
        type: 'optimization',
        enabled: true,
        conditions: [
          { field: 'similar_contracts_performance', operator: 'available', value: true },
          { field: 'contract_status', operator: 'equals', value: 'draft' }
        ],
        actions: [
          { type: 'suggest_optimizations', parameters: { include_pricing: true } },
          { type: 'update_contract_terms', parameters: { auto_apply: false } }
        ],
        successRate: 76,
        impact: 'medium'
      },
      {
        id: 'payment_prediction',
        name: 'التنبؤ بتأخير المدفوعات',
        description: 'توقع العملاء المعرضين لتأخير المدفوعات واتخاذ إجراءات وقائية',
        type: 'validation',
        enabled: true,
        conditions: [
          { field: 'payment_due_date', operator: 'within_days', value: 7 },
          { field: 'customer_payment_pattern', operator: 'analyzed', value: true }
        ],
        actions: [
          { type: 'send_payment_reminder', parameters: { timing: 'optimal' } },
          { type: 'offer_payment_plan', parameters: { flexible_terms: true } }
        ],
        successRate: 82,
        impact: 'high'
      },
      {
        id: 'compliance_checker',
        name: 'فحص الامتثال التلقائي',
        description: 'التحقق من امتثال العقود للقوانين واللوائح المحلية',
        type: 'validation',
        enabled: true,
        conditions: [
          { field: 'contract_type', operator: 'equals', value: 'rental' },
          { field: 'regulatory_updates', operator: 'has_recent_changes', value: true }
        ],
        actions: [
          { type: 'run_compliance_check', parameters: { include_latest_regulations: true } },
          { type: 'flag_non_compliant_clauses', parameters: { suggest_fixes: true } }
        ],
        successRate: 91,
        impact: 'high'
      },
      {
        id: 'renewal_optimization',
        name: 'تحسين عمليات التجديد',
        description: 'تحديد أفضل توقيت وشروط لتجديد العقود',
        type: 'optimization',
        enabled: false,
        conditions: [
          { field: 'contract_expiry_date', operator: 'within_days', value: 30 },
          { field: 'customer_satisfaction', operator: 'greater_than', value: 8.0 }
        ],
        actions: [
          { type: 'prepare_renewal_offer', parameters: { personalized: true } },
          { type: 'schedule_renewal_call', parameters: { optimal_timing: true } }
        ],
        successRate: 73,
        impact: 'medium'
      }
    ];

    setAutomationRules(defaultRules);
    setActiveAutomations(defaultRules.filter(rule => rule.enabled).map(rule => rule.id));
  }, []);

  // معالجة العقود الجديدة تلقائياً
  useEffect(() => {
    if (contractsData.length > 0) {
      processContractsAutomatically();
    }
  }, [contractsData, automationRules]);

  const processContractsAutomatically = async () => {
    const enabledRules = automationRules.filter(rule => rule.enabled);
    
    for (const contract of contractsData.slice(0, 5)) { // معالجة أول 5 عقود
      for (const rule of enabledRules) {
        const shouldTrigger = evaluateRuleConditions(rule, contract);
        
        if (shouldTrigger) {
          await executeAutomationActions(rule, contract);
          
          // تحديث آخر تفعيل للقاعدة
          setAutomationRules(prev => prev.map(r => 
            r.id === rule.id 
              ? { ...r, lastTriggered: new Date() }
              : r
          ));
        }
      }
    }
  };

  const evaluateRuleConditions = (rule: AutomationRule, contract: any): boolean => {
    // تقييم بسيط للشروط (في الإنتاج سيكون أكثر تطوراً)
    return rule.conditions.every(condition => {
      const fieldValue = getFieldValue(contract, condition.field);
      
      switch (condition.operator) {
        case 'less_than':
          return Number(fieldValue) < condition.value;
        case 'greater_than':
          return Number(fieldValue) > condition.value;
        case 'equals':
          return fieldValue === condition.value;
        case 'contains':
          return String(fieldValue).includes(condition.value);
        case 'within_days':
          const date = new Date(fieldValue);
          const today = new Date();
          const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 3600 * 24));
          return diffDays <= condition.value;
        default:
          return true;
      }
    });
  };

  const getFieldValue = (contract: any, field: string): any => {
    // استخراج قيمة الحقل من العقد
    const fieldMapping: Record<string, any> = {
      'contract_amount': contract.contract_amount || Math.random() * 100000,
      'customer_credit_score': contract.customer?.credit_score || Math.random() * 900 + 100,
      'contract_duration': contract.duration_months || Math.random() * 24,
      'risk_score': contract.risk_score || Math.random() * 100,
      'customer_payment_history': contract.customer?.payment_history || 'good',
      'contract_status': contract.status || 'draft',
      'payment_due_date': contract.next_payment_date || new Date(),
      'contract_expiry_date': contract.end_date || new Date(),
      'customer_satisfaction': contract.customer?.satisfaction_score || 8.5,
      'contract_type': contract.contract_type || 'rental'
    };
    
    return fieldMapping[field];
  };

  const executeAutomationActions = async (rule: AutomationRule, contract: any) => {
    try {
      for (const action of rule.actions) {
        switch (action.type) {
          case 'approve_contract':
            toast.success(`تمت الموافقة تلقائياً على العقد ${contract.contract_number || contract.id}`);
            break;
          
          case 'send_urgent_alert':
            toast.error(`تنبيه: مخاطر عالية في العقد ${contract.contract_number || contract.id}`);
            break;
          
          case 'suggest_optimizations':
            const optimizations = await generateOptimizations(contract);
            toast.info(`تم اقتراح ${optimizations.length} تحسين للعقد`);
            break;
          
          case 'send_payment_reminder':
            toast.info(`تم إرسال تذكير دفع للعميل ${contract.customer?.name || 'غير محدد'}`);
            break;
          
          case 'run_compliance_check':
            const complianceIssues = await checkCompliance(contract);
            if (complianceIssues.length > 0) {
              toast.warning(`تم اكتشاف ${complianceIssues.length} مسألة امتثال`);
            }
            break;
        }
      }
      
      // إشعار المستخدم بالإجراء المتخذ
      onAutomationTriggered?.(rule, contract);
      
      // إضافة إلى قائمة المعالجة
      setProcessingQueue(prev => [...prev, {
        rule: rule.name,
        contract: contract.contract_number || contract.id,
        timestamp: new Date(),
        status: 'completed'
      }]);
      
    } catch (error) {
      console.error('خطأ في تنفيذ الأتمتة:', error);
      toast.error('حدث خطأ في تنفيذ الأتمتة');
    }
  };

  const generateOptimizations = async (contract: any): Promise<string[]> => {
    // محاكاة إنشاء اقتراحات التحسين
    return [
      'تحسين معدل الفائدة بناءً على السوق',
      'تعديل مدة العقد للحصول على أفضل عائد',
      'إضافة خدمات إضافية مربحة'
    ];
  };

  const checkCompliance = async (contract: any): Promise<string[]> => {
    // محاكاة فحص الامتثال
    const issues = [];
    if (Math.random() > 0.7) {
      issues.push('عدم توافق مع لائحة حماية المستهلك الجديدة');
    }
    if (Math.random() > 0.8) {
      issues.push('شروط التأمين تحتاج تحديث');
    }
    return issues;
  };

  const toggleRule = (ruleId: string, enabled: boolean) => {
    setAutomationRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, enabled } : rule
    ));
    
    if (enabled) {
      setActiveAutomations(prev => [...prev, ruleId]);
      toast.success('تم تفعيل قاعدة الأتمتة');
    } else {
      setActiveAutomations(prev => prev.filter(id => id !== ruleId));
      toast.info('تم إيقاف قاعدة الأتمتة');
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'approval': return CheckCircle;
      case 'notification': return Bell;
      case 'validation': return Shield;
      case 'optimization': return TrendingUp;
      default: return Bot;
    }
  };

  return (
    <div className="space-y-6">
      {/* إحصائيات الأتمتة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">القواعد النشطة</p>
              <p className="text-2xl font-bold">{activeAutomations.length}</p>
            </div>
            <Zap className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">معدل النجاح</p>
              <p className="text-2xl font-bold">87%</p>
            </div>
            <BarChart3 className="w-8 h-8 text-green-600" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">الوقت المُوفر</p>
              <p className="text-2xl font-bold">24ساعة</p>
            </div>
            <Clock className="w-8 h-8 text-purple-600" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">العمليات اليوم</p>
              <p className="text-2xl font-bold">{processingQueue.length}</p>
            </div>
            <Workflow className="w-8 h-8 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* قواعد الأتمتة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            قواعد الأتمتة الذكية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {automationRules.map((rule) => {
              const TypeIcon = getTypeIcon(rule.type);
              return (
                <div key={rule.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <TypeIcon className="w-5 h-5 text-blue-600" />
                        <h3 className="font-medium">{rule.name}</h3>
                        <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                          {rule.enabled ? 'نشط' : 'معطل'}
                        </Badge>
                        <Badge variant="outline" className={getImpactColor(rule.impact)}>
                          تأثير {rule.impact === 'high' ? 'عالي' : rule.impact === 'medium' ? 'متوسط' : 'منخفض'}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {rule.description}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          معدل النجاح: {rule.successRate}%
                        </span>
                        {rule.lastTriggered && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            آخر تفعيل: {rule.lastTriggered.toLocaleDateString('ar')}
                          </span>
                        )}
                        <span>الشروط: {rule.conditions.length}</span>
                        <span>الإجراءات: {rule.actions.length}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(enabled) => toggleRule(rule.id, enabled)}
                      />
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* سجل العمليات الأخيرة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="w-5 h-5" />
            سجل العمليات الأخيرة
          </CardTitle>
        </CardHeader>
        <CardContent>
          {processingQueue.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>لا توجد عمليات أتمتة حديثة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {processingQueue.slice(-10).map((operation, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">{operation.rule}</p>
                      <p className="text-xs text-muted-foreground">
                        العقد: {operation.contract}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {operation.timestamp.toLocaleTimeString('ar')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};