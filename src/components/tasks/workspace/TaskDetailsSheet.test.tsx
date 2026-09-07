import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { TaskDetailsSheet } from "../TaskDetailsSheet";
import type { Task } from "@/hooks/useTasks";
const mutations = vi.hoisted(() => ({ toggle: vi.fn(), status: vi.fn() }));
vi.mock("@/hooks/useTasks", () => ({
  useTaskComments: () => ({ data: [] }),
  useTaskActivityLog: () => ({ data: [] }),
  useAddTaskComment: () => ({ mutateAsync: vi.fn() }),
  useToggleChecklist: () => ({ mutate: mutations.toggle }),
  useUpdateTaskStatus: () => ({ mutate: mutations.status }),
}));
const task = {
  id: "task",
  title: "متابعة العقد",
  status: "pending",
  priority: "high",
  checklists: Object.freeze([
    {
      id: "second",
      title: "الخطوة الثانية",
      sort_order: 2,
      is_completed: false,
    },
    { id: "first", title: "الخطوة الأولى", sort_order: 1, is_completed: false },
  ]),
  metadata: { contractId: "contract" },
} as unknown as Task;
describe("TaskDetailsSheet", () => {
  it("sorts immutable cached checklists and reflects refreshed task data", () => {
    const props = {
      open: true,
      onOpenChange: vi.fn(),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    };
    const { rerender } = render(
      <MemoryRouter>
        <TaskDetailsSheet {...props} task={task} />
      </MemoryRouter>
    );
    const checks = screen.getAllByRole("checkbox");
    expect(checks[0].closest("label")).toHaveTextContent("الخطوة الأولى");
    expect(task.checklists?.[0].id).toBe("second");
    fireEvent.click(checks[0]);
    expect(mutations.toggle).toHaveBeenCalledWith({
      checklistId: "first",
      isCompleted: true,
    });
    rerender(
      <MemoryRouter>
        <TaskDetailsSheet
          {...props}
          task={{
            ...task,
            checklists: task.checklists?.map((item) => ({
              ...item,
              is_completed: true,
            })),
          }}
        />
      </MemoryRouter>
    );
    expect(screen.getAllByRole("checkbox")[0]).toBeChecked();
    expect(
      screen.getByRole("link", { name: "فتح العقد المرتبط" })
    ).toHaveAttribute("href", "/contracts/contract");
  });
  it("provides an accessible status change outside drag and drop", () => {
    render(
      <MemoryRouter>
        <TaskDetailsSheet
          task={task}
          open
          onOpenChange={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText("حالة المهمة"), {
      target: { value: "completed" },
    });
    expect(mutations.status).toHaveBeenCalledWith({
      taskId: "task",
      status: "completed",
    });
  });
});
