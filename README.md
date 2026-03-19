# TubeGacha

A browser-based collectible card game where YouTube videos become battle cards. Open daily packs, build your collection, and fight in strategic card battles.

## Play

Open `index.html` in any modern browser. No server or build step required.

## Features

### Gacha Packs
- 3 daily packs, 3 cards per pack
- 5 rarity tiers based on view count: Common, Uncommon, Rare, Super Rare, Legendary
- Weighted pull rates — legendaries are rare (~3%)
- Duplicate tracking and NEW badges

### Trading Card Design
- Full card frames with art window, name plate, flavor text, and stat bar
- Holographic shimmer effect on Super Rare and Legendary cards
- Rarity stars (1-5) and color-coded borders
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
- 12 opponents across Easy, Medium, and Hard difficulty
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
- Falls back to cached data if offline

### Stats & History
- Total cards, unique cards, rarity distribution
- Raids won/lost, cards stolen
- Recent battle history with W/L tracking

## Tech

- Vanilla HTML, CSS, JavaScript — no dependencies
- All state persisted in `localStorage`
- YouTube thumbnails loaded via `img.youtube.com`
- Wikipedia REST API for live Top 10 data

## Files

| File | Description |
|---|---|
| `index.html` | Main page with all views |
| `style.css` | Dark theme, card design, battle animations |
| `app.js` | Game engine: gacha, battles, arena, state management |
| `videos.js` | Video database, type chart, AI opponents |

## License

MIT
