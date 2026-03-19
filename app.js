// TubeGacha - YouTube Video Card Collector with Raid Battles

(function () {
    "use strict";

    // --- Constants ---
    const PACKS_PER_DAY = 3;
    const CARDS_PER_PACK = 3;
    const RAIDS_PER_DAY = 2;
    const STORAGE_KEY = "tubegacha_data";
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
    // Each type leans into different strengths: ATK%, DEF%, HP%
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

    // --- State ---
    let state = loadState();
    let raidState = {
        selectedCards: [],
        opponent: null,
        opponentCards: [],
        phase: "lobby", // lobby, select, battle, result
    };

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

        // View-based variance: how far into the tier (0-1), adds up to +150 ATK/DEF, +500 HP
        const tierRange = rarity.min === 0 ? 1_000_000 : rarity.min * 9;
        const viewsInTier = Math.min(video.views - rarity.min, tierRange);
        const tierProgress = viewsInTier / tierRange;
        const variance = Math.floor(tierProgress * 150);

        // Apply elemental multipliers to base + variance
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

        if (strong && weak) return 1.0; // Mutual — cancels out
        if (strong) return 1.75; // Super effective
        if (weak) return 0.55;   // Resisted
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

    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.lastPackDay !== getTodayKey()) {
                    parsed.packsLeft = PACKS_PER_DAY;
                    parsed.raidsLeft = RAIDS_PER_DAY;
                    parsed.lastPackDay = getTodayKey();
                }
                // Migrate old state
                if (parsed.raidsLeft === undefined) parsed.raidsLeft = RAIDS_PER_DAY;
                if (!parsed.raidsWon) parsed.raidsWon = 0;
                if (!parsed.raidsLost) parsed.raidsLost = 0;
                if (!parsed.cardsStolen) parsed.cardsStolen = 0;
                if (!parsed.battleHistory) parsed.battleHistory = [];
                return parsed;
            }
        } catch (e) { /* ignore */ }
        return {
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
    }

    function saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function getVideoById(videoId) {
        return VIDEO_DATABASE.find(v => v.id === videoId);
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
    function rollCards(count) {
        const cards = [];
        for (let i = 0; i < count; i++) {
            const roll = Math.random() * 100;
            let cumulative = 0;
            let targetTier = RARITY_TIERS[RARITY_TIERS.length - 1];

            for (const tier of RARITY_TIERS) {
                cumulative += tier.weight;
                if (roll < cumulative) {
                    targetTier = tier;
                    break;
                }
            }

            const pool = VIDEO_DATABASE.filter(v => getRarity(v).name === targetTier.name);
            if (pool.length > 0) {
                cards.push(pool[Math.floor(Math.random() * pool.length)]);
            } else {
                cards.push(VIDEO_DATABASE[Math.floor(Math.random() * VIDEO_DATABASE.length)]);
            }
        }
        return cards;
    }

    // --- AI Opponent Generation ---
    function generateOpponentDeck(difficulty) {
        const deck = [];
        for (let i = 0; i < 3; i++) {
            let targetTier;
            const roll = Math.random() * 100;

            if (difficulty === 1) {
                // Easy: mostly common/uncommon
                if (roll < 35) targetTier = "common";
                else if (roll < 70) targetTier = "uncommon";
                else if (roll < 90) targetTier = "rare";
                else targetTier = "super-rare";
            } else if (difficulty === 2) {
                // Medium: uncommon/rare focused
                if (roll < 10) targetTier = "common";
                else if (roll < 30) targetTier = "uncommon";
                else if (roll < 55) targetTier = "rare";
                else if (roll < 80) targetTier = "super-rare";
                else if (roll < 92) targetTier = "epic";
                else targetTier = "legendary";
            } else {
                // Hard: epic/legendary/mythic focused
                if (roll < 5) targetTier = "rare";
                else if (roll < 25) targetTier = "super-rare";
                else if (roll < 50) targetTier = "epic";
                else if (roll < 80) targetTier = "legendary";
                else targetTier = "mythic";
            }

            const pool = VIDEO_DATABASE.filter(v => getRarity(v).name === targetTier);
            if (pool.length > 0) {
                // Avoid duplicates in deck
                const available = pool.filter(v => !deck.find(d => d.id === v.id));
                if (available.length > 0) {
                    deck.push(available[Math.floor(Math.random() * available.length)]);
                } else {
                    deck.push(pool[Math.floor(Math.random() * pool.length)]);
                }
            }
        }
        return deck;
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
    function openPack() {
        if (state.packsLeft <= 0) return;

        const pack = document.getElementById("pack");
        const container = document.getElementById("pack-container");
        const reveal = document.getElementById("card-reveal");
        const revealedCards = document.getElementById("revealed-cards");

        pack.className = "opening";

        setTimeout(() => {
            pack.className = "opened";

            setTimeout(() => {
                container.style.display = "none";
                reveal.classList.remove("hidden");

                const cards = rollCards(CARDS_PER_PACK);
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
            }, 400);
        }, 600);
    }

    function collectCards() {
        const cards = window._pendingCards;
        if (!cards) return;

        cards.forEach((video) => {
            const entry = getCollectionEntry(video.id);
            if (entry) {
                entry.count++;
            } else {
                state.collection.push({
                    videoId: video.id,
                    obtainedAt: new Date().toISOString(),
                    count: 1,
                });
            }
        });

        state.packsLeft--;
        state.totalPacksOpened++;
        saveState();
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
                            <img class="card-thumbnail" src="${thumbnailUrl(video.id)}" alt="${escapeHtml(video.title)}" loading="lazy">
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

        // Show 4 random opponents
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
        raidState.opponentCards = generateOpponentDeck(opponent.difficulty);

        document.getElementById("raid-opponent-name").textContent = opponent.name;
        showRaidPhase("select");

        renderSelectGrid();
        updateSelectedSlots();
    }

    function renderSelectGrid() {
        const grid = document.getElementById("raid-select-grid");
        grid.innerHTML = "";

        // Show all collection cards sorted by power
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

            // Render battle cards
            const pCardEl = document.getElementById("player-battle-card");
            const oCardEl = document.getElementById("opponent-battle-card");
            pCardEl.innerHTML = "";
            oCardEl.innerHTML = "";
            pCardEl.appendChild(createBattleCardElement(pVideo));
            oCardEl.appendChild(createBattleCardElement(oVideo));

            // Show stats
            document.getElementById("player-battle-stats").innerHTML = `
                <span class="stat-atk">ATK ${pStats.atk}</span>
                <span class="stat-def">DEF ${pStats.def}</span>
            `;
            document.getElementById("opponent-battle-stats").innerHTML = `
                <span class="stat-atk">ATK ${oStats.atk}</span>
                <span class="stat-def">DEF ${oStats.def}</span>
            `;

            // Reset HP bars
            let pHp = pStats.hp;
            let oHp = oStats.hp;
            updateHpBar("player", pHp, pStats.hp);
            updateHpBar("opponent", oHp, oStats.hp);

            // Type indicators
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

            // Combat loop
            let turn = 0;
            while (pHp > 0 && oHp > 0 && turn < 20) {
                turn++;

                // Player attacks
                const pDmg = calcDamage(pStats.atk, oStats.def, pMult);
                oHp = Math.max(0, oHp - pDmg);

                const actionText = document.getElementById("battle-action-text");

                // Player attack animation
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

                // Opponent attacks
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

            // Determine round winner
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

            // Check for early victory (2-0)
            if (playerWins === 2 || oppWins === 2) {
                if (round < BATTLE_ROUNDS - 1) {
                    addBattleLog(`Match decided early!`, playerWins === 2 ? "win" : "lose");
                }
                await sleep(1000);
                break;
            }

            await sleep(1200);
        }

        // Show results
        await sleep(800);
        showBattleResult(playerWins > oppWins, playerWins, oppWins, roundResults);
    }

    function calcDamage(atk, def, typeMultiplier) {
        const baseDmg = Math.max(50, atk - def * 0.35);
        const variance = 0.85 + Math.random() * 0.3; // 85%-115%
        return Math.floor(baseDmg * typeMultiplier * variance);
    }

    function updateHpBar(who, current, max) {
        const pct = Math.max(0, (current / max) * 100);
        const fill = document.getElementById(`${who}-hp`);
        const text = document.getElementById(`${who}-hp-text`);

        fill.style.width = pct + "%";
        text.textContent = Math.max(0, Math.ceil(current));

        // Color based on HP
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

    function showBattleResult(playerWon, playerWins, oppWins, roundResults) {
        showRaidPhase("result");

        const banner = document.getElementById("result-banner");
        const title = document.getElementById("result-title");
        const subtitle = document.getElementById("result-subtitle");
        const rewardSection = document.getElementById("result-reward");

        if (playerWon) {
            banner.className = "result-banner victory";
            title.textContent = "VICTORY!";
            subtitle.textContent = `You defeated ${raidState.opponent.name} ${playerWins}-${oppWins}!`;

            // Steal a random card from opponent's deck
            const stolenVideo = raidState.opponentCards[Math.floor(Math.random() * raidState.opponentCards.length)];
            const existing = getCollectionEntry(stolenVideo.id);
            if (existing) {
                existing.count++;
            } else {
                state.collection.push({
                    videoId: stolenVideo.id,
                    obtainedAt: new Date().toISOString(),
                    count: 1,
                });
            }

            // Show reward
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

        // Battle history
        state.battleHistory.unshift({
            opponent: raidState.opponent.name,
            won: playerWon,
            score: `${playerWins}-${oppWins}`,
            date: new Date().toISOString(),
        });
        if (state.battleHistory.length > 20) state.battleHistory.pop();

        state.raidsLeft--;
        saveState();

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
    // GRID ARENA
    // ===========================

    let arenaState = {
        difficulty: 2,
        enemyCards: [null, null, null],    // video objects per lane
        playerCards: [null, null, null],    // video objects per lane
        selectedHandCard: null,            // videoId currently selected from hand
    };

    function showArenaPhase(phase) {
        document.getElementById("arena-lobby").classList.toggle("hidden", phase !== "lobby");
        document.getElementById("arena-placement").classList.toggle("hidden", phase !== "placement");
        document.getElementById("arena-battle").classList.toggle("hidden", phase !== "battle");
        document.getElementById("arena-result").classList.toggle("hidden", phase !== "result");
    }

    function startArena(difficulty) {
        if (state.collection.length < 3) {
            document.getElementById("arena-need-cards").classList.remove("hidden");
            return;
        }
        document.getElementById("arena-need-cards").classList.add("hidden");

        arenaState.difficulty = difficulty;
        arenaState.enemyCards = generateOpponentDeck(difficulty);
        arenaState.playerCards = [null, null, null];
        arenaState.selectedHandCard = null;

        showArenaPhase("placement");
        renderArenaPlacement();
    }

    function renderArenaPlacement() {
        // Render enemy cards in slots
        for (let i = 0; i < 3; i++) {
            const slot = document.getElementById(`arena-enemy-${i}`);
            slot.innerHTML = "";
            if (arenaState.enemyCards[i]) {
                slot.appendChild(createBattleCardElement(arenaState.enemyCards[i]));
            }
        }

        // Render player slots
        for (let i = 0; i < 3; i++) {
            const slot = document.getElementById(`arena-player-${i}`);
            slot.innerHTML = "";
            if (arenaState.playerCards[i]) {
                slot.appendChild(createBattleCardElement(arenaState.playerCards[i]));
                // Show type matchup indicator
                const pCat = arenaState.playerCards[i].category;
                const eCat = arenaState.enemyCards[i].category;
                const mult = getTypeMultiplier(pCat, eCat);
                if (mult > 1) {
                    const tag = document.createElement("div");
                    tag.className = "lane-matchup good";
                    tag.textContent = "1.75x";
                    slot.appendChild(tag);
                } else if (mult < 1) {
                    const tag = document.createElement("div");
                    tag.className = "lane-matchup bad";
                    tag.textContent = "0.55x";
                    slot.appendChild(tag);
                }
            } else {
                slot.innerHTML = '<span class="drop-hint">Tap card, then here</span>';
            }
        }

        // Render hand (collection minus placed cards)
        const hand = document.getElementById("arena-hand");
        hand.innerHTML = "";
        const placedIds = arenaState.playerCards.filter(Boolean).map(v => v.id);

        const entries = [...state.collection].sort((a, b) => {
            const va = getVideoById(a.videoId);
            const vb = getVideoById(b.videoId);
            if (!va || !vb) return 0;
            return getCardStats(vb).atk - getCardStats(va).atk;
        });

        entries.forEach(entry => {
            const video = getVideoById(entry.videoId);
            if (!video) return;
            const isPlaced = placedIds.includes(video.id);
            if (isPlaced) return; // Hide placed cards from hand

            const isSelected = arenaState.selectedHandCard === video.id;
            const card = createCardElement(video, {
                selectable: true,
                selected: isSelected,
            });
            card.addEventListener("click", () => {
                arenaState.selectedHandCard = video.id;
                renderArenaPlacement();
            });
            hand.appendChild(card);
        });

        // Update fight button
        const allPlaced = arenaState.playerCards.every(c => c !== null);
        document.getElementById("arena-fight-btn").disabled = !allPlaced;
    }

    function placeCardInLane(lane) {
        if (!arenaState.selectedHandCard) return;

        // If lane already has a card, put it back in hand
        arenaState.playerCards[lane] = getVideoById(arenaState.selectedHandCard);
        arenaState.selectedHandCard = null;
        renderArenaPlacement();
    }

    function resetArenaPlacement() {
        arenaState.playerCards = [null, null, null];
        arenaState.selectedHandCard = null;
        renderArenaPlacement();
    }

    async function startArenaFight() {
        showArenaPhase("battle");

        const log = document.getElementById("arena-battle-log");
        log.innerHTML = "";

        // Set up battle cards and HP
        const lanes = [];
        for (let i = 0; i < 3; i++) {
            const pVideo = arenaState.playerCards[i];
            const eVideo = arenaState.enemyCards[i];
            const pStats = getCardStats(pVideo);
            const eStats = getCardStats(eVideo);

            // Render cards
            const pSlot = document.getElementById(`arena-b-player-${i}`);
            const eSlot = document.getElementById(`arena-b-enemy-${i}`);
            pSlot.innerHTML = "";
            eSlot.innerHTML = "";
            pSlot.appendChild(createBattleCardElement(pVideo));
            eSlot.appendChild(createBattleCardElement(eVideo));

            // Init HP
            updateArenaHp("p", i, pStats.hp, pStats.hp);
            updateArenaHp("e", i, eStats.hp, eStats.hp);

            // Lane status
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

        // Log type matchups
        const laneNames = ["LEFT", "CENTER", "RIGHT"];
        for (let i = 0; i < 3; i++) {
            const l = lanes[i];
            if (l.pMult > 1) addArenaLog(`${laneNames[i]}: ${l.pStats.element} is SUPER EFFECTIVE vs ${l.eStats.element}!`, "advantage");
            else if (l.eMult > 1) addArenaLog(`${laneNames[i]}: ${l.eStats.element} is SUPER EFFECTIVE vs ${l.pStats.element}!`, "disadvantage");
        }

        await sleep(800);

        // Simultaneous combat — all lanes resolve together, turn by turn
        let turn = 0;
        while (lanes.some(l => !l.done) && turn < 25) {
            turn++;
            addArenaLog(`--- Turn ${turn} ---`);

            for (let i = 0; i < 3; i++) {
                const l = lanes[i];
                if (l.done) continue;

                // Player attacks
                const pDmg = calcDamage(l.pStats.atk, l.eStats.def, l.pMult);
                l.eHp = Math.max(0, l.eHp - pDmg);

                // Enemy attacks
                const eDmg = calcDamage(l.eStats.atk, l.pStats.def, l.eMult);
                l.pHp = Math.max(0, l.pHp - eDmg);

                addArenaLog(`${laneNames[i]}: -${pDmg} to enemy, -${eDmg} to you`);
            }

            // Animate HP updates
            for (let i = 0; i < 3; i++) {
                const l = lanes[i];
                if (l.done) continue;
                updateArenaHp("p", i, l.pHp, l.pStats.hp);
                updateArenaHp("e", i, l.eHp, l.eStats.hp);

                // Check if lane resolved
                if (l.pHp <= 0 || l.eHp <= 0) {
                    l.done = true;
                    if (l.pHp > l.eHp) {
                        l.winner = "player";
                        l.survivorHp = l.pHp;
                        addArenaLog(`${laneNames[i]}: Your card WINS! (${Math.ceil(l.pHp)} HP left)`, "win");
                        document.getElementById(`arena-lane-status-${i}`).textContent = "WIN";
                        document.getElementById(`arena-lane-status-${i}`).className = "lane-win";
                    } else if (l.eHp > l.pHp) {
                        l.winner = "enemy";
                        l.survivorHp = l.eHp;
                        addArenaLog(`${laneNames[i]}: Enemy card WINS! (${Math.ceil(l.eHp)} HP left)`, "lose");
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

        // Calculate breakthrough damage from survivors
        let playerBreakthrough = 0;
        let enemyBreakthrough = 0;
        for (const l of lanes) {
            if (l.winner === "player") playerBreakthrough += Math.ceil(l.survivorHp);
            if (l.winner === "enemy") enemyBreakthrough += Math.ceil(l.survivorHp);
        }

        await sleep(400);
        if (playerBreakthrough > 0 || enemyBreakthrough > 0) {
            addArenaLog(`--- Breakthrough ---`);
            if (playerBreakthrough > 0) addArenaLog(`Your survivors push through for ${playerBreakthrough} total breakthrough damage!`, "win");
            if (enemyBreakthrough > 0) addArenaLog(`Enemy survivors push through for ${enemyBreakthrough} total breakthrough damage!`, "lose");
        }

        const playerLanesWon = lanes.filter(l => l.winner === "player").length;
        const enemyLanesWon = lanes.filter(l => l.winner === "enemy").length;

        await sleep(1000);

        // Determine winner: lanes won first, then breakthrough as tiebreaker
        let playerWon;
        if (playerLanesWon !== enemyLanesWon) {
            playerWon = playerLanesWon > enemyLanesWon;
        } else {
            playerWon = playerBreakthrough >= enemyBreakthrough;
        }

        showArenaResult(playerWon, playerLanesWon, enemyLanesWon, playerBreakthrough, enemyBreakthrough, lanes);
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

    function showArenaResult(playerWon, pLanes, eLanes, pBreak, eBreak, lanes) {
        showArenaPhase("result");

        const banner = document.getElementById("arena-result-banner");
        const title = document.getElementById("arena-result-title");
        const subtitle = document.getElementById("arena-result-subtitle");

        if (playerWon) {
            banner.className = "result-banner victory";
            title.textContent = "ARENA VICTORY!";
            subtitle.textContent = `Lanes won: ${pLanes}-${eLanes} | Breakthrough: ${pBreak} vs ${eBreak}`;
        } else {
            banner.className = "result-banner defeat";
            title.textContent = "ARENA DEFEAT";
            subtitle.textContent = `Lanes won: ${pLanes}-${eLanes} | Breakthrough: ${pBreak} vs ${eBreak}`;
        }

        // Lane-by-lane summary
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

        // Track in battle history
        state.battleHistory.unshift({
            opponent: `Arena (${arenaState.difficulty === 1 ? "Easy" : arenaState.difficulty === 2 ? "Medium" : "Hard"})`,
            won: playerWon,
            score: `${pLanes}-${eLanes}`,
            date: new Date().toISOString(),
        });
        if (state.battleHistory.length > 20) state.battleHistory.pop();
        if (playerWon) state.raidsWon++;
        else state.raidsLost++;
        saveState();
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

        // Rarity bars
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

        // Battle history
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
        }
    }

    // --- Event Listeners ---
    function init() {
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
        document.querySelectorAll(".arena-diff-btn").forEach(btn => {
            btn.addEventListener("click", () => startArena(parseInt(btn.dataset.diff)));
        });
        document.querySelectorAll(".arena-drop").forEach(slot => {
            slot.addEventListener("click", () => placeCardInLane(parseInt(slot.dataset.lane)));
        });
        document.getElementById("arena-fight-btn").addEventListener("click", startArenaFight);
        document.getElementById("arena-reset-btn").addEventListener("click", resetArenaPlacement);
        document.getElementById("arena-again-btn").addEventListener("click", () => showArenaPhase("lobby"));

        // Initialize
        resetPackUI();
    }

    init();
})();
