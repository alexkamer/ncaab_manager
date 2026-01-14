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
import asyncio

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


async def fetch_recent_games_from_espn(team_id: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Fetch recent completed games for a team from ESPN API"""
    try:
        url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/{team_id}/schedule?season=2026"

        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            response.raise_for_status()
            data = response.json()

        recent_games = []
        completed_events = [e for e in data.get('events', []) if e.get('competitions', [{}])[0].get('status', {}).get('type', {}).get('completed', False)]

        # Get the most recent completed games
        for event in completed_events[-limit:]:
            competition = event['competitions'][0]
            competitors = competition['competitors']

            # Find the team's score and opponent
            team_competitor = next((c for c in competitors if c['team']['id'] == team_id), None)
            opponent_competitor = next((c for c in competitors if c['team']['id'] != team_id), None)

            if team_competitor and opponent_competitor:
                # Extract logo from logos array
                opponent_logo = ''
                logos = opponent_competitor['team'].get('logos', [])
                if logos and len(logos) > 0:
                    opponent_logo = logos[0].get('href', '')

                game_result = {
                    'date': event.get('date', ''),
                    'opponent_name': opponent_competitor['team']['displayName'],
                    'opponent_logo': opponent_logo,
                    'team_score': team_competitor['score'].get('displayValue', '0'),
                    'opponent_score': opponent_competitor['score'].get('displayValue', '0'),
                    'won': team_competitor.get('winner', False),
                    'home_away': team_competitor.get('homeAway', ''),
                }
                recent_games.append(game_result)

        return recent_games

    except Exception as e:
        print(f"Error fetching recent games from ESPN API: {e}")
        return []


async def fetch_game_preview_from_espn(event_id: int) -> Dict[str, Any]:
    """Fetch game preview from ESPN API"""
    try:
        url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary?event={event_id}"

        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            response.raise_for_status()
            data = response.json()

        header = data.get('header', {})
        competition = header.get('competitions', [{}])[0]
        competitors = competition.get('competitors', [])

        # Get team info from boxscore.teams instead of header.competitors
        boxscore_teams = data.get('boxscore', {}).get('teams', [])

        # Map teams by homeAway
        home_team_boxscore = None
        away_team_boxscore = None
        for team in boxscore_teams:
            if team.get('homeAway') == 'home':
                home_team_boxscore = team
            elif team.get('homeAway') == 'away':
                away_team_boxscore = team

        # Get competitor records/ranks from header
        home_team_header = next((c for c in competitors if c.get('homeAway') == 'home'), {})
        away_team_header = next((c for c in competitors if c.get('homeAway') == 'away'), {})

        # Get venue from gameInfo
        venue_name = data.get('gameInfo', {}).get('venue', {}).get('fullName', '')

        # Extract team statistics
        home_team_stats = home_team_boxscore.get('statistics', []) if home_team_boxscore else []
        away_team_stats = away_team_boxscore.get('statistics', []) if away_team_boxscore else []

        # Get team IDs for fetching recent games
        home_team_id = home_team_boxscore.get('team', {}).get('id', '') if home_team_boxscore else ''
        away_team_id = away_team_boxscore.get('team', {}).get('id', '') if away_team_boxscore else ''

        # Fetch recent games for both teams in parallel
        home_recent_games = []
        away_recent_games = []
        if home_team_id and away_team_id:
            home_recent_games, away_recent_games = await asyncio.gather(
                fetch_recent_games_from_espn(home_team_id, 5),
                fetch_recent_games_from_espn(away_team_id, 5)
            )

        preview = {
            'event_id': event_id,
            'date': header.get('competitions', [{}])[0].get('date', ''),
            'status': competition.get('status', {}).get('type', {}).get('name', ''),
            'status_detail': competition.get('status', {}).get('type', {}).get('detail', ''),
            'venue_name': venue_name,
            'home_team_name': home_team_boxscore.get('team', {}).get('displayName', '') if home_team_boxscore else '',
            'home_team_logo': home_team_boxscore.get('team', {}).get('logo', '') if home_team_boxscore else '',
            'home_team_color': home_team_boxscore.get('team', {}).get('color', '') if home_team_boxscore else '',
            'home_team_record': next((r.get('summary') for r in home_team_header.get('records', []) if r.get('type') == 'total'), None),
            'home_team_rank': home_team_header.get('curatedRank', {}).get('current'),
            'home_team_stats': home_team_stats,
            'away_team_name': away_team_boxscore.get('team', {}).get('displayName', '') if away_team_boxscore else '',
            'away_team_logo': away_team_boxscore.get('team', {}).get('logo', '') if away_team_boxscore else '',
            'away_team_color': away_team_boxscore.get('team', {}).get('color', '') if away_team_boxscore else '',
            'away_team_record': next((r.get('summary') for r in away_team_header.get('records', []) if r.get('type') == 'total'), None),
            'away_team_rank': away_team_header.get('curatedRank', {}).get('current'),
            'away_team_stats': away_team_stats,
            'away_recent_games': away_recent_games,
            'home_recent_games': home_recent_games,
            'leaders': data.get('leaders', []),
            'predictor': data.get('predictor', {}),
            'broadcasts': data.get('broadcasts', []),
            'odds': data.get('odds', []),
            'news': data.get('news', {}).get('articles', []),
            'source': 'espn'
        }

        return preview

    except Exception as e:
        print(f"Error fetching preview from ESPN API: {e}")
        return {}


async def fetch_box_score_from_espn(event_id: int) -> Dict[str, Any]:
    """Fetch box score from ESPN API for a specific game"""
    try:
        url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary?event={event_id}"

        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            response.raise_for_status()
            data = response.json()

        header = data.get('header', {})
        competition = header.get('competitions', [{}])[0]
        competitors = competition.get('competitors', [])

        home_team = next((c for c in competitors if c.get('homeAway') == 'home'), {})
        away_team = next((c for c in competitors if c.get('homeAway') == 'away'), {})

        # Extract line scores (period scores)
        home_line_scores = [ls.get('displayValue', '0') for ls in home_team.get('linescores', [])]
        away_line_scores = [ls.get('displayValue', '0') for ls in away_team.get('linescores', [])]

        # Extract venue and attendance from gameInfo section
        game_info_section = data.get('gameInfo', {})
        venue = game_info_section.get('venue', {})
        venue_name = venue.get('fullName', '')
        attendance = game_info_section.get('attendance', 0)

        # Build game info
        game_info = {
            'event_id': event_id,
            'date': header.get('competitions', [{}])[0].get('date', ''),
            'status': competition.get('status', {}).get('type', {}).get('name', ''),
            'status_detail': competition.get('status', {}).get('type', {}).get('detail', ''),
            'is_completed': competition.get('status', {}).get('type', {}).get('completed', False),
            'venue_name': venue_name,
            'attendance': attendance,
            'home_team_name': home_team.get('team', {}).get('displayName', ''),
            'home_team_abbr': home_team.get('team', {}).get('abbreviation', ''),
            'home_team_logo': '',  # Will be populated from boxscore
            'home_team_color': home_team.get('team', {}).get('color', ''),
            'home_score': int(home_team.get('score', 0)) if home_team.get('score') else 0,
            'home_line_scores': home_line_scores,
            'away_team_name': away_team.get('team', {}).get('displayName', ''),
            'away_team_abbr': away_team.get('team', {}).get('abbreviation', ''),
            'away_team_logo': '',  # Will be populated from boxscore
            'away_team_color': away_team.get('team', {}).get('color', ''),
            'away_score': int(away_team.get('score', 0)) if away_team.get('score') else 0,
            'away_line_scores': away_line_scores,
        }

        # Extract box score if available
        if 'boxscore' in data and 'players' in data['boxscore']:
            game_info['players'] = data['boxscore']['players']

            # Extract team logos from boxscore players section
            for team_data in data['boxscore']['players']:
                team_abbr = team_data.get('team', {}).get('abbreviation', '')
                team_logo = team_data.get('team', {}).get('logo', '')

                if team_abbr == game_info['home_team_abbr']:
                    game_info['home_team_logo'] = team_logo
                elif team_abbr == game_info['away_team_abbr']:
                    game_info['away_team_logo'] = team_logo

        # Extract team stats if available
        if 'boxscore' in data and 'teams' in data['boxscore']:
            game_info['team_stats'] = data['boxscore']['teams']

        game_info['source'] = 'espn'
        return game_info

    except Exception as e:
        print(f"Error fetching box score from ESPN API: {e}")
        return {}


async def fetch_games_from_espn(date: str) -> List[Dict[str, Any]]:
    """Fetch games from ESPN API for a specific date"""
    try:
        # Convert YYYY-MM-DD to YYYYMMDD format for ESPN API
        date_formatted = date.replace('-', '')
        # groups=50 filters for Division I games only
        url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates={date_formatted}&limit=200&groups=50"

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

            # Get team records at game time
            home_record = None
            away_record = None
            home_records = home_team.get('records', [])
            away_records = away_team.get('records', [])

            for record in home_records:
                if record.get('type') == 'total' or record.get('name') == 'overall':
                    home_record = record.get('summary')
                    break

            for record in away_records:
                if record.get('type') == 'total' or record.get('name') == 'overall':
                    away_record = record.get('summary')
                    break

            # Get rankings at game time
            home_rank = home_team.get('curatedRank', {}).get('current')
            away_rank = away_team.get('curatedRank', {}).get('current')

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
                'home_team_record': home_record,
                'home_team_rank': home_rank,
                'away_team_name': away_team['team']['displayName'],
                'away_team_abbr': away_team['team']['abbreviation'],
                'away_team_logo': away_team['team'].get('logo', ''),
                'away_team_record': away_record,
                'away_team_rank': away_rank,
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


@app.get("/api/games/live")
async def get_live_games(
    days_ahead: int = Query(7, ge=1, le=14, description="Days ahead to fetch")
):
    """
    Get live and upcoming games directly from ESPN API.
    This endpoint fetches real-time data without relying on the database.
    """
    from datetime import datetime, timedelta

    try:
        # Calculate date range
        start_date = datetime.now().strftime('%Y%m%d')
        end_date = (datetime.now() + timedelta(days=days_ahead)).strftime('%Y%m%d')

        # Fetch from ESPN API
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard"
            params = {
                'limit': 100,
                'dates': f"{start_date}-{end_date}"
            }

            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

        events = data.get('events', [])
        games = []

        for event in events:
            competitions = event.get('competitions', [])
            if not competitions:
                continue

            comp = competitions[0]
            competitors = comp.get('competitors', [])

            if len(competitors) < 2:
                continue

            # Find home and away teams
            home_team = next((c for c in competitors if c.get('homeAway') == 'home'), {})
            away_team = next((c for c in competitors if c.get('homeAway') == 'away'), {})

            # Parse game data
            game = {
                'event_id': int(event.get('id', 0)),
                'date': event.get('date'),
                'name': event.get('name', ''),
                'short_name': event.get('shortName', ''),
                'status': event.get('status', {}).get('type', {}).get('description', 'Scheduled'),
                'is_completed': event.get('status', {}).get('type', {}).get('completed', False),
                'home_team_id': int(home_team.get('team', {}).get('id', 0)),
                'home_team_name': home_team.get('team', {}).get('displayName', ''),
                'home_team_abbr': home_team.get('team', {}).get('abbreviation', ''),
                'home_team_logo': home_team.get('team', {}).get('logo', ''),
                'home_score': int(home_team.get('score', 0)),
                'away_team_id': int(away_team.get('team', {}).get('id', 0)),
                'away_team_name': away_team.get('team', {}).get('displayName', ''),
                'away_team_abbr': away_team.get('team', {}).get('abbreviation', ''),
                'away_team_logo': away_team.get('team', {}).get('logo', ''),
                'away_score': int(away_team.get('score', 0)),
                'venue_name': comp.get('venue', {}).get('fullName', ''),
                'is_conference_game': comp.get('conferenceCompetition', False),
                'season_year': event.get('season', {}).get('year', 2026)
            }

            games.append(game)

        return {
            'games': games,
            'total': len(games),
            'date_range': f"{start_date}-{end_date}",
            'source': 'espn_live'
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch live games: {str(e)}")


@app.get("/api/games")
async def get_games(
    season: Optional[int] = Query(None, description="Season year (e.g., 2026)"),
    team_id: Optional[int] = Query(None, description="Filter by team ID"),
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    limit: int = Query(50, le=200, description="Number of results"),
    offset: int = Query(0, description="Pagination offset"),
    include_live: bool = Query(True, description="Include live games from ESPN API")
):
    """Get games with optional filters. Can merge database games with live ESPN data."""
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
                e.home_team_id,
                e.away_team_id,
                e.season_id,
                e.week,
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
            # Convert UTC date to CST (UTC-6) for filtering
            # DATE(datetime(e.date, '-6 hours')) converts UTC timestamp to CST date
            query += " AND DATE(datetime(e.date, '-6 hours')) >= ?"
            params.append(date_from)

        if date_to:
            # Convert UTC date to CST (UTC-6) for filtering
            query += " AND DATE(datetime(e.date, '-6 hours')) <= ?"
            params.append(date_to)

        query += " ORDER BY e.date DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        cursor.execute(query, params)
        games = [dict_from_row(row) for row in cursor.fetchall()]

        # Get AP Poll rankings for all games efficiently
        if games:
            # Collect all unique (season_id, team_id) combinations and weeks
            team_ids = set()
            season_ids = set()
            for game in games:
                if game.get('season_id'):
                    season_ids.add(game['season_id'])
                    team_ids.add(game['home_team_id'])
                    team_ids.add(game['away_team_id'])

            # Fetch rankings - use most recent ranking for each team up to the game week
            if team_ids and season_ids:
                placeholders_t = ','.join(['?' for _ in team_ids])
                placeholders_s = ','.join(['?' for _ in season_ids])

                # Fetch all rankings for these teams and season
                cursor.execute(f"""
                    SELECT season_id, week_number, team_id, current_rank
                    FROM weekly_rankings
                    WHERE ranking_type_id = 1
                    AND season_id IN ({placeholders_s})
                    AND team_id IN ({placeholders_t})
                    ORDER BY season_id, week_number, team_id
                """, list(season_ids) + list(team_ids))

                # Build lookup dictionary with fallback to most recent ranking
                all_rankings = cursor.fetchall()
                rankings_by_team = {}  # (season_id, team_id) -> {week: rank}

                for row in all_rankings:
                    season_id, week_number, team_id, current_rank = row
                    key = (season_id, team_id)
                    if key not in rankings_by_team:
                        rankings_by_team[key] = {}
                    rankings_by_team[key][week_number] = current_rank

                # Add rankings to each game (use exact week or most recent available)
                for game in games:
                    if game.get('season_id'):
                        season_id = game['season_id']
                        game_week = game.get('week')

                        # Home team ranking
                        home_key = (season_id, game['home_team_id'])
                        if home_key in rankings_by_team:
                            weeks_dict = rankings_by_team[home_key]
                            # Try exact week first, then fall back to most recent week <= game_week
                            if game_week and game_week in weeks_dict:
                                game['home_team_ap_rank'] = weeks_dict[game_week]
                            else:
                                # Find most recent ranking
                                available_weeks = sorted([w for w in weeks_dict.keys() if not game_week or w <= game_week])
                                if available_weeks:
                                    game['home_team_ap_rank'] = weeks_dict[available_weeks[-1]]

                        # Away team ranking
                        away_key = (season_id, game['away_team_id'])
                        if away_key in rankings_by_team:
                            weeks_dict = rankings_by_team[away_key]
                            # Try exact week first, then fall back to most recent week <= game_week
                            if game_week and game_week in weeks_dict:
                                game['away_team_ap_rank'] = weeks_dict[game_week]
                            else:
                                # Find most recent ranking
                                available_weeks = sorted([w for w in weeks_dict.keys() if not game_week or w <= game_week])
                                if available_weeks:
                                    game['away_team_ap_rank'] = weeks_dict[available_weeks[-1]]

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
async def get_game_detail(event_id: int):
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

        # If game not found in database, try ESPN API
        if not game:
            espn_data = await fetch_box_score_from_espn(event_id)
            if espn_data:
                return espn_data
            raise HTTPException(status_code=404, detail="Game not found")

        game_dict = dict_from_row(game)
        game_dict['source'] = 'database'

        # Parse line scores from JSON if they exist
        if game_dict.get('home_line_scores'):
            try:
                game_dict['home_line_scores'] = json.loads(game_dict['home_line_scores'])
            except:
                game_dict['home_line_scores'] = None
        if game_dict.get('away_line_scores'):
            try:
                game_dict['away_line_scores'] = json.loads(game_dict['away_line_scores'])
            except:
                game_dict['away_line_scores'] = None

        # Get AP Poll rankings for the week of this game
        if game_dict.get('week') and game_dict.get('season_id'):
            cursor.execute("""
                SELECT team_id, current_rank
                FROM weekly_rankings
                WHERE season_id = ? AND week_number = ? AND ranking_type_id = 1
                AND team_id IN (?, ?)
            """, (game_dict['season_id'], game_dict['week'],
                  game_dict['home_team_id'], game_dict['away_team_id']))

            rankings = {row[0]: row[1] for row in cursor.fetchall()}
            game_dict['home_team_ap_rank'] = rankings.get(game_dict['home_team_id'])
            game_dict['away_team_ap_rank'] = rankings.get(game_dict['away_team_id'])

        # Get team statistics
        cursor.execute("""
            SELECT * FROM team_statistics
            WHERE event_id = ?
        """, (event_id,))
        game_dict["team_stats"] = [dict_from_row(row) for row in cursor.fetchall()]

        # Get player statistics
        cursor.execute("""
            SELECT
                ps.*,
                a.full_name,
                a.display_name,
                a.position_name
            FROM player_statistics ps
            JOIN athletes a ON ps.athlete_id = a.athlete_id
            WHERE ps.event_id = ?
            ORDER BY ps.team_id, ps.minutes_played DESC
        """, (event_id,))
        game_dict["player_stats"] = [dict_from_row(row) for row in cursor.fetchall()]

        # Get predictions if available
        cursor.execute("""
            SELECT * FROM game_predictions
            WHERE event_id = ?
        """, (event_id,))
        prediction = cursor.fetchone()
        if prediction:
            game_dict["prediction"] = dict_from_row(prediction)

        return game_dict


@app.get("/api/games/{event_id}/preview")
async def get_game_preview(event_id: int):
    """Get game preview information"""
    preview = await fetch_game_preview_from_espn(event_id)
    if preview:
        return preview
    raise HTTPException(status_code=404, detail="Game preview not found")


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


async def fetch_team_info_from_espn(team_id: int, season: int) -> Dict[str, Any]:
    """Fetch additional team info from ESPN Core API"""
    try:
        url = f"http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/{season}/teams/{team_id}?lang=en&region=us"

        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            response.raise_for_status()
            data = response.json()

            venue_info = {}
            if 'venue' in data and isinstance(data['venue'], dict):
                venue = data['venue']
                venue_info['venue_name'] = venue.get('fullName')
                if 'address' in venue:
                    venue_info['venue_city'] = venue['address'].get('city')
                    venue_info['venue_state'] = venue['address'].get('state')

            conference_info = {}
            if 'groups' in data and '$ref' in data['groups']:
                group_url = data['groups']['$ref']
                try:
                    group_response = await client.get(group_url, timeout=10.0)
                    group_response.raise_for_status()
                    group_data = group_response.json()
                    conference_info['conference_name'] = group_data.get('name')
                    conference_info['conference_abbr'] = group_data.get('abbreviation')
                except Exception as e:
                    print(f"Error fetching conference info: {e}")

            return {**venue_info, **conference_info}

    except Exception as e:
        print(f"Error fetching team info from ESPN: {e}")
        return {}


@app.get("/api/teams/{team_id}")
async def get_team_detail(team_id: int, season: int = Query(2026)):
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

        # Fetch additional info from ESPN if venue or conference is missing
        if not team_dict.get('venue_name') or not team_dict.get('conference_name'):
            espn_info = await fetch_team_info_from_espn(team_id, season)
            # Only override if database values are null
            for key, value in espn_info.items():
                if not team_dict.get(key):
                    team_dict[key] = value

        # Get standings info (includes record, streaks, etc.)
        cursor.execute("""
            SELECT
                st.*
            FROM standings st
            JOIN seasons s ON st.season_id = s.season_id
            WHERE st.team_id = ? AND s.year = ?
        """, (team_id, season))
        standings = cursor.fetchone()
        if standings:
            team_dict["standings"] = dict_from_row(standings)

        # Get current ranking
        cursor.execute("""
            SELECT
                wr.current_rank,
                wr.previous_rank,
                wr.trend,
                wr.points,
                rt.type_code as ranking_type
            FROM weekly_rankings wr
            JOIN seasons s ON wr.season_id = s.season_id
            JOIN ranking_types rt ON wr.ranking_type_id = rt.ranking_type_id
            WHERE wr.team_id = ? AND s.year = ?
            AND wr.week_number = (
                SELECT MAX(week_number)
                FROM weekly_rankings wr2
                WHERE wr2.team_id = ? AND wr2.season_id = s.season_id
            )
        """, (team_id, season, team_id))
        ranking = cursor.fetchone()
        if ranking:
            team_dict["ranking"] = dict_from_row(ranking)

        # Get team statistical averages
        cursor.execute("""
            SELECT
                COUNT(*) as games_played,
                ROUND(AVG(CAST(ts.field_goals_made AS FLOAT)), 1) as avg_fgm,
                ROUND(AVG(CAST(ts.field_goals_attempted AS FLOAT)), 1) as avg_fga,
                ROUND(AVG(CAST(ts.field_goal_pct AS FLOAT)), 1) as avg_fg_pct,
                ROUND(AVG(CAST(ts.three_point_made AS FLOAT)), 1) as avg_three_pm,
                ROUND(AVG(CAST(ts.three_point_attempted AS FLOAT)), 1) as avg_three_pa,
                ROUND(AVG(CAST(ts.three_point_pct AS FLOAT)), 1) as avg_three_pct,
                ROUND(AVG(CAST(ts.free_throws_made AS FLOAT)), 1) as avg_ftm,
                ROUND(AVG(CAST(ts.free_throws_attempted AS FLOAT)), 1) as avg_fta,
                ROUND(AVG(CAST(ts.free_throw_pct AS FLOAT)), 1) as avg_ft_pct,
                ROUND(AVG(CAST(ts.total_rebounds AS FLOAT)), 1) as avg_rebounds,
                ROUND(AVG(CAST(ts.offensive_rebounds AS FLOAT)), 1) as avg_offensive_rebounds,
                ROUND(AVG(CAST(ts.defensive_rebounds AS FLOAT)), 1) as avg_defensive_rebounds,
                ROUND(AVG(CAST(ts.assists AS FLOAT)), 1) as avg_assists,
                ROUND(AVG(CAST(ts.steals AS FLOAT)), 1) as avg_steals,
                ROUND(AVG(CAST(ts.blocks AS FLOAT)), 1) as avg_blocks,
                ROUND(AVG(CAST(ts.turnovers AS FLOAT)), 1) as avg_turnovers,
                ROUND(AVG(CAST(ts.fouls AS FLOAT)), 1) as avg_fouls,
                ROUND(AVG(CAST(CASE
                    WHEN e.home_team_id = ? THEN e.home_score
                    ELSE e.away_score
                END AS FLOAT)), 1) as avg_points_scored,
                ROUND(AVG(CAST(CASE
                    WHEN e.home_team_id = ? THEN e.away_score
                    ELSE e.home_score
                END AS FLOAT)), 1) as avg_points_allowed
            FROM team_statistics ts
            JOIN events e ON ts.event_id = e.event_id
            JOIN seasons s ON e.season_id = s.season_id
            WHERE ts.team_id = ? AND s.year = ? AND e.is_completed = 1
        """, (team_id, team_id, team_id, season))
        stats = cursor.fetchone()
        if stats:
            team_dict["team_stats"] = dict_from_row(stats)

        # Get team leaders (top 3 scorers, top rebounder, top assist leader)
        cursor.execute("""
            SELECT
                a.athlete_id,
                a.full_name,
                a.display_name,
                a.position_name,
                COUNT(*) as games_played,
                ROUND(AVG(CAST(ps.field_goals_made AS FLOAT) + CAST(ps.three_point_made AS FLOAT)), 1) as avg_fgm,
                ROUND(AVG(CAST(ps.field_goals_made AS FLOAT) * 2 + CAST(ps.three_point_made AS FLOAT) * 3 + CAST(ps.free_throws_made AS FLOAT)), 1) as avg_points,
                ROUND(AVG(CAST(ps.rebounds AS FLOAT)), 1) as avg_rebounds,
                ROUND(AVG(CAST(ps.assists AS FLOAT)), 1) as avg_assists,
                ROUND(AVG(CAST(ps.steals AS FLOAT)), 1) as avg_steals,
                ROUND(AVG(CAST(ps.blocks AS FLOAT)), 1) as avg_blocks
            FROM player_statistics ps
            JOIN athletes a ON ps.athlete_id = a.athlete_id
            JOIN events e ON ps.event_id = e.event_id
            JOIN seasons s ON e.season_id = s.season_id
            WHERE ps.team_id = ? AND s.year = ? AND e.is_completed = 1 AND ps.is_active = 1
            GROUP BY ps.athlete_id
            HAVING COUNT(*) >= 5
            ORDER BY avg_points DESC
            LIMIT 10
        """, (team_id, season))
        team_dict["leaders"] = [dict_from_row(row) for row in cursor.fetchall()]

        # Get team's games with enhanced info (rankings, odds, broadcast)
        cursor.execute("""
            SELECT
                e.event_id,
                e.date,
                e.home_score,
                e.away_score,
                e.is_completed,
                e.venue_name,
                e.broadcast_network,
                e.is_conference_game,
                CASE WHEN e.home_team_id = ? THEN 'home' ELSE 'away' END as location,
                CASE WHEN e.home_team_id = ? THEN at.display_name ELSE ht.display_name END as opponent_name,
                CASE WHEN e.home_team_id = ? THEN at.logo_url ELSE ht.logo_url END as opponent_logo,
                CASE WHEN e.home_team_id = ? THEN at.team_id ELSE ht.team_id END as opponent_id,
                go.spread,
                go.over_under,
                gp.home_win_probability,
                gp.away_win_probability
            FROM events e
            JOIN teams ht ON e.home_team_id = ht.team_id
            JOIN teams at ON e.away_team_id = at.team_id
            JOIN seasons s ON e.season_id = s.season_id
            LEFT JOIN game_odds go ON e.event_id = go.event_id
            LEFT JOIN game_predictions gp ON e.event_id = gp.event_id
            WHERE (e.home_team_id = ? OR e.away_team_id = ?) AND s.year = ?
            ORDER BY e.date DESC
            LIMIT 50
        """, (team_id, team_id, team_id, team_id, team_id, team_id, season))

        games = [dict_from_row(row) for row in cursor.fetchall()]

        # Get opponent rankings at the time of each game
        for game in games:
            opponent_id = game['opponent_id']
            game_date = game['date']

            # Find the most recent ranking before or at the game date
            cursor.execute("""
                SELECT wr.current_rank, rt.type_code
                FROM weekly_rankings wr
                JOIN ranking_types rt ON wr.ranking_type_id = rt.ranking_type_id
                JOIN seasons s ON wr.season_id = s.season_id
                WHERE wr.team_id = ?
                AND s.year = ?
                AND rt.type_code = 'ap'
                AND wr.ranking_date <= ?
                ORDER BY wr.ranking_date DESC
                LIMIT 1
            """, (opponent_id, season, game_date))

            rank_result = cursor.fetchone()
            if rank_result:
                game['opponent_rank'] = rank_result[0]
            else:
                game['opponent_rank'] = None

        team_dict["games"] = games

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
                t.team_id,
                t.display_name as team_name,
                t.logo_url as team_logo,
                t.color as team_color
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
                e.date as event_date,
                e.home_team_id = ps.team_id as is_home,
                CASE
                    WHEN e.home_team_id = ps.team_id THEN e.away_team_id
                    ELSE e.home_team_id
                END as opponent_id,
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


@app.get("/api/stats/leaders")
async def get_season_leaders(
    season: int = Query(2026, description="Season year"),
    stat_category: str = Query("points", description="Stat category: points, rebounds, assists, field_goal_pct, three_point_pct, free_throw_pct, steals, blocks"),
    limit: int = Query(50, ge=1, le=100, description="Number of leaders to return"),
    min_games: int = Query(5, ge=1, le=50, description="Minimum games played"),
    conference_id: Optional[int] = Query(None, description="Filter by conference ID")
):
    """
    Get season leaders in various statistical categories
    """
    with get_db() as conn:
        cursor = conn.cursor()

        # Map stat category to database columns, aggregation, and minimum thresholds
        # Format: (sql_expression, alias, label, min_games_default, min_attempts_expression, min_attempts_value)
        stat_mapping = {
            "points": ("AVG(ps.points)", "ppg", "Points Per Game", 5, None, None),
            "rebounds": ("AVG(ps.rebounds)", "rpg", "Rebounds Per Game", 5, None, None),
            "assists": ("AVG(ps.assists)", "apg", "Assists Per Game", 5, None, None),
            "field_goal_pct": ("ROUND(SUM(ps.field_goals_made) * 100.0 / NULLIF(SUM(ps.field_goals_attempted), 0), 1)", "fg_pct", "Field Goal %", 5, "SUM(ps.field_goals_attempted)", 75),
            "three_point_pct": ("ROUND(SUM(ps.three_point_made) * 100.0 / NULLIF(SUM(ps.three_point_attempted), 0), 1)", "three_pt_pct", "Three Point %", 5, "SUM(ps.three_point_attempted)", 40),
            "free_throw_pct": ("ROUND(SUM(ps.free_throws_made) * 100.0 / NULLIF(SUM(ps.free_throws_attempted), 0), 1)", "ft_pct", "Free Throw %", 5, "SUM(ps.free_throws_attempted)", 30),
            "steals": ("AVG(ps.steals)", "spg", "Steals Per Game", 5, None, None),
            "blocks": ("AVG(ps.blocks)", "bpg", "Blocks Per Game", 5, None, None),
        }

        if stat_category not in stat_mapping:
            raise HTTPException(status_code=400, detail=f"Invalid stat category. Must be one of: {', '.join(stat_mapping.keys())}")

        stat_expr, stat_alias, stat_label, default_min_games, min_attempts_expr, min_attempts_val = stat_mapping[stat_category]

        # Use provided min_games or default for this stat category
        effective_min_games = min_games if min_games != 5 else default_min_games

        # Build the query
        query = f"""
            SELECT
                a.athlete_id,
                a.full_name,
                a.display_name,
                a.position_name,
                t.team_id,
                t.display_name as team_name,
                t.abbreviation as team_abbr,
                t.logo_url as team_logo,
                st.group_id as conference_id,
                g.name as conference_name,
                COUNT(DISTINCT ps.event_id) as games_played,
                {stat_expr} as stat_value,
                ROUND(AVG(ps.points), 1) as ppg,
                ROUND(AVG(ps.rebounds), 1) as rpg,
                ROUND(AVG(ps.assists), 1) as apg
            FROM player_statistics ps
            JOIN athletes a ON ps.athlete_id = a.athlete_id
            JOIN teams t ON ps.team_id = t.team_id
            LEFT JOIN standings st ON t.team_id = st.team_id AND st.season_id = ?
            LEFT JOIN groups g ON st.group_id = g.group_id
            JOIN events e ON ps.event_id = e.event_id
            WHERE e.season_id = ? AND e.is_completed = 1
        """

        params = [season, season]

        if conference_id:
            query += " AND g.group_id = ?"
            params.append(conference_id)

        # Add GROUP BY and HAVING clauses
        query += """
            GROUP BY ps.athlete_id
            HAVING games_played >= ?
        """
        params.append(effective_min_games)

        # Add minimum attempts constraint for percentage stats
        if min_attempts_expr and min_attempts_val:
            query += f" AND {min_attempts_expr} >= ?"
            params.append(min_attempts_val)

        query += """
            ORDER BY stat_value DESC
            LIMIT ?
        """
        params.append(limit)

        cursor.execute(query, params)
        leaders = [dict_from_row(row) for row in cursor.fetchall()]

        return {
            "leaders": leaders,
            "stat_category": stat_category,
            "stat_label": stat_label,
            "season": season,
            "min_games": effective_min_games,
            "min_attempts": min_attempts_val if min_attempts_expr else None
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
