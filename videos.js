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

// --- localStorage helpers ---
const LS_PREFIX = "tubegacha_";

function lsGet(key, fallback = null) {
    try {
        const raw = localStorage.getItem(LS_PREFIX + key);
        return raw !== null ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
}

function lsSet(key, value) {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
}

// Pull fresh cards from YouTube via server (server still handles YouTube API)
async function pullCards(count = 3) {
    const apiKey = lsGet("setting_youtube_api_key", null);
    return API.post("/pull", { count, apiKey });
}

// Load opponents from server
async function loadOpponents(count = 4) {
    return API.get(`/opponents?count=${count}`);
}

// Check server status
async function getServerStatus() {
    const apiKey = lsGet("setting_youtube_api_key", null);
    return { hasApiKey: !!apiKey, collectionCount: lsGet("collection", []).length, bufferSize: 0 };
}

// Save a card to collection (localStorage)
async function addCardToCollection(video) {
    const collection = lsGet("collection", []);
    const existing = collection.find(c => c.video_id === video.id);
    if (existing) {
        existing.count++;
    } else {
        collection.push({
            video_id: video.id,
            title: video.title,
            channel: video.channel,
            views: video.views,
            category: video.category,
            description: video.description || "",
            count: 1,
            obtained_at: new Date().toISOString(),
        });
    }
    lsSet("collection", collection);
    return { ok: true };
}

// Load collection from localStorage
async function loadCollection() {
    const rows = lsGet("collection", []);
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

// Game state (localStorage)
async function saveGameState(key, value) {
    lsSet("state_" + key, value);
    return { ok: true };
}

async function loadGameState(key) {
    return lsGet("state_" + key, null);
}

// Battle history (localStorage)
async function saveBattle(opponent, won, score, mode) {
    const history = lsGet("battles", []);
    history.unshift({
        opponent, won: won ? 1 : 0, score, mode: mode || "raid",
        date: new Date().toISOString(),
    });
    if (history.length > 20) history.length = 20;
    lsSet("battles", history);
    return { ok: true };
}

async function loadBattleHistory() {
    return lsGet("battles", []);
}

// Settings (localStorage)
async function saveSetting(key, value) {
    lsSet("setting_" + key, value);
    return { ok: true };
}

async function loadSetting(key) {
    return lsGet("setting_" + key, null);
}

// --- Arena Async PvP API ---
async function arenaRegister(playerId, name, avatar) {
    return API.post("/arena/register", { playerId, name, avatar });
}

async function arenaGetPlayer(playerId) {
    return API.get(`/arena/player/${playerId}`);
}

async function arenaSetDefense(playerId, cards) {
    return API.post("/arena/defense", { playerId, cards });
}

async function arenaBattle(attackerId, attackCards) {
    return API.post("/arena/battle", { attackerId, attackCards });
}

async function arenaGetDefenseLog(playerId) {
    return API.get(`/arena/defense-log/${playerId}`);
}

// Known YouTube video IDs for top most-viewed videos (Wikipedia doesn't include them)
const TOP_VIDEO_IDS = {
    "Baby Shark Dance": "XqZsoesa55w",
    "Despacito": "kJQP7kiw5Fk",
    "Wheels on the Bus": "e_04ZrNroTo",
    "Bath Song": "WRVsOCh907o",
    "Johny Johny Yes Papa": "F4tHL8reNCs",
    "See You Again": "RgKAFK5djSk",
    "Phonics Song with Two Words": "hq3yfQnllfQ",
    "Shape of You": "JGwWNGJdvx8",
    "Gangnam Style": "9bZkp7q19f0",
    "Uptown Funk": "OPf0YbXqDm0",
    "Axel F": "k85mRPqvMbE",
    "Learning Colors": "dA2GnpEsQMY",
    "Sugar": "09R8_2nJtjg",
    "Counting Stars": "hT_nvWreIhg",
    "Sorry": "fRh_vgS2dFE",
    "Roar": "CevxZvSJLk8",
    "Waka Waka": "pRpeEdMmmQ0",
};

// Top 10 — fetch from Wikipedia via server proxy
async function fetchTop10Videos() {
    try {
        const resp = await fetch("/api/top10");
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

        // Find which column index has "views" in its header
        const headerCells = targetTable.querySelectorAll("th");
        let viewsColIndex = 2; // default fallback
        headerCells.forEach((th, i) => {
            if (th.textContent.toLowerCase().includes("views")) viewsColIndex = i;
        });

        const rows = targetTable.querySelectorAll("tbody tr");
        const results = [];

        for (const row of rows) {
            if (results.length >= 10) break;
            const cells = row.querySelectorAll("td");
            if (cells.length < 3) continue;

            const nameCell = cells[0];
            const titleLink = nameCell.querySelector("a");
            let title = (titleLink ? titleLink.textContent : nameCell.textContent).trim().replace(/\[.*?\]/g, "").trim();

            const artistCell = cells[1];
            const artistLink = artistCell.querySelector("a");
            let channel = (artistLink ? artistLink.textContent : artistCell.textContent).trim().replace(/\[.*?\]/g, "").trim();

            // Parse views — column may contain "16.70" (billions) or "16.70 billion" or raw number
            let views = 0;
            const viewsCell = cells[viewsColIndex] || cells[2];
            if (viewsCell) {
                const text = viewsCell.textContent.replace(/,/g, "").trim();
                const billionMatch = text.match(/([\d.]+)\s*billion/i);
                if (billionMatch) {
                    views = Math.round(parseFloat(billionMatch[1]) * 1_000_000_000);
                } else {
                    const numMatch = text.match(/([\d.]+)/);
                    if (numMatch) {
                        const num = parseFloat(numMatch[1]);
                        // If it's a small decimal, it's in billions
                        views = num < 1000 ? Math.round(num * 1_000_000_000) : Math.round(num);
                    }
                }
            }

            if (!title || views === 0) continue;

            // Look up known video ID by title
            const videoId = TOP_VIDEO_IDS[title] || "";

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
