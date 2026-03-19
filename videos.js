// Video database for TubeGacha
// Each video has: id (YouTube video ID), title, channel, views, category, description
// Rarity is calculated from view count at runtime

const VIDEO_DATABASE = [
    // === MYTHIC (5B+ views) ===
    { id: "kJQP7kiw5Fk", title: "Luis Fonsi - Despacito ft. Daddy Yankee", channel: "Luis Fonsi", views: 8300000000, category: "Music", description: "One of the most-viewed videos in YouTube history. A true Mythic." },
    { id: "JGwWNGJdvx8", title: "Ed Sheeran - Shape of You", channel: "Ed Sheeran", views: 6200000000, category: "Music", description: "Ed Sheeran's massive pop hit. Over 6 billion views." },
    { id: "RgKAFK5djSk", title: "Wiz Khalifa - See You Again ft. Charlie Puth", channel: "Wiz Khalifa", views: 6100000000, category: "Music", description: "Tribute to Paul Walker from Furious 7. Briefly held the #1 spot." },
    { id: "OPf0YbXqDm0", title: "Mark Ronson - Uptown Funk ft. Bruno Mars", channel: "Mark Ronson", views: 5100000000, category: "Music", description: "The funk anthem that dominated 2015. 14 weeks at #1." },
    { id: "9bZkp7q19f0", title: "PSY - GANGNAM STYLE", channel: "officialpsy", views: 5000000000, category: "Music", description: "The global phenomenon that broke YouTube's view counter." },

    // === LEGENDARY (1B-5B views) ===
    { id: "dQw4w9WgXcQ", title: "Rick Astley - Never Gonna Give You Up", channel: "Rick Astley", views: 1500000000, category: "Music", description: "The official video for Rick Astley's iconic 1987 hit." },
    { id: "60ItHLz5WEA", title: "Alan Walker - Faded", channel: "Alan Walker", views: 3700000000, category: "Music", description: "The Norwegian producer's breakout EDM hit." },
    { id: "YqeW9_5kURI", title: "Major Lazer - Lean On ft. MO", channel: "Major Lazer", views: 3500000000, category: "Music", description: "A genre-blending dance hit." },
    { id: "lp-EO5I60KA", title: "Eminem - Love The Way You Lie ft. Rihanna", channel: "Eminem", views: 2400000000, category: "Music", description: "The explosive collaboration that defined 2010." },
    { id: "HP-MbfHFUqs", title: "Taylor Swift - Shake It Off", channel: "Taylor Swift", views: 3500000000, category: "Music", description: "Taylor's pop reinvention anthem." },
    { id: "pRpeEdMmmQ0", title: "Shakira - Waka Waka", channel: "Shakira", views: 3600000000, category: "Music", description: "The 2010 FIFA World Cup official song." },

    // === EPIC (500M-1B views) ===
    { id: "YbJOTdZBX1g", title: "Charlie Bit My Finger", channel: "HDCYT", views: 900000000, category: "Comedy", description: "The classic viral video of two brothers that defined early YouTube." },
    { id: "FTQbiNvZqaY", title: "Toto - Africa", channel: "Toto", views: 800000000, category: "Music", description: "The 1982 classic that became a meme and a timeless hit." },
    { id: "fJ9rUzIMcZQ", title: "Queen - Bohemian Rhapsody", channel: "Queen Official", views: 500000000, category: "Music", description: "The legendary six-minute epic from 1975." },
    { id: "hY7m5jjJ9mM", title: "Cooking The Perfect Steak", channel: "Gordon Ramsay", views: 550000000, category: "Food", description: "Gordon Ramsay demonstrates how to cook the perfect steak at home." },
    { id: "e-ORhEE9VVg", title: "Taylor Swift - Blank Space", channel: "Taylor Swift", views: 800000000, category: "Music", description: "The satirical pop masterpiece from 1989." },
    { id: "YQHsXMglC9A", title: "Adele - Hello", channel: "Adele", views: 700000000, category: "Music", description: "Adele's record-breaking comeback single." },

    // === SUPER RARE (100M-500M views) ===
    { id: "hT_nvWreIhg", title: "OneRepublic - Counting Stars", channel: "OneRepublic", views: 400000000, category: "Music", description: "Hit single from the album Native." },
    { id: "dqTTojTija8", title: "HUMANS Need Not Apply", channel: "CGP Grey", views: 200000000, category: "Education", description: "A thought-provoking look at automation and the future of work." },
    { id: "aircAruvnKk", title: "How to make mass-energy equivalence", channel: "3Blue1Brown", views: 150000000, category: "Education", description: "An elegant mathematical explanation of E=mc2." },
    { id: "ktvTqknDobU", title: "Imagine Dragons - Radioactive", channel: "Imagine Dragons", views: 350000000, category: "Music", description: "The rock anthem that defined early 2010s alternative." },
    { id: "ZZ5LpwO-An4", title: "HEYYEYAAEYAAAEYAEYAA", channel: "Fabulous Secret Powers", views: 200000000, category: "Comedy", description: "He-Man sings a beloved meme." },
    { id: "GI_P3UtZXAA", title: "Keyboard Cat", channel: "Charlie Schmidt", views: 150000000, category: "Comedy", description: "The original keyboard-playing cat that launched a meme empire." },
    { id: "QH2-TGUlwu4", title: "Nyan Cat", channel: "Nyan Cat", views: 200000000, category: "Comedy", description: "10 hours of the rainbow pop-tart cat." },
    { id: "450p7goxZqg", title: "Mark Rober - Glitter Bomb Trap", channel: "Mark Rober", views: 300000000, category: "Tech", description: "The viral porch pirate revenge video with engineering genius." },

    // === RARE (10M-100M views) ===
    { id: "rE3j_RHkqJc", title: "Water - Pair of Kings Explained", channel: "Lemmino", views: 30000000, category: "Education", description: "A deep dive into one of history's greatest mysteries." },
    { id: "SsoOG6ZeyUI", title: "What Is The Speed of Dark?", channel: "Vsauce", views: 50000000, category: "Education", description: "Michael Stevens explores a mind-bending question." },
    { id: "JTvcpdfGUtQ", title: "Primitive Technology: Tiled Roof Hut", channel: "Primitive Technology", views: 80000000, category: "Education", description: "Building a tiled roof hut from scratch in the wilderness." },
    { id: "iuYxGtuBSgk", title: "I Built a Mass-Produced Laser Tower", channel: "Stuff Made Here", views: 15000000, category: "Tech", description: "An engineer builds an insane automated laser project." },
    { id: "GEM_fM0JD-s", title: "The Deep Web Explained", channel: "Aperture", views: 20000000, category: "Education", description: "What really lurks beneath the surface web." },
    { id: "REWeBzGuzCc", title: "Solving The IMPOSSIBLE Lock Puzzle", channel: "LockPickingLawyer", views: 25000000, category: "Entertainment", description: "Can even the best lock picker defeat this puzzle?" },
    { id: "r6sGWTCMz2k", title: "If the Moon Were Only 1 Pixel", channel: "Kurzgesagt", views: 40000000, category: "Education", description: "A scale model of the solar system." },
    { id: "MBRqu0YOH14", title: "Sliding Down a Stair Rail = Bad Idea", channel: "FailArmy", views: 60000000, category: "Comedy", description: "A compilation of the most epic fails." },
    { id: "n_Dv4JMiwgE", title: "The Most Illegal Things in the World", channel: "RealLifeLore", views: 35000000, category: "Education", description: "Surprising things that are banned around the world." },
    { id: "HEfHFsfGXjs", title: "7 Riddles That Will Test Your Brain Power", channel: "Bright Side", views: 75000000, category: "Entertainment", description: "Can you solve these tricky riddles?" },
    { id: "dNJdJIwCF_Y", title: "Chopin - Nocturne op.9 No.2", channel: "Rousseau", views: 50000000, category: "Music", description: "A beautiful piano visualization of Chopin's famous nocturne." },
    { id: "KxGRhd_iWuE", title: "How to Make a Website in 10 mins", channel: "Fireship", views: 12000000, category: "Tech", description: "Speed-run web development tutorial." },

    // === UNCOMMON (1M-10M views) ===
    { id: "Kas0tIxDvrg", title: "The History of the World, I Guess", channel: "bill wurtz", views: 9000000, category: "Education", description: "A chaotic, musical summary of world history." },
    { id: "4O1TbUHGN_k", title: "Why Gravity is NOT a Force", channel: "Veritasium", views: 8000000, category: "Education", description: "Einstein's general relativity explained." },
    { id: "MFzDaBzBlL0", title: "Minecraft but everything is random", channel: "Dream", views: 5000000, category: "Gaming", description: "A chaotic Minecraft challenge." },
    { id: "p8u_k2LIZyo", title: "Fast Inverse Square Root", channel: "Nemean", views: 3000000, category: "Tech", description: "The legendary Quake III algorithm explained." },
    { id: "R9OHn5ZF4Uo", title: "Map of Computer Science", channel: "Domain of Science", views: 7000000, category: "Education", description: "Every field of computer science in one map." },
    { id: "UyyjU8fzEYU", title: "The Banach-Tarski Paradox", channel: "Vsauce", views: 4000000, category: "Education", description: "Can you really turn one sphere into two?" },
    { id: "IP-rGJKSZ3s", title: "Marble Machine - Wintergatan", channel: "Wintergatan", views: 6000000, category: "Music", description: "A handmade music machine that plays with marbles." },
    { id: "CFRjGQ1d-U0", title: "How a CPU Works", channel: "In One Lesson", views: 2000000, category: "Tech", description: "Everything you need to know about processors." },
    { id: "wvJc9CZcvBc", title: "The 10 Types of Coworkers", channel: "Dhar Mann", views: 8000000, category: "Comedy", description: "Relatable workplace comedy sketches." },
    { id: "XqZsoesa55w", title: "Baby Shark Dance", channel: "Pinkfong", views: 5000000, category: "Entertainment", description: "The children's song that took over the world (again)." },
    { id: "AaZ_RSt0KP8", title: "Exploring an Abandoned Mall", channel: "The Proper People", views: 3000000, category: "Entertainment", description: "Urban exploration of a creepy abandoned shopping center." },
    { id: "LJ4W1g-6JiY", title: "Math Has a Fatal Flaw", channel: "Veritasium", views: 9000000, category: "Education", description: "Godel's incompleteness theorems explained." },

    // === COMMON (<1M views) ===
    { id: "ZM1fkHQP_Pw", title: "Making Sourdough for the First Time", channel: "Pro Home Cooks", views: 800000, category: "Food", description: "A beginner's journey into sourdough bread." },
    { id: "oHg5SJYRHA0", title: "How To Properly Set Up a Development Environment", channel: "Coding Garden", views: 500000, category: "Tech", description: "Step-by-step dev environment setup." },
    { id: "U6s2pdxebSo", title: "A Peaceful Walk Through Kyoto", channel: "Rambalac", views: 400000, category: "Travel", description: "A calming 4K walk through the ancient streets of Kyoto." },
    { id: "1La4QzGeaaQ", title: "10 Obscure Wikipedia Rabbit Holes", channel: "Thoughty2", views: 300000, category: "Education", description: "Fascinating Wikipedia articles you've never heard of." },
    { id: "PkZNo7MFNFg", title: "Learning Piano as an Adult", channel: "Piano Keys", views: 600000, category: "Music", description: "Tips for adult beginners picking up the piano." },
    { id: "NqC_1GuY3dw", title: "Budget Travel Tips for Japan", channel: "Abroad in Japan", views: 900000, category: "Travel", description: "How to explore Japan without breaking the bank." },
    { id: "o-YBDTqX_ZU", title: "How to Make the Perfect Espresso", channel: "James Hoffmann", views: 700000, category: "Food", description: "The science and art of espresso extraction." },
    { id: "dQw4w9WgXcR", title: "Beginner Yoga - 20 Minute Flow", channel: "Yoga With Adriene", views: 950000, category: "Fitness", description: "A gentle yoga session for complete beginners." },
    { id: "z9Uz1icjwrM", title: "Painting a Landscape with Bob Ross Technique", channel: "Painting Studio", views: 250000, category: "Art", description: "Happy little trees, step by step." },
    { id: "NpEaa2P7qZI", title: "Tour of My Tiny Apartment in Tokyo", channel: "Tokyo Lens", views: 450000, category: "Travel", description: "Living small in one of the world's biggest cities." },
    { id: "3JZ_D3ELwOQ", title: "Building My First Mechanical Keyboard", channel: "Switch and Click", views: 350000, category: "Tech", description: "A complete build log of a custom mech keyboard." },
    { id: "tO01J-M3g0U", title: "How I Organize My Notes with Obsidian", channel: "Nicole van der Hoeven", views: 200000, category: "Tech", description: "A second brain workflow tour." },
];

