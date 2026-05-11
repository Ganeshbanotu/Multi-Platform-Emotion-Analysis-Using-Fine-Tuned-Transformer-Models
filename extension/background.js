chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action !== "analyze_text") return;

    const platform = msg.platform || "broad";

    const urls = [
        "http://127.0.0.1:8000/analyze",
        "http://localhost:8000/analyze"
    ];

    const payload = JSON.stringify({
        text: msg.text,
        platform: platform
    });

    (async () => {
        for (const url of urls) {
            try {
                const res = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: payload
                });

                const text = await res.text();
                let data;

                try {
                    data = JSON.parse(text);
                } catch {
                    sendResponse({
                        ok: false,
                        error: `Non-JSON response from backend: ${text.slice(0, 200)}`
                    });
                    return;
                }

                if (!res.ok || !data.ok) {
                    sendResponse({
                        ok: false,
                        error: data.error || data.detail || "Backend request failed"
                    });
                    return;
                }

                sendResponse({
                    ok: true,
                    data: data.data
                });
                return;
            } catch (err) {
                console.warn("SentiScope fetch failed for", url, err);
            }
        }

        sendResponse({
            ok: false,
            error: "TypeError: Failed to fetch"
        });
    })();

    return true;
});