#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Live query: contracts + signed PDFs for review CNs. Never print secrets."""
from __future__ import annotations

import json
import ssl
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ENV_PATH = r"C:\Users\khamis\Documents\fleetifyapp\.env"
CNS_PATH = r"C:\Users\khamis\Documents\fleetifyapp\tmp-review-cns.json"
OUT_PATH = r"C:\Users\khamis\Documents\fleetifyapp\tmp-pdf-match-live.json"
RIYADH = ZoneInfo("Asia/Riyadh")


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


class Sb:
    def __init__(self, url: str, key: str):
        self.base = url.rstrip("/") + "/rest/v1/"
        self.storage = url.rstrip("/") + "/storage/v1/"
        self.url = url.rstrip("/")
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Accept": "application/json",
            "Prefer": "count=exact",
        }
        self.ctx = ssl.create_default_context()

    def get(self, table_and_qs: str, extra_headers=None):
        hdrs = dict(self.headers)
        if extra_headers:
            hdrs.update(extra_headers)
        req = urllib.request.Request(self.base + table_and_qs, headers=hdrs, method="GET")
        try:
            with urllib.request.urlopen(req, context=self.ctx, timeout=90) as resp:
                raw = resp.read().decode("utf-8")
                cr = resp.headers.get("Content-Range")
                return resp.status, json.loads(raw) if raw else [], cr
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")
            return e.code, {"error": True, "status": e.code, "body": body[:2000]}, None

    def get_all(self, table, select, extra_qs="", page=1000):
        rows = []
        start = 0
        while True:
            qs = f"{table}?select={select}"
            if extra_qs:
                qs += "&" + extra_qs
            code, data, cr = self.get(qs, extra_headers={"Range": f"{start}-{start+page-1}"})
            if code not in (200, 206) or not isinstance(data, list):
                return code, data, rows
            rows.extend(data)
            if len(data) < page:
                break
            start += page
        return 200, rows, rows

    def storage_list(self, bucket, prefix="", limit=100):
        url = self.storage + "object/list/" + bucket
        body = json.dumps({"prefix": prefix, "limit": limit}).encode()
        hdrs = dict(self.headers)
        hdrs["Content-Type"] = "application/json"
        req = urllib.request.Request(url, data=body, headers=hdrs, method="POST")
        try:
            with urllib.request.urlopen(req, context=self.ctx, timeout=60) as resp:
                raw = resp.read().decode("utf-8")
                return resp.status, json.loads(raw) if raw else []
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")
            return e.code, {"error": True, "status": e.code, "body": body[:1500]}


def in_filter(values):
    parts = []
    for v in values:
        s = str(v)
        s = s.replace("\\", "\\\\").replace('"', '\\"')
        parts.append('"' + s + '"')
    return "(" + ",".join(parts) + ")"


def chunks(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i : i + n]


