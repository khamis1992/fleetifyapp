import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpLeft,
  CheckSquare,
  Edit,
  Loader2,
  Send,
  Trash2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  useTaskComments,
  useAddTaskComment,
  useTaskActivityLog,
  useToggleChecklist,
  useUpdateTaskStatus,
  type Task,
} from "@/hooks/useTasks";
import {
  taskDate,
  taskIsOverdue,
  taskPriorityLabels,
  taskRelatedRecord,
  taskStatusLabels,
} from "./workspace/model";

interface TaskDetailsSheetProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}
const personName = (person?: Task["creator"]) =>
  person
    ? `${person.first_name_ar || person.first_name || ""} ${
        person.last_name_ar || person.last_name || ""
      }`.trim()
    : "غير محدد";
const activityLabels: Record<string, string> = {
  created: "إنشاء المهمة",
  updated: "تحديث المهمة",
  status_changed: "تغيير الحالة",
  comment_added: "إضافة تعليق",
};

export function TaskDetailsSheet({
  task,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: TaskDetailsSheetProps) {
  const comments = useTaskComments(task?.id);
  const activities = useTaskActivityLog(task?.id);
  const addComment = useAddTaskComment();
  const toggleChecklist = useToggleChecklist();
  const updateStatus = useUpdateTaskStatus();
  const [draft, setDraft] = useState("");
  useEffect(() => setDraft(""), [task?.id]);
  if (!task) return null;
  const checklist = [...(task.checklists || [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  const completed = checklist.filter((item) => item.is_completed).length;
  const related = taskRelatedRecord(task);
  const submitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.trim() || addComment.isPending) return;
    try {
      await addComment.mutateAsync({ taskId: task.id, content: draft.trim() });
      setDraft("");
    } catch {
      /* Keep the draft; the mutation reports the error. */
    }
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" dir="rtl" className="tw-details">
        <SheetHeader className="tw-detail-header">
          <div className="tw-eyebrow">
            تفاصيل المهمة <span> / </span> {task.category || "عامة"}
          </div>
          <SheetTitle>{task.title}</SheetTitle>
          <SheetDescription>
            المسؤوليات والتقدّم وسجل المتابعة في مكان واحد.
          </SheetDescription>
          <div className="tw-detail-actions">
            <span className={`tw-priority priority-${task.priority}`}>
              {taskPriorityLabels[task.priority]}
            </span>
            <button className="tw-button" onClick={() => onEdit(task)}>
              <Edit size={15} />
              تعديل
            </button>
            <button
              className="tw-button"
              aria-label="حذف المهمة"
              onClick={() => onDelete(task.id)}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </SheetHeader>
        <div className="tw-detail-body">
          <section>
            <label className="tw-field">
              حالة المهمة
              <select
                value={task.status}
                disabled={updateStatus.isPending}
                onChange={(event) =>
                  updateStatus.mutate({
                    taskId: task.id,
                    status: event.target.value as Task["status"],
                  })
                }
              >
                {Object.entries(taskStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <dl className="tw-detail-meta">
              <div>
                <dt>المسؤول</dt>
                <dd>{personName(task.assignee)}</dd>
              </div>
              <div>
                <dt>موعد الاستحقاق</dt>
                <dd className={taskIsOverdue(task) ? "tw-overdue" : ""}>
                  {taskDate(task.due_date)}
                  {taskIsOverdue(task) && " · متأخرة"}
                </dd>
              </div>
              <div>
                <dt>تاريخ البدء</dt>
                <dd>{taskDate(task.start_date)}</dd>
              </div>
              <div>
                <dt>التصنيف</dt>
                <dd>{task.category || "غير مصنّفة"}</dd>
              </div>
            </dl>
            {related && (
              <Link className="tw-record-link" to={related.href}>
                {related.label}
                <ArrowUpLeft size={16} />
              </Link>
            )}
          </section>
          <section>
            <h3>عن المهمة</h3>
            <p className="tw-detail-description">
              {task.description || "لم تتم إضافة وصف لهذه المهمة."}
            </p>
            {!!task.tags?.length && (
              <div className="tw-tags">
                {task.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            )}
          </section>
          <section>
            <div className="tw-detail-section-title">
              <h3>
                <CheckSquare size={17} />
                خطوات الإنجاز
              </h3>
              <span>
                {completed} / {checklist.length}
              </span>
            </div>
            {checklist.length ? (
              <>
                <Progress
                  value={(completed / checklist.length) * 100}
                  className="tw-check-progress"
                />
                <div className="tw-check-items">
                  {checklist.map((item) => (
                    <label
                      key={item.id}
                      className={item.is_completed ? "is-complete" : ""}
                    >
                      <Checkbox
                        checked={item.is_completed}
                        disabled={toggleChecklist.isPending}
                        onCheckedChange={(value) =>
                          toggleChecklist.mutate({
                            checklistId: item.id,
                            isCompleted: value === true,
                          })
                        }
                      />
                      <span>{item.title}</span>
                    </label>
                  ))}
                </div>
              </>
            ) : (
              <p className="tw-muted">لا توجد خطوات فرعية لهذه المهمة.</p>
            )}
          </section>
          <section>
            <Tabs defaultValue="comments">
              <TabsList className="tw-detail-tabs">
                <TabsTrigger value="comments">
                  التعليقات{" "}
                  {comments.data?.length ? `(${comments.data.length})` : ""}
                </TabsTrigger>
                <TabsTrigger value="activity">سجل النشاط</TabsTrigger>
              </TabsList>
              <TabsContent value="comments">
                <div className="tw-timeline">
                  {comments.isLoading ? (
                    <p role="status">جاري تحميل التعليقات…</p>
                  ) : comments.isError ? (
                    <button
                      className="tw-button"
                      onClick={() => comments.refetch()}
                    >
                      تعذر تحميل التعليقات · إعادة المحاولة
                    </button>
                  ) : !comments.data?.length ? (
                    <p className="tw-muted">ابدأ المتابعة بإضافة أول تعليق.</p>
                  ) : (
                    comments.data.map((comment) => (
                      <article key={comment.id}>
                        <header>
                          <strong>{personName(comment.user)}</strong>
                          <time>{taskDate(comment.created_at)}</time>
                        </header>
                        <p>{comment.content}</p>
                      </article>
                    ))
                  )}
                </div>
                <form onSubmit={submitComment} className="tw-comment-form">
                  <label htmlFor="task-comment">إضافة تعليق</label>
                  <textarea
                    id="task-comment"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="اكتب تحديثاً أو ملاحظة للفريق…"
                    rows={3}
                    disabled={addComment.isPending}
                  />
                  <button
                    className="tw-button tw-primary"
                    disabled={!draft.trim() || addComment.isPending}
                  >
                    {addComment.isPending ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Send size={15} />
                    )}
                    إرسال التعليق
                  </button>
                </form>
              </TabsContent>
              <TabsContent value="activity">
                <div className="tw-timeline">
                  {activities.isLoading ? (
                    <p role="status">جاري تحميل السجل…</p>
                  ) : activities.isError ? (
                    <button
                      className="tw-button"
                      onClick={() => activities.refetch()}
                    >
                      تعذر تحميل السجل · إعادة المحاولة
                    </button>
                  ) : !activities.data?.length ? (
                    <p className="tw-muted">لا توجد أحداث مسجّلة بعد.</p>
                  ) : (
                    activities.data.map((activity) => (
                      <article key={activity.id}>
                        <header>
                          <strong>{personName(activity.user)}</strong>
                          <time>{taskDate(activity.created_at)}</time>
                        </header>
                        <p>
                          {activity.description ||
                            activityLabels[activity.action] ||
                            "تحديث المهمة"}
                        </p>
                      </article>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </section>
          <footer className="tw-detail-footer">
            أنشأها {personName(task.creator)} · {taskDate(task.created_at)}
            {task.completed_at && (
              <span>اكتملت في {taskDate(task.completed_at)}</span>
            )}
          </footer>
        </div>
      </SheetContent>
    </Sheet>
  );
}
export default TaskDetailsSheet;
