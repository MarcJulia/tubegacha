require("dotenv").config();
const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const db = new Database(path.join(__dirname, "tubegacha.db"));

db.pragma("journal_mode = WAL");

// --- Schema (only players table for arena ratings) ---
// Collection, game state, battle history, and settings are all stored
// client-side in localStorage for per-player persistence.

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
    const apiKey = process.env.YOUTUBE_API_KEY || req.body.apiKey;

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

// Opponents (procedurally generated)
app.get("/api/opponents", (req, res) => {
    const count = parseInt(req.query.count) || 4;
    res.json(generateOpponents(count));
});

// --- Arena Matchmaking ---

// --- Async PvP Arena ---
db.exec(`
    CREATE TABLE IF NOT EXISTS players (
        player_id TEXT PRIMARY KEY,
        name TEXT DEFAULT '',
        avatar TEXT DEFAULT '',
        rating INTEGER DEFAULT 1000,
        arena_wins INTEGER DEFAULT 0,
        arena_losses INTEGER DEFAULT 0,
        defense_cards TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS attack_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        attacker_id TEXT NOT NULL,
        attacker_name TEXT NOT NULL,
        attacker_avatar TEXT DEFAULT '',
        defender_id TEXT NOT NULL,
        defender_name TEXT NOT NULL,
        attacker_won INTEGER NOT NULL,
        score TEXT NOT NULL,
        attacker_rating_change INTEGER DEFAULT 0,
        defender_rating_change INTEGER DEFAULT 0,
        date TEXT DEFAULT (datetime('now'))
    );
`);

// Add columns if upgrading from old schema
try { db.exec("ALTER TABLE players ADD COLUMN name TEXT DEFAULT ''"); } catch (e) {}
try { db.exec("ALTER TABLE players ADD COLUMN avatar TEXT DEFAULT ''"); } catch (e) {}
try { db.exec("ALTER TABLE players ADD COLUMN defense_cards TEXT DEFAULT '[]'"); } catch (e) {}

const arenaStmts = {
    getPlayer: db.prepare("SELECT * FROM players WHERE player_id = ?"),
    upsertPlayer: db.prepare(`
        INSERT INTO players (player_id, name, avatar, rating, arena_wins, arena_losses, defense_cards)
        VALUES (@player_id, @name, @avatar, 1000, 0, 0, '[]')
        ON CONFLICT(player_id) DO UPDATE SET name=@name, avatar=@avatar
    `),
    setDefense: db.prepare("UPDATE players SET defense_cards = ? WHERE player_id = ?"),
    findOpponents: db.prepare(`
        SELECT player_id, name, avatar, rating, arena_wins, arena_losses, defense_cards
        FROM players
        WHERE player_id != ? AND defense_cards != '[]'
        ORDER BY ABS(rating - ?) ASC
        LIMIT ?
    `),
    updateWin: db.prepare("UPDATE players SET rating = rating + ?, arena_wins = arena_wins + 1 WHERE player_id = ?"),
    updateLoss: db.prepare("UPDATE players SET rating = MAX(0, rating + ?), arena_losses = arena_losses + 1 WHERE player_id = ?"),
    addAttackLog: db.prepare(`
        INSERT INTO attack_log (attacker_id, attacker_name, attacker_avatar, defender_id, defender_name, attacker_won, score, attacker_rating_change, defender_rating_change)
        VALUES (@attacker_id, @attacker_name, @attacker_avatar, @defender_id, @defender_name, @attacker_won, @score, @attacker_rating_change, @defender_rating_change)
    `),
    getDefenseLog: db.prepare(`
        SELECT * FROM attack_log WHERE defender_id = ? ORDER BY date DESC LIMIT 20
    `),
    getAttackLog: db.prepare(`
        SELECT * FROM attack_log WHERE attacker_id = ? ORDER BY date DESC LIMIT 20
    `),
};

function calcElo(winnerRating, loserRating) {
    const K = 32;
    const expected = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
    return Math.round(K * (1 - expected));
}

// Register / update player profile
app.post("/api/arena/register", (req, res) => {
    const { playerId, name, avatar } = req.body;
    if (!playerId) return res.status(400).json({ error: "playerId required" });
    arenaStmts.upsertPlayer.run({ player_id: playerId, name: name || "", avatar: avatar || "" });
    const player = arenaStmts.getPlayer.get(playerId);
    res.json(player);
});

