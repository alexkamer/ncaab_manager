# Step-by-Step Population Guide

This guide walks through populating each table individually to avoid rate limiting issues and allow you to verify data at each step.

## Prerequisites

```bash
# Setup (one time)
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# Initialize database
python populate_all.py --init
```

## Rate Limiting Configuration

Edit `.env` to set a conservative rate limit:

```bash
RATE_LIMIT=5  # 5 requests per second (safe)
```

Or for very safe operation:

```bash
RATE_LIMIT=2  # 2 requests per second (very safe)
```

---

## Step 1: Seasons

**What it does**: Fetches all NCAA basketball seasons (1939-2026, 88 total seasons)

**Estimated time**: 1-2 minutes

**API calls**: ~88 requests (one per season)

```bash
python populate_seasons.py
```

**Verify**:
```bash
sqlite3 ncaab.db "SELECT COUNT(*) FROM seasons;"
# Should return: 88

sqlite3 ncaab.db "SELECT year FROM seasons ORDER BY year DESC LIMIT 5;"
# Should show: 2026, 2025, 2024, 2023, 2022
```

**Or check specific season**:
```bash
python populate_seasons.py 2026
```

---

## Step 2: Season Types

**What it does**: Fetches season types (Preseason, Regular, Postseason, Off Season) for each season

**Estimated time**: 2-3 minutes

**API calls**: ~88 seasons × 4 types = ~352 requests

This is already done by `populate_seasons.py`, but you can verify:

```bash
sqlite3 ncaab.db "SELECT COUNT(*) FROM season_types;"
# Should return: ~352 (88 seasons × 4 types each)

sqlite3 ncaab.db "SELECT type_name, COUNT(*) FROM season_types GROUP BY type_name;"
# Should show counts for each type
```

---

## Step 3: Venues

**What it does**: Fetches all basketball venues/arenas

**Estimated time**: 3-5 minutes (independent of seasons)

**API calls**: ~988 venues

```bash
python populate_venues.py
```

**Verify**:
```bash
sqlite3 ncaab.db "SELECT COUNT(*) FROM venues;"
# Should return: ~988

sqlite3 ncaab.db "SELECT full_name, city, state FROM venues LIMIT 5;"
# Should show venue names and locations
```

**Test with limited data first**:
```bash
python populate_venues.py 100
# Just first 100 venues
```

---

## Step 4: Groups (Conferences/Divisions)

**What it does**: Fetches conferences and divisions for a specific season

**Estimated time**: 1-2 minutes per season

**API calls**: ~2 divisions + ~31 conferences = ~33 requests per season

```bash
python populate_teams.py 2026
# This populates both groups AND teams
```

Or to populate JUST groups (modify the script to skip teams):

```bash
python -c "
from database import Database
from api_client import ESPNAPIClient
from populate_teams import populate_groups

db = Database()
client = ESPNAPIClient()
db.connect()
populate_groups(db, client, 2026)
db.close()
print('Groups populated!')
"
```

**Verify**:
```bash
sqlite3 ncaab.db "SELECT COUNT(*) FROM groups WHERE season_id = 2026;"
# Should return: ~33

sqlite3 ncaab.db "SELECT name, is_conference FROM groups WHERE season_id = 2026 AND is_conference = 0;"
# Should show divisions (like NCAA Division I)

sqlite3 ncaab.db "SELECT name FROM groups WHERE season_id = 2026 AND is_conference = 1 LIMIT 10;"
# Should show conferences (like ACC, Big Ten, etc.)
```

---

## Step 5: Teams

**What it does**: Fetches all teams for a specific season

**Estimated time**: 15-25 minutes for all teams

**API calls**: ~1,105 teams (for 2026)

**RECOMMENDED**: Start with a small subset to test:

```bash
# Just 50 teams
python populate_teams.py 2026 50
```

**Verify**:
```bash
sqlite3 ncaab.db "SELECT COUNT(*) FROM teams;"
sqlite3 ncaab.db "SELECT display_name, abbreviation FROM teams LIMIT 10;"
```

**Then populate all teams**:
```bash
python populate_teams.py 2026
```

**Full verify**:
```bash
sqlite3 ncaab.db "SELECT COUNT(*) FROM teams;"
# Should return: ~1105

sqlite3 ncaab.db "SELECT COUNT(*) FROM team_seasons WHERE season_id = 2026;"
# Should also return: ~1105
```

---

## Step 6: Events (Games)