// Categories and their emoji icons
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

// Fetches the top 10 most-viewed YouTube videos live from Wikipedia
async function fetchTop10Videos() {
    const WIKI_API = "https://en.wikipedia.org/api/rest_v1/page/html/List_of_most-viewed_YouTube_videos";

    try {
        const resp = await fetch(WIKI_API);
        if (!resp.ok) throw new Error("Wiki fetch failed");

        const html = await resp.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // The first big wikitable contains the top videos
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

            // Find YouTube link to extract video ID
            const links = row.querySelectorAll('a[href*="youtube.com"], a[href*="youtu.be"]');
            let videoId = "";
            for (const link of links) {
                const href = link.getAttribute("href") || "";
                const match = href.match(/(?:watch\?v=|youtu\.be\/)([\w-]{11})/);
                if (match) { videoId = match[1]; break; }
            }

            // Parse title: usually the first cell or first link text
            const nameCell = cells[0];
            const titleLink = nameCell.querySelector("a");
            let title = (titleLink ? titleLink.textContent : nameCell.textContent).trim();
            title = title.replace(/\[.*?\]/g, "").trim();

            // Parse artist/channel: usually second cell
            const artistCell = cells[1];
            const artistLink = artistCell.querySelector("a");
            let channel = (artistLink ? artistLink.textContent : artistCell.textContent).trim();
            channel = channel.replace(/\[.*?\]/g, "").trim();

            // Parse views: find cell containing "billion" or large numbers
            let views = 0;
            for (const cell of cells) {
                const text = cell.textContent.replace(/,/g, "").trim();
                const billionMatch = text.match(/([\d.]+)\s*billion/i);
                if (billionMatch) {
                    views = Math.round(parseFloat(billionMatch[1]) * 1_000_000_000);
                    break;
                }
                const numMatch = text.match(/^(\d{9,})/);
                if (numMatch) {
                    views = parseInt(numMatch[1], 10);
                    break;
                }
            }

            if (!title || views === 0) continue;

            results.push({
                id: videoId,
                title,
                channel,
                views,
                category: "Music",
                description: `#${results.length + 1} most-viewed YouTube video of all time with ${(views / 1_000_000_000).toFixed(1)} billion views.`,
                rank: results.length + 1,
            });
        }

        if (results.length >= 5) return results;
        throw new Error("Not enough results parsed");
    } catch (err) {
        console.warn("Wikipedia fetch failed, using fallback:", err);
        return TOP_10_FALLBACK;
    }
}

