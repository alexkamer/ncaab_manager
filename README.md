# NCAA Basketball Database Manager

A comprehensive database system for NCAA Men's College Basketball data, with Python scripts to populate data from the ESPN API.

## Features

- **Complete database system** for NCAA Basketball data
- **FastAPI backend** with RESTful endpoints
- **Next.js 15 frontend** with modern UI
- **Python scripts** to populate data from ESPN API
- Support for:
  - Seasons and season types
  - Teams, conferences, and divisions
  - Games/events and statistics
  - Players/athletes
  - Venues
  - Betting odds
  - BPI predictions
  - AP Poll and Coaches Poll rankings

## Quick Start

### Backend Setup

1. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

2. **Configure environment:**

Copy the example environment file and customize:

```bash
cp .env.example .env
```

Edit `.env` to set your preferences:
- `DATABASE_PATH`: SQLite database file path (default: `ncaab.db`)
- `RATE_LIMIT`: API requests per second (default: 10)
- `DEFAULT_SEASON`: Default season year (default: 2026)

3. **Initialize database:**
```bash
python populate_all.py --init
```

4. **Populate data:**
```bash
python populate_all.py --season 2026
python update_latest_rankings.py
```

5. **Start API server:**
```bash
cd api
python main.py
# API runs on http://localhost:8000
```

### Frontend Setup

1. **Install Node.js dependencies:**
```bash
cd frontend
npm install
```

2. **Start development server:**
```bash
npm run dev
# Frontend runs on http://localhost:3000
```

### Access the Application

- **Frontend:** http://localhost:3000
- **API Docs:** http://localhost:8000/docs
- **API Root:** http://localhost:8000

## Usage

### Quick Start

Populate a full season with all data:

```bash
python populate_all.py --season 2026
```

This will populate:
1. Season and season type information
2. All venues
3. All teams, groups, and conferences
4. All games/events for the season

### Quick Test Population

For testing or development, use limited data:

```bash
python populate_all.py --quick
```

This populates:
- One season
- 50 teams
- 100 venues
- Current month's games

### Individual Components

Populate specific data types:

```bash
# Seasons
python populate_all.py --seasons --year 2026

# Teams and conferences
python populate_all.py --teams --year 2026

# Venues
python populate_all.py --venues

# Events/games
python populate_all.py --events --year 2026
```

### Direct Script Usage

You can also run individual scripts directly:

```bash
# Seasons
python populate_seasons.py [year] [limit]
python populate_seasons.py 2026        # Specific year
python populate_seasons.py             # All seasons

# Teams
python populate_teams.py [year] [limit]
python populate_teams.py 2026          # All teams for 2026
python populate_teams.py 2026 50       # First 50 teams

# Venues
python populate_venues.py [limit]
python populate_venues.py              # All venues
python populate_venues.py 100          # First 100 venues

# Events
python populate_events.py [year] [team_id or date]
python populate_events.py 2026         # All games for 2026
python populate_events.py 2026 12      # All games for team 12
python populate_events.py 2026 202601  # January 2026 games
python populate_events.py 2026 20260112  # Specific day
```

## Database Schema

The database includes 17 tables:

### Core Tables
- `seasons` - Season information (1939-2026+)
- `season_types` - Season phases (preseason, regular, postseason)
- `groups` - Divisions and conferences (hierarchical)
- `teams` - Team information
- `team_seasons` - Team-season relationships

### Game Data
- `events` - Games/events
- `team_statistics` - Team stats per game
- `player_statistics` - Player stats per game
- `standings` - Conference/division standings

### People & Places
- `athletes` - Player information
- `athlete_seasons` - Player-season relationships
- `venues` - Arenas/stadiums

### Advanced Data
- `game_odds` - Betting lines
- `game_predictions` - ESPN BPI predictions
- `ranking_types` - Poll types (AP, Coaches)
- `weekly_rankings` - Top 25 rankings
- `rankings_receiving_votes` - Teams receiving votes
- `rankings_dropped_out` - Teams dropped from rankings

See `database_schema.sql` for complete schema details.

## API Documentation

Complete ESPN API documentation is available in `ESPN_API_DOCS.md`, including:
- All endpoints with examples
- Request/response formats
- Query parameters
- Use cases and notes

## Project Structure

