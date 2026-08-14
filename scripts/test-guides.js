import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(__dirname, "..", "static");

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

let loadError = null;
try {
  (0, eval)(fs.readFileSync(path.join(PUB, "localdb.js"), "utf8"));
  (0, eval)(fs.readFileSync(path.join(PUB, "api.js"), "utf8"));
  (0, eval)(fs.readFileSync(path.join(PUB, "guides.js"), "utf8"));
} catch (e) {
  loadError = e;
}
check("guides.js loads without crash", !loadError, loadError ? loadError.message : "");
check("itinerary form listener registered", typeof listeners["itinForm:submit"] === "function");
check("window load listener registered", typeof listeners["window:load"] === "function");

const fire = (id, type, target) => {
  const fn = listeners[`${id}:${type}`];
  if (!fn) throw new Error(`no listener ${id}:${type}`);
  return fn({ preventDefault() {}, target: target || el(id) });
};
const tick = () => new Promise((r) => setTimeout(r, 20));

/* --- page load: lists should render --- */
listeners["window:load"]();
await tick();
await tick();
check("guides list renders after load", elements["guidesList"].innerHTML.includes("No food guides yet"), elements["guidesList"].innerHTML);
check("country datalist populated from KB", elements["countryList"].innerHTML.includes("Japan"));

/* --- add a guide via the real form flow --- */
el("gCountry").value = "Japan";
el("gCity").value = "Tokyo";
el("gPlace").value = "Ichiran Ramen";
el("gFood").value = "Tonkotsu Ramen";
el("gPrice").value = "Budget";
el("gNote").value = "Open 24hrs";
const form = el("guideForm");
await fire("guideForm", "submit", form);
check("guide added to DB", JSON.parse(store["tp_local_db_v1"]).guides.length === 1);
check("new guide rendered in list", elements["guidesList"].innerHTML.includes("Ichiran Ramen") && elements["guidesList"].innerHTML.includes("Tonkotsu Ramen"), elements["guidesList"].innerHTML);
check("price label rendered", elements["guidesList"].innerHTML.includes("Budget \u00B7 mura"));

/* --- itinerary generator --- */
el("iCountry").value = "Japan";
el("iCity").value = "Tokyo";
el("iDays").value = "3";
el("iBudget").value = "Budget";
await fire("itinForm", "submit");
check("itinerary shows Day 1", elements["itineraryResult"].innerHTML.includes("Day 1"));
check("itinerary shows Day 3", elements["itineraryResult"].innerHTML.includes("Day 3"));
check("itinerary uses KB attraction", elements["itineraryResult"].innerHTML.includes("Senso-ji"));
check("itinerary includes saved guide as meal", elements["itineraryResult"].innerHTML.includes("Tonkotsu Ramen"), elements["itineraryResult"].innerHTML);
check("itinerary shows best spots section", elements["itineraryResult"].innerHTML.includes("Best places to visit") && elements["itineraryResult"].innerHTML.includes("spot-rank"));
check("itinerary shows transport for Senso-ji", elements["itineraryResult"].innerHTML.includes("JR Yamanote Line to Ueno Station"), elements["itineraryResult"].innerHTML);
check("budget select honored in note", elements["itineraryResult"].innerHTML.includes("P1,200-2,000/day"), elements["itineraryResult"].innerHTML);
el("iCity").value = "Nonexistentville";
await fire("itinForm", "submit");
check("unknown city: generic transport fallback", elements["itineraryResult"].innerHTML.includes("ride-hailing app"), elements["itineraryResult"].innerHTML);
check("unknown city: warning shown", elements["itineraryResult"].innerHTML.includes("itin-warning"));
el("iCity").value = "Tokyo";

/* --- AI itinerary (mocked Gemini API) --- */
const FAKE_AI = {
  overview: "3 days of budget Tokyo fun.",
  daily_budget: "USD 40/day (PHP 2,300)",
  best_spots: [
    { name: "Senso-ji", why: "Iconic temple", transport: "Asakusa Station (Ginza Line), Exit 1", cost: "Free" },
    { name: "teamLab Planets", why: "Art immersion", transport: "Toyosu Station (Yurakamome Line), 10-min walk", cost: "P1,200" }
  ],
  days: [
    { day: 1, theme: "Old Tokyo", places: [{ name: "Senso-ji", time: "Morning", transport: "Ginza Line to Asakusa, Exit 1", cost: "Free" }], meals: [{ meal: "breakfast", place: "7-Eleven onigiri", cost: "P150" }], notes: "Arrive before 8am to avoid crowds." }
  ],
  tips: ["Get an IC card", "Eat at konbini"]
};
let aiPromptSent = null;
const origFetch = global.fetch;
const geminiResp = (ok, body) => Promise.resolve({
  ok,
  status: ok ? 200 : 503,
  json: () => Promise.resolve(body),
  text: () => Promise.resolve(""),
});
global.fetch = (url, opts) => {
  const u = String(url);
  if (u.includes("generativelanguage")) {
    aiPromptSent = JSON.parse(opts.body).contents[0].parts[0].text;
    return geminiResp(true, { candidates: [{ content: { parts: [{ text: JSON.stringify(FAKE_AI) }] } }] });
  }
  return origFetch(url, opts);
};