// Get player info
app.get("/api/arena/player/:id", (req, res) => {
    const player = arenaStmts.getPlayer.get(req.params.id);
    if (!player) return res.json({ player_id: req.params.id, name: "", avatar: "", rating: 1000, arena_wins: 0, arena_losses: 0, defense_cards: "[]" });
    res.json(player);
});

// Set defense formation
app.post("/api/arena/defense", (req, res) => {
    const { playerId, cards } = req.body;
    if (!playerId || !cards || cards.length !== 3) {
        return res.status(400).json({ error: "Need playerId and 3 cards" });
    }
    arenaStmts.setDefense.run(JSON.stringify(cards), playerId);
    res.json({ ok: true });
});

// Battle — find random opponent near your rating and fight
app.post("/api/arena/battle", (req, res) => {
    const { attackerId, attackCards } = req.body;
    if (!attackerId || !attackCards || attackCards.length !== 3) {
        return res.status(400).json({ error: "Need attackerId and 3 attack cards" });
    }

    const attacker = arenaStmts.getPlayer.get(attackerId);
    const attackerRating = attacker ? attacker.rating : 1000;

    // Find random opponent near rating with a defense set
    const opponents = arenaStmts.findOpponents.all(attackerId, attackerRating, 20);
    if (opponents.length === 0) {
        return res.status(404).json({ error: "No opponents found. Wait for others to set their defense!" });
    }

    // Pick a random one from the pool
    const defender = opponents[Math.floor(Math.random() * opponents.length)];
    const defenseCards = JSON.parse(defender.defense_cards);
    const defenderRating = defender.rating;

    const result = computeBattle(attackCards, defenseCards);

    const eloGain = calcElo(
        result.attackerWon ? attackerRating : defenderRating,
        result.attackerWon ? defenderRating : attackerRating
    );

    const atkChange = result.attackerWon ? eloGain : -eloGain;
    const defChange = result.attackerWon ? -eloGain : eloGain;

    if (result.attackerWon) {
        arenaStmts.updateWin.run(eloGain, attackerId);
        arenaStmts.updateLoss.run(-eloGain, defender.player_id);
    } else {
        arenaStmts.updateLoss.run(-eloGain, attackerId);
        arenaStmts.updateWin.run(eloGain, defender.player_id);
    }

    arenaStmts.addAttackLog.run({
        attacker_id: attackerId,
        attacker_name: attacker ? attacker.name : "",
        attacker_avatar: attacker ? attacker.avatar : "",
        defender_id: defender.player_id,
        defender_name: defender.name,
        attacker_won: result.attackerWon ? 1 : 0,
        score: result.score,
        attacker_rating_change: atkChange,
        defender_rating_change: defChange,
    });

    res.json({
        opponent: { name: defender.name, avatar: defender.avatar, rating: defenderRating },
        defenseCards,
        attackerWon: result.attackerWon,
        score: result.score,
        lanes: result.lanes,
        eloChange: atkChange,
        newRating: attackerRating + atkChange,
    });
});

// Get defense log (attacks against you)
app.get("/api/arena/defense-log/:playerId", (req, res) => {
    const logs = arenaStmts.getDefenseLog.all(req.params.playerId);
    res.json(logs);
});

