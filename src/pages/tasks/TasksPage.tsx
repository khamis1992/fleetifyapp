import { lazy, Suspense, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  LayoutGrid,
  List,
  Columns3,
  Plus,
  RefreshCw,
  Search,
  X,
  ArrowLeft,
  ListTodo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  useTasks,
  useTask,
  useDeleteTask,
  useTeamMembers,
  type Task,
} from "@/hooks/useTasks";
import { useFinancialReviewAccess } from "@/hooks/useContractFinancialReviews";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { TaskCollection } from "@/components/tasks/workspace/TaskCollection";
import {
  filterTaskList,
  openTask,
  resolveTaskSection,
  taskIsOverdue,
  taskIsToday,
  taskPriorityLabels,
  taskSections,
  taskStatusLabels,
  type TaskFocus,
  type TaskSort,
  type TaskView,
} from "@/components/tasks/workspace/model";
import "@/components/tasks/workspace/tasks-workspace.css";

const TaskForm = lazy(() =>
  import("@/components/tasks/TaskForm").then((module) => ({
    default: module.TaskForm,
  }))
);
const TaskDetailsSheet = lazy(() =>
  import("@/components/tasks/TaskDetailsSheet").then((module) => ({
    default: module.TaskDetailsSheet,
  }))
);
const PersonalReminders = lazy(() =>
  import("@/components/tasks/PersonalReminders").then((module) => ({
    default: module.PersonalReminders,
  }))
);
const UserGoals = lazy(() =>
  import("@/components/tasks/UserGoals").then((module) => ({
    default: module.UserGoals,
  }))
);
const QuickNotes = lazy(() =>
  import("@/components/tasks/QuickNotes").then((module) => ({
    default: module.QuickNotes,
  }))
);
const TeamCommunicationLog = lazy(() =>
  import("@/components/tasks/TeamCommunicationLog").then((module) => ({
    default: module.TeamCommunicationLog,
  }))
);
const CustomerDataReviewCenter = lazy(() =>
  import("@/components/customers/CustomerDataReviewCenter").then((module) => ({
    default: module.CustomerDataReviewCenter,
  }))
);
const CustomerMergeProposalsPanel = lazy(() =>
  import("@/components/customers/CustomerMergeProposalsPanel").then(
    (module) => ({ default: module.CustomerMergeProposalsPanel })
  )
);
const FinancialReviewTasksPanel = lazy(() =>
  import("@/components/tasks/FinancialReviewTasksPanel").then((module) => ({
    default: module.FinancialReviewTasksPanel,
  }))
);
const SystemAuditAgentDashboard = lazy(() =>
  import("@/components/tasks/SystemAuditAgentDashboard").then((module) => ({
    default: module.SystemAuditAgentDashboard,
  }))
);

