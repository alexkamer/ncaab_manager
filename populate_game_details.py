"""
Populate detailed game data: team stats, player stats, odds, and predictions.
Run this AFTER populate_events.py to add details for completed games.
"""
from typing import Dict, List, Optional
from tqdm import tqdm

from database import Database
from api_client import ESPNAPIClient


def parse_team_statistics(event_id: int, team_id: int, home_away: str,
                          statistics: List[Dict]) -> Optional[tuple]:
    """Parse team statistics from boxscore.

    Args:
        event_id: Event ID
        team_id: Team ID
        home_away: 'home' or 'away'
        statistics: List of statistics from API

    Returns:
        Tuple for database insertion
    """
    stats_dict = {}
    for stat in statistics:
        name = stat.get('name', '')
        value = stat.get('displayValue', '')
        stats_dict[name] = value

    # Helper to parse stat values
    def get_stat(name, default=None):
        return stats_dict.get(name, default)

    def parse_made_attempted(stat_str):
        """Parse 'X-Y' format into (made, attempted)."""
        if not stat_str or stat_str == '--':
            return None, None
        try:
            parts = stat_str.split('-')
            return int(parts[0]), int(parts[1])
        except:
            return None, None

    def parse_int(stat_str, default=None):
        """Parse integer stat."""
        if not stat_str or stat_str == '--':
            return default
        try:
            return int(stat_str)
        except:
            return default

    def parse_float(stat_str, default=None):
        """Parse float stat."""
        if not stat_str or stat_str == '--':
            return default
        try:
            return float(stat_str.replace('%', ''))
        except:
            return default

    # Field goals
    fg_made, fg_att = parse_made_attempted(get_stat('fieldGoalsMade-fieldGoalsAttempted'))
    fg_pct = parse_float(get_stat('fieldGoalPct'))

    # Three pointers
    three_made, three_att = parse_made_attempted(get_stat('threePointFieldGoalsMade-threePointFieldGoalsAttempted'))
    three_pct = parse_float(get_stat('threePointFieldGoalPct'))

    # Free throws
    ft_made, ft_att = parse_made_attempted(get_stat('freeThrowsMade-freeThrowsAttempted'))
    ft_pct = parse_float(get_stat('freeThrowPct'))

    # Rebounds
    total_reb = parse_int(get_stat('totalRebounds'))
    off_reb = parse_int(get_stat('offensiveRebounds'))
    def_reb = parse_int(get_stat('defensiveRebounds'))

    # Other stats
    assists = parse_int(get_stat('assists'))
    steals = parse_int(get_stat('steals'))
    blocks = parse_int(get_stat('blocks'))
    turnovers = parse_int(get_stat('turnovers'))
    team_turnovers = parse_int(get_stat('teamTurnovers'))
    total_turnovers = parse_int(get_stat('totalTurnovers'))

    # Fouls
    fouls = parse_int(get_stat('fouls'))
    tech_fouls = parse_int(get_stat('technicalFouls'))
    flagrant_fouls = parse_int(get_stat('flagrantFouls'))

    # Advanced stats
    turnover_points = parse_int(get_stat('turnoverPoints'))
    fast_break_points = parse_int(get_stat('fastBreakPoints'))
    points_in_paint = parse_int(get_stat('pointsInPaint'))
    largest_lead = parse_int(get_stat('largestLead'))

    return (
        event_id, team_id, home_away,
        fg_made, fg_att, fg_pct,
        three_made, three_att, three_pct,
        ft_made, ft_att, ft_pct,
        total_reb, off_reb, def_reb,
        assists, steals, blocks,
        turnovers, team_turnovers, total_turnovers,
        fouls, tech_fouls, flagrant_fouls,
        turnover_points, fast_break_points, points_in_paint,
        largest_lead, None, None  # lead_changes, lead_percentage
    )


def parse_player_statistics(event_id: int, team_id: int, player_data: Dict) -> Optional[tuple]:
    """Parse player statistics from boxscore.

    Args:
        event_id: Event ID
        team_id: Team ID
        player_data: Player data from API

    Returns:
        Tuple for database insertion
    """
    athlete = player_data.get('athlete', {})
    athlete_id = athlete.get('id')
    if not athlete_id:
        return None

    athlete_id = int(athlete_id)
    athlete_name = athlete.get('displayName', '')
    athlete_short_name = athlete.get('shortName', '')

    # Status
    is_active = player_data.get('active', True)
    is_starter = player_data.get('starter', False)

    # Stats array
    stats = player_data.get('stats', [])
    if not stats or len(stats) < 10:
        return None

    # Parse stats (order: MIN, PTS, FG, 3PT, FT, OREB, DREB, REB, AST, STL, BLK, TO, PF)
    def parse_stat(index, default=None):
        try:
            val = stats[index]
            if val == '--' or val == '':
                return default
            return val
        except:
            return default

    minutes = parse_stat(0)
    points = int(parse_stat(1, 0))

    # Parse made-attempted format
    def parse_ma(stat_str):
        if not stat_str or stat_str == '--':
            return None, None
        try:
            parts = stat_str.split('-')
            return int(parts[0]), int(parts[1])
        except:
            return None, None

    fg_made, fg_att = parse_ma(parse_stat(2))
    three_made, three_att = parse_ma(parse_stat(3))
    ft_made, ft_att = parse_ma(parse_stat(4))

    # Individual stats
    off_reb = int(parse_stat(5, 0)) if parse_stat(5) else None
    def_reb = int(parse_stat(6, 0)) if parse_stat(6) else None
    rebounds = int(parse_stat(7, 0)) if parse_stat(7) else None
    assists = int(parse_stat(8, 0)) if parse_stat(8) else None
    steals = int(parse_stat(9, 0)) if parse_stat(9) else None
    blocks = int(parse_stat(10, 0)) if parse_stat(10) else None
    turnovers = int(parse_stat(11, 0)) if parse_stat(11) else None
    fouls = int(parse_stat(12, 0)) if parse_stat(12) else None

    return (
        event_id, team_id, athlete_id,
        athlete_name, athlete_short_name,
        is_active, is_starter, minutes,
        points, fg_made, fg_att,
        three_made, three_att,
        ft_made, ft_att,
        rebounds, off_reb, def_reb,
        assists, turnovers, steals, blocks, fouls
    )


