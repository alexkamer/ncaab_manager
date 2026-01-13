"""
Complete population script: Fetch events and populate all statistics in one go.
"""
from typing import Dict, List, Optional
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

from database import Database
from api_client import ESPNAPIClient


def parse_team_statistics(event_id: int, team_id: int, home_away: str,
                          statistics: List[Dict]) -> Optional[tuple]:
    """Parse team statistics from boxscore."""
    stats_dict = {}
    for stat in statistics:
        name = stat.get('name', '')
        value = stat.get('displayValue', '')
        stats_dict[name] = value

    def get_stat(name, default=None):
        return stats_dict.get(name, default)

    def parse_made_attempted(stat_str):
        if not stat_str or stat_str == '--':
            return None, None
        try:
            parts = stat_str.split('-')
            return int(parts[0]), int(parts[1])
        except:
            return None, None

    def parse_int(stat_str, default=None):
        if not stat_str or stat_str == '--':
            return default
        try:
            return int(stat_str)
        except:
            return default

    def parse_float(stat_str, default=None):
        if not stat_str or stat_str == '--':
            return default
        try:
            return float(stat_str.replace('%', ''))
        except:
            return default

    fg_made, fg_att = parse_made_attempted(get_stat('fieldGoalsMade-fieldGoalsAttempted'))
    fg_pct = parse_float(get_stat('fieldGoalPct'))
    three_made, three_att = parse_made_attempted(get_stat('threePointFieldGoalsMade-threePointFieldGoalsAttempted'))
    three_pct = parse_float(get_stat('threePointFieldGoalPct'))
    ft_made, ft_att = parse_made_attempted(get_stat('freeThrowsMade-freeThrowsAttempted'))
    ft_pct = parse_float(get_stat('freeThrowPct'))
    total_reb = parse_int(get_stat('totalRebounds'))
    off_reb = parse_int(get_stat('offensiveRebounds'))
    def_reb = parse_int(get_stat('defensiveRebounds'))
    assists = parse_int(get_stat('assists'))
    steals = parse_int(get_stat('steals'))
    blocks = parse_int(get_stat('blocks'))
    turnovers = parse_int(get_stat('turnovers'))
    team_turnovers = parse_int(get_stat('teamTurnovers'))
    total_turnovers = parse_int(get_stat('totalTurnovers'))
    fouls = parse_int(get_stat('fouls'))
    tech_fouls = parse_int(get_stat('technicalFouls'))
    flagrant_fouls = parse_int(get_stat('flagrantFouls'))
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
        largest_lead, None, None
    )


def parse_player_statistics(event_id: int, team_id: int, player_data: Dict) -> Optional[tuple]:
    """Parse player statistics from boxscore."""
    athlete = player_data.get('athlete', {})
    athlete_id = athlete.get('id')
    if not athlete_id:
        return None

    athlete_id = int(athlete_id)
    athlete_name = athlete.get('displayName', '')
    athlete_short_name = athlete.get('shortName', '')
    is_active = player_data.get('active', True)
    is_starter = player_data.get('starter', False)

    stats = player_data.get('stats', [])
    if not stats or len(stats) < 10:
        return None

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
            import sqlite3
            # Create connection with better concurrency settings
            self._local.conn = sqlite3.connect(
                self.db_path or 'ncaab.db',
                timeout=30.0,  # Wait up to 30 seconds for locks
                check_same_thread=False
            )
            self._local.conn.execute('PRAGMA journal_mode=WAL')  # Write-Ahead Logging for better concurrency
            self._local.conn.execute('PRAGMA synchronous=NORMAL')  # Faster writes
            self._local.db = self._local.conn
        return self._local.db

    def execute_batch(self, query: str, data: List[tuple]):
        """Execute batch insert with lock."""
        if not data:
            return
        with self._write_lock:
            try:
                db = self.get_connection()
                cursor = db.cursor()
                cursor.executemany(query, data)
                db.commit()
            except Exception as e:
                print(f"\n⚠ Database error during batch insert: {e}")
                print(f"   Query: {query[:100]}...")
                print(f"   Data rows: {len(data)}")
                # Try to recover
                try:
                    db.rollback()
                except:
                    pass
                raise


