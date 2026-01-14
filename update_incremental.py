"""
Incremental update script for NCAA Basketball data.
Efficiently updates only new/changed data since the last update.

Strategy:
1. Find the most recent game date in the database
2. Start fetching from 2 days before that date (safety buffer)
3. Fetch through today
4. Only process COMPLETED games
5. Populate events, scores, statistics, odds, and predictions

This minimizes API calls by only fetching recent data.
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

from database import Database
from api_client import ESPNAPIClient
from populate_events import parse_event_data
from populate_all import (
    parse_team_statistics,
    parse_player_statistics,
    parse_game_odds,
    parse_game_predictions
)


class ThreadSafeDatabase:
    """Thread-safe database wrapper for concurrent writes."""
    def __init__(self, db_path: str = None):
        self.db_path = db_path
        self.lock = threading.Lock()
        self.local = threading.local()

    def get_connection(self):
        """Get thread-local database connection."""
        if not hasattr(self.local, 'db'):
            self.local.db = Database(self.db_path)
            self.local.db.connect()
            # Enable WAL mode for better concurrent access
            self.local.db.execute("PRAGMA journal_mode=WAL")
            self.local.db.execute("PRAGMA synchronous=NORMAL")
        return self.local.db

    def execute(self, query: str, params: tuple = ()):
        """Execute a query with thread safety."""
        db = self.get_connection()
        with self.lock:
            return db.execute(query, params)

    def executemany(self, query: str, params_list: List[tuple]):
        """Execute many with thread safety."""
        db = self.get_connection()
        with self.lock:
            db.executemany(query, params_list)
            db.commit()

    def commit(self):
        """Commit current transaction."""
        db = self.get_connection()
        with self.lock:
            db.commit()

    def close_all(self):
        """Close all thread-local connections."""
        if hasattr(self.local, 'db'):
            self.local.db.close()


def get_date_range_for_update(db: Database, buffer_days: int = 2) -> tuple:
    """
    Determine the optimal date range for incremental updates.

    Args:
        db: Database connection
        buffer_days: Days before most recent game to start (safety buffer)

    Returns:
        Tuple of (start_date_str, end_date_str) in YYYYMMDD format
    """
    # Get the most recent game date in the database
    cursor = db.execute("""
        SELECT MAX(date) as most_recent
        FROM events
        WHERE date IS NOT NULL
    """)
    result = cursor.fetchone()

    if result and result[0]:
        # Parse the ISO date string
        most_recent = datetime.fromisoformat(result[0].replace('Z', '+00:00'))
        # Start from buffer_days before the most recent game
        start_date = most_recent - timedelta(days=buffer_days)
    else:
        # No games in database, start from 30 days ago
        start_date = datetime.now() - timedelta(days=30)

    # End date is today
    end_date = datetime.now()

    # Format as YYYYMMDD for ESPN API
    start_date_str = start_date.strftime('%Y%m%d')
    end_date_str = end_date.strftime('%Y%m%d')

    return start_date_str, end_date_str


def fetch_and_parse_events(client: ESPNAPIClient, start_date: str, end_date: str) -> List[tuple]:
    """
    Fetch events for a date range.

    Args:
        client: ESPN API client
        start_date: Start date in YYYYMMDD format
        end_date: End date in YYYYMMDD format

    Returns:
        List of parsed event tuples
    """
    print(f"\nFetching events from {start_date} to {end_date}...")

    events_data = client.get_events(dates=f"{start_date}-{end_date}")

    if not events_data or 'items' not in events_data:
        print("No events found in date range")
        return []

    events = []
    for event_ref in tqdm(events_data['items'], desc="Parsing events"):
        try:
            event_data = client.get_from_ref(event_ref['$ref'])
            parsed = parse_event_data(event_data, client=client)

            if parsed:
                # Only include COMPLETED games
                is_completed = parsed[20]  # is_completed field
                if is_completed:
                    events.append(parsed)
        except Exception as e:
            print(f"\nError parsing event: {e}")
            continue

    return events


def upsert_events(db: ThreadSafeDatabase, events: List[tuple]):
    """
    Insert or update events in the database.
    Uses INSERT OR REPLACE to handle both new and updated games.
    """
    if not events:
        return

    query = """
        INSERT OR REPLACE INTO events (
            event_id, uid, date, name, short_name, season_id, season_type_id,
            home_team_id, away_team_id, venue_id, attendance, capacity,
            home_score, away_score, winner_team_id, broadcast_market, broadcast_names,
            neutral_site, conference_competition, recent_form, box_score_available,
            is_completed, api_ref, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    """

    db.executemany(query, events)
    print(f"✓ Upserted {len(events)} events")


def process_game_summary(event_id: int, client: ESPNAPIClient, db: ThreadSafeDatabase) -> Dict:
    """
    Fetch and process game summary for a single event.
    Returns all parsed statistics.
    """
    try:
        summary = client.get_game_summary(event_id)
        if not summary:
            return {}

        result = {
            'event_id': event_id,
            'team_stats': [],
            'player_stats': [],
            'odds': [],
            'prediction': None
        }

        # Parse boxscore statistics
        boxscore = summary.get('boxscore', {})
        if boxscore:
            teams = boxscore.get('teams', [])
            for team_data in teams:
                team_id = int(team_data.get('team', {}).get('id', 0))
                home_away = team_data.get('homeAway', 'home')
                statistics = team_data.get('statistics', [])

                # Team statistics
                team_stat = parse_team_statistics(event_id, team_id, home_away, statistics)
                if team_stat:
                    result['team_stats'].append(team_stat)

                # Player statistics
                for player_data in team_data.get('statistics', [{}])[0].get('athletes', []):
                    player_stat = parse_player_statistics(event_id, team_id, player_data)
                    if player_stat:
                        result['player_stats'].append(player_stat)

        # Parse odds
        odds_ref = summary.get('odds', {}).get('$ref')
        if odds_ref:
            try:
                odds_data = client.get_from_ref(odds_ref)
                odds_records = parse_game_odds(event_id, odds_data)
                result['odds'] = odds_records
            except:
                pass

        # Parse predictions
        predictor_ref = summary.get('predictor', {}).get('$ref')
        if predictor_ref:
            try:
                predictor_data = client.get_from_ref(predictor_ref)
                prediction = parse_game_predictions(event_id, predictor_data)
                result['prediction'] = prediction
            except:
                pass

        return result

    except Exception as e:
        print(f"\nError processing game {event_id}: {e}")
        return {}


def insert_statistics(db: ThreadSafeDatabase, stats_data: List[Dict]):
    """Insert all statistics from processed games."""
    if not stats_data:
        return

    # Collect all records by type
    all_team_stats = []
    all_player_stats = []
    all_odds = []
    all_predictions = []

    for game_data in stats_data:
        all_team_stats.extend(game_data.get('team_stats', []))
        all_player_stats.extend(game_data.get('player_stats', []))
        all_odds.extend(game_data.get('odds', []))
        if game_data.get('prediction'):
            all_predictions.append(game_data['prediction'])

    # Insert team statistics
    if all_team_stats:
        team_query = """
            INSERT OR REPLACE INTO team_statistics (
                event_id, team_id, home_away,
                field_goals_made, field_goals_attempted, field_goal_pct,
                three_point_made, three_point_attempted, three_point_pct,
                free_throws_made, free_throws_attempted, free_throw_pct,
                total_rebounds, offensive_rebounds, defensive_rebounds,
                assists, steals, blocks,
                turnovers, team_turnovers, total_turnovers,
                fouls, technical_fouls, flagrant_fouls,
                turnover_points, fast_break_points, points_in_paint,
                largest_lead, api_ref, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        """
        db.executemany(team_query, all_team_stats)
        print(f"✓ Inserted {len(all_team_stats)} team statistics")

    # Insert player statistics
    if all_player_stats:
        player_query = """
            INSERT OR REPLACE INTO player_statistics (
                event_id, team_id, athlete_id, athlete_name, athlete_short_name,
                is_active, is_starter, minutes_played,
                field_goals_made, field_goals_attempted,
                three_point_made, three_point_attempted,
                free_throws_made, free_throws_attempted,
                rebounds, offensive_rebounds, defensive_rebounds,
                assists, steals, blocks, turnovers, fouls,
                api_ref, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        """
        db.executemany(player_query, all_player_stats)
        print(f"✓ Inserted {len(all_player_stats)} player statistics")

    # Insert odds
    if all_odds:
        odds_query = """
            INSERT OR REPLACE INTO game_odds (
                event_id, provider_id, provider_name, provider_priority,
                over_under, over_odds, under_odds,
                open_total, open_over_odds, open_under_odds,
                close_total, close_over_odds, close_under_odds,
                spread,
                away_team_is_favorite, away_team_moneyline, away_team_spread_odds,
                away_team_open_moneyline, away_team_open_spread_odds,
                away_team_close_moneyline, away_team_close_spread_odds,
                home_team_is_favorite, home_team_moneyline, home_team_spread_odds,
                home_team_open_moneyline, home_team_open_spread_odds,
                home_team_close_moneyline, home_team_close_spread_odds,
                over_result, under_result, spread_result,
                details, api_ref
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        db.executemany(odds_query, all_odds)
        print(f"✓ Inserted {len(all_odds)} odds records")

    # Insert predictions
    if all_predictions:
        pred_query = """
            INSERT OR REPLACE INTO game_predictions (
                event_id, last_modified, matchup_quality,
                home_team_win_probability, away_team_win_probability, api_ref
            ) VALUES (?, ?, ?, ?, ?, ?)
        """
        db.executemany(pred_query, all_predictions)
        print(f"✓ Inserted {len(all_predictions)} predictions")


def update_incremental(buffer_days: int = 2, workers: int = 20, batch_size: int = 50):
    """
    Main incremental update function.

    Args:
        buffer_days: Days before most recent game to start fetching
        workers: Number of parallel workers for fetching game summaries
        batch_size: Number of records to batch before inserting
    """
    print("=" * 60)
    print("NCAA BASKETBALL INCREMENTAL UPDATE")
    print("=" * 60)

    db = Database()
    db.connect()
    thread_safe_db = ThreadSafeDatabase()
    client = ESPNAPIClient()

    try:
        # Step 1: Determine date range
        start_date, end_date = get_date_range_for_update(db, buffer_days)
        print(f"\n📅 Update Date Range: {start_date} to {end_date}")
        print(f"   (Starting {buffer_days} days before most recent game)")

        # Step 2: Fetch and parse events
        events = fetch_and_parse_events(client, start_date, end_date)
        print(f"\n✓ Found {len(events)} completed games to update")

        if not events:
            print("\n✓ No new completed games found. Database is up to date!")
            return

        # Step 3: Upsert events into database
        print("\n📝 Upserting events...")
        upsert_events(thread_safe_db, events)

        # Step 4: Process game summaries in parallel
        print(f"\n📊 Processing game summaries with {workers} workers...")
        event_ids = [event[0] for event in events]  # event_id is first field

        stats_data = []
        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = {
                executor.submit(process_game_summary, event_id, client, thread_safe_db): event_id
                for event_id in event_ids
            }

            for future in tqdm(as_completed(futures), total=len(futures), desc="Fetching summaries"):
                try:
                    result = future.result()
                    if result:
                        stats_data.append(result)

                        # Batch insert
                        if len(stats_data) >= batch_size:
                            insert_statistics(thread_safe_db, stats_data)
                            stats_data = []

                except Exception as e:
                    event_id = futures[future]
                    print(f"\nError with event {event_id}: {e}")

        # Insert remaining records
        if stats_data:
            insert_statistics(thread_safe_db, stats_data)

        print("\n" + "=" * 60)
        print("✓ INCREMENTAL UPDATE COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print(f"  • Updated {len(events)} games")
        print(f"  • Date range: {start_date} to {end_date}")
        print("=" * 60)

    except Exception as e:
        print(f"\n✗ Error during update: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()
        thread_safe_db.close_all()


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(
        description='Incrementally update NCAA Basketball data'
    )
    parser.add_argument(
        '--buffer-days',
        type=int,
        default=2,
        help='Days before most recent game to start fetching (default: 2)'
    )
    parser.add_argument(
        '--workers',
        type=int,
        default=20,
        help='Number of parallel workers (default: 20)'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=50,
        help='Batch size for insertions (default: 50)'
    )

    args = parser.parse_args()

    update_incremental(
        buffer_days=args.buffer_days,
        workers=args.workers,
        batch_size=args.batch_size
    )


if __name__ == '__main__':
    main()