// Server-side battle computation (deterministic, matches client logic)
function computeBattle(atkCards, defCards) {
    const ELEMENT_PROFILES = {
        "Music": { atkMul: 1.25, defMul: 0.90, hpMul: 0.95 },
        "Comedy": { atkMul: 1.10, defMul: 0.85, hpMul: 1.15 },
        "Education": { atkMul: 0.90, defMul: 1.25, hpMul: 1.00 },
        "Tech": { atkMul: 1.15, defMul: 1.10, hpMul: 0.85 },
        "Entertainment": { atkMul: 1.05, defMul: 0.95, hpMul: 1.10 },
        "Food": { atkMul: 0.85, defMul: 1.05, hpMul: 1.25 },
        "Travel": { atkMul: 0.95, defMul: 1.15, hpMul: 1.05 },
        "Gaming": { atkMul: 1.20, defMul: 1.00, hpMul: 0.90 },
        "Fitness": { atkMul: 1.10, defMul: 1.05, hpMul: 1.00 },
        "Art": { atkMul: 1.00, defMul: 1.00, hpMul: 1.15 },
    };
    const TYPE_ADV = {
        "Music": ["Comedy", "Art"], "Comedy": ["Education", "Fitness"],
        "Education": ["Tech", "Gaming"], "Tech": ["Entertainment", "Travel"],
        "Entertainment": ["Music", "Food"], "Food": ["Fitness", "Travel"],
        "Travel": ["Art", "Comedy"], "Gaming": ["Entertainment", "Music"],
        "Fitness": ["Tech", "Gaming"], "Art": ["Education", "Food"],
    };
    const RARITY_TIERS = [
        { min: 5e9, atk: 1200, def: 1000, hp: 7000 },
        { min: 1e9, atk: 950, def: 800, hp: 5500 },
        { min: 5e8, atk: 820, def: 700, hp: 4800 },
        { min: 1e8, atk: 720, def: 600, hp: 4200 },
        { min: 1e7, atk: 520, def: 440, hp: 3000 },
        { min: 1e6, atk: 350, def: 300, hp: 2100 },
        { min: 0,   atk: 200, def: 170, hp: 1400 },
    ];

    function getStats(card) {
        let tier = RARITY_TIERS[RARITY_TIERS.length - 1];
        for (const t of RARITY_TIERS) { if (card.views >= t.min) { tier = t; break; } }
        const el = ELEMENT_PROFILES[card.category] || ELEMENT_PROFILES["Entertainment"];
        const variance = 1 + (card.views % 1000) / 5000;
        return {
            atk: Math.round(tier.atk * el.atkMul * variance),
            def: Math.round(tier.def * el.defMul * variance),
            hp: Math.round(tier.hp * el.hpMul * variance),
        };
    }

    function getTypeMul(atkCat, defCat) {
        if ((TYPE_ADV[atkCat] || []).includes(defCat)) return 1.75;
        if ((TYPE_ADV[defCat] || []).includes(atkCat)) return 0.55;
        return 1;
    }

    let atkLanes = 0, defLanes = 0;
    const lanes = [];
    for (let i = 0; i < 3; i++) {
        const aS = getStats(atkCards[i]), dS = getStats(defCards[i]);
        const aMul = getTypeMul(atkCards[i].category, defCards[i].category);
        const dMul = getTypeMul(defCards[i].category, atkCards[i].category);
        let aHp = aS.hp, dHp = dS.hp;

        for (let t = 0; t < 25 && aHp > 0 && dHp > 0; t++) {
            dHp -= Math.max(1, Math.round((aS.atk * aMul) - dS.def * 0.3));
            aHp -= Math.max(1, Math.round((dS.atk * dMul) - aS.def * 0.3));
        }

        let winner = "draw";
        if (aHp > dHp) { winner = "attacker"; atkLanes++; }
        else if (dHp > aHp) { winner = "defender"; defLanes++; }
        lanes.push({ winner, aHpLeft: Math.max(0, aHp), dHpLeft: Math.max(0, dHp) });
    }

    return {
        attackerWon: atkLanes >= defLanes,
        score: `${atkLanes}-${defLanes}`,
        lanes,
    };
}

// Top 10 — proxy Wikipedia fetch to avoid CORS issues
app.get("/api/top10", async (req, res) => {
    const WIKI_API = "https://en.wikipedia.org/api/rest_v1/page/html/List_of_most-viewed_YouTube_videos";
    try {
        const resp = await fetch(WIKI_API);
        if (!resp.ok) throw new Error("Wiki fetch failed");
        const html = await resp.text();
        res.set("Content-Type", "text/html");
        res.send(html);
    } catch (err) {
        res.status(502).json({ error: err.message });
    }
});

// Status
app.get("/api/status", (req, res) => {
    res.json({
        hasApiKey: !!process.env.YOUTUBE_API_KEY,
        bufferSize: videoBuffer.length,
    });
});

app.listen(PORT, () => {
    console.log(`TubeGacha server running at http://localhost:${PORT}`);
});
