import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");
const migration = read(
  "supabase/migrations/20260827097000_lock_traffic_mail_synchronization.sql"
);
const foundation = read(
  "supabase/migrations/20260814143000_add_moi_traffic_mail_ingest.sql"
);
const rollback = read(
  "supabase/rollbacks/20260827097000_lock_traffic_mail_synchronization.rollback.sql"
);
const edge = read("supabase/functions/ingest-traffic-mail/index.ts");

describe("traffic mail synchronization lock", () => {
  it("claims one bounded company lease using a service-only RPC", () => {
    expect(migration).toContain("sync_lease_token uuid");
    expect(migration).toContain("sync_lease_expires_at");
    expect(migration).toContain("LEAST(1800, GREATEST(60");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("TO service_role");
  });

  it("releases the exact lease on success or failure", () => {
    expect(edge).toContain('eq("sync_lease_token", syncLease)');
    expect(edge).toContain("sync_lease_token: null");
    expect(edge).toContain("synchronization_already_running");
  });

  it("uses the shared per-agent identity instead of an unrelated secret", () => {
    expect(edge).toContain('authorizeScheduledAgent');
    expect(edge).toContain('"traffic-mail-ingest"');
    expect(edge).not.toContain('Deno.env.get("MOI_MAIL_SECRET")');
    expect(edge).not.toContain("CONTRACT_SCANNER_SECRET");
  });

  it("limits traffic-mail audit data to company managers and administrators", () => {
    expect(foundation).toContain("traffic_mail_state_company_admin_read");
    expect(foundation).toContain("'company_admin'::public.user_role");
    expect(foundation).toContain("'manager'::public.user_role");
    expect(foundation).toContain(
      "company_id = public.get_user_company(auth.uid())"
    );
  });

  it("preserves historical tasks/data on rollback", () => {
    expect(rollback).toContain("DROP FUNCTION");
    expect(rollback).toContain("DROP COLUMN IF EXISTS sync_lease_token");
    expect(rollback).not.toContain("DROP TABLE");
  });
});
