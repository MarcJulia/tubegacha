# TubeGacha

A browser-based collectible card game where YouTube videos become battle cards. Open daily packs, build your collection, and fight in strategic card battles.

## Setup

```bash
npm install
node server.js
```

Open http://localhost:3000, go to Settings, and enter a YouTube Data API v3 key. Cards are fetched live from YouTube each time you open a pack.

## Features

### Gacha Packs
- 3 daily packs, 3 cards per pack
- Each pack pulls fresh videos from the YouTube API
- 7 rarity tiers based on view count: Common, Uncommon, Rare, Super Rare, Epic, Legendary, Mythic
- Duplicate tracking and NEW badges

### Trading Card Design
- Full card frames with art window, name plate, flavor text, and stat bar
- Holographic shimmer effect on Super Rare, Epic, Legendary, and Mythic cards
- Rarity stars (1-7) and color-coded borders
- Elemental type emblem on each card

### 10 Elemental Types
Every video category has a unique element with stat bonuses and type matchups:

| Element | Category | Strength |
|---|---|---|
| Sonic | Music | +25% ATK |
| Chaos | Comedy | +15% HP |
| Wisdom | Education | +25% DEF |
| Circuit | Tech | +15% ATK, +10% DEF |
| Spectacle | Entertainment | +10% HP |
| Hearth | Food | +25% HP |
| Wanderer | Travel | +15% DEF |
| Pixel | Gaming | +20% ATK |
| Iron | Fitness | +10% ATK, +5% DEF |
| Muse | Art | +15% HP |

Each element is strong against 2 others (1.75x damage) and weak to 2 others (0.55x damage).

### Raid Battle
- 2 daily raids against AI opponents
- Sequential best-of-3 card combat with animated HP bars and attack effects
- Win to steal a card from the opponent's deck

### Grid Arena
- 3-lane battlefield — see the enemy formation, then counter-position your cards
- All lanes resolve simultaneously with turn-by-turn combat
- Surviving cards deal breakthrough damage as a tiebreaker
- Unlimited plays — no daily limit

### Top 10 Leaderboard
- Fetches the real top 10 most-viewed YouTube videos live from Wikipedia
- Shows ownership status for each card

### Stats & History
- Total cards, unique cards, rarity distribution
- Raids won/lost, cards stolen
- Recent battle history with W/L tracking

## Tech

- Express + better-sqlite3 backend
- Vanilla HTML, CSS, JavaScript frontend
- YouTube Data API v3 for live video pulls
- SQLite stores only collected cards and game state (no pre-built video pool)
- Wikipedia REST API for live Top 10 data

## Files

| File | Description |
|---|---|
| `server.js` | Express server, SQLite schema, YouTube API fetching, opponent generation |
| `index.html` | Single-page app with tab navigation |
| `style.css` | Dark theme, card design, battle animations |
| `app.js` | Game engine: gacha, battles, arena, state management |
| `videos.js` | API helpers, type chart, Wikipedia Top 10 scraper |

## License

MIT
