import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, "..", "test-shim.db");
const SHIM = path.join(__dirname, "..", "public", "static", "api.js");
const LOCALDB = path.join(__dirname, "..", "public", "static", "localdb.js");

const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
global.window = global;
global.document = undefined;
global.location = { reload() {} };

let pass = 0, fail = 0;
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log("  PASS " + name); }
  else { fail++; console.log("  FAIL " + name + (extra ? " -> " + extra : "")); }
}

async function api(path, opts) {
  const res = await global.fetch(path, opts);
  return { status: res.status, ok: res.ok, json: await res.json() };
}

async function runBattery(label) {
  console.log(`\n########## ${label} ##########`);
  let r = await api("/api/events");
  check("events has General", r.ok && r.json.events.length === 1 && r.json.events[0].name === "General", JSON.stringify(r.json));

  console.log("== passengers ==");
  for (const n of ["JC", "simon", "carmina"]) {
    r = await api("/api/passenger", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: n }) });
    check("add " + n, r.json.status === "success");
  }
  r = await api("/api/passengers");
  check("list passengers shape", r.ok && r.json.passengers.length === 3 && Array.isArray(r.json.passengers[0]), JSON.stringify(r.json));

  console.log("== events ==");
  r = await api("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Birthday" }) });
  check("create Birthday", r.json.id === 2, JSON.stringify(r.json));
  r = await api("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Hong Kong Trip" }) });
  check("create HK Trip", r.json.id === 3);

  console.log("== expenses ==");
  r = await api("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: "Birthday Cake", payer_id: 1, items: [{ person_id: 1, amount: 300 }, { person_id: 2, amount: 200 }], currency: "PHP", event_id: 2 }) });
  check("add PHP expense", r.json.status === "success", JSON.stringify(r.json));
  r = await api("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: "HK Dimsum", payer_id: 2, items: [{ person_id: 1, amount: 200 }, { person_id: 3, amount: 300 }], datetime: "2026-08-14 21:00:00", currency: "HKD", event_id: 3 }) });
  check("add HKD expense", r.json.status === "success", JSON.stringify(r.json));
  r = await api("/api/expenses?event_id=2");
  check("birthday has 1 expense, total 500, PHP", r.json.expenses.length === 1 && r.json.expenses[0].total === 500 && r.json.expenses[0].currency === "PHP");
  r = await api("/api/expenses?event_id=3");
  check("hk trip total 500, HKD, datetime kept", r.json.expenses.length === 1 && r.json.expenses[0].currency === "HKD" && r.json.expenses[0].created_at === "2026-08-14 21:00:00");
  check("hk trip items named", r.json.expenses[0].items[1].name === "carmina");
  r = await api("/api/expenses?event_id=1");
  check("general empty", r.json.expenses.length === 0);
  r = await api("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: "x", payer_id: 1, items: [], event_id: 1 }) });
  check("empty items -> 400", r.status === 400, r.status + " " + JSON.stringify(r.json));
  r = await api("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: "x", payer_id: 1, items: [{ person_id: 1, amount: 5 }], event_id: "3" }) });
  check("string event_id tolerated", r.json.status === "success");

  console.log("== admin ==");
  r = await api("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: "wrong" }) });
  check("wrong password rejected", r.json.authenticated === false);
  r = await api("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: "admin123" }) });
  check("correct password accepted", r.json.authenticated === true && r.json.passenger_count === 3);
  r = await api("/api/admin/passengers");
  check("admin passengers shape", r.json.count === 3 && r.json.passengers[0][2] === 1);
  r = await api("/api/admin/stats");
  check("stats has database label", r.json.total_passengers === 3 && typeof r.json.database === "string");

  console.log("== guides ==");
  r = await api("/api/guides", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ country: "Japan", city: "Tokyo", place: "Ichiran Ramen", food: "Tonkotsu Ramen", price: "Budget", note: "24hrs" }) });
  check("add guide", r.json.status === "success");
  r = await api("/api/guides?country=Japan");
  check("filter by country", r.json.guides.length === 1 && r.json.countries.includes("Japan"));
  r = await api("/api/guides");
  check("guides without filter", r.json.guides.length === 1);

  console.log("== history snapshot ==");
  r = await api("/api/passengers/3", { method: "DELETE" });
  check("delete carmina", r.json.status === "success");
  r = await api("/api/expenses?event_id=3");
  check("carmina name kept in items", r.json.expenses.some(e => e.items.some(i => i.name === "carmina")));

  console.log("== deletes ==");
  r = await api("/api/expenses/1", { method: "DELETE" });
  check("delete expense", r.json.status === "success");
  r = await api("/api/events/2", { method: "DELETE" });
  check("delete event", r.json.status === "success");
  r = await api("/api/events/1", { method: "DELETE" });
  check("general protected", r.status === 400);
  r = await api("/api/guides/1", { method: "DELETE" });
  check("delete guide", r.json.status === "success");
  r = await api("/api/nothing");
  check("404 unknown route", r.status === 404);
}

/* ---------- Battery 1: Turso-style transport (real libsql on file) ---------- */

const db = createClient({ url: `file:${DB_FILE}` });
for (const t of ["expense_items", "expenses", "events", "guides", "passengers"]) {
  await db.execute(`DROP TABLE IF EXISTS ${t}`);
}
global.__tp_transport = async (sql, args = []) => {
  const rs = await db.execute({ sql, args });
  return { rows: rs.rows, lastInsertRowid: rs.lastInsertRowid };
};
store["tp_turso"] = JSON.stringify({ mode: "turso", url: "https://test.turso.io", token: "test" });

(0, eval)(fs.readFileSync(SHIM, "utf8"));
await runBattery("Battery 1: Turso transport (libsql)");

/* ---------- Battery 2: offline engine (localStorage, no transport) ---------- */

delete global.__tp_transport;
delete global.window.__tp_transport;
for (const k of Object.keys(store)) delete store[k];
store["tp_turso"] = JSON.stringify({ mode: "local" });

(0, eval)(fs.readFileSync(LOCALDB, "utf8"));
(0, eval)(fs.readFileSync(SHIM, "utf8"));
await runBattery("Battery 2: Offline localStorage engine");

console.log("== persistence ==");
const saved = JSON.parse(store["tp_local_db_v1"] || "{}");
check("db persisted to localStorage", saved.passengers && saved.expenses && saved.guides, JSON.stringify(Object.keys(saved)));
check("passengers saved (carmina deleted in battery)", saved.passengers.length === 2);
check("events include General", saved.events.some((e) => e.id === 1 && e.name === "General"));

(0, eval)(fs.readFileSync(LOCALDB, "utf8"));
console.log("== reload from storage ==");
let r = await api("/api/passengers");
check("data survives reload", r.json.passengers.length === 2, JSON.stringify(r.json));
r = await api("/api/expenses?event_id=3");
check("hk trip survives reload", r.json.expenses.some((e) => e.total === 500), JSON.stringify(r.json));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);