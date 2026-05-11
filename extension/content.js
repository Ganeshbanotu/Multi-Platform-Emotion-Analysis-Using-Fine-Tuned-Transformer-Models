const EMO_EMOJI = {
    anger: "😡",
    fear: "😨",
    joy: "😄",
    sadness: "😢",
    negative: "👎",
    neutral: "😐",
    positive: "👍"
};

const EMO_COLOR = {
    anger: "#ef4444",
    fear: "#8b5cf6",
    joy: "#f59e0b",
    sadness: "#3b82f6",
    negative: "#ef4444",
    neutral: "#6b7280",
    positive: "#22c55e"
};

let platform = detectPlatform();
let processed = new Set();
let autoMode = true;
let backendEnabled = true;
let scanInterval = null;
let autoAnalyzeRunning = false;

console.log("SentiScope loaded:", location.href, "platform:", platform);

function detectPlatform() {
    const h = location.hostname;
    if (h.includes("twitter.com") || h.includes("x.com")) return "twitter";
    if (h.includes("reddit.com")) return "reddit";
    if (h.includes("linkedin.com")) return "linkedin";
    return "broad";
}

chrome.storage.sync.get(["auto_mode"], (r) => {
    autoMode = r.auto_mode !== false;
    console.log("SentiScope auto_mode:", autoMode);
    if (autoMode && backendEnabled) {
        startAutoScan();
    }
});

function analyzeText(text) {
    if (!backendEnabled || !text || text.trim().length < 5) {
        return Promise.resolve(null);
    }

    return new Promise((resolve) => {
        try {
            chrome.runtime.sendMessage(
                {
                    action: "analyze_text",
                    text: text,
                    platform: platform
                },
                (response) => {
                    if (chrome.runtime.lastError) {
                        console.warn("SentiScope runtime error:", chrome.runtime.lastError.message);
                        resolve(null);
                        return;
                    }

                    if (!response || !response.ok) {
                        console.warn("SentiScope backend error:", response);
                        resolve(null);
                        return;
                    }

                    let data = response.data;

                    if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
                        data = data[0];
                    }

                    if (Array.isArray(data) && data.length > 0) {
                        const sorted = [...data].sort((a, b) => b.score - a.score);
                        resolve({
                            label: String(sorted[0].label).toLowerCase(),
                            score: sorted[0].score,
                            all: sorted
                        });
                        return;
                    }

                    if (typeof data === "object" && data && data.label && data.score !== undefined) {
                        resolve({
                            label: String(data.label).toLowerCase(),
                            score: data.score,
                            all: [data]
                        });
                        return;
                    }

                    resolve(null);
                }
            );
        } catch (err) {
            console.warn("SentiScope analyzeText failed:", err);
            resolve(null);
        }
    });
}

function createBadge(result, floating = false) {
    const badge = document.createElement("span");
    badge.className = floating ? "sentiscope-floating-badge" : "sentiscope-badge";

    const emoji = EMO_EMOJI[result.label] || "💬";
    const color = EMO_COLOR[result.label] || "#888";

    badge.style.cssText = `
        display:inline-flex;
        align-items:center;
        gap:6px;
        padding:${floating ? "6px 10px" : "2px 8px"};
        border-radius:14px;
        font-size:${floating ? "13px" : "12px"};
        font-weight:600;
        cursor:pointer;
        background:${color}22;
        color:${color};
        border:1px solid ${color}55;
        white-space:nowrap;
        margin-top:6px;
        max-width:min(280px, calc(100vw - 16px));
    `;

    badge.textContent = `${emoji} ${result.label} ${Math.round(result.score * 100)}%`;
    badge.title = result.all.map(r => `${r.label}: ${Math.round(r.score * 100)}%`).join("\n");

    return badge;
}

function extractText(el) {
    return (el?.innerText || el?.textContent || "").replace(/\s+/g, " ").trim();
}

function getTargets() {
    if (platform === "reddit") {
        return Array.from(document.querySelectorAll(`
            div[id$="-post-rtjson-content"],
            [slot="text-body"],
            [data-click-id="text"],
            .RichTextJSON-root
        `)).map(el => ({
            textEl: el,
            anchorEl: el
        }));
    }

    if (platform === "twitter") {
        const articles = Array.from(document.querySelectorAll(`
            article[data-testid="tweet"],
            article,
            [role="article"]
        `));

        return articles.map(article => {
            const textEl =
                article.querySelector('[data-testid="tweetText"]') ||
                article.querySelector('div[lang]') ||
                article.querySelector('[lang]');

            if (!textEl) return null;

            return {
                textEl: textEl,
                anchorEl: textEl
            };
        }).filter(Boolean);
    }

    if (platform === "linkedin") {
        return Array.from(document.querySelectorAll('span[data-testid="expandable-text-box"]')).map(el => ({
            textEl: el,
            anchorEl: el.closest("p") || el
        }));
    }

    return [];
}

function hasBadgeNear(anchorEl) {
    if (!anchorEl) return false;
    const next = anchorEl.nextElementSibling;
    return !!(next && next.classList.contains("sentiscope-badge-wrap"));
}