def main():
    env = load_env(ENV_PATH)
    url = env.get("VITE_SUPABASE_URL") or env.get("SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SERVICE_ROLE_KEY")
    if not url or not key:
        raise SystemExit("missing supabase env keys")

    cns = json.loads(Path(CNS_PATH).read_text(encoding="utf-8"))
    sb = Sb(url, key)
    now = datetime.now(timezone.utc).astimezone(RIYADH).isoformat()

    probes = {}

    # Probe candidate document tables
    table_probes = [
        ("contract_documents", "id,contract_id,document_type,document_name,file_path,file_size,original_filename,mime_type,notes,created_at"),
        ("contract_files", "id"),
        ("documents", "id"),
        ("files", "id"),
        ("contract_attachments", "id"),
        ("attachments", "id"),
        ("storage_objects", "id"),
    ]
    for t, sel in table_probes:
        code, data, cr = sb.get(f"{t}?select={sel}&limit=1")
        probes[t] = {
            "http": code,
            "ok": code in (200, 206),
            "n_sample": len(data) if isinstance(data, list) else None,
            "cols": list(data[0].keys()) if isinstance(data, list) and data else None,
            "err": data.get("body")[:400] if isinstance(data, dict) and data.get("error") else None,
        }

    # Probe contracts columns related to signed path
    code, data, cr = sb.get("contracts?select=*&limit=1")
    contract_cols = list(data[0].keys()) if isinstance(data, list) and data else []
    signed_ish = [c for c in contract_cols if any(x in c.lower() for x in ("sign", "pdf", "file", "doc", "path", "attach", "storage"))]
    probes["contracts_signedish_cols"] = signed_ish
    probes["contracts_n_cols"] = len(contract_cols)

    # Fetch contracts by number in chunks
    contract_select = (
        "id,contract_number,customer_id,vehicle_id,license_plate,status,sub_status,"
        "start_date,end_date,contract_date,created_at,updated_at,company_id"
    )
    extra_signed_cols = [c for c in signed_ish if c not in contract_select]
    if extra_signed_cols:
        contract_select = contract_select + "," + ",".join(extra_signed_cols)

    contracts = []
    for group in chunks(cns, 40):
        qs = f"contracts?contract_number=in.{in_filter(group)}&select={contract_select}"
        code, data, cr = sb.get(qs)
        probes.setdefault("contracts_by_number", []).append({"http": code, "n": len(data) if isinstance(data, list) else None, "chunk": len(group)})
        if isinstance(data, list):
            contracts.extend(data)
        else:
            probes.setdefault("contracts_errors", []).append(data)

    # de-dupe
    by_id = {}
    for c in contracts:
        by_id[c["id"]] = c
    contracts = list(by_id.values())

    found_numbers = {c.get("contract_number") for c in contracts}
    missing_cns = [cn for cn in cns if cn not in found_numbers]

    # customers
    customer_ids = sorted({c.get("customer_id") for c in contracts if c.get("customer_id")})
    customers = []
    for group in chunks(customer_ids, 50):
        sel = (
            "id,first_name,first_name_ar,last_name,last_name_ar,company_name,company_name_ar,"
            "national_id,qid,phone,phone_number,mobile,email"
        )
        # try full then fallback
        code, data, cr = sb.get(f"customers?id=in.{in_filter(group)}&select={sel}")
        if code not in (200, 206):
            # probe columns
            code2, data2, _ = sb.get("customers?select=*&limit=1")
            probes["customers_probe"] = {
                "http": code,
                "err": data.get("body")[:500] if isinstance(data, dict) else None,
                "cols": list(data2[0].keys()) if isinstance(data2, list) and data2 else None,
            }
            cols = list(data2[0].keys()) if isinstance(data2, list) and data2 else []
            want = [x for x in ["id","first_name","first_name_ar","last_name","last_name_ar","company_name","company_name_ar","national_id","qid","national_id_number","id_number","phone"] if x in cols]
            code, data, cr = sb.get(f"customers?id=in.{in_filter(group)}&select={','.join(want)}")
        if isinstance(data, list):
            customers.extend(data)
        else:
            probes.setdefault("customers_errors", []).append(data)

    # vehicles
    vehicle_ids = sorted({c.get("vehicle_id") for c in contracts if c.get("vehicle_id")})
    vehicles = []
    for group in chunks(vehicle_ids, 50):
        code, data, cr = sb.get(f"vehicles?id=in.{in_filter(group)}&select=id,plate_number,make,model,status")
        if isinstance(data, list):
            vehicles.extend(data)
        else:
            probes.setdefault("vehicles_errors", []).append(data)

    # contract_documents for these contracts
    docs = []
    contract_ids = [c["id"] for c in contracts]
    doc_select_try = [
        "id,contract_id,company_id,document_type,document_name,file_path,file_size,original_filename,mime_type,notes,created_at,updated_at,ai_match_status,uploaded_by",
        "id,contract_id,document_type,document_name,file_path,file_size,original_filename,mime_type,notes,created_at",
        "*",
    ]
    chosen_sel = None
    for sel in doc_select_try:
        if not contract_ids:
            break
        code, data, cr = sb.get(f"contract_documents?contract_id=eq.{contract_ids[0]}&select={sel}&limit=1")
        if code in (200, 206):
            chosen_sel = sel
            probes["contract_documents_select"] = sel if sel != "*" else (list(data[0].keys()) if data else "*")
            break
        probes.setdefault("doc_select_fail", []).append({"sel": sel[:80], "http": code, "err": data.get("body")[:300] if isinstance(data, dict) else None})

    if chosen_sel and contract_ids:
        for group in chunks(contract_ids, 30):
            code, data, cr = sb.get(f"contract_documents?contract_id=in.{in_filter(group)}&select={chosen_sel}")
            if isinstance(data, list):
                docs.extend(data)
            else:
                probes.setdefault("docs_errors", []).append(data)

    # document_type distribution
    from collections import Counter
    type_counts = Counter((d.get("document_type") or "") for d in docs)
    mime_counts = Counter((d.get("mime_type") or "") for d in docs)

    # If contract_files / documents tables exist, query them too
    extra_docs = {}
    for t in ("contract_files", "documents", "contract_attachments", "attachments"):
        if probes.get(t, {}).get("ok"):
            extra_rows = []
            for group in chunks(contract_ids, 30):
                code, data, cr = sb.get(f"{t}?contract_id=in.{in_filter(group)}&select=*")
                if isinstance(data, list):
                    extra_rows.extend(data)
                else:
                    extra_docs[t + "_err"] = data
            extra_docs[t] = extra_rows
            extra_docs[t + "_n"] = len(extra_rows)

    # storage buckets probe (no listing of private objects contents beyond names)
    buckets_code, buckets = sb.storage_list("contract-documents", prefix="", limit=3)
    probes["storage_contract-documents"] = {"http": buckets_code, "n": len(buckets) if isinstance(buckets, list) else None, "err": buckets.get("body")[:200] if isinstance(buckets, dict) else None}

    for b in ("signed-agreements", "contracts", "documents", "files"):
        code, data = sb.storage_list(b, prefix="", limit=1)
        probes[f"storage_{b}"] = {"http": code, "ok": code in (200, 206), "err": data.get("body")[:200] if isinstance(data, dict) else None}

    out = {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "fetched_at_riyadh": now,
        "n_cns_requested": len(cns),
        "n_contracts_found": len(contracts),
        "missing_cns": missing_cns,
        "probes": probes,
        "doc_type_counts": dict(type_counts),
        "mime_counts": dict(mime_counts),
        "n_docs": len(docs),
        "contracts": contracts,
        "customers": customers,
        "vehicles": vehicles,
        "documents": docs,
        "extra_docs": {k: v for k, v in extra_docs.items() if not isinstance(v, list) or True},
    }
    # shrink extra_docs lists if huge
    for k, v in list(out["extra_docs"].items()):
        if isinstance(v, list) and len(v) > 0:
            out["extra_docs"][k] = v  # keep

    Path(OUT_PATH).write_text(json.dumps(out, ensure_ascii=False, default=str), encoding="utf-8")
    print("OK contracts", len(contracts), "docs", len(docs), "missing_cns", len(missing_cns), "customers", len(customers))
    print("doc_types", dict(type_counts))
    print("signedish_cols", signed_ish)
    print("missing", missing_cns[:30])
    print("wrote", OUT_PATH)


if __name__ == "__main__":
    main()
