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
import json

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
            'home_team_id': int(home_team.get('team', {}).get('id')) if home_team.get('team', {}).get('id') else None,
            'home_team_logo': '',  # Will be populated from boxscore
            'home_team_color': home_team.get('team', {}).get('color', ''),
            'home_score': int(home_team.get('score', 0)) if home_team.get('score') else 0,
            'home_line_scores': home_line_scores,
            'away_team_name': away_team.get('team', {}).get('displayName', ''),
            'away_team_abbr': away_team.get('team', {}).get('abbreviation', ''),
            'away_team_id': int(away_team.get('team', {}).get('id')) if away_team.get('team', {}).get('id') else None,
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
            home_conf_record = None
            away_conf_record = None
            home_records = home_team.get('records', [])
            away_records = away_team.get('records', [])

            for record in home_records:
                if record.get('type') == 'total' or record.get('name') == 'overall':
                    home_record = record.get('summary')
                elif record.get('type') == 'vsconf':
                    home_conf_record = record.get('summary')

            for record in away_records:
                if record.get('type') == 'total' or record.get('name') == 'overall':
                    away_record = record.get('summary')
                elif record.get('type') == 'vsconf':
                    away_conf_record = record.get('summary')

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
                'home_team_conf_record': home_conf_record,
                'home_team_rank': home_rank,
                'away_team_name': away_team['team']['displayName'],
                'away_team_abbr': away_team['team']['abbreviation'],
                'away_team_logo': away_team['team'].get('logo', ''),
                'away_team_record': away_record,
                'away_team_conf_record': away_conf_record,
                'away_team_rank': away_rank,
                'spread': spread,
                'over_under': over_under,
                'favorite_abbr': favorite_abbr,
                'home_win_probability': None,
                'away_win_probability': None,
                'home_predicted_margin': None,
                'away_predicted_margin': None,
            }
            games.append(game)

        # Fetch ESPN predictions for upcoming games
        async with httpx.AsyncClient(timeout=10.0) as client:
            for game in games:
                if not game['is_completed']:
                    try:
                        # Fetch predictor data from ESPN
                        predictor_url = f"http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/events/{game['event_id']}/competitions/{game['event_id']}/predictor?lang=en&region=us"
                        response = await client.get(predictor_url)
                        if response.status_code == 200:
                            predictor_data = response.json()

                            # Parse home team predictions from statistics array
                            home_team_data = predictor_data.get('homeTeam', {})
                            home_stats = home_team_data.get('statistics', [])
                            for stat in home_stats:
                                if stat.get('name') == 'gameProjection' or stat.get('name') == 'teampredwinpct':
                                    game['home_win_probability'] = stat.get('value')
                                elif stat.get('name') == 'teampredmov':
                                    game['home_predicted_margin'] = stat.get('value')

                            # Parse away team predictions from statistics array
                            away_team_data = predictor_data.get('awayTeam', {})
                            away_stats = away_team_data.get('statistics', [])
                            for stat in away_stats:
                                if stat.get('name') == 'gameProjection' or stat.get('name') == 'teampredwinpct':
                                    game['away_win_probability'] = stat.get('value')
                                elif stat.get('name') == 'teampredmov':
                                    game['away_predicted_margin'] = stat.get('value')
                    except:
                        # If ESPN call fails, just continue without predictions
                        pass

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
        all_events = []

        # Fetch each day individually (ESPN API doesn't handle date ranges well)
        async with httpx.AsyncClient(timeout=30.0) as client:
            for day_offset in range(days_ahead + 1):  # Include today (0) through days_ahead
                date = (datetime.now() + timedelta(days=day_offset)).strftime('%Y%m%d')

                url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard"
                params = {
                    'limit': 100,
                    'dates': date
                }

                try:
                    response = await client.get(url, params=params)
                    response.raise_for_status()
                    data = response.json()

                    events = data.get('events', [])
                    all_events.extend(events)
                except httpx.HTTPStatusError as e:
                    # Continue on 404 (no games that day)
                    if e.response.status_code != 404:
                        raise

        games = []

        for event in all_events:
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

        start_date = datetime.now().strftime('%Y%m%d')
        end_date = (datetime.now() + timedelta(days=days_ahead)).strftime('%Y%m%d')

        return {
            'games': games,
            'total': len(games),
            'date_range': f"{start_date}-{end_date}",
            'days_fetched': days_ahead + 1,
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
                at.logo_url as away_team_logo,
                gp.home_win_probability,
                gp.away_win_probability,
                gp.home_predicted_margin,
                gp.away_predicted_margin
            FROM events e
            LEFT JOIN teams ht ON e.home_team_id = ht.team_id
            LEFT JOIN teams at ON e.away_team_id = at.team_id
            LEFT JOIN game_predictions gp ON e.event_id = gp.event_id
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

        # Calculate overall and conference records from database
        if games:
            # Get all games that need records
            games_needing_records = [game for game in games if game.get('home_team_id') and game.get('away_team_id')]
            conference_games = [game for game in games if game.get('is_conference_game')]

            if games_needing_records:
                # Collect all unique team IDs, the latest game date, and season_id
                team_ids = set()
                max_date = None
                season_id = None
                for game in games_needing_records:
                    team_ids.add(game['home_team_id'])
                    team_ids.add(game['away_team_id'])
                    game_date = game['date']
                    if max_date is None or game_date > max_date:
                        max_date = game_date
                    # Get season_id from the first game (all games in the list should be same season)
                    if season_id is None:
                        season_id = game.get('season_id')

                if team_ids and max_date and season_id:
                    # Query database for ALL completed games in this season up to the max date
                    # Use CST date conversion to match how games are filtered on the frontend
                    placeholders = ','.join(['?' for _ in team_ids])
                    cursor.execute(f"""
                        SELECT
                            e.home_team_id,
                            e.away_team_id,
                            e.home_score,
                            e.away_score,
                            e.is_completed,
                            e.is_conference_game,
                            e.date,
                            DATE(datetime(e.date, '-6 hours')) as cst_date
                        FROM events e
                        WHERE e.is_completed = 1
                        AND e.season_id = ?
                        AND DATE(datetime(e.date, '-6 hours')) <= DATE(datetime(?, '-6 hours'))
                        AND (e.home_team_id IN ({placeholders}) OR e.away_team_id IN ({placeholders}))
                        ORDER BY e.date
                    """, [season_id, max_date] + list(team_ids) + list(team_ids))

                    all_completed_games = cursor.fetchall()

                    # Calculate both overall and conference records
                    from collections import defaultdict
                    overall_records = defaultdict(lambda: {'wins': 0, 'losses': 0})
                    conf_records = defaultdict(lambda: {'wins': 0, 'losses': 0})

                    # Build record histories
                    overall_record_history = defaultdict(list)
                    conf_record_history = defaultdict(list)

                    for row in all_completed_games:
                        home_id, away_id, home_score, away_score, is_completed, is_conf_game, game_date, cst_date = row

                        if is_completed and home_score is not None and away_score is not None:
                            # Update overall records
                            if home_score > away_score:
                                overall_records[home_id]['wins'] += 1
                                overall_records[away_id]['losses'] += 1
                            else:
                                overall_records[away_id]['wins'] += 1
                                overall_records[home_id]['losses'] += 1

                            # Store overall record history
                            overall_record_history[home_id].append((game_date, overall_records[home_id]['wins'], overall_records[home_id]['losses']))
                            overall_record_history[away_id].append((game_date, overall_records[away_id]['wins'], overall_records[away_id]['losses']))

                            # Update conference records if this is a conference game
                            if is_conf_game:
                                if home_score > away_score:
                                    conf_records[home_id]['wins'] += 1
                                    conf_records[away_id]['losses'] += 1
                                else:
                                    conf_records[away_id]['wins'] += 1
                                    conf_records[home_id]['losses'] += 1

                                # Store conference record history
                                conf_record_history[home_id].append((game_date, conf_records[home_id]['wins'], conf_records[home_id]['losses']))
                                conf_record_history[away_id].append((game_date, conf_records[away_id]['wins'], conf_records[away_id]['losses']))

                    # Apply records to games
                    for game in games_needing_records:
                        game_date = game['date']
                        home_id = game['home_team_id']
                        away_id = game['away_team_id']
                        is_completed = game.get('is_completed')

                        # For completed games, show record AFTER the game
                        # For upcoming games, show record BEFORE the game
                        home_wins, home_losses = 0, 0
                        away_wins, away_losses = 0, 0

                        for date, wins, losses in overall_record_history.get(home_id, []):
                            if is_completed:
                                # Include games up to and including this game
                                if date <= game_date:
                                    home_wins, home_losses = wins, losses
                                else:
                                    break
                            else:
                                # Only include games before this game
                                if date < game_date:
                                    home_wins, home_losses = wins, losses
                                else:
                                    break

                        for date, wins, losses in overall_record_history.get(away_id, []):
                            if is_completed:
                                if date <= game_date:
                                    away_wins, away_losses = wins, losses
                                else:
                                    break
                            else:
                                if date < game_date:
                                    away_wins, away_losses = wins, losses
                                else:
                                    break

                        game['home_team_record'] = f"{home_wins}-{home_losses}"
                        game['away_team_record'] = f"{away_wins}-{away_losses}"

                        # Find conference records (if it's a conference game)
                        if game.get('is_conference_game'):
                            home_conf_wins, home_conf_losses = 0, 0
                            away_conf_wins, away_conf_losses = 0, 0

                            for date, wins, losses in conf_record_history.get(home_id, []):
                                if is_completed:
                                    if date <= game_date:
                                        home_conf_wins, home_conf_losses = wins, losses
                                    else:
                                        break
                                else:
                                    if date < game_date:
                                        home_conf_wins, home_conf_losses = wins, losses
                                    else:
                                        break

                            for date, wins, losses in conf_record_history.get(away_id, []):
                                if is_completed:
                                    if date <= game_date:
                                        away_conf_wins, away_conf_losses = wins, losses
                                    else:
                                        break
                                else:
                                    if date < game_date:
                                        away_conf_wins, away_conf_losses = wins, losses
                                    else:
                                        break

                            game['home_team_conf_record'] = f"{home_conf_wins}-{home_conf_losses}"
                            game['away_team_conf_record'] = f"{away_conf_wins}-{away_conf_losses}"

        # Fetch ESPN predictions for games that don't have them (upcoming games only)
        if games:
            games_without_predictions = [
                game for game in games
                if not game.get('is_completed') and
                (game.get('home_win_probability') is None or game.get('away_win_probability') is None)
            ]

            if games_without_predictions:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    for game in games_without_predictions:
                        try:
                            # Fetch predictor data from ESPN
                            predictor_url = f"http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/events/{game['event_id']}/competitions/{game['event_id']}/predictor?lang=en&region=us"
                            response = await client.get(predictor_url)
                            if response.status_code == 200:
                                predictor_data = response.json()

                                # Parse home team predictions from statistics array
                                home_team = predictor_data.get('homeTeam', {})
                                home_stats = home_team.get('statistics', [])
                                for stat in home_stats:
                                    if stat.get('name') == 'gameProjection' or stat.get('name') == 'teampredwinpct':
                                        game['home_win_probability'] = stat.get('value')
                                    elif stat.get('name') == 'teampredmov':
                                        game['home_predicted_margin'] = stat.get('value')

                                # Parse away team predictions from statistics array
                                away_team = predictor_data.get('awayTeam', {})
                                away_stats = away_team.get('statistics', [])
                                for stat in away_stats:
                                    if stat.get('name') == 'gameProjection' or stat.get('name') == 'teampredwinpct':
                                        game['away_win_probability'] = stat.get('value')
                                    elif stat.get('name') == 'teampredmov':
                                        game['away_predicted_margin'] = stat.get('value')
                        except:
                            # If ESPN call fails, just continue without predictions
                            pass

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
        print(f"DEBUG: home_line_scores before parsing: {game_dict.get('home_line_scores')}, type: {type(game_dict.get('home_line_scores'))}")
        if game_dict.get('home_line_scores'):
            try:
                if isinstance(game_dict['home_line_scores'], str):
                    game_dict['home_line_scores'] = json.loads(game_dict['home_line_scores'])
                # else it's already parsed or a list
            except Exception as e:
                print(f"Error parsing home_line_scores: {e}, value: {game_dict.get('home_line_scores')}")
                game_dict['home_line_scores'] = None
        if game_dict.get('away_line_scores'):
            try:
                if isinstance(game_dict['away_line_scores'], str):
                    game_dict['away_line_scores'] = json.loads(game_dict['away_line_scores'])
                # else it's already parsed or a list
            except Exception as e:
                print(f"Error parsing away_line_scores: {e}, value: {game_dict.get('away_line_scores')}")
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

        # Calculate bench points from player statistics
        cursor.execute("""
            SELECT team_id, SUM(points) as bench_points
            FROM player_statistics
            WHERE event_id = ? AND is_starter = 0
            GROUP BY team_id
        """, (event_id,))
        bench_points_data = {row[0]: row[1] for row in cursor.fetchall()}

        # Add bench points to team stats
        for team_stat in game_dict["team_stats"]:
            team_id = team_stat.get('team_id')
            team_stat['bench_points'] = bench_points_data.get(team_id, 0)

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
        player_stats = [dict_from_row(row) for row in cursor.fetchall()]

        # Add constructed headshot URLs for each player
        for player in player_stats:
            if player.get('athlete_id'):
                player['headshot_url'] = f"https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/{player['athlete_id']}.png"

        game_dict["player_stats"] = player_stats

        # Try to fetch ESPN data for player headshots if game is completed
        if game_dict.get('is_completed'):
            try:
                espn_data = await fetch_box_score_from_espn(event_id)
                if espn_data and espn_data.get('players'):
                    game_dict['players'] = espn_data['players']
            except Exception as e:
                print(f"Could not fetch ESPN data for headshots: {e}")
                pass

        # Get predictions if available
        cursor.execute("""
            SELECT * FROM game_predictions
            WHERE event_id = ?
        """, (event_id,))
        prediction = cursor.fetchone()
        if prediction:
            game_dict["prediction"] = dict_from_row(prediction)

        # Get odds if available
        cursor.execute("""
            SELECT * FROM game_odds
            WHERE event_id = ?
            ORDER BY provider_priority ASC
            LIMIT 1
        """, (event_id,))
        odds = cursor.fetchone()
        if odds:
            game_dict["odds"] = dict_from_row(odds)

        return game_dict


@app.get("/api/games/{event_id}/odds")
async def get_game_odds_live(event_id: int):
    """Fetch live betting odds from ESPN API"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Fetch odds from ESPN API
            odds_url = f"http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/events/{event_id}/competitions/{event_id}/odds"
            response = await client.get(odds_url)

            if response.status_code != 200:
                return {"odds": None}

            odds_data = response.json()

            # Check if odds exist
            if not odds_data.get("items"):
                return {"odds": None}

            # Get the first odds provider (usually DraftKings)
            odds_ref = odds_data["items"][0].get("$ref")
            if not odds_ref:
                return {"odds": None}

            # Fetch detailed odds
            odds_response = await client.get(odds_ref)
            if odds_response.status_code != 200:
                return {"odds": None}

            detailed_odds = odds_response.json()

            # Parse odds data
            parsed_odds = {
                "provider_name": detailed_odds.get("provider", {}).get("name"),
                "spread": None,
                "over_under": None,
                "away_is_favorite": None,
                "home_is_favorite": None,
                "away_moneyline": None,
                "home_moneyline": None,
                "away_spread_odds": None,
                "home_spread_odds": None,
                "over_odds": None,
                "under_odds": None
            }

            # Parse spread
            if detailed_odds.get("spread"):
                parsed_odds["spread"] = abs(float(detailed_odds["spread"]))

            # Parse over/under
            if detailed_odds.get("overUnder"):
                parsed_odds["over_under"] = float(detailed_odds["overUnder"])

            # Parse details to determine favorite
            details = detailed_odds.get("details", "")
            if details:
                # Details format: "HOU -11.5" or "TEAM +X"
                if "-" in details:
                    # Team listed is favorite
                    team_abbr = details.split("-")[0].strip()
                    # Check if it's away or home (we'll need to infer from competition data)
                    parsed_odds["away_is_favorite"] = True  # Simplified - would need competition data
                    parsed_odds["home_is_favorite"] = False
                elif "+" in details:
                    parsed_odds["away_is_favorite"] = False
                    parsed_odds["home_is_favorite"] = True

            # Parse moneylines and spread odds from awayTeamOdds/homeTeamOdds
            away_odds = detailed_odds.get("awayTeamOdds", {})
            home_odds = detailed_odds.get("homeTeamOdds", {})

            if away_odds:
                parsed_odds["away_moneyline"] = away_odds.get("moneyLine")
                parsed_odds["away_spread_odds"] = away_odds.get("spreadOdds")
                if away_odds.get("favorite"):
                    parsed_odds["away_is_favorite"] = True
                    parsed_odds["home_is_favorite"] = False

            if home_odds:
                parsed_odds["home_moneyline"] = home_odds.get("moneyLine")
                parsed_odds["home_spread_odds"] = home_odds.get("spreadOdds")
                if home_odds.get("favorite"):
                    parsed_odds["home_is_favorite"] = True
                    parsed_odds["away_is_favorite"] = False

            # Parse over/under odds
            if detailed_odds.get("overOdds"):
                parsed_odds["over_odds"] = int(detailed_odds["overOdds"])
            if detailed_odds.get("underOdds"):
                parsed_odds["under_odds"] = int(detailed_odds["underOdds"])

            return {"odds": parsed_odds}

    except Exception as e:
        print(f"Error fetching odds for event {event_id}: {e}")
        return {"odds": None}


def classify_play_type(type_text: str, scoring_play: bool, score_value: int) -> str:
    """Classify play type based on ESPN type text and other attributes"""
    if not type_text:
        return "other"

    type_lower = type_text.lower()

    # Scoring plays
    if "3" in type_lower and "point" in type_lower:
        return "three_point_made" if scoring_play else "three_point_missed"
    elif "2" in type_lower and "point" in type_lower:
        return "two_point_made" if scoring_play else "two_point_missed"
    elif "free throw" in type_lower or "ft" in type_lower:
        return "free_throw_made" if scoring_play else "free_throw_missed"
    elif "jumper" in type_lower or "layup" in type_lower or "dunk" in type_lower:
        return "two_point_made" if scoring_play else "two_point_missed"

    # Rebounds
    if "offensive rebound" in type_lower:
        return "rebound_offensive"
    elif "defensive rebound" in type_lower or "rebound" in type_lower:
        return "rebound_defensive"

    # Turnovers and steals
    if "turnover" in type_lower:
        return "turnover"
    elif "steal" in type_lower:
        return "steal"
    elif "block" in type_lower:
        return "block"

    # Fouls
    if "technical" in type_lower:
        return "foul_technical"
    elif "foul" in type_lower:
        return "foul_personal"

    # Administrative
    if "timeout" in type_lower:
        return "timeout"
    elif "substitution" in type_lower:
        return "substitution"
    elif "jump ball" in type_lower:
        return "jump_ball"
    elif "end" in type_lower:
        return "end_period"

    return "other"


def get_play_category(play_type: str) -> str:
    """Get high-level category for a play type"""
    scoring_types = ["three_point_made", "three_point_missed", "two_point_made", "two_point_missed", "free_throw_made", "free_throw_missed"]
    if play_type in scoring_types:
        return "scoring"
    elif play_type in ["rebound_offensive", "rebound_defensive"]:
        return "rebounding"
    elif play_type in ["turnover", "steal"]:
        return "turnovers"
    elif play_type in ["foul_personal", "foul_technical"]:
        return "fouls"
    elif play_type in ["block", "steal"]:
        return "defensive"
    else:
        return "administrative"


@app.get("/api/games/{event_id}/playbyplay")
async def get_game_playbyplay(event_id: int):
    """Fetch play-by-play data for game flow visualization"""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # Fetch from ESPN summary API which includes all plays
            summary_url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary?event={event_id}"
            response = await client.get(summary_url)

            if response.status_code != 200:
                return {"plays": []}

            summary_data = response.json()

            if not summary_data.get("plays"):
                return {"plays": []}

            # Build a map of play ID to win probability
            win_prob_map = {}
            if summary_data.get("winprobability"):
                for wp in summary_data["winprobability"]:
                    play_id = wp.get("playId")
                    if play_id:
                        win_prob_map[play_id] = wp.get("homeWinPercentage")

            # Parse ALL plays (not just scoring plays) for complete game flow
            plays = []
            for play in summary_data["plays"]:
                # Extract team ID if present
                team_id = None
                if play.get("team"):
                    team_id = str(play["team"].get("id"))

                play_id = play.get("id")
                score_value = play.get("scoreValue", 0)
                scoring_play = play.get("scoringPlay", False)

                # Extract play type first
                play_type_obj = play.get("type", {})
                play_type_text = play_type_obj.get("text", "")

                # Classify play
                play_type = classify_play_type(play_type_text, scoring_play, score_value)
                play_category = get_play_category(play_type)

                # Define play types that should NOT show player photos
                NO_PLAYER_PHOTO_TYPES = [
                    "jump_ball",
                    "substitution",
                    "timeout",
                    "end_period",
                    "foul_personal",
                    "foul_technical"
                ]

                # Extract player information from participants array
                player_id = None
                player_name = None
                player_short_name = None
                assist_player_id = None
                assist_player_name = None

                # Only extract player IDs for play types that should show photos
                if play_type not in NO_PLAYER_PHOTO_TYPES:
                    participants = play.get("participants", [])
                    for i, participant in enumerate(participants):
                        athlete = participant.get("athlete", {})
                        # Only extract if athlete ID exists (to avoid team-level plays)
                        athlete_id = athlete.get("id")
                        if athlete_id:
                            if i == 0:  # First participant is the primary player
                                player_id = athlete_id
                                player_name = athlete.get("displayName")
                                player_short_name = athlete.get("shortName")
                            elif i == 1:  # Second participant is typically assist
                                assist_player_id = athlete_id
                                assist_player_name = athlete.get("displayName")

                # Extract shot coordinates
                shot_coordinate = None
                shot_result = None
                coordinate = play.get("coordinate", {})
                if coordinate and coordinate.get("x") is not None:
                    shot_coordinate = {
                        "x": coordinate.get("x"),
                        "y": coordinate.get("y")
                    }
                    # Determine if shot was made or missed
                    shot_result = "made" if score_value > 0 else "missed"

                # Extract sequence number
                sequence_number = play.get("sequenceNumber", 0)

                play_data = {
                    "id": play_id,
                    "text": play.get("text", ""),
                    "shortText": play.get("text", ""),
                    "awayScore": play.get("awayScore", 0),
                    "homeScore": play.get("homeScore", 0),
                    "period": play.get("period", {}).get("number", 1),
                    "periodDisplay": play.get("period", {}).get("displayValue", "1st Half"),
                    "clock": play.get("clock", {}).get("displayValue", "0:00"),
                    "clockValue": play.get("clock", {}).get("value", 0),
                    "scoreValue": score_value,
                    "scoringPlay": scoring_play,
                    "team": team_id,
                    "homeWinPercentage": win_prob_map.get(play_id),
                    # NEW: Player information
                    "playerId": player_id,
                    "playerName": player_name,
                    "playerShortName": player_short_name,
                    "assistPlayerId": assist_player_id,
                    "assistPlayerName": assist_player_name,
                    # NEW: Play classification
                    "playType": play_type,
                    "playTypeText": play_type_text,
                    "playCategory": play_category,
                    # NEW: Shot chart data
                    "shotCoordinate": shot_coordinate,
                    "shotResult": shot_result,
                    # NEW: Metadata
                    "sequenceNumber": sequence_number
                }

                plays.append(play_data)

            return {"plays": plays}

    except Exception as e:
        print(f"Error fetching play-by-play for event {event_id}: {e}")
        import traceback
        traceback.print_exc()
        return {"plays": []}


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


@app.get("/api/bettors-heaven")
async def get_bettors_heaven():
    """Get upcoming games with predictions, odds, and betting value analysis from ESPN API"""
    try:
        # Fetch today's and tomorrow's games from ESPN API
        from datetime import timedelta
        today = datetime.now()
        tomorrow = today + timedelta(days=1)

        dates = [today.strftime('%Y%m%d'), tomorrow.strftime('%Y%m%d')]

        all_events = []
        async with httpx.AsyncClient(timeout=30.0) as client:
            for date in dates:
                url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates={date}&limit=200&groups=50"
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()
                all_events.extend(data.get('events', []))

        games = []

        # Process each game and fetch detailed data with predictions
        async with httpx.AsyncClient(timeout=30.0) as client:
            for event in all_events[:30]:  # Limit to 30 games to avoid timeout
                event_id = event['id']
                competition = event['competitions'][0]

                # Skip completed games
                if competition.get('status', {}).get('type', {}).get('completed', False):
                    continue

                # Fetch game summary to get predictor data
                try:
                    summary_url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary?event={event_id}"
                    summary_response = await client.get(summary_url, timeout=10.0)

                    if summary_response.status_code != 200:
                        continue

                    summary_data = summary_response.json()
                    predictor = summary_data.get('predictor')

                    if not predictor:
                        continue

                    home_win_prob = predictor.get('homeTeam', {}).get('gameProjection')
                    away_win_prob = predictor.get('awayTeam', {}).get('gameProjection')

                    if home_win_prob is None or away_win_prob is None:
                        continue
                except Exception as e:
                    print(f"Error fetching summary for event {event_id}: {e}")
                    continue

                competitors = competition.get('competitors', [])
                if len(competitors) < 2:
                    continue

                # Find home and away teams
                home_team = next((c for c in competitors if c.get('homeAway') == 'home'), {})
                away_team = next((c for c in competitors if c.get('homeAway') == 'away'), {})

                # Get odds data from summary endpoint first, fall back to competition odds
                odds_data = summary_data.get('odds', [])
                if not odds_data:
                    odds_data = competition.get('odds', [])

                provider_name = None
                spread = None
                away_is_favorite = None
                home_is_favorite = None
                away_moneyline = None
                home_moneyline = None
                over_under = None
                over_odds = None
                under_odds = None

                if odds_data and len(odds_data) > 0:
                    primary_odds = odds_data[0]
                    provider_name = primary_odds.get('provider', {}).get('name')
                    spread = primary_odds.get('spread')
                    over_under = primary_odds.get('overUnder')
                    over_odds = primary_odds.get('overOdds')
                    under_odds = primary_odds.get('underOdds')

                    # Get moneylines
                    home_odds_data = primary_odds.get('homeTeamOdds', {})
                    away_odds_data = primary_odds.get('awayTeamOdds', {})

                    away_moneyline = away_odds_data.get('moneyLine')
                    home_moneyline = home_odds_data.get('moneyLine')

                    # Determine favorite
                    if home_odds_data.get('favorite'):
                        home_is_favorite = True
                        away_is_favorite = False
                    elif away_odds_data.get('favorite'):
                        away_is_favorite = True
                        home_is_favorite = False

                # Calculate predicted margins
                # ESPN probabilities are percentages (0-100), convert to decimals
                home_win_prob_decimal = float(home_win_prob) / 100.0
                away_win_prob_decimal = float(away_win_prob) / 100.0

                home_predicted_margin = None
                away_predicted_margin = None
                # Estimate margin based on win probability differential
                prob_diff = home_win_prob_decimal - away_win_prob_decimal
                estimated_margin = prob_diff * 30  # Rough estimate: 30 points for 100% prob diff
                if estimated_margin > 0:
                    home_predicted_margin = estimated_margin
                else:
                    away_predicted_margin = -estimated_margin

                # Get team records from header
                home_record = None
                away_record = None
                home_rank = None
                away_rank = None

                home_records = home_team.get('records', [])
                away_records = away_team.get('records', [])

                for record in home_records:
                    if record.get('type') == 'total':
                        home_record = record.get('summary')
                        break

                for record in away_records:
                    if record.get('type') == 'total':
                        away_record = record.get('summary')
                        break

                # Get rankings
                home_rank = home_team.get('curatedRank', {}).get('current')
                away_rank = away_team.get('curatedRank', {}).get('current')

                # Calculate predicted total score for O/U analysis
                predicted_total = None
                if home_win_prob_decimal and away_win_prob_decimal:
                    # Rough estimate based on typical college basketball scoring
                    avg_score = 72  # Average college basketball score
                    margin = abs(home_predicted_margin if home_predicted_margin else away_predicted_margin if away_predicted_margin else 0)
                    # Higher probability games tend to have higher margins and different totals
                    predicted_total = (avg_score * 2) + (margin * 0.5)

                game = {
                    'event_id': int(event['id']),
                    'date': event['date'],
                    'status': competition.get('status', {}).get('type', {}).get('description', 'Scheduled'),
                    'home_team_id': int(home_team.get('team', {}).get('id', 0)),
                    'home_team_name': home_team.get('team', {}).get('displayName', ''),
                    'home_team_logo': home_team.get('team', {}).get('logo', ''),
                    'home_team_record': home_record,
                    'home_team_rank': home_rank,
                    'away_team_id': int(away_team.get('team', {}).get('id', 0)),
                    'away_team_name': away_team.get('team', {}).get('displayName', ''),
                    'away_team_logo': away_team.get('team', {}).get('logo', ''),
                    'away_team_record': away_record,
                    'away_team_rank': away_rank,
                    'home_win_probability': home_win_prob_decimal,
                    'away_win_probability': away_win_prob_decimal,
                    'home_predicted_margin': home_predicted_margin,
                    'away_predicted_margin': away_predicted_margin,
                    'predicted_total': predicted_total,
                    'matchup_quality': predictor.get('matchupQuality'),
                    'provider_name': provider_name,
                    'spread': spread,
                    'away_is_favorite': away_is_favorite,
                    'home_is_favorite': home_is_favorite,
                    'away_moneyline': away_moneyline,
                    'home_moneyline': home_moneyline,
                    'over_under': over_under,
                    'over_odds': over_odds,
                    'under_odds': under_odds
                }

                games.append(game)

        # Fetch overall accuracy stats from database
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT
                    COUNT(*) as total_predictions,
                    SUM(CASE WHEN home_prediction_correct = 1 OR away_prediction_correct = 1 THEN 1 ELSE 0 END) as correct,
                    AVG(ABS(margin_error)) as avg_margin_error
                FROM game_predictions
                WHERE margin_error IS NOT NULL
            """)

            accuracy_row = cursor.fetchone()
            if accuracy_row:
                total = accuracy_row[0]
                correct = accuracy_row[1]
                avg_error = round(accuracy_row[2], 1) if accuracy_row[2] else 0
                accuracy_pct = round((correct / total * 100), 1) if total > 0 else 0
            else:
                total = 0
                correct = 0
                accuracy_pct = 0
                avg_error = 0

        return {
            "games": games,
            "overall_accuracy": {
                "total": total,
                "correct": correct,
                "accuracy_pct": accuracy_pct,
                "avg_margin_error": avg_error
            }
        }

    except Exception as e:
        print(f"Error fetching bettors heaven data: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch betting data: {str(e)}")


