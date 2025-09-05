import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, TrendingUp, Users, FileText, DollarSign, Gavel } from 'lucide-react';
import { useEnhancedContextAnalyzer } from '@/hooks/useEnhancedContextAnalyzer';

interface QuerySuggestion {
  id: string;
  query: string;
  category: 'statistical' | 'business' | 'legal' | 'financial' | 'operational';
  description: string;
  expectedResults: string;
  complexity: 'low' | 'medium' | 'high';
  icon: React.ElementType;
  tags: string[];
}

interface EnhancedQuerySuggestionsProps {
  onSuggestionSelect: (query: string) => void;
  currentInput?: string;
  recentQueries?: string[];
}

const EnhancedQuerySuggestions: React.FC<EnhancedQuerySuggestionsProps> = ({
  onSuggestionSelect,
  currentInput = '',
  recentQueries = []
}) => {
  const [suggestions, setSuggestions] = useState<QuerySuggestion[]>([]);
  const [contextualSuggestions, setContextualSuggestions] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const { getContextSuggestions } = useEnhancedContextAnalyzer();

  // Predefined smart suggestions
  const baseSuggestions: QuerySuggestion[] = [
    // Statistical Queries - Arabic & English
    {
      id: 'stat-1',
      query: 'عدد العملاء النشطين هذا الشهر',
      category: 'statistical',
      description: 'احصائيات العملاء النشطين',
      expectedResults: 'عدد العملاء مع تفاصيل الحالة',
      complexity: 'low',
      icon: Users,
      tags: ['عملاء', 'إحصائيات', 'شهري']
    },
    {
      id: 'stat-2',
      query: 'How many active customers this month',
      category: 'statistical',
      description: 'Active customer statistics',
      expectedResults: 'Customer count with status details',
      complexity: 'low',
      icon: Users,
      tags: ['customers', 'statistics', 'monthly']
    },
    {
      id: 'stat-3',
      query: 'إجمالي قيمة العقود المكتملة',
      category: 'statistical',
      description: 'قيمة العقود المنجزة',
      expectedResults: 'مبلغ إجمالي مع تفاصيل العقود',
      complexity: 'medium',
      icon: FileText,
      tags: ['عقود', 'مبيعات', 'مكتمل']
    },
    {
      id: 'stat-4',
      query: 'Total value of completed contracts',
      category: 'statistical',
      description: 'Completed contract values',
      expectedResults: 'Total amount with contract details',
      complexity: 'medium',
      icon: FileText,
      tags: ['contracts', 'sales', 'completed']
    },

    // Business Analysis Queries
    {
      id: 'biz-1',
      query: 'مقارنة الإيرادات بين الربعين الأخيرين',
      category: 'business',
      description: 'تحليل مقارن للإيرادات',
      expectedResults: 'رسم بياني مقارن مع النسب',
      complexity: 'medium',
      icon: TrendingUp,
      tags: ['إيرادات', 'مقارنة', 'ربعي']
    },
    {
      id: 'biz-2',
      query: 'Revenue comparison between last two quarters',
      category: 'business',
      description: 'Comparative revenue analysis',
      expectedResults: 'Comparative chart with percentages',
      complexity: 'medium',
      icon: TrendingUp,
      tags: ['revenue', 'comparison', 'quarterly']
    },
    {
      id: 'biz-3',
      query: 'أداء المبيعات حسب المنطقة',
      category: 'business',
      description: 'تحليل المبيعات الجغرافي',
      expectedResults: 'تقرير مفصل بالمناطق',
      complexity: 'high',
      icon: DollarSign,
      tags: ['مبيعات', 'منطقة', 'أداء']
    },

    // Legal Queries
    {
      id: 'legal-1',
      query: 'عدد القضايا المفتوحة حاليا',
      category: 'legal',
      description: 'إحصائيات القضايا الجارية',
      expectedResults: 'عدد القضايا مع تصنيفات',
      complexity: 'low',
      icon: Gavel,
      tags: ['قضايا', 'مفتوح', 'قانوني']
    },
    {
      id: 'legal-2',
      query: 'Current open legal cases count',
      category: 'legal',
      description: 'Current legal case statistics',
      expectedResults: 'Case count with classifications',
      complexity: 'low',
      icon: Gavel,
      tags: ['cases', 'open', 'legal']
    },
    {
      id: 'legal-3',
      query: 'العقود المنتهية الصلاحية هذا الشهر',
      category: 'legal',
      description: 'عقود تحتاج تجديد',
      expectedResults: 'قائمة العقود مع تواريخ الانتهاء',
      complexity: 'medium',
      icon: FileText,
      tags: ['عقود', 'انتهاء', 'تجديد']
    },

    // Financial Queries
    {
      id: 'fin-1',
      query: 'الفواتير المستحقة غير المدفوعة',
      category: 'financial',
      description: 'متابعة المستحقات',
      expectedResults: 'قائمة الفواتير مع المبالغ',
      complexity: 'medium',
      icon: DollarSign,
      tags: ['فواتير', 'مستحق', 'دفع']
    },
    {
      id: 'fin-2',
      query: 'Outstanding unpaid invoices',
      category: 'financial',
      description: 'Accounts receivable tracking',
      expectedResults: 'Invoice list with amounts',
      complexity: 'medium',
      icon: DollarSign,
      tags: ['invoices', 'outstanding', 'payment']
    },

    // Operational Queries
    {
      id: 'op-1',
      query: 'معدل حضور الموظفين هذا الأسبوع',
      category: 'operational',
      description: 'إحصائيات الحضور',
      expectedResults: 'نسبة الحضور مع التفاصيل',
      complexity: 'low',
      icon: Users,
      tags: ['موظفين', 'حضور', 'أسبوعي']
    },
    {
      id: 'op-2',
      query: 'Employee attendance rate this week',
      category: 'operational',
      description: 'Attendance statistics',
      expectedResults: 'Attendance rate with details',
      complexity: 'low',
      icon: Users,
      tags: ['employees', 'attendance', 'weekly']
    }
  ];

  // Update contextual suggestions based on input
  useEffect(() => {
    if (currentInput.trim().length > 2) {
      const contextSuggestions = getContextSuggestions(currentInput);
      setContextualSuggestions(contextSuggestions.slice(0, 6));
    } else {
      setContextualSuggestions([]);
    }
  }, [currentInput, getContextSuggestions]);

  // Filter suggestions based on category
  const filteredSuggestions = selectedCategory === 'all' 
    ? baseSuggestions 
    : baseSuggestions.filter(s => s.category === selectedCategory);

  // Get recent query suggestions
  const recentSuggestions = recentQueries.slice(0, 3).map((query, index) => ({
    id: `recent-${index}`,
    query,
    category: 'recent' as const,
    description: 'استعلام سابق',
    expectedResults: 'نتائج مشابهة للاستعلام السابق',
    complexity: 'low' as const,
    icon: Lightbulb,
    tags: ['سابق', 'recent']
  }));

  const categories = [
    { id: 'all', label: 'الكل', icon: Lightbulb },
    { id: 'statistical', label: 'إحصائي', icon: TrendingUp },
    { id: 'business', label: 'أعمال', icon: DollarSign },
    { id: 'legal', label: 'قانوني', icon: Gavel },
    { id: 'financial', label: 'مالي', icon: DollarSign },
    { id: 'operational', label: 'تشغيلي', icon: Users }
  ];

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getComplexityLabel = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'بسيط';
      case 'medium': return 'متوسط';
      case 'high': return 'معقد';
      default: return 'غير محدد';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-600" />
          اقتراحات الاستعلامات الذكية
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Contextual Suggestions */}
        {contextualSuggestions.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 text-purple-700">اقتراحات حسب السياق</h4>
            <div className="grid gap-2">
              {contextualSuggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="justify-start text-right h-auto p-2"
                  onClick={() => onSuggestionSelect(suggestion)}
                >
                  <span className="text-purple-600">"{suggestion}"</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Recent Queries */}
        {recentSuggestions.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 text-blue-700">الاستعلامات الأخيرة</h4>
            <div className="grid gap-2">
              {recentSuggestions.map((suggestion) => (
                <Button
                  key={suggestion.id}
                  variant="outline"
                  size="sm"
                  className="justify-start text-right h-auto p-2"
                  onClick={() => onSuggestionSelect(suggestion.query)}
                >
                  <suggestion.icon className="h-4 w-4 ml-2" />
                  <span>{suggestion.query}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div>
          <h4 className="font-medium mb-2">تصفية حسب الفئة</h4>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="flex items-center gap-1"
              >
                <category.icon className="h-4 w-4" />
                {category.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Suggested Queries */}
        <div>
          <h4 className="font-medium mb-2">اقتراحات مُعدة مسبقاً</h4>
          <div className="grid gap-3">
            {filteredSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onSuggestionSelect(suggestion.query)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <suggestion.icon className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-sm">{suggestion.query}</span>
                  </div>
                  <Badge className={getComplexityColor(suggestion.complexity)}>
                    {getComplexityLabel(suggestion.complexity)}
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground mb-2">
                  {suggestion.description}
                </p>
                
                <p className="text-xs text-muted-foreground mb-2">
                  النتائج المتوقعة: {suggestion.expectedResults}
                </p>
                
                <div className="flex flex-wrap gap-1">
                  {suggestion.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h4 className="font-medium mb-2">إجراءات سريعة</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSuggestionSelect('ملخص الأداء اليوم')}
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              ملخص اليوم
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSuggestionSelect('التقرير الأسبوعي')}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              التقرير الأسبوعي
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSuggestionSelect('مؤشرات الأداء الرئيسية')}
              className="flex items-center gap-2"
            >
              <DollarSign className="h-4 w-4" />
              مؤشرات الأداء
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSuggestionSelect('المهام المعلقة')}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              المهام المعلقة
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedQuerySuggestions;