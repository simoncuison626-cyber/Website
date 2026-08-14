/* Travel Portal - browser-side API shim for GitHub Pages.
   Intercepts /api/* fetch calls and runs them against either:
   - Turso's HTTP API (sync across devices), or
   - a local offline database in localStorage (runs fully on the device). */

(function () {
  const CONFIG_KEY = "tp_turso";

  function getConfig() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG_KEY) || "null");
    } catch (_) {
      return null;
    }
  }

  function setConfig(cfg) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  }

  /* ---------- Config modal ---------- */

  let configPromise = null;
  function waitForConfig() {
    if (getConfig()) return Promise.resolve(getConfig());
    if (configPromise) return configPromise;
    configPromise = new Promise((resolve) => {
      const box = document.createElement("div");
      box.style.cssText = "position:fixed;inset:0;background:rgba(10,20,30,.85);z-index:9999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;padding:1rem";
      box.innerHTML = `
        <div style="background:#1e3a5f;border:1px solid #3a7bd5;border-radius:14px;max-width:440px;width:100%;padding:1.5rem;color:#e8f0f7">
          <h2 style="margin:0 0 .5rem;font-size:1.2rem;color:#4dabf7">Choose data mode</h2>
          <p style="margin:0 0 1rem;font-size:.85rem;color:rgba(232,240,247,.7)">
            How should this site store your data?</p>
          <button id="tpOffline" style="width:100%;padding:.7rem;margin-bottom:.6rem;border:none;border-radius:8px;background:#25446a;border:1px solid #3a7bd5;color:#e8f0f7;font-weight:600;cursor:pointer;font-size:.95rem">Offline mode (this device only)</button>
          <button id="tpTurso" style="width:100%;padding:.7rem;border:none;border-radius:8px;background:#4dabf7;color:#0f202d;font-weight:600;cursor:pointer;font-size:.95rem">Sync with Turso (all devices)</button>
          <div id="tpTursoBox" style="display:none;margin-top:1rem">
            <p style="margin:0 0 1rem;font-size:.85rem;color:rgba(232,240,247,.7)">
              Paste your database URL and token (Turso dashboard &gt; your database &gt; Generate token). Saved only in this browser.</p>
            <label style="display:block;font-size:.8rem;margin-bottom:.25rem">Database URL</label>
            <input id="tpUrl" placeholder="https://your-db-your-org.turso.io" style="width:100%;box-sizing:border-box;margin-bottom:.8rem;padding:.6rem;border-radius:8px;border:1px solid #3a7bd5;background:#25446a;color:#e8f0f7;font-size:.9rem">
            <label style="display:block;font-size:.8rem;margin-bottom:.25rem">Auth token</label>
            <input id="tpToken" type="password" placeholder="eyJhbGciOi..." style="width:100%;box-sizing:border-box;margin-bottom:1rem;padding:.6rem;border-radius:8px;border:1px solid #3a7bd5;background:#25446a;color:#e8f0f7;font-size:.9rem">
            <button id="tpSave" style="width:100%;padding:.7rem;border:none;border-radius:8px;background:#4dabf7;color:#0f202d;font-weight:600;cursor:pointer;font-size:.95rem">Save &amp; Connect</button>
            <p id="tpErr" style="color:#ff6b6b;font-size:.8rem;margin:.6rem 0 0;display:none">Please fill in both fields.</p>
          </div>
        </div>`;
      document.body.appendChild(box);
      box.querySelector("#tpOffline").addEventListener("click", () => {
        setConfig({ mode: "local" });
        box.remove();
        resolve(getConfig());
      });
      box.querySelector("#tpTurso").addEventListener("click", () => {
        box.querySelector("#tpTursoBox").style.display = "block";
        box.querySelector("#tpOffline").style.display = "none";
        box.querySelector("#tpTurso").style.display = "none";
      });
      box.querySelector("#tpSave").addEventListener("click", () => {
        const url = box.querySelector("#tpUrl").value.trim().replace(/\/+$/, "");
        const token = box.querySelector("#tpToken").value.trim();
        if (!url || !token) {
          box.querySelector("#tpErr").style.display = "block";
          return;
        }
        setConfig({ mode: "turso", url, token });
        box.remove();
        resolve(getConfig());
      });
    });
    return configPromise;
  }

  /* ---------- Turso transport ---------- */

  async function tursoExec(sql, args = []) {
    const cfg = await waitForConfig();
    if (window.__tp_transport) return window.__tp_transport(sql, args);
    if (cfg.mode === "local") return window.tpLocalDb.execute(sql, args);
    const resp = await window.fetch(`${cfg.url}/v2/pipeline?format=json`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: [{ type: "execute", stmt: { sql, args } }] }),
    });
    if (!resp.ok) throw new Error("Turso connection failed (HTTP " + resp.status + ") - check your database URL and token");
    const data = await resp.json();
    const r = data.results && data.results[0];
    if (!r) throw new Error("Turso: empty response");
    if (r.type === "error") throw new Error((r.error && r.error.message) || "Turso error");
    const result = (r.response && r.response.result) || {};
    const rows = (result.rows || []).map((vals) => {
      const o = {};
      (result.cols || []).forEach((c, i) => { o[c.name] = vals[i]; });
      return o;
    });
    return { rows, lastInsertRowid: result.last_insert_rowid };
  }

  const SCHEMA_STMTS = [
    "CREATE TABLE IF NOT EXISTS passengers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, description TEXT NOT NULL, payer_id INTEGER NOT NULL, payer_name TEXT NOT NULL DEFAULT '', currency TEXT NOT NULL DEFAULT 'PHP', event_id INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS expense_items (id INTEGER PRIMARY KEY AUTOINCREMENT, expense_id INTEGER NOT NULL, person_id INTEGER NOT NULL, person_name TEXT NOT NULL DEFAULT '', amount REAL NOT NULL)",
    "CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS guides (id INTEGER PRIMARY KEY AUTOINCREMENT, country TEXT NOT NULL, city TEXT NOT NULL, place TEXT NOT NULL, food TEXT NOT NULL, price TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP)",
    "INSERT OR IGNORE INTO events (id, name) VALUES (1, 'General')",
  ];
  let schemaReady = null;
  function ensureSchema() {
    if (!schemaReady) {
      schemaReady = (async () => {
        for (const sql of SCHEMA_STMTS) await tursoExec(sql);
      })().catch((e) => { schemaReady = null; throw e; });
    }
    return schemaReady;
  }

  /* ---------- Response shim ---------- */

  function resp(data, status = 200) {
    const body = JSON.stringify(data);
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? "OK" : "Error",
      json: async () => data,
      text: async () => body,
    };
  }

  function errJson(message, status = 500) {
    return resp({ status: "error", message }, status);
  }

  function pickInt(v, def) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : def;
  }

  /* ---------- Handlers (API parity with the old server) ---------- */

  async function addPassenger(body) {
    const name = String(body.name || "").trim();
    if (!name) return errJson("Name is required", 400);
    await tursoExec("INSERT INTO passengers (name) VALUES (?)", [name]);
    return resp({ status: "success", message: "Passenger added" });
  }

  async function getPassengers() {
    const rs = await tursoExec("SELECT id, name FROM passengers ORDER BY name");
    return resp({ passengers: rs.rows.map((r) => [Number(r.id), String(r.name)]) });
  }

  async function deletePassenger(id) {
    await tursoExec("DELETE FROM passengers WHERE id = ?", [id]);
    return resp({ status: "success", message: "Person deleted from database" });
  }

  async function adminLogin(body) {
    if (String(body.password || "") === "admin123") {
      const rs = await tursoExec("SELECT COUNT(*) AS c FROM passengers");
      return resp({ authenticated: true, passenger_count: Number(rs.rows[0].c) });
    }
    return resp({ authenticated: false });
  }

  async function adminPassengers() {
    const rs = await tursoExec("SELECT id, name, 1 AS active FROM passengers ORDER BY id DESC");
    return resp({ passengers: rs.rows.map((r) => [Number(r.id), String(r.name), 1]), count: rs.rows.length });
  }

  async function adminStats() {
    const rs = await tursoExec("SELECT COUNT(*) AS c FROM passengers");
    const cfg = getConfig();
    const database = cfg && cfg.mode === "local" ? "Offline (this device)" : "Turso (libSQL)";
    return resp({ total_passengers: Number(rs.rows[0].c), database });
  }

  async function getExpenses(query) {
    const eventId = pickInt(query.event_id, 1);
    const ex = await tursoExec(
      "SELECT id, description, payer_id, payer_name, currency, COALESCE(created_at, '') AS created_at FROM expenses WHERE event_id = ? ORDER BY id DESC",
      [eventId]
    );
    const expenses = ex.rows.map((r) => ({
      id: Number(r.id),
      description: String(r.description),
      payer_id: Number(r.payer_id),
      payer_name: String(r.payer_name),
      total: 0,
      currency: String(r.currency || "PHP"),
      created_at: String(r.created_at),
      items: [],
    }));
    if (expenses.length > 0) {
      const ids = expenses.map((e) => e.id);
      const placeholders = ids.map(() => "?").join(",");
      const it = await tursoExec(
        `SELECT expense_id, person_id, person_name, amount FROM expense_items WHERE expense_id IN (${placeholders}) ORDER BY id ASC`,
        ids
      );
      const byExpense = new Map();
      for (const row of it.rows) {
        const eid = Number(row.expense_id);
        if (!byExpense.has(eid)) byExpense.set(eid, []);
        byExpense.get(eid).push({
          person_id: Number(row.person_id),
          name: String(row.person_name),
          amount: Number(row.amount),
        });
      }
      for (const e of expenses) {
        e.items = byExpense.get(e.id) || [];
        e.total = e.items.reduce((s, i) => s + i.amount, 0);
      }
    }
    return resp({ expenses });
  }

  async function addExpense(body) {
    const description = String(body.description || "").trim();
    const payerId = pickInt(body.payer_id, 0);
    const items = Array.isArray(body.items) ? body.items : [];
    const currency = String(body.currency || "PHP").trim() || "PHP";
    const eventId = pickInt(body.event_id, 1);
    const datetime = String(body.datetime || "").trim();

    if (!description || payerId <= 0) return errJson("Description and payer are required", 400);
    if (items.length === 0) return errJson("At least one item with an amount is required", 400);
    for (const it of items) {
      if (!Number.isFinite(Number(it.person_id)) || !Number.isFinite(Number(it.amount))) {
        return errJson("Invalid item data (person_id and amount must be numbers)", 400);
      }
    }

    const payerRs = await tursoExec("SELECT COALESCE(name, '') AS n FROM passengers WHERE id = ?", [payerId]);
    const payerName = payerRs.rows.length > 0 ? String(payerRs.rows[0].n) : "";

    const ins = datetime
      ? await tursoExec(
          "INSERT INTO expenses (description, payer_id, payer_name, currency, event_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          [description, payerId, payerName, currency, eventId, datetime]
        )
      : await tursoExec(
          "INSERT INTO expenses (description, payer_id, payer_name, currency, event_id) VALUES (?, ?, ?, ?, ?)",
          [description, payerId, payerName, currency, eventId]
        );

    const expenseId = Number(ins.lastInsertRowid);
    for (const it of items) {
      const pid = Number(it.person_id);
      const pRs = await tursoExec("SELECT COALESCE(name, '') AS n FROM passengers WHERE id = ?", [pid]);
      const pName = pRs.rows.length > 0 ? String(pRs.rows[0].n) : "";
      await tursoExec(
        "INSERT INTO expense_items (expense_id, person_id, person_name, amount) VALUES (?, ?, ?, ?)",
        [expenseId, pid, pName, Number(it.amount)]
      );
    }
    return resp({ status: "success", message: "Expense added" });
  }

  async function deleteExpense(id) {
    await tursoExec("DELETE FROM expense_items WHERE expense_id = ?", [id]);
    await tursoExec("DELETE FROM expenses WHERE id = ?", [id]);
    return resp({ status: "success", message: "Expense deleted" });
  }

  async function getEvents() {
    const rs = await tursoExec(
      `SELECT e.id, e.name, COALESCE(e.created_at, '') AS created_at,
              (SELECT COUNT(*) FROM expenses x WHERE x.event_id = e.id) AS c
       FROM events e ORDER BY e.id ASC`
    );
    return resp({
      events: rs.rows.map((r) => ({
        id: Number(r.id),
        name: String(r.name),
        created_at: String(r.created_at),
        count: Number(r.c),
      })),
    });
  }

  async function addEvent(body) {
    const name = String(body.name || "").trim();
    if (!name) return errJson("Event name is required", 400);
    const rs = await tursoExec("INSERT INTO events (name) VALUES (?)", [name]);
    return resp({ status: "success", message: "Event created", id: Number(rs.lastInsertRowid) });
  }

  async function deleteEvent(id) {
    if (id === 1) return errJson("Cannot delete the General event", 400);
    await tursoExec("UPDATE expenses SET event_id = 1 WHERE event_id = ?", [id]);
    await tursoExec("DELETE FROM events WHERE id = ?", [id]);
    return resp({ status: "success", message: "Event deleted, purchases moved to General" });
  }

  async function getGuides(query) {
    const country = String(query.country || "").trim();
    const rs = country
      ? await tursoExec(
          "SELECT id, country, city, place, food, price, note, COALESCE(created_at, '') AS created_at FROM guides WHERE country = ? ORDER BY id DESC",
          [country]
        )
      : await tursoExec("SELECT id, country, city, place, food, price, note, COALESCE(created_at, '') AS created_at FROM guides ORDER BY id DESC");
    const cs = await tursoExec("SELECT DISTINCT country FROM guides ORDER BY country");
    return resp({
      guides: rs.rows.map((r) => ({
        id: Number(r.id),
        country: String(r.country),
        city: String(r.city),
        place: String(r.place),
        food: String(r.food),
        price: String(r.price),
        note: String(r.note),
        created_at: String(r.created_at),
      })),
      countries: cs.rows.map((r) => String(r.country)),
    });
  }

  async function addGuide(body) {
    const country = String(body.country || "").trim();
    const city = String(body.city || "").trim();
    const place = String(body.place || "").trim();
    const food = String(body.food || "").trim();
    const price = String(body.price || "").trim();
    const note = String(body.note || "").trim();
    if (!country || !city || !place || !food) return errJson("Country, city, place and food are required", 400);
    await tursoExec("INSERT INTO guides (country, city, place, food, price, note) VALUES (?, ?, ?, ?, ?, ?)", [country, city, place, food, price, note]);
    return resp({ status: "success", message: "Guide added" });
  }

  async function deleteGuide(id) {
    await tursoExec("DELETE FROM guides WHERE id = ?", [id]);
    return resp({ status: "success", message: "Guide deleted" });
  }

  /* ---------- Router ---------- */

  async function route(url, init) {
    let path;
    try {
      path = new URL(url, "http://tp.local").pathname;
    } catch (_) {
      path = url;
    }
    const method = ((init && init.method) || "GET").toUpperCase();
    let body = {};
    if (init && init.body) {
      try { body = JSON.parse(init.body); } catch (_) { return errJson("Invalid JSON body", 400); }
    }
    let query = {};
    try { query = Object.fromEntries(new URL(url, "http://tp.local").searchParams); } catch (_) { /* ignore */ }

    path = path.replace(/^\/api/, "").replace(/^\/+/, "");
    const segments = path.split("/").filter(Boolean);
    if (segments.length === 0) return errJson("Not found", 404);

    await ensureSchema();

    if (segments[0] === "passenger" && method === "POST") return await addPassenger(body);
    if (segments[0] === "passengers" && method === "GET") return await getPassengers();
    if (segments[0] === "passengers" && method === "DELETE" && segments[1]) return await deletePassenger(pickInt(segments[1], 0));
    if (segments[0] === "admin" && segments[1] === "login" && method === "POST") return await adminLogin(body);
    if (segments[0] === "admin" && segments[1] === "passengers" && method === "GET") return await adminPassengers();
    if (segments[0] === "admin" && segments[1] === "stats" && method === "GET") return await adminStats();
    if (segments[0] === "expenses" && method === "GET") return await getExpenses(query);
    if (segments[0] === "expenses" && method === "POST") return await addExpense(body);
    if (segments[0] === "expenses" && method === "DELETE" && segments[1]) return await deleteExpense(pickInt(segments[1], 0));
    if (segments[0] === "events" && method === "GET") return await getEvents();
    if (segments[0] === "events" && method === "POST") return await addEvent(body);
    if (segments[0] === "events" && method === "DELETE" && segments[1]) return await deleteEvent(pickInt(segments[1], 0));
    if (segments[0] === "guides" && method === "GET") return await getGuides(query);
    if (segments[0] === "guides" && method === "POST") return await addGuide(body);
    if (segments[0] === "guides" && method === "DELETE" && segments[1]) return await deleteGuide(pickInt(segments[1], 0));

    return errJson("Not found", 404);
  }

  /* ---------- Fetch override ---------- */

  const origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const url = typeof input === "string" ? input : input.url;
    if (url && url.startsWith("/api/")) {
      return route(url, init).catch((e) => errJson(e.message || "Internal error"));
    }
    return origFetch(input, init);
  };

  window.tpResetConfig = function () {
    localStorage.removeItem(CONFIG_KEY);
    location.reload();
  };
})();