// Fallback data in case Wikipedia is unreachable
const TOP_10_FALLBACK = [
    { id: "LLF3GMfNEYU", title: "Baby Shark Dance", channel: "Pinkfong", views: 14900000000, category: "Entertainment", description: "#1 most-viewed YouTube video of all time with 14.9 billion views.", rank: 1 },
    { id: "kJQP7kiw5Fk", title: "Despacito", channel: "Luis Fonsi", views: 8400000000, category: "Music", description: "#2 most-viewed YouTube video of all time with 8.4 billion views.", rank: 2 },
    { id: "JGwWNGJdvx8", title: "Shape of You", channel: "Ed Sheeran", views: 6400000000, category: "Music", description: "#3 most-viewed YouTube video of all time with 6.4 billion views.", rank: 3 },
    { id: "RgKAFK5djSk", title: "See You Again", channel: "Wiz Khalifa", views: 6200000000, category: "Music", description: "#4 most-viewed YouTube video of all time with 6.2 billion views.", rank: 4 },
    { id: "kXYiU_JCYtU", title: "Recipe for Disaster", channel: "Masha and the Bear", views: 5600000000, category: "Entertainment", description: "#5 most-viewed YouTube video of all time with 5.6 billion views.", rank: 5 },
    { id: "OPf0YbXqDm0", title: "Uptown Funk", channel: "Mark Ronson ft. Bruno Mars", views: 5100000000, category: "Music", description: "#6 most-viewed YouTube video of all time with 5.1 billion views.", rank: 6 },
    { id: "9bZkp7q19f0", title: "GANGNAM STYLE", channel: "PSY", views: 5000000000, category: "Music", description: "#7 most-viewed YouTube video of all time with 5.0 billion views.", rank: 7 },
    { id: "CevxZvSJLk8", title: "Johny Johny Yes Papa", channel: "LooLoo Kids", views: 4900000000, category: "Entertainment", description: "#8 most-viewed YouTube video of all time with 4.9 billion views.", rank: 8 },
    { id: "IPXIgEAGe4U", title: "Bath Song", channel: "CoComelon", views: 4800000000, category: "Entertainment", description: "#9 most-viewed YouTube video of all time with 4.8 billion views.", rank: 9 },
    { id: "60ItHLz5WEA", title: "Faded", channel: "Alan Walker", views: 4000000000, category: "Music", description: "#10 most-viewed YouTube video of all time with 4.0 billion views.", rank: 10 },
];

