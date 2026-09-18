import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const config = read("supabase/config.toml");
const releaseMigration = read(
  "supabase/migrations/20260712055500_switch_system_agent_to_v14.sql"
);

describe("system audit release routing", () => {
  it("maps the active release slugs to the canonical source files", () => {
    expect(config).toMatch(
      /\[functions\.system-audit-orchestrator-v14\][\s\S]*?entrypoint = "\.\/functions\/system-audit-orchestrator\/index\.ts"/
    );
    expect(config).toMatch(
      /\[functions\.system-audit-worker-v12\][\s\S]*?entrypoint = "\.\/functions\/system-audit-worker\/index\.ts"/
    );
  });

  it("routes both scheduled orchestrator functions to release v14", () => {
    expect(
      releaseMigration.match(/system-audit-orchestrator-v14/g)?.length || 0
    ).toBeGreaterThanOrEqual(2);
    expect(releaseMigration).toContain(
      "create or replace function public.invoke_system_audit_orchestrator_v3()"
    );
    expect(releaseMigration).toContain(
      "create or replace function public.invoke_system_audit_orchestrator_resume_v1()"
    );
  });
});
