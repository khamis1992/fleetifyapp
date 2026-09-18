import fs from "node:fs/promises";

const outputDir = "C:/Users/khamis/Documents/fleetifyapp/outputs/payment-name-contract-unification-20260901";
const snapshot = JSON.parse(await fs.readFile(`${outputDir}/source-snapshot.json`, "utf8"));
const mapping = JSON.parse(await fs.readFile(`${outputDir}/match-mapping.json`, "utf8"));

const byPlate = new Map(mapping.map((row) => [String(row.plate).trim().toUpperCase(), row]));
const parseMonth = (value) => {
  const match = String(value ?? "").trim().match(/^(\d{1,2})-(\d{4})$/);
  if (!match) return null;
  return `${match[2]}-${String(match[1]).padStart(2, "0")}-01`;
};

const allRows = snapshot["الدفعات"].slice(3);
const cashRows = [];
for (let index = 0; index < allRows.length; index += 1) {
  const row = allRows[index];
  if (!["إيجار", "أخرى"].includes(row[6])) continue;
  const map = byPlate.get(String(row[1] ?? "").trim().toUpperCase());
  cashRows.push({
    excel_row: index + 4,
    customer_name: map?.system_name ?? row[0],
    plate: row[1],
    contract_number: map?.contract_number ?? null,
    match_status: map?.match_status ?? "unmatched",
    payment_month: parseMonth(row[4]),
    amount: Number(row[5] ?? 0),
    excel_type: row[6],
    note: row[7] ?? null,
    source_file: row[9] ?? null,
    source_row: row[10] ?? null,
  });
}

const aggregateMap = new Map();
for (const row of cashRows) {
  const key = [row.contract_number ?? "", row.payment_month ?? "", row.amount].join("|");
  const current = aggregateMap.get(key) ?? {
    contract_number: row.contract_number,
    payment_month: row.payment_month,
    amount: row.amount,
    excel_count: 0,
    excel_rows: [],
  };
  current.excel_count += 1;
  current.excel_rows.push(row.excel_row);
  aggregateMap.set(key, current);
}

const contractNumbers = [...new Set(mapping.map((row) => row.contract_number).filter(Boolean))];
const sqlArray = `ARRAY[${contractNumbers.map((value) => `'${value.replaceAll("'", "''")}'`).join(",")} ]::text[]`;

await Promise.all([
  fs.writeFile(`${outputDir}/excel-cash-rows.json`, JSON.stringify(cashRows, null, 2), "utf8"),
  fs.writeFile(`${outputDir}/excel-cash-aggregate.json`, JSON.stringify([...aggregateMap.values()], null, 2), "utf8"),
  fs.writeFile(`${outputDir}/contract-array.txt`, sqlArray, "utf8"),
]);

const stats = {
  cash_rows: cashRows.length,
  cash_amount: cashRows.reduce((sum, row) => sum + row.amount, 0),
  rows_with_contract: cashRows.filter((row) => row.contract_number).length,
  rows_without_contract: cashRows.filter((row) => !row.contract_number).length,
  distinct_keys: aggregateMap.size,
  distinct_contracts: contractNumbers.length,
};
console.log(JSON.stringify(stats, null, 2));
