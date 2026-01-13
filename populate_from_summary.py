"""
Populate team and player statistics from game summaries.
Reads event IDs from file or command line and fetches summary data.
"""
from typing import Dict, List, Optional
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

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


class ThreadSafeDatabase:
    """Thread-safe database wrapper."""

    def __init__(self, db_path: str = None):
        self.db_path = db_path
        self._local = threading.local()
        self._write_lock = threading.Lock()

    def get_connection(self):
        """Get thread-local database connection."""
        if not hasattr(self._local, 'db'):
            self._local.db = Database(self.db_path)
            self._local.db.connect()
        return self._local.db

    def execute_batch(self, query: str, data: List[tuple]):
        """Execute batch insert with lock."""
        with self._write_lock:
            db = self.get_connection()
            db.executemany(query, data)
            db.commit()


def process_event(event_id: int, client: ESPNAPIClient) -> tuple:
    """Fetch and parse summary for a single event.

    Args:
        event_id: Event ID
        client: API client

    Returns:
        Tuple of (team_stats_list, player_stats_list)
    """
    try:
        # Fetch game summary
        summary = client.get_game_summary(event_id)

        team_stats = []
        player_stats = []

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
                team_stats.append(parsed)

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
                            player_stats.append(parsed)

        return (team_stats, player_stats)

    except Exception as e:
        return ([], [])


def populate_from_event_ids(event_ids: List[int], max_workers: int = 20,
                            batch_size: int = 50, db_path: str = None):
    """Populate statistics from list of event IDs.

    Args:
        event_ids: List of event IDs
        max_workers: Number of parallel threads
        batch_size: Batch size for database inserts
        db_path: Database path (optional)
    """
    print(f"\n=== Populating Statistics from {len(event_ids)} Events ===")
    print(f"Workers: {max_workers}, Batch size: {batch_size}")

    thread_safe_db = ThreadSafeDatabase(db_path)

    # Process events in parallel
    all_team_stats = []
    all_player_stats = []
    completed_count = 0
    error_count = 0

    print("\nProcessing events in parallel...")
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Create a client for each thread
        thread_clients = {}

        def get_thread_client():
            thread_id = threading.get_ident()
            if thread_id not in thread_clients:
                thread_clients[thread_id] = ESPNAPIClient()
            return thread_clients[thread_id]

        # Submit all tasks
        future_to_event = {
            executor.submit(process_event, event_id, get_thread_client()): event_id
            for event_id in event_ids
        }

        # Process results with progress bar
        with tqdm(total=len(event_ids), desc="Fetching summaries") as pbar:
            for future in as_completed(future_to_event):
                pbar.update(1)
                team_stats, player_stats = future.result()

                if team_stats or player_stats:
                    all_team_stats.extend(team_stats)
                    all_player_stats.extend(player_stats)
                    completed_count += 1

                    # Insert team stats in batches
                    if len(all_team_stats) >= batch_size:
                        thread_safe_db.execute_batch(
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
                            all_team_stats
                        )
                        all_team_stats = []

                    # Insert player stats in batches
                    if len(all_player_stats) >= batch_size:
                        thread_safe_db.execute_batch(
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
                            all_player_stats
                        )
                        all_player_stats = []
                else:
                    error_count += 1

    # Insert remaining stats
    if all_team_stats:
        thread_safe_db.execute_batch(
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
            all_team_stats
        )

    if all_player_stats:
        thread_safe_db.execute_batch(
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
            all_player_stats
        )

    print(f"\n✓ Successfully processed: {completed_count}")
    print(f"✓ Errors/skipped: {error_count}")


def main(event_ids_file: str = None, event_ids: List[str] = None, workers: int = 20):
    """Main function to populate statistics.

    Args:
        event_ids_file: File containing event IDs (one per line)
        event_ids: List of event IDs from command line
        workers: Number of parallel workers
    """
    ids = []

    if event_ids_file:
        # Read from file
        with open(event_ids_file, 'r') as f:
            ids = [line.strip() for line in f if line.strip()]
    elif event_ids:
        # Use provided list
        ids = event_ids
    else:
        print("Error: Must provide either event IDs file or event IDs")
        return

    # Convert to integers
    event_ids_int = []
    for event_id in ids:
        try:
            event_ids_int.append(int(event_id))
        except:
            print(f"Warning: Skipping invalid event ID: {event_id}")

    if not event_ids_int:
        print("Error: No valid event IDs provided")
        return

    try:
        populate_from_event_ids(event_ids_int, max_workers=workers)
        print("\n✓ Statistics population completed successfully!")

    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == '__main__':
    import sys

    if len(sys.argv) < 2:
        print("Usage: python populate_from_summary.py <event_ids_file> [workers]")
        print("   OR: python populate_from_summary.py <event_id1> <event_id2> ... [--workers N]")
        print()
        print("Examples:")
        print("  python populate_from_summary.py events.txt")
        print("  python populate_from_summary.py events.txt 30")
        print("  python populate_from_summary.py 401719083 401719084 401719085")
        print("  python populate_from_summary.py 401719083 401719084 --workers 30")
        sys.exit(1)

    # Check if first arg is a file or event ID
    first_arg = sys.argv[1]

    # Parse workers flag
    workers = 20
    args = sys.argv[1:]
    if '--workers' in args:
        workers_idx = args.index('--workers')
        workers = int(args[workers_idx + 1])
        args = args[:workers_idx] + args[workers_idx + 2:]

    # Check if last arg is numeric workers count (for backwards compat)
    if len(args) >= 2:
        try:
            last_workers = int(args[-1])
            if last_workers > 0 and last_workers < 100:
                workers = last_workers
                args = args[:-1]
        except:
            pass

    # Determine if file or list of IDs
    import os
    if os.path.isfile(args[0]):
        main(event_ids_file=args[0], workers=workers)
    else:
        main(event_ids=args, workers=workers)
