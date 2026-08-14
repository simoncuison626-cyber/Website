import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(__dirname, "..", "public", "static");

const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
global.window = global;
global.location = { reload() {} };
store["tp_turso"] = JSON.stringify({ mode: "local" });

const elements = {};
const listeners = {};
function el(id) {
  if (!elements[id]) {
    elements[id] = {
      id, value: "", innerHTML: "", dataset: {}, style: {}, disabled: false, textContent: "",
      classList: { add() {}, remove() {}, toggle() {} },
      addEventListener(type, fn) { listeners[`${id}:${type}`] = fn; },
      querySelector(sel) { return el(sel.replace(/[^a-zA-Z0-9]/g, "")); },
      querySelectorAll() { return []; },
      reset() { this.value = ""; },
      appendChild() {},
    };
  }
  return elements[id];
}
global.document = {
  getElementById: (id) => el(id),
  querySelectorAll: () => [],
  createElement: () => el("dyn"),
  body: { appendChild() {} },
};
global.window.addEventListener = (type, fn) => { listeners[`window:${type}`] = fn; };

let pass = 0, fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log("  PASS " + name); }
  else { fail++; console.log("  FAIL " + name + (extra ? " -> " + extra : "")); }
};

(0, eval)(fs.readFileSync(path.join(PUB, "localdb.js"), "utf8"));
(0, eval)(fs.readFileSync(path.join(PUB, "api.js"), "utf8"));
const shimFetch = global.fetch;
const tick = () => new Promise((r) => setTimeout(r, 20));

/* live rates mock: 1 HKD = 0.1282 PHP -> 1 HKD = P7.80 */
global.fetch = (url, opts) => {
  const u = String(url);
  if (u.startsWith("/api/")) return shimFetch(u, opts);
  if (u.includes("er-api")) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ result: "success", rates: { PHP: 1, HKD: 0.1282, USD: 0.0178 } }) });
  }
  return shimFetch(u, opts);
};

const api = (path, opts) => shimFetch(path, opts).then((r) => r.json());

/* seed data */
await api("/api/passenger", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "JC" }) });
await api("/api/passenger", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "carmina" }) });
await api("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "HK Trip" }) });
await api("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
  description: "HK Dimsum", payer_id: 1, currency: "HKD", event_id: 2,
  items: [{ person_id: 1, amount: 200 }, { person_id: 2, amount: 300 }],
}) });
await api("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
  description: "Grab", payer_id: 2, currency: "PHP", event_id: 2,
  items: [{ person_id: 1, amount: 100 }],
}) });

/* load split.js */
let loadError = null;
try {
  (0, eval)(fs.readFileSync(path.join(PUB, "split.js"), "utf8"));
} catch (e) {
  loadError = e;
}
check("split.js loads without crash", !loadError, loadError ? loadError.message : "");

await listeners["window:load"]();
await tick();
await tick();
await global.switchEvent(2);
await tick();
check("summary shows HKD paid for JC", elements["summaryBody"].innerHTML.includes("HK$500.00"), elements["summaryBody"].innerHTML);
check("summary shows original-currency cells", elements["summaryBody"].innerHTML.includes("cell-curr"));
check("summary still shows PHP for JC", elements["summaryBody"].innerHTML.includes("HK$500.00") && elements["summaryBody"].innerHTML.includes("\u20B1"));
check("carmina share shows HKD 300", elements["summaryBody"].innerHTML.includes("HK$300.00"), elements["summaryBody"].innerHTML);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);