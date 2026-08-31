import fs from "fs";
const env = Object.fromEntries(
  fs.readFileSync("C:/Users/khamis/Documents/fleetifyapp/.env", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
  })
);
const url = env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const headers = { apikey: key, Authorization: "Bearer " + key };
async function rows(table, qs) {
  const all = [];
  let from = 0;
  const page = 1000;
  while (true) {
    const r = await fetch(url + "/rest/v1/" + table + "?" + qs, {
      headers: { ...headers, Range: from + "-" + (from + page - 1) },
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
const vehicles = await rows("vehicles", "select=id,plate_number,make,model,color,status,notes,is_active");
const contracts = await rows("contracts", "select=id,contract_number,status,start_date,end_date,monthly_amount,license_plate,make,model,customer_id,vehicle_id");
const customers = await rows("customers", "select=id,first_name_ar,last_name_ar,first_name,last_name,company_name,company_name_ar,national_id,phone");
const custBy = Object.fromEntries(customers.map((c) => [c.id, c]));
const out = {
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
      plate: ct.license_plate,
      vehicle_id: ct.vehicle_id,
      customer_id: ct.customer_id,
      customer: nameOf(c),
      phone: c && (c.phone || ""),
      qid: c && (c.national_id || ""),
    };
  }),
};
fs.writeFileSync("C:/Users/khamis/Documents/fleetifyapp/tmp-aug-live.json", JSON.stringify(out));
console.log("vehicles", vehicles.length, "contracts", contracts.length);
