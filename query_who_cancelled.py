# -*- coding: utf-8 -*-
"""Query live Fleetify for who cancelled 14 contracts. Never print secrets."""
from __future__ import annotations

import json
import os
import ssl
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

ENV_PATH = r"C:\Users\khamis\Documents\fleetifyapp\.env"
OUT_PATH = r"C:\Users\khamis\Documents\fleetifyapp\tmp-who-cancelled-14.json"
RIYADH = ZoneInfo("Asia/Riyadh")

TARGETS = [
    {"n": 1, "contract_number": "AGR-202502-0426", "id": "3aa3d3c5-f60f-4520-988b-b2f79372d734", "customer": "محمد ضياء العويني", "plate": "21860"},
    {"n": 2, "contract_number": "LTO2024340", "id": "c01c6b4b-9223-433e-827c-097ca3cdd985", "customer": "عبد العزيز بن نبيل جرفال", "plate": "5890"},
    {"n": 3, "contract_number": "LTO2024230", "id": "f0a9947b-2656-465e-8e85-33032dbf80d3", "customer": "حمدي ثابت خليفة محمد", "plate": "722134"},
    {"n": 4, "contract_number": "LTO2024335", "id": "dc6fd3e9-f20d-4f8a-973a-1398bd519595", "customer": "محمود جاسم الصالح", "plate": "7074"},
    {"n": 5, "contract_number": "LTO202427", "id": "3beb3058-3ea7-4b1c-91c8-7a71e74f4c65", "customer": "أيمن خليفة حمادي", "plate": "5889"},
    {"n": 6, "contract_number": "LTO2024317", "id": "1adfccad-74b9-4ed0-8eb2-79faea9203c2", "customer": "عماد العياري", "plate": "11473"},
    {"n": 7, "contract_number": "LTO202437", "id": "662e4640-2b0a-4a21-a05a-b44681f8c1eb", "customer": "حمزة بادو", "plate": "676281"},
    {"n": 8, "contract_number": "HIST-XLS-T77-7038", "id": "6dbc94e2-b900-4052-aa0a-a2b29a7179a0", "customer": "مهدي محمد القاطري", "plate": "7038"},
    {"n": 9, "contract_number": "HIST-XLS-T77-7054", "id": "9613f5b7-6cee-41de-901e-54b8ee6edb64", "customer": "عمر عبد المولى مبروكي", "plate": "7054"},
    {"n": 10, "contract_number": "319", "id": "f775fada-6251-4f7e-83ec-f8e003459e10", "customer": "محمد فوأد شوشان", "plate": "7058"},
    {"n": 11, "contract_number": "AGR-055405-212", "id": "73f1d049-c3a2-4f44-a1ba-6187ee65fd1e", "customer": "مهند حمودة الظاهر", "plate": "7063"},
    {"n": 12, "contract_number": "HIST-XLS-T77-7071", "id": "164a3a2b-65a1-471f-884b-b5441baf5c8e", "customer": "حمزة زمكيل", "plate": "7071"},
    {"n": 13, "contract_number": "LTO2024124", "id": "622fce10-727e-49e0-ab45-8d2b305d452e", "customer": "أمير عبد الرحمن احمد المهدى بط", "plate": "847099"},
    {"n": 14, "contract_number": "HIST-XLS-B70-893406", "id": "3a9c492e-70af-414b-b627-a5cc7c67fc71", "customer": "محمود جاسم الصالح", "plate": "893406"},
]

LIVE_STATUSES = {
    "active", "draft", "pending", "pending_completion", "suspended",
    "under_legal_procedure", "awaiting_legal", "renewed",
}


def load_env(path: str) -> dict:
    env = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def empty(v):
    if v is None:
        return "فارغ"
    if isinstance(v, str) and not v.strip():
        return "فارغ"
    if isinstance(v, (list, dict)) and len(v) == 0:
        return "فارغ"
    return v


def to_riyadh(iso):
    if not iso:
        return "فارغ"
    s = str(iso).strip()
    if not s:
        return "فارغ"
    try:
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        local = dt.astimezone(RIYADH)
        return f"{local.strftime('%Y-%m-%d %H:%M:%S')} Asia/Riyadh (UTC+3)"
    except Exception:
        return str(iso)