function attachBadge(anchorEl, result) {
    if (!anchorEl || !anchorEl.parentElement || hasBadgeNear(anchorEl)) return;

    const wrap = document.createElement("div");
    wrap.className = "sentiscope-badge-wrap";
    wrap.style.cssText = `
        display:flex;
        align-items:center;
        justify-content:flex-start;
        width:100%;
        margin-top:6px;
        margin-bottom:4px;
    `;

    wrap.appendChild(createBadge(result));
    anchorEl.insertAdjacentElement("afterend", wrap);
}

async function autoAnalyze() {
    if (!backendEnabled || !autoMode || autoAnalyzeRunning) return;
    autoAnalyzeRunning = true;

    try {
        const targets = getTargets();
        console.log("SentiScope targets found:", targets.length, "platform:", platform);

        const queue = [];

        for (const item of targets) {
            const text = extractText(item.textEl);
            const key = platform + "::" + text.slice(0, 180);

            if (text.length > 20 && !processed.has(key) && !hasBadgeNear(item.anchorEl)) {
                queue.push({
                    text: text,
                    key: key,
                    anchorEl: item.anchorEl
                });
            }
        }

        console.log("SentiScope queued:", queue.length, "platform:", platform);

        for (const item of queue.slice(0, 8)) {
            processed.add(item.key);

            const result = await analyzeText(item.text);
            if (result) {
                attachBadge(item.anchorEl, result);
            }

            await new Promise(r => setTimeout(r, 800));
        }
    } finally {
        autoAnalyzeRunning = false;
    }
}

function startAutoScan() {
    console.log("SentiScope startAutoScan:", platform);

    setTimeout(autoAnalyze, 1500);
    setTimeout(autoAnalyze, 3500);
    setTimeout(autoAnalyze, 5500);

    if (scanInterval) clearInterval(scanInterval);
    scanInterval = setInterval(() => {
        autoAnalyze();
    }, 5000);
}

const observer = new MutationObserver(() => {
    if (autoMode && backendEnabled) {
        clearTimeout(window._ssTimer);
        window._ssTimer = setTimeout(() => {
            autoAnalyze();
        }, 1500);
    }
});

function startObserver() {
    if (!document.body) return;

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });

    console.log("SentiScope observer started:", platform);
}

function removeFloat() {
    document.getElementById("sentiscope-floating")?.remove();
}

function showWarn(message = "⚠️ Could not analyze text. Check backend server.") {
    removeFloat();

    const w = document.createElement("div");
    w.id = "sentiscope-floating";
    w.style.cssText = `
        position:fixed;
        top:80px;
        right:20px;
        z-index:999999;
        background:#fff3cd;
        border:1px solid #ffc107;
        border-radius:12px;
        padding:12px 16px;
        font-size:13px;
        color:#856404;
        box-shadow:0 8px 24px rgba(0,0,0,0.15);
        max-width:280px;
    `;
    w.textContent = message;
    document.body.appendChild(w);
    setTimeout(removeFloat, 3000);
}

function positionFloatingBadge(badge, rect) {
    const margin = 8;
    const badgeRect = badge.getBoundingClientRect();

    let top = rect.top - badgeRect.height - margin;
    let left = rect.left + (rect.width - badgeRect.width) / 2;

    if (top < margin) top = rect.bottom + margin;
    if (left < margin) left = margin;
    if (left + badgeRect.width > window.innerWidth - margin) {
        left = window.innerWidth - badgeRect.width - margin;
    }

    badge.style.position = "fixed";
    badge.style.top = `${top}px`;
    badge.style.left = `${left}px`;
    badge.style.zIndex = "999999";
}

document.addEventListener("mouseup", async () => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();

    if (!text || text.length < 10) {
        removeFloat();
        return;
    }

    if (!sel.rangeCount) return;

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (!rect || (!rect.width && !rect.height)) return;

    const result = await analyzeText(text);

    if (!result) {
        showWarn();
        return;
    }

    removeFloat();

    const badge = createBadge(result, true);
    badge.id = "sentiscope-floating";
    badge.style.visibility = "hidden";

    document.body.appendChild(badge);
    positionFloatingBadge(badge, rect);
    badge.style.visibility = "visible";

    setTimeout(removeFloat, 4500);
});

if (document.body) {
    startObserver();
} else {
    window.addEventListener("DOMContentLoaded", startObserver);
}

window.addEventListener("load", () => {
    console.log("SentiScope window load:", platform);
    if (autoMode && backendEnabled) {
        startAutoScan();
    }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "rescan") {
        processed.clear();
        autoAnalyze();
        sendResponse({ ok: true });
        return true;
    }

    if (msg.action === "toggle_auto") {
        autoMode = msg.value;
        console.log("SentiScope toggle_auto:", autoMode, "platform:", platform);

        if (autoMode) {
            startAutoScan();
        } else if (scanInterval) {
            clearInterval(scanInterval);
            scanInterval = null;
        }

        sendResponse({ ok: true });
        return true;
    }
});