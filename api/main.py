"""
NCAA Basketball API - FastAPI Backend
Provides RESTful API endpoints for accessing NCAA basketball data
"""

from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict, Any
import sqlite3
from datetime import datetime
from contextlib import contextmanager
import httpx

app = FastAPI(
    title="NCAA Basketball API",
    description="API for NCAA Men's College Basketball data",
    version="1.0.0"
)

# CORS configuration - allow Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database configuration
DATABASE_PATH = "/Users/alexkamer/ncaab_manager/ncaab.db"


@contextmanager
def get_db():
    """Database connection context manager"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def dict_from_row(row) -> Dict[str, Any]:
    """Convert sqlite3.Row to dictionary"""
    return {key: row[key] for key in row.keys()}


async def fetch_games_from_espn(date: str) -> List[Dict[str, Any]]:
    """Fetch games from ESPN API for a specific date"""
    try:
        # Convert YYYY-MM-DD to YYYYMMDD format for ESPN API
        date_formatted = date.replace('-', '')
        url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates={date_formatted}&limit=200"

        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            response.raise_for_status()
            data = response.json()

        games = []
        for event in data.get('events', []):
            competition = event['competitions'][0]

            # Find home and away teams
            home_team = next((c for c in competition['competitors'] if c['homeAway'] == 'home'), None)
            away_team = next((c for c in competition['competitors'] if c['homeAway'] == 'away'), None)

            if not home_team or not away_team:
                continue

            # Determine game status
            status_obj = competition['status']['type']
            status = status_obj['name']
            is_completed = status == 'STATUS_FINAL'

            # Get game time for scheduled games
            status_detail = status_obj.get('shortDetail', '')

            # Get odds information (use first provider, typically DraftKings)
            odds_data = competition.get('odds', [])
            spread = None
            over_under = None
            favorite_abbr = None

            if odds_data and len(odds_data) > 0:
                primary_odds = odds_data[0]
                spread = primary_odds.get('spread')
                over_under = primary_odds.get('overUnder')

                # Determine which team is favored
                home_odds = primary_odds.get('homeTeamOdds', {})
                away_odds = primary_odds.get('awayTeamOdds', {})

                if home_odds.get('favorite'):
                    favorite_abbr = home_team['team']['abbreviation']
                elif away_odds.get('favorite'):
                    favorite_abbr = away_team['team']['abbreviation']

            game = {
                'event_id': int(event['id']),
                'date': event['date'],
                'home_score': int(home_team.get('score', 0)) if home_team.get('score') else 0,
                'away_score': int(away_team.get('score', 0)) if away_team.get('score') else 0,
                'status': status,
                'status_detail': status_detail,
                'is_completed': is_completed,
                'is_conference_game': competition.get('conferenceCompetition', False),
                'venue_name': competition['venue'].get('fullName', ''),
                'home_team_name': home_team['team']['displayName'],
                'home_team_abbr': home_team['team']['abbreviation'],
                'home_team_logo': home_team['team'].get('logo', ''),
                'away_team_name': away_team['team']['displayName'],
                'away_team_abbr': away_team['team']['abbreviation'],
                'away_team_logo': away_team['team'].get('logo', ''),
                'spread': spread,
                'over_under': over_under,
                'favorite_abbr': favorite_abbr,
            }
            games.append(game)

        return games
    except Exception as e:
        print(f"Error fetching from ESPN API: {e}")
        return []


@app.get("/")
def read_root():
    """API root endpoint"""
    return {
        "message": "NCAA Basketball API",
        "version": "1.0.0",
        "endpoints": {
            "games": "/api/games",
            "teams": "/api/teams",
            "players": "/api/players",
            "rankings": "/api/rankings",
            "standings": "/api/standings",
            "today": "/api/today"
        }
    }


@app.get("/api/today")
def get_today():
    """Get current server date in YYYY-MM-DD format"""
    from datetime import datetime
    today = datetime.now().strftime('%Y-%m-%d')
    return {
        "date": today,
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/games")
async def get_games(
    season: Optional[int] = Query(None, description="Season year (e.g., 2026)"),
    team_id: Optional[int] = Query(None, description="Filter by team ID"),
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    limit: int = Query(50, le=200, description="Number of results"),
    offset: int = Query(0, description="Pagination offset")
):
    """Get games with optional filters"""
    with get_db() as conn:
        cursor = conn.cursor()

        query = """
            SELECT
                e.event_id,
                e.date,
                e.home_score,
                e.away_score,
                e.status,
                e.is_completed,
                e.is_conference_game,
                e.venue_name,
                ht.display_name as home_team_name,
                ht.abbreviation as home_team_abbr,
                ht.logo_url as home_team_logo,
                at.display_name as away_team_name,
                at.abbreviation as away_team_abbr,
                at.logo_url as away_team_logo
            FROM events e
            LEFT JOIN teams ht ON e.home_team_id = ht.team_id
            LEFT JOIN teams at ON e.away_team_id = at.team_id
            WHERE 1=1
        """
        params = []

        # Skip season filter since season_id is 0 in events table

        if team_id:
            query += " AND (e.home_team_id = ? OR e.away_team_id = ?)"
            params.extend([team_id, team_id])

        if date_from:
            query += " AND DATE(e.date) >= ?"
            params.append(date_from)

        if date_to:
            query += " AND DATE(e.date) <= ?"
            params.append(date_to)

        query += " ORDER BY e.date DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        cursor.execute(query, params)
        games = [dict_from_row(row) for row in cursor.fetchall()]

        # If no games found and we're filtering by a single date, try ESPN API
        if len(games) == 0 and date_from and date_from == date_to:
            espn_games = await fetch_games_from_espn(date_from)
            return {
                "games": espn_games,
                "count": len(espn_games),
                "limit": limit,
                "offset": offset,
                "source": "espn"
            }

        return {
            "games": games,
            "count": len(games),
            "limit": limit,
            "offset": offset,
            "source": "database"
        }


@app.get("/api/games/{event_id}")
def get_game_detail(event_id: int):
    """Get detailed information about a specific game"""
    with get_db() as conn:
        cursor = conn.cursor()

        # Get game info
        cursor.execute("""
            SELECT
                e.*,
                ht.display_name as home_team_name,
                ht.abbreviation as home_team_abbr,
                ht.logo_url as home_team_logo,
                ht.color as home_team_color,
                at.display_name as away_team_name,
                at.abbreviation as away_team_abbr,
                at.logo_url as away_team_logo,
                at.color as away_team_color,
                s.year as season_year
            FROM events e
            JOIN teams ht ON e.home_team_id = ht.team_id
            JOIN teams at ON e.away_team_id = at.team_id
            JOIN seasons s ON e.season_id = s.season_id
            WHERE e.event_id = ?
        """, (event_id,))

        game = cursor.fetchone()
        if not game:
            raise HTTPException(status_code=404, detail="Game not found")

        game_dict = dict_from_row(game)

        # Get team statistics
        cursor.execute("""
            SELECT * FROM team_statistics
            WHERE event_id = ?
        """, (event_id,))
        game_dict["team_stats"] = [dict_from_row(row) for row in cursor.fetchall()]

        # Get predictions if available
        cursor.execute("""
            SELECT * FROM game_predictions
            WHERE event_id = ?
        """, (event_id,))
        prediction = cursor.fetchone()
        if prediction:
            game_dict["prediction"] = dict_from_row(prediction)

        return game_dict


@app.get("/api/teams")
def get_teams(
    search: Optional[str] = Query(None, description="Search by team name"),
    conference_id: Optional[int] = Query(None, description="Filter by conference"),
    division: Optional[int] = Query(None, description="Filter by division (e.g., 50 for Division I)"),
    season: int = Query(2026, description="Season year"),
    limit: int = Query(100, le=500),
    offset: int = Query(0)
):
    """Get list of teams"""
    with get_db() as conn:
        cursor = conn.cursor()

        query = """
            SELECT DISTINCT
                t.team_id,
                t.uid,
                t.display_name,
                t.abbreviation,
                t.logo_url,
                t.color,
                t.venue_name,
                t.venue_city,
                t.venue_state,
                g.name as conference_name,
                g.abbreviation as conference_abbr
            FROM teams t
            LEFT JOIN team_seasons ts ON t.team_id = ts.team_id
            LEFT JOIN seasons s ON ts.season_id = s.season_id
            LEFT JOIN groups g ON ts.group_id = g.group_id
            WHERE s.year = ?
            AND (
                SELECT COUNT(*) FROM events e
                WHERE (e.home_team_id = t.team_id OR e.away_team_id = t.team_id)
                AND e.season_id = s.season_id
            ) >= 5
        """
        params = [season]

        if search:
            query += " AND t.display_name LIKE ?"
            params.append(f"%{search}%")

        if conference_id:
            query += " AND ts.group_id = ?"
            params.append(conference_id)

        if division:
            query += " AND g.parent_group_id = ?"
            params.append(division)

        query += " ORDER BY t.display_name LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        cursor.execute(query, params)
        teams = [dict_from_row(row) for row in cursor.fetchall()]

        return {
            "teams": teams,
            "count": len(teams),
            "season": season
        }


@app.get("/api/teams/{team_id}")
def get_team_detail(team_id: int, season: int = Query(2026)):
    """Get detailed team information"""
    with get_db() as conn:
        cursor = conn.cursor()

        # Get team info
        cursor.execute("""
            SELECT
                t.*,
                g.name as conference_name,
                g.abbreviation as conference_abbr
            FROM teams t
            LEFT JOIN team_seasons ts ON t.team_id = ts.team_id
            LEFT JOIN seasons s ON ts.season_id = s.season_id
            LEFT JOIN groups g ON ts.group_id = g.group_id
            WHERE t.team_id = ? AND s.year = ?
        """, (team_id, season))

        team = cursor.fetchone()
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")

        team_dict = dict_from_row(team)

        # Get team's games
        cursor.execute("""
            SELECT
                e.event_id,
                e.date,
                e.home_score,
                e.away_score,
                e.is_completed,
                e.venue_name,
                CASE WHEN e.home_team_id = ? THEN 'home' ELSE 'away' END as location,
                CASE WHEN e.home_team_id = ? THEN at.display_name ELSE ht.display_name END as opponent_name,
                CASE WHEN e.home_team_id = ? THEN at.logo_url ELSE ht.logo_url END as opponent_logo
            FROM events e
            JOIN teams ht ON e.home_team_id = ht.team_id
            JOIN teams at ON e.away_team_id = at.team_id
            JOIN seasons s ON e.season_id = s.season_id
            WHERE (e.home_team_id = ? OR e.away_team_id = ?) AND s.year = ?
            ORDER BY e.date DESC
            LIMIT 50
        """, (team_id, team_id, team_id, team_id, team_id, season))
        team_dict["games"] = [dict_from_row(row) for row in cursor.fetchall()]

        # Get roster
        cursor.execute("""
            SELECT
                a.athlete_id,
                a.full_name,
                a.display_name,
                a.position_name,
                a.height_inches,
                a.weight_lbs,
                aseason.jersey,
                aseason.experience_display
            FROM athletes a
            JOIN athlete_seasons aseason ON a.athlete_id = aseason.athlete_id
            JOIN seasons s ON aseason.season_id = s.season_id
            WHERE aseason.team_id = ? AND s.year = ? AND aseason.is_active = 1
            ORDER BY a.position_name, a.full_name
        """, (team_id, season))
        team_dict["roster"] = [dict_from_row(row) for row in cursor.fetchall()]

        return team_dict


@app.get("/api/players")
def get_players(
    team_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None, description="Search by player name"),
    season: int = Query(2026),
    limit: int = Query(50, le=200),
    offset: int = Query(0)
):
    """Get list of players"""
    with get_db() as conn:
        cursor = conn.cursor()

        query = """
            SELECT
                a.athlete_id,
                a.full_name,
                a.display_name,
                a.position_name,
                a.height_inches,
                a.weight_lbs,
                aseason.jersey,
                aseason.experience_display,
                t.display_name as team_name,
                t.logo_url as team_logo
            FROM athletes a
            JOIN athlete_seasons aseason ON a.athlete_id = aseason.athlete_id
            JOIN seasons s ON aseason.season_id = s.season_id
            JOIN teams t ON aseason.team_id = t.team_id
            WHERE s.year = ? AND aseason.is_active = 1
        """
        params = [season]

        if team_id:
            query += " AND aseason.team_id = ?"
            params.append(team_id)

        if search:
            query += " AND a.full_name LIKE ?"
            params.append(f"%{search}%")

        query += " ORDER BY a.full_name LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        cursor.execute(query, params)
        players = [dict_from_row(row) for row in cursor.fetchall()]

        return {
            "players": players,
            "count": len(players)
        }


@app.get("/api/players/{athlete_id}")
def get_player_detail(athlete_id: int, season: int = Query(2026)):
    """Get detailed player information"""
    with get_db() as conn:
        cursor = conn.cursor()

        # Get player info
        cursor.execute("""
            SELECT
                a.*,
                aseason.jersey,
                aseason.experience_display,
                aseason.experience_years,
                t.display_name as team_name,
                t.logo_url as team_logo
            FROM athletes a
            JOIN athlete_seasons aseason ON a.athlete_id = aseason.athlete_id
            JOIN seasons s ON aseason.season_id = s.season_id
            JOIN teams t ON aseason.team_id = t.team_id
            WHERE a.athlete_id = ? AND s.year = ?
        """, (athlete_id, season))

        player = cursor.fetchone()
        if not player:
            raise HTTPException(status_code=404, detail="Player not found")

        player_dict = dict_from_row(player)

        # Get player statistics
        cursor.execute("""
            SELECT
                ps.*,
                e.date,
                e.name as game_name,
                t.display_name as opponent_name
            FROM player_statistics ps
            JOIN events e ON ps.event_id = e.event_id
            JOIN teams t ON (
                CASE
                    WHEN e.home_team_id = ps.team_id THEN e.away_team_id
                    ELSE e.home_team_id
                END = t.team_id
            )
            JOIN seasons s ON e.season_id = s.season_id
            WHERE ps.athlete_id = ? AND s.year = ?
            ORDER BY e.date DESC
        """, (athlete_id, season))
        player_dict["game_stats"] = [dict_from_row(row) for row in cursor.fetchall()]

        return player_dict


@app.get("/api/rankings")
def get_rankings(
    week: Optional[int] = Query(None, description="Week number"),
    ranking_type: str = Query("ap", description="Ranking type (ap, usa, etc.)"),
    season: int = Query(2026)
):
    """Get rankings (AP Poll, Coaches Poll, etc.)"""
    with get_db() as conn:
        cursor = conn.cursor()

        # If no week specified, get latest week
        if week is None:
            cursor.execute("""
                SELECT MAX(week_number)
                FROM weekly_rankings wr
                JOIN seasons s ON wr.season_id = s.season_id
                JOIN ranking_types rt ON wr.ranking_type_id = rt.ranking_type_id
                WHERE s.year = ? AND UPPER(rt.type_code) = UPPER(?)
            """, (season, ranking_type))
            result = cursor.fetchone()
            week = result[0] if result[0] is not None else 1

        cursor.execute("""
            SELECT
                wr.current_rank,
                wr.previous_rank,
                wr.trend,
                wr.points,
                wr.first_place_votes,
                wr.wins,
                wr.losses,
                wr.record_summary,
                t.team_id,
                t.display_name as team_name,
                t.abbreviation as team_abbr,
                t.logo_url as team_logo,
                rt.name as ranking_name
            FROM weekly_rankings wr
            JOIN teams t ON wr.team_id = t.team_id
            JOIN seasons s ON wr.season_id = s.season_id
            JOIN ranking_types rt ON wr.ranking_type_id = rt.ranking_type_id
            WHERE s.year = ? AND wr.week_number = ? AND UPPER(rt.type_code) = UPPER(?)
            ORDER BY wr.current_rank, wr.points DESC
            LIMIT 25
        """, (season, week, ranking_type))

        rankings = [dict_from_row(row) for row in cursor.fetchall()]

        return {
            "rankings": rankings,
            "season": season,
            "week": week,
            "ranking_type": ranking_type
        }


@app.get("/api/conferences")
def get_conferences():
    """Get list of conferences"""
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                group_id,
                uid,
                name,
                abbreviation,
                logo_url
            FROM groups
            WHERE is_conference = 1
            ORDER BY name
        """)

        conferences = [dict_from_row(row) for row in cursor.fetchall()]

        return {"conferences": conferences}


@app.get("/api/standings")
def get_standings(
    conference_id: Optional[int] = Query(None),
    season: int = Query(2026)
):
    """Get conference standings"""
    with get_db() as conn:
        cursor = conn.cursor()

        # Get latest week number for rankings
        cursor.execute("""
            SELECT MAX(week_number)
            FROM weekly_rankings
            WHERE season_id = ?
        """, (season,))
        latest_week = cursor.fetchone()[0] or 0

        query = """
            SELECT
                st.*,
                t.display_name as team_name,
                t.abbreviation as team_abbr,
                t.logo_url as team_logo,
                g.name as conference_name,
                g.logo_url as conference_logo
            FROM standings st
            JOIN teams t ON st.team_id = t.team_id
            JOIN groups g ON st.group_id = g.group_id
            JOIN seasons s ON st.season_id = s.season_id
            WHERE s.year = ?
        """
        params = [season]

        if conference_id:
            query += " AND st.group_id = ?"
            params.append(conference_id)

        query += " ORDER BY g.name, st.playoff_seed ASC"

        cursor.execute(query, params)
        standings = [dict_from_row(row) for row in cursor.fetchall()]

        return {
            "standings": standings,
            "season": season
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
