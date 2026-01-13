# NCAA Basketball Database - Setup Guide

## Quick Setup (Recommended)

Run the automated setup script:

```bash
chmod +x quickstart.sh
./quickstart.sh
```

This will:
1. Create a Python virtual environment
2. Install all dependencies
3. Create configuration file
4. Initialize the database

## Manual Setup

If you prefer to set up manually:

### 1. Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure

```bash
cp .env.example .env
# Edit .env with your preferences (optional)
```

### 4. Initialize Database

```bash
python populate_all.py --init
```

## Usage Examples

### Quick Test

Populate limited data for testing:

```bash
python populate_all.py --quick
```

### Full Season

Populate complete season data:

```bash
python populate_all.py --season 2026
```

This takes 15-30 minutes depending on API rate limits and will populate:
- Season and type information
- ~1,100 teams
- ~990 venues
- All conferences and divisions
- All games for the season

### Specific Components

```bash
# Just teams for 2026
python populate_all.py --teams --year 2026

# Just today's games
TODAY=$(date +%Y%m%d)
python populate_events.py 2026 $TODAY

# Specific team's games (Arizona = team_id 12)
python populate_events.py 2026 12
```

## File Overview

### Core Files
- `database_schema.sql` - Complete database schema (17 tables)
- `ESPN_API_DOCS.md` - Comprehensive API documentation (12 endpoints)
- `README.md` - Full usage documentation

### Configuration
- `.env` - Your configuration (create from .env.example)
- `config.py` - Configuration loader
- `requirements.txt` - Python dependencies

### Database & API
- `database.py` - Database connection and utilities
- `api_client.py` - ESPN API client with rate limiting
- `utils.py` - Helper functions for queries and analysis

### Population Scripts
- `populate_all.py` - Master script with CLI
- `populate_seasons.py` - Seasons and season types
- `populate_teams.py` - Teams, conferences, divisions
- `populate_venues.py` - Arenas and stadiums
- `populate_events.py` - Games and events

### Helpers
- `quickstart.sh` - Automated setup script
- `.gitignore` - Git ignore patterns

## Database Schema Overview

### 17 Tables Total

**Core Structure (5 tables)**
- seasons
- season_types
- groups (conferences/divisions)
- teams
- team_seasons

**Game Data (4 tables)**
- events (games)
- team_statistics
- player_statistics
- standings

**People & Places (3 tables)**
- athletes
- athlete_seasons
- venues

**Advanced Data (5 tables)**
- game_odds (betting lines)
- game_predictions (BPI)
- ranking_types
- weekly_rankings (AP Poll, Coaches)
- rankings_receiving_votes
- rankings_dropped_out

## What Gets Populated

### `populate_all.py --season 2026`

Populates:
1. **Season Info**: 2026 season with 4 season types
2. **Venues**: ~988 arenas nationwide
3. **Groups**: 2 divisions + 31 conferences (33 total)
4. **Teams**: ~1,105 teams across all divisions
5. **Events**: All games for the season (~5,000+ games)

### Additional Data (To Be Added)

These require additional scripts (not yet created):
- Game statistics (team/player level)
- Detailed athlete information
- Betting odds
- BPI predictions
- Rankings data

## Next Steps

After basic setup:

1. **Test the database**:
   ```bash
   python utils.py
   ```

2. **Query the data**:
   ```python
   from database import Database

   db = Database()
   db.connect()

   # Get team schedule
   cursor = db.execute("""
       SELECT date, home_team_id, away_team_id
       FROM events
       WHERE season_id = 2026
       LIMIT 10
   """)
   for row in cursor.fetchall():
       print(row)
   ```

3. **Build your application**:
   - Use the database for analytics
   - Create visualizations
   - Build a web interface
   - Generate reports

## Common Issues

### Rate Limiting
If you get rate limited, reduce the rate in `.env`:
```
RATE_LIMIT=5
```

### Database Locked
SQLite only allows one writer at a time. The scripts handle this automatically.

### Missing Data
Some games may not have complete data. Scripts skip errors and continue.

### Memory Issues
For very large datasets, consider using PostgreSQL instead of SQLite.

## Performance Tips

1. **Use indexes**: The schema includes appropriate indexes
2. **Batch operations**: Scripts use `executemany()` for bulk inserts
3. **Rate limiting**: Balance speed vs API limits
4. **Selective population**: Only populate data you need

## Database Size

Expected sizes with full data:
- Basic season (teams, games): ~50 MB
- With statistics: ~200 MB
- Multiple seasons: ~200 MB per season
- Historical data (all 88 seasons): ~5+ GB

## Support

For issues or questions:
1. Check `README.md` for detailed documentation
2. Review `ESPN_API_DOCS.md` for API details
3. Examine the database schema in `database_schema.sql`
4. Look at example queries in `README.md`

## Development

To add new data types:

1. Add parsing function in appropriate populate script
2. Create database insertion logic
3. Update master script if needed
4. Document in README.md

Example structure:
```python
def parse_new_data(data: Dict) -> tuple:
    # Extract fields
    return (field1, field2, ...)

def populate_new_data(db: Database, client: ESPNAPIClient):
    # Fetch from API
    data = client.get_new_data()

    # Parse
    parsed = [parse_new_data(d) for d in data]

    # Insert
    db.executemany("INSERT INTO new_table VALUES (?, ?)", parsed)
    db.commit()
```

## License

Educational and personal use. Respect ESPN's terms of service.