@app.get("/api/betting-analytics")
def get_betting_analytics():
    """Analyze historical prediction accuracy to find betting edges"""
    with get_db() as conn:
        cursor = conn.cursor()

        # Overall accuracy
        cursor.execute("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN home_prediction_correct = 1 OR away_prediction_correct = 1 THEN 1 ELSE 0 END) as correct,
                AVG(ABS(margin_error)) as avg_margin_error
            FROM game_predictions
            WHERE margin_error IS NOT NULL
        """)
        overall = dict_from_row(cursor.fetchone())

        # Accuracy by spread range
        cursor.execute("""
            SELECT
                CASE
                    WHEN ABS(o.spread) < 3 THEN 'Close (<3)'
                    WHEN ABS(o.spread) < 7 THEN 'Moderate (3-7)'
                    WHEN ABS(o.spread) < 12 THEN 'Large (7-12)'
                    ELSE 'Blowout (12+)'
                END as spread_range,
                COUNT(*) as total,
                SUM(CASE WHEN gp.home_prediction_correct = 1 OR gp.away_prediction_correct = 1 THEN 1 ELSE 0 END) as correct,
                AVG(ABS(gp.margin_error)) as avg_margin_error,
                AVG(o.spread) as avg_spread
            FROM game_predictions gp
            JOIN game_odds o ON gp.event_id = o.event_id AND o.provider_priority = 1
            WHERE gp.margin_error IS NOT NULL AND o.spread IS NOT NULL
            GROUP BY spread_range
            ORDER BY avg_spread
        """)
        by_spread = [dict_from_row(row) for row in cursor.fetchall()]

        # Accuracy by prediction confidence
        cursor.execute("""
            SELECT
                CASE
                    WHEN MAX(home_win_probability, away_win_probability) < 0.6 THEN 'Toss-Up (<60%)'
                    WHEN MAX(home_win_probability, away_win_probability) < 0.75 THEN 'Moderate (60-75%)'
                    WHEN MAX(home_win_probability, away_win_probability) < 0.90 THEN 'High (75-90%)'
                    ELSE 'Very High (90%+)'
                END as confidence_range,
                COUNT(*) as total,
                SUM(CASE WHEN home_prediction_correct = 1 OR away_prediction_correct = 1 THEN 1 ELSE 0 END) as correct,
                AVG(ABS(margin_error)) as avg_margin_error
            FROM game_predictions
            WHERE margin_error IS NOT NULL
            AND home_win_probability IS NOT NULL
            AND away_win_probability IS NOT NULL
            GROUP BY confidence_range
            ORDER BY MIN(MAX(home_win_probability, away_win_probability))
        """)
        by_confidence = [dict_from_row(row) for row in cursor.fetchall()]

        # Home vs Away accuracy
        cursor.execute("""
            SELECT
                SUM(CASE WHEN home_prediction_correct = 1 THEN 1 ELSE 0 END) as home_correct,
                SUM(CASE WHEN away_prediction_correct = 1 THEN 1 ELSE 0 END) as away_correct,
                COUNT(*) as total
            FROM game_predictions
            WHERE margin_error IS NOT NULL
        """)
        home_away = dict_from_row(cursor.fetchone())

        # Accuracy when ESPN disagrees with spread (potential value)
        cursor.execute("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN gp.home_prediction_correct = 1 OR gp.away_prediction_correct = 1 THEN 1 ELSE 0 END) as correct,
                AVG(ABS(gp.margin_error)) as avg_margin_error
            FROM game_predictions gp
            JOIN game_odds o ON gp.event_id = o.event_id AND o.provider_priority = 1
            WHERE gp.margin_error IS NOT NULL
            AND o.spread IS NOT NULL
            AND (
                (gp.home_predicted_margin > 0 AND o.home_is_favorite = 0) OR
                (gp.away_predicted_margin > 0 AND o.away_is_favorite = 0)
            )
        """)
        disagree_row = cursor.fetchone()
        espn_vs_spread = dict_from_row(disagree_row) if disagree_row and disagree_row[0] > 0 else {"total": 0, "correct": 0, "avg_margin_error": 0}

        # Over/Under accuracy (comparing predicted total to actual)
        cursor.execute("""
            SELECT
                COUNT(*) as total_with_ou,
                SUM(CASE
                    WHEN e.home_score + e.away_score > o.over_under THEN 1
                    ELSE 0
                END) as actual_overs,
                SUM(CASE
                    WHEN e.home_score + e.away_score < o.over_under THEN 1
                    ELSE 0
                END) as actual_unders,
                AVG(o.over_under) as avg_ou_line,
                AVG(e.home_score + e.away_score) as avg_actual_total
            FROM events e
            JOIN game_odds o ON e.event_id = o.event_id AND o.provider_priority = 1
            WHERE e.is_completed = 1
            AND o.over_under IS NOT NULL
            AND e.home_score IS NOT NULL
            AND e.away_score IS NOT NULL
        """)
        ou_accuracy = dict_from_row(cursor.fetchone())

        # Best betting scenarios (highest ESPN accuracy)
        cursor.execute("""
            SELECT
                'Heavy Favorite Predictions' as scenario,
                COUNT(*) as total,
                SUM(CASE WHEN home_prediction_correct = 1 OR away_prediction_correct = 1 THEN 1 ELSE 0 END) as correct,
                ROUND(CAST(SUM(CASE WHEN home_prediction_correct = 1 OR away_prediction_correct = 1 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) * 100, 1) as accuracy_pct
            FROM game_predictions
            WHERE margin_error IS NOT NULL
            AND MAX(home_win_probability, away_win_probability) >= 0.8
            UNION ALL
            SELECT
                'Close Games (<3 pt spread)' as scenario,
                COUNT(*) as total,
                SUM(CASE WHEN gp.home_prediction_correct = 1 OR gp.away_prediction_correct = 1 THEN 1 ELSE 0 END) as correct,
                ROUND(CAST(SUM(CASE WHEN gp.home_prediction_correct = 1 OR gp.away_prediction_correct = 1 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) * 100, 1) as accuracy_pct
            FROM game_predictions gp
            JOIN game_odds o ON gp.event_id = o.event_id AND o.provider_priority = 1
            WHERE gp.margin_error IS NOT NULL
            AND ABS(o.spread) < 3
            UNION ALL
            SELECT
                'ESPN Disagrees with Spread' as scenario,
                COUNT(*) as total,
                SUM(CASE WHEN gp.home_prediction_correct = 1 OR gp.away_prediction_correct = 1 THEN 1 ELSE 0 END) as correct,
                ROUND(CAST(SUM(CASE WHEN gp.home_prediction_correct = 1 OR gp.away_prediction_correct = 1 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) * 100, 1) as accuracy_pct
            FROM game_predictions gp
            JOIN game_odds o ON gp.event_id = o.event_id AND o.provider_priority = 1
            WHERE gp.margin_error IS NOT NULL
            AND (
                (gp.home_predicted_margin > 0 AND o.home_is_favorite = 0) OR
                (gp.away_predicted_margin > 0 AND o.away_is_favorite = 0)
            )
            ORDER BY accuracy_pct DESC
        """)
        best_scenarios = [dict_from_row(row) for row in cursor.fetchall()]

        return {
            "overall": overall,
            "by_spread_range": by_spread,
            "by_confidence": by_confidence,
            "home_away": home_away,
            "espn_vs_spread": espn_vs_spread,
            "over_under": ou_accuracy,
            "best_scenarios": best_scenarios
        }


