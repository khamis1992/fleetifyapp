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
  const a = [c.first_name_ar, c.last_name_ar].filter(Boolean).join(" ").trim();
  const e = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
  return {
    id: c.id,
    ar: a,
    en: e,
    company: c.company_name_ar || c.company_name || "",
    qid: c.national_id || "",
    phone: c.phone || "",
    phone2: c.phone2 || c.alternate_phone || "",
  };
}
const customers = await rows("customers", "select=id,first_name_ar,last_name_ar,first_name,last_name,company_name,company_name_ar,national_id,phone");
const contracts = await rows("contracts", "select=id,contract_number,status,license_plate,customer_id,vehicle_id,start_date");
const out = { customers: customers.map(nameOf), contracts };
fs.writeFileSync("C:/Users/khamis/Documents/fleetifyapp/tmp-aug-customers.json", JSON.stringify(out));
console.log("customers", customers.length, "contracts", contracts.length);
