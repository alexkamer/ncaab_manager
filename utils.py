"""
Utility functions for database operations and data analysis.
"""
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from database import Database


def get_team_schedule(db: Database, team_id: int, season_id: int) -> List[Dict]:
    """Get a team's schedule for a season.

    Args:
        db: Database connection
        team_id: Team ID
        season_id: Season ID

    Returns:
        List of game dictionaries
    """
    query = """
    SELECT
        e.event_id,
        e.date,
        CASE
            WHEN e.home_team_id = ? THEN 'vs'
            ELSE '@'
        END as location,
        CASE
            WHEN e.home_team_id = ? THEN away.display_name
            ELSE home.display_name
        END as opponent,
        e.home_score,
        e.away_score,
        CASE
            WHEN e.winner_team_id = ? THEN 'W'
            WHEN e.winner_team_id IS NULL THEN '-'
            ELSE 'L'
        END as result,
        e.is_completed,
        v.full_name as venue
    FROM events e
    JOIN teams home ON e.home_team_id = home.team_id
    JOIN teams away ON e.away_team_id = away.team_id
    LEFT JOIN venues v ON e.venue_id = v.venue_id
    WHERE (e.home_team_id = ? OR e.away_team_id = ?)
      AND e.season_id = ?
    ORDER BY e.date
    """

    cursor = db.execute(query, (team_id, team_id, team_id, team_id, team_id, season_id))
    columns = [desc[0] for desc in cursor.description]

    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def get_team_record(db: Database, team_id: int, season_id: int) -> Dict:
    """Get a team's win-loss record.

    Args:
        db: Database connection
        team_id: Team ID
        season_id: Season ID

    Returns:
        Dictionary with wins, losses, win_pct
    """
    query = """
    SELECT
        COUNT(*) as games_played,
        SUM(CASE WHEN winner_team_id = ? THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN winner_team_id != ? AND is_completed THEN 1 ELSE 0 END) as losses
    FROM events
    WHERE (home_team_id = ? OR away_team_id = ?)
      AND season_id = ?
      AND is_completed = 1
    """

    cursor = db.execute(query, (team_id, team_id, team_id, team_id, season_id))
    row = cursor.fetchone()

    games_played = row[0]
    wins = row[1]
    losses = row[2]
    win_pct = wins / games_played if games_played > 0 else 0.0

    return {
        'games_played': games_played,
        'wins': wins,
        'losses': losses,
        'win_pct': win_pct
    }


