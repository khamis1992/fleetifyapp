import fs from "fs";
const env = Object.fromEntries(
  fs.readFileSync("C:/Users/khamis/Documents/fleetifyapp/.env", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
  })
);
const url = env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("missing supabase env");
const headers = { apikey: key, Authorization: "Bearer " + key };

async function probe(table) {
  const r = await fetch(url + "/rest/v1/" + table + "?select=*&limit=1", { headers });
  const j = await r.json();
  const cols = j && j[0] ? Object.keys(j[0]) : [];
  return { table, status: r.status, cols, n: Array.isArray(j) ? j.length : 0 };
}

async function rows(table, qs) {
  const all = [];
  let from = 0;
  const page = 1000;
  while (true) {
    const r = await fetch(url + "/rest/v1/" + table + "?" + qs, {
      headers: { ...headers, Range: from + "-" + (from + page - 1), Prefer: "count=exact" },
    });
    if (!r.ok) throw new Error(table + " " + r.status + " " + (await r.text()).slice(0, 400));
    const chunk = await r.json();
    all.push(...chunk);
    if (chunk.length < page) break;
    from += page;
  }
  return all;
}

function nameOf(c) {
  if (!c) return "";
  const a = [c.first_name_ar, c.last_name_ar].filter(Boolean).join(" ").trim();
  if (a) return a;
  const e = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
  if (e) return e;
  return c.company_name_ar || c.company_name || "";
}

const probes = {};
for (const t of ["vehicles", "contracts", "customers", "invoices", "traffic_violations", "penalties"]) {
  probes[t] = await probe(t);
}

const pick = (cols, wanted) => wanted.filter((c) => cols.includes(c)).join(",");

const vCols = probes.vehicles.cols;
const cCols = probes.contracts.cols;
const uCols = probes.customers.cols;
const iCols = probes.invoices.cols;
const tCols = probes.traffic_violations.cols;
const pCols = probes.penalties.cols;

const vehicles = await rows(
  "vehicles",
  "select=" + pick(vCols, ["id", "plate_number", "make", "model", "color", "status", "notes", "is_active"])
);
const contracts = await rows(
  "contracts",
  "select=" +
    pick(cCols, [
      "id",
      "contract_number",
      "status",
      "start_date",
      "end_date",
      "monthly_amount",
      "contract_amount",
      "balance_due",
      "total_paid",
      "license_plate",
      "make",
      "model",
      "customer_id",
      "vehicle_id",
    ])
);
const customers = await rows(
  "customers",
  "select=" +
    pick(uCols, [
      "id",
      "first_name_ar",
      "last_name_ar",
      "first_name",
      "last_name",
      "company_name",
      "company_name_ar",
      "national_id",
      "phone",
    ])
);
const invoices = await rows(
  "invoices",
  "select=" +
    pick(iCols, [
      "id",
      "contract_id",
      "customer_id",
      "invoice_number",
      "invoice_type",
      "total_amount",
      "amount",
      "paid_amount",
      "balance_due",
      "remaining_amount",
      "status",
      "payment_status",
      "due_date",
      "invoice_date",
    ])
);
const tvs = tCols.length
  ? await rows(
      "traffic_violations",
      "select=" +
        pick(tCols, [
          "id",
          "contract_id",
          "vehicle_id",
          "customer_id",
          "responsible_customer_id",
          "plate_number",
          "vehicle_plate",
          "fine_amount",
          "amount",
          "total_amount",
          "paid_amount",
          "balance_due",
          "status",
          "payment_status",
          "violation_date",
          "violation_number",
        ])
    )
  : [];
const penalties = pCols.length
  ? await rows(
      "penalties",
      "select=" +
        pick(pCols, [
          "id",
          "contract_id",
          "customer_id",
          "amount",
          "paid_amount",
          "balance_due",
          "payment_status",
          "status",
          "vehicle_plate",
          "vehicle_id",
          "penalty_type",
        ])
    )
  : [];

const custBy = Object.fromEntries(customers.map((c) => [c.id, c]));
const out = {
  fetched_at: new Date().toISOString(),
  probes: Object.fromEntries(Object.entries(probes).map(([k, v]) => [k, { status: v.status, cols: v.cols }])),
  vehicles: vehicles.map((v) => ({
    id: v.id,
    plate: v.plate_number,
    make: v.make,
    model: v.model,
    color: v.color,
    status: v.status,
    notes: v.notes,
    is_active: v.is_active,
  })),
  contracts: contracts.map((ct) => {
    const c = custBy[ct.customer_id];
    return {
      id: ct.id,
      number: ct.contract_number,
      status: ct.status,
      start: ct.start_date,
      end: ct.end_date,
      monthly: ct.monthly_amount,
      contract_amount: ct.contract_amount,
      balance_due: ct.balance_due,
      total_paid: ct.total_paid,
      plate: ct.license_plate,
      make: ct.make,
      model: ct.model,
      vehicle_id: ct.vehicle_id,
      customer_id: ct.customer_id,
      customer: nameOf(c),
      phone: c && (c.phone || ""),
      qid: c && (c.national_id || ""),
    };
  }),
};
fs.writeFileSync("C:/Users/khamis/Documents/fleetifyapp/tmp-aug-live2.json", JSON.stringify(out));
fs.writeFileSync("C:/Users/khamis/Documents/fleetifyapp/tmp-aug-invoices.json", JSON.stringify(invoices));
fs.writeFileSync("C:/Users/khamis/Documents/fleetifyapp/tmp-aug-traffic-violations.json", JSON.stringify(tvs));
fs.writeFileSync("C:/Users/khamis/Documents/fleetifyapp/tmp-aug-penalties.json", JSON.stringify(penalties));
const invTypes = [...new Set(invoices.map((i) => String(i.invoice_type || "") + "/" + String(i.status || "") + "/" + String(i.payment_status || "")))];
const tvSt = [...new Set(tvs.map((t) => String(t.status || "") + "/" + String(t.payment_status || "")))];
const penSt = [...new Set(penalties.map((p) => String(p.status || "") + "/" + String(p.payment_status || "")))];
console.log(
  JSON.stringify({
    vehicles: vehicles.length,
    contracts: contracts.length,
    customers: customers.length,
    invoices: invoices.length,
    traffic_violations: tvs.length,
    penalties: penalties.length,
    invoice_cols: iCols,
    tv_cols: tCols,
    penalty_cols: pCols,
    inv_type_status_sample: invTypes.slice(0, 40),
    tv_status_sample: tvSt.slice(0, 20),
    penalty_status_sample: penSt.slice(0, 20),
  })
);