def parse_game_odds(event_id: int, odds_data: Dict) -> List[tuple]:
    """Parse odds data from API.

    Returns:
        List of tuples for database insertion (one per provider)
    """
    odds_records = []

    def safe_value(val):
        """Convert value to safe type for database (handle dicts/lists)."""
        if isinstance(val, (dict, list)):
            return None
        return val

    items = odds_data.get('items', [])
    for item in items:
        try:
            provider = item.get('provider', {})
            provider_id = safe_value(provider.get('id'))
            provider_name = safe_value(provider.get('name', ''))
            provider_priority = safe_value(provider.get('priority', 0))

            # Over/Under
            over_under = safe_value(item.get('overUnder'))
            over_obj = item.get('over', {})
            under_obj = item.get('under', {})
            over_odds = safe_value(over_obj.get('american') if isinstance(over_obj, dict) else None)
            under_odds = safe_value(under_obj.get('american') if isinstance(under_obj, dict) else None)

            # Opening/Closing totals
            open_obj = item.get('open', {})
            current_obj = item.get('current', {})
            open_total = safe_value(open_obj.get('total') if isinstance(open_obj, dict) else None)
            close_total = safe_value(current_obj.get('total') if isinstance(current_obj, dict) else None)

            # Spread
            spread = safe_value(item.get('spread'))

            # Details
            details = safe_value(item.get('details', ''))

            # Parse home/away odds
            home_odds = item.get('homeTeamOdds', {})
            away_odds = item.get('awayTeamOdds', {})

            home_moneyline = safe_value(home_odds.get('moneyLine') if isinstance(home_odds, dict) else None)
            away_moneyline = safe_value(away_odds.get('moneyLine') if isinstance(away_odds, dict) else None)
            home_spread_odds = safe_value(home_odds.get('spreadOdds') if isinstance(home_odds, dict) else None)
            away_spread_odds = safe_value(away_odds.get('spreadOdds') if isinstance(away_odds, dict) else None)

            # Determine favorite
            home_is_favorite = None
            away_is_favorite = None
            if isinstance(home_odds, dict) and home_odds.get('favorite'):
                home_is_favorite = True
                away_is_favorite = False
            elif isinstance(away_odds, dict) and away_odds.get('favorite'):
                home_is_favorite = False
                away_is_favorite = True

            api_ref = safe_value(item.get('$ref', ''))

            odds_records.append((
                event_id, provider_id, provider_name, provider_priority,
                over_under, over_odds, under_odds,
                open_total, None, None,  # open over/under odds not in API
                close_total, None, None,  # close over/under odds not in API
                spread,
                away_is_favorite, away_moneyline, away_spread_odds,
                None, None, None, None,  # away open/close spread/moneyline
                home_is_favorite, home_moneyline, home_spread_odds,
                None, None, None, None,  # home open/close spread/moneyline
                None, None, None,  # results (populated after game)
                details, api_ref
            ))
        except Exception as e:
            continue

    return odds_records


def parse_game_predictions(event_id: int, predictor_data: Dict) -> Optional[tuple]:
    """Parse BPI prediction data from API.

    Returns:
        Tuple for database insertion
    """
    try:
        # Last modified
        last_modified = predictor_data.get('lastModified')

        # Matchup quality
        matchup_quality = predictor_data.get('gameProjection')

        # Home team predictions
        home_team = predictor_data.get('homeTeam', {})
        home_win_prob = home_team.get('gameProjection')

        # Away team predictions
        away_team = predictor_data.get('awayTeam', {})
        away_win_prob = away_team.get('gameProjection')

        api_ref = predictor_data.get('$ref', '')

        return (
            event_id, last_modified, matchup_quality,
            home_win_prob, None,  # home predicted margin not in API
            away_win_prob, None,  # away predicted margin not in API
            None, None,  # game scores (populated after game)
            None, None, None,  # prediction accuracy (calculated after game)
            api_ref
        )
    except:
        return None


