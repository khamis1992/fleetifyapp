import { AlertCircle, CheckCircle2, ChevronLeft, ClipboardCheck, Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FilingIssue } from '../utils/filingIssues';

interface Props {
  issues: FilingIssue[];
  onResolve: (issue: FilingIssue) => void;
}

export function FilingIssuesPanel({ issues, onResolve }: Props) {
  const blockers = issues.filter((issue) => issue.severity === 'blocking');
  const warnings = issues.filter((issue) => issue.severity === 'warning');

  return (
    <section className="lawsuit-issues-panel" aria-labelledby="lawsuit-issues-heading">
      <header className="lawsuit-issues-heading">
        <div className="flex items-start gap-3">
          <span className="lawsuit-issues-icon"><ClipboardCheck className="h-6 w-6" /></span>
          <div>
            <h2 id="lawsuit-issues-heading">ملاحظات الدعوى واستكمال النواقص</h2>
            <p>كل ملاحظة مرتبطة بإجراء لاستكمالها. تُحدّث القائمة بعد حفظ البيانات.</p>
          </div>
        </div>
        <div className="lawsuit-issues-counts" aria-live="polite" aria-atomic="true">
          <span className={blockers.length ? 'is-blocking' : 'is-ready'}>{blockers.length ? `نواقص تمنع الرفع: ${blockers.length}` : 'متطلبات التجهيز مكتملة'}</span>
          {warnings.length > 0 && <span className="is-warning">ملاحظات للتوثيق: {warnings.length}</span>}
        </div>
      </header>
      <div className="lawsuit-issues-columns">
        <div className="lawsuit-issues-group">
          <h3><AlertCircle className="h-4 w-4" /> نواقص تمنع بدء الرفع</h3>
          {blockers.length === 0 && <p className="lawsuit-issues-clear"><CheckCircle2 className="h-5 w-5 shrink-0" /> اكتملت متطلبات التجهيز. تبقى مراجعة الوكيل واعتماد الإرسال ضمن إجراءات الرفع.</p>}
          {blockers.map((issue) => <IssueRow key={issue.id} issue={issue} onResolve={onResolve} />)}
        </div>
        <div className="lawsuit-issues-group is-advisory">
          <h3><Info className="h-4 w-4" /> ملاحظات تحتاج توثيقًا</h3>
          <p className="lawsuit-issues-help">لا تقفل الرفع بمفردها، وقد تؤثر في الطلبات أو التعويضات التي تدخل الدعوى.</p>
          {warnings.length === 0 && <p className="lawsuit-issues-empty">لا توجد ملاحظات إضافية في الفحص الحالي.</p>}
          {warnings.map((issue) => <IssueRow key={issue.id} issue={issue} onResolve={onResolve} />)}
        </div>
      </div>
    </section>
  );
}

function IssueRow({ issue, onResolve }: { issue: FilingIssue; onResolve: Props['onResolve'] }) {
  return (
    <article className={`lawsuit-issue-row is-${issue.severity}`}>
      <div className="min-w-0 flex-1">
        <h4>{issue.pending && <Loader2 className="h-4 w-4 animate-spin" />}{issue.title}</h4>
        <p>{issue.description}</p>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={() => onResolve(issue)} className="lawsuit-issue-action" aria-label={`${issue.actionLabel}: ${issue.title}`}>
        {issue.actionLabel}<ChevronLeft className="h-4 w-4 shrink-0" />
      </Button>
    </article>
  );
}
