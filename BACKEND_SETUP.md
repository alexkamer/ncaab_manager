# Backend Setup & Running Instructions

## Running the API Server with Auto-Reload

For **development**, run the API server with auto-reload enabled. This will automatically restart the server when you make code changes:

```bash
cd api
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### What this does:
- `--reload`: Watches for file changes and automatically restarts
- `--host 0.0.0.0`: Makes server accessible from other devices on your network
- `--port 8000`: Runs on port 8000 (frontend expects this)

### Alternative: Run without auto-reload (production-like)
```bash
cd api
python main.py
```

---

## Keeping Data Updated

You have **two update scripts** that serve different purposes:

### 1. **Full Update** (`update.py`) - Run Daily
Updates all data types: events, statistics, odds, predictions, rankings, standings, and entities.

```bash
# Default: Updates last 7 days of games + current rankings/standings
python update.py

# Custom date range
python update.py --days 14

# Skip optional updates
python update.py --skip-rankings --skip-standings
```

**Recommended schedule**: Run once per day (e.g., 6 AM)

---

### 2. **Upcoming Games** (`update_upcoming_games.py`) - Run Frequently
Fetches upcoming games for the next 7 days + updates live scores.

```bash
# Fetch next 7 days of games
python update_upcoming_games.py

# Fetch next 14 days
python update_upcoming_games.py --days 14
```

**Recommended schedule**: Run every 5-15 minutes during game days

**What it fetches**:
- Upcoming scheduled games (not yet started)
- Live games (in progress, scores updating)
- Recently completed games (final scores)

---

## Automated Update Strategy

### Option 1: Cron Jobs (macOS/Linux)

Edit your crontab:
```bash
crontab -e
```

Add these lines:
```bash
# Full update once daily at 6 AM
0 6 * * * cd /Users/alexkamer/ncaab_manager && /Users/alexkamer/ncaab_manager/.venv/bin/python update.py >> /tmp/ncaab_update.log 2>&1

# Upcoming games every 10 minutes (during basketball season)
*/10 * * * * cd /Users/alexkamer/ncaab_manager && /Users/alexkamer/ncaab_manager/.venv/bin/python update_upcoming_games.py >> /tmp/ncaab_upcoming.log 2>&1
```

### Option 2: Manual Updates

Run these as needed:
```bash
# Before viewing the site for the first time each day
python update.py

# To see live scores / upcoming games
python update_upcoming_games.py
```

---

## Why Two Scripts?

**`update.py`** (Comprehensive but slow):
- Fetches detailed statistics, odds, predictions
- Updates rankings and standings
- Makes many API calls (takes 2-5 minutes)
- Best for: Daily full data refresh

**`update_upcoming_games.py`** (Fast and focused):
- Only fetches game events (no detailed stats)
- Updates scores for live games
- Makes fewer API calls (takes 10-30 seconds)
- Best for: Keeping scores current throughout the day

---

## Quick Start Commands

```bash
# 1. Activate virtual environment (if not already active)
source .venv/bin/activate

# 2. Start API server with auto-reload
cd api
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# In another terminal:
# 3. Run upcoming games update
python update_upcoming_games.py
```

Now your backend will:
- ✅ Auto-reload when you change API code
- ✅ Show upcoming games on the homepage
- ✅ Display live scores when games are in progress

---

## Verifying It Works

After running `update_upcoming_games.py`, check the database:

```bash
sqlite3 ncaab.db "SELECT COUNT(*) FROM events WHERE is_completed = 0 AND date > datetime('now');"
```

This should return a number > 0 if there are upcoming games.

Visit `http://localhost:3000` and you should see:
- "Featured Games" showing upcoming conference games
- Live games in the "Live Now" section (if any are in progress)