def person_name(row: dict | None) -> str | None:
    if not row:
        return None
    fn = (row.get("first_name_ar") or row.get("first_name") or "").strip()
    ln = (row.get("last_name_ar") or row.get("last_name") or "").strip()
    name = " ".join(x for x in [fn, ln] if x).strip()
    return name or None


class Sb:
    def __init__(self, url: str, key: str):
        self.base = url.rstrip("/") + "/rest/v1/"
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Accept": "application/json",
            "Prefer": "count=exact",
        }
        self.ctx = ssl.create_default_context()

    def get(self, table_and_qs: str):
        req = urllib.request.Request(self.base + table_and_qs, headers=self.headers, method="GET")
        try:
            with urllib.request.urlopen(req, context=self.ctx, timeout=60) as resp:
                raw = resp.read().decode("utf-8")
                status = resp.status
                return status, json.loads(raw) if raw else []
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")
            return e.code, {"error": True, "status": e.code, "body": body[:2000]}

    def get_ok(self, table_and_qs: str):
        code, data = self.get(table_and_qs)
        if code == 200 and isinstance(data, list):
            return data
        return None

    def get_or_err(self, table_and_qs: str):
        code, data = self.get(table_and_qs)
        return code, data


def in_filter(ids):
    return "(" + ",".join(ids) + ")"


def customer_display(c: dict | None) -> str:
    if not c:
        return "فارغ"
    for k in ("first_name_ar", "company_name_ar", "first_name", "company_name"):
        v = (c.get(k) or "").strip()
        if v:
            ln = (c.get("last_name_ar") or c.get("last_name") or "").strip()
            if k.startswith("first") and ln:
                return f"{v} {ln}".strip()
            return v
    return "فارغ"


