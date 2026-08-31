# -*- coding: utf-8 -*-
from __future__ import annotations
import json, ssl, urllib.parse, urllib.request, urllib.error
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

ENV_PATH = r"C:\Users\khamis\Documents\fleetifyapp\.env"
OUT_PATH = r"C:\Users\khamis\Documents\fleetifyapp\tmp-who-cancelled-14-followup.json"
RIYADH = ZoneInfo("Asia/Riyadh")
IDS = [
    "3aa3d3c5-f60f-4520-988b-b2f79372d734",
    "c01c6b4b-9223-433e-827c-097ca3cdd985",
    "f0a9947b-2656-465e-8e85-33032dbf80d3",
    "dc6fd3e9-f20d-4f8a-973a-1398bd519595",
    "3beb3058-3ea7-4b1c-91c8-7a71e74f4c65",
    "1adfccad-74b9-4ed0-8eb2-79faea9203c2",
    "662e4640-2b0a-4a21-a05a-b44681f8c1eb",
    "6dbc94e2-b900-4052-aa0a-a2b29a7179a0",
    "9613f5b7-6cee-41de-901e-54b8ee6edb64",
    "f775fada-6251-4f7e-83ec-f8e003459e10",
    "73f1d049-c3a2-4f44-a1ba-6187ee65fd1e",
    "164a3a2b-65a1-471f-884b-b5441baf5c8e",
    "622fce10-727e-49e0-ab45-8d2b305d452e",
    "3a9c492e-70af-414b-b627-a5cc7c67fc71",
]
NUMS = [
    "AGR-202502-0426","LTO2024340","LTO2024230","LTO2024335","LTO202427","LTO2024317","LTO202437",
    "HIST-XLS-T77-7038","HIST-XLS-T77-7054","319","AGR-055405-212","HIST-XLS-T77-7071","LTO2024124","HIST-XLS-B70-893406",
]

def load_env(path):
    env = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env

def to_riyadh(iso):
    if not iso:
        return None
    s = str(iso).strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    dt = datetime.fromisoformat(s)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(RIYADH).strftime("%Y-%m-%d %H:%M:%S") + " Asia/Riyadh (UTC+3)"

class Sb:
    def __init__(self, url, key):
        self.base = url.rstrip("/") + "/rest/v1/"
        self.key = key
        self.ctx = ssl.create_default_context()

    def get(self, qs, extra_headers=None):
        headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Accept": "application/json",
            "Prefer": "count=exact",
            "Range": "0-9999",
        }
        if extra_headers:
            headers.update(extra_headers)
        req = urllib.request.Request(self.base + qs, headers=headers, method="GET")
        try:
            with urllib.request.urlopen(req, context=self.ctx, timeout=90) as resp:
                raw = resp.read().decode("utf-8")
                cr = resp.headers.get("Content-Range")
                return resp.status, json.loads(raw) if raw else [], cr
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")
            try:
                parsed = json.loads(body) if body else {"body": body[:2000]}
            except Exception:
                parsed = {"body": body[:2000]}
            if e.code in (200, 206) and isinstance(parsed, list):
                return e.code, parsed, e.headers.get("Content-Range")
            return e.code, parsed, e.headers.get("Content-Range") if e.headers else None

