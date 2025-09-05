import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  Scale, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  FileText,
  Users,
  Building,
  CreditCard
} from 'lucide-react';
import { EnhancedLegalResponse } from '@/hooks/useEnhancedLegalAI';

interface HybridResponseDisplayProps {
  response: EnhancedLegalResponse;
}

export const HybridResponseDisplay: React.FC<HybridResponseDisplayProps> = ({ response }) => {
  const { query_type, query_classification, data_results, analysis, confidence, sources } = response;

  const getEntityIcon = (entity?: string) => {
    switch (entity) {
      case 'customers': return <Users className="h-4 w-4" />;
      case 'contracts': return <FileText className="h-4 w-4" />;
      case 'invoices': return <CreditCard className="h-4 w-4" />;
      case 'vehicles': return <Building className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'data_query': return 'bg-blue-100 text-blue-800';
      case 'legal_consultation': return 'bg-green-100 text-green-800';
      case 'hybrid': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderDataSummary = () => {
    if (!data_results || !query_classification?.data_query) return null;

    const { entity, action } = query_classification.data_query;

    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            {getEntityIcon(entity)}
            ملخص البيانات
            <Badge variant="secondary" className="text-xs">
              {action === 'count' ? 'إحصائيات' : 'قائمة'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {entity === 'customers' && data_results.count !== undefined && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-red-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {data_results.count}
                </div>
                <div className="text-sm text-red-700">عملاء متأخرين</div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {data_results.total_customers}
                </div>
                <div className="text-sm text-blue-700">إجمالي العملاء</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {data_results.total_overdue_amount?.toFixed(3)} د.ك
                </div>
                <div className="text-sm text-orange-700">المبالغ المتأخرة</div>
              </div>
            </div>
          )}

          {entity === 'contracts' && data_results.total !== undefined && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <div className="text-xl font-bold text-blue-600">
                  {data_results.total}
                </div>
                <div className="text-xs text-blue-700">إجمالي العقود</div>
              </div>
              {data_results.by_status && Object.entries(data_results.by_status).map(([status, count]) => (
                <div key={status} className="bg-gray-50 p-3 rounded-lg text-center">
                  <div className="text-lg font-semibold text-gray-700">
                    {count as number}
                  </div>
                  <div className="text-xs text-gray-600">{status}</div>
                </div>
              ))}
            </div>
          )}

          {entity === 'invoices' && data_results.total !== undefined && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <div className="text-xl font-bold text-green-600">
                  {data_results.total}
                </div>
                <div className="text-xs text-green-700">إجمالي الفواتير</div>
              </div>
              {data_results.by_payment_status && Object.entries(data_results.by_payment_status).map(([status, count]) => (
                <div key={status} className="bg-gray-50 p-3 rounded-lg text-center">
                  <div className="text-lg font-semibold text-gray-700">
                    {count as number}
                  </div>
                  <div className="text-xs text-gray-600">{status}</div>
                </div>
              ))}
            </div>
          )}

          {data_results.customers && data_results.customers.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">عملاء مختارين:</h4>
              <div className="space-y-2">
                {data_results.customers.slice(0, 3).map((customer: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                    <span>
                      {customer.customer_type === 'individual' 
                        ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
                        : customer.company_name || 'غير محدد'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with query type and classification */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className={getTypeColor(query_type)}>
            {query_type === 'data_query' && 'استعلام بيانات'}
            {query_type === 'legal_consultation' && 'استشارة قانونية'}
            {query_type === 'hybrid' && 'استعلام مختلط'}
          </Badge>
          {query_classification && (
            <Badge variant="outline" className="text-xs">
              {query_classification.confidence}% ثقة
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          {sources.includes('Company Database') && (
            <div className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              قاعدة البيانات
            </div>
          )}
          {sources.includes('OpenAI GPT-4o-mini') && (
            <div className="flex items-center gap-1">
              <Scale className="h-3 w-3" />
              AI قانوني
            </div>
          )}
        </div>
      </div>

      {/* Data summary for data queries and hybrid */}
      {(query_type === 'data_query' || query_type === 'hybrid') && renderDataSummary()}

      {/* Main analysis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Scale className="h-4 w-4" />
            {query_type === 'data_query' ? 'تحليل البيانات' : 
             query_type === 'hybrid' ? 'الاستشارة القانونية' : 'التحليل القانوني'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none text-right" dir="rtl">
            {analysis.split('\n').map((paragraph, index) => (
              <p key={index} className="mb-2 last:mb-0">
                {paragraph}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk assessment */}
      {response.risk_assessment && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4" />
              تقييم المخاطر
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">مستوى المخاطر:</span>
                <Badge variant={
                  response.risk_assessment.level === 'high' ? 'destructive' :
                  response.risk_assessment.level === 'medium' ? 'default' : 
                  'secondary'
                }>
                  {response.risk_assessment.level === 'high' && 'مرتفع'}
                  {response.risk_assessment.level === 'medium' && 'متوسط'}
                  {response.risk_assessment.level === 'low' && 'منخفض'}
                </Badge>
              </div>
              
              {response.risk_assessment.factors.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">عوامل المخاطر:</h4>
                  <ul className="space-y-1">
                    {response.risk_assessment.factors.map((factor, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                        <AlertTriangle className="h-3 w-3 mt-1 text-orange-500 flex-shrink-0" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {response.risk_assessment.recommendations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">التوصيات:</h4>
                  <ul className="space-y-1">
                    {response.risk_assessment.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                        <CheckCircle className="h-3 w-3 mt-1 text-green-500 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action items */}
      {response.action_items && response.action_items.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4" />
              الخطوات العملية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {response.action_items.map((item, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Legal references */}
      {response.legal_references && response.legal_references.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" />
              المراجع القانونية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {response.legal_references.map((ref, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                  <FileText className="h-3 w-3 mt-1 text-blue-500 flex-shrink-0" />
                  {ref}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};