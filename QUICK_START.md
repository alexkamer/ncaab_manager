# Quick Start - One Table at a Time

## Initial Setup (One Time)

```bash
./start_here.sh
```

This sets up everything and populates the seasons table.

---

## Population Steps

### ✅ Step 1: Seasons (DONE by start_here.sh)

```bash
python populate_seasons.py
```

**Time**: 2-3 minutes
**API Calls**: ~88 seasons
**Verify**: `sqlite3 ncaab.db "SELECT COUNT(*) FROM seasons;"`
**Expected**: 88 seasons

---

### 📍 Step 2: Venues

```bash
python populate_venues.py
```

**Time**: 3-5 minutes
**API Calls**: ~988 venues
**Verify**: `sqlite3 ncaab.db "SELECT COUNT(*) FROM venues;"`
**Expected**: ~988 venues

**Test first** (optional):
```bash
python populate_venues.py 100  # Just 100 venues
```

---

### 🏫 Step 3: Teams (with Groups/Conferences)

**Test with 50 teams first**:
```bash
python populate_teams.py 2026 50
```

**Time**: 2-3 minutes
**Verify**: `sqlite3 ncaab.db "SELECT COUNT(*) FROM teams;"`
**Expected**: 50 teams

**Then populate all teams**:
```bash
python populate_teams.py 2026
```

**Time**: 15-25 minutes
**API Calls**: ~1,105 teams
**Verify**: `sqlite3 ncaab.db "SELECT COUNT(*) FROM teams;"`
**Expected**: ~1,105 teams

---

### 🏀 Step 4: Events (Games)

**Start with one day**:
```bash
python populate_events.py 2026 20260112
```

**Time**: 1-2 minutes
**API Calls**: ~20 games
**Verify**: `sqlite3 ncaab.db "SELECT COUNT(*) FROM events WHERE date LIKE '2026-01-12%';"`

**Then one month**:
```bash
python populate_events.py 2026 202601
```

**Time**: 5-10 minutes
**API Calls**: ~150-200 games

**Finally full season**:
```bash
python populate_events.py 2026
```

**Time**: 30-60 minutes
**API Calls**: ~5,000+ games
**Verify**: `sqlite3 ncaab.db "SELECT COUNT(*) FROM events WHERE season_id = 2026;"`

---

## Rate Limiting

**Current setting** (in `.env`):
```bash
RATE_LIMIT=5  # 5 requests per second (safe)
```

**If you get rate limited**:
1. Edit `.env` and change to `RATE_LIMIT=2`
2. Wait 15-30 minutes
3. Resume where you left off

---

## Check Progress

```bash
sqlite3 ncaab.db "
SELECT
    'Seasons' as table_name, COUNT(*) as count FROM seasons
    UNION ALL SELECT 'Venues', COUNT(*) FROM venues
    UNION ALL SELECT 'Groups', COUNT(*) FROM groups
    UNION ALL SELECT 'Teams', COUNT(*) FROM teams
    UNION ALL SELECT 'Events', COUNT(*) FROM events;
"
```

---

## Estimated Timeline

| Step | Time | Total Time |
|------|------|------------|
| Setup + Seasons | 5 min | 5 min |
| Venues | 5 min | 10 min |
| Teams (test 50) | 3 min | 13 min |
| Teams (all) | 25 min | 38 min |
| Events (one day) | 2 min | 40 min |
| Events (one month) | 10 min | 50 min |
| Events (full season) | 60 min | 110 min (~2 hours) |

**Total for complete 2026 season**: ~2 hours

---

## Resume After Interruption

All scripts use `INSERT OR REPLACE`, so you can safely re-run them:

```bash
# These are safe to re-run - won't duplicate data
python populate_seasons.py
python populate_venues.py
python populate_teams.py 2026
python populate_events.py 2026
```

---

## Help

- **Full documentation**: `README.md`
- **Step-by-step guide**: `STEP_BY_STEP.md`
- **API documentation**: `ESPN_API_DOCS.md`
- **Database schema**: `database_schema.sql`
