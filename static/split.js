let peopleMap = {};
let expenses = [];
let currentEventId = 1;
let eventsMap = {};

const CURRENCIES = [
    { code: "PHP", name: "Philippine Peso", symbol: "\u20B1" },
    { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
    { code: "USD", name: "US Dollar", symbol: "$" },
    { code: "EUR", name: "Euro", symbol: "\u20AC" },
    { code: "GBP", name: "British Pound", symbol: "\u00A3" },
    { code: "JPY", name: "Japanese Yen", symbol: "\u00A5" },
    { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
    { code: "CNY", name: "Chinese Yuan", symbol: "CN\u00A5" },
    { code: "AUD", name: "Australian Dollar", symbol: "A$" },
    { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
    { code: "KRW", name: "South Korean Won", symbol: "\u20A9" },
    { code: "THB", name: "Thai Baht", symbol: "\u0E3F" },
    { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
    { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
    { code: "VND", name: "Vietnamese Dong", symbol: "\u20AB" },
    { code: "TWD", name: "Taiwan Dollar", symbol: "NT$" }
];

/* fallback rates: units of currency per 1 PHP (same base as live API).
   e.g. 1 HKD = P7.15  ->  HKD rate = 1 / 7.15 = 0.13986 */
const FALLBACK_RATES = {
    "PHP": 1, "USD": 0.017857, "HKD": 0.13986, "EUR": 0.016393, "GBP": 0.013986,
    "JPY": 2.7027, "SGD": 0.0239234, "CNY": 0.127389, "AUD": 0.0268817, "CAD": 0.0243902,
    "KRW": 24.5098, "THB": 0.645161, "MYR": 0.0833333, "IDR": 277.778,
    "VND": 434.783, "TWD": 0.571429
};

let rates = { ...FALLBACK_RATES };
let ratesUpdated = null;
let ratesFromLive = false;

function currencySymbol(code) {
    const c = CURRENCIES.find(x => x.code === code);
    return c ? c.symbol : code;
}

function symbolFor(code) {
    return currencySymbol(code);
}

/* rates: units of currency per 1 PHP (from open.er-api.com) */
function toPHP(amount, currency) {
    const r = rates[currency];
    if (!r || r <= 0) return amount;
    return amount / r;
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function formatMoney(n, currency) {
    const sym = currency ? currencySymbol(currency) : "\u20B1";
    return sym + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function round2(n) {
    return Math.round(n * 100) / 100;
}

function personOptions(selected) {
    return Object.entries(peopleMap).map(([id, name]) =>
        `<option value="${id}" ${String(id) === String(selected) ? "selected" : ""}>${escapeHtml(name)}</option>`
    ).join("");
}

/* ---------- Events ---------- */

async function loadEvents() {
    try {
        const res = await fetch("/api/events");
        const data = await res.json();
        eventsMap = {};
        (data.events || []).forEach(e => { eventsMap[e.id] = e; });
        if (!eventsMap[currentEventId]) {
            const firstId = Number(Object.keys(eventsMap)[0]);
            currentEventId = Number.isFinite(firstId) ? firstId : 1;
        }
        renderEvents();
        updateEventBadges();
        await loadExpenses();
    } catch (err) {
        console.error("Events error:", err);
    }
}

function updateEventBadges() {
    const ev = eventsMap[currentEventId];
    const label = ev ? escapeHtml(ev.name) : "";
    ["expenseFormEvent", "purchasesEvent", "summaryEvent"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = label ? "in " + label : "";
    });
}

function renderEvents() {
    const list = document.getElementById("eventsList");
    const ids = Object.keys(eventsMap);
    if (ids.length === 0) {
        list.innerHTML = '<p class="muted">No events yet.</p>';
        return;
    }
    list.innerHTML = ids.map(id => {
        const ev = eventsMap[id];
        const active = String(id) === String(currentEventId);
        const delBtn = id !== "1" ? `<button type="button" class="chip-del" data-event="${id}" title="Delete event (purchases move to General)">x</button>` : "";
        return `<span class="chip event-chip ${active ? "active" : ""}" data-event="${id}">${escapeHtml(ev.name)} <span class="chip-count">${ev.count || 0}</span>${delBtn}</span>`;
    }).join("");

    list.querySelectorAll(".event-chip").forEach(chip => {
        chip.addEventListener("click", (e) => {
            if (e.target.classList.contains("chip-del")) return;
            switchEvent(chip.dataset.event);
        });
    });
    list.querySelectorAll(".chip-del[data-event]").forEach(btn => {
        btn.addEventListener("click", () => deleteEvent(btn.dataset.event));
    });
}

async function switchEvent(id) {
    const num = Number(id);
    if (String(num) === String(currentEventId)) return;
    currentEventId = num;
    renderEvents();
    updateEventBadges();
    await loadExpenses();
}

async function deleteEvent(id) {
    const ev = eventsMap[id];
    if (!ev) return;
    if (!confirm(`Delete event "${ev.name}"? Its purchases will be moved to General (not deleted).`)) return;
    try {
        const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.status === "success") {
            currentEventId = 1;
            await loadEvents();
        } else {
            alert("Error: " + data.message);
        }
    } catch (err) {
        console.error("Delete event error:", err);
        alert("Connection error while deleting event.");
    }
}

document.getElementById("addEventForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("eventName");
    const name = input.value.trim();
    if (!name) return;

    try {
        const res = await fetch("/api/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name })
        });
        const data = await res.json();
        if (data.status === "success") {
            input.value = "";
            currentEventId = Number(data.id);
            await loadEvents();
        } else {
            alert("Error: " + data.message);
        }
    } catch (err) {
        console.error("Add event error:", err);
        alert("Connection error while creating event.");
    }
});

/* ---------- People ---------- */

async function loadPeople() {
    try {
        const res = await fetch("/api/passengers");
        const data = await res.json();
        peopleMap = {};
        data.passengers.forEach(p => { peopleMap[p[0]] = p[1]; });
        renderPeople();
        if (!document.getElementById("payerSelect").value) {
            document.getElementById("payerSelect").innerHTML = personOptions();
        }
    } catch (err) {
        console.error("People error:", err);
    }
}

function renderPeople() {
    const list = document.getElementById("peopleList");
    const entries = Object.entries(peopleMap);
    if (entries.length === 0) {
        list.innerHTML = '<p class="muted">No people yet. Add participants to start splitting.</p>';
    } else {
        list.innerHTML = entries.map(([id, name]) =>
            `<span class="chip">${escapeHtml(name)} <button type="button" class="chip-del" data-id="${id}" title="Remove person">x</button></span>`
        ).join("");
        list.querySelectorAll(".chip-del").forEach(btn => {
            btn.addEventListener("click", () => deletePerson(btn.dataset.id));
        });
    }
    document.getElementById("payerSelect").innerHTML = personOptions();
    document.querySelectorAll(".item-person").forEach(sel => { sel.innerHTML = personOptions(); });
}

async function deletePerson(id) {
    const name = peopleMap[id];
    if (!confirm(`Remove "${name}" from the list? Their purchase history (hatian) will be kept.`)) return;
    try {
        const res = await fetch(`/api/passengers/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.status === "success") {
            await loadPeople();
            await loadExpenses();
        } else {
            alert("Error: " + data.message);
        }
    } catch (err) {
        console.error("Delete person error:", err);
        alert("Connection error while removing person.");
    }
}

document.getElementById("addPersonForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("personName");
    const name = input.value.trim();
    if (!name) return;

    try {
        const res = await fetch("/api/passenger", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name })
        });
        const data = await res.json();
        if (data.status === "success") {
            input.value = "";
            await loadPeople();
        }
    } catch (err) {
        console.error("Add person error:", err);
    }
});

/* ---------- Expense form ---------- */

function addItemRow() {
    const container = document.getElementById("itemRows");
    const row = document.createElement("div");
    row.className = "item-row";
    row.innerHTML = `
        <select class="item-person">${personOptions()}</select>
        <input type="number" class="item-amount" min="0" step="0.01" placeholder="0.00">
        <button type="button" class="remove-item">x</button>
    `;
    row.querySelector(".remove-item").addEventListener("click", () => row.remove());
    container.appendChild(row);
}

document.getElementById("addItemBtn").addEventListener("click", addItemRow);
document.querySelectorAll(".item-row").forEach(row => {
    row.querySelector(".remove-item").addEventListener("click", () => row.remove());
});

document.getElementById("currencySelect").innerHTML = CURRENCIES.map(c =>
    `<option value="${c.code}">${c.code} - ${c.name}</option>`
).join("");

document.getElementById("expenseForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const description = document.getElementById("descInput").value.trim();
    const payerId = document.getElementById("payerSelect").value;

    if (!description || !payerId) {
        alert("Enter a description and choose who paid (nag-abono).");
        return;
    }

    const items = [];
    document.querySelectorAll(".item-row").forEach(row => {
        const pid = row.querySelector(".item-person").value;
        const amt = parseFloat(row.querySelector(".item-amount").value);
        if (pid && !isNaN(amt) && amt > 0) {
            items.push({ person_id: Number(pid), amount: Number(round2(amt)) });
        }
    });

    if (items.length === 0) {
        alert("Add at least one item with an amount.");
        return;
    }

    try {
        let datetime = "";
        const dtInput = document.getElementById("datetimeInput");
        if (dtInput && dtInput.value) {
            datetime = dtInput.value.replace("T", " ");
        }
        const res = await fetch("/api/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                description,
                payer_id: Number(payerId),
                items,
                datetime,
                currency: document.getElementById("currencySelect").value,
                event_id: Number(currentEventId)
            })
        });
        let data;
        try {
            data = await res.json();
        } catch (e) {
            const raw = await res.text();
            alert("Server rejected the save: " + (raw || ("HTTP " + res.status)) +
                "\n\nPress Ctrl+F5 to force-refresh the page, then try again.");
            return;
        }
        if (data.status === "success") {
            e.target.reset();
            document.getElementById("itemRows").innerHTML = "";
            addItemRow();
            await loadExpenses();
        } else {
            alert("Error: " + data.message);
        }
    } catch (err) {
        console.error("Add expense error:", err);
        alert("Error saving purchase: " + err.message + "\nCheck that the server is running, then try again.");
    }
});

/* ---------- Expenses ---------- */

async function loadExpenses() {
    try {
        const res = await fetch(`/api/expenses?event_id=${currentEventId}`);
        const data = await res.json();
        expenses = data.expenses || [];
        renderExpenses();
        renderSummary();
    } catch (err) {
        console.error("Expenses error:", err);
    }
}

function formatDateTime(s) {
    if (!s) return "";
    const d = new Date(s.replace(" ", "T"));
    if (isNaN(d.getTime())) return s;
    return d.toLocaleString("en-PH", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit"
    });
}

function renderExpenses() {
    const list = document.getElementById("expensesList");
    if (expenses.length === 0) {
        list.innerHTML = '<p class="muted">No purchases recorded yet. Add one above.</p>';
        return;
    }

    list.innerHTML = expenses.map(exp => `
        <div class="expense-card">
            <div class="expense-head">
                <div>
                    <strong>${escapeHtml(exp.description)}</strong>
                    ${exp.currency && exp.currency !== "PHP" ? `<span class="expense-currency-badge">${escapeHtml(exp.currency)}</span>` : ""}
                    <span class="expense-payer">paid by ${escapeHtml(exp.payer_name)}</span>
                    <span class="expense-date">${escapeHtml(formatDateTime(exp.created_at))}</span>
                </div>
                <div class="expense-total">
                    ${formatMoney(exp.total, exp.currency)}
                    ${exp.currency && exp.currency !== "PHP" ? `<span class="expense-php">(${formatMoney(toPHP(exp.total, exp.currency))})</span>` : ""}
                </div>
                <button class="del-btn" data-id="${exp.id}">&#128465; Delete</button>
            </div>
            <ul class="expense-items">
                ${exp.items.map(it => `<li>
                    <span>${escapeHtml(it.name)}</span>
                    <span>${formatMoney(it.amount, exp.currency)}</span>
                    ${exp.currency && exp.currency !== "PHP" ? `<span class="item-php">${formatMoney(toPHP(it.amount, exp.currency))}</span>` : ""}
                </li>`).join("")}
            </ul>
        </div>
    `).join("");

    list.querySelectorAll(".del-btn").forEach(btn => {
        btn.addEventListener("click", () => deleteExpense(btn.dataset.id));
    });
}

async function deleteExpense(id) {
    const exp = expenses.find(e => String(e.id) === String(id));
    if (!confirm(`Delete "${exp ? exp.description : "this purchase"}" from the database?`)) return;
    try {
        const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.status === "success") {
            await loadExpenses();
        } else {
            alert("Error: " + data.message);
        }
    } catch (err) {
        console.error("Delete error:", err);
        alert("Connection error while deleting.");
    }
}

/* ---------- Summary & settlement ---------- */

function renderSummary() {
    const balances = {};

    expenses.forEach(exp => {
        const payerId = exp.payer_id;
        if (!balances[payerId]) balances[payerId] = { name: exp.payer_name, paid: 0, share: 0, byCurr: {} };
        balances[payerId].paid += toPHP(exp.total, exp.currency);
        addCurr(balances[payerId].byCurr, exp.currency, exp.total, "paid");

        exp.items.forEach(it => {
            if (!balances[it.person_id]) balances[it.person_id] = { name: it.name, paid: 0, share: 0, byCurr: {} };
            balances[it.person_id].share += toPHP(it.amount, exp.currency);
            addCurr(balances[it.person_id].byCurr, exp.currency, it.amount, "share");
        });
    });

    Object.values(balances).forEach(b => {
        b.paid = round2(b.paid);
        b.share = round2(b.share);
        b.net = round2(b.paid - b.share);
    });

    const rows = Object.entries(balances).sort((a, b) => a[1].name.localeCompare(b[1].name));

    const tbody = document.getElementById("summaryBody");
    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="muted">No data to summarize.</td></tr>';
    } else {
        tbody.innerHTML = rows.map(([, b]) => {
            const cls = b.net > 0 ? "positive" : b.net < 0 ? "negative" : "";
            return `
                <tr>
                    <td>${escapeHtml(b.name)}</td>
                    <td>${summaryMoneyCell(b.paid, b.byCurr, "paid")}</td>
                    <td>${summaryMoneyCell(b.share, b.byCurr, "share")}</td>
                    <td class="${cls}">${b.net >= 0 ? "" : "-"}${formatMoney(Math.abs(b.net))}</td>
                </tr>
            `;
        }).join("");
    }

    renderSettlement(rows);
}

function addCurr(byCurr, currency, amount, key) {
    if (!byCurr[currency]) byCurr[currency] = { paid: 0, share: 0 };
    byCurr[currency][key] += amount;
}

function summaryMoneyCell(phpAmount, byCurr, key) {
    const extras = Object.entries(byCurr)
        .filter(([code]) => code !== "PHP")
        .map(([code, v]) => formatMoney(round2(v[key]), code))
        .join(" \u00B7 ");
    if (!extras) return formatMoney(phpAmount);
    return `<span class="cell-php">${formatMoney(phpAmount)}</span><span class="cell-curr">${extras}</span>`;
}

function renderSettlement(rows) {
    const settlement = document.getElementById("settlementList");

    const creditors = rows.filter(([, b]) => b.net > 0.005).sort((a, b) => b[1].net - a[1].net);
    const debtors = rows.filter(([, b]) => b.net < -0.005).sort((a, b) => a[1].net - b[1].net);

    const transactions = [];
    let ci = 0, di = 0;
    while (ci < creditors.length && di < debtors.length) {
        const amount = Math.min(creditors[ci][1].net, -debtors[di][1].net);
        if (amount > 0.005) {
            transactions.push({ from: debtors[di][1].name, to: creditors[ci][1].name, amount: round2(amount) });
        }
        creditors[ci][1].net = round2(creditors[ci][1].net - amount);
        debtors[di][1].net = round2(debtors[di][1].net + amount);
        if (creditors[ci][1].net < 0.005) ci++;
        if (debtors[di][1].net > -0.005) di++;
    }

    if (transactions.length === 0) {
        settlement.innerHTML = '<p class="muted">Everyone is settled - no payments needed.</p>';
    } else {
        settlement.innerHTML = transactions.map(t => `
            <div class="settle-item">
                <span>${escapeHtml(t.from)} <span class="arrow">to pay</span> ${escapeHtml(t.to)}</span>
                <span class="settle-amount">${formatMoney(t.amount)}</span>
            </div>
        `).join("");
    }
}

/* ---------- Exchange rates ---------- */

async function loadRates() {
    try {
        const res = await fetch("https://open.er-api.com/v6/latest/PHP");
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        if (data.result === "success" && data.rates) {
            const filtered = { PHP: 1 };
            CURRENCIES.forEach(c => {
                if (data.rates[c.code] && data.rates[c.code] > 0) filtered[c.code] = data.rates[c.code];
            });
            rates = filtered;
            ratesUpdated = data.time_last_update_utc || null;
            ratesFromLive = true;
        }
    } catch (err) {
        console.warn("Live rates unavailable, using fallback:", err);
        ratesUpdated = null;
        ratesFromLive = false;
    }
    renderRates();
    renderExpenses();
    renderSummary();
}

function renderRates() {
    const list = document.getElementById("ratesList");
    const updatedEl = document.getElementById("ratesUpdated");
    if (updatedEl) {
        if (ratesFromLive && ratesUpdated) {
            const d = new Date(ratesUpdated);
            updatedEl.textContent = "Updated live: " + (isNaN(d.getTime()) ? ratesUpdated : d.toLocaleString("en-PH"));
        } else {
            updatedEl.textContent = "Live rates unavailable - showing last known rates. Check internet connection.";
        }
    }
    if (list) {
        list.innerHTML = CURRENCIES.map(c => {
            const r = rates[c.code];
            const php = r && r > 0 ? 1 / r : null;
            return `
                <div class="rate-item">
                    <span class="rate-name"><strong>${c.code}</strong> ${escapeHtml(c.name)}</span>
                    <span class="rate-value">1 ${c.code} = ${php ? formatMoney(php) : "n/a"}</span>
                </div>
            `;
        }).join("");
    }
}

/* ---------- Init ---------- */

window.addEventListener("load", () => {
    loadEvents();
    loadPeople();
    loadRates();
});