def process_event(event_id: int, client: ESPNAPIClient, verbose: bool = False) -> tuple:
    """Fetch and parse summary for a single event.

    Returns:
        Tuple of (team_stats_list, player_stats_list, odds_list, prediction, error_msg)
    """
    try:
        summary = client.get_game_summary(event_id)
        team_stats = []
        player_stats = []
        odds_list = []
        prediction = None

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

        # Try to get odds
        try:
            odds_data = client.get_game_odds(event_id)
            odds_list = parse_game_odds(event_id, odds_data)
        except:
            pass

        # Try to get predictions
        try:
            predictor_data = client.get_game_predictor(event_id)
            prediction = parse_game_predictions(event_id, predictor_data)
        except:
            pass

        return (team_stats, player_stats, odds_list, prediction, None)

    except Exception as e:
        error_msg = f"Event {event_id}: {str(e)}"
        if verbose:
            import traceback
            error_msg += f"\n{traceback.format_exc()}"
        return ([], [], [], None, error_msg)


def populate_all(dates: str, max_workers: int = 20, batch_size: int = 50, db_path: str = None):
    """Fetch events and populate all statistics.

    Args:
        dates: Date string (YYYYMMDD, YYYYMM, or YYYY)
        max_workers: Number of parallel threads
        batch_size: Batch size for database inserts
        db_path: Database path (optional)
    """
    print(f"\n=== Populating All Data for {dates} ===")
    print(f"Workers: {max_workers}, Batch size: {batch_size}")

    # Initialize
    client = ESPNAPIClient()
    thread_safe_db = ThreadSafeDatabase(db_path)

    # Step 1: Fetch event IDs
    print("\n[1/2] Fetching event list...")
    event_refs = client.get_events(dates, limit=1000, groups=50)
    print(f"Found {len(event_refs)} events")

    if not event_refs:
        print("No events found for this date range")
        return

    # Extract event IDs
    event_ids = []
    for ref_obj in event_refs:
        ref_url = ref_obj.get('$ref', '')
        if ref_url:
            event_id = ref_url.split('/')[-1].split('?')[0]
            try:
                event_ids.append(int(event_id))
            except:
                pass

    print(f"Extracted {len(event_ids)} event IDs")

    # Step 2: Process events in parallel
    all_team_stats = []
    all_player_stats = []
    all_odds = []
    all_predictions = []
    completed_count = 0
    error_count = 0
    odds_count = 0
    predictions_count = 0

    print("\n[2/2] Processing events and populating statistics...")
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
        errors = []
        with tqdm(total=len(event_ids), desc="Processing games") as pbar:
            for future in as_completed(future_to_event):
                pbar.update(1)
                team_stats, player_stats, odds_list, prediction, error_msg = future.result()

                if error_msg:
                    errors.append(error_msg)
                    error_count += 1
                elif team_stats or player_stats:
                    all_team_stats.extend(team_stats)
                    all_player_stats.extend(player_stats)
                    completed_count += 1

                    # Collect odds
                    if odds_list:
                        all_odds.extend(odds_list)
                        odds_count += 1

                    # Collect predictions
                    if prediction:
                        all_predictions.append(prediction)
                        predictions_count += 1

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

                    # Insert odds in batches
                    if len(all_odds) >= batch_size:
                        thread_safe_db.execute_batch(
                            """
                            INSERT OR REPLACE INTO game_odds
                            (event_id, provider_id, provider_name, provider_priority,
                             over_under, over_odds, under_odds,
                             open_total, open_over_odds, open_under_odds,
                             close_total, close_over_odds, close_under_odds,
                             spread,
                             away_is_favorite, away_moneyline, away_spread_odds,
                             away_open_spread, away_open_moneyline, away_close_spread, away_close_moneyline,
                             home_is_favorite, home_moneyline, home_spread_odds,
                             home_open_spread, home_open_moneyline, home_close_spread, home_close_moneyline,
                             moneyline_winner, spread_winner, over_under_result,
                             details, api_ref)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            all_odds
                        )
                        all_odds = []

                    # Insert predictions in batches
                    if len(all_predictions) >= batch_size:
                        thread_safe_db.execute_batch(
                            """
                            INSERT OR REPLACE INTO game_predictions
                            (event_id, last_modified, matchup_quality,
                             home_win_probability, home_predicted_margin,
                             away_win_probability, away_predicted_margin,
                             home_game_score, away_game_score,
                             home_prediction_correct, away_prediction_correct, margin_error,
                             api_ref)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            all_predictions
                        )
                        all_predictions = []
                else:
                    error_count += 1

    # Show errors if any
    if errors:
        print(f"\n⚠ Encountered {len(errors)} errors:")
        for i, error in enumerate(errors[:10], 1):  # Show first 10 errors
            print(f"  {i}. {error}")
        if len(errors) > 10:
            print(f"  ... and {len(errors) - 10} more errors")

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

    if all_odds:
        thread_safe_db.execute_batch(
            """
            INSERT OR REPLACE INTO game_odds
            (event_id, provider_id, provider_name, provider_priority,
             over_under, over_odds, under_odds,
             open_total, open_over_odds, open_under_odds,
             close_total, close_over_odds, close_under_odds,
             spread,
             away_is_favorite, away_moneyline, away_spread_odds,
             away_open_spread, away_open_moneyline, away_close_spread, away_close_moneyline,
             home_is_favorite, home_moneyline, home_spread_odds,
             home_open_spread, home_open_moneyline, home_close_spread, home_close_moneyline,
             moneyline_winner, spread_winner, over_under_result,
             details, api_ref)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            all_odds
        )

    if all_predictions:
        thread_safe_db.execute_batch(
            """
            INSERT OR REPLACE INTO game_predictions
            (event_id, last_modified, matchup_quality,
             home_win_probability, home_predicted_margin,
             away_win_probability, away_predicted_margin,
             home_game_score, away_game_score,
             home_prediction_correct, away_prediction_correct, margin_error,
             api_ref)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            all_predictions
        )

    print(f"\n✓ Events found: {len(event_ids)}")
    print(f"✓ Games processed successfully: {completed_count}")
    print(f"✓ Games with odds: {odds_count}")
    print(f"✓ Games with predictions: {predictions_count}")
    print(f"✓ Errors/skipped: {error_count}")


def main(dates: str, workers: int = 20):
    """Main function to populate all data.

    Args:
        dates: Date string - YYYYMMDD (day), YYYYMM (month), or YYYY (year)
        workers: Number of parallel workers
    """
    try:
        populate_all(dates, max_workers=workers)
        print("\n✓ Population completed successfully!")

    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == '__main__':
    import sys

    if len(sys.argv) < 2:
        print("Usage: python populate_all.py <dates> [workers]")
        print("  dates: YYYYMMDD (day), YYYYMM (month), or YYYY (year)")
        print("  workers: Number of parallel threads (default: 20)")
        print()
        print("Examples:")
        print("  python populate_all.py 2026           # Entire 2026 season")
        print("  python populate_all.py 202601         # January 2026")
        print("  python populate_all.py 20260111       # Single day")
        print("  python populate_all.py 202601 30      # With 30 workers")
        sys.exit(1)

    dates = sys.argv[1]
    workers = int(sys.argv[2]) if len(sys.argv) > 2 else 20

    main(dates=dates, workers=workers)
