import React from 'react';
import { FileText, Plus, X, CheckCircle, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ContractsEmptyStateProps {
  type: 'no-results' | 'no-contracts' | 'no-suspended' | 'no-under-review' | 'no-expired';
  onCreateContract?: () => void;
  onClearFilters?: () => void;
}

export const ContractsEmptyState: React.FC<ContractsEmptyStateProps> = ({
  type,
  onCreateContract,
  onClearFilters
}) => {
  const getContent = () => {
    switch (type) {
      case 'no-results':
        return {
          icon: <FileText className="h-12 w-12 text-muted-foreground mb-4" />,
          title: 'لا توجد نتائج',
          description: 'لم يتم العثور على عقود تطابق معايير البحث المحددة',
          action: onClearFilters && (
            <Button variant="outline" onClick={onClearFilters}>
              <X className="h-4 w-4 mr-2" />
              مسح جميع الفلاتر
            </Button>
          )
        };
      case 'no-contracts':
        return {
          icon: <FileText className="h-12 w-12 text-muted-foreground mb-4" />,
          title: 'لا توجد عقود بعد',
          description: 'ابدأ في إنشاء أول عقد لعملائك',
          action: onCreateContract && (
            <Button onClick={onCreateContract}>
              <Plus className="h-4 w-4 mr-2" />
              إنشاء عقد جديد
            </Button>
          )
        };
      case 'no-suspended':
        return {
          icon: <Pause className="h-12 w-12 text-muted-foreground mb-4" />,
          title: 'لا توجد عقود معلقة',
          description: 'جميع العقود في حالة نشطة أو منتهية',
          action: null
        };
      case 'no-under-review':
        return {
          icon: <Pause className="h-12 w-12 text-amber-500 mb-4" />,
          title: 'لا توجد عقود تحت الإجراء',
          description: 'لا توجد عقود تحت المراجعة حالياً',
          action: null
        };
      case 'no-expired':
        return {
          icon: <CheckCircle className="h-12 w-12 text-green-500 mb-4" />,
          title: 'لا توجد عقود منتهية',
          description: 'جميع العقود في حالة نشطة أو معلقة',
          action: null
        };
      default:
        return {
          icon: <FileText className="h-12 w-12 text-muted-foreground mb-4" />,
          title: 'لا توجد بيانات',
          description: '',
          action: null
        };
    }
  };

  const content = getContent();

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        {content.icon}
        <h3 className="text-lg font-semibold mb-2">{content.title}</h3>
        <p className="text-muted-foreground text-center mb-4">
          {content.description}
        </p>
        {content.action}
      </CardContent>
    </Card>
  );
};