@app.get("/api/betting-analytics/examples")
def get_betting_examples(
    scenario: str = Query("all", description="Scenario type: blowouts, close, disagree, home_wins, ou_over, ou_under"),
    limit: int = Query(20, ge=1, le=100)
):
    """Get actual game examples for different betting scenarios"""
    with get_db() as conn:
        cursor = conn.cursor()

        if scenario == "blowouts":
            # Games with 12+ spread where ESPN was right/wrong
            cursor.execute("""
                SELECT
                    e.event_id, e.date,
                    ht.display_name as home_team, ht.logo_url as home_logo,
                    at.display_name as away_team, at.logo_url as away_logo,
                    e.home_score, e.away_score,
                    gp.home_win_probability, gp.away_win_probability,
                    gp.home_predicted_margin, gp.away_predicted_margin,
                    gp.home_prediction_correct, gp.away_prediction_correct,
                    gp.margin_error,
                    o.spread, o.home_is_favorite, o.away_is_favorite
                FROM game_predictions gp
                JOIN events e ON gp.event_id = e.event_id
                JOIN teams ht ON e.home_team_id = ht.team_id
                JOIN teams at ON e.away_team_id = at.team_id
                JOIN game_odds o ON e.event_id = o.event_id AND o.provider_priority = 1
                WHERE gp.margin_error IS NOT NULL
                AND ABS(o.spread) >= 12
                ORDER BY e.date DESC
                LIMIT ?
            """, (limit,))

        elif scenario == "close":
            # Close games (<3 spread)
            cursor.execute("""
                SELECT
                    e.event_id, e.date,
                    ht.display_name as home_team, ht.logo_url as home_logo,
                    at.display_name as away_team, at.logo_url as away_logo,
                    e.home_score, e.away_score,
                    gp.home_win_probability, gp.away_win_probability,
                    gp.home_predicted_margin, gp.away_predicted_margin,
                    gp.home_prediction_correct, gp.away_prediction_correct,
                    gp.margin_error,
                    o.spread, o.home_is_favorite, o.away_is_favorite
                FROM game_predictions gp
                JOIN events e ON gp.event_id = e.event_id
                JOIN teams ht ON e.home_team_id = ht.team_id
                JOIN teams at ON e.away_team_id = at.team_id
                JOIN game_odds o ON e.event_id = o.event_id AND o.provider_priority = 1
                WHERE gp.margin_error IS NOT NULL
                AND ABS(o.spread) < 3
                ORDER BY e.date DESC
                LIMIT ?
            """, (limit,))

        elif scenario == "disagree":
            # ESPN disagrees with spread
            cursor.execute("""
                SELECT
                    e.event_id, e.date,
                    ht.display_name as home_team, ht.logo_url as home_logo,
                    at.display_name as away_team, at.logo_url as away_logo,
                    e.home_score, e.away_score,
                    gp.home_win_probability, gp.away_win_probability,
                    gp.home_predicted_margin, gp.away_predicted_margin,
                    gp.home_prediction_correct, gp.away_prediction_correct,
                    gp.margin_error,
                    o.spread, o.home_is_favorite, o.away_is_favorite
                FROM game_predictions gp
                JOIN events e ON gp.event_id = e.event_id
                JOIN teams ht ON e.home_team_id = ht.team_id
                JOIN teams at ON e.away_team_id = at.team_id
                JOIN game_odds o ON e.event_id = o.event_id AND o.provider_priority = 1
                WHERE gp.margin_error IS NOT NULL
                AND (
                    (gp.home_predicted_margin > 0 AND o.home_is_favorite = 0) OR
                    (gp.away_predicted_margin > 0 AND o.away_is_favorite = 0)
                )
                ORDER BY e.date DESC
                LIMIT ?
            """, (limit,))

        elif scenario == "home_wins":
            # Home team victories
            cursor.execute("""
                SELECT
                    e.event_id, e.date,
                    ht.display_name as home_team, ht.logo_url as home_logo,
                    at.display_name as away_team, at.logo_url as away_logo,
                    e.home_score, e.away_score,
                    gp.home_win_probability, gp.away_win_probability,
                    gp.home_predicted_margin, gp.away_predicted_margin,
                    gp.home_prediction_correct, gp.away_prediction_correct,
                    gp.margin_error,
                    o.spread, o.home_is_favorite, o.away_is_favorite
                FROM game_predictions gp
                JOIN events e ON gp.event_id = e.event_id
                JOIN teams ht ON e.home_team_id = ht.team_id
                JOIN teams at ON e.away_team_id = at.team_id
                LEFT JOIN game_odds o ON e.event_id = o.event_id AND o.provider_priority = 1
                WHERE gp.margin_error IS NOT NULL
                AND gp.home_prediction_correct = 1
                ORDER BY e.date DESC
                LIMIT ?
            """, (limit,))

        elif scenario == "ou_over":
            # Games that went over
            cursor.execute("""
                SELECT
                    e.event_id, e.date,
                    ht.display_name as home_team, ht.logo_url as home_logo,
                    at.display_name as away_team, at.logo_url as away_logo,
                    e.home_score, e.away_score,
                    o.over_under,
                    (e.home_score + e.away_score) as actual_total,
                    (e.home_score + e.away_score - o.over_under) as ou_diff
                FROM events e
                JOIN teams ht ON e.home_team_id = ht.team_id
                JOIN teams at ON e.away_team_id = at.team_id
                JOIN game_odds o ON e.event_id = o.event_id AND o.provider_priority = 1
                WHERE e.is_completed = 1
                AND o.over_under IS NOT NULL
                AND e.home_score IS NOT NULL
                AND e.away_score IS NOT NULL
                AND (e.home_score + e.away_score) > o.over_under
                ORDER BY e.date DESC
                LIMIT ?
            """, (limit,))

        elif scenario == "ou_under":
            # Games that went under
            cursor.execute("""
                SELECT
                    e.event_id, e.date,
                    ht.display_name as home_team, ht.logo_url as home_logo,
                    at.display_name as away_team, at.logo_url as away_logo,
                    e.home_score, e.away_score,
                    o.over_under,
                    (e.home_score + e.away_score) as actual_total,
                    (o.over_under - (e.home_score + e.away_score)) as ou_diff
                FROM events e
                JOIN teams ht ON e.home_team_id = ht.team_id
                JOIN teams at ON e.away_team_id = at.team_id
                JOIN game_odds o ON e.event_id = o.event_id AND o.provider_priority = 1
                WHERE e.is_completed = 1
                AND o.over_under IS NOT NULL
                AND e.home_score IS NOT NULL
                AND e.away_score IS NOT NULL
                AND (e.home_score + e.away_score) < o.over_under
                ORDER BY e.date DESC
                LIMIT ?
            """, (limit,))

        else:
            # All games with predictions
            cursor.execute("""
                SELECT
                    e.event_id, e.date,
                    ht.display_name as home_team, ht.logo_url as home_logo,
                    at.display_name as away_team, at.logo_url as away_logo,
                    e.home_score, e.away_score,
                    gp.home_win_probability, gp.away_win_probability,
                    gp.home_predicted_margin, gp.away_predicted_margin,
                    gp.home_prediction_correct, gp.away_prediction_correct,
                    gp.margin_error,
                    o.spread, o.home_is_favorite, o.away_is_favorite
                FROM game_predictions gp
                JOIN events e ON gp.event_id = e.event_id
                JOIN teams ht ON e.home_team_id = ht.team_id
                JOIN teams at ON e.away_team_id = at.team_id
                LEFT JOIN game_odds o ON e.event_id = o.event_id AND o.provider_priority = 1
                WHERE gp.margin_error IS NOT NULL
                ORDER BY e.date DESC
                LIMIT ?
            """, (limit,))

        games = []
        for row in cursor.fetchall():
            game = dict_from_row(row)

            # Add computed fields for the frontend
            if 'home_prediction_correct' in game and 'away_prediction_correct' in game:
                # Determine if ESPN was correct
                game['espn_correct'] = game['home_prediction_correct'] == 1 or game['away_prediction_correct'] == 1

                # Determine who ESPN favored
                if game.get('home_win_probability', 0) > game.get('away_win_probability', 0):
                    game['espn_favored_team'] = game['home_team']
                else:
                    game['espn_favored_team'] = game['away_team']

                # Determine who spread favored
                if game.get('home_is_favorite'):
                    game['spread_favored_team'] = game['home_team']
                elif game.get('away_is_favorite'):
                    game['spread_favored_team'] = game['away_team']
                else:
                    game['spread_favored_team'] = 'Pick\'em'

            games.append(game)

        return {"games": games, "scenario": scenario, "count": len(games)}


