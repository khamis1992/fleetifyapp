import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, X, ListChecks, FileText, CalendarDays } from "lucide-react";
import {
  useCreateTask,
  useUpdateTask,
  useTeamMembers,
  type Task,
} from "@/hooks/useTasks";
import { taskPriorityLabels, taskStatusLabels } from "./workspace/model";
import "./workspace/tasks-workspace.css";

const localInputDate = (value?: string) => {
  const date = value ? new Date(value) : undefined;
  if (!date || !Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

export function TaskForm({
  open,
  onOpenChange,
  task,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  onSuccess?: () => void;
}) {
  const create = useCreateTask(),
    update = useUpdateTask();
  const team = useTeamMembers();
  const [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [assignee, setAssignee] = useState(""),
    [category, setCategory] = useState(""),
    [tags, setTags] = useState("");
  const [status, setStatus] = useState<Task["status"]>("pending"),
    [priority, setPriority] = useState<Task["priority"]>("medium");
  const [due, setDue] = useState(""),
    [start, setStart] = useState(""),
    [checks, setChecks] = useState<string[]>([]),
    [newCheck, setNewCheck] = useState(""),
    [error, setError] = useState("");
  const pending = create.isPending || update.isPending;
  useEffect(() => {
    if (!open) return;
    setTitle(task?.title || "");
    setDescription(task?.description || "");
    setAssignee(task?.assigned_to || "");
    setCategory(task?.category || "");
    setTags((task?.tags || []).join("، "));
    setStatus(task?.status || "pending");
    setPriority(task?.priority || "medium");
    setDue(localInputDate(task?.due_date));
    setStart(localInputDate(task?.start_date));
    setChecks([]);
    setNewCheck("");
    setError("");
  }, [task, open]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (title.trim().length < 3) {
      setError("أدخل عنواناً واضحاً من ثلاثة أحرف على الأقل.");
      return;
    }
    if (start && due && new Date(due) < new Date(start)) {
      setError("يجب أن يكون موعد الاستحقاق بعد تاريخ البدء.");
      return;
    }
    const data = {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      category,
      tags: [
        ...new Set(
          tags
            .split(/[,،]/)
            .map((value) => value.trim())
            .filter(Boolean)
        ),
      ],
    };
    try {
      if (task)
        await update.mutateAsync({
          ...data,
          id: task.id,
          assigned_to: assignee || null,
          due_date: due ? new Date(due).toISOString() : null,
          start_date: start ? new Date(start).toISOString() : null,
        });
      else
        await create.mutateAsync({
          ...data,
          assigned_to: assignee || undefined,
          due_date: due ? new Date(due).toISOString() : undefined,
          start_date: start ? new Date(start).toISOString() : undefined,
          checklists: [
            ...checks,
            ...(newCheck.trim() ? [newCheck.trim()] : []),
          ].map((title) => ({ title })),
        });
      onOpenChange(false);
      onSuccess?.();
    } catch {
      setError("تعذر حفظ المهمة. راجع البيانات وحاول مجدداً.");
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => !pending && onOpenChange(value)}
    >
      <DialogContent className="tw-dialog tw-task-form" dir="rtl">
        <DialogHeader>
          <div className="tw-eyebrow">
            تنظيم العمل <span>/</span>{" "}
            {task ? "تحديث المسؤوليات" : "خطوة جديدة"}
          </div>
          <DialogTitle>{task ? "تعديل المهمة" : "مهمة جديدة"}</DialogTitle>
          <DialogDescription>
            حدّد المطلوب والمسؤول والموعد، لتكون الخطوة التالية واضحة.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <fieldset disabled={pending} className="tw-form-content">
            <section className="tw-form-section">
              <h3>
                <FileText size={17} />
                ماذا نحتاج إلى إنجازه؟
              </h3>
              <label>
                عنوان المهمة <span>*</span>
                <input
                  autoFocus
                  required
                  minLength={3}
                  maxLength={300}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: متابعة تجديد عقد العميل"
                />
              </label>
              <label>
                الوصف
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="النتيجة المطلوبة والتفاصيل التي تساعد المسؤول…"
                />
              </label>
            </section>
            <section className="tw-form-section">
              <h3>
                <CalendarDays size={17} />
                المسؤولية والجدول الزمني
              </h3>
              <div className="tw-form-grid">
                <label>
                  المسؤول
                  <select
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                  >
                    <option value="">غير معيّنة</option>
                    {task?.assigned_to &&
                      !team.data?.some(
                        (member) => member.id === task.assigned_to
                      ) && (
                        <option value={task.assigned_to}>
                          {task.assignee?.first_name_ar ||
                            task.assignee?.first_name ||
                            "المسؤول الحالي"}
                        </option>
                      )}
                    {(team.data || []).map((member) => (
                      <option value={member.id} key={member.id}>
                        {member.first_name_ar || member.first_name}{" "}
                        {member.last_name_ar || member.last_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  الأولوية
                  <select
                    value={priority}
                    onChange={(e) =>
                      setPriority(e.target.value as Task["priority"])
                    }
                  >
                    {Object.entries(taskPriorityLabels).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </label>
                <label>
                  تاريخ البدء
                  <input
                    type="datetime-local"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </label>
                <label>
                  موعد الاستحقاق
                  <input
                    type="datetime-local"
                    min={start || undefined}
                    value={due}
                    onChange={(e) => setDue(e.target.value)}
                  />
                </label>
                <label>
                  الحالة
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as Task["status"])
                    }
                  >
                    {Object.entries(taskStatusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  التصنيف
                  <input
                    list="tw-task-categories"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="اختر أو اكتب التصنيف"
                  />
                  <datalist id="tw-task-categories">
                    {[
                      "عقود",
                      "مالية",
                      "صيانة",
                      "عملاء",
                      "موارد بشرية",
                      "تسويق",
                      "أخرى",
                    ].map((value) => (
                      <option key={value} value={value} />
                    ))}
                  </datalist>
                </label>
              </div>
              {team.isError && (
                <p role="alert" className="tw-form-error">
                  تعذر تحميل أعضاء الفريق.{" "}
                  <button type="button" onClick={() => team.refetch()}>
                    إعادة المحاولة
                  </button>
                </p>
              )}
              <label>
                الوسوم
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="افصل بين الوسوم بفاصلة"
                />
              </label>
            </section>
            <section className="tw-form-section">
              <h3>
                <ListChecks size={17} />
                خطوات الإنجاز
              </h3>
              {task ? (
                <p className="tw-form-note">
                  يمكن متابعة خطوات الإنجاز وتحديثها من تفاصيل المهمة.
                </p>
              ) : (
                <>
                  <div className="tw-check-input">
                    <input
                      aria-label="خطوة جديدة"
                      value={newCheck}
                      onChange={(e) => setNewCheck(e.target.value)}
                      placeholder="أضف خطوة قابلة للتحقق"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (newCheck.trim()) {
                            setChecks([...checks, newCheck.trim()]);
                            setNewCheck("");
                          }
                        }
                      }}
                    />
                    <button
                      className="tw-button"
                      type="button"
                      onClick={() => {
                        if (newCheck.trim()) {
                          setChecks([...checks, newCheck.trim()]);
                          setNewCheck("");
                        }
                      }}
                      aria-label="إضافة خطوة"
                    >
                      <Plus size={17} />
                    </button>
                  </div>
                  {checks.map((text, index) => (
                    <div className="tw-check-draft" key={index}>
                      <span>
                        {index + 1}. {text}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setChecks(checks.filter((_, i) => i !== index))
                        }
                        aria-label={`إزالة الخطوة ${index + 1}`}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </section>
          </fieldset>
          {error && (
            <p role="alert" className="tw-form-error">
              {error}
            </p>
          )}
          <footer className="tw-form-footer">
            <button
              type="button"
              className="tw-button"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="tw-button tw-primary"
              disabled={pending}
            >
              {pending
                ? "جاري الحفظ…"
                : task
                ? "حفظ التعديلات"
                : "إنشاء المهمة"}
            </button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  );
}
