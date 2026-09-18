import {
  Bell,
  ClipboardCheck,
  ListTodo,
  ShieldCheck,
  StickyNote,
  Target,
  User,
  WalletCards,
} from "lucide-react";
import type { Task } from "@/hooks/useTasks";

export const taskSections = [
  {
    id: "my-tasks",
    label: "مهامي",
    description: "رتّب يومك وابدأ بالأعمال الأهم.",
    icon: User,
    group: "العمل اليومي",
  },
  {
    id: "all",
    label: "مهام الفريق",
    description: "وزّع المسؤوليات وتابع تقدّم العمل في مكان واحد.",
    icon: ListTodo,
    group: "العمل اليومي",
  },
  {
    id: "verification",
    label: "تدقيق البيانات",
    description: "راجع بيانات العملاء والمستندات المرتبطة بالعقود.",
    icon: ClipboardCheck,
    group: "المراجعة والمتابعة",
  },
  {
    id: "financial-reviews",
    label: "المراجعات المالية",
    description: "راجع الملاحظات المالية من خلال إجراءاتها المعتمدة.",
    icon: WalletCards,
    group: "المراجعة والمتابعة",
  },
  {
    id: "system-audit",
    label: "إنجازات الوكيل",
    description: "تابع نتائج التدقيق الآلي والحالات التي تحتاج إلى قرار.",
    icon: ShieldCheck,
    group: "المراجعة والمتابعة",
  },
  {
    id: "reminders",
    label: "التذكيرات",
    description: "نظّم مواعيد المتابعة والتذكيرات الشخصية.",
    icon: Bell,
    group: "تنظيمي الشخصي",
  },
  {
    id: "goals",
    label: "الأهداف",
    description: "حوّل أهدافك اليومية والأسبوعية إلى تقدّم قابل للقياس.",
    icon: Target,
    group: "تنظيمي الشخصي",
  },
  {
    id: "notes",
    label: "الملاحظات والتواصل",
    description: "احتفظ بملاحظاتك وسجل متابعة الفريق.",
    icon: StickyNote,
    group: "تنظيمي الشخصي",
  },
] as const;
export type TaskSection = (typeof taskSections)[number]["id"];
export function resolveTaskSection(
  value: string | null,
  financialAccess: boolean
): TaskSection {
  if (value === "data-review") return "verification";
  return taskSections.some((section) => section.id === value) &&
    (value !== "financial-reviews" || financialAccess)
    ? (value as TaskSection)
    : "my-tasks";
}
export const taskStatusLabels: Record<Task["status"], string> = {
  pending: "بانتظار التنفيذ",
  in_progress: "قيد التنفيذ",
  on_hold: "متوقفة",
  completed: "مكتملة",
  cancelled: "ملغاة",
};
export const taskPriorityLabels: Record<Task["priority"], string> = {
  urgent: "عاجلة",
  high: "عالية",
  medium: "متوسطة",
  low: "منخفضة",
};
export type TaskView = "list" | "grid" | "kanban";
export type TaskFocus = "all" | "open" | "overdue" | "today" | "completed";
export type TaskSort = "priority" | "due" | "newest";
export const openTask = (task: Task) =>
  !["completed", "cancelled"].includes(task.status);
export function taskIsOverdue(task: Task, now = new Date()) {
  if (!task.due_date || !openTask(task)) return false;
  const due = new Date(task.due_date);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Number.isFinite(due.getTime()) && due < today;
}
export function taskIsToday(task: Task, now = new Date()) {
  return (
    !!task.due_date &&
    openTask(task) &&
    new Date(task.due_date).toDateString() === now.toDateString()
  );
}
export function taskDate(value?: string) {
  const date = value ? new Date(value) : undefined;
  return date && Number.isFinite(date.getTime())
    ? date.toLocaleDateString("ar-QA", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "غير محدد";
}
export function filterTaskList(
  tasks: Task[],
  options: {
    search: string;
    status: string;
    priority: string;
    assignee: string;
    focus: TaskFocus;
    sort: TaskSort;
  },
  now = new Date()
) {
  const rank = { urgent: 0, high: 1, medium: 2, low: 3 };
  const query = options.search.trim().toLocaleLowerCase();
  const result = tasks.filter(
    (task) =>
      (!query ||
        `${task.title} ${task.description || ""} ${(task.tags || []).join(" ")}`
          .toLocaleLowerCase()
          .includes(query)) &&
      (!options.status || task.status === options.status) &&
      (!options.priority || task.priority === options.priority) &&
      (!options.assignee ||
        (options.assignee === "unassigned"
          ? !task.assigned_to
          : task.assigned_to === options.assignee)) &&
      (options.focus === "all" ||
        (options.focus === "open" && openTask(task)) ||
        (options.focus === "overdue" && taskIsOverdue(task, now)) ||
        (options.focus === "today" && taskIsToday(task, now)) ||
        (options.focus === "completed" && task.status === "completed"))
  );
  return result.sort((a, b) =>
    options.sort === "newest"
      ? Date.parse(b.created_at) - Date.parse(a.created_at)
      : options.sort === "due"
      ? (Date.parse(a.due_date || "") || Infinity) -
        (Date.parse(b.due_date || "") || Infinity)
      : rank[a.priority] - rank[b.priority] ||
        Date.parse(b.created_at) - Date.parse(a.created_at)
  );
}
/** Only known application records are linked; never navigate to arbitrary metadata URLs. */
export function taskRelatedRecord(
  task: Task
): { label: string; href: string } | null {
  const meta = task.metadata || {};
  const contract =
    typeof meta.contractId === "string" ? meta.contractId : undefined;
  if (contract)
    return {
      label: "فتح العقد المرتبط",
      href: `/contracts/${encodeURIComponent(contract)}`,
    };
  const records: Record<string, { label: string; path: string }> = {
    contract: { label: "فتح العقد", path: "/contracts" },
    customer: { label: "فتح العميل", path: "/customers" },
    vehicle: { label: "فتح المركبة", path: "/fleet/vehicles" },
  };
  const record =
    typeof meta.entityType === "string" ? records[meta.entityType] : undefined;
  return record && typeof meta.entityId === "string" && meta.entityId
    ? {
        label: record.label,
        href: `${record.path}/${encodeURIComponent(meta.entityId)}`,
      }
    : null;
}
