const DB_URL = process.env.TURSO_DATABASE_URL || "";
const DB_TOKEN = process.env.TURSO_AUTH_TOKEN || "";

let _client = null;

async function client() {
  if (_client) return _client;
  if (!DB_URL) {
    throw new Error("TURSO_DATABASE_URL is not set. Add it as a Netlify environment variable (https://<db>-<org>.turso.io).");
  }
  if (DB_URL.startsWith("https://") && !DB_TOKEN) {
    throw new Error("TURSO_AUTH_TOKEN is not set. Add it as a Netlify environment variable (find it in turso db show <name>).");
  }
  const { createClient } = await import("@libsql/client");
  _client = createClient({
    url: DB_URL,
    ...(DB_TOKEN ? { authToken: DB_TOKEN } : {}),
  });
  return _client;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS passengers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    payer_id INTEGER NOT NULL,
    payer_name TEXT NOT NULL DEFAULT '',
    currency TEXT NOT NULL DEFAULT 'PHP',
    event_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS expense_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_id INTEGER NOT NULL,
    person_id INTEGER NOT NULL,
    person_name TEXT NOT NULL DEFAULT '',
    amount REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS guides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    country TEXT NOT NULL,
    city TEXT NOT NULL,
    place TEXT NOT NULL,
    food TEXT NOT NULL,
    price TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO events (id, name) VALUES (1, 'General');
`;

async function ensureSchema(db) {
  await db.executeMultiple(SCHEMA);
}

function json(body, status = 200) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  };
}

function errJson(message, status = 500) {
  return json({ status: "error", message }, status);
}

function pickInt(v, def) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : def;
}

/* ---------- Handlers ---------- */

async function addPassenger(db, body) {
  const name = String(body.name || "").trim();
  if (!name) return errJson("Name is required", 400);
  await db.execute({ sql: "INSERT INTO passengers (name) VALUES (?)", args: [name] });
  return json({ status: "success", message: "Passenger added" });
}

async function getPassengers(db) {
  const rs = await db.execute("SELECT id, name FROM passengers ORDER BY name");
  return json({ passengers: rs.rows.map(r => [Number(r.id), String(r.name)]) });
}

async function deletePassenger(db, id) {
  await db.execute({ sql: "DELETE FROM passengers WHERE id = ?", args: [id] });
  return json({ status: "success", message: "Person deleted from database" });
}

async function adminLogin(db, body) {
  if (String(body.password || "") === "admin123") {
    const rs = await db.execute("SELECT COUNT(*) AS c FROM passengers");
    return json({ authenticated: true, passenger_count: Number(rs.rows[0].c) });
  }
  return json({ authenticated: false });
}

async function adminPassengers(db) {
  const rs = await db.execute("SELECT id, name, 1 AS active FROM passengers ORDER BY id DESC");
  return json({ passengers: rs.rows.map(r => [Number(r.id), String(r.name), 1]), count: rs.rows.length });
}

async function adminStats(db) {
  const rs = await db.execute("SELECT COUNT(*) AS c FROM passengers");
  return json({ total_passengers: Number(rs.rows[0].c), database: "Turso (libSQL)" });
}

async function getExpenses(db, query) {
  const eventId = pickInt(query.event_id, 1);
  const ex = await db.execute({
    sql: `SELECT id, description, payer_id, payer_name, currency, COALESCE(created_at, '') AS created_at
          FROM expenses WHERE event_id = ? ORDER BY id DESC`,
    args: [eventId],
  });
  const expenses = ex.rows.map(r => ({
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
    const ids = expenses.map(e => e.id);
    const placeholders = ids.map(() => "?").join(",");
    const it = await db.execute({
      sql: `SELECT expense_id, person_id, person_name, amount
            FROM expense_items WHERE expense_id IN (${placeholders}) ORDER BY id ASC`,
      args: ids,
    });
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

  return json({ expenses });
}

async function addExpense(db, body) {
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

  const payerRs = await db.execute({ sql: "SELECT COALESCE(name, '') AS n FROM passengers WHERE id = ?", args: [payerId] });
  const payerName = payerRs.rows.length > 0 ? String(payerRs.rows[0].n) : "";

  const ins = datetime
    ? await db.execute({
        sql: "INSERT INTO expenses (description, payer_id, payer_name, currency, event_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        args: [description, payerId, payerName, currency, eventId, datetime],
      })
    : await db.execute({
        sql: "INSERT INTO expenses (description, payer_id, payer_name, currency, event_id) VALUES (?, ?, ?, ?, ?)",
        args: [description, payerId, payerName, currency, eventId],
      });

  const expenseId = Number(ins.lastInsertRowid);

  for (const it of items) {
    const pid = Number(it.person_id);
    const pRs = await db.execute({ sql: "SELECT COALESCE(name, '') AS n FROM passengers WHERE id = ?", args: [pid] });
    const pName = pRs.rows.length > 0 ? String(pRs.rows[0].n) : "";
    await db.execute({
      sql: "INSERT INTO expense_items (expense_id, person_id, person_name, amount) VALUES (?, ?, ?, ?)",
      args: [expenseId, pid, pName, Number(it.amount)],
    });
  }

  return json({ status: "success", message: "Expense added" });
}

async function deleteExpense(db, id) {
  await db.execute({ sql: "DELETE FROM expense_items WHERE expense_id = ?", args: [id] });
  await db.execute({ sql: "DELETE FROM expenses WHERE id = ?", args: [id] });
  return json({ status: "success", message: "Expense deleted" });
}

async function getEvents(db) {
  const rs = await db.execute(`SELECT e.id, e.name, COALESCE(e.created_at, '') AS created_at,
        (SELECT COUNT(*) FROM expenses x WHERE x.event_id = e.id) AS c
        FROM events e ORDER BY e.id ASC`);
  return json({
    events: rs.rows.map(r => ({
      id: Number(r.id),
      name: String(r.name),
      created_at: String(r.created_at),
      count: Number(r.c),
    })),
  });
}

async function addEvent(db, body) {
  const name = String(body.name || "").trim();
  if (!name) return errJson("Event name is required", 400);
  const rs = await db.execute({ sql: "INSERT INTO events (name) VALUES (?)", args: [name] });
  return json({ status: "success", message: "Event created", id: Number(rs.lastInsertRowid) });
}

async function deleteEvent(db, id) {
  if (id === 1) return errJson("Cannot delete the General event", 400);
  await db.execute({ sql: "UPDATE expenses SET event_id = 1 WHERE event_id = ?", args: [id] });
  await db.execute({ sql: "DELETE FROM events WHERE id = ?", args: [id] });
  return json({ status: "success", message: "Event deleted, purchases moved to General" });
}

async function getGuides(db, query) {
  const country = String(query.country || "").trim();
  const rs = country
    ? await db.execute({ sql: "SELECT id, country, city, place, food, price, note, COALESCE(created_at, '') AS created_at FROM guides WHERE country = ? ORDER BY id DESC", args: [country] })
    : await db.execute("SELECT id, country, city, place, food, price, note, COALESCE(created_at, '') AS created_at FROM guides ORDER BY id DESC");
  const cs = await db.execute("SELECT DISTINCT country FROM guides ORDER BY country");
  return json({
    guides: rs.rows.map(r => ({
      id: Number(r.id),
      country: String(r.country),
      city: String(r.city),
      place: String(r.place),
      food: String(r.food),
      price: String(r.price),
      note: String(r.note),
      created_at: String(r.created_at),
    })),
    countries: cs.rows.map(r => String(r.country)),
  });
}

async function addGuide(db, body) {
  const country = String(body.country || "").trim();
  const city = String(body.city || "").trim();
  const place = String(body.place || "").trim();
  const food = String(body.food || "").trim();
  const price = String(body.price || "").trim();
  const note = String(body.note || "").trim();
  if (!country || !city || !place || !food) {
    return errJson("Country, city, place and food are required", 400);
  }
  await db.execute({
    sql: "INSERT INTO guides (country, city, place, food, price, note) VALUES (?, ?, ?, ?, ?, ?)",
    args: [country, city, place, food, price, note],
  });
  return json({ status: "success", message: "Guide added" });
}

async function deleteGuide(db, id) {
  await db.execute({ sql: "DELETE FROM guides WHERE id = ?", args: [id] });
  return json({ status: "success", message: "Guide deleted" });
}

/* ---------- Router ---------- */

export async function handler(event) {
  try {
    const db = await client();
    await ensureSchema(db);

    let path = event.path || event.rawUrl || "/";
    try { path = new URL(event.rawUrl).pathname; } catch (_) { /* keep path */ }
    path = path.replace(/^\/api/, "").replace(/^\/+/, "");

    const method = (event.httpMethod || "GET").toUpperCase();
    const query = event.queryStringParameters || {};
    let body = {};
    if (event.body) {
      try { body = JSON.parse(event.body); } catch (_) { return errJson("Invalid JSON body", 400); }
    }

    const segments = path.split("/").filter(Boolean);

    if (segments.length === 0) return errJson("Not found", 404);

    if (segments[0] === "passenger" && method === "POST") return await addPassenger(db, body);
    if (segments[0] === "passengers" && method === "GET") return await getPassengers(db);
    if (segments[0] === "passengers" && method === "DELETE" && segments[1]) return await deletePassenger(db, pickInt(segments[1], 0));
    if (segments[0] === "admin" && segments[1] === "login" && method === "POST") return await adminLogin(db, body);
    if (segments[0] === "admin" && segments[1] === "passengers" && method === "GET") return await adminPassengers(db);
    if (segments[0] === "admin" && segments[1] === "stats" && method === "GET") return await adminStats(db);
    if (segments[0] === "expenses" && method === "GET") return await getExpenses(db, query);
    if (segments[0] === "expenses" && method === "POST") return await addExpense(db, body);
    if (segments[0] === "expenses" && method === "DELETE" && segments[1]) return await deleteExpense(db, pickInt(segments[1], 0));
    if (segments[0] === "events" && method === "GET") return await getEvents(db);
    if (segments[0] === "events" && method === "POST") return await addEvent(db, body);
    if (segments[0] === "events" && method === "DELETE" && segments[1]) return await deleteEvent(db, pickInt(segments[1], 0));
    if (segments[0] === "guides" && method === "GET") return await getGuides(db, query);
    if (segments[0] === "guides" && method === "POST") return await addGuide(db, body);
    if (segments[0] === "guides" && method === "DELETE" && segments[1]) return await deleteGuide(db, pickInt(segments[1], 0));

    return errJson("Not found", 404);
  } catch (e) {
    console.error("[api] error:", e);
    return errJson(e.message || "Internal error");
  }
}