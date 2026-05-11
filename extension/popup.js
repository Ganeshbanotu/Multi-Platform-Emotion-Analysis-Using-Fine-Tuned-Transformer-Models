const PLAT = {
    "twitter.com": "🐦 Twitter",
    "x.com": "🐦 Twitter (X)",
    "reddit.com": "🟠 Reddit",
    "linkedin.com": "💼 LinkedIn"
};

function setStatus(message, isError = false) {
    const status = document.getElementById("status");
    status.textContent = message;
    status.className = isError ? "status error" : "status";
    setTimeout(() => {
        status.textContent = "";
        status.className = "status";
    }, 2500);
}

function sendToActiveTab(message, onSuccess) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]?.id) {
            setStatus("⚠️ No active tab found", true);
            return;
        }

        chrome.tabs.sendMessage(tabs[0].id, message, () => {
            if (chrome.runtime.lastError) {
                setStatus("⚠️ Refresh the page after reloading extension", true);
                return;
            }
            if (onSuccess) onSuccess();
        });
    });
}

chrome.storage.sync.get(["auto_mode"], (r) => {
    const auto = r.auto_mode !== false;
    const toggle = document.getElementById("autoToggle");
    if (auto) toggle.classList.add("on");
    else toggle.classList.remove("on");
});

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;

    try {
        const host = new URL(tabs[0].url).hostname.replace("www.", "");
        const name = Object.entries(PLAT).find(([k]) => host.includes(k));
        document.getElementById("platformBadge").textContent = name ? name[1] : "🌐 General";
    } catch (e) {
        document.getElementById("platformBadge").textContent = "🌐 General";
    }
});

document.getElementById("autoToggle").addEventListener("click", function () {
    const enabled = !this.classList.contains("on");
    this.classList.toggle("on", enabled);

    chrome.storage.sync.set({ auto_mode: enabled }, () => {
        sendToActiveTab(
            { action: "toggle_auto", value: enabled },
            () => setStatus(enabled ? "✅ Auto analysis enabled" : "✅ Auto analysis disabled")
        );
    });
});

document.getElementById("rescanBtn").addEventListener("click", () => {
    sendToActiveTab(
        { action: "rescan" },
        () => setStatus("🔄 Re-scanning page...")
    );
});

document.getElementById("backendBtn").addEventListener("click", async () => {
    try {
        const res = await fetch("http://127.0.0.1:8000/");
        const data = await res.json();

        if (res.ok && data.message) {
            setStatus("✅ Backend connected");
        } else {
            setStatus("⚠️ Backend response invalid", true);
        }
    } catch (err) {
        setStatus("❌ Backend not reachable", true);
    }
});