/* no key configured -> key form appears */
delete store["tp_ai_key"];
check("aiBtn listener registered", typeof listeners["aiBtn:click"] === "function");
await fire("aiBtn", "click");
await tick();
check("no key -> setup form shown", elements["aiResult"].innerHTML.includes("Free AI setup") && elements["aiResult"].innerHTML.includes("aistudio.google.com"), elements["aiResult"].innerHTML);

/* --- save key flow: invalid key shows exact reason --- */
global.fetch = (url, opts) => {
  const u = String(url);
  if (u.includes("generativelanguage")) {
    return geminiResp(false, { error: { message: "API key not valid. Please pass a valid API key." } });
  }
  return origFetch(url, opts);
};
el("aiKeyInput").value = "AIzaBADKEY123";
await listeners["aiKeySave:click"]();
await tick();
check("invalid key -> exact reason shown", elements["aiKeyMsg"].textContent.includes("invalid"), elements["aiKeyMsg"].textContent);

/* valid key: test passes, key gets saved */
global.fetch = (url, opts) => {
  const u = String(url);
  if (u.includes("generativelanguage")) {
    const body = JSON.parse(opts.body);
    if (body.contents[0].parts[0].text.includes("single word OK")) {
      return geminiResp(true, { candidates: [{ content: { parts: [{ text: '"OK"' }] } }] });
    }
    aiPromptSent = body.contents[0].parts[0].text;
    return geminiResp(true, { candidates: [{ content: { parts: [{ text: JSON.stringify(FAKE_AI) }] } }] });
  }
  return origFetch(url, opts);
};
await listeners["aiKeySave:click"]();
await tick();
check("valid key saved", store["tp_ai_key"] === "AIzaBADKEY123", String(store["tp_ai_key"]));
check("success message shown", elements["aiKeyMsg"].textContent.includes("Key works"), elements["aiKeyMsg"].textContent);
await fire("aiBtn", "click");
await tick();
check("AI request sent with city+budget", aiPromptSent && aiPromptSent.includes("Tokyo") && aiPromptSent.includes("Budget"), aiPromptSent ? aiPromptSent.slice(0, 120) : "none");
check("AI request asks for transport directions", aiPromptSent && aiPromptSent.includes("how-to-get-there") && aiPromptSent.includes("best 5 places"), "");
check("AI overview rendered", elements["aiResult"].innerHTML.includes("3 days of budget Tokyo fun"), elements["aiResult"].innerHTML);
check("AI best spots with transport", elements["aiResult"].innerHTML.includes("Asakusa Station (Ginza Line)") && elements["aiResult"].innerHTML.includes("spot-rank"));
check("AI per-day transport rendered", elements["aiResult"].innerHTML.includes("Ginza Line to Asakusa, Exit 1"));
check("AI meals rendered", elements["aiResult"].innerHTML.includes("7-Eleven onigiri"));
check("AI tips rendered", elements["aiResult"].innerHTML.includes("Get an IC card"));
check("AI button re-enabled after done", elements["aiBtn"].disabled === false);

/* --- AI failure fallback --- */
global.fetch = (url, opts) => {
  const u = String(url);
  if (u.includes("generativelanguage")) return geminiResp(false, {});
  return origFetch(url, opts);
};
await fire("aiBtn", "click");
await tick();
check("AI failure shows graceful warning", elements["aiResult"].innerHTML.includes("not available"), elements["aiResult"].innerHTML);
global.fetch = origFetch;
delete store["tp_ai_key"];

/* --- filter flow --- */
el("guideFilter").value = "Japan";
await fire("guideFilter", "input");
check("filter loads guides", elements["guidesList"].innerHTML.includes("Ichiran Ramen"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);