require("dotenv").config();
const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const db = new Database(path.join(__dirname, "tubegacha.db"));

db.pragma("journal_mode = WAL");

// --- Schema ---
db.exec(`
    CREATE TABLE IF NOT EXISTS collection (
        video_id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        channel TEXT NOT NULL,
        views INTEGER NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        count INTEGER DEFAULT 1,
        obtained_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS game_state (
        key TEXT PRIMARY KEY,
        value TEXT
    );

    CREATE TABLE IF NOT EXISTS battle_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        opponent TEXT NOT NULL,
        won INTEGER NOT NULL,
        score TEXT NOT NULL,
        mode TEXT DEFAULT 'raid',
        date TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );
`);

// --- Prepared statements ---
const stmts = {
    getCollection: db.prepare("SELECT * FROM collection ORDER BY obtained_at DESC"),
    getCollectionEntry: db.prepare("SELECT * FROM collection WHERE video_id = ?"),
    addToCollection: db.prepare(`
        INSERT INTO collection (video_id, title, channel, views, category, description, count)
        VALUES (@video_id, @title, @channel, @views, @category, @description, 1)
        ON CONFLICT(video_id) DO UPDATE SET count = count + 1
    `),

    getState: db.prepare("SELECT value FROM game_state WHERE key = ?"),
    setState: db.prepare("INSERT OR REPLACE INTO game_state (key, value) VALUES (?, ?)"),

    addBattle: db.prepare("INSERT INTO battle_history (opponent, won, score, mode) VALUES (?, ?, ?, ?)"),
    getBattles: db.prepare("SELECT * FROM battle_history ORDER BY date DESC LIMIT 20"),

    getSetting: db.prepare("SELECT value FROM settings WHERE key = ?"),
    setSetting: db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)"),
};

// --- YouTube API ---
const YT_CATEGORIES = {
    "1": "Entertainment", "2": "Entertainment", "10": "Music",
    "15": "Gaming", "17": "Entertainment", "19": "Travel",
    "20": "Gaming", "22": "Entertainment", "23": "Comedy",
    "24": "Entertainment", "25": "Education", "26": "Education",
    "27": "Education", "28": "Tech", "29": "Entertainment",
};

const SEARCH_TERMS = [
    "music video", "comedy sketch", "science explained", "programming tutorial",
    "gaming highlights", "cooking recipe", "travel vlog", "viral video",
    "workout fitness", "art drawing", "most viewed", "funny moments",
    "how to", "unboxing", "reaction video", "documentary", "animation",
    "live performance", "nature wildlife", "space exploration", "history",
    "piano cover", "dance choreography", "street food", "home renovation",
    "car review", "movie trailer", "stand up comedy", "guitar lesson",
    "yoga meditation", "skateboarding tricks", "dog training", "magic tricks",
];

const REGIONS = ["US", "GB", "JP", "BR", "IN", "DE", "FR", "KR", "MX", "CA"];

// In-memory buffer of videos fetched from YouTube but not yet pulled
let videoBuffer = [];

