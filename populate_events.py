"""
Populate events (games) table.
"""
from typing import Dict, Optional
from datetime import datetime
from tqdm import tqdm

from database import Database
from api_client import ESPNAPIClient


def parse_event_data(event_data: Dict, client=None) -> Optional[tuple]:
    """Parse event/game data from API.

    Args:
        event_data: Event data from API
        client: API client for dereferencing (optional)

    Returns:
        Tuple for database insertion or None if data incomplete
    """
    try:
        event_id = int(event_data.get('id', 0))

        # Season info - dereference if it's a $ref
        season = event_data.get('season', {})
        if '$ref' in season and client:
            try:
                season = client.get_from_ref(season['$ref'])
            except:
                return None  # Skip if we can't get season
        season_id = int(season.get('year', 0))

        # Season type
        season_type = season.get('type', {})
        season_type_id = int(season_type.get('type', 2))

        # Week - extract from $ref URL if present
        week = None
        week_obj = event_data.get('week', {})
        if '$ref' in week_obj:
            # Extract week number from URL like .../weeks/10?lang=...
            try:
                week_url = week_obj['$ref']
                week = int(week_url.split('/weeks/')[-1].split('?')[0])
            except:
                pass

        # Competitions array contains team and score info
        competitions = event_data.get('competitions', [])
        if not competitions:
            return None

        competition = competitions[0]
        competitors = competition.get('competitors', [])

        if len(competitors) < 2:
            return None

        # Parse home/away teams
        home_team = next((c for c in competitors if c.get('homeAway') == 'home'), None)
        away_team = next((c for c in competitors if c.get('homeAway') == 'away'), None)

        if not home_team or not away_team:
            return None

        # Extract team IDs - team is a $ref, extract ID from URL
        home_team_obj = home_team.get('team', {})
        away_team_obj = away_team.get('team', {})

        # Try to get ID directly, otherwise extract from $ref URL
        if 'id' in home_team_obj:
            home_team_id = int(home_team_obj['id'])
        elif '$ref' in home_team_obj:
            # Extract from URL like .../teams/150?lang=...
            try:
                home_team_id = int(home_team_obj['$ref'].split('/teams/')[-1].split('?')[0])
            except:
                home_team_id = 0
        else:
            home_team_id = 0

        if 'id' in away_team_obj:
            away_team_id = int(away_team_obj['id'])
        elif '$ref' in away_team_obj:
            try:
                away_team_id = int(away_team_obj['$ref'].split('/teams/')[-1].split('?')[0])
            except:
                away_team_id = 0
        else:
            away_team_id = 0

        # Scores - handle both string/int and dict formats
        home_score = home_team.get('score')
        away_score = away_team.get('score')

        # Line scores (period scores)
        import json
        home_line_scores = home_team.get('linescores', [])
        away_line_scores = away_team.get('linescores', [])
        # Handle case where linescores might be a list of dicts or list of strings
        if home_line_scores and isinstance(home_line_scores, list):
            home_line_scores_json = json.dumps([ls.get('displayValue', '0') if isinstance(ls, dict) else str(ls) for ls in home_line_scores])
        else:
            home_line_scores_json = None
        if away_line_scores and isinstance(away_line_scores, list):
            away_line_scores_json = json.dumps([ls.get('displayValue', '0') if isinstance(ls, dict) else str(ls) for ls in away_line_scores])
        else:
            away_line_scores_json = None

        # Dereference score if it's a $ref
        if home_score and isinstance(home_score, dict) and '$ref' in home_score and client:
            try:
                score_data = client.get_from_ref(home_score['$ref'])
                home_score = score_data.get('value')
            except:
                home_score = None

        if away_score and isinstance(away_score, dict) and '$ref' in away_score and client:
            try:
                score_data = client.get_from_ref(away_score['$ref'])
                away_score = score_data.get('value')
            except:
                away_score = None

        # Convert to int if present and not a dict
        if home_score and not isinstance(home_score, dict):
            try:
                home_score = int(float(home_score))
            except (ValueError, TypeError):
                home_score = None
        else:
            home_score = None

        if away_score and not isinstance(away_score, dict):
            try:
                away_score = int(float(away_score))
            except (ValueError, TypeError):
                away_score = None
        else:
            away_score = None

        # Winner
        winner_team_id = None
        if home_team.get('winner'):
            winner_team_id = home_team_id
        elif away_team.get('winner'):
            winner_team_id = away_team_id

        # Date
        date = event_data.get('date')

        # Venue
        venue = competition.get('venue', {})
        venue_id = venue.get('id')
        if venue_id:
            venue_id = int(venue_id)
        venue_name = venue.get('fullName', '')

        # Status - dereference if it's a $ref
        status = competition.get('status', {})

        # If status is a reference, fetch it
        if '$ref' in status and client:
            try:
                status = client.get_from_ref(status['$ref'])
            except:
                return None  # Skip if we can't get status

        status_type = status.get('type', {})
        status_name = status_type.get('name', '')
        status_detail = status_type.get('detail', '')
        is_completed = status_type.get('completed', False)

        # Allow all games (completed, in-progress, and scheduled)
        # Scores will be None for non-completed games
        # if not is_completed:
        #     return None

        # Game flags
        is_conference_game = competition.get('conferenceCompetition', False)
        is_neutral_site = competition.get('neutralSite', False)

        # Additional info
        attendance = competition.get('attendance')
        if attendance:
            attendance = int(attendance)

        # Broadcast - handle both list and dict formats
        broadcasts = competition.get('broadcasts', [])
        broadcast_network = ''
        if broadcasts:
            if isinstance(broadcasts, list) and len(broadcasts) > 0:
                broadcast_network = broadcasts[0].get('names', [''])[0] if 'names' in broadcasts[0] else ''
            elif isinstance(broadcasts, dict):
                broadcast_network = broadcasts.get('names', [''])[0] if 'names' in broadcasts else ''

        api_ref = event_data.get('$ref', '')

        return (
            event_id, season_id, season_type_id, week,
            home_team_id, away_team_id,
            date, venue_id, venue_name,
            status_name, status_detail, is_completed,
            home_score, away_score, winner_team_id,
            is_conference_game, is_neutral_site,
            attendance, broadcast_network,
            api_ref,
            home_line_scores_json, away_line_scores_json
        )

    except Exception as e:
        import traceback
        print(f"\nError parsing event data: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        return None


def populate_events_by_date(db: Database, client: ESPNAPIClient,
                            dates: str, desc: str = "Processing events"):
    """Populate events for a specific date range.

    Args:
        db: Database connection
        client: API client
        dates: Date string (YYYYMMDD, YYYYMM, or YYYY)
        desc: Progress bar description
    """
    # Fetch events
    event_refs = client.get_events(dates, limit=1000)

    print(f"Found {len(event_refs)} events for {dates}")

    # Process events
    events_data = []

    for ref_obj in tqdm(event_refs, desc=desc):
        try:
            # Fetch full event data
            event_data = client.get_from_ref(ref_obj['$ref'])
            parsed = parse_event_data(event_data, client=client)

            if parsed:
                events_data.append(parsed)

        except Exception as e:
            print(f"Error processing event {ref_obj.get('$ref')}: {e}")
            continue

    # Insert into database
    if events_data:
        db.executemany(
            """
            INSERT OR REPLACE INTO events
            (event_id, season_id, season_type_id, week, home_team_id, away_team_id,
             date, venue_id, venue_name, status, status_detail, is_completed,
             home_score, away_score, winner_team_id,
             is_conference_game, is_neutral_site, attendance, broadcast_network, api_ref,
             home_line_scores, away_line_scores)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            events_data
        )
        db.commit()
        print(f"✓ Inserted {len(events_data)} events")

    return len(events_data)


def populate_events_for_season(db: Database, client: ESPNAPIClient, year: int):
    """Populate all events for a season.

    Args:
        db: Database connection
        client: API client
        year: Season year
    """
    print(f"\n=== Populating Events for {year} ===")

    total_inserted = populate_events_by_date(
        db, client, str(year),
        desc=f"Processing events for {year}"
    )

    print(f"\n✓ Total events inserted for {year}: {total_inserted}")


def populate_events_for_team(db: Database, client: ESPNAPIClient, year: int, team_id: int):
    """Populate events for a specific team.

    Args:
        db: Database connection
        client: API client
        year: Season year
        team_id: Team ID
    """
    print(f"\n=== Populating Events for Team {team_id} in {year} ===")

    # Fetch team events
    event_refs = client.get_team_events(year, team_id, limit=1000)
    print(f"Found {len(event_refs)} events for team {team_id}")

    # Process events
    events_data = []

    for ref_obj in tqdm(event_refs, desc="Processing team events"):
        try:
            event_data = client.get_from_ref(ref_obj['$ref'])
            parsed = parse_event_data(event_data, client=client)

            if parsed:
                events_data.append(parsed)

        except Exception as e:
            print(f"Error processing event {ref_obj.get('$ref')}: {e}")
            continue

    # Insert into database
    if events_data:
        db.executemany(
            """
            INSERT OR REPLACE INTO events
            (event_id, season_id, season_type_id, week, home_team_id, away_team_id,
             date, venue_id, venue_name, status, status_detail, is_completed,
             home_score, away_score, winner_team_id,
             is_conference_game, is_neutral_site, attendance, broadcast_network, api_ref,
             home_line_scores, away_line_scores)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            events_data
        )
        db.commit()
        print(f"✓ Inserted {len(events_data)} events")


def main(date: str):
    """Main function to populate events.

    Args:
        date: Date string - YYYYMMDD (day), YYYYMM (month), or YYYY (year)
    """
    db = Database()
    client = ESPNAPIClient()

    try:
        db.connect()
        populate_events_by_date(db, client, date, desc=f"Processing {date}")
        print("\n✓ Events population completed successfully!")

    except Exception as e:
        print(f"\n✗ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == '__main__':
    import sys

    if len(sys.argv) < 2:
        print("Usage: python populate_events.py <date>")
        print("  date: YYYYMMDD (day), YYYYMM (month), or YYYY (year)")
        print()
        print("Examples:")
        print("  python populate_events.py 20260111        # Single day")
        print("  python populate_events.py 202601          # January 2026")
        print("  python populate_events.py 2026            # Full year 2026")
        sys.exit(1)

    date = sys.argv[1]
    main(date=date)