def get_todays_games(db: Database) -> List[Dict]:
    """Get today's games.

    Args:
        db: Database connection

    Returns:
        List of game dictionaries
    """
    query = """
    SELECT
        e.event_id,
        e.date,
        away.display_name as away_team,
        home.display_name as home_team,
        e.home_score,
        e.away_score,
        e.status,
        v.full_name as venue,
        e.broadcast_network
    FROM events e
    JOIN teams away ON e.away_team_id = away.team_id
    JOIN teams home ON e.home_team_id = home.team_id
    LEFT JOIN venues v ON e.venue_id = v.venue_id
    WHERE DATE(e.date) = DATE('now')
    ORDER BY e.date
    """

    cursor = db.execute(query)
    columns = [desc[0] for desc in cursor.description]

    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def get_conference_standings(db: Database, season_id: int,
                             group_id: int, season_type_id: int = 2) -> List[Dict]:
    """Get conference standings.

    Args:
        db: Database connection
        season_id: Season ID
        group_id: Conference/group ID
        season_type_id: Season type (default 2 = Regular Season)

    Returns:
        List of standings dictionaries
    """
    query = """
    SELECT
        t.display_name as team,
        s.wins,
        s.losses,
        s.win_percentage,
        s.conference_wins,
        s.conference_losses,
        s.conference_win_percentage,
        s.avg_points_for as ppg,
        s.avg_points_against as opp_ppg
    FROM standings s
    JOIN teams t ON s.team_id = t.team_id
    WHERE s.season_id = ?
      AND s.group_id = ?
      AND s.season_type_id = ?
    ORDER BY s.win_percentage DESC, s.wins DESC
    """

    cursor = db.execute(query, (season_id, group_id, season_type_id))
    columns = [desc[0] for desc in cursor.description]

    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def get_current_rankings(db: Database, season_id: int,
                        ranking_type_id: int = 1, limit: int = 25) -> List[Dict]:
    """Get current rankings for a season.

    Args:
        db: Database connection
        season_id: Season ID
        ranking_type_id: Ranking type (1=AP Poll, 2=Coaches Poll)
        limit: Number of teams to return (default 25)

    Returns:
        List of ranking dictionaries
    """
    query = """
    SELECT
        wr.current_rank,
        wr.previous_rank,
        t.display_name as team,
        wr.record_summary,
        wr.points,
        wr.first_place_votes,
        wr.trend
    FROM weekly_rankings wr
    JOIN teams t ON wr.team_id = t.team_id
    WHERE wr.season_id = ?
      AND wr.ranking_type_id = ?
      AND wr.week_number = (
          SELECT MAX(week_number)
          FROM weekly_rankings
          WHERE season_id = ? AND ranking_type_id = ?
      )
    ORDER BY wr.current_rank
    LIMIT ?
    """

    cursor = db.execute(query, (season_id, ranking_type_id, season_id, ranking_type_id, limit))
    columns = [desc[0] for desc in cursor.description]

    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def search_teams(db: Database, query: str) -> List[Dict]:
    """Search for teams by name.

    Args:
        db: Database connection
        query: Search query

    Returns:
        List of team dictionaries
    """
    sql = """
    SELECT
        team_id,
        display_name,
        abbreviation,
        location,
        name
    FROM teams
    WHERE display_name LIKE ?
       OR name LIKE ?
       OR abbreviation LIKE ?
    ORDER BY display_name
    LIMIT 20
    """

    search_term = f"%{query}%"
    cursor = db.execute(sql, (search_term, search_term, search_term))
    columns = [desc[0] for desc in cursor.description]

    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def get_database_stats(db: Database) -> Dict:
    """Get database statistics.

    Args:
        db: Database connection

    Returns:
        Dictionary of table counts
    """
    tables = [
        'seasons', 'season_types', 'groups', 'teams', 'team_seasons',
        'events', 'team_statistics', 'player_statistics', 'standings',
        'athletes', 'athlete_seasons', 'venues',
        'game_odds', 'game_predictions',
        'ranking_types', 'weekly_rankings', 'rankings_receiving_votes'
    ]

    stats = {}
    for table in tables:
        try:
            cursor = db.execute(f"SELECT COUNT(*) FROM {table}")
            stats[table] = cursor.fetchone()[0]
        except:
            stats[table] = 0

    return stats


def print_team_info(db: Database, team_id: int, season_id: int = 2026):
    """Print formatted team information.

    Args:
        db: Database connection
        team_id: Team ID
        season_id: Season ID
    """
    # Get team info
    cursor = db.execute(
        "SELECT display_name, abbreviation, location FROM teams WHERE team_id = ?",
        (team_id,)
    )
    team = cursor.fetchone()

    if not team:
        print(f"Team {team_id} not found")
        return

    print(f"\n{'='*60}")
    print(f"{team[0]} ({team[1]})")
    print(f"{'='*60}")

    # Get record
    record = get_team_record(db, team_id, season_id)
    print(f"\nRecord: {record['wins']}-{record['losses']} ({record['win_pct']:.3f})")

    # Get recent games
    schedule = get_team_schedule(db, team_id, season_id)
    recent = [g for g in schedule if g['is_completed']][-5:]

    if recent:
        print("\nRecent Games:")
        print("-" * 60)
        for game in recent:
            print(f"{game['date'][:10]} {game['location']:3} {game['opponent']:30} {game['result']}")


if __name__ == '__main__':
    # Example usage
    db = Database()
    db.connect()

    print("\nDatabase Statistics:")
    print("="*40)
    stats = get_database_stats(db)
    for table, count in stats.items():
        print(f"{table:.<30} {count:>8}")

    print("\n\nToday's Games:")
    print("="*60)
    games = get_todays_games(db)
    if games:
        for game in games:
            print(f"{game['date'][11:16]} - {game['away_team']} @ {game['home_team']}")
    else:
        print("No games today")

    db.close()