async function refillBuffer(apiKey) {
    // Randomly pick between mostPopular (1 quota unit) and search (100 units)
    const useSearch = Math.random() < 0.3;

    if (useSearch) {
        const term = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(term)}&type=video&order=viewCount&maxResults=20&key=${apiKey}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error((await resp.json()).error?.message || resp.statusText);
        const data = await resp.json();

        const ids = data.items.map(i => i.id.videoId).filter(Boolean).join(",");
        if (!ids) return;

        const detailUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids}&key=${apiKey}`;
        const detailResp = await fetch(detailUrl);
        if (!detailResp.ok) return;
        const detailData = await detailResp.json();

        addToBuffer(detailData.items, null);
    } else {
        const region = REGIONS[Math.floor(Math.random() * REGIONS.length)];
        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=${region}&maxResults=50&key=${apiKey}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error((await resp.json()).error?.message || resp.statusText);
        const data = await resp.json();

        addToBuffer(data.items, null);
    }
}

function addToBuffer(items, forceCat) {
    for (const item of items) {
        if (!item.statistics?.viewCount) continue;
        const views = parseInt(item.statistics.viewCount, 10);
        if (views < 10000) continue;

        const id = typeof item.id === "string" ? item.id : item.id?.videoId;
        if (!id) continue;

        // Skip duplicates already in buffer
        if (videoBuffer.find(v => v.id === id)) continue;

        const catId = item.snippet?.categoryId || "";
        const category = forceCat || YT_CATEGORIES[catId] || "Entertainment";

        videoBuffer.push({
            id,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            views,
            category,
            description: (item.snippet.description || "").slice(0, 200),
        });
    }

    // Shuffle buffer so pulls aren't ordered by view count
    for (let i = videoBuffer.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [videoBuffer[i], videoBuffer[j]] = [videoBuffer[j], videoBuffer[i]];
    }
}

// --- Opponent Generator ---
const OPP_PREFIXES = ["xX_", "Dr_", "Sir_", "El_", "MC_", "DJ_", "Pro_", "Neo_", "Dark", "Big", "Lil_", "Mr_", "The_", "Not_", "Ultra", "Mega", ""];
const OPP_CORES = ["Viral", "Click", "Algo", "Pixel", "Meme", "Tube", "Stream", "Trending", "Buff", "Chaos", "Sonic", "Byte", "Turbo", "Shadow", "Blaze", "Neon", "Chill", "Zen", "Hype", "Snack", "Rogue", "Flux", "Ghost", "Nova", "Storm", "Glitch", "Sage", "Drift", "Ember", "Frost", "Wolf", "Hawk", "Viper", "Titan"];
const OPP_SUFFIXES = ["King", "Lord", "Master", "Boss", "God", "Slayer", "Hunter", "Wizard", "Knight", "Ninja", "Chief", "Prime", "X", "9000", "42", "99", "404", "Hero", "Reaper", "Guru", "_Xx", "IRL", "TV", "HD", "Pro", ""];
const OPP_AVATARS = ["👑", "🎸", "🎓", "🤖", "📼", "⚡", "👨‍🍳", "🌍", "💀", "💎", "🖱️", "🕹️", "🔥", "❄️", "🎭", "🐉", "🦊", "🎯", "🧠", "💣", "🌟", "🎲", "🏆", "🗡️", "🛡️", "🧪", "📡", "🎪", "🦁", "🐺"];
const OPP_TITLES = ["Meme Hoarder", "Music Fanatic", "Knowledge Seeker", "Silicon Valley Stan", "Vintage Collector", "Algorithm's Favorite", "Culinary Curator", "Globe Trotter", "Comedy Connoisseur", "Legendary Hunter", "Thumbnail Tactician", "Pixel Warrior", "Content Goblin", "Trending Chaser", "Subscribe Spammer", "Notification Bell Ringer", "Comment Section Boss", "Clickbait Artist", "Watch Time Farmer", "Playlist Overlord", "Buffer Breaker", "Resolution Snob", "Ad Skipper Elite", "Premiere Camper"];
const OPP_FLAVORS = [
    "Collects only the dankest memes.", "Their playlist is their weapon.", "Educates opponents into submission.",
    "Disrupts the competition.", "Only watches pre-2010 classics.", "The algorithm feeds them legendary pulls.",
    "Wins battles with taste.", "Has watched every travel vlog ever.", "Dies laughing, then wins.",
    "Rumored to have every mythic card.", "You WON'T BELIEVE their collection.", "Still waiting for Half-Life 3.",
    "Subscribed to every channel.", "Never skips an ad. Never.", "Watches at 2x speed. Always.",
    "Has opinions about every video.", "Their watch history is terrifying.", "Peaked during Vine era.",
    "Only watches in 4K. Minimum.", "Comments 'first' on everything.", "Has 47 playlists and counting.",
    "Thinks buffering builds character.", "Refuses to use headphones.", "Has strong opinions about thumbnails.",
];

function generateOpponents(count) {
    const opponents = [];
    const usedNames = new Set();

    for (let i = 0; i < count; i++) {
        let name;
        do {
            const pre = OPP_PREFIXES[Math.floor(Math.random() * OPP_PREFIXES.length)];
            const core = OPP_CORES[Math.floor(Math.random() * OPP_CORES.length)];
            const suf = OPP_SUFFIXES[Math.floor(Math.random() * OPP_SUFFIXES.length)];
            name = pre + core + suf;
        } while (usedNames.has(name));
        usedNames.add(name);

        opponents.push({
            name,
            avatar: OPP_AVATARS[Math.floor(Math.random() * OPP_AVATARS.length)],
            title: OPP_TITLES[Math.floor(Math.random() * OPP_TITLES.length)],
            difficulty: Math.floor(Math.random() * 3) + 1,
            flavor: OPP_FLAVORS[Math.floor(Math.random() * OPP_FLAVORS.length)],
        });
    }
    return opponents;
}

// --- Middleware ---
app.use(express.json());
app.use(express.static(__dirname));

// --- API Routes ---

// Pull cards — fetches from YouTube on demand
app.post("/api/pull", async (req, res) => {
    const count = parseInt(req.body.count) || 3;
    const apiKey = process.env.YOUTUBE_API_KEY || stmts.getSetting.get("youtube_api_key")?.value;

    if (!apiKey) {
        return res.status(400).json({ error: "No YouTube API key configured. Set YOUTUBE_API_KEY in .env or add one in Settings." });
    }

    // Refill buffer if needed
    while (videoBuffer.length < count) {
        try {
            await refillBuffer(apiKey);
        } catch (err) {
            return res.status(500).json({ error: `YouTube fetch failed: ${err.message}` });
        }
    }

    // Pop cards from buffer
    const cards = videoBuffer.splice(0, count);
    res.json(cards);
});

// Collection
app.get("/api/collection", (req, res) => {
    res.json(stmts.getCollection.all());
});

app.post("/api/collection/add", (req, res) => {
    const { video_id, title, channel, views, category, description } = req.body;
    if (!video_id) return res.status(400).json({ error: "video_id required" });
    stmts.addToCollection.run({
        video_id,
        title: title || "",
        channel: channel || "",
        views: views || 0,
        category: category || "Entertainment",
        description: description || "",
    });
    res.json({ ok: true });
});

// Game state
app.get("/api/state/:key", (req, res) => {
    const row = stmts.getState.get(req.params.key);
    res.json({ value: row ? JSON.parse(row.value) : null });
});

app.post("/api/state/:key", (req, res) => {
    stmts.setState.run(req.params.key, JSON.stringify(req.body.value));
    res.json({ ok: true });
});

// Battle history
app.get("/api/battles", (req, res) => {
    res.json(stmts.getBattles.all());
});

app.post("/api/battles", (req, res) => {
    const { opponent, won, score, mode } = req.body;
    stmts.addBattle.run(opponent, won ? 1 : 0, score, mode || "raid");
    res.json({ ok: true });
});

// Opponents (procedurally generated)
app.get("/api/opponents", (req, res) => {
    const count = parseInt(req.query.count) || 4;
    res.json(generateOpponents(count));
});

// Settings
app.get("/api/settings/:key", (req, res) => {
    const row = stmts.getSetting.get(req.params.key);
    res.json({ value: row ? row.value : null });
});

app.post("/api/settings/:key", (req, res) => {
    stmts.setSetting.run(req.params.key, req.body.value);
    res.json({ ok: true });
});

// Status
app.get("/api/status", (req, res) => {
    const hasApiKey = !!(process.env.YOUTUBE_API_KEY || stmts.getSetting.get("youtube_api_key")?.value);
    const collectionCount = stmts.getCollection.all().length;
    res.json({
        hasApiKey,
        collectionCount,
        bufferSize: videoBuffer.length,
    });
});

app.listen(PORT, () => {
    console.log(`TubeGacha server running at http://localhost:${PORT}`);
});
