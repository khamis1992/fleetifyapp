import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Search, Plus, FileText, Check, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';

interface PayrollReview {
  id: string;
  period_start: string;
  period_end: string;
  total_employees: number;
  total_amount: number;
  total_deductions: number;
  net_amount: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'paid';
  created_at: string;
}

export default function Payroll() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: payrollReviews, isLoading } = useQuery({
    queryKey: ['payroll-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_reviews')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PayrollReview[];
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
      draft: { label: 'مسودة', variant: 'secondary' as const },
      pending_approval: { label: 'في انتظار الموافقة', variant: 'outline' as const },
      approved: { label: 'معتمد', variant: 'default' as const },
      paid: { label: 'مدفوع', variant: 'destructive' as const },
    };
    
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: 'outline' as const };
  };

  const filteredReviews = payrollReviews?.filter(review =>
    review.period_start.includes(searchTerm) ||
    review.period_end.includes(searchTerm)
  ) || [];

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <DollarSign className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">إدارة الرواتب</h1>
            <p className="text-muted-foreground">إدارة ومراجعة رواتب الموظفين</p>
          </div>
        </div>
        <Button>
          <Plus className="h-4 w-4 ml-2" />
          إنشاء دورة رواتب جديدة
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="البحث في دورات الرواتب..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredReviews.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">لا توجد دورات رواتب مسجلة</p>
                <Button className="mt-4">
                  <Plus className="h-4 w-4 ml-2" />
                  إنشاء أول دورة رواتب
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredReviews.map((review) => {
            const statusInfo = getStatusBadge(review.status);
            return (
              <Card key={review.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <DollarSign className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          دورة رواتب من {review.period_start} إلى {review.period_end}
                        </h3>
                        <p className="text-muted-foreground">
                          {review.total_employees} موظف
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">إجمالي الرواتب</p>
                        <p className="font-semibold text-lg">
                          {formatCurrency(review.total_amount)}
                        </p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">إجمالي الخصومات</p>
                        <p className="font-semibold text-orange-600">
                          {formatCurrency(review.total_deductions)}
                        </p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">صافي المبلغ</p>
                        <p className="font-semibold text-green-600 text-lg">
                          {formatCurrency(review.net_amount)}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={statusInfo.variant}>
                          {statusInfo.label}
                        </Badge>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm">
                            <FileText className="h-4 w-4" />
                          </Button>
                          {review.status === 'pending_approval' && (
                            <Button size="sm">
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}