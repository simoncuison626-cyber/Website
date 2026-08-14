/* Travel Portal - offline database engine.
   Executes the app's fixed set of SQL statements against localStorage.
   Used when "Offline mode" is chosen (runs fully on the phone, no internet). */

(function () {
  const STORE_KEY = "tp_local_db_v1";

  const TABLES = {
    passengers: { cols: [{ name: "id", pk: true }, { name: "name" }], rows: [] },
    events: { cols: [{ name: "id", pk: true }, { name: "name" }, { name: "created_at" }], rows: [] },
    expenses: { cols: [{ name: "id", pk: true }, { name: "description" }, { name: "payer_id" }, { name: "payer_name" }, { name: "currency" }, { name: "event_id" }, { name: "created_at" }], rows: [] },
    expense_items: { cols: [{ name: "id", pk: true }, { name: "expense_id" }, { name: "person_id" }, { name: "person_name" }, { name: "amount" }], rows: [] },
    guides: { cols: [{ name: "id", pk: true }, { name: "country" }, { name: "city" }, { name: "place" }, { name: "food" }, { name: "price" }, { name: "note" }, { name: "created_at" }], rows: [] },
  };

  function loadDb() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        for (const name of Object.keys(TABLES)) {
          if (parsed[name]) TABLES[name].rows = parsed[name];
        }
      }
    } catch (_) { /* corrupted -> start fresh */ }
  }

  function saveDb() {
    const out = {};
    for (const name of Object.keys(TABLES)) out[name] = TABLES[name].rows;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(out)); } catch (_) { /* storage full */ }
  }

  function now() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }

  function nextId(t) {
    let max = 0;
    for (const r of t.rows) if (Number(r.id) > max) max = Number(r.id);
    return max + 1;
  }

  /* ---------- Tiny tokenizer for the fixed SQL subset ---------- */

  function tokenize(sql) {
    const tokens = [];
    let i = 0;
    const n = sql.length;
    while (i < n) {
      const ch = sql[i];
      if (ch === " " || ch === "\n" || ch === "\t" || ch === "\r") { i++; continue; }
      if (ch === "'") {
        let j = i + 1, val = "";
        while (j < n) {
          if (sql[j] === "'") {
            if (sql[j + 1] === "'") { val += "'"; j += 2; continue; }
            break;
          }
          val += sql[j++];
        }
        tokens.push({ t: "str", v: val });
        i = j + 1;
        continue;
      }
      if (/[0-9.]/.test(ch)) {
        let j = i;
        while (j < n && /[0-9.]/.test(sql[j])) j++;
        tokens.push({ t: "num", v: parseFloat(sql.slice(i, j)) });
        i = j;
        continue;
      }
      if (ch === "?") { tokens.push({ t: "arg" }); i++; continue; }
      if (/[a-zA-Z_]/.test(ch)) {
        let j = i;
        while (j < n && /[a-zA-Z0-9_]/.test(sql[j])) j++;
        tokens.push({ t: "id", v: sql.slice(i, j).toLowerCase() });
        i = j;
        continue;
      }
      if (ch === "(" || ch === ")" || ch === ",") { tokens.push({ t: ch }); i++; continue; }
      if (ch === "=" || ch === "<" || ch === ">" || ch === "!") { tokens.push({ t: "op", v: ch }); i++; continue; }
      if (ch === ".") { tokens.push({ t: "dot" }); i++; continue; }
      tokens.push({ t: "?", v: ch });
      i++;
    }
    return tokens;
  }

  function colName(t, name) {
    return t.cols.find((c) => c.name === name);
  }

  function lookup(t, cond) {
    // cond: { col, op, value }
    const rows = [];
    for (const r of t.rows) {
      const v = r[cond.col];
      if (cond.op === "=" && v === cond.value) rows.push(r);
      else if (cond.op === "in" && cond.value.includes(v)) rows.push(r);
    }
    return rows;
  }

  /* ---------- Executor ---------- */

  function execute(sql, args) {
    const tk = tokenize(sql);
    let ai = 0;
    const nextArg = () => (ai < args.length ? args[ai++] : null);
    const expect = (t) => tk.shift() || { t: "?" };

    // CREATE TABLE IF NOT EXISTS name ( ... )
    if (tk[0] && tk[0].t === "id" && tk[0].v === "create") {
      tk.shift(); tk.shift(); tk.shift(); // TABLE IF NOT
      if (tk[0] && tk[0].t === "id" && tk[0].v === "exists") tk.shift();
      tk.shift(); // table name
      // consume column defs until end
      return { rows: [], lastInsertRowid: 0 };
    }

    // INSERT [OR IGNORE] INTO name (cols) VALUES (...)
    if (tk[0] && tk[0].t === "id" && tk[0].v === "insert") {
      tk.shift();
      let orIgnore = false;
      if (tk[0] && tk[0].t === "id" && tk[0].v === "or") { tk.shift(); tk.shift(); orIgnore = true; }
      tk.shift(); // INTO
      const tableName = (tk.shift() || {}).v;
      const t = TABLES[tableName];
      expect(); // (
      const cols = [];
      while (tk[0] && tk[0].t !== ")") {
        const idTok = tk.shift();
        if (idTok.t === "id") cols.push(idTok.v);
        if (tk[0] && tk[0].t === ",") tk.shift();
      }
      expect(); // )
      expect(); // VALUES
      expect(); // (
      const vals = [];
      while (tk[0] && tk[0].t !== ")") {
        const tok = tk.shift();
        if (tok.t === "arg") vals.push(nextArg());
        else if (tok.t === "str") vals.push(tok.v);
        else if (tok.t === "num") vals.push(tok.v);
        else if (tok.t === "id" && tok.v === "null") vals.push(null);
        else if (tok.t === "id" && tok.v === "current_timestamp") vals.push(now());
        if (tk[0] && tk[0].t === ",") tk.shift();
      }
      expect(); // )

      const row = {};
      cols.forEach((c, i) => { row[c] = vals[i]; });
      if (colName(t, "id") && row.id === undefined) row.id = nextId(t);
      const pkName = t.cols.find((c) => c.pk);
      const dup = pkName && row[pkName.name] !== undefined
        ? t.rows.some((r) => r[pkName.name] === row[pkName.name])
        : false;
      if (!(orIgnore && dup)) t.rows.push(row);
      saveDb();
      return { rows: [], lastInsertRowid: row.id ?? 0 };
    }

    // DELETE FROM name WHERE col op value
    if (tk[0] && tk[0].t === "id" && tk[0].v === "delete") {
      tk.shift(); tk.shift(); // FROM
      const tableName = (tk.shift() || {}).v;
      const t = TABLES[tableName];
      const [cond] = parseWhere(tk, nextArg, expect);
      t.rows = t.rows.filter((r) => !(cond.op === "=" ? r[cond.col] === cond.value : cond.value.includes(r[cond.col])));
      saveDb();
      return { rows: [], lastInsertRowid: 0 };
    }

    // UPDATE name SET col = value WHERE col = value
    if (tk[0] && tk[0].t === "id" && tk[0].v === "update") {
      tk.shift();
      const tableName = (tk.shift() || {}).v;
      const t = TABLES[tableName];
      expect(); // SET
      const setCol = (tk.shift() || {}).v;
      expect(); // =
      const setValTok = tk.shift();
      const setVal = setValTok.t === "arg" ? nextArg() : setValTok.t === "str" ? setValTok.v : setValTok.t === "num" ? setValTok.v : null;
      const [cond] = parseWhere(tk, nextArg, expect);
      for (const r of t.rows) {
        if (cond.op === "=" ? r[cond.col] === cond.value : cond.value.includes(r[cond.col])) {
          r[setCol] = setVal;
        }
      }
      saveDb();
      return { rows: [], lastInsertRowid: 0 };
    }

    // SELECT ...
    if (tk[0] && tk[0].t === "id" && tk[0].v === "select") {
      tk.shift();
      let distinct = false;
      if (tk[0] && tk[0].t === "id" && tk[0].v === "distinct") { tk.shift(); distinct = true; }

      // parse expressions until FROM
      const exprs = [];
      while (tk.length > 0 && !(tk[0].t === "id" && tk[0].v === "from")) {
        if (tk[0].t === "id" && tk[0].v === "count" && tk[1] && tk[1].t === "(") {
          tk.shift(); tk.shift(); tk.shift(); tk.shift(); // COUNT ( * )
          let alias = null;
          if (tk[0] && tk[0].t === "id" && tk[0].v === "as") { tk.shift(); alias = (tk.shift() || {}).v; }
          exprs.push({ type: "count", alias });
        } else if (tk[0] && tk[0].t === "id" && tk[0].v === "coalesce") {
          tk.shift(); expect(); // (
          const c1 = (tk.shift() || {}).v;
          expect(); // ,
          const c2Tok = tk.shift();
          const c2 = c2Tok.t === "str" ? c2Tok.v : (c2Tok.v || "");
          expect(); // )
          let alias = null;
          if (tk[0] && tk[0].t === "id" && tk[0].v === "as") { tk.shift(); alias = (tk.shift() || {}).v; }
          exprs.push({ type: "coalesce", col: c1, def: c2, alias });
        } else if (tk[0] && tk[0].t === "(") {
          // correlated subquery: (SELECT COUNT(*) FROM t2 x WHERE x.col = a.col) [AS c]
          tk.shift(); // (
          tk.shift(); // SELECT
          tk.shift(); // COUNT
          expect(); // (
          expect(); // *
          expect(); // )
          expect(); // FROM
          const subTable = (tk.shift() || {}).v;
          tk.shift(); // table alias
          expect(); // WHERE
          tk.shift(); // alias again
          expect(); // .
          const subCol = (tk.shift() || {}).v;
          expect(); // =
          tk.shift(); // outer alias
          expect(); // .
          const refCol = (tk.shift() || {}).v;
          expect(); // )
          let alias = null;
          if (tk[0] && tk[0].t === "id" && tk[0].v === "as") { tk.shift(); alias = (tk.shift() || {}).v; }
          exprs.push({ type: "subcount", table: subTable, col: subCol, refCol, alias });
        } else {
          const tok = tk.shift();
          let col = null, val = null;
          if (tok.t === "id") {
            col = tok.v;
            if (tk[0] && tk[0].t === "dot") { tk.shift(); col = (tk.shift() || {}).v; }
          } else if (tok.t === "num" || tok.t === "str") {
            val = tok.v;
          }
          let alias = null;
          if (tk[0] && tk[0].t === "id" && tk[0].v === "as") { tk.shift(); alias = (tk.shift() || {}).v; }
          if (col !== null) exprs.push({ type: "col", col, alias });
          else exprs.push({ type: "lit", val, alias });
        }
        if (tk[0] && tk[0].t === ",") tk.shift();
      }

      let fromTable = null, fromAlias = null;
      if (tk[0] && tk[0].t === "id" && tk[0].v === "from") {
        tk.shift();
        fromTable = (tk.shift() || {}).v;
        if (tk[0] && tk[0].t === "id" && tk[0].v !== "where" && tk[0].v !== "order") {
          fromAlias = tk.shift().v;
        }
      }

      let cond = null;
      if (tk[0] && tk[0].t === "id" && tk[0].v === "where") {
        const parsed = parseWhere(tk, nextArg, expect);
        cond = parsed[0];
      }

      let orderCol = null, orderDesc = false;
      if (tk[0] && tk[0].t === "id" && tk[0].v === "order") {
        tk.shift(); tk.shift(); // ORDER BY
        orderCol = (tk.shift() || {}).v;
        if (tk[0] && tk[0].t === "id" && tk[0].v === "desc") { tk.shift(); orderDesc = true; }
      }

      if (!fromTable) {
        // pure aggregate (SELECT COUNT(*) AS c FROM ...) handled below with table
        fromTable = null;
      }

      let rows;
      if (exprs.length === 1 && exprs[0].type === "count" && !fromTable) {
        rows = [{ [exprs[0].alias || "c"]: 0 }];
      } else if (cond && cond.isAggregate) {
        rows = [];
      } else {
        let src = TABLES[fromTable] ? TABLES[fromTable].rows : [];
        if (cond) src = src.filter((r) => cond.op === "=" ? r[cond.col] === cond.value : cond.value.includes(r[cond.col]));

        if (exprs.length === 1 && exprs[0].type === "count") {
          const n = src.length;
          rows = [{ [exprs[0].alias || "c"]: n }];
        } else if (exprs.length === 1 && exprs[0].type === "lit") {
          rows = [{ [exprs[0].alias || "v"]: exprs[0].val }];
        } else if (exprs.length === 1 && exprs[0].type === "col" && distinct) {
          const seen = new Set();
          const uniq = [];
          for (const r of src) {
            const v = r[exprs[0].col];
            if (!seen.has(v)) { seen.add(v); uniq.push({ [exprs[0].alias || exprs[0].col]: v }); }
          }
          rows = uniq;
        } else {
          rows = src.map((r) => {
            const out = {};
            for (const e of exprs) {
              if (e.type === "col") out[e.alias || e.col] = r[e.col];
              else if (e.type === "coalesce") out[e.alias || e.col] = r[e.col] === null || r[e.col] === undefined || r[e.col] === "" ? e.def : r[e.col];
              else if (e.type === "lit") out[e.alias || "v"] = e.val;
              else if (e.type === "subcount") {
                const t2 = TABLES[e.table];
                out[e.alias || "c"] = t2.rows.filter((x) => x[e.col] === r[e.refCol]).length;
              }
            }
            return out;
          });
        }
      }

      if (orderCol) {
        rows.sort((a, b) => {
          const av = a[orderCol], bv = b[orderCol];
          if (typeof av === "number" && typeof bv === "number") return orderDesc ? bv - av : av - bv;
          return orderDesc ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
        });
      }
      return { rows, lastInsertRowid: 0 };
    }

    throw new Error("Unsupported SQL: " + sql.slice(0, 60));
  }

  function parseWhere(tk, nextArg, expect) {
    tk.shift(); // WHERE
    const col = (tk.shift() || {}).v;
    if (tk[0] && tk[0].t === "id" && tk[0].v === "in") {
      tk.shift(); expect(); // (
      const vals = [];
      while (tk[0] && tk[0].t !== ")") {
        const tok = tk.shift();
        if (tok.t === "arg") vals.push(nextArg());
        else if (tok.t === "num") vals.push(tok.v);
        else if (tok.t === "str") vals.push(tok.v);
        if (tk[0] && tk[0].t === ",") tk.shift();
      }
      expect(); // )
      return [{ col, op: "in", value: vals }];
    }
    expect(); // =
    const tok = tk.shift();
    const value = tok.t === "arg" ? nextArg() : tok.t === "num" ? tok.v : tok.t === "str" ? tok.v : null;
    return [{ col, op: "=", value }];
  }

  loadDb();

  window.tpLocalDb = {
    execute,
    saveDb,
    clear() {
      for (const name of Object.keys(TABLES)) TABLES[name].rows = [];
      saveDb();
    },
  };
})();