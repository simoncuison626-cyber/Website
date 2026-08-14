window.addEventListener("load", () => {
    setTimeout(() => {
        document.querySelector(".loader").style.display = "none";
        document.querySelector(".app").classList.remove("hidden");
        loadPassengers();
    }, 500);
});

document.getElementById("passengerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("nameInput");
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
            loadPassengers();
        }
    } catch (err) {
        console.error("Error adding passenger:", err);
    }
});

async function loadPassengers() {
    const list = document.getElementById("passengerList");
    try {
        const res = await fetch("/api/passengers");
        const data = await res.json();

        if (data.passengers.length === 0) {
            list.innerHTML = '<p class="loading">No passengers yet. Add one above!</p>';
            return;
        }

        const html = data.passengers.map(p => `
            <div class="passenger-item">
                <span class="passenger-id">#${p[0]}</span>
                <span class="passenger-name">${p[1]}</span>
                <button class="del-passenger" data-id="${p[0]}" title="Remove person">x</button>
            </div>
        `).join("");
        list.innerHTML = `<ul>${html}</ul>`;

        list.querySelectorAll(".del-passenger").forEach(btn => {
            btn.addEventListener("click", () => deletePassenger(btn.dataset.id));
        });
    } catch (err) {
        list.innerHTML = '<p class="loading">Failed to load passengers</p>';
    }
}

async function deletePassenger(id) {
    if (!confirm("Remove this person? Their purchase history (hatian) will be kept.")) return;
    try {
        const res = await fetch(`/api/passengers/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.status === "success") {
            loadPassengers();
        } else {
            alert("Error: " + data.message);
        }
    } catch (err) {
        console.error("Delete passenger error:", err);
    }
}
