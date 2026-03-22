# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

TubeGacha is a browser-based collectible card game where YouTube videos become battle cards. Players open daily gacha packs, build collections, and fight in raid battles and grid arena matches. Cards are fetched live from the YouTube Data API — there is no pre-built video pool.

## Running the App

```bash
npm install
node server.js
# Server runs at http://localhost:3000
```

A YouTube Data API v3 key must be entered in the Settings view before opening packs. Each pack open fetches 3 fresh videos from YouTube.

There are no tests, no linter, and no build step.

## Architecture

**Express + SQLite backend, vanilla JS frontend.**

- **`server.js`** — Express 5 + better-sqlite3. Manages an in-memory video buffer that refills from YouTube API (mostPopular or search) when depleted. The `/api/pull` endpoint pops cards from this buffer. DB stores only collected cards, game state, battle history, and settings — no video pool table. Opponents are procedurally generated server-side.
- **`videos.js`** — Client-side API layer. Wraps all `/api/*` calls. Holds `TYPE_ADVANTAGES` (element matchup chart), `CATEGORY_ICONS`, and the Wikipedia Top 10 scraper (runs client-side via `DOMParser`).
- **`app.js`** — Game engine (async IIFE). Manages pack opening (calls `/api/pull`), card stat calculation, raid battles (best-of-3), grid arena (3-lane), collection rendering, and all DOM interaction. `getVideoById()` looks up from the local collection state. Opponent decks draw from the player's collection.
- **`index.html`** — Single-page app with tab navigation (`data-view` buttons). All views are `<section>` elements toggled by class.
- **`style.css`** — Dark theme with CSS custom properties for rarity colors. Card holographic shimmer effects, battle animations.

## Key Game Mechanics

- **7 rarity tiers**: Common, Uncommon, Rare, Super Rare, Epic, Legendary, Mythic (based on YouTube view count thresholds in `RARITY_TIERS`)
- **10 elemental types** mapped from YouTube categories, each with ATK/DEF/HP multipliers (`ELEMENT_PROFILES`) and a type advantage chart (`TYPE_ADVANTAGES` in videos.js)
- **Card stats** are deterministic: base stats from rarity tier + view-count-based variance + elemental multipliers (see `getCardStats()`)
- **Type effectiveness**: 1.75x (super effective), 0.55x (resisted), computed in `getTypeMultiplier()`

## Database Schema (SQLite)

Tables: `collection` (video metadata + count), `game_state` (key-value), `battle_history`, `settings` (key-value). No videos table — the video pool lives in server memory, fetched on demand from YouTube.