**What it does**: Fetches all games for a specific time period

**Estimated time**:
- Single day: 1-2 minutes (~20 games)
- Month: 5-10 minutes (~150-200 games)
- Full season: 30-60 minutes (~5,000+ games)

**RECOMMENDED**: Start with a single day:

```bash
# Today's games
TODAY=$(date +%Y%m%d)
python populate_events.py 2026 $TODAY

# Or specific date
python populate_events.py 2026 20260112
```

**Verify**:
```bash
sqlite3 ncaab.db "SELECT COUNT(*) FROM events WHERE date LIKE '2026-01-12%';"
sqlite3 ncaab.db "SELECT away_team_id, home_team_id, home_score, away_score FROM events LIMIT 5;"
```

**Then try a month**:
```bash
# January 2026
python populate_events.py 2026 202601
```

**Verify**:
```bash
sqlite3 ncaab.db "SELECT COUNT(*) FROM events WHERE date LIKE '2026-01%';"
```

**Finally, full season** (takes longest):
```bash
python populate_events.py 2026
```

**Full verify**:
```bash
sqlite3 ncaab.db "SELECT COUNT(*) FROM events WHERE season_id = 2026;"
sqlite3 ncaab.db "
SELECT
    strftime('%Y-%m', date) as month,
    COUNT(*) as games
FROM events
WHERE season_id = 2026
GROUP BY month
ORDER BY month;
"
```

---

## Step 7: Athletes (Optional - Future)

Not yet implemented in the population scripts, but structure is in place.

Would fetch ~7,941 players for 2026 season.

---

## Step 8: Game Statistics (Optional - Future)

Not yet implemented. Would require:
- Fetching detailed game summaries
- Parsing boxscore data
- Populating team_statistics and player_statistics tables

---

## Progress Tracking

Create a simple status file:

```bash
cat > population_status.txt << EOF
Seasons: [ ] Not started  [X] Complete
Season Types: [ ] Not started  [X] Complete
Venues: [ ] Not started  [ ] In Progress  [ ] Complete
Groups: [ ] Not started  [ ] Complete (Year: ____)
Teams: [ ] Not started  [ ] Complete (Year: ____)
Events: [ ] Not started  [ ] Complete (Year: ____)

Notes:
- Rate limit set to: ____ req/sec
- Last run: ____
- Issues encountered: ____
EOF
```

---

## Troubleshooting

### Rate Limited

Reduce rate in `.env`:
```bash
RATE_LIMIT=2
```

Wait 15-30 minutes before retrying.

### Incomplete Data

Check for errors in output. Some data may be missing from ESPN's API - this is normal. The scripts skip errors and continue.

### Database Locked

Only one process can write to SQLite at a time. Make sure previous script finished before starting next one.

### Verify Database Integrity

```bash
sqlite3 ncaab.db "PRAGMA integrity_check;"
# Should return: ok
```

---

## Recommended Order for 2026 Season

**Phase 1: Setup** (5 minutes)
1. Seasons ✓
2. Season Types ✓ (done with seasons)
3. Venues ✓

**Phase 2: Structure** (20-30 minutes)
4. Groups (conferences/divisions)
5. Teams (start with 50, then all)

**Phase 3: Games** (30-60 minutes)
6. Events - start with one day
7. Events - then one month
8. Events - finally full season

**Total Time**: ~1-2 hours for complete 2026 season

---

## Quick Check Commands

```bash
# Overall counts
sqlite3 ncaab.db "
SELECT
    'Seasons' as table_name, COUNT(*) as count FROM seasons
    UNION ALL
    SELECT 'Season Types', COUNT(*) FROM season_types
    UNION ALL
    SELECT 'Venues', COUNT(*) FROM venues
    UNION ALL
    SELECT 'Groups', COUNT(*) FROM groups
    UNION ALL
    SELECT 'Teams', COUNT(*) FROM teams
    UNION ALL
    SELECT 'Events', COUNT(*) FROM events;
"

# 2026 Season specific
sqlite3 ncaab.db "
SELECT
    'Teams (2026)' as item, COUNT(*) as count FROM team_seasons WHERE season_id = 2026
    UNION ALL
    SELECT 'Events (2026)', COUNT(*) FROM events WHERE season_id = 2026
    UNION ALL
    SELECT 'Completed Games (2026)', COUNT(*) FROM events WHERE season_id = 2026 AND is_completed = 1;
"
```
