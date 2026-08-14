window.addEventListener("load", () => {
    setTimeout(() => {
        document.querySelector(".loader").style.display = "none";
        document.querySelector(".admin-app").classList.remove("hidden");
    }, 500);
});

document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = document.getElementById("adminPassword").value;

    try {
        const res = await fetch("/api/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password })
        });
        const data = await res.json();

        if (data.authenticated) {
            document.getElementById("loginSection").style.display = "none";
            document.getElementById("dashboard").classList.remove("hidden");
            loadStats();
            loadPassengers();
        } else {
            alert("Incorrect password!");
        }
    } catch (err) {
        console.error("Login error:", err);
        alert("Connection error. Please try again.");
    }
});

async function loadStats() {
    try {
        const res = await fetch("/api/admin/stats");
        const data = await res.json();
        document.getElementById("passengerCount").textContent = data.total_passengers;
    } catch (err) {
        console.error("Stats error:", err);
    }
}

async function loadPassengers() {
    const tbody = document.getElementById("passengerTableBody");
    try {
        const res = await fetch("/api/admin/passengers");
        const data = await res.json();

        if (data.passengers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="loading-row">No passengers found</td></tr>';
            return;
        }

        tbody.innerHTML = data.passengers.map(p => `
            <tr>
                <td>${p[0]}</td>
                <td>${p[1]}</td>
                <td class="${p[2] ? "status-active" : "status-deleted"}">${p[2] ? "Active" : "Deleted"}</td>
            </tr>
        `).join("");
    } catch (err) {
        console.error("Passengers error:", err);
        tbody.innerHTML = '<tr><td colspan="3" class="loading-row">Failed to load passengers</td></tr>';
    }
}

document.getElementById("refreshBtn").addEventListener("click", () => {
    loadStats();
    loadPassengers();
});