def main():
    env = load_env(ENV_PATH)
    url = env.get("VITE_SUPABASE_URL") or env.get("SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SERVICE_ROLE_KEY")
    if not url or not key:
        raise SystemExit("missing supabase env keys")

    sb = Sb(url, key)
    ids = [t["id"] for t in TARGETS]
    id_in = in_filter(ids)
    numbers = [t["contract_number"] for t in TARGETS]
    num_in = "(" + ",".join(numbers) + ")"

    extra_tables = {}
    contracts_code, contracts = sb.get_or_err(f"contracts?id=in.{id_in}&select=*")
    extra_tables["contracts_query"] = {"http": contracts_code, "n": len(contracts) if isinstance(contracts, list) else None}

    if not isinstance(contracts, list):
        raise SystemExit(f"contracts query failed: {contracts}")

    by_id = {c["id"]: c for c in contracts}

    # related tables
    related = {}
    probes = [
        ("contract_operations_log", f"contract_operations_log?contract_id=in.{id_in}&select=*&order=performed_at.asc"),
        ("audit_logs_by_resource", f"audit_logs?resource_id=in.{id_in}&select=id,action,changes_summary,created_at,entity_name,metadata,new_values,notes,old_values,resource_id,resource_type,user_email,user_id,user_name,severity,status&order=created_at.asc"),
        ("audit_trail", f"audit_trail?record_id=in.{id_in}&select=*&order=changed_at.asc"),
        ("legal_cases", f"legal_cases?contract_id=in.{id_in}&select=id,case_number,case_status,case_title,case_title_ar,contract_id,created_at,created_by,closure_reason,notes,workflow_stage,updated_at"),
        ("contract_status_history", f"contract_status_history?contract_id=in.{id_in}&select=*"),
        ("contract_activities", f"contract_activities?contract_id=in.{id_in}&select=*"),
        ("activity_logs", f"activity_logs?resource_id=in.{id_in}&select=*"),
        ("ai_activity_logs", f"ai_activity_logs?select=*&limit=1"),
    ]
    # also try audit_logs by contract number in entity_name
    probes.append(
        ("audit_logs_by_entity", f"audit_logs?entity_name=in.{num_in}&select=id,action,changes_summary,created_at,entity_name,metadata,new_values,notes,old_values,resource_id,resource_type,user_email,user_id,user_name,severity,status&order=created_at.asc")
    )

    for name, qs in probes:
        code, data = sb.get_or_err(qs)
        extra_tables[name] = {"http": code, "n": len(data) if isinstance(data, list) else None, "err": data if not isinstance(data, list) else None}
        related[name] = data if isinstance(data, list) else []

    # customers + vehicles
    customer_ids = sorted({c.get("customer_id") for c in contracts if c.get("customer_id")})
    vehicle_ids = sorted({c.get("vehicle_id") for c in contracts if c.get("vehicle_id")})
    plates = sorted({(c.get("license_plate") or "").strip() for c in contracts if (c.get("license_plate") or "").strip()})

    customers = []
    if customer_ids:
        code, data = sb.get_or_err(
            f"customers?id=in.{in_filter(customer_ids)}&select=id,first_name,first_name_ar,last_name,last_name_ar,company_name,company_name_ar"
        )
        extra_tables["customers"] = {"http": code, "n": len(data) if isinstance(data, list) else None}
        customers = data if isinstance(data, list) else []
    customers_by_id = {c["id"]: c for c in customers}

    vehicles = []
    if vehicle_ids:
        code, data = sb.get_or_err(f"vehicles?id=in.{in_filter(vehicle_ids)}&select=id,plate_number,status")
        extra_tables["vehicles"] = {"http": code, "n": len(data) if isinstance(data, list) else None}
        vehicles = data if isinstance(data, list) else []
    vehicles_by_id = {v["id"]: v for v in vehicles}

    # other contracts on same vehicle / customer / plate
    sibling_select = "id,contract_number,status,sub_status,start_date,end_date,created_at,updated_at,created_via,created_by,customer_id,vehicle_id,license_plate,suspension_reason,contract_date"
    other_by_vehicle = []
    other_by_customer = []
    other_by_plate = []
    if vehicle_ids:
        code, data = sb.get_or_err(f"contracts?vehicle_id=in.{in_filter(vehicle_ids)}&select={sibling_select}&order=start_date.asc")
        extra_tables["siblings_vehicle"] = {"http": code, "n": len(data) if isinstance(data, list) else None}
        other_by_vehicle = data if isinstance(data, list) else []
    if customer_ids:
        code, data = sb.get_or_err(f"contracts?customer_id=in.{in_filter(customer_ids)}&select={sibling_select}&order=start_date.asc")
        extra_tables["siblings_customer"] = {"http": code, "n": len(data) if isinstance(data, list) else None}
        other_by_customer = data if isinstance(data, list) else []
    if plates:
        # query plates one-by-one to avoid encoding issues
        for p in plates:
            code, data = sb.get_or_err("contracts?license_plate=eq." + urllib.parse.quote(p, safe="") + f"&select={sibling_select}")
            if isinstance(data, list):
                other_by_plate.extend(data)
        extra_tables["siblings_plate"] = {"http": 200, "n": len(other_by_plate)}

    # collect actor uuids
    actor_ids = set()
    for c in contracts:
        for k in ("cancelled_by", "created_by", "assigned_by_profile_id", "assigned_to_profile_id"):
            if c.get(k):
                actor_ids.add(c[k])
    for row in related.get("contract_operations_log") or []:
        if row.get("performed_by"):
            actor_ids.add(row["performed_by"])
    for key in ("audit_logs_by_resource", "audit_logs_by_entity"):
        for row in related.get(key) or []:
            if row.get("user_id"):
                actor_ids.add(row["user_id"])
    for row in related.get("audit_trail") or []:
        if row.get("user_id"):
            actor_ids.add(row["user_id"])
    for row in related.get("legal_cases") or []:
        if row.get("created_by"):
            actor_ids.add(row["created_by"])
    for row in other_by_vehicle + other_by_customer + other_by_plate:
        if row.get("created_by"):
            actor_ids.add(row["created_by"])

    actor_ids = sorted(a for a in actor_ids if a)
    profiles = []
    employees = []
    if actor_ids:
        code, data = sb.get_or_err(
            f"profiles?or=(id.in.{in_filter(actor_ids)},user_id.in.{in_filter(actor_ids)})&select=id,user_id,email,first_name,first_name_ar,last_name,last_name_ar,role,position,position_ar,is_active"
        )
        extra_tables["profiles"] = {"http": code, "n": len(data) if isinstance(data, list) else None, "err": data if not isinstance(data, list) else None}
        profiles = data if isinstance(data, list) else []
        code, data = sb.get_or_err(
            f"employees?or=(id.in.{in_filter(actor_ids)},user_id.in.{in_filter(actor_ids)})&select=id,user_id,email,first_name,first_name_ar,last_name,last_name_ar,position,position_ar,employee_number,is_active"
        )
        extra_tables["employees"] = {"http": code, "n": len(data) if isinstance(data, list) else None, "err": data if not isinstance(data, list) else None}
        employees = data if isinstance(data, list) else []

    profiles_by_id = {p["id"]: p for p in profiles}
    profiles_by_user = {p["user_id"]: p for p in profiles if p.get("user_id")}
    employees_by_id = {e["id"]: e for e in employees}
    employees_by_user = {e["user_id"]: e for e in employees if e.get("user_id")}

    def resolve_who(uid):
        if not uid:
            return {"who": "غير مسجّل", "who_id": "فارغ", "who_email": "فارغ", "who_source": "فارغ"}
        p = profiles_by_user.get(uid) or profiles_by_id.get(uid)
        e = employees_by_user.get(uid) or employees_by_id.get(uid)
        name = person_name(p) or person_name(e)
        email = None
        if p and p.get("email"):
            email = p["email"]
        elif e and e.get("email"):
            email = e["email"]
        if name:
            who = name
        elif email:
            who = email
        else:
            who = "غير مسجّل"
        source = "فارغ"
        if p:
            source = "profiles"
        elif e:
            source = "employees"
        return {
            "who": who,
            "who_id": uid,
            "who_email": email or "فارغ",
            "who_source": source,
            "who_role": (p or {}).get("role") or (e or {}).get("position_ar") or (e or {}).get("position") or "فارغ",
        }

    # index related by contract id
    def by_cid(rows, field="contract_id"):
        m = {i: [] for i in ids}
        for r in rows or []:
            cid = r.get(field)
            if cid in m:
                m[cid].append(r)
        return m

    ops_by = by_cid(related.get("contract_operations_log"))
    legal_by = by_cid(related.get("legal_cases"))
    hist_by = by_cid(related.get("contract_status_history"))
    act_by = by_cid(related.get("contract_activities"))

    audit_res_by = {i: [] for i in ids}
    for r in related.get("audit_logs_by_resource") or []:
        rid = r.get("resource_id")
        if rid in audit_res_by:
            audit_res_by[rid].append(r)
    audit_ent_by = {n: [] for n in numbers}
    for r in related.get("audit_logs_by_entity") or []:
        en = r.get("entity_name")
        if en in audit_ent_by:
            audit_ent_by[en].append(r)
    trail_by = {i: [] for i in ids}
    for r in related.get("audit_trail") or []:
        rid = r.get("record_id")
        if rid in trail_by:
            trail_by[rid].append(r)

    veh_contracts = {}
    for r in other_by_vehicle:
        veh_contracts.setdefault(r.get("vehicle_id"), []).append(r)
    cust_contracts = {}
    for r in other_by_customer:
        cust_contracts.setdefault(r.get("customer_id"), []).append(r)
    plate_contracts = {}
    for r in other_by_plate:
        plate_contracts.setdefault((r.get("license_plate") or "").strip(), []).append(r)

    def slim_contract(r, exclude_id=None):
        if exclude_id and r.get("id") == exclude_id:
            return None
        return {
            "id": r.get("id"),
            "contract_number": r.get("contract_number"),
            "status": r.get("status"),
            "sub_status": empty(r.get("sub_status")),
            "start_date": r.get("start_date") or "فارغ",
            "end_date": r.get("end_date") or "فارغ",
            "created_at": to_riyadh(r.get("created_at")),
            "updated_at": to_riyadh(r.get("updated_at")),
            "created_via": empty(r.get("created_via")),
            "license_plate": empty(r.get("license_plate")),
            "suspension_reason": empty(r.get("suspension_reason")),
            "is_live": (r.get("status") or "").lower() in LIVE_STATUSES,
        }

    def unique_slims(rows, exclude_id):
        seen = set()
        out = []
        for r in rows or []:
            if r.get("id") == exclude_id or r.get("id") in seen:
                continue
            seen.add(r.get("id"))
            s = slim_contract(r, exclude_id)
            if s:
                out.append(s)
        return out

    results = []
    contract_columns = sorted({k for c in contracts for k in c.keys()}) if contracts else []

    for t in TARGETS:
        cid = t["id"]
        c = by_id.get(cid)
        if not c:
            results.append({
                "n": t["n"],
                "contract_number": t["contract_number"],
                "customer": t["customer"],
                "plate": t["plate"],
                "id": cid,
                "found_live": False,
                "error": "not found in live contracts table",
                "cancelled_at": "فارغ",
                "who": "غير مسجّل",
                "reason_text_from_db": "فارغ",
                "notes": "فارغ",
                "other_live_contracts_same_customer_or_vehicle": [],
            })
            continue

        # extra cancel-ish columns if present live
        extra_cancel_fields = {}
        for k in (
            "cancellation_reason", "cancelled_at", "cancelled_by", "notes",
            "cancel_reason", "canceled_at", "canceled_by", "status_reason",
        ):
            if k in c:
                extra_cancel_fields[k] = c.get(k)

        ops = ops_by.get(cid) or []
        cancel_ops = [
            o for o in ops
            if "cancel" in (o.get("operation_type") or "").lower()
            or "الغ" in (o.get("notes") or "")
            or "إلغاء" in (o.get("notes") or "")
        ]
        audits = (audit_res_by.get(cid) or []) + (audit_ent_by.get(c.get("contract_number") or t["contract_number"]) or [])
        # de-dupe audits by id
        seen_a = set()
        audits_u = []
        for a in audits:
            if a.get("id") in seen_a:
                continue
            seen_a.add(a.get("id"))
            audits_u.append(a)
        cancel_audits = [
            a for a in audits_u
            if "cancel" in ((a.get("action") or "") + (a.get("changes_summary") or "") + str(a.get("new_values") or "")).lower()
            or (isinstance(a.get("new_values"), dict) and str(a["new_values"].get("status") or "").lower() in ("cancelled", "canceled"))
            or (isinstance(a.get("metadata"), dict) and a["metadata"].get("reason"))
        ]
        trails = trail_by.get(cid) or []
        cancel_trails = [
            tr for tr in trails
            if "cancel" in ((tr.get("action") or "") + (tr.get("description") or "")).lower()
            or (isinstance(tr.get("new_values"), dict) and str(tr["new_values"].get("status") or "").lower() in ("cancelled", "canceled"))
        ]

        reason_candidates = []
        if c.get("suspension_reason"):
            reason_candidates.append(("contracts.suspension_reason", c.get("suspension_reason")))
        if extra_cancel_fields.get("cancellation_reason"):
            reason_candidates.append(("contracts.cancellation_reason", extra_cancel_fields["cancellation_reason"]))
        if extra_cancel_fields.get("cancel_reason"):
            reason_candidates.append(("contracts.cancel_reason", extra_cancel_fields["cancel_reason"]))
        for o in cancel_ops:
            det = o.get("operation_details")
            if isinstance(det, dict) and det.get("reason"):
                reason_candidates.append(("contract_operations_log.operation_details.reason", det["reason"]))
            if o.get("notes"):
                reason_candidates.append(("contract_operations_log.notes", o["notes"]))
        for a in cancel_audits:
            md = a.get("metadata")
            if isinstance(md, dict) and md.get("reason"):
                reason_candidates.append(("audit_logs.metadata.reason", md["reason"]))
            if a.get("notes"):
                reason_candidates.append(("audit_logs.notes", a["notes"]))
            if a.get("changes_summary"):
                reason_candidates.append(("audit_logs.changes_summary", a["changes_summary"]))

        reason_text = "فارغ"
        reason_source = "فارغ"
        if reason_candidates:
            reason_source, reason_text = reason_candidates[0]
            if not str(reason_text).strip():
                reason_text = "فارغ"

        # notes
        notes_bits = []
        if extra_cancel_fields.get("notes"):
            notes_bits.append(extra_cancel_fields["notes"])
        if c.get("assignment_notes"):
            notes_bits.append(c.get("assignment_notes"))
        if c.get("description"):
            notes_bits.append(c.get("description"))
        op_notes = [o.get("notes") for o in cancel_ops if o.get("notes")]
        notes_val = "فارغ"
        if notes_bits:
            notes_val = " | ".join(str(x) for x in notes_bits)
        elif op_notes:
            notes_val = " | ".join(str(x) for x in op_notes)

        # who / when
        who_info = {"who": "غير مسجّل", "who_id": "فارغ", "who_email": "فارغ", "who_source": "فارغ", "who_role": "فارغ"}
        cancelled_at = "فارغ"
        cancelled_at_source = "فارغ"

        if extra_cancel_fields.get("cancelled_by") or extra_cancel_fields.get("canceled_by"):
            who_info = resolve_who(extra_cancel_fields.get("cancelled_by") or extra_cancel_fields.get("canceled_by"))
        if extra_cancel_fields.get("cancelled_at") or extra_cancel_fields.get("canceled_at"):
            cancelled_at = to_riyadh(extra_cancel_fields.get("cancelled_at") or extra_cancel_fields.get("canceled_at"))
            cancelled_at_source = "contracts.cancelled_at"

        if cancel_ops:
            last = cancel_ops[-1]
            if who_info["who"] == "غير مسجّل":
                who_info = resolve_who(last.get("performed_by"))
            if cancelled_at == "فارغ":
                cancelled_at = to_riyadh(last.get("performed_at"))
                cancelled_at_source = "contract_operations_log.performed_at"

        # audit user_name/email is direct evidence
        if cancel_audits:
            last = cancel_audits[-1]
            if cancelled_at == "فارغ":
                cancelled_at = to_riyadh(last.get("created_at"))
                cancelled_at_source = "audit_logs.created_at"
            if who_info["who"] == "غير مسجّل":
                if last.get("user_name") or last.get("user_email"):
                    who_info = {
                        "who": last.get("user_name") or last.get("user_email") or "غير مسجّل",
                        "who_id": last.get("user_id") or "فارغ",
                        "who_email": last.get("user_email") or "فارغ",
                        "who_source": "audit_logs",
                        "who_role": "فارغ",
                    }
                else:
                    who_info = resolve_who(last.get("user_id"))

        if cancel_trails:
            last = cancel_trails[-1]
            if cancelled_at == "فارغ":
                cancelled_at = to_riyadh(last.get("changed_at") or last.get("created_at"))
                cancelled_at_source = "audit_trail.changed_at"
            if who_info["who"] == "غير مسجّل":
                if last.get("user_name") or last.get("user_email"):
                    who_info = {
                        "who": last.get("user_name") or last.get("user_email") or "غير مسجّل",
                        "who_id": last.get("user_id") or "فارغ",
                        "who_email": last.get("user_email") or "فارغ",
                        "who_source": "audit_trail",
                        "who_role": "فارغ",
                    }
                else:
                    who_info = resolve_who(last.get("user_id"))

        if cancelled_at == "فارغ":
            cancelled_at = to_riyadh(c.get("updated_at"))
            cancelled_at_source = "contracts.updated_at (not a dedicated cancelled_at column)"

        cust = customers_by_id.get(c.get("customer_id"))
        veh = vehicles_by_id.get(c.get("vehicle_id")) if c.get("vehicle_id") else None
        plate_live = (veh or {}).get("plate_number") or c.get("license_plate") or t["plate"]

        same_vehicle = unique_slims(veh_contracts.get(c.get("vehicle_id")), cid)
        same_customer = unique_slims(cust_contracts.get(c.get("customer_id")), cid)
        same_plate = unique_slims(plate_contracts.get((c.get("license_plate") or "").strip()), cid)

        live_same_vehicle = [x for x in same_vehicle if x["is_live"]]
        live_same_customer = [x for x in same_customer if x["is_live"]]
        live_same_plate = [x for x in same_plate if x["is_live"]]

        live_explaining = []
        seen_live = set()
        for bucket in (live_same_vehicle, live_same_plate, live_same_customer):
            for x in bucket:
                if x["id"] in seen_live:
                    continue
                seen_live.add(x["id"])
                tags = []
                if any(x["id"] == y["id"] for y in live_same_vehicle):
                    tags.append("same_vehicle_id")
                if any(x["id"] == y["id"] for y in live_same_plate):
                    tags.append("same_plate")
                if any(x["id"] == y["id"] for y in live_same_customer):
                    tags.append("same_customer")
                y = dict(x)
                y["match"] = tags
                live_explaining.append(y)

        hist_xls = str(c.get("contract_number") or t["contract_number"]).startswith("HIST-XLS-")
        vehicle_sequence_note = "فارغ"
        if hist_xls:
            later = []
            for x in same_vehicle + same_plate:
                if x["id"] == cid:
                    continue
                later.append(x)
            if live_same_vehicle or live_same_plate:
                reps = live_same_vehicle or live_same_plate
                vehicle_sequence_note = (
                    "HIST-XLS: live replacement exists on same vehicle/plate: "
                    + ", ".join(f"{r['contract_number']} status={r['status']}" for r in reps)
                )
            elif later:
                vehicle_sequence_note = (
                    "HIST-XLS: other contracts exist on same vehicle/plate (none currently live): "
                    + ", ".join(f"{r['contract_number']} status={r['status']}" for r in later)
                )
            else:
                vehicle_sequence_note = "HIST-XLS: no other contract found on same vehicle_id or plate"

        results.append({
            "n": t["n"],
            "contract_number": c.get("contract_number") or t["contract_number"],
            "customer": customer_display(cust) if cust else t["customer"],
            "customer_id": c.get("customer_id") or "فارغ",
            "plate": plate_live or t["plate"],
            "id": cid,
            "found_live": True,
            "status": c.get("status") or "فارغ",
            "sub_status": empty(c.get("sub_status")),
            "created_at": to_riyadh(c.get("created_at")),
            "updated_at": to_riyadh(c.get("updated_at")),
            "created_via": empty(c.get("created_via")),
            "created_by": resolve_who(c.get("created_by")),
            "cancelled_at": cancelled_at,
            "cancelled_at_source": cancelled_at_source,
            "who": who_info["who"],
            "who_id": who_info["who_id"],
            "who_email": who_info["who_email"],
            "who_source": who_info["who_source"],
            "who_role": who_info.get("who_role") or "فارغ",
            "reason_text_from_db": reason_text if str(reason_text).strip() else "فارغ",
            "reason_source": reason_source,
            "notes": notes_val if str(notes_val).strip() else "فارغ",
            "suspension_reason": empty(c.get("suspension_reason")),
            "description": empty(c.get("description")),
            "terms": empty(c.get("terms")),
            "assignment_notes": empty(c.get("assignment_notes")),
            "extra_cancel_columns_present": extra_cancel_fields if extra_cancel_fields else "none_of_cancelled_at/cancelled_by/cancellation_reason/notes",
            "start_date": c.get("start_date") or "فارغ",
            "end_date": c.get("end_date") or "فارغ",
            "contract_date": c.get("contract_date") or "فارغ",
            "vehicle_id": c.get("vehicle_id") or "فارغ",
            "legal_status": empty(c.get("legal_status")),
            "vehicle_sequence_note": vehicle_sequence_note,
            "other_live_contracts_same_customer_or_vehicle": live_explaining if live_explaining else [],
            "other_contracts_same_vehicle": same_vehicle,
            "other_contracts_same_customer": same_customer,
            "operations_log_cancel_rows": [
                {
                    "operation_type": o.get("operation_type"),
                    "performed_at": to_riyadh(o.get("performed_at")),
                    "performed_by": resolve_who(o.get("performed_by")),
                    "notes": empty(o.get("notes")),
                    "operation_details": o.get("operation_details") or "فارغ",
                    "old_values": o.get("old_values") or "فارغ",
                    "new_values": o.get("new_values") or "فارغ",
                }
                for o in cancel_ops
            ] or "فارغ",
            "audit_logs_cancel_rows": [
                {
                    "action": a.get("action"),
                    "created_at": to_riyadh(a.get("created_at")),
                    "user_name": empty(a.get("user_name")),
                    "user_email": empty(a.get("user_email")),
                    "user_id": empty(a.get("user_id")),
                    "changes_summary": empty(a.get("changes_summary")),
                    "notes": empty(a.get("notes")),
                    "metadata": a.get("metadata") or "فارغ",
                    "old_values": a.get("old_values") or "فارغ",
                    "new_values": a.get("new_values") or "فارغ",
                }
                for a in cancel_audits
            ] or "فارغ",
            "audit_trail_cancel_rows": [
                {
                    "action": tr.get("action"),
                    "changed_at": to_riyadh(tr.get("changed_at")),
                    "user_name": empty(tr.get("user_name")),
                    "user_email": empty(tr.get("user_email")),
                    "description": empty(tr.get("description")),
                    "old_values": tr.get("old_values") or "فارغ",
                    "new_values": tr.get("new_values") or "فارغ",
                }
                for tr in cancel_trails
            ] or "فارغ",
            "legal_cases": [
                {
                    "case_number": lc.get("case_number"),
                    "case_status": lc.get("case_status"),
                    "title": lc.get("case_title_ar") or lc.get("case_title"),
                    "created_at": to_riyadh(lc.get("created_at")),
                    "created_by": resolve_who(lc.get("created_by")),
                    "closure_reason": empty(lc.get("closure_reason")),
                    "notes": empty(lc.get("notes")),
                }
                for lc in (legal_by.get(cid) or [])
            ] or "فارغ",
            "status_history": hist_by.get(cid) or "فارغ",
            "contract_activities": act_by.get(cid) or "فارغ",
        })

    # pattern summary from facts only
    hist = [r for r in results if str(r.get("contract_number", "")).startswith("HIST-XLS-")]
    hist_with_live_rep = [r for r in hist if r.get("other_live_contracts_same_customer_or_vehicle")]
    with_reason = [r for r in results if r.get("reason_text_from_db") not in (None, "فارغ")]
    with_who = [r for r in results if r.get("who") not in (None, "غير مسجّل")]
    with_live = [r for r in results if r.get("other_live_contracts_same_customer_or_vehicle")]
    who_counts = {}
    reason_counts = {}
    for r in results:
        who_counts[r.get("who")] = who_counts.get(r.get("who"), 0) + 1
        rs = r.get("reason_text_from_db") or "فارغ"
        reason_counts[rs] = reason_counts.get(rs, 0) + 1

    pattern_lines = [
        f"{len(hist)} HIST-XLS among the 14; {len(hist_with_live_rep)} of those have a live replacement on same vehicle/customer/plate; {len(with_live)} of 14 have any live sibling contract.",
        f"{len(with_who)} of 14 have a resolved canceller name/email; {len(with_reason)} of 14 have non-empty reason text in DB. Who counts: {who_counts}. Distinct reasons: {len(reason_counts)}.",
    ]

    out = {
        "generated_at": to_riyadh(datetime.now(timezone.utc).isoformat()),
        "schema_note": {
            "contracts_typed_columns_relevant": [
                "status", "sub_status", "suspension_reason", "updated_at", "created_at",
                "created_by", "created_via", "description", "terms", "assignment_notes",
                "expired_at", "legal_status", "license_plate",
            ],
            "contracts_typed_has_cancelled_at": False,
            "contracts_typed_has_cancelled_by": False,
            "contracts_typed_has_cancellation_reason": False,
            "contracts_typed_has_notes": False,
            "reason_stored_as": "contracts.suspension_reason (RPC cancel_contract_with_company_traffic_penalties_v1) plus contract_operations_log",
            "live_contract_columns_observed": contract_columns,
        },
        "table_probes": extra_tables,
        "pattern_summary": pattern_lines,
        "contracts": results,
    }

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    # print only non-secret confirmation
    print(f"wrote {OUT_PATH} contracts={len(results)} found={sum(1 for r in results if r.get('found_live'))}")
    print("probes=" + json.dumps({k: v.get("http") for k, v in extra_tables.items()}, ensure_ascii=False))


if __name__ == "__main__":
    main()
