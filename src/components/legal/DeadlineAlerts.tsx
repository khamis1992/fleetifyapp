import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertCircle,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { useLegalCases } from '@/hooks/useLegalCases';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { format, addDays, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

interface Deadline {
  id: string;
  caseId: string;
  caseNumber: string;
  caseTitle: string;
  type: 'court_hearing' | 'response_deadline' | 'statute_of_limitations' | 'document_submission';
  dueDate: string;
  daysUntilDue: number;
  priority: 'critical' | 'urgent' | 'warning' | 'info';
  description: string;
  status: 'overdue' | 'due_soon' | 'upcoming' | 'on_track';
}

export const DeadlineAlerts: React.FC = () => {
  const { data: casesResponse, isLoading } = useLegalCases();
  const cases = casesResponse?.data || [];

  // Generate deadlines from cases
  const deadlines = useMemo(() => {
    if (!cases || cases.length === 0) return [];

    const allDeadlines: Deadline[] = [];
    const today = new Date();

    cases.forEach((legalCase) => {
      // Skip closed cases
      if (legalCase.case_status === 'closed') return;

      // Court Hearing Deadline (15 days from case creation for first hearing)
      const courtHearingDate = addDays(new Date(legalCase.created_at), 45);
      const daysToHearing = differenceInDays(courtHearingDate, today);

      if (daysToHearing >= -30 && daysToHearing <= 90) {
        allDeadlines.push({
          id: `${legalCase.id}-hearing`,
          caseId: legalCase.id,
          caseNumber: legalCase.case_number,
          caseTitle: legalCase.case_title_ar || legalCase.case_title,
          type: 'court_hearing',
          dueDate: courtHearingDate.toISOString(),
          daysUntilDue: daysToHearing,
          priority: daysToHearing <= 3 ? 'critical' : daysToHearing <= 7 ? 'urgent' : 'warning',
          description: `جلسة المحكمة المجدولة للقضية ${legalCase.case_number}`,
          status:
            daysToHearing < 0 ? 'overdue' : daysToHearing <= 3 ? 'due_soon' : daysToHearing <= 7 ? 'upcoming' : 'on_track',
        });
      }

      // Response Deadline (21 days from case creation)
      const responseDeadline = addDays(new Date(legalCase.created_at), 21);
      const daysToResponse = differenceInDays(responseDeadline, today);

      if (daysToResponse >= -30 && daysToResponse <= 90) {
        allDeadlines.push({
          id: `${legalCase.id}-response`,
          caseId: legalCase.id,
          caseNumber: legalCase.case_number,
          caseTitle: legalCase.case_title_ar || legalCase.case_title,
          type: 'response_deadline',
          dueDate: responseDeadline.toISOString(),
          daysUntilDue: daysToResponse,
          priority: daysToResponse <= 3 ? 'critical' : daysToResponse <= 7 ? 'urgent' : 'warning',
          description: `موعد الرد على الدعوى للقضية ${legalCase.case_number}`,
          status:
            daysToResponse < 0 ? 'overdue' : daysToResponse <= 3 ? 'due_soon' : daysToResponse <= 7 ? 'upcoming' : 'on_track',
        });
      }

      // Document Submission Deadline (10 days from case creation)
      const docSubmissionDate = addDays(new Date(legalCase.created_at), 10);
      const daysToSubmission = differenceInDays(docSubmissionDate, today);

      if (daysToSubmission >= -30 && daysToSubmission <= 90) {
        allDeadlines.push({
          id: `${legalCase.id}-docs`,
          caseId: legalCase.id,
          caseNumber: legalCase.case_number,
          caseTitle: legalCase.case_title_ar || legalCase.case_title,
          type: 'document_submission',
          dueDate: docSubmissionDate.toISOString(),
          daysUntilDue: daysToSubmission,
          priority: daysToSubmission <= 2 ? 'critical' : daysToSubmission <= 5 ? 'urgent' : 'info',
          description: `موعد تقديم الوثائق للقضية ${legalCase.case_number}`,
          status:
            daysToSubmission < 0 ? 'overdue' : daysToSubmission <= 2 ? 'due_soon' : daysToSubmission <= 5 ? 'upcoming' : 'on_track',
        });
      }

      // Statute of Limitations Warning (365 days, varies by case type)
      let limitationsDays = 365; // Default: 1 year
      if (legalCase.case_type === 'commercial') limitationsDays = 1825; // 5 years for commercial
      if (legalCase.case_type === 'criminal') limitationsDays = 2555; // 7 years for criminal

      const limitationDate = addDays(new Date(legalCase.created_at), limitationsDays);
      const daysToLimitation = differenceInDays(limitationDate, today);

      if (daysToLimitation >= 0 && daysToLimitation <= 60) {
        allDeadlines.push({
          id: `${legalCase.id}-limitation`,
          caseId: legalCase.id,
          caseNumber: legalCase.case_number,
          caseTitle: legalCase.case_title_ar || legalCase.case_title,
          type: 'statute_of_limitations',
          dueDate: limitationDate.toISOString(),
          daysUntilDue: daysToLimitation,
          priority: daysToLimitation <= 7 ? 'critical' : daysToLimitation <= 30 ? 'urgent' : 'warning',
          description: `تحذير من انتهاء الحد الزمني لتقادم الدعوى للقضية ${legalCase.case_number}`,
          status:
            daysToLimitation <= 7 ? 'due_soon' : daysToLimitation <= 30 ? 'upcoming' : 'on_track',
        });
      }
    });

    // Sort by days until due
    return allDeadlines.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }, [cases]);

  // Group deadlines by status
  const groupedDeadlines = useMemo(() => {
    return {
      overdue: deadlines.filter((d) => d.status === 'overdue'),
      dueSoon: deadlines.filter((d) => d.status === 'due_soon'),
      upcoming: deadlines.filter((d) => d.status === 'upcoming'),
      onTrack: deadlines.filter((d) => d.status === 'on_track'),
    };
  }, [deadlines]);

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      court_hearing: 'جلسة محكمة',
      response_deadline: 'موعد الرد',
      statute_of_limitations: 'حد زمني',
      document_submission: 'تقديم وثائق',
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'court_hearing':
        return <Calendar className="h-4 w-4" />;
      case 'response_deadline':
        return <Clock className="h-4 w-4" />;
      case 'statute_of_limitations':
        return <AlertTriangle className="h-4 w-4" />;
      case 'document_submission':
        return <Zap className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, 'destructive' | 'default' | 'secondary'> = {
      critical: 'destructive',
      urgent: 'destructive',
      warning: 'default',
      info: 'secondary',
    };
    const labels: Record<string, string> = {
      critical: 'حرج',
      urgent: 'عاجل',
      warning: 'تحذير',
      info: 'معلومة',
    };
    return <Badge variant={variants[priority] || 'secondary'}>{labels[priority]}</Badge>;
  };

  const DeadlineCard: React.FC<{ deadline: Deadline }> = ({ deadline }) => (
    <Card className="border-l-4" style={{
      borderLeftColor:
        deadline.priority === 'critical' ? '#ef4444' :
        deadline.priority === 'urgent' ? '#f97316' :
        deadline.priority === 'warning' ? '#eab308' :
        '#10b981'
    }}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="mt-1">
              {getTypeIcon(deadline.type)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{deadline.caseNumber}</span>
                {getPriorityBadge(deadline.priority)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{deadline.caseTitle}</p>
              <p className="text-sm font-medium mt-2">{deadline.description}</p>
              <div className="flex items-center gap-2 mt-2 text-sm">
                <span className="text-muted-foreground">نوع الموعد:</span>
                <Badge variant="outline">{getTypeLabel(deadline.type)}</Badge>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {deadline.daysUntilDue < 0 ? `−${Math.abs(deadline.daysUntilDue)}` : deadline.daysUntilDue}
            </div>
            <p className="text-xs text-muted-foreground">
              {deadline.daysUntilDue < 0 ? 'يوم متأخر' : 'يوم متبقي'}
            </p>
            <p className="text-xs font-medium mt-2">
              {format(new Date(deadline.dueDate), 'dd MMM yyyy', { locale: ar })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Alerts */}
      {groupedDeadlines.overdue.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            هناك {groupedDeadlines.overdue.length} موعد متأخر يحتاج إلى إجراء فوري
          </AlertDescription>
        </Alert>
      )}

      {groupedDeadlines.dueSoon.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {groupedDeadlines.dueSoon.length} موعد حرج في الأيام القادمة (3 أيام أو أقل)
          </AlertDescription>
        </Alert>
      )}

      {deadlines.length === 0 && (
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>
            لا توجد مواعيد نهائية قريبة. جميع الحالات على المسار الصحيح.
          </AlertDescription>
        </Alert>
      )}

      {/* Deadlines by Status */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">
            الكل ({deadlines.length})
          </TabsTrigger>
          <TabsTrigger value="overdue">
            متأخرة ({groupedDeadlines.overdue.length})
          </TabsTrigger>
          <TabsTrigger value="dueSoon">
            حرجة ({groupedDeadlines.dueSoon.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            قادمة ({groupedDeadlines.upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="onTrack">
            في موعدها ({groupedDeadlines.onTrack.length})
          </TabsTrigger>
        </TabsList>

        {/* All Deadlines */}
        <TabsContent value="all" className="space-y-4">
          {deadlines.length > 0 ? (
            deadlines.map((deadline) => (
              <DeadlineCard key={deadline.id} deadline={deadline} />
            ))
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground py-12">
                لا توجد مواعيد نهائية قريبة
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Overdue */}
        <TabsContent value="overdue" className="space-y-4">
          {groupedDeadlines.overdue.length > 0 ? (
            groupedDeadlines.overdue.map((deadline) => (
              <DeadlineCard key={deadline.id} deadline={deadline} />
            ))
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground py-12">
                لا توجد مواعيد متأخرة
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Due Soon */}
        <TabsContent value="dueSoon" className="space-y-4">
          {groupedDeadlines.dueSoon.length > 0 ? (
            groupedDeadlines.dueSoon.map((deadline) => (
              <DeadlineCard key={deadline.id} deadline={deadline} />
            ))
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground py-12">
                لا توجد مواعيد حرجة
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Upcoming */}
        <TabsContent value="upcoming" className="space-y-4">
          {groupedDeadlines.upcoming.length > 0 ? (
            groupedDeadlines.upcoming.map((deadline) => (
              <DeadlineCard key={deadline.id} deadline={deadline} />
            ))
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground py-12">
                لا توجد مواعيد قادمة
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* On Track */}
        <TabsContent value="onTrack" className="space-y-4">
          {groupedDeadlines.onTrack.length > 0 ? (
            groupedDeadlines.onTrack.map((deadline) => (
              <DeadlineCard key={deadline.id} deadline={deadline} />
            ))
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground py-12">
                جميع المواعيد في موعدها
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>إحصائيات المواعيد</CardTitle>
          <CardDescription>ملخص حالة جميع المواعيد النهائية</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">المواعيد المتأخرة</div>
              <div className="text-3xl font-bold text-red-600">{groupedDeadlines.overdue.length}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">المواعيد الحرجة</div>
              <div className="text-3xl font-bold text-orange-600">{groupedDeadlines.dueSoon.length}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">المواعيد القادمة</div>
              <div className="text-3xl font-bold text-yellow-600">{groupedDeadlines.upcoming.length}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">في الموعد المحدد</div>
              <div className="text-3xl font-bold text-green-600">{groupedDeadlines.onTrack.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeadlineAlerts;
