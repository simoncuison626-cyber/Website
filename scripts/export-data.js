import { createClient } from "@libsql/client";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", process.argv[2] || "travel.db");

const db = createClient({ url: `file:${DB_PATH}` });

function q(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  return "'" + String(v).replace(/'/g, "''") + "'";
}

function dumpTable(table, cols, rs) {
  const colList = cols.join(", ");
  const out = [];
  for (const row of rs.rows) {
    out.push(`INSERT INTO ${table} (${colList}) VALUES (${cols.map(c => q(row[c])).join(", ")});`);
  }
  return out.join("\n");
}

const tables = [
  { name: "passengers", cols: ["id", "name"] },
  { name: "events", cols: ["id", "name", "created_at"] },
  { name: "expenses", cols: ["id", "description", "payer_id", "payer_name", "currency", "event_id", "created_at"] },
  { name: "expense_items", cols: ["id", "expense_id", "person_id", "person_name", "amount"] },
  { name: "guides", cols: ["id", "country", "city", "place", "food", "price", "note", "created_at"] },
];

let output = "-- Travel Portal data export\nBEGIN;\n";
let totalRows = 0;
for (const t of tables) {
  const rs = await db.execute(`SELECT * FROM ${t.name}`);
  if (rs.rows.length > 0) {
    totalRows += rs.rows.length;
    output += `\n-- ${t.name} (${rs.rows.length} rows)\n`;
    output += dumpTable(t.name, t.cols, rs) + "\n";
  }
}
output += "COMMIT;\n";
process.stdout.write(output);

import fs from "node:fs";
const outPath = path.join(__dirname, "..", "travel-data.sql");
fs.writeFileSync(outPath, output);
console.error(`\nSaved to travel-data.sql (${totalRows} rows)`);