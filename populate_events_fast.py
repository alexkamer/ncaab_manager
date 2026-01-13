"""
Fast multithreaded version of populate_events.py
"""
from typing import Dict, Optional, List
from datetime import datetime
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

from database import Database
from api_client import ESPNAPIClient
from populate_events import parse_event_data


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


def fetch_event_data(ref_obj: Dict, client: ESPNAPIClient) -> Optional[tuple]:
    """Fetch and parse a single event (for threading).

    Args:
        ref_obj: Event reference object with $ref URL
        client: API client

    Returns:
        Parsed event data tuple or None
    """
    try:
        event_data = client.get_from_ref(ref_obj['$ref'])
        return parse_event_data(event_data, client=client)
    except Exception as e:
        # Silently skip errors in threads
        return None


def populate_events_parallel(dates: str, max_workers: int = 10,
                            batch_size: int = 50, db_path: str = None):
    """Populate events using parallel processing.

    Args:
        dates: Date string (YYYYMMDD, YYYYMM, or YYYY)
        max_workers: Number of parallel threads
        batch_size: Batch size for database inserts
        db_path: Database path (optional)
    """
    print(f"\n=== Populating Events (Parallel) for {dates} ===")
    print(f"Workers: {max_workers}, Batch size: {batch_size}")

    # Create clients (one per thread will be created)
    client = ESPNAPIClient()
    thread_safe_db = ThreadSafeDatabase(db_path)

    # Fetch event references
    print("\nFetching event list...")
    event_refs = client.get_events(dates, limit=1000, groups=50)
    print(f"Found {len(event_refs)} events")

    # Process events in parallel
    events_data = []
    completed_count = 0
    skipped_count = 0

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
        future_to_ref = {
            executor.submit(fetch_event_data, ref, get_thread_client()): ref
            for ref in event_refs
        }

        # Process results with progress bar
        with tqdm(total=len(event_refs), desc="Processing events") as pbar:
            for future in as_completed(future_to_ref):
                pbar.update(1)
                result = future.result()

                if result:
                    events_data.append(result)
                    completed_count += 1

                    # Insert in batches
                    if len(events_data) >= batch_size:
                        thread_safe_db.execute_batch(
                            """
                            INSERT OR REPLACE INTO events
                            (event_id, season_id, season_type_id, home_team_id, away_team_id,
                             date, venue_id, venue_name, status, status_detail, is_completed,
                             home_score, away_score, winner_team_id,
                             is_conference_game, is_neutral_site, attendance, broadcast_network, api_ref)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            events_data
                        )
                        events_data = []
                else:
                    skipped_count += 1

    # Insert remaining events
    if events_data:
        thread_safe_db.execute_batch(
            """
            INSERT OR REPLACE INTO events
            (event_id, season_id, season_type_id, home_team_id, away_team_id,
             date, venue_id, venue_name, status, status_detail, is_completed,
             home_score, away_score, winner_team_id,
             is_conference_game, is_neutral_site, attendance, broadcast_network, api_ref)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            events_data
        )

    print(f"\n✓ Completed games inserted: {completed_count}")
    print(f"✓ Skipped (not completed or errors): {skipped_count}")
    print(f"✓ Total processed: {len(event_refs)}")


def main(date: str, workers: int = 10):
    """Main function to populate events in parallel.

    Args:
        date: Date string - YYYYMMDD (day), YYYYMM (month), or YYYY (year)
        workers: Number of parallel workers
    """
    try:
        populate_events_parallel(date, max_workers=workers)
        print("\n✓ Events population completed successfully!")

    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == '__main__':
    import sys

    if len(sys.argv) < 2:
        print("Usage: python populate_events_fast.py <date> [workers]")
        print("  date: YYYYMMDD (day), YYYYMM (month), or YYYY (year)")
        print("  workers: Number of parallel threads (default: 10)")
        print()
        print("Examples:")
        print("  python populate_events_fast.py 20260111        # Single day")
        print("  python populate_events_fast.py 202601          # January 2026")
        print("  python populate_events_fast.py 202601 20       # January with 20 workers")
        sys.exit(1)

    date = sys.argv[1]
    workers = int(sys.argv[2]) if len(sys.argv) > 2 else 10

    main(date=date, workers=workers)