export default function TasksPage() {
  const { user } = useAuth();
  const client = useQueryClient();
  const [params, setParams] = useSearchParams();
  const { canReviewFinancialIssues } = useFinancialReviewAccess();
  const { isAdminOrManager } = useRolePermissions();
  const tab = resolveTaskSection(params.get("tab"), canReviewFinancialIssues);
  const section =
    taskSections.find((item) => item.id === tab) || taskSections[0];
  const collection = tab === "all" || tab === "my-tasks";
  const taskQuery = useTasks(
    tab === "my-tasks" ? { assigned_to: user?.profile?.id } : undefined
  );
  const tasks =
    tab === "my-tasks" && !user?.profile?.id ? [] : taskQuery.data || [];
  const { data: team = [] } = useTeamMembers();
  const deleteTask = useDeleteTask();
  const taskId = params.get("task") || undefined;
  const detailQuery = useTask(taskId);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const view: TaskView = ["list", "grid", "kanban"].includes(
    params.get("view") || ""
  )
    ? (params.get("view") as TaskView)
    : "list";
  const focus: TaskFocus = [
    "all",
    "open",
    "today",
    "overdue",
    "completed",
  ].includes(params.get("focus") || "")
    ? (params.get("focus") as TaskFocus)
    : "open";
  const sort: TaskSort = ["priority", "due", "newest"].includes(
    params.get("sort") || ""
  )
    ? (params.get("sort") as TaskSort)
    : "priority";
  const search = params.get("q") || "",
    status = params.get("status") || "",
    priority = params.get("priority") || "",
    assignee = params.get("assignee") || "";
  const filtered = filterTaskList(tasks, {
    search,
    status,
    priority,
    assignee: tab === "all" ? assignee : "",
    focus,
    sort,
  });
  const pages = Math.max(1, Math.ceil(filtered.length / 30));
  const currentPage = Math.min(page, pages);
  const shown =
    view === "kanban"
      ? filtered
      : filtered.slice((currentPage - 1) * 30, currentPage * 30);
  const updateParams = (
    updates: Record<string, string | null>,
    replace = false
  ) => {
    setPage(1);
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        Object.entries(updates).forEach(([key, value]) =>
          value ? next.set(key, value) : next.delete(key)
        );
        return next;
      },
      { replace }
    );
  };
  const clear = () =>
    updateParams({
      q: null,
      status: null,
      priority: null,
      assignee: null,
      focus: "all",
    });
  const open = (task: Task) => updateParams({ task: task.id });
  const edit = (task: Task) => {
    updateParams({ task: null });
    setEditing(task);
    setShowForm(true);
  };
  const create = () => {
    setEditing(null);
    setShowForm(true);
  };
  const refresh = async () => {
    setRefreshing(true);
    try {
      await client.invalidateQueries({
        predicate: (query) => {
          const key = String(query.queryKey[0]);
          return /^(tasks|task$|task-|personal-reminders|today-reminders|user-goals|active-goals|quick-notes|team-communication-log|manager-financial-reviews|verification-financial-review|customer-id-proposals|customer-merge-proposals|pending-id-scan|system-audit|system-agent)/.test(
            key
          );
        },
      });
    } finally {
      setRefreshing(false);
    }
  };
  const summary = [
    {
      label: "مهام مفتوحة",
      value: tasks.filter(openTask).length,
      icon: ListTodo,
      focus: "open",
    },
    {
      label: "تستحق اليوم",
      value: tasks.filter((task) => taskIsToday(task)).length,
      icon: CalendarDays,
      focus: "today",
    },
    {
      label: "متأخرة",
      value: tasks.filter((task) => taskIsOverdue(task)).length,
      icon: Clock3,
      focus: "overdue",
    },
    {
      label: "مكتملة",
      value: tasks.filter((task) => task.status === "completed").length,
      icon: CheckCircle2,
      focus: "completed",
    },
  ];
  return (
    <div className="tasks-workspace" dir="rtl">
      <div className="tw-container">
        <header className="tw-header">
          <div>
            <div className="tw-eyebrow">
              <i />
              العراف لتأجير السيارات <span>/</span> مساحة العمل
            </div>
            <h1>المهام والمتابعة</h1>
            <p>مسؤوليات واضحة، متابعة أسهل، وإنجاز يمكن قياسه.</p>
          </div>
          <div className="tw-header-actions">
            <button
              className="tw-button"
              onClick={refresh}
              disabled={refreshing}
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              تحديث البيانات
            </button>
            <button className="tw-button tw-primary" onClick={create}>
              <Plus size={17} />
              مهمة جديدة
            </button>
          </div>
        </header>
        <div className="tw-layout">
          <nav className="tw-sections" aria-label="أقسام المهام">
            {["العمل اليومي", "المراجعة والمتابعة", "تنظيمي الشخصي"].map(
              (group) => (
                <div key={group}>
                  <h2>{group}</h2>
                  {taskSections
                    .filter(
                      (item) =>
                        item.group === group &&
                        (item.id !== "financial-reviews" ||
                          canReviewFinancialIssues)
                    )
                    .map((item) => (
                      <button
                        key={item.id}
                        className={tab === item.id ? "is-active" : ""}
                        aria-current={tab === item.id ? "page" : undefined}
                        onClick={() =>
                          updateParams({ tab: item.id, task: null })
                        }
                      >
                        <item.icon size={17} />
                        <span>{item.label}</span>
                        {tab === item.id && <ArrowLeft size={13} />}
                      </button>
                    ))}
                </div>
              )
            )}
            <div className="tw-nav-note">
              <CheckCircle2 size={22} />
              <p>ابدأ بما يستحق انتباهك اليوم.</p>
            </div>
          </nav>
          <div className="tw-main">
            <div className="tw-section-heading">
              <div>
                <div className="tw-eyebrow">{section.group}</div>
                <h2>{section.label}</h2>
                <p>{section.description}</p>
              </div>
              <section.icon size={29} />
            </div>
            {collection ? (
              <>
                <div
                  className="tw-summary"
                  aria-label={tab === "all" ? "ملخص مهام الفريق" : "ملخص مهامي"}
                >
                  {summary.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => updateParams({ focus: item.focus })}
                      className={focus === item.focus ? "is-active" : ""}
                    >
                      <span>
                        {item.label}
                        <item.icon size={17} />
                      </span>
                      <strong>
                        {taskQuery.isPending || taskQuery.isError
                          ? "—"
                          : item.value}
                      </strong>
                      <small>
                        {tab === "all" ? "ضمن مهام الفريق" : "المسندة إليّ"}
                      </small>
                    </button>
                  ))}
                </div>
                <div className="tw-work-panel">
                  <div className="tw-toolbar">
                    <label className="tw-search">
                      <Search size={17} />
                      <input
                        aria-label="البحث في المهام"
                        placeholder="ابحث بالعنوان أو الوصف أو الوسم…"
                        value={search}
                        onChange={(event) =>
                          updateParams({ q: event.target.value }, true)
                        }
                      />
                      {search && (
                        <button
                          onClick={() => updateParams({ q: null }, true)}
                          aria-label="مسح البحث"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </label>
                    <div
                      className="tw-view-switch"
                      role="group"
                      aria-label="طريقة عرض المهام"
                    >
                      {(
                        [
                          { id: "list", label: "قائمة", icon: List },
                          { id: "grid", label: "بطاقات", icon: LayoutGrid },
                          {
                            id: "kanban",
                            label: "لوحة الحالات",
                            icon: Columns3,
                          },
                        ] as const
                      ).map((item) => (
                        <button
                          key={item.id}
                          aria-label={item.label}
                          title={item.label}
                          aria-pressed={view === item.id}
                          onClick={() => updateParams({ view: item.id })}
                        >
                          <item.icon size={17} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="tw-filters">
                    <label>
                      الحالة
                      <select
                        value={status}
                        onChange={(e) =>
                          updateParams({ status: e.target.value })
                        }
                      >
                        <option value="">كل الحالات</option>
                        {Object.entries(taskStatusLabels).map(
                          ([value, label]) => (
                            <option value={value} key={value}>
                              {label}
                            </option>
                          )
                        )}
                      </select>
                    </label>
                    <label>
                      الأولوية
                      <select
                        value={priority}
                        onChange={(e) =>
                          updateParams({ priority: e.target.value })
                        }
                      >
                        <option value="">كل الأولويات</option>
                        {Object.entries(taskPriorityLabels).map(
                          ([value, label]) => (
                            <option value={value} key={value}>
                              {label}
                            </option>
                          )
                        )}
                      </select>
                    </label>
                    {tab === "all" && (
                      <label>
                        المسؤول
                        <select
                          value={assignee}
                          onChange={(e) =>
                            updateParams({ assignee: e.target.value })
                          }
                        >
                          <option value="">كل الفريق</option>
                          <option value="unassigned">غير معيّنة</option>
                          {team.map((member) => (
                            <option value={member.id} key={member.id}>
                              {member.first_name_ar || member.first_name}{" "}
                              {member.last_name_ar || member.last_name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label>
                      الترتيب
                      <select
                        value={sort}
                        onChange={(e) => updateParams({ sort: e.target.value })}
                      >
                        <option value="priority">الأولوية أولاً</option>
                        <option value="due">الأقرب استحقاقاً</option>
                        <option value="newest">الأحدث إضافة</option>
                      </select>
                    </label>
                    <button className="tw-reset" onClick={clear}>
                      عرض الكل / مسح التصفية
                    </button>
                  </div>
                  <div className="tw-results">
                    <span>
                      {taskQuery.isPending
                        ? "جاري التحميل…"
                        : `${filtered.length} مهمة`}
                    </span>
                    <div role="group" aria-label="نطاق المهام">
                      {(
                        [
                          { id: "open", label: "المفتوحة" },
                          { id: "today", label: "اليوم" },
                          { id: "overdue", label: "المتأخرة" },
                          { id: "all", label: "الكل" },
                        ] as const
                      ).map((item) => (
                        <button
                          key={item.id}
                          aria-pressed={focus === item.id}
                          onClick={() => updateParams({ focus: item.id })}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {taskQuery.isError ? (
                    <div className="tw-empty" role="alert">
                      <p>تعذر تحميل المهام. حاول تحديث البيانات.</p>
                      <button onClick={refresh} className="tw-button">
                        إعادة المحاولة
                      </button>
                    </div>
                  ) : taskQuery.isPending ? (
                    <div className="tw-empty" role="status">
                      <RefreshCw className="animate-spin" />
                      <p>جاري تحميل المهام…</p>
                    </div>
                  ) : !filtered.length ? (
                    <div className="tw-empty">
                      <CheckCircle2 size={35} />
                      <h3>لا توجد مهام ضمن هذا العرض</h3>
                      <p>غيّر التصفية لعرض بقية المهام، أو أضف مهمة جديدة.</p>
                      <div>
                        <button onClick={clear} className="tw-button">
                          عرض كل المهام
                        </button>
                        <button
                          onClick={create}
                          className="tw-button tw-primary"
                        >
                          إضافة مهمة
                        </button>
                      </div>
                    </div>
                  ) : (
                    <TaskCollection
                      tasks={shown}
                      view={view}
                      onOpen={open}
                      onEdit={edit}
                      onDelete={setDeleting}
                    />
                  )}
                  {view !== "kanban" && filtered.length > 30 && (
                    <div className="tw-pagination">
                      <button
                        className="tw-button"
                        disabled={currentPage === 1}
                        onClick={() => setPage(currentPage - 1)}
                      >
                        السابق
                      </button>
                      <span>
                        صفحة {currentPage} من {pages}
                      </span>
                      <button
                        className="tw-button"
                        disabled={currentPage === pages}
                        onClick={() => setPage(currentPage + 1)}
                      >
                        التالي
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="tw-subpage">
                <Suspense
                  fallback={
                    <div className="tw-empty" role="status">
                      جاري تحميل القسم…
                    </div>
                  }
                >
                  {tab === "verification" && (
                    <>
                      <div
                        className="tw-personal-tools"
                        role="group"
                        aria-label="أقسام تدقيق البيانات"
                      >
                        <button
                          aria-pressed={
                            params.get("review-view") !== "duplicates"
                          }
                          onClick={() => updateParams({ "review-view": null })}
                        >
                          البيانات والمستندات
                        </button>
                        <button
                          aria-pressed={
                            params.get("review-view") === "duplicates"
                          }
                          onClick={() =>
                            updateParams({ "review-view": "duplicates" })
                          }
                        >
                          العملاء المكررون
                        </button>
                      </div>
                      {params.get("review-view") === "duplicates" ? (
                        <CustomerMergeProposalsPanel />
                      ) : (
                        <CustomerDataReviewCenter includeMerge={false} />
                      )}
                    </>
                  )}
                  {tab === "financial-reviews" && canReviewFinancialIssues && (
                    <FinancialReviewTasksPanel />
                  )}
                  {tab === "system-audit" && <SystemAuditAgentDashboard />}
                  {tab === "reminders" && <PersonalReminders />}
                  {tab === "goals" && <UserGoals />}
                  {tab === "notes" && (
                    <>
                      {isAdminOrManager() && (
                        <div
                          className="tw-personal-tools"
                          role="group"
                          aria-label="الملاحظات والتواصل"
                        >
                          <button
                            aria-pressed={params.get("notes-view") !== "team"}
                            onClick={() => updateParams({ "notes-view": null })}
                          >
                            ملاحظاتي الشخصية
                          </button>
                          <button
                            aria-pressed={params.get("notes-view") === "team"}
                            onClick={() =>
                              updateParams({ "notes-view": "team" })
                            }
                          >
                            سجل تواصل الفريق
                          </button>
                        </div>
                      )}
                      {isAdminOrManager() &&
                      params.get("notes-view") === "team" ? (
                        <TeamCommunicationLog />
                      ) : (
                        <QuickNotes />
                      )}
                    </>
                  )}
                </Suspense>
              </div>
            )}
          </div>
        </div>
        <footer className="tw-page-footer">
          <span>Fleetify / مساحة العمل</span>
          <span>المهام والمراجعات مرتبطة ببيانات النظام</span>
        </footer>
        <Suspense
          fallback={
            <div role="status" className="tw-loading-toast">
              جاري تجهيز النموذج…
            </div>
          }
        >
          {showForm && (
            <TaskForm
              open={showForm}
              onOpenChange={setShowForm}
              task={editing}
              onSuccess={() => {
                setEditing(null);
                void refresh();
              }}
            />
          )}
          {taskId && detailQuery.data && (
            <TaskDetailsSheet
              task={detailQuery.data}
              open
              onOpenChange={(value) => !value && updateParams({ task: null })}
              onEdit={edit}
              onDelete={(id) => {
                updateParams({ task: null });
                setDeleting(id);
              }}
            />
          )}
        </Suspense>
        {taskId &&
          (detailQuery.isPending ||
            detailQuery.isError ||
            (!detailQuery.data && !detailQuery.isPending)) && (
            <div
              className="tw-detail-notice"
              role={detailQuery.isPending ? "status" : "alert"}
            >
              <span>
                {detailQuery.isPending
                  ? "جاري تحميل تفاصيل المهمة…"
                  : "تعذر فتح المهمة أو أنها لم تعد متاحة."}
              </span>
              <button
                className="tw-button"
                onClick={() => updateParams({ task: null })}
              >
                إغلاق
              </button>
            </div>
          )}
        <AlertDialog
          open={!!deleting}
          onOpenChange={(value) =>
            !value && !deleteTask.isPending && setDeleting(null)
          }
        >
          <AlertDialogContent dir="rtl" className="tw-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>حذف المهمة؟</AlertDialogTitle>
              <AlertDialogDescription>
                سيتم حذف المهمة نهائياً. لا يمكن التراجع عن هذا الإجراء.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteTask.isPending}>
                إلغاء
              </AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={deleteTask.isPending}
                onClick={async () => {
                  if (!deleting) return;
                  try {
                    await deleteTask.mutateAsync(deleting);
                    setDeleting(null);
                  } catch {
                    /* Mutation reports the error and the confirmation stays open. */
                  }
                }}
              >
                {deleteTask.isPending ? "جاري الحذف…" : "حذف المهمة"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
