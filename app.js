// TubeGacha - YouTube Video Card Collector with Raid Battles
// Migrated to server/SQLite backend via videos.js API helpers

(function () {
    "use strict";

    // --- Constants ---
    const PACKS_PER_DAY = 3;
    const CARDS_PER_PACK = 3;
    const RAIDS_PER_DAY = 2;
    const BATTLE_ROUNDS = 3;

    // Rarity tiers with base combat stats (big numbers)
    const RARITY_TIERS = [
        { name: "mythic",     label: "Mythic",     min: 5_000_000_000, color: "#ff44cc", weight: 1,  atk: 1200, def: 1000, hp: 7000 },
        { name: "legendary",  label: "Legendary",  min: 1_000_000_000, color: "#ffb628", weight: 3,  atk: 950,  def: 800,  hp: 5500 },
        { name: "epic",       label: "Epic",       min: 500_000_000,   color: "#ff6b35", weight: 5,  atk: 820,  def: 700,  hp: 4800 },
        { name: "super-rare", label: "Super Rare", min: 100_000_000,   color: "#c24eff", weight: 8,  atk: 720,  def: 600,  hp: 4200 },
        { name: "rare",       label: "Rare",       min: 10_000_000,    color: "#4a9eff", weight: 18, atk: 520,  def: 440,  hp: 3000 },
        { name: "uncommon",   label: "Uncommon",   min: 1_000_000,     color: "#4ec94e", weight: 30, atk: 350,  def: 300,  hp: 2100 },
        { name: "common",     label: "Common",     min: 0,             color: "#8899aa", weight: 35, atk: 200,  def: 170,  hp: 1400 },
    ];

    // Elemental stat profiles per category
    const ELEMENT_PROFILES = {
        "Music":         { atkMul: 1.25, defMul: 0.90, hpMul: 0.95, element: "Sonic" },
        "Comedy":        { atkMul: 1.10, defMul: 0.85, hpMul: 1.15, element: "Chaos" },
        "Education":     { atkMul: 0.90, defMul: 1.25, hpMul: 1.00, element: "Wisdom" },
        "Tech":          { atkMul: 1.15, defMul: 1.10, hpMul: 0.85, element: "Circuit" },
        "Entertainment": { atkMul: 1.05, defMul: 0.95, hpMul: 1.10, element: "Spectacle" },
        "Food":          { atkMul: 0.85, defMul: 1.05, hpMul: 1.25, element: "Hearth" },
        "Travel":        { atkMul: 0.95, defMul: 1.15, hpMul: 1.05, element: "Wanderer" },
        "Gaming":        { atkMul: 1.20, defMul: 1.00, hpMul: 0.90, element: "Pixel" },
        "Fitness":       { atkMul: 1.10, defMul: 1.05, hpMul: 1.00, element: "Iron" },
        "Art":           { atkMul: 1.00, defMul: 1.00, hpMul: 1.15, element: "Muse" },
    };

    // --- State (populated async from server in init) ---
    let state = {
        collection: [],
        packsLeft: PACKS_PER_DAY,
        raidsLeft: RAIDS_PER_DAY,
        lastPackDay: getTodayKey(),
        totalPacksOpened: 0,
        raidsWon: 0,
        raidsLost: 0,
        cardsStolen: 0,
        battleHistory: [],
    };

    let raidState = {
        selectedCards: [],
        opponent: null,
        opponentCards: [],
        phase: "lobby",
    };

    let AI_OPPONENTS = [];

    // --- Profile System ---
    const PROFILE_AVATARS = [
        "😎", "🤠", "👾", "🦊", "🐉", "🎮", "🎸", "🎯", "🔥", "💎",
        "🌟", "🎪", "🧠", "🦁", "🐺", "🎭", "👑", "⚡", "🗡️", "🛡️",
        "🎲", "🏆", "🌈", "🍀", "🎵", "🚀", "🦅", "🐧", "🤖", "👻",
        "🧙", "🥷", "🧛", "🧜", "💀", "🎃", "🌸", "🍕", "☠️", "🦄",
    ];

    const NAME_PREFIXES = [
        "Shadow", "Neon", "Turbo", "Ultra", "Mega", "Dark", "Pixel", "Hyper",
        "Cosmic", "Blaze", "Frost", "Storm", "Cyber", "Nova", "Drift", "Rogue",
        "Lucky", "Silent", "Golden", "Iron", "Crystal", "Mystic", "Epic", "Sonic",
    ];

    const NAME_SUFFIXES = [
        "Hunter", "Wolf", "Hawk", "Fox", "Dragon", "Knight", "Ninja", "Sage",
        "Rider", "Ghost", "Blade", "Spark", "Viper", "Titan", "Phoenix", "Reaper",
        "Wizard", "Chief", "Ace", "Shark", "Panda", "Falcon", "Cobra", "Raven",
    ];

    function generateRandomName() {
        const pre = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)];
        const suf = NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];
        return pre + suf;
    }

    function generateRandomAvatar() {
        return PROFILE_AVATARS[Math.floor(Math.random() * PROFILE_AVATARS.length)];
    }

    function getProfile() {
        return {
            username: lsGet("profile_username", null),
            avatar: lsGet("profile_avatar", null),
        };
    }

    function initProfile() {
        let profile = getProfile();
        if (!profile.username) {
            profile.username = generateRandomName();
            lsSet("profile_username", profile.username);
        }
        if (!profile.avatar) {
            profile.avatar = generateRandomAvatar();
            lsSet("profile_avatar", profile.avatar);
        }
        updateProfileDisplay();
    }

    function updateProfileDisplay() {
        const profile = getProfile();
        document.getElementById("header-avatar").textContent = profile.avatar;
        document.getElementById("header-username").textContent = profile.username;
    }

    function renderProfileEditor() {
        const profile = getProfile();

        document.getElementById("profile-name-input").value = profile.username;
        document.getElementById("profile-current-avatar").textContent = profile.avatar;

        const grid = document.getElementById("profile-avatar-grid");
        grid.innerHTML = "";
        PROFILE_AVATARS.forEach(emoji => {
            const btn = document.createElement("button");
            btn.className = "avatar-option" + (emoji === profile.avatar ? " selected" : "");
            btn.textContent = emoji;
            btn.addEventListener("click", () => {
                lsSet("profile_avatar", emoji);
                updateProfileDisplay();
                renderProfileEditor();
            });
            grid.appendChild(btn);
        });
    }

    function saveProfile() {
        const name = document.getElementById("profile-name-input").value.trim();
        if (!name) return;
        lsSet("profile_username", name);
        updateProfileDisplay();
        const status = document.getElementById("profile-save-status");
        status.textContent = "Profile saved!";
        status.style.color = "#4ec94e";
        setTimeout(() => status.textContent = "", 2000);
    }

    // --- Helpers ---
    function getRarity(video) {
        for (const tier of RARITY_TIERS) {
            if (video.views >= tier.min) return tier;
        }
        return RARITY_TIERS[RARITY_TIERS.length - 1];
    }

    function getCardStats(video) {
        const rarity = getRarity(video);
        const profile = ELEMENT_PROFILES[video.category] || { atkMul: 1, defMul: 1, hpMul: 1, element: "Neutral" };

        const tierRange = rarity.min === 0 ? 1_000_000 : rarity.min * 9;
        const viewsInTier = Math.min(video.views - rarity.min, tierRange);
        const tierProgress = viewsInTier / tierRange;
        const variance = Math.floor(tierProgress * 150);

        const rawAtk = rarity.atk + variance;
        const rawDef = rarity.def + Math.floor(variance * 0.8);
        const rawHp = rarity.hp + variance * 4;

        return {
            atk: Math.floor(rawAtk * profile.atkMul),
            def: Math.floor(rawDef * profile.defMul),
            hp: Math.floor(rawHp * profile.hpMul),
            element: profile.element,
            category: video.category,
        };
    }

    function getTypeMultiplier(attackerCat, defenderCat) {
        const advantages = TYPE_ADVANTAGES[attackerCat] || [];
        const defAdv = TYPE_ADVANTAGES[defenderCat] || [];
        const strong = advantages.includes(defenderCat);
        const weak = defAdv.includes(attackerCat);

        if (strong && weak) return 1.0;
        if (strong) return 1.75;
        if (weak) return 0.55;
        return 1.0;
    }

    function getTypeLabel(attackerCat, defenderCat) {
        const mult = getTypeMultiplier(attackerCat, defenderCat);
        if (mult > 1) return "SUPER EFFECTIVE!";
        if (mult < 1) return "Not very effective...";
        return "";
    }

    function formatViews(n) {
        if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
        if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
        return n.toString();
    }

    function getTodayKey() {
        return new Date().toISOString().slice(0, 10);
    }

    // --- Server-backed state loading ---
    async function loadStateFromServer() {
        const [collection, battleHistory, packsLeftVal, raidsLeftVal, lastPackDayVal, totalPacksVal, raidsWonVal, raidsLostVal, cardsStolenVal] = await Promise.all([
            loadCollection(),
            loadBattleHistory(),
            loadGameState("packsLeft"),
            loadGameState("raidsLeft"),
            loadGameState("lastPackDay"),
            loadGameState("totalPacksOpened"),
            loadGameState("raidsWon"),
            loadGameState("raidsLost"),
            loadGameState("cardsStolen"),
        ]);

        const today = getTodayKey();
        const lastDay = lastPackDayVal || today;
        const isNewDay = lastDay !== today;

        state.collection = collection;
        state.battleHistory = battleHistory;
        state.packsLeft = isNewDay ? PACKS_PER_DAY : (packsLeftVal ?? PACKS_PER_DAY);
        state.raidsLeft = isNewDay ? RAIDS_PER_DAY : (raidsLeftVal ?? RAIDS_PER_DAY);
        state.lastPackDay = today;
        state.totalPacksOpened = totalPacksVal || 0;
        state.raidsWon = raidsWonVal || 0;
        state.raidsLost = raidsLostVal || 0;
        state.cardsStolen = cardsStolenVal || 0;

        if (isNewDay) {
            await saveGameState("lastPackDay", today);
            await saveGameState("packsLeft", PACKS_PER_DAY);
            await saveGameState("raidsLeft", RAIDS_PER_DAY);
        }
    }

    async function savePacksLeft() {
        await saveGameState("packsLeft", state.packsLeft);
    }

    async function saveRaidsLeft() {
        await saveGameState("raidsLeft", state.raidsLeft);
    }

    async function saveStatsToServer() {
        await Promise.all([
            saveGameState("totalPacksOpened", state.totalPacksOpened),
            saveGameState("raidsWon", state.raidsWon),
            saveGameState("raidsLost", state.raidsLost),
            saveGameState("cardsStolen", state.cardsStolen),
        ]);
    }

    async function addToServerCollection(video) {
        await addCardToCollection(video);
    }

    async function addBattleToServer(opponent, won, score, mode) {
        await saveBattle(opponent, won, score, mode);
    }

    function getVideoById(videoId) {
        const entry = state.collection.find(c => c.videoId === videoId);
        if (!entry) return null;
        return {
            id: entry.videoId,
            title: entry.title,
            channel: entry.channel,
            views: entry.views,
            category: entry.category,
            description: entry.description || "",
        };
    }

    function getCollectionEntry(videoId) {
        return state.collection.find(c => c.videoId === videoId);
    }

    function thumbnailUrl(videoId) {
        return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // --- Gacha Logic ---
    // Fetches fresh videos from YouTube via server
    async function rollCards(count) {
        const result = await pullCards(count);
        if (result.error) throw new Error(result.error);
        return result;
    }

    // --- AI Opponent Deck ---
    // Picks 3 random cards from the player's collection as opponent cards
    function generateOpponentDeck() {
        const pool = state.collection.map(e => ({
            id: e.videoId,
            title: e.title,
            channel: e.channel,
            views: e.views,
            category: e.category,
            description: e.description || "",
        }));
        const shuffled = pool.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 3);
    }

    // --- Rarity stars ---
    function rarityStars(rarity) {
        const starMap = { "common": 1, "uncommon": 2, "rare": 3, "super-rare": 4, "epic": 5, "legendary": 6, "mythic": 7 };
        const count = starMap[rarity.name] || 1;
        return '<span class="card-stars">' + "&#9733;".repeat(count) + "</span>";
    }

    // --- Card Rendering ---
    function createCardElement(video, options = {}) {
        const rarity = getRarity(video);
        const entry = getCollectionEntry(video.id);
        const stats = getCardStats(video);
        const isNew = options.isNew || false;
        const isDuplicate = options.isDuplicate || false;
        const selectable = options.selectable || false;
        const selected = options.selected || false;

        const card = document.createElement("div");
        card.className = `video-card rarity-${rarity.name}`;
        if (options.revealClass) card.classList.add(options.revealClass);
        if (selectable) card.classList.add("selectable");
        if (selected) card.classList.add("selected");

        const icon = CATEGORY_ICONS[video.category] || "📺";

        card.innerHTML = `
            <div class="card-frame">
                ${["mythic","legendary","super-rare","epic"].includes(rarity.name) ? '<div class="card-holo-overlay"></div>' : ""}
                ${isNew ? '<div class="new-indicator">NEW</div>' : ""}
                ${isDuplicate && entry ? `<div class="duplicate-badge">&times;${entry.count}</div>` : ""}
                ${selected ? '<div class="selected-indicator">&#10003;</div>' : ""}

                <div class="card-header">
                    <span class="card-name">${escapeHtml(video.title)}</span>
                    <span class="card-hp-badge">HP ${stats.hp}</span>
                </div>

                <div class="card-type-emblem">${icon}</div>

                <div class="card-art-container">
                    <img class="card-thumbnail" src="${thumbnailUrl(video.id)}" alt="${escapeHtml(video.title)}" loading="lazy">
                </div>

                <div class="card-info-bar">
                    <span class="card-channel">${escapeHtml(video.channel)}</span>
                    <span class="card-category-label">${stats.element}</span>
                </div>

                <div class="card-desc-box">
                    <p class="card-flavor">${escapeHtml(video.description)}</p>
                </div>

                <div class="card-stat-bar">
                    <div class="card-stat">
                        <span class="card-stat-icon">&#9876;</span>
                        <span class="card-stat-num stat-atk">${stats.atk}</span>
                    </div>
                    <div class="card-stat">
                        <span class="card-stat-icon">&#128737;</span>
                        <span class="card-stat-num stat-def">${stats.def}</span>
                    </div>
                    <div class="card-stat card-views-stat">
                        <span class="card-stat-icon">&#9655;</span>
                        <span class="card-stat-num">${formatViews(video.views)}</span>
                    </div>
                </div>

                <div class="card-bottom-bar">
                    ${rarityStars(rarity)}
                    <span class="rarity-badge ${rarity.name}">${rarity.label}</span>
                </div>
            </div>
        `;

        if (!selectable) {
            card.addEventListener("click", () => showModal(video));
        }

        card.dataset.videoId = video.id;
        return card;
    }

    function createBattleCardElement(video) {
        const rarity = getRarity(video);
        const stats = getCardStats(video);
        const icon = CATEGORY_ICONS[video.category] || "📺";

        const card = document.createElement("div");
        card.className = `battle-card rarity-${rarity.name}`;
        card.innerHTML = `
            <div class="card-frame">
                ${["mythic","legendary","super-rare","epic"].includes(rarity.name) ? '<div class="card-holo-overlay"></div>' : ""}
                <div class="card-header">
                    <span class="card-name">${escapeHtml(video.title)}</span>
                    <span class="card-hp-badge">HP ${stats.hp}</span>
                </div>
                <div class="card-type-emblem">${icon}</div>
                <div class="card-art-container">
                    <img class="card-thumbnail" src="${thumbnailUrl(video.id)}" alt="${escapeHtml(video.title)}">
                </div>
                <div class="card-stat-bar">
                    <div class="card-stat">
                        <span class="card-stat-icon">&#9876;</span>
                        <span class="card-stat-num stat-atk">${stats.atk}</span>
                    </div>
                    <div class="card-stat">
                        <span class="card-stat-icon">&#128737;</span>
                        <span class="card-stat-num stat-def">${stats.def}</span>
                    </div>
                </div>
                <div class="card-bottom-bar">
                    ${rarityStars(rarity)}
                    <span class="rarity-badge ${rarity.name}">${rarity.label}</span>
                </div>
            </div>
        `;
        return card;
    }

    function escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    function showModal(video) {
        const rarity = getRarity(video);
        const entry = getCollectionEntry(video.id);
        const stats = getCardStats(video);
        const icon = CATEGORY_ICONS[video.category] || "📺";

        const modal = document.getElementById("card-modal");
        const content = document.getElementById("modal-card");

        content.innerHTML = `
            <div class="modal-card-display rarity-${rarity.name}">
                <div class="card-frame modal-frame">
                    ${["mythic","legendary","super-rare","epic"].includes(rarity.name) ? '<div class="card-holo-overlay"></div>' : ""}
                    <div class="card-header">
                        <span class="card-name">${escapeHtml(video.title)}</span>
                        <span class="card-hp-badge">HP ${stats.hp}</span>
                    </div>
                    <div class="card-type-emblem">${icon}</div>
                    <div class="card-art-container modal-art">
                        <img class="card-thumbnail" src="${thumbnailUrl(video.id)}" alt="${escapeHtml(video.title)}">
                    </div>
                    <div class="card-info-bar">
                        <span class="card-channel">${escapeHtml(video.channel)}</span>
                        <span class="card-category-label">${stats.element}</span>
                    </div>
                    <div class="card-desc-box">
                        <p class="card-flavor">${escapeHtml(video.description)}</p>
                    </div>
                    <div class="card-stat-bar">
                        <div class="card-stat">
                            <span class="card-stat-icon">&#9876;</span>
                            <span class="card-stat-num stat-atk">${stats.atk}</span>
                        </div>
                        <div class="card-stat">
                            <span class="card-stat-icon">&#128737;</span>
                            <span class="card-stat-num stat-def">${stats.def}</span>
                        </div>
                        <div class="card-stat card-views-stat">
                            <span class="card-stat-icon">&#9655;</span>
                            <span class="card-stat-num">${formatViews(video.views)}</span>
                        </div>
                    </div>
                    <div class="card-bottom-bar">
                        ${rarityStars(rarity)}
                        <span class="rarity-badge ${rarity.name}">${rarity.label}</span>
                    </div>
                </div>
            </div>
            <div class="modal-meta-section">
                <div class="modal-combat-stats">
                    <div class="modal-stat"><span class="modal-stat-label">ATK</span><span class="modal-stat-val atk">${stats.atk}</span></div>
                    <div class="modal-stat"><span class="modal-stat-label">DEF</span><span class="modal-stat-val def">${stats.def}</span></div>
                    <div class="modal-stat"><span class="modal-stat-label">HP</span><span class="modal-stat-val hp">${stats.hp}</span></div>
                </div>
                <div class="modal-card-meta">
                    <span>${formatViews(video.views)} views</span>
                    <span class="rarity-badge ${rarity.name}">${rarity.label}</span>
                    ${entry ? `<span>Owned: &times;${entry.count}</span>` : ""}
                </div>
                <a class="modal-watch-btn" href="https://www.youtube.com/watch?v=${video.id}" target="_blank" rel="noopener">
                    &#9654; Watch on YouTube
                </a>
            </div>
        `;

        modal.classList.remove("hidden");
    }

    function closeModal() {
        document.getElementById("card-modal").classList.add("hidden");
    }

    // --- Pack Opening ---
    async function openPack() {
        if (state.packsLeft <= 0) return;

        const pack = document.getElementById("pack");
        const container = document.getElementById("pack-container");
        const reveal = document.getElementById("card-reveal");
        const revealedCards = document.getElementById("revealed-cards");

        pack.className = "opening";

        // Fetch cards from YouTube while animation plays
        let cards;
        try {
            cards = await rollCards(CARDS_PER_PACK);
        } catch (err) {
            pack.className = "pack-idle";
            alert("Failed to pull cards: " + err.message);
            return;
        }

        pack.className = "opened";
        await sleep(400);

        container.style.display = "none";
        reveal.classList.remove("hidden");
        revealedCards.innerHTML = "";

        cards.forEach((video) => {
            const existing = getCollectionEntry(video.id);
            const isNew = !existing;
            const card = createCardElement(video, {
                isNew,
                isDuplicate: !isNew,
                revealClass: "card-reveal-item",
                showStats: true,
            });
            revealedCards.appendChild(card);
        });

        window._pendingCards = cards;
    }

    async function collectCards() {
        const cards = window._pendingCards;
        if (!cards) return;

        for (const video of cards) {
            const entry = getCollectionEntry(video.id);
            if (entry) {
                entry.count++;
            } else {
                state.collection.push({
                    videoId: video.id,
                    title: video.title,
                    channel: video.channel,
                    views: video.views,
                    category: video.category,
                    description: video.description || "",
                    obtainedAt: new Date().toISOString(),
                    count: 1,
                });
            }
            await addToServerCollection(video);
        }

        state.packsLeft--;
        state.totalPacksOpened++;
        await Promise.all([savePacksLeft(), saveStatsToServer()]);

        window._pendingCards = null;
        resetPackUI();
    }

    function resetPackUI() {
        const container = document.getElementById("pack-container");
        const reveal = document.getElementById("card-reveal");
        const pack = document.getElementById("pack");

        reveal.classList.add("hidden");
        container.style.display = "flex";

        document.getElementById("packs-left").textContent = state.packsLeft;

        if (state.packsLeft <= 0) {
            pack.className = "disabled";
        } else {
            pack.className = "pack-idle";
        }
    }

    // --- Collection View ---
    function renderCollection(filter = "all") {
        const grid = document.getElementById("collection-grid");
        const empty = document.getElementById("empty-collection");

        let entries = [...state.collection];
        entries.sort((a, b) => new Date(b.obtainedAt) - new Date(a.obtainedAt));

        if (filter !== "all") {
            entries = entries.filter(e => {
                const video = getVideoById(e.videoId);
                return video && getRarity(video).name === filter;
            });
        }

        grid.innerHTML = "";

        if (entries.length === 0) {
            empty.classList.remove("hidden");
            grid.style.display = "none";
            return;
        }

        empty.classList.add("hidden");
        grid.style.display = "grid";

        entries.forEach(entry => {
            const video = getVideoById(entry.videoId);
            if (!video) return;
            const card = createCardElement(video, {
                isDuplicate: entry.count > 1,
                showStats: true,
            });
            grid.appendChild(card);
        });
    }

    // ===========================
    // TOP 10 LEADERBOARD
    // ===========================

    let top10Cache = null;

    async function renderTop10() {
        const list = document.getElementById("top10-list");

        if (!top10Cache) {
            list.innerHTML = '<div class="top10-loading"><div class="loader"></div><p>Fetching live data from Wikipedia...</p></div>';
            top10Cache = await fetchTop10Videos();
        }

        list.innerHTML = "";

        if (top10Cache.length === 0) {
            list.innerHTML = '<p class="empty-msg">Could not load Top 10 data. Try refreshing the page.</p>';
            return;
        }

        top10Cache.forEach((video, i) => {
            const rank = video.rank || i + 1;
            const owned = getCollectionEntry(video.id);
            const rarity = getRarity(video);
            const stats = getCardStats(video);
            const icon = CATEGORY_ICONS[video.category] || "📺";

            const row = document.createElement("div");
            row.className = `top10-row rarity-${rarity.name} ${owned ? "owned" : "not-owned"}`;

            row.innerHTML = `
                <div class="top10-rank rank-${rank}">#${rank}</div>
                <div class="top10-card-frame rarity-${rarity.name}">
                    <div class="card-frame">
                        ${rarity.name === "legendary" ? '<div class="card-holo-overlay"></div>' : ""}
                        <div class="card-art-container">
                            ${video.id
                                ? `<img class="card-thumbnail" src="${thumbnailUrl(video.id)}" alt="${escapeHtml(video.title)}" loading="lazy">`
                                : `<div class="card-thumbnail-placeholder">${icon}</div>`}
                        </div>
                    </div>
                </div>
                <div class="top10-info">
                    <div class="top10-title">${escapeHtml(video.title)}</div>
                    <div class="top10-channel">${icon} ${escapeHtml(video.channel)}</div>
                    <div class="top10-views">${formatViews(video.views)} views</div>
                    <div class="top10-stats">
                        <span class="stat-atk">ATK ${stats.atk}</span>
                        <span class="stat-def">DEF ${stats.def}</span>
                        <span class="stat-hp-val">HP ${stats.hp}</span>
                    </div>
                </div>
                <div class="top10-ownership">
                    ${owned
                        ? `<span class="top10-owned">OWNED &times;${owned.count}</span>`
                        : '<span class="top10-missing">NOT OWNED</span>'}
                </div>
            `;

            if (video.id) {
                row.style.cursor = "pointer";
                row.addEventListener("click", () => showModal(video));
            }

            list.appendChild(row);
        });
    }

    // ===========================
    // RAID & BATTLE SYSTEM
    // ===========================

    function renderRaidLobby() {
        const list = document.getElementById("opponent-list");
        const needCards = document.getElementById("raid-need-cards");

        document.getElementById("raids-left").textContent = state.raidsLeft;

        if (state.collection.length < 3) {
            list.style.display = "none";
            needCards.classList.remove("hidden");
            return;
        }

        needCards.classList.add("hidden");
        list.style.display = "grid";
        list.innerHTML = "";

        const shuffled = [...AI_OPPONENTS].sort(() => Math.random() - 0.5);
        const shown = shuffled.slice(0, 4);

        shown.forEach(opp => {
            const card = document.createElement("div");
            card.className = `opponent-card difficulty-${opp.difficulty}`;

            const diffLabel = opp.difficulty === 1 ? "Easy" : opp.difficulty === 2 ? "Medium" : "Hard";
            const diffClass = opp.difficulty === 1 ? "easy" : opp.difficulty === 2 ? "medium" : "hard";

            card.innerHTML = `
                <div class="opp-avatar">${opp.avatar}</div>
                <div class="opp-info">
                    <div class="opp-name">${escapeHtml(opp.name)}</div>
                    <div class="opp-title">${escapeHtml(opp.title)}</div>
                    <div class="opp-flavor">${escapeHtml(opp.flavor)}</div>
                </div>
                <div class="opp-difficulty ${diffClass}">${diffLabel}</div>
            `;

            if (state.raidsLeft > 0) {
                card.addEventListener("click", () => startRaidSelect(opp));
            } else {
                card.classList.add("disabled");
                card.innerHTML += '<div class="opp-exhausted">No raids left today</div>';
            }

            list.appendChild(card);
        });
    }

    function showRaidPhase(phase) {
        raidState.phase = phase;
        document.getElementById("raid-lobby").classList.toggle("hidden", phase !== "lobby");
        document.getElementById("raid-select").classList.toggle("hidden", phase !== "select");
        document.getElementById("raid-battle").classList.toggle("hidden", phase !== "battle");
        document.getElementById("raid-result").classList.toggle("hidden", phase !== "result");
    }

    function startRaidSelect(opponent) {
        raidState.opponent = opponent;
        raidState.selectedCards = [];
        raidState.opponentCards = generateOpponentDeck();

        document.getElementById("raid-opponent-name").textContent = opponent.name;
        showRaidPhase("select");

        renderSelectGrid();
        updateSelectedSlots();
    }

    function renderSelectGrid() {
        const grid = document.getElementById("raid-select-grid");
        grid.innerHTML = "";

        const entries = [...state.collection].sort((a, b) => {
            const va = getVideoById(a.videoId);
            const vb = getVideoById(b.videoId);
            if (!va || !vb) return 0;
            return getCardStats(vb).atk - getCardStats(va).atk;
        });

        entries.forEach(entry => {
            const video = getVideoById(entry.videoId);
            if (!video) return;

            const isSelected = raidState.selectedCards.includes(video.id);
            const card = createCardElement(video, {
                showStats: true,
                selectable: true,
                selected: isSelected,
            });

            card.addEventListener("click", () => toggleCardSelection(video.id));
            grid.appendChild(card);
        });
    }

    function toggleCardSelection(videoId) {
        const idx = raidState.selectedCards.indexOf(videoId);
        if (idx >= 0) {
            raidState.selectedCards.splice(idx, 1);
        } else if (raidState.selectedCards.length < 3) {
            raidState.selectedCards.push(videoId);
        }
        renderSelectGrid();
        updateSelectedSlots();
    }

    function updateSelectedSlots() {
        const slots = document.querySelectorAll(".selected-slot");
        const btn = document.getElementById("raid-start-btn");

        slots.forEach((slot, i) => {
            if (raidState.selectedCards[i]) {
                const video = getVideoById(raidState.selectedCards[i]);
                slot.className = "selected-slot filled";
                slot.innerHTML = `<img src="${thumbnailUrl(video.id)}" alt="">`;
            } else {
                slot.className = "selected-slot empty";
                slot.textContent = i + 1;
            }
        });

        btn.disabled = raidState.selectedCards.length !== 3;
    }

    async function startBattle() {
        showRaidPhase("battle");

        const playerDeck = raidState.selectedCards.map(id => getVideoById(id));
        const oppDeck = raidState.opponentCards;

        document.getElementById("battle-opp-name").textContent = raidState.opponent.name;
        document.getElementById("player-score").textContent = "0";
        document.getElementById("opponent-score").textContent = "0";

        const log = document.getElementById("battle-log");
        log.innerHTML = "";

        let playerWins = 0;
        let oppWins = 0;
        const roundResults = [];

        for (let round = 0; round < BATTLE_ROUNDS; round++) {
            document.getElementById("battle-round").textContent = round + 1;

            const pVideo = playerDeck[round];
            const oVideo = oppDeck[round];
            const pStats = getCardStats(pVideo);
            const oStats = getCardStats(oVideo);

            const pCardEl = document.getElementById("player-battle-card");
            const oCardEl = document.getElementById("opponent-battle-card");
            pCardEl.innerHTML = "";
            oCardEl.innerHTML = "";
            pCardEl.appendChild(createBattleCardElement(pVideo));
            oCardEl.appendChild(createBattleCardElement(oVideo));

            document.getElementById("player-battle-stats").innerHTML = `
                <span class="stat-atk">ATK ${pStats.atk}</span>
                <span class="stat-def">DEF ${pStats.def}</span>
            `;
            document.getElementById("opponent-battle-stats").innerHTML = `
                <span class="stat-atk">ATK ${oStats.atk}</span>
                <span class="stat-def">DEF ${oStats.def}</span>
            `;

            let pHp = pStats.hp;
            let oHp = oStats.hp;
            updateHpBar("player", pHp, pStats.hp);
            updateHpBar("opponent", oHp, oStats.hp);

            const pMult = getTypeMultiplier(pVideo.category, oVideo.category);
            const oMult = getTypeMultiplier(oVideo.category, pVideo.category);
            const typeInd = document.getElementById("battle-type-indicator");
            if (pMult > 1) {
                typeInd.innerHTML = `<span class="type-advantage player-advantage">${CATEGORY_ICONS[pVideo.category]} &gt; ${CATEGORY_ICONS[oVideo.category]}</span>`;
            } else if (oMult > 1) {
                typeInd.innerHTML = `<span class="type-advantage opponent-advantage">${CATEGORY_ICONS[oVideo.category]} &gt; ${CATEGORY_ICONS[pVideo.category]}</span>`;
            } else {
                typeInd.innerHTML = "";
            }

            addBattleLog(`--- Round ${round + 1} ---`);
            addBattleLog(`${truncate(pVideo.title, 25)} vs ${truncate(oVideo.title, 25)}`);
            if (pMult > 1) addBattleLog(`${pStats.element} is SUPER EFFECTIVE vs ${oStats.element}! (1.75x)`, "advantage");
            if (oMult > 1) addBattleLog(`${oStats.element} is SUPER EFFECTIVE vs ${pStats.element}! (1.75x)`, "disadvantage");

            await sleep(800);

            let turn = 0;
            while (pHp > 0 && oHp > 0 && turn < 20) {
                turn++;

                const pDmg = calcDamage(pStats.atk, oStats.def, pMult);
                oHp = Math.max(0, oHp - pDmg);

                const actionText = document.getElementById("battle-action-text");

                document.getElementById("battle-player-side").classList.add("attacking");
                actionText.textContent = `-${pDmg}`;
                actionText.className = "battle-action-text damage-flash opponent-hit";
                await sleep(400);
                document.getElementById("battle-player-side").classList.remove("attacking");

                updateHpBar("opponent", oHp, oStats.hp);
                addBattleLog(`Your ${truncate(pVideo.title, 20)} deals ${pDmg} damage!`);

                if (oHp <= 0) {
                    actionText.textContent = "KO!";
                    actionText.className = "battle-action-text ko-flash";
                    break;
                }

                await sleep(300);

                const oDmg = calcDamage(oStats.atk, pStats.def, oMult);
                pHp = Math.max(0, pHp - oDmg);

                document.getElementById("battle-opponent-side").classList.add("attacking");
                actionText.textContent = `-${oDmg}`;
                actionText.className = "battle-action-text damage-flash player-hit";
                await sleep(400);
                document.getElementById("battle-opponent-side").classList.remove("attacking");

                updateHpBar("player", pHp, pStats.hp);
                addBattleLog(`Enemy ${truncate(oVideo.title, 20)} deals ${oDmg} damage!`, "enemy");

                if (pHp <= 0) {
                    actionText.textContent = "KO!";
                    actionText.className = "battle-action-text ko-flash";
                    break;
                }

                await sleep(300);
            }

            const playerWon = pHp > oHp;
            if (playerWon) {
                playerWins++;
                addBattleLog(`Your card wins Round ${round + 1}!`, "win");
            } else {
                oppWins++;
                addBattleLog(`Enemy card wins Round ${round + 1}!`, "lose");
            }

            document.getElementById("player-score").textContent = playerWins;
            document.getElementById("opponent-score").textContent = oppWins;

            roundResults.push({
                playerCard: pVideo,
                opponentCard: oVideo,
                playerWon,
                playerHpLeft: pHp,
                opponentHpLeft: oHp,
            });

            if (playerWins === 2 || oppWins === 2) {
                if (round < BATTLE_ROUNDS - 1) {
                    addBattleLog(`Match decided early!`, playerWins === 2 ? "win" : "lose");
                }
                await sleep(1000);
                break;
            }

            await sleep(1200);
        }

        await sleep(800);
        await showBattleResult(playerWins > oppWins, playerWins, oppWins, roundResults);
    }

    function calcDamage(atk, def, typeMultiplier) {
        const baseDmg = Math.max(50, atk - def * 0.35);
        const variance = 0.85 + Math.random() * 0.3;
        return Math.floor(baseDmg * typeMultiplier * variance);
    }

    function updateHpBar(who, current, max) {
        const pct = Math.max(0, (current / max) * 100);
        const fill = document.getElementById(`${who}-hp`);
        const text = document.getElementById(`${who}-hp-text`);

        fill.style.width = pct + "%";
        text.textContent = Math.max(0, Math.ceil(current));

        if (pct > 50) fill.style.background = "#4ec94e";
        else if (pct > 25) fill.style.background = "#ffb628";
        else fill.style.background = "#ff3e5f";
    }

    function addBattleLog(text, type = "") {
        const log = document.getElementById("battle-log");
        const entry = document.createElement("div");
        entry.className = `log-entry ${type}`;
        entry.textContent = text;
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
    }

    function truncate(str, len) {
        return str.length > len ? str.slice(0, len) + "..." : str;
    }

    async function showBattleResult(playerWon, playerWins, oppWins, roundResults) {
        showRaidPhase("result");

        const banner = document.getElementById("result-banner");
        const title = document.getElementById("result-title");
        const subtitle = document.getElementById("result-subtitle");
        const rewardSection = document.getElementById("result-reward");

        if (playerWon) {
            banner.className = "result-banner victory";
            title.textContent = "VICTORY!";
            subtitle.textContent = `You defeated ${raidState.opponent.name} ${playerWins}-${oppWins}!`;

            const stolenVideo = raidState.opponentCards[Math.floor(Math.random() * raidState.opponentCards.length)];
            const existing = getCollectionEntry(stolenVideo.id);
            if (existing) {
                existing.count++;
            } else {
                state.collection.push({
                    videoId: stolenVideo.id,
                    title: stolenVideo.title,
                    channel: stolenVideo.channel,
                    views: stolenVideo.views,
                    category: stolenVideo.category,
                    description: stolenVideo.description || "",
                    obtainedAt: new Date().toISOString(),
                    count: 1,
                });
            }
            await addToServerCollection(stolenVideo);

            rewardSection.classList.remove("hidden");
            const rewardContainer = document.getElementById("reward-card-container");
            rewardContainer.innerHTML = "";
            rewardContainer.appendChild(createCardElement(stolenVideo, {
                isNew: !existing,
                showStats: true,
            }));

            state.raidsWon++;
            state.cardsStolen++;
        } else {
            banner.className = "result-banner defeat";
            title.textContent = "DEFEAT";
            subtitle.textContent = `${raidState.opponent.name} wins ${oppWins}-${playerWins}. Better luck next time!`;
            rewardSection.classList.add("hidden");
            state.raidsLost++;
        }

        state.battleHistory.unshift({
            opponent: raidState.opponent.name,
            won: playerWon,
            score: `${playerWins}-${oppWins}`,
            date: new Date().toISOString(),
        });
        if (state.battleHistory.length > 20) state.battleHistory.pop();

        state.raidsLeft--;

        await Promise.all([
            saveRaidsLeft(),
            saveStatsToServer(),
            addBattleToServer(raidState.opponent.name, playerWon, `${playerWins}-${oppWins}`, "raid"),
        ]);

        // Round summary
        const roundsDiv = document.getElementById("result-rounds");
        roundsDiv.innerHTML = "";
        roundResults.forEach((r, i) => {
            const div = document.createElement("div");
            div.className = `result-round ${r.playerWon ? "round-won" : "round-lost"}`;
            div.innerHTML = `
                <span class="result-round-num">R${i + 1}</span>
                <span class="result-round-card">${CATEGORY_ICONS[r.playerCard.category]} ${truncate(r.playerCard.title, 20)}</span>
                <span class="result-round-vs">${r.playerWon ? "WIN" : "LOSE"}</span>
                <span class="result-round-card">${CATEGORY_ICONS[r.opponentCard.category]} ${truncate(r.opponentCard.title, 20)}</span>
            `;
            roundsDiv.appendChild(div);
        });
    }

    // ===========================
    // ASYNC PVP ARENA
    // ===========================

    let arenaState = {
        attackCards: [null, null, null],
        defenseCards: [null, null, null],
        selectedHandCard: null,
        selectedDefCard: null,
        targetOpponent: null,
        cachedResult: null,
    };

    function getPlayerId() {
        let id = localStorage.getItem("tubegacha_player_id");
        if (!id) {
            id = "player_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
            localStorage.setItem("tubegacha_player_id", id);
        }
        return id;
    }

    function showArenaPhase(phase) {
        document.getElementById("arena-lobby").classList.toggle("hidden", phase !== "lobby");
        document.getElementById("arena-battle").classList.toggle("hidden", phase !== "battle");
        document.getElementById("arena-result").classList.toggle("hidden", phase !== "result");
    }

    function switchArenaTab(tab) {
        document.querySelectorAll(".arena-tab").forEach(b => b.classList.toggle("active", b.dataset.arenaTab === tab));
        document.querySelectorAll(".arena-tab-content").forEach(c => c.classList.add("hidden"));
        document.getElementById(`arena-tab-${tab}`).classList.remove("hidden");
        if (tab === "attack") renderAttackTab();
        if (tab === "defense") renderDefenseTab();
        if (tab === "log") loadDefenseLog();
    }

    async function registerArenaPlayer() {
        const profile = getProfile();
        await arenaRegister(getPlayerId(), profile.username, profile.avatar);
    }

    async function refreshArenaRating() {
        try {
            await registerArenaPlayer();
            const data = await arenaGetPlayer(getPlayerId());
            document.getElementById("arena-my-rating").textContent = data.rating || 1000;
            document.getElementById("arena-my-record").textContent = `${data.arena_wins || 0}W / ${data.arena_losses || 0}L`;
        } catch (e) { /* ignore */ }
    }

    // --- Attack tab: set formation & battle ---
    function renderAttackTab() {
        if (state.collection.length < 3) {
            document.getElementById("arena-need-cards").classList.remove("hidden");
            return;
        }
        document.getElementById("arena-need-cards").classList.add("hidden");
        document.getElementById("arena-battle-error").classList.add("hidden");
        renderAttackFormation();
    }

    function renderAttackFormation() {
        for (let i = 0; i < 3; i++) {
            const slot = document.getElementById(`arena-atk-${i}`);
            slot.innerHTML = "";
            if (arenaState.attackCards[i]) {
                slot.appendChild(createBattleCardElement(arenaState.attackCards[i]));
            } else {
                slot.innerHTML = '<span class="drop-hint">Tap card, then here</span>';
            }
        }

        const hand = document.getElementById("arena-atk-hand");
        hand.innerHTML = "";
        const placedIds = arenaState.attackCards.filter(Boolean).map(v => v.id);

        const entries = [...state.collection].sort((a, b) => {
            const va = getVideoById(a.videoId);
            const vb = getVideoById(b.videoId);
            if (!va || !vb) return 0;
            return getCardStats(vb).atk - getCardStats(va).atk;
        });

        entries.forEach(entry => {
            const video = getVideoById(entry.videoId);
            if (!video) return;
            if (placedIds.includes(video.id)) return;

            const isSelected = arenaState.selectedHandCard === video.id;
            const card = createCardElement(video, { selectable: true, selected: isSelected });
            card.addEventListener("click", () => {
                arenaState.selectedHandCard = video.id;
                renderAttackFormation();
            });
            hand.appendChild(card);
        });

        document.getElementById("arena-battle-btn").disabled = !arenaState.attackCards.every(c => c !== null);
    }

    function placeAttackCard(lane) {
        if (!arenaState.selectedHandCard) return;
        arenaState.attackCards[lane] = getVideoById(arenaState.selectedHandCard);
        arenaState.selectedHandCard = null;
        renderAttackFormation();
    }

    function resetAttackCards() {
        arenaState.attackCards = [null, null, null];
        arenaState.selectedHandCard = null;
        renderAttackFormation();
    }

    async function executeBattle() {
        const cards = arenaState.attackCards;
        if (!cards.every(c => c !== null)) return;

        const btn = document.getElementById("arena-battle-btn");
        btn.disabled = true;
        btn.textContent = "Searching...";

        const cardData = cards.map(c => ({
            id: c.id, title: c.title, channel: c.channel,
            views: c.views, category: c.category, description: c.description || "",
        }));

        const result = await arenaBattle(getPlayerId(), cardData);

        btn.textContent = "Battle!";
        btn.disabled = false;

        if (result.error) {
            const errEl = document.getElementById("arena-battle-error");
            errEl.textContent = result.error;
            errEl.classList.remove("hidden");
            return;
        }

        arenaState.targetOpponent = result.opponent;
        arenaState.cachedResult = result;
        startArenaFight(cards, result.defenseCards, result);
    }

    // --- Defense tab ---
    function renderDefenseTab() {
        const display = document.getElementById("arena-defense-display");
        const noDefense = document.getElementById("arena-no-defense");
        const currentDef = lsGet("arena_defense", null);

        if (currentDef && currentDef.length === 3) {
            noDefense.classList.add("hidden");
            display.innerHTML = "";
            currentDef.forEach(c => {
                const slot = document.createElement("div");
                slot.className = "arena-def-slot";
                slot.appendChild(createBattleCardElement(c));
                display.appendChild(slot);
            });
        } else {
            noDefense.classList.remove("hidden");
            display.innerHTML = "";
        }

        arenaState.defenseCards = [null, null, null];
        arenaState.selectedDefCard = null;
        renderDefensePlacement();
    }

    function renderDefensePlacement() {
        for (let i = 0; i < 3; i++) {
            const slot = document.getElementById(`arena-def-${i}`);
            slot.innerHTML = "";
            if (arenaState.defenseCards[i]) {
                slot.appendChild(createBattleCardElement(arenaState.defenseCards[i]));
            } else {
                slot.innerHTML = '<span class="drop-hint">Tap card, then here</span>';
            }
        }

        const hand = document.getElementById("arena-def-hand");
        hand.innerHTML = "";
        const placedIds = arenaState.defenseCards.filter(Boolean).map(v => v.id);

        const entries = [...state.collection].sort((a, b) => {
            const va = getVideoById(a.videoId);
            const vb = getVideoById(b.videoId);
            if (!va || !vb) return 0;
            return getCardStats(vb).atk - getCardStats(va).atk;
        });

        entries.forEach(entry => {
            const video = getVideoById(entry.videoId);
            if (!video) return;
            if (placedIds.includes(video.id)) return;

            const isSelected = arenaState.selectedDefCard === video.id;
            const card = createCardElement(video, { selectable: true, selected: isSelected });
            card.addEventListener("click", () => {
                arenaState.selectedDefCard = video.id;
                renderDefensePlacement();
            });
            hand.appendChild(card);
        });

        document.getElementById("arena-save-defense-btn").disabled = !arenaState.defenseCards.every(c => c !== null);
    }

    function placeDefenseCard(lane) {
        if (!arenaState.selectedDefCard) return;
        arenaState.defenseCards[lane] = getVideoById(arenaState.selectedDefCard);
        arenaState.selectedDefCard = null;
        renderDefensePlacement();
    }

    function resetDefenseCards() {
        arenaState.defenseCards = [null, null, null];
        arenaState.selectedDefCard = null;
        renderDefensePlacement();
    }

    async function saveDefense() {
        const cards = arenaState.defenseCards;
        if (!cards.every(c => c !== null)) return;

        const cardData = cards.map(c => ({
            id: c.id, title: c.title, channel: c.channel,
            views: c.views, category: c.category, description: c.description || "",
        }));

        await arenaSetDefense(getPlayerId(), cardData);
        lsSet("arena_defense", cardData);
        renderDefenseTab();
    }

    // --- Defense log tab ---
    async function loadDefenseLog() {
        const container = document.getElementById("arena-defense-log");
        const noLog = document.getElementById("arena-no-log");
        container.innerHTML = '<div class="loader"></div>';

        try {
            const logs = await arenaGetDefenseLog(getPlayerId());
            container.innerHTML = "";

            if (logs.length === 0) {
                noLog.classList.remove("hidden");
                return;
            }
            noLog.classList.add("hidden");

            logs.forEach(log => {
                const entry = document.createElement("div");
                entry.className = `arena-log-entry ${log.attacker_won ? "log-loss" : "log-win"}`;
                const rChange = log.defender_rating_change;
                const rClass = rChange >= 0 ? "rating-up" : "rating-down";
                entry.innerHTML = `
                    <span class="arena-log-avatar">${escapeHtml(log.attacker_avatar)}</span>
                    <div class="arena-log-info">
                        <span class="arena-log-name">${escapeHtml(log.attacker_name || "Unknown")}</span>
                        <span class="arena-log-result">${log.attacker_won ? "defeated you" : "failed to beat you"} (${log.score})</span>
                    </div>
                    <span class="arena-log-rating ${rClass}">${rChange >= 0 ? "+" : ""}${rChange}</span>
                    <span class="arena-log-date">${new Date(log.date).toLocaleDateString()}</span>
                `;
                container.appendChild(entry);
            });
        } catch (e) {
            container.innerHTML = '<p class="empty-msg">Failed to load log.</p>';
        }
    }

    // --- Battle animation (reused for attacks) ---
    async function startArenaFight(myCards, oppCards, serverResult) {
        showArenaPhase("battle");

        const log = document.getElementById("arena-battle-log");
        log.innerHTML = "";

        const lanes = [];
        for (let i = 0; i < 3; i++) {
            const pVideo = myCards[i];
            const eVideo = oppCards[i];
            const pStats = getCardStats(pVideo);
            const eStats = getCardStats(eVideo);

            const pSlot = document.getElementById(`arena-b-player-${i}`);
            const eSlot = document.getElementById(`arena-b-enemy-${i}`);
            pSlot.innerHTML = "";
            eSlot.innerHTML = "";
            pSlot.appendChild(createBattleCardElement(pVideo));
            eSlot.appendChild(createBattleCardElement(eVideo));

            updateArenaHp("p", i, pStats.hp, pStats.hp);
            updateArenaHp("e", i, eStats.hp, eStats.hp);

            document.getElementById(`arena-lane-status-${i}`).textContent = "VS";
            document.getElementById(`arena-lane-status-${i}`).className = "";

            lanes.push({
                pVideo, eVideo, pStats, eStats,
                pHp: pStats.hp, eHp: eStats.hp,
                pMult: getTypeMultiplier(pVideo.category, eVideo.category),
                eMult: getTypeMultiplier(eVideo.category, pVideo.category),
                done: false, winner: null,
            });
        }

        const laneNames = ["LEFT", "CENTER", "RIGHT"];
        for (let i = 0; i < 3; i++) {
            const l = lanes[i];
            if (l.pMult > 1) addArenaLog(`${laneNames[i]}: ${l.pStats.element} is SUPER EFFECTIVE vs ${l.eStats.element}!`, "advantage");
            else if (l.eMult > 1) addArenaLog(`${laneNames[i]}: ${l.eStats.element} is SUPER EFFECTIVE vs ${l.pStats.element}!`, "disadvantage");
        }

        await sleep(800);

        let turn = 0;
        while (lanes.some(l => !l.done) && turn < 25) {
            turn++;
            addArenaLog(`--- Turn ${turn} ---`);

            for (let i = 0; i < 3; i++) {
                const l = lanes[i];
                if (l.done) continue;
                const pDmg = calcDamage(l.pStats.atk, l.eStats.def, l.pMult);
                l.eHp = Math.max(0, l.eHp - pDmg);
                const eDmg = calcDamage(l.eStats.atk, l.pStats.def, l.eMult);
                l.pHp = Math.max(0, l.pHp - eDmg);
                addArenaLog(`${laneNames[i]}: YOU deal ${pDmg}, DEF deals ${eDmg}`);
            }

            for (let i = 0; i < 3; i++) {
                const l = lanes[i];
                if (l.done) continue;
                updateArenaHp("p", i, l.pHp, l.pStats.hp);
                updateArenaHp("e", i, l.eHp, l.eStats.hp);

                if (l.pHp <= 0 || l.eHp <= 0) {
                    l.done = true;
                    if (l.pHp > l.eHp) {
                        l.winner = "player";
                        l.survivorHp = l.pHp;
                        addArenaLog(`${laneNames[i]}: YOU WIN! (${Math.ceil(l.pHp)} HP left)`, "win");
                        document.getElementById(`arena-lane-status-${i}`).textContent = "WIN";
                        document.getElementById(`arena-lane-status-${i}`).className = "lane-win";
                    } else if (l.eHp > l.pHp) {
                        l.winner = "enemy";
                        l.survivorHp = l.eHp;
                        addArenaLog(`${laneNames[i]}: DEF WINS! (${Math.ceil(l.eHp)} HP left)`, "lose");
                        document.getElementById(`arena-lane-status-${i}`).textContent = "LOSE";
                        document.getElementById(`arena-lane-status-${i}`).className = "lane-lose";
                    } else {
                        l.winner = "draw";
                        l.survivorHp = 0;
                        addArenaLog(`${laneNames[i]}: DRAW!`);
                        document.getElementById(`arena-lane-status-${i}`).textContent = "DRAW";
                        document.getElementById(`arena-lane-status-${i}`).className = "lane-draw";
                    }
                }
            }
            await sleep(500);
        }

        let playerBreakthrough = 0, enemyBreakthrough = 0;
        for (const l of lanes) {
            if (l.winner === "player") playerBreakthrough += Math.ceil(l.survivorHp);
            if (l.winner === "enemy") enemyBreakthrough += Math.ceil(l.survivorHp);
        }

        await sleep(400);
        if (playerBreakthrough > 0 || enemyBreakthrough > 0) {
            addArenaLog(`--- Breakthrough ---`);
            if (playerBreakthrough > 0) addArenaLog(`Your survivors push through for ${playerBreakthrough} breakthrough damage!`, "win");
            if (enemyBreakthrough > 0) addArenaLog(`Defense survivors push through for ${enemyBreakthrough} breakthrough damage!`, "lose");
        }

        const pLanes = lanes.filter(l => l.winner === "player").length;
        const eLanes = lanes.filter(l => l.winner === "enemy").length;

        await sleep(1000);
        await showArenaResult(serverResult.attackerWon, pLanes, eLanes, playerBreakthrough, enemyBreakthrough, lanes, serverResult);
    }

    function updateArenaHp(side, lane, current, max) {
        const prefix = side === "p" ? "arena-php" : "arena-ehp";
        const pct = Math.max(0, (current / max) * 100);
        const fill = document.getElementById(`${prefix}-${lane}`);
        const text = document.getElementById(`${prefix}-text-${lane}`);
        fill.style.width = pct + "%";
        text.textContent = Math.max(0, Math.ceil(current));
        if (pct > 50) fill.style.background = "#4ec94e";
        else if (pct > 25) fill.style.background = "#ffb628";
        else fill.style.background = "#ff3e5f";
    }

    function addArenaLog(text, type = "") {
        const log = document.getElementById("arena-battle-log");
        const entry = document.createElement("div");
        entry.className = `log-entry ${type}`;
        entry.textContent = text;
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
    }

    async function showArenaResult(playerWon, pLanes, eLanes, pBreak, eBreak, lanes, serverResult) {
        showArenaPhase("result");
        const banner = document.getElementById("arena-result-banner");
        const title = document.getElementById("arena-result-title");
        const subtitle = document.getElementById("arena-result-subtitle");
        const eloChange = serverResult.eloChange;
        const eloStr = eloChange >= 0 ? `+${eloChange}` : `${eloChange}`;

        if (playerWon) {
            banner.className = "result-banner victory";
            title.textContent = "VICTORY!";
            subtitle.textContent = `Lanes: ${pLanes}-${eLanes} | Rating: ${eloStr} (now ${serverResult.newRating})`;
        } else {
            banner.className = "result-banner defeat";
            title.textContent = "DEFEAT";
            subtitle.textContent = `Lanes: ${pLanes}-${eLanes} | Rating: ${eloStr} (now ${serverResult.newRating})`;
        }

        const lanesDiv = document.getElementById("arena-result-lanes");
        lanesDiv.innerHTML = "";
        const laneNames = ["LEFT", "CENTER", "RIGHT"];
        lanes.forEach((l, i) => {
            const pStats = getCardStats(l.pVideo);
            const eStats = getCardStats(l.eVideo);
            const div = document.createElement("div");
            const won = l.winner === "player";
            const draw = l.winner === "draw";
            div.className = `result-round ${won ? "round-won" : draw ? "" : "round-lost"}`;
            div.innerHTML = `
                <span class="result-round-num">${laneNames[i]}</span>
                <span class="result-round-card">${CATEGORY_ICONS[l.pVideo.category]} ${truncate(l.pVideo.title, 18)} <small>${pStats.element}</small></span>
                <span class="result-round-vs">${won ? "WIN" : draw ? "DRAW" : "LOSE"}</span>
                <span class="result-round-card">${CATEGORY_ICONS[l.eVideo.category]} ${truncate(l.eVideo.title, 18)} <small>${eStats.element}</small></span>
            `;
            lanesDiv.appendChild(div);
        });

        const oppName = arenaState.targetOpponent ? arenaState.targetOpponent.name : "Arena";
        state.battleHistory.unshift({ opponent: oppName, won: playerWon, score: `${pLanes}-${eLanes}`, date: new Date().toISOString() });
        if (state.battleHistory.length > 20) state.battleHistory.pop();
        if (playerWon) state.raidsWon++;
        else state.raidsLost++;

        await Promise.all([
            saveStatsToServer(),
            addBattleToServer(oppName, playerWon, `${pLanes}-${eLanes}`, "arena"),
        ]);
    }

    // --- Stats View ---
    function renderStats() {
        const uniqueCount = state.collection.length;
        const totalCount = state.collection.reduce((sum, e) => sum + e.count, 0);

        document.getElementById("stat-total").textContent = totalCount;
        document.getElementById("stat-unique").textContent = uniqueCount;
        document.getElementById("stat-packs").textContent = state.totalPacksOpened;
        document.getElementById("stat-raids-won").textContent = state.raidsWon;
        document.getElementById("stat-raids-lost").textContent = state.raidsLost;
        document.getElementById("stat-stolen").textContent = state.cardsStolen;

        const rarityCounts = {};
        RARITY_TIERS.forEach(t => rarityCounts[t.name] = 0);

        state.collection.forEach(entry => {
            const video = getVideoById(entry.videoId);
            if (video) {
                rarityCounts[getRarity(video).name] += entry.count;
            }
        });

        document.getElementById("stat-mythic").textContent = rarityCounts["mythic"] || 0;
        document.getElementById("stat-legendary").textContent = rarityCounts["legendary"];
        document.getElementById("stat-super-rare").textContent = rarityCounts["super-rare"];
        document.getElementById("stat-epic").textContent = rarityCounts["epic"] || 0;
        document.getElementById("stat-rare").textContent = rarityCounts["rare"];

        const barsContainer = document.getElementById("rarity-bars");
        barsContainer.innerHTML = "";
        const maxCount = Math.max(1, ...Object.values(rarityCounts));

        RARITY_TIERS.forEach(tier => {
            const count = rarityCounts[tier.name];
            const pct = (count / maxCount) * 100;

            const row = document.createElement("div");
            row.className = "rarity-bar-row";
            row.innerHTML = `
                <div class="rarity-bar-label" style="color:${tier.color}">${tier.label}</div>
                <div class="rarity-bar-track">
                    <div class="rarity-bar-fill" style="width:${pct}%;background:${tier.color}"></div>
                </div>
                <div class="rarity-bar-count">${count}</div>
            `;
            barsContainer.appendChild(row);
        });

        const historyList = document.getElementById("battle-history-list");
        historyList.innerHTML = "";
        if (state.battleHistory.length === 0) {
            historyList.innerHTML = '<p class="empty-msg">No battles yet. Start a raid!</p>';
        } else {
            state.battleHistory.slice(0, 10).forEach(entry => {
                const div = document.createElement("div");
                div.className = `history-entry ${entry.won ? "history-win" : "history-loss"}`;
                div.innerHTML = `
                    <span class="history-result">${entry.won ? "W" : "L"}</span>
                    <span class="history-opponent">${escapeHtml(entry.opponent)}</span>
                    <span class="history-score">${entry.score}</span>
                    <span class="history-date">${new Date(entry.date).toLocaleDateString()}</span>
                `;
                historyList.appendChild(div);
            });
        }
    }

    // --- Settings View ---
    async function initSettings() {
        renderProfileEditor();

        const apiKeyInput = document.getElementById("api-key-input");
        const saveBtn = document.getElementById("save-api-key");
        const statusEl = document.getElementById("api-key-status");

        // Load existing API key
        const existingKey = await loadSetting("youtube_api_key");
        if (existingKey) {
            apiKeyInput.value = existingKey;
            statusEl.textContent = "API key saved.";
            statusEl.style.color = "#4ec94e";
        }

        saveBtn.addEventListener("click", async () => {
            const key = apiKeyInput.value.trim();
            if (!key) {
                statusEl.textContent = "Please enter an API key.";
                statusEl.style.color = "#ff3e5f";
                return;
            }
            await saveSetting("youtube_api_key", key);
            statusEl.textContent = "API key saved!";
            statusEl.style.color = "#4ec94e";
        });
    }

    // --- Navigation ---
    function switchView(viewName) {
        document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
        document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));

        document.getElementById(`view-${viewName}`).classList.add("active");
        document.querySelector(`[data-view="${viewName}"]`).classList.add("active");

        if (viewName === "collection") renderCollection();
        if (viewName === "top10") renderTop10();
        if (viewName === "stats") renderStats();
        if (viewName === "raid") {
            showRaidPhase("lobby");
            renderRaidLobby();
        }
        if (viewName === "arena") {
            showArenaPhase("lobby");
            refreshArenaRating();
            arenaState.attackCards = [null, null, null];
            arenaState.selectedHandCard = null;
            switchArenaTab("attack");
        }
        if (viewName === "settings") initSettings();
    }

    // --- Event Listeners & Init ---
    async function init() {
        // Initialize profile (random username/avatar on first visit)
        initProfile();

        // Load data from server
        try {
            AI_OPPONENTS = await loadOpponents(12);
            await loadStateFromServer();
        } catch (err) {
            console.error("Failed to load from server:", err);
        }

        // Navigation
        document.querySelectorAll(".nav-btn").forEach(btn => {
            btn.addEventListener("click", () => switchView(btn.dataset.view));
        });

        // Pack opening
        document.getElementById("pack").addEventListener("click", openPack);
        document.getElementById("collect-btn").addEventListener("click", collectCards);

        // Modal
        document.querySelector(".modal-backdrop").addEventListener("click", closeModal);
        document.querySelector(".modal-close").addEventListener("click", closeModal);
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") closeModal();
        });

        // Profile
        document.getElementById("profile-save-btn").addEventListener("click", saveProfile);
        document.getElementById("profile-name-input").addEventListener("keydown", (e) => {
            if (e.key === "Enter") saveProfile();
        });
        document.getElementById("profile-randomize-btn").addEventListener("click", () => {
            document.getElementById("profile-name-input").value = generateRandomName();
        });

        // Collection filters
        document.querySelectorAll(".filter-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                renderCollection(btn.dataset.rarity);
            });
        });

        // Raid controls
        document.getElementById("raid-start-btn").addEventListener("click", startBattle);
        document.getElementById("raid-back-btn").addEventListener("click", () => {
            showRaidPhase("lobby");
            renderRaidLobby();
        });

        // Type chart toggle
        document.getElementById("toggle-type-chart").addEventListener("click", () => {
            const chart = document.getElementById("type-chart");
            const btn = document.getElementById("toggle-type-chart");
            chart.classList.toggle("hidden");
            btn.textContent = chart.classList.contains("hidden") ? "Show Type Chart" : "Hide Type Chart";
        });

        // Arena controls
        document.querySelectorAll(".arena-tab").forEach(btn => {
            btn.addEventListener("click", () => switchArenaTab(btn.dataset.arenaTab));
        });
        // Attack formation placement
        document.querySelectorAll(".arena-atk-drop").forEach(slot => {
            slot.addEventListener("click", () => placeAttackCard(parseInt(slot.dataset.lane)));
        });
        document.getElementById("arena-battle-btn").addEventListener("click", executeBattle);
        document.getElementById("arena-atk-reset-btn").addEventListener("click", resetAttackCards);
        document.getElementById("arena-again-btn").addEventListener("click", () => {
            showArenaPhase("lobby");
            refreshArenaRating();
            renderAttackTab();
        });
        // Defense card placement
        document.querySelectorAll("[id^=arena-def-]").forEach(slot => {
            if (slot.dataset.lane !== undefined) {
                slot.addEventListener("click", () => placeDefenseCard(parseInt(slot.dataset.lane)));
            }
        });
        document.getElementById("arena-save-defense-btn").addEventListener("click", saveDefense);
        document.getElementById("arena-reset-defense-btn").addEventListener("click", resetDefenseCards);

        // Initialize UI
        resetPackUI();
    }

    init();
})();
