# 🏈 NFL Draft Tracker 2026

**Pittsburgh, PA | April 23–25, 2026**

A broadcast-style web app for tracking the 2026 NFL Draft — round by round, team by team — with the bold energy of NFL on Fox.

---

## Features

- **Pick Board** — Navigate rounds 1–7, each pick showing number, team, player, position, college, and projected contract
- **Pick Detail** — Click any pick for scouting notes, combine stats, mock draft ranges, and 10-source consensus rankings
- **Trade Tracker** — Flagged trade picks with full exchange details
- **Team View** — All 32 teams with projected depth charts merging existing roster + draft picks
- **Remaining Prospects** — Undrafted players ranked by composite pre-draft ranking, filterable by position/college
- **Position Summary** — How many QBs, WRs, EDGEs, etc. were taken and where
- **Live Search** — Filter any view by player name, team, position, or college

## Design

Inspired by the NFL on Fox broadcast aesthetic — dark studio background, bold typography, team-colored accents, confetti animations on top picks.

## Screenshot

> _Screenshot placeholder — deploy and add after first run_

## Setup

```bash
# Clone the repo
git clone https://github.com/jschmale50/NFL-Draft-App-Project.git
cd NFL-Draft-App-Project

# Serve locally (any static server works)
npx serve .
# or
python -m http.server 8080
```

Then open `http://localhost:8080` (or `http://localhost:3000` with `npx serve`).

## GitHub Pages Deployment

1. Push to `main` branch
2. Go to **Settings → Pages**
3. Set source to **Deploy from a branch → main / (root)**
4. Site will be live at `https://jschmale50.github.io/NFL-Draft-App-Project/`

## Updating Draft Data

All draft data lives in `data/draft-2026.json`. Each pick entry:

```json
{
  "overall": 1,
  "round": 1,
  "pick": 1,
  "team": "TEN",
  "player": { "name": "Cam Ward", "position": "QB", "college": "Miami", ... },
  "contract": { "years": 4, "value": "$44.5M", ... },
  "tradeInfo": null
}
```

Set `"status": "confirmed"` once a pick is official, `"projected"` for mock data.

## Tech Stack

- Vanilla HTML / CSS / JavaScript — zero dependencies
- JSON data file — easy to update each year
- Static site — deploys anywhere (GitHub Pages, Netlify, Vercel)
