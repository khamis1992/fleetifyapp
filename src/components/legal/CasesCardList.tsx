/**
 * Cases Card List Component
 * عرض القضايا بنظام البطاقات
 * 
 * Features:
 * - Card-based layout (responsive)
 * - Priority badges with colors
 * - Quick actions
 * - Status indicators
 * - Mobile-friendly
 */

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Eye,
  Edit,
  MoreVertical,
  Calendar,
  DollarSign,
  User,
  Scale,
  Clock,
  AlertCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface LegalCase {
  id: string;
  case_number: string;
  title: string;
  customer_name: string;
  lawyer_name?: string;
  case_type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'active' | 'pending' | 'closed';
  total_cost: number;
  next_hearing_date?: string;
  created_at: string;
  description?: string;
}

interface CasesCardListProps {
  cases: LegalCase[];
  onViewCase: (caseId: string) => void;
  onEditCase: (caseId: string) => void;
  loading?: boolean;
}

const priorityConfig = {
  low: { label: 'منخفض', color: 'bg-gray-500' },
  medium: { label: 'متوسط', color: 'bg-blue-500' },
  high: { label: 'عالي', color: 'bg-orange-500' },
  urgent: { label: 'عاجل', color: 'bg-red-500' },
};

const statusConfig = {
  active: { label: 'نشطة', color: 'bg-green-600', icon: AlertCircle },
  pending: { label: 'معلقة', color: 'bg-yellow-600', icon: Clock },
  closed: { label: 'مغلقة', color: 'bg-gray-600', icon: AlertCircle },
};

const caseTypeLabels: Record<string, string> = {
  commercial: 'تجاري',
  civil: 'مدني',
  labor: 'عمالي',
  rental: 'إيجارات',
  payment_collection: 'تحصيل مدفوعات',
  contract_dispute: 'نزاع عقد',
  other: 'أخرى',
};

const CasesCardList: React.FC<CasesCardListProps> = ({
  cases,
  onViewCase,
  onEditCase,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Scale className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">لا توجد قضايا</h3>
          <p className="text-sm text-muted-foreground">
            لم يتم العثور على قضايا تطابق معايير البحث
          </p>
        </CardContent>
      </Card>
    );
  }

  const getNextHearingLabel = (date?: string) => {
    if (!date) return null;
    
    const hearingDate = new Date(date);
    const today = new Date();
    const diffTime = hearingDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'فات الموعد';
    if (diffDays === 0) return 'اليوم';
    if (diffDays === 1) return 'غداً';
    if (diffDays <= 7) return `خلال ${diffDays} أيام`;
    return new Date(date).toLocaleDateString('en-US');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cases.map((legalCase) => {
        const StatusIcon = statusConfig[legalCase.status].icon;
        const nextHearingLabel = getNextHearingLabel(legalCase.next_hearing_date);
        const isUrgent = nextHearingLabel === 'اليوم' || nextHearingLabel === 'غداً';

        return (
          <Card
            key={legalCase.id}
            className={`hover:shadow-lg transition-all duration-200 ${
              legalCase.priority === 'urgent' ? 'border-red-500 border-2' : ''
            } ${isUrgent ? 'ring-2 ring-orange-500' : ''}`}
          >
            <CardHeader className="pb-3">
              {/* Header Row: Case Number + Actions */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Scale className="h-4 w-4 text-primary" />
                    <span className="font-mono text-sm font-medium">
                      {legalCase.case_number}
                    </span>
                  </div>
                  <h3 className="font-semibold text-base line-clamp-2">
                    {legalCase.title}
                  </h3>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewCase(legalCase.id)}>
                      <Eye className="h-4 w-4 mr-2" />
                      عرض التفاصيل
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditCase(legalCase.id)}>
                      <Edit className="h-4 w-4 mr-2" />
                      تعديل
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Badges Row */}
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge className={priorityConfig[legalCase.priority].color}>
                  {priorityConfig[legalCase.priority].label}
                </Badge>
                <Badge className={statusConfig[legalCase.status].color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig[legalCase.status].label}
                </Badge>
                <Badge variant="outline">
                  {caseTypeLabels[legalCase.case_type] || legalCase.case_type}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Customer Info */}
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{legalCase.customer_name}</span>
              </div>

              {/* Lawyer Info */}
              {legalCase.lawyer_name && (
                <div className="flex items-center gap-2 text-sm">
                  <Scale className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    المحامي: {legalCase.lawyer_name}
                  </span>
                </div>
              )}

              {/* Cost */}
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {legalCase.total_cost.toLocaleString('en-US')} ر.س
                </span>
              </div>

              {/* Next Hearing */}
              {legalCase.next_hearing_date && (
                <div
                  className={`flex items-center gap-2 text-sm p-2 rounded-md ${
                    isUrgent ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'
                  }`}
                >
                  <Calendar className={`h-4 w-4 ${isUrgent ? 'text-orange-600' : 'text-muted-foreground'}`} />
                  <span className={isUrgent ? 'font-medium text-orange-900' : ''}>
                    الموعد القادم: {nextHearingLabel}
                  </span>
                </div>
              )}

              {/* Description */}
              {legalCase.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {legalCase.description}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onViewCase(legalCase.id)}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  عرض التفاصيل
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditCase(legalCase.id)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default CasesCardList;
