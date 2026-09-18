import { Link } from "react-router-dom";
import {
  ArrowUpLeft,
  CalendarDays,
  CheckSquare,
  Pencil,
  Trash2,
} from "lucide-react";
import type { Task } from "@/hooks/useTasks";
import { TaskKanbanBoard } from "../TaskKanbanBoard";
import {
  taskDate,
  taskIsOverdue,
  taskPriorityLabels,
  taskRelatedRecord,
  taskStatusLabels,
  type TaskView,
} from "./model";

export function TaskCollection({
  tasks,
  view,
  onOpen,
  onEdit,
  onDelete,
}: {
  tasks: Task[];
  view: TaskView;
  onOpen: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}) {
  if (view === "kanban")
    return (
      <div className="tw-board">
        <TaskKanbanBoard
          tasks={tasks}
          onTaskClick={onOpen}
          onEditTask={onEdit}
          onDeleteTask={onDelete}
        />
      </div>
    );
  const actions = (task: Task) => (
    <div className="tw-row-actions">
      <button
        onClick={() => onEdit(task)}
        aria-label={`تعديل المهمة: ${task.title}`}
        title="تعديل"
      >
        <Pencil size={15} />
      </button>
      <button
        onClick={() => onDelete(task.id)}
        aria-label={`حذف المهمة: ${task.title}`}
        title="حذف"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
  const assignee = (task: Task) =>
    task.assignee
      ? `${task.assignee.first_name_ar || task.assignee.first_name} ${
          task.assignee.last_name_ar || task.assignee.last_name || ""
        }`
      : "غير معيّنة";
  if (view === "list")
    return (
      <div className="tw-table-scroll">
        <table className="tw-table">
          <caption className="sr-only">قائمة المهام</caption>
          <thead>
            <tr>
              <th>المهمة</th>
              <th>الحالة</th>
              <th>الأولوية</th>
              <th>المسؤول</th>
              <th>الاستحقاق</th>
              <th>
                <span className="sr-only">الإجراءات</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>
                  <button
                    className="tw-task-title"
                    onClick={() => onOpen(task)}
                  >
                    {task.title}
                  </button>
                  <div className="tw-task-meta">
                    {task.category || "مهمة عامة"}
                    {task.checklists?.length ? (
                      <span>
                        <CheckSquare size={12} />
                        {
                          task.checklists.filter((item) => item.is_completed)
                            .length
                        }
                        /{task.checklists.length}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td>
                  <span className={`tw-badge status-${task.status}`}>
                    {taskStatusLabels[task.status]}
                  </span>
                </td>
                <td>
                  <span className={`tw-priority priority-${task.priority}`}>
                    <i />
                    {taskPriorityLabels[task.priority]}
                  </span>
                </td>
                <td>{assignee(task)}</td>
                <td className={taskIsOverdue(task) ? "tw-late" : ""}>
                  {taskDate(task.due_date)}
                  {taskIsOverdue(task) && <small>متأخرة</small>}
                </td>
                <td>{actions(task)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  return (
    <div className="tw-card-grid">
      {tasks.map((task) => {
        const related = taskRelatedRecord(task);
        return (
          <article key={task.id} className="tw-task-card">
            <div className="tw-card-top">
              <span className={`tw-badge status-${task.status}`}>
                {taskStatusLabels[task.status]}
              </span>
              {actions(task)}
            </div>
            <button className="tw-task-title" onClick={() => onOpen(task)}>
              {task.title}
            </button>
            <p>{task.description || "لا يوجد وصف إضافي لهذه المهمة."}</p>
            {related && (
              <Link className="tw-record-link" to={related.href}>
                {related.label}
                <ArrowUpLeft size={14} />
              </Link>
            )}
            <div className="tw-card-meta">
              <span className={`tw-priority priority-${task.priority}`}>
                <i />
                {taskPriorityLabels[task.priority]}
              </span>
              <span className={taskIsOverdue(task) ? "tw-late" : ""}>
                <CalendarDays size={13} />
                {taskDate(task.due_date)}
              </span>
            </div>
            <footer>
              <span>{assignee(task)}</span>
              <button onClick={() => onOpen(task)}>
                تفاصيل المهمة
                <ArrowUpLeft size={14} />
              </button>
            </footer>
          </article>
        );
      })}
    </div>
  );
}
