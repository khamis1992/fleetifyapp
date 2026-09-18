import { describe, expect, it } from "vitest";
import type { Task } from "@/hooks/useTasks";
import {
  filterTaskList,
  resolveTaskSection,
  taskDate,
  taskIsOverdue,
  taskIsToday,
  taskRelatedRecord,
} from "./model";

export const makeTask = (changes: Partial<Task> = {}): Task => ({
  id: "task-1",
  company_id: "company",
  title: "متابعة العقد",
  created_by: "user",
  status: "pending",
  priority: "medium",
  whatsapp_notification_sent: false,
  reminder_sent: false,
  created_at: "2026-09-01T12:00:00Z",
  updated_at: "2026-09-01T12:00:00Z",
  ...changes,
});
const now = new Date(2026, 8, 6, 12);
const options = {
  search: "",
  status: "",
  priority: "",
  assignee: "",
  focus: "all",
  sort: "priority",
} as const;
describe("task workspace model", () => {
  it("keeps legacy review links and rejects unauthorized or unknown sections", () => {
    expect(resolveTaskSection("data-review", false)).toBe("verification");
    expect(resolveTaskSection("financial-reviews", false)).toBe("my-tasks");
    expect(resolveTaskSection("financial-reviews", true)).toBe(
      "financial-reviews"
    );
    expect(resolveTaskSection("invalid", true)).toBe("my-tasks");
  });
  it("excludes completed and cancelled tasks from overdue counts", () => {
    for (const status of ["completed", "cancelled"] as const)
      expect(
        taskIsOverdue(makeTask({ status, due_date: "2026-09-01" }), now)
      ).toBe(false);
    expect(taskIsOverdue(makeTask({ due_date: "2026-09-01" }), now)).toBe(true);
  });
  it("treats today as due today, handles missing or invalid dates", () => {
    const task = makeTask({ due_date: new Date(2026, 8, 6, 8).toISOString() });
    expect(taskIsOverdue(task, now)).toBe(false);
    expect(taskIsToday(task, now)).toBe(true);
    expect(taskIsOverdue(makeTask({ due_date: "invalid" }), now)).toBe(false);
    expect(taskDate("invalid")).toBe("غير محدد");
  });
  it("searches descriptions and tags with status, priority and assignment together", () => {
    const task = makeTask({
      description: "Renewal follow up",
      tags: ["تجديد"],
      priority: "urgent",
    });
    expect(
      filterTaskList([task], {
        ...options,
        search: "RENEWAL",
        priority: "urgent",
        assignee: "unassigned",
      })
    ).toEqual([task]);
    expect(
      filterTaskList([task], {
        ...options,
        search: "تجديد",
        status: "completed",
      })
    ).toEqual([]);
  });
  it("sorts urgent tasks first without changing the query cache array", () => {
    const tasks = Object.freeze([
      makeTask({ id: "low", priority: "low" }),
      makeTask({ id: "urgent", priority: "urgent" }),
    ]);
    expect(
      filterTaskList(tasks as Task[], options).map((task) => task.id)
    ).toEqual(["urgent", "low"]);
    expect(tasks[0].id).toBe("low");
  });
  it("sorts undated tasks after due dates and filters the open scope", () => {
    const tasks = [
      makeTask({ id: "undated" }),
      makeTask({ id: "due", due_date: "2026-09-10" }),
      makeTask({ id: "cancelled", status: "cancelled" }),
    ];
    expect(
      filterTaskList(tasks, { ...options, sort: "due", focus: "open" }).map(
        (task) => task.id
      )
    ).toEqual(["due", "undated"]);
  });
  it("links only registered record routes, including the fleet details route", () => {
    expect(
      taskRelatedRecord(
        makeTask({ metadata: { entityType: "vehicle", entityId: "abc" } })
      )?.href
    ).toBe("/fleet/vehicles/abc");
    expect(
      taskRelatedRecord(makeTask({ metadata: { contractId: "contract" } }))
        ?.href
    ).toBe("/contracts/contract");
    expect(
      taskRelatedRecord(
        makeTask({ metadata: { entityType: "customer", entityId: "../x" } })
      )?.href
    ).toBe("/customers/..%2Fx");
    expect(
      taskRelatedRecord(
        makeTask({
          metadata: {
            url: "https://example.com",
            entityType: "unknown",
            entityId: "a",
          },
        })
      )
    ).toBeNull();
  });
});