@app.get("/api/betting-strategies")
def get_betting_strategies():
    """
    Analyze historical game data to find profitable betting strategies.
    Focuses on current season trends with ESPN predictions vs betting lines.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        strategies = []

        # Strategy 1: Fade the Spread (ESPN predicts different margin than spread)
        # Test multiple thresholds: 2pt, 3pt, 4pt, 5pt differences
        for threshold in [2, 3, 4, 5]:
            # ESPN predicts LARGER margin than spread (bet favorite)
            cursor.execute("""
                SELECT
                    COUNT(*) as total_games,
                    SUM(CASE
                        WHEN (e.home_score - e.away_score) > ABS(o.spread) THEN 1
                        ELSE 0
                    END) as covers,
                    AVG(ABS((e.home_score - e.away_score) - ABS(o.spread))) as avg_margin
                FROM game_predictions gp
                JOIN events e ON gp.event_id = e.event_id
                JOIN game_odds o ON e.event_id = o.event_id AND o.provider_priority = 1
                WHERE e.is_completed = 1
                AND gp.margin_error IS NOT NULL
                AND o.spread IS NOT NULL
                AND o.home_is_favorite = 1
                AND gp.home_predicted_margin IS NOT NULL
                AND ABS(gp.home_predicted_margin) - ABS(o.spread) >= ?
            """, (threshold,))

            fav_larger = cursor.fetchone()

            # ESPN predicts SMALLER margin than spread (bet underdog)
            cursor.execute("""
                SELECT
                    COUNT(*) as total_games,
                    SUM(CASE
                        WHEN (e.home_score - e.away_score) < ABS(o.spread) THEN 1
                        ELSE 0
                    END) as covers,
                    AVG(ABS((e.home_score - e.away_score) - ABS(o.spread))) as avg_margin
                FROM game_predictions gp
                JOIN events e ON gp.event_id = e.event_id
                JOIN game_odds o ON e.event_id = o.event_id AND o.provider_priority = 1
                WHERE e.is_completed = 1
                AND gp.margin_error IS NOT NULL
                AND o.spread IS NOT NULL
                AND o.home_is_favorite = 1
                AND gp.home_predicted_margin IS NOT NULL
                AND ABS(o.spread) - ABS(gp.home_predicted_margin) >= ?
            """, (threshold,))

            dog_smaller = cursor.fetchone()

            # Combine both scenarios
            total = (fav_larger[0] or 0) + (dog_smaller[0] or 0)
            covers = (fav_larger[1] or 0) + (dog_smaller[1] or 0)

            if total >= 20:  # Minimum sample size
                win_rate = (covers / total * 100) if total > 0 else 0
                # Calculate ROI assuming -110 odds (need to win 52.4% to break even)
                # Win = +$100, Loss = -$110
                profit = (covers * 100) - ((total - covers) * 110)
                roi = (profit / (total * 110)) * 100 if total > 0 else 0

                strategies.append({
                    "id": f"fade_spread_{threshold}pt",
                    "name": f"Fade the Spread ({threshold}+ pt difference)",
                    "category": "Spread Strategy",
                    "description": f"Bet favorite when ESPN predicts {threshold}+ points more than spread, bet underdog when ESPN predicts {threshold}+ points less",
                    "total_games": total,
                    "wins": covers,
                    "losses": total - covers,
                    "win_rate": round(win_rate, 1),
                    "roi": round(roi, 1),
                    "profit": round(profit, 0),
                    "threshold": threshold,
                    "sample_size_adequate": total >= 50,
                    "statistically_significant": total >= 50 and win_rate > 53
                })

        # Strategy 2: High Confidence + Disagreement
        for conf_threshold in [0.65, 0.70, 0.75]:
            for margin_threshold in [2, 3, 4]:
                cursor.execute("""
                    SELECT
                        COUNT(*) as total_games,
                        SUM(CASE WHEN gp.home_prediction_correct = 1 THEN 1 ELSE 0 END) as correct
                    FROM game_predictions gp
                    JOIN events e ON gp.event_id = e.event_id
                    JOIN game_odds o ON e.event_id = o.event_id AND o.provider_priority = 1
                    WHERE e.is_completed = 1
                    AND gp.margin_error IS NOT NULL
                    AND o.spread IS NOT NULL
                    AND gp.home_win_probability >= ?
                    AND ABS(ABS(gp.home_predicted_margin) - ABS(o.spread)) >= ?
                """, (conf_threshold, margin_threshold))

                result = cursor.fetchone()
                total = result[0] or 0
                correct = result[1] or 0

                if total >= 15:
                    win_rate = (correct / total * 100) if total > 0 else 0
                    profit = (correct * 100) - ((total - correct) * 110)
                    roi = (profit / (total * 110)) * 100 if total > 0 else 0

                    strategies.append({
                        "id": f"high_conf_{int(conf_threshold*100)}pct_{margin_threshold}pt",
                        "name": f"High Confidence Edge ({int(conf_threshold*100)}%+ conf, {margin_threshold}+ pt diff)",
                        "category": "Confidence Strategy",
                        "description": f"When ESPN is {int(conf_threshold*100)}%+ confident AND differs by {margin_threshold}+ points from spread",
                        "total_games": total,
                        "wins": correct,
                        "losses": total - correct,
                        "win_rate": round(win_rate, 1),
                        "roi": round(roi, 1),
                        "profit": round(profit, 0),
                        "confidence_threshold": conf_threshold,
                        "margin_threshold": margin_threshold,
                        "sample_size_adequate": total >= 30,
                        "statistically_significant": total >= 30 and win_rate > 53
                    })

        # Strategy 3: Blowout Confirmation (ESPN agrees with large spread)
        cursor.execute("""
            SELECT
                COUNT(*) as total_games,
                SUM(CASE WHEN gp.home_prediction_correct = 1 THEN 1 ELSE 0 END) as correct
            FROM game_predictions gp
            JOIN events e ON gp.event_id = e.event_id
            JOIN game_odds o ON e.event_id = o.event_id AND o.provider_priority = 1
            WHERE e.is_completed = 1
            AND gp.margin_error IS NOT NULL
            AND ABS(o.spread) >= 12
            AND ABS(ABS(gp.home_predicted_margin) - ABS(o.spread)) <= 3
        """)

        result = cursor.fetchone()
        total = result[0] or 0
        correct = result[1] or 0

        if total >= 10:
            win_rate = (correct / total * 100) if total > 0 else 0
            profit = (correct * 100) - ((total - correct) * 110)
            roi = (profit / (total * 110)) * 100 if total > 0 else 0

            strategies.append({
                "id": "blowout_confirmation",
                "name": "Blowout Confirmation",
                "category": "High Confidence",
                "description": "Bet favorite when spread is 12+ points and ESPN agrees within 3 points",
                "total_games": total,
                "wins": correct,
                "losses": total - correct,
                "win_rate": round(win_rate, 1),
                "roi": round(roi, 1),
                "profit": round(profit, 0),
                "sample_size_adequate": total >= 30,
                "statistically_significant": total >= 30 and win_rate > 53
            })

        # Strategy 4: Home Underdog Special
        cursor.execute("""
            SELECT
                COUNT(*) as total_games,
                SUM(CASE WHEN e.home_score > e.away_score THEN 1 ELSE 0 END) as home_wins
            FROM game_predictions gp
            JOIN events e ON gp.event_id = e.event_id
            JOIN game_odds o ON e.event_id = o.event_id AND o.provider_priority = 1
            WHERE e.is_completed = 1
            AND gp.margin_error IS NOT NULL
            AND o.spread IS NOT NULL
            AND o.away_is_favorite = 1
            AND o.spread BETWEEN 3 AND 7
            AND ABS(gp.home_predicted_margin - gp.away_predicted_margin) <= 3
        """)

        result = cursor.fetchone()
        total = result[0] or 0
        home_wins = result[1] or 0

        if total >= 15:
            win_rate = (home_wins / total * 100) if total > 0 else 0
            profit = (home_wins * 100) - ((total - home_wins) * 110)
            roi = (profit / (total * 110)) * 100 if total > 0 else 0

            strategies.append({
                "id": "home_underdog_special",
                "name": "Home Underdog Special",
                "category": "Situational",
                "description": "Bet home underdog (+3 to +7) when ESPN predicts close game",
                "total_games": total,
                "wins": home_wins,
                "losses": total - home_wins,
                "win_rate": round(win_rate, 1),
                "roi": round(roi, 1),
                "profit": round(profit, 0),
                "sample_size_adequate": total >= 30,
                "statistically_significant": total >= 30 and win_rate > 53
            })

        # Sort strategies by ROI (best first)
        strategies.sort(key=lambda x: x['roi'], reverse=True)

        return {
            "strategies": strategies,
            "season": "2024-25",
            "note": "All ROI calculations assume -110 odds (standard juice). Break-even win rate is 52.4%."
        }


@app.get("/api/betting-strategies/{strategy_id}/examples")
def get_strategy_examples(strategy_id: str, limit: int = 10):
    """
    Get example games for a specific betting strategy.
    Shows recent wins and losses to illustrate the strategy in action.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        # Parse strategy ID to get type and parameters
        if strategy_id.startswith("fade_spread_"):
            threshold = int(strategy_id.split("_")[-1].replace("pt", ""))

            # Get examples where ESPN predicted larger margin (bet favorite)
            cursor.execute("""
                SELECT
                    e.*,
                    ht.display_name as home_team,
                    ht.abbreviation as home_team_short,
                    at.display_name as away_team,
                    at.abbreviation as away_team_short,
                    o.spread,
                    o.home_is_favorite,
                    gp.home_win_probability,
                    gp.home_predicted_margin,
                    gp.away_predicted_margin,
                    gp.margin_error,
                    CASE
                        WHEN (e.home_score - e.away_score) > ABS(o.spread) THEN 1
                        ELSE 0
                    END as bet_won
                FROM game_predictions gp
                JOIN events e ON gp.event_id = e.event_id
                JOIN teams ht ON e.home_team_id = ht.team_id
                JOIN teams at ON e.away_team_id = at.team_id
                JOIN game_odds o ON e.event_id = o.event_id AND o.provider_priority = 1
                WHERE e.is_completed = 1
                AND o.spread IS NOT NULL
                AND o.home_is_favorite = 1
                AND gp.home_predicted_margin IS NOT NULL
                AND ABS(gp.home_predicted_margin) - ABS(o.spread) >= ?
                ORDER BY e.date DESC
                LIMIT ?
            """, (threshold, limit // 2))

            fav_examples = [dict_from_row(row) for row in cursor.fetchall()]

            # Get examples where ESPN predicted smaller margin (bet underdog)
            cursor.execute("""
                SELECT
                    e.*,
                    ht.display_name as home_team,
                    ht.abbreviation as home_team_short,
                    at.display_name as away_team,
                    at.abbreviation as away_team_short,
                    o.spread,
                    o.home_is_favorite,
                    gp.home_win_probability,
                    gp.home_predicted_margin,
                    gp.away_predicted_margin,
                    gp.margin_error,
                    CASE
                        WHEN (e.home_score - e.away_score) < ABS(o.spread) THEN 1
                        ELSE 0
                    END as bet_won
                FROM game_predictions gp
                JOIN events e ON gp.event_id = e.event_id
                JOIN teams ht ON e.home_team_id = ht.team_id
                JOIN teams at ON e.away_team_id = at.team_id
                JOIN game_odds o ON e.event_id = o.event_id AND o.provider_priority = 1
                WHERE e.is_completed = 1
                AND o.spread IS NOT NULL
                AND o.home_is_favorite = 1
                AND gp.home_predicted_margin IS NOT NULL
                AND ABS(o.spread) - ABS(gp.home_predicted_margin) >= ?
                ORDER BY e.date DESC
                LIMIT ?
            """, (threshold, limit // 2))

            dog_examples = [dict_from_row(row) for row in cursor.fetchall()]

            examples = fav_examples + dog_examples

        elif strategy_id.startswith("high_conf_"):
            parts = strategy_id.split("_")
            conf_threshold = float(parts[2].replace("pct", "")) / 100  # e.g., "65pct" -> 0.65
            margin_threshold = int(parts[3].replace("pt", ""))

            cursor.execute("""
                SELECT
                    e.*,
                    ht.display_name as home_team,
                    ht.abbreviation as home_team_short,
                    at.display_name as away_team,
                    at.abbreviation as away_team_short,
                    o.spread,
                    o.home_is_favorite,
                    gp.home_win_probability,
                    gp.home_predicted_margin,
                    gp.away_predicted_margin,
                    gp.margin_error,
                    gp.home_prediction_correct as bet_won
                FROM game_predictions gp
                JOIN events e ON gp.event_id = e.event_id
                JOIN teams ht ON e.home_team_id = ht.team_id
                JOIN teams at ON e.away_team_id = at.team_id
                JOIN game_odds o ON e.event_id = o.event_id AND o.provider_priority = 1
                WHERE e.is_completed = 1
                AND o.spread IS NOT NULL
                AND gp.home_win_probability >= ?
                AND ABS(ABS(gp.home_predicted_margin) - ABS(o.spread)) >= ?
                ORDER BY e.date DESC
                LIMIT ?
            """, (conf_threshold, margin_threshold, limit))

            examples = [dict_from_row(row) for row in cursor.fetchall()]

        elif strategy_id.startswith("blowout_conf_"):
            threshold = int(strategy_id.split("_")[-1].replace("pt", ""))

            cursor.execute("""
                SELECT
                    e.*,
                    ht.display_name as home_team,
                    ht.abbreviation as home_team_short,
                    at.display_name as away_team,
                    at.abbreviation as away_team_short,
                    o.spread,
                    o.home_is_favorite,
                    gp.home_win_probability,
                    gp.home_predicted_margin,
                    gp.away_predicted_margin,
                    gp.margin_error,
                    CASE
                        WHEN (e.home_score - e.away_score) > ABS(o.spread) THEN 1
                        ELSE 0
                    END as bet_won
                FROM game_predictions gp
                JOIN events e ON gp.event_id = e.event_id
                JOIN teams ht ON e.home_team_id = ht.team_id
                JOIN teams at ON e.away_team_id = at.team_id
                JOIN game_odds o ON e.event_id = o.event_id AND o.provider_priority = 1
                WHERE e.is_completed = 1
                AND o.spread IS NOT NULL
                AND ABS(o.spread) >= 12
                AND ((o.home_is_favorite = 1 AND gp.home_predicted_margin >= (ABS(o.spread) - ?))
                     OR (o.away_is_favorite = 1 AND gp.away_predicted_margin >= (ABS(o.spread) - ?)))
                ORDER BY e.date DESC
                LIMIT ?
            """, (threshold, threshold, limit))

            examples = [dict_from_row(row) for row in cursor.fetchall()]

        elif strategy_id.startswith("home_dog_"):
            parts = strategy_id.split("_")
            threshold = int(parts[-1].replace("pt", ""))

            cursor.execute("""
                SELECT
                    e.*,
                    ht.display_name as home_team,
                    ht.abbreviation as home_team_short,
                    at.display_name as away_team,
                    at.abbreviation as away_team_short,
                    o.spread,
                    o.home_is_favorite,
                    o.away_is_favorite,
                    gp.home_win_probability,
                    gp.home_predicted_margin,
                    gp.away_predicted_margin,
                    gp.margin_error,
                    CASE
                        WHEN e.home_score > e.away_score THEN 1
                        ELSE 0
                    END as bet_won
                FROM game_predictions gp
                JOIN events e ON gp.event_id = e.event_id
                JOIN teams ht ON e.home_team_id = ht.team_id
                JOIN teams at ON e.away_team_id = at.team_id
                JOIN game_odds o ON e.event_id = o.event_id AND o.provider_priority = 1
                WHERE e.is_completed = 1
                AND o.spread IS NOT NULL
                AND o.away_is_favorite = 1
                AND ABS(o.spread) BETWEEN 3 AND 7
                AND ABS(gp.home_predicted_margin) <= ?
                ORDER BY e.date DESC
                LIMIT ?
            """, (threshold, limit))

            examples = [dict_from_row(row) for row in cursor.fetchall()]

        else:
            return {"examples": [], "message": "Strategy not found"}

        # Add computed fields for frontend
        for game in examples:
            if game.get('home_score') is not None:
                game['actual_margin'] = game['home_score'] - game['away_score']
            game['espn_predicted_margin'] = game.get('home_predicted_margin', 0)

        return {
            "examples": examples,
            "strategy_id": strategy_id,
            "count": len(examples)
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
