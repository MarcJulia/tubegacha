// TubeGacha — Dynamic video fetching from YouTube API
// No hardcoded videos. Cards are pulled from YouTube on demand.

const CATEGORY_ICONS = {
    "Music": "🎵",
    "Education": "📚",
    "Comedy": "😂",
    "Tech": "💻",
    "Gaming": "🎮",
    "Food": "🍳",
    "Travel": "✈️",
    "Entertainment": "🎪",
    "Fitness": "💪",
    "Art": "🎨",
};

const TYPE_ADVANTAGES = {
    "Music":         ["Comedy", "Art"],
    "Comedy":        ["Education", "Fitness"],
    "Education":     ["Tech", "Gaming"],
    "Tech":          ["Entertainment", "Travel"],
    "Entertainment": ["Music", "Food"],
    "Food":          ["Fitness", "Travel"],
    "Travel":        ["Art", "Comedy"],
    "Gaming":        ["Entertainment", "Music"],
    "Fitness":       ["Tech", "Gaming"],
    "Art":           ["Education", "Food"],
};

// --- API helpers ---
const API = {
    async get(path) {
        const resp = await fetch(`/api${path}`);
        return resp.json();
    },
    async post(path, body) {
        const resp = await fetch(`/api${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        return resp.json();
    },
};

// Pull fresh cards from YouTube via server
async function pullCards(count = 3) {
    return API.post("/pull", { count });
}

// Load opponents from server
async function loadOpponents(count = 4) {
    return API.get(`/opponents?count=${count}`);
}

// Check server status
async function getServerStatus() {
    return API.get("/status");
}

// Save a card to collection (with full metadata)
async function addCardToCollection(video) {
    return API.post("/collection/add", {
        video_id: video.id,
        title: video.title,
        channel: video.channel,
        views: video.views,
        category: video.category,
        description: video.description || "",
    });
}

// Load collection from server
async function loadCollection() {
    const rows = await API.get("/collection");
    return rows.map(r => ({
        videoId: r.video_id,
        title: r.title,
        channel: r.channel,
        views: r.views,
        category: r.category,
        description: r.description || "",
        obtainedAt: r.obtained_at,
        count: r.count,
    }));
}

// Game state via server
async function saveGameState(key, value) {
    return API.post(`/state/${key}`, { value });
}

async function loadGameState(key) {
    const result = await API.get(`/state/${key}`);
    return result.value;
}

// Battle history via server
async function saveBattle(opponent, won, score, mode) {
    return API.post("/battles", { opponent, won, score, mode });
}

async function loadBattleHistory() {
    return API.get("/battles");
}

// Settings via server
async function saveSetting(key, value) {
    return API.post(`/settings/${key}`, { value });
}

async function loadSetting(key) {
    const result = await API.get(`/settings/${key}`);
    return result.value;
}

// Top 10 — fetch from Wikipedia (runs client-side)
async function fetchTop10Videos() {
    const WIKI_API = "https://en.wikipedia.org/api/rest_v1/page/html/List_of_most-viewed_YouTube_videos";

    try {
        const resp = await fetch(WIKI_API);
        if (!resp.ok) throw new Error("Wiki fetch failed");

        const html = await resp.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        const tables = doc.querySelectorAll("table.wikitable");
        let targetTable = null;
        for (const table of tables) {
            const headers = table.querySelectorAll("th");
            for (const th of headers) {
                if (th.textContent.toLowerCase().includes("views")) {
                    targetTable = table;
                    break;
                }
            }
            if (targetTable) break;
        }

        if (!targetTable) throw new Error("Table not found");

        const rows = targetTable.querySelectorAll("tbody tr");
        const results = [];

        for (const row of rows) {
            if (results.length >= 10) break;
            const cells = row.querySelectorAll("td");
            if (cells.length < 3) continue;

            const links = row.querySelectorAll('a[href*="youtube.com"], a[href*="youtu.be"]');
            let videoId = "";
            for (const link of links) {
                const href = link.getAttribute("href") || "";
                const match = href.match(/(?:watch\?v=|youtu\.be\/)([\w-]{11})/);
                if (match) { videoId = match[1]; break; }
            }

            const nameCell = cells[0];
            const titleLink = nameCell.querySelector("a");
            let title = (titleLink ? titleLink.textContent : nameCell.textContent).trim().replace(/\[.*?\]/g, "").trim();

            const artistCell = cells[1];
            const artistLink = artistCell.querySelector("a");
            let channel = (artistLink ? artistLink.textContent : artistCell.textContent).trim().replace(/\[.*?\]/g, "").trim();

            let views = 0;
            for (const cell of cells) {
                const text = cell.textContent.replace(/,/g, "").trim();
                const billionMatch = text.match(/([\d.]+)\s*billion/i);
                if (billionMatch) { views = Math.round(parseFloat(billionMatch[1]) * 1_000_000_000); break; }
                const numMatch = text.match(/^(\d{9,})/);
                if (numMatch) { views = parseInt(numMatch[1], 10); break; }
            }

            if (!title || views === 0) continue;

            results.push({
                id: videoId, title, channel, views, category: "Music",
                description: `#${results.length + 1} most-viewed YouTube video of all time with ${(views / 1_000_000_000).toFixed(1)} billion views.`,
                rank: results.length + 1,
            });
        }

        if (results.length >= 5) return results;
        throw new Error("Not enough results");
    } catch (err) {
        console.warn("Wikipedia fetch failed:", err);
        return [];
    }
}