// Elemental type chart — every category has strengths and weaknesses
// attacker -> list of categories it deals super effective damage to
const TYPE_ADVANTAGES = {
    "Music":         ["Comedy", "Art"],          // Sonic drowns out laughter, inspires beyond art
    "Comedy":        ["Education", "Fitness"],    // Chaos disrupts focus, makes you skip gym
    "Education":     ["Tech", "Gaming"],          // Wisdom deconstructs circuits, outwits gamers
    "Tech":          ["Entertainment", "Travel"], // Circuit hacks the show, replaces wandering
    "Entertainment": ["Music", "Food"],           // Spectacle overshadows sound, distracts from cooking
    "Food":          ["Fitness", "Travel"],       // Hearth tempts discipline, makes you stay home
    "Travel":        ["Art", "Comedy"],           // Wanderer finds new beauty, broadens beyond jokes
    "Gaming":        ["Entertainment", "Music"],  // Pixel outplays the show, drowns out melody
    "Fitness":       ["Tech", "Gaming"],          // Iron crushes circuits, outlasts gamers
    "Art":           ["Education", "Food"],        // Muse transcends knowledge, elevates cuisine
};

// AI opponent pool
const AI_OPPONENTS = [
    { name: "xX_ViralKing_Xx", avatar: "👑", title: "Meme Hoarder", difficulty: 1, flavor: "Collects only the dankest memes." },
    { name: "MelodyMaster", avatar: "🎸", title: "Music Fanatic", difficulty: 1, flavor: "Their playlist is their weapon." },
    { name: "Professor_Wiki", avatar: "🎓", title: "Knowledge Seeker", difficulty: 2, flavor: "Educates opponents into submission." },
    { name: "TechBro9000", avatar: "🤖", title: "Silicon Valley Stan", difficulty: 2, flavor: "Disrupts the competition." },
    { name: "NostalgiaTrip", avatar: "📼", title: "Vintage Collector", difficulty: 2, flavor: "Only watches pre-2010 classics." },
    { name: "AlgoGod", avatar: "⚡", title: "Algorithm's Favorite", difficulty: 3, flavor: "The algorithm feeds them legendary pulls." },
    { name: "ChefTube", avatar: "👨‍🍳", title: "Culinary Curator", difficulty: 1, flavor: "Wins battles with taste." },
    { name: "WanderLens", avatar: "🌍", title: "Globe Trotter", difficulty: 1, flavor: "Has watched every travel vlog ever." },
    { name: "LOL_Compiled", avatar: "💀", title: "Comedy Connoisseur", difficulty: 2, flavor: "Dies laughing, then wins." },
    { name: "TheCollector", avatar: "💎", title: "Legendary Hunter", difficulty: 3, flavor: "Rumored to have every legendary card." },
    { name: "ClickbaitQueen", avatar: "🖱️", title: "Thumbnail Tactician", difficulty: 2, flavor: "You WON'T BELIEVE their collection." },
    { name: "RetroGamer42", avatar: "🕹️", title: "Pixel Warrior", difficulty: 1, flavor: "Still waiting for Half-Life 3." },
];
