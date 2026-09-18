import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskForm } from "../TaskForm";
import type { Task } from "@/hooks/useTasks";
const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }));
vi.mock("@/hooks/useTasks", () => ({
  useCreateTask: () => ({ mutateAsync: mocks.create, isPending: false }),
  useUpdateTask: () => ({ mutateAsync: mocks.update, isPending: false }),
  useTeamMembers: () => ({ data: [] }),
}));
describe("TaskForm", () => {
  beforeEach(() => {
    mocks.create.mockReset().mockResolvedValue({});
    mocks.update.mockReset().mockResolvedValue({});
  });
  it("clears optional edit fields explicitly and preserves existing checklists", async () => {
    const task = {
      id: "task",
      title: "مهمة تجريبية",
      assigned_to: "user",
      due_date: "2026-09-10T12:00:00Z",
      start_date: "2026-09-09T12:00:00Z",
      priority: "high",
      status: "pending",
    } as Task;
    render(<TaskForm open onOpenChange={() => {}} task={task} />);
    fireEvent.change(screen.getByLabelText("المسؤول"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("تاريخ البدء"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("موعد الاستحقاق"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "حفظ التعديلات" }));
    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "task",
          assigned_to: null,
          due_date: null,
          start_date: null,
        })
      )
    );
    expect(mocks.update.mock.calls[0][0]).not.toHaveProperty("checklists");
  });
  it("includes a typed checklist draft and deduplicates Arabic comma tags", async () => {
    render(<TaskForm open onOpenChange={() => {}} />);
    fireEvent.change(screen.getByLabelText(/عنوان المهمة/), {
      target: { value: "مراجعة العقد" },
    });
    fireEvent.change(screen.getByLabelText("الوسوم"), {
      target: { value: "عقود، عقود, عاجل" },
    });
    fireEvent.change(screen.getByLabelText("خطوة جديدة"), {
      target: { value: "مراجعة المستند" },
    });
    fireEvent.click(screen.getByRole("button", { name: "إنشاء المهمة" }));
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ["عقود", "عاجل"],
          checklists: [{ title: "مراجعة المستند" }],
        })
      )
    );
  });
  it("keeps the form and user input when saving fails", async () => {
    mocks.create.mockRejectedValue(new Error("offline"));
    const close = vi.fn();
    render(<TaskForm open onOpenChange={close} />);
    fireEvent.change(screen.getByLabelText(/عنوان المهمة/), {
      target: { value: "متابعة مهمة" },
    });
    fireEvent.click(screen.getByRole("button", { name: "إنشاء المهمة" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "تعذر حفظ المهمة"
    );
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/عنوان المهمة/)).toHaveValue("متابعة مهمة");
  });
  it("rejects an end date before the start date", () => {
    render(<TaskForm open onOpenChange={() => {}} />);
    fireEvent.change(screen.getByLabelText(/عنوان المهمة/), {
      target: { value: "متابعة مهمة" },
    });
    fireEvent.change(screen.getByLabelText("تاريخ البدء"), {
      target: { value: "2026-09-10T12:00" },
    });
    fireEvent.change(screen.getByLabelText("موعد الاستحقاق"), {
      target: { value: "2026-09-09T12:00" },
    });
    const form = document.querySelector(".tw-task-form form");
    if (!form) throw new Error("Task form missing");
    fireEvent.submit(form);
    expect(screen.getByRole("alert")).toHaveTextContent("بعد تاريخ البدء");
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