def populate_game_details(db: Database, client: ESPNAPIClient,
                         event_ids: List[int] = None, limit: int = None):
    """Populate detailed game data for events.

    Args:
        db: Database connection
        client: API client
        event_ids: Specific event IDs to process (None = all completed events)
        limit: Maximum events to process (for testing)
    """
    print("\n=== Populating Game Details ===")

    # Get event IDs if not provided
    if event_ids is None:
        cursor = db.execute(
            "SELECT event_id FROM events WHERE is_completed = 1 ORDER BY date DESC"
        )
        event_ids = [row[0] for row in cursor.fetchall()]

    if limit:
        event_ids = event_ids[:limit]

    print(f"Processing {len(event_ids)} completed games...")

    team_stats_data = []
    player_stats_data = []
    odds_count = 0
    predictor_count = 0

    for event_id in tqdm(event_ids, desc="Fetching game details"):
        try:
            # Fetch game summary
            summary = client.get_game_summary(event_id)

            # Parse boxscore
            boxscore = summary.get('boxscore', {})

            # Team statistics
            teams = boxscore.get('teams', [])
            for team_data in teams:
                team_id = int(team_data.get('team', {}).get('id', 0))
                home_away = team_data.get('homeAway', '')
                statistics = team_data.get('statistics', [])

                parsed = parse_team_statistics(event_id, team_id, home_away, statistics)
                if parsed:
                    team_stats_data.append(parsed)

            # Player statistics
            players = boxscore.get('players', [])
            for team_players in players:
                team_id = int(team_players.get('team', {}).get('id', 0))
                statistics = team_players.get('statistics', [])

                if statistics:
                    for stat_group in statistics:
                        athletes = stat_group.get('athletes', [])
                        for athlete_data in athletes:
                            parsed = parse_player_statistics(event_id, team_id, athlete_data)
                            if parsed:
                                player_stats_data.append(parsed)

            # Try to get odds (if available)
            try:
                odds_data = client.get_game_odds(event_id)
                # TODO: Parse and insert odds
                if odds_data.get('count', 0) > 0:
                    odds_count += 1
            except:
                pass

            # Try to get predictor (if available)
            try:
                predictor_data = client.get_game_predictor(event_id)
                # TODO: Parse and insert predictor
                if predictor_data:
                    predictor_count += 1
            except:
                pass

        except Exception as e:
            print(f"\nError processing event {event_id}: {e}")
            continue

    # Insert team statistics
    if team_stats_data:
        print(f"\nInserting {len(team_stats_data)} team stat records...")
        db.executemany(
            """
            INSERT OR REPLACE INTO team_statistics
            (event_id, team_id, home_away,
             field_goals_made, field_goals_attempted, field_goal_pct,
             three_point_made, three_point_attempted, three_point_pct,
             free_throws_made, free_throws_attempted, free_throw_pct,
             total_rebounds, offensive_rebounds, defensive_rebounds,
             assists, steals, blocks,
             turnovers, team_turnovers, total_turnovers,
             fouls, technical_fouls, flagrant_fouls,
             turnover_points, fast_break_points, points_in_paint,
             largest_lead, lead_changes, lead_percentage)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            team_stats_data
        )
        db.commit()

    # Insert player statistics
    if player_stats_data:
        print(f"Inserting {len(player_stats_data)} player stat records...")
        db.executemany(
            """
            INSERT OR REPLACE INTO player_statistics
            (event_id, team_id, athlete_id,
             athlete_name, athlete_short_name,
             is_active, is_starter, minutes_played,
             points, field_goals_made, field_goals_attempted,
             three_point_made, three_point_attempted,
             free_throws_made, free_throws_attempted,
             rebounds, offensive_rebounds, defensive_rebounds,
             assists, turnovers, steals, blocks, fouls)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            player_stats_data
        )
        db.commit()

    print(f"\n✓ Team stats: {len(team_stats_data)}")
    print(f"✓ Player stats: {len(player_stats_data)}")
    print(f"✓ Games with odds: {odds_count}")
    print(f"✓ Games with predictions: {predictor_count}")


def main(limit: int = None):
    """Main function to populate game details.

    Args:
        limit: Limit number of games to process (None = all)
    """
    db = Database()
    client = ESPNAPIClient()

    try:
        db.connect()
        populate_game_details(db, client, limit=limit)
        print("\n✓ Game details population completed successfully!")

    except Exception as e:
        print(f"\n✗ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == '__main__':
    import sys

    limit = None
    if len(sys.argv) > 1:
        limit = int(sys.argv[1])

    main(limit=limit)
