#!/usr/bin/env python3
"""
Update upcoming games for the next 7 days.
This script fetches scheduled games and updates their status (live/final).
Run this frequently (every 5-15 minutes) to keep live scores and upcoming games current.
"""
from datetime import datetime, timedelta
from typing import List
from tqdm import tqdm

from database import Database
from api_client import ESPNAPIClient
from populate_events import parse_event_data


def update_upcoming_games(days_ahead: int = 7, workers: int = 10):
    """
    Update games for the next N days.

    This includes:
    - Upcoming scheduled games (not yet started)
    - Live games (in progress)
    - Recently completed games (scores may be updating)

    Args:
        days_ahead: How many days ahead to fetch (default: 7)
        workers: Number of parallel workers (default: 10)
    """
    print("=" * 60)
    print("UPDATING UPCOMING GAMES")
    print("=" * 60)

    db = Database()
    client = ESPNAPIClient()

    try:
        db.connect()

        # Calculate date range: today through N days ahead
        start_date = datetime.now().strftime('%Y%m%d')
        end_date = (datetime.now() + timedelta(days=days_ahead)).strftime('%Y%m%d')

        print(f"\nFetching games from {start_date} to {end_date}")
        print(f"This includes: upcoming, live, and recent games\n")

        # Fetch events from ESPN API
        events_data = client.get_events(dates=f"{start_date}-{end_date}")

        if not events_data:
            print("No events found in date range")
            return

        print(f"Found {len(events_data)} events")

        # Parse all events (completed and upcoming)
        events = []
        for event_ref in tqdm(events_data, desc="Parsing events"):
            try:
                event_data = client.get_from_ref(event_ref['$ref'])
                parsed = parse_event_data(event_data, client=client)

                if parsed:
                    events.append(parsed)
            except Exception as e:
                print(f"\nError parsing event: {e}")
                continue

        print(f"\n✓ Parsed {len(events)} events")

        # Separate into categories for reporting
        upcoming = [e for e in events if not e[11]]  # is_completed = False
        completed = [e for e in events if e[11]]  # is_completed = True

        print(f"  - {len(upcoming)} upcoming/live games")
        print(f"  - {len(completed)} completed games")

        # Upsert all events
        if events:
            query = """
                INSERT OR REPLACE INTO events (
                    event_id, season_id, season_type_id, week, home_team_id, away_team_id,
                    date, venue_id, venue_name, status, status_detail, is_completed,
                    home_score, away_score, winner_team_id,
                    is_conference_game, is_neutral_site, attendance, broadcast_network, api_ref,
                    home_line_scores, away_line_scores
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """

            db.executemany(query, events)
            db.commit()
            print(f"\n✓ Updated {len(events)} events in database")

        print("\n" + "=" * 60)
        print("✓ UPCOMING GAMES UPDATE COMPLETED")
        print("=" * 60)

    except Exception as e:
        print(f"\n✗ Error during update: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(
        description='Update upcoming and live games'
    )
    parser.add_argument(
        '--days',
        type=int,
        default=7,
        help='Days ahead to fetch (default: 7)'
    )
    parser.add_argument(
        '--workers',
        type=int,
        default=10,
        help='Number of parallel workers (default: 10)'
    )

    args = parser.parse_args()

    update_upcoming_games(
        days_ahead=args.days,
        workers=args.workers
    )


if __name__ == '__main__':
    main()