def main():
    env = load_env(ENV_PATH)
    url = env.get("VITE_SUPABASE_URL") or env.get("SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SERVICE_ROLE_KEY")
    sb = Sb(url, key)
    out = {}

    # 1) ops per contract
    ops_by = {}
    types_by = {}
    for cid in IDS:
        code, data, cr = sb.get(
            f"contract_operations_log?contract_id=eq.{cid}&select=id,operation_type,performed_at,performed_by,notes,operation_details,old_values,new_values&order=performed_at.asc"
        )
        rows = data if isinstance(data, list) else []
        slim = []
        tcount = {}
        for r in rows:
            ot = r.get("operation_type") or "?"
            tcount[ot] = tcount.get(ot, 0) + 1
            interesting = (
                "cancel" in ot.lower()
                or "status" in ot.lower()
                or "الغ" in (r.get("notes") or "")
                or "إلغاء" in (r.get("notes") or "")
                or (isinstance(r.get("new_values"), dict) and str(r["new_values"].get("status","")).lower() in ("cancelled","canceled"))
                or (isinstance(r.get("operation_details"), dict) and "cancel" in json.dumps(r["operation_details"], ensure_ascii=False).lower())
            )
            if interesting:
                det = r.get("operation_details")
                nv = r.get("new_values")
                ov = r.get("old_values")
                slim.append({
                    "operation_type": ot,
                    "performed_at": to_riyadh(r.get("performed_at")),
                    "performed_by": r.get("performed_by"),
                    "notes": r.get("notes"),
                    "details_reason": (det or {}).get("reason") if isinstance(det, dict) else None,
                    "details_keys": list(det.keys()) if isinstance(det, dict) else type(det).__name__,
                    "old_status": (ov or {}).get("status") if isinstance(ov, dict) else None,
                    "new_status": (nv or {}).get("status") if isinstance(nv, dict) else None,
                    "details": det if isinstance(det, dict) else None,
                })
        ops_by[cid] = {"http": code, "content_range": cr, "n": len(rows) if isinstance(data, list) else data, "interesting": slim}
        types_by[cid] = tcount
    out["ops_types"] = types_by
    out["ops_interesting"] = {k: v["interesting"] for k, v in ops_by.items()}
    out["ops_meta"] = {k: {"http": v["http"], "cr": v["content_range"], "n": v["n"]} for k, v in ops_by.items()}

    # 2) cancel-type filter across ids
    id_in = "(" + ",".join(IDS) + ")"
    for filt_name, filt in [
        ("ilike_cancel", f"operation_type=ilike.*cancel*&contract_id=in.{id_in}&select=contract_id,operation_type,performed_at,performed_by,notes,operation_details"),
        ("eq_cancelled", f"operation_type=eq.cancelled&contract_id=in.{id_in}&select=contract_id,operation_type,performed_at,performed_by,notes,operation_details"),
        ("eq_rpc", f"operation_type=eq.contract_cancelled_with_penalty_resolution&contract_id=in.{id_in}&select=contract_id,operation_type,performed_at,performed_by,notes,operation_details"),
    ]:
        code, data, cr = sb.get(filt)
        rows = data if isinstance(data, list) else []
        out[filt_name] = {"http": code, "cr": cr, "n": len(rows) if isinstance(data, list) else data, "rows": [
            {
                "contract_id": r.get("contract_id"),
                "operation_type": r.get("operation_type"),
                "performed_at": to_riyadh(r.get("performed_at")),
                "performed_by": r.get("performed_by"),
                "notes": r.get("notes"),
                "reason": (r.get("operation_details") or {}).get("reason") if isinstance(r.get("operation_details"), dict) else None,
                "details": r.get("operation_details"),
            } for r in rows
        ]}

    # 3) audit logs: all for resource ids, and search action/status
    code, data, cr = sb.get(
        f"audit_logs?resource_id=in.{id_in}&select=id,action,changes_summary,created_at,entity_name,metadata,new_values,notes,old_values,resource_id,resource_type,user_email,user_id,user_name&order=created_at.asc"
    )
    rows = data if isinstance(data, list) else []
    out["audit_all_for_ids"] = {"http": code, "cr": cr, "n": len(rows) if isinstance(data, list) else data, "rows": [
        {
            "resource_id": r.get("resource_id"),
            "entity_name": r.get("entity_name"),
            "action": r.get("action"),
            "created_at": to_riyadh(r.get("created_at")),
            "user_name": r.get("user_name"),
            "user_email": r.get("user_email"),
            "user_id": r.get("user_id"),
            "changes_summary": r.get("changes_summary"),
            "notes": r.get("notes"),
            "metadata": r.get("metadata"),
            "old_values": r.get("old_values"),
            "new_values": r.get("new_values"),
        } for r in rows
    ]}

    # 4) audit logs by contract numbers (or)
    or_parts = ",".join([f"entity_name.eq.{n}" for n in NUMS])
    code, data, cr = sb.get(
        f"audit_logs?or=({or_parts})&select=id,action,changes_summary,created_at,entity_name,metadata,new_values,notes,old_values,resource_id,user_email,user_id,user_name&order=created_at.asc"
    )
    rows = data if isinstance(data, list) else []
    out["audit_by_numbers"] = {"http": code, "cr": cr, "n": len(rows) if isinstance(data, list) else data, "rows": data if not isinstance(data, list) else [
        {
            "entity_name": r.get("entity_name"),
            "action": r.get("action"),
            "created_at": to_riyadh(r.get("created_at")),
            "user_name": r.get("user_name"),
            "user_email": r.get("user_email"),
            "changes_summary": r.get("changes_summary"),
            "metadata": r.get("metadata"),
            "old_values": r.get("old_values"),
            "new_values": r.get("new_values"),
        } for r in rows
    ]}

    # 5) profiles for known user ids
    uids = [
        "e729f598-0aef-4d83-b8ec-ee9290a9986e",
        "05e2b94f-80a4-45ee-927f-60dafe81a1af",
    ]
    code, data, cr = sb.get(
        f"profiles?or=(id.in.{'('+','.join(uids)+')'},user_id.in.{'('+','.join(uids)+')'})&select=id,user_id,email,first_name,first_name_ar,last_name,last_name_ar,role,position,position_ar"
    )
    out["profiles"] = data

    code, data, cr = sb.get(
        f"employees?or=(id.in.{'('+','.join(uids)+')'},user_id.in.{'('+','.join(uids)+')'})&select=id,user_id,email,first_name,first_name_ar,last_name,last_name_ar,position,position_ar,employee_number"
    )
    out["employees"] = data

    # 6) contracts that mention these numbers in suspension_reason (vehicle sequence)
    or_sr = ",".join([f"suspension_reason.ilike.*{n}*" for n in NUMS])
    code, data, cr = sb.get(
        f"contracts?or=({or_sr})&select=id,contract_number,status,suspension_reason,vehicle_id,customer_id,license_plate,start_date,created_via,updated_at"
    )
    rows = data if isinstance(data, list) else []
    out["contracts_mentioning_these_in_reason"] = {"http": code, "cr": cr, "n": len(rows) if isinstance(data, list) else data, "rows": rows if not isinstance(data, list) else [
        {
            "id": r.get("id"),
            "contract_number": r.get("contract_number"),
            "status": r.get("status"),
            "suspension_reason": r.get("suspension_reason"),
            "license_plate": r.get("license_plate"),
            "start_date": r.get("start_date"),
            "created_via": r.get("created_via"),
            "updated_at": to_riyadh(r.get("updated_at")),
        } for r in rows
    ]}

    # 7) bulk updated_at cluster: other contracts with same timestamp
    for ts in [
        "2026-08-29 19:01:32",  # approx
    ]:
        pass
    # query the 14 again for exact updated_at
    code, data, cr = sb.get(
        f"contracts?id=in.{id_in}&select=id,contract_number,status,updated_at,created_at,created_by,created_via,suspension_reason,description,assignment_notes,sub_status"
    )
    out["contracts_times"] = data if not isinstance(data, list) else [
        {
            "id": r["id"],
            "cn": r.get("contract_number"),
            "status": r.get("status"),
            "created_at": to_riyadh(r.get("created_at")),
            "updated_at": to_riyadh(r.get("updated_at")),
            "created_via": r.get("created_via"),
            "created_by": r.get("created_by"),
            "suspension_reason": r.get("suspension_reason"),
            "description": r.get("description"),
            "assignment_notes": r.get("assignment_notes"),
            "sub_status": r.get("sub_status"),
        } for r in data
    ]

    # 8) count contracts with exact same updated_at as the cluster
    # get unique updated_at from the 14 then count
    times = sorted({r.get("updated_at") for r in (data or []) if isinstance(data, list)})
    out["updated_at_cluster_counts"] = {}
    for t in times:
        if not t:
            continue
        code2, data2, cr2 = sb.get(
            f"contracts?updated_at=eq.{urllib.parse.quote(t, safe='')}&select=id,contract_number,status&limit=5"
        )
        # also a count-only via Prefer
        n = None
        if cr2 and "/" in cr2:
            n = cr2.split("/")[-1]
        out["updated_at_cluster_counts"][t] = {"http": code2, "cr": cr2, "n": n, "sample": data2[:5] if isinstance(data2, list) else data2}

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print("wrote followup")
    print("ops_meta", json.dumps(out["ops_meta"], ensure_ascii=False))
    print("eq_cancelled n", out["eq_cancelled"]["n"])
    print("ilike_cancel n", out["ilike_cancel"]["n"])
    print("audit n", out["audit_all_for_ids"]["n"])
    print("profiles n", len(out["profiles"]) if isinstance(out["profiles"], list) else out["profiles"])

if __name__ == "__main__":
    main()