```
ncaab_manager/
├── README.md                      # Project documentation
├── requirements.txt               # Python dependencies
├── .env.example                   # Environment template
├── .gitignore                     # Git ignore rules
│
├── api/                           # FastAPI backend
│   └── main.py                    # API server
│
├── frontend/                      # Next.js 15 frontend
│   ├── app/                       # App router pages
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Home page
│   │   ├── games/                 # Games pages
│   │   ├── teams/                 # Teams pages
│   │   ├── players/               # Players pages
│   │   └── rankings/              # Rankings pages
│   ├── package.json               # Node dependencies
│   └── tsconfig.json              # TypeScript config
│
├── config.py                      # Configuration
├── database.py                    # Database utilities
├── api_client.py                  # ESPN API client
├── utils.py                       # Helper functions
│
├── populate_*.py                  # Data population scripts
├── update_latest_rankings.py      # Update rankings
│
└── ncaab.db                       # SQLite database (ignored)
```

## Data Population Order

The scripts handle dependencies automatically, but the correct order is:

1. **Seasons** - Must be first (other tables reference seasons)
2. **Venues** - Independent, can be done anytime
3. **Groups** - Divisions and conferences (needed for teams)
4. **Teams** - Requires seasons and groups
5. **Events** - Requires seasons and teams
6. **Game Details** - Requires events (statistics, odds, predictions)
7. **Athletes** - Can be done after teams
8. **Rankings** - Can be done after teams and seasons

## Rate Limiting

The API client respects rate limits (default: 10 requests/second). Adjust in `.env`:

```
RATE_LIMIT=10
```

For large data pulls, the scripts show progress bars and handle pagination automatically.

## Examples

### Populate 2026 Season
```bash
# Initialize database
python populate_all.py --init

# Populate full season
python populate_all.py --season 2026
```

### Populate Multiple Seasons
```bash
# Populate 2024, 2025, 2026
for year in 2024 2025 2026; do
    python populate_all.py --season $year
done
```

### Update Today's Games
```bash
# Get today's date in YYYYMMDD format
TODAY=$(date +%Y%m%d)

# Populate today's games
python populate_events.py 2026 $TODAY
```

### Populate Specific Team
```bash
# Arizona (team_id: 12) for 2026
python populate_events.py 2026 12
```

## Database Queries

Example queries for common use cases:

```sql
-- Top 25 teams by wins
SELECT t.display_name, s.wins, s.losses, s.win_percentage
FROM standings s
JOIN teams t ON s.team_id = t.team_id
WHERE s.season_id = 2026 AND s.season_type_id = 2
ORDER BY s.wins DESC
LIMIT 25;

-- Upcoming games today
SELECT
    away.display_name AS away_team,
    home.display_name AS home_team,
    e.date,
    v.full_name AS venue
FROM events e
JOIN teams away ON e.away_team_id = away.team_id
JOIN teams home ON e.home_team_id = home.team_id
LEFT JOIN venues v ON e.venue_id = v.venue_id
WHERE DATE(e.date) = DATE('now')
ORDER BY e.date;

-- Team's season record
SELECT
    t.display_name,
    COUNT(*) as games_played,
    SUM(CASE WHEN e.winner_team_id = t.team_id THEN 1 ELSE 0 END) as wins,
    SUM(CASE WHEN e.winner_team_id != t.team_id AND e.is_completed THEN 1 ELSE 0 END) as losses
FROM teams t
JOIN events e ON (e.home_team_id = t.team_id OR e.away_team_id = t.team_id)
WHERE t.team_id = 12
  AND e.season_id = 2026
  AND e.is_completed = 1;

-- Current AP Poll Top 10
SELECT
    wr.current_rank,
    t.display_name,
    wr.points,
    wr.first_place_votes,
    wr.record_summary
FROM weekly_rankings wr
JOIN teams t ON wr.team_id = t.team_id
WHERE wr.ranking_type_id = 1  -- AP Poll
  AND wr.season_id = 2026
  AND wr.week_number = (
      SELECT MAX(week_number)
      FROM weekly_rankings
      WHERE season_id = 2026 AND ranking_type_id = 1
  )
ORDER BY wr.current_rank
LIMIT 10;
```

## Troubleshooting

### Rate Limit Errors
Reduce `RATE_LIMIT` in `.env` if you're getting rate limited.

### Database Locked
If using SQLite, only one connection can write at a time. The scripts handle this automatically.

### Missing Data
Some endpoints may not have data for all games/teams. The scripts skip missing data and continue.

### API Changes
ESPN APIs may change. Check `ESPN_API_DOCS.md` for current endpoints and update scripts as needed.

## Contributing

Feel free to submit issues or pull requests for:
- Additional data types (rankings, odds, predictions, detailed stats)
- Performance improvements
- Bug fixes
- Documentation improvements

## License

This project is for educational and personal use. Please respect ESPN's terms of service when using their API.

## Notes

- The ESPN API is unofficial and subject to change
- Some data may not be available for all seasons/games
- Historical data completeness varies by season
- Large data pulls may take significant time (progress bars provided)
- Database size will grow with more seasons (expect 100MB+ per season with full data)
