"""
DEPRECATED: Use update.py instead

This script has been replaced by update.py Phase 5.

Usage:
    python update.py                # Includes rankings update
    python update.py --skip-backfill --skip-standings --skip-entities  # Rankings only

This script is kept for reference only.

---

OLD DOCUMENTATION:
Update only the latest week's rankings from ESPN API.
This fetches the most recent AP Poll rankings and stores them in the database.
"""
from database import Database
from api_client import ESPNAPIClient


def get_latest_week_rankings(season: int = 2026, ranking_type_id: int = 1):
    """Fetch and store the latest week's rankings.

    Args:
        season: Season year (default 2026)
        ranking_type_id: 1=AP Poll, 2=Coaches Poll (default 1)
    """
    db = Database()
    client = ESPNAPIClient()

    try:
        db.connect()

        print(f"Fetching latest rankings for season {season}...")

        # Get all ranking weeks to find the latest
        rankings_overview = client.get_rankings(season, ranking_type_id, type_id=2)
        week_refs = rankings_overview.get('rankings', [])

        if not week_refs:
            print("No rankings found")
            return

        # Get the last week (most recent)
        latest_week_ref = week_refs[-1]['$ref']
        print(f"Latest week ref: {latest_week_ref}")

        # Fetch the latest week's data
        latest_data = client.get_from_ref(latest_week_ref)

        # Extract week info
        occurrence = latest_data.get('occurrence', {})
        week_number = occurrence.get('value', 0)
        week_display = occurrence.get('displayValue', f'Week {week_number}')
        ranking_date = latest_data.get('date')

        print(f"Fetching {week_display} rankings...")
        print(f"Date: {ranking_date}")

        # Get rankings
        ranks = latest_data.get('ranks', [])
        print(f"Found {len(ranks)} teams")

        # Prepare data for insertion
        all_rankings = []

        for rank_entry in ranks:
            try:
                # Team info
                team = rank_entry.get('team', {})
                team_ref = team.get('$ref', '') if isinstance(team, dict) else ''

                if not team_ref:
                    continue

                # Extract team ID from URL
                team_id = int(team_ref.split('/')[-1].split('?')[0])

                # Ranking data
                current_rank = rank_entry.get('current', 0)
                previous_rank = rank_entry.get('previous')
                points = rank_entry.get('points')
                first_place_votes = rank_entry.get('firstPlaceVotes', 0)

                # Calculate trend
                if previous_rank is None or previous_rank == 0:
                    if current_rank <= 5:
                        trend = "↑"
                    else:
                        trend = "NEW"
                elif current_rank < previous_rank:
                    trend = f"+{previous_rank - current_rank}"
                elif current_rank > previous_rank:
                    trend = f"-{current_rank - previous_rank}"
                else:
                    trend = "-"

                # Record
                record = rank_entry.get('record', {})
                if record:
                    record_summary = record.get('summary', '')
                    stats = record.get('stats', [])
                    wins = None
                    losses = None
                    for stat in stats:
                        if stat.get('name') == 'wins':
                            wins = int(stat.get('value', 0))
                        elif stat.get('name') == 'losses':
                            losses = int(stat.get('value', 0))
                else:
                    wins = None
                    losses = None
                    record_summary = ''

                api_ref = rank_entry.get('$ref', '')

                all_rankings.append((
                    season, 2, week_number, ranking_type_id, team_id,
                    current_rank, previous_rank, points, first_place_votes, trend,
                    wins, losses, record_summary,
                    ranking_date, ranking_date,
                    api_ref
                ))

            except Exception as e:
                print(f"Error processing team: {e}")
                continue

        # Insert rankings
        if all_rankings:
            # Clear existing rankings for this week
            db.execute(
                """DELETE FROM weekly_rankings
                   WHERE season_id = ? AND ranking_type_id = ? AND week_number = ?""",
                (season, ranking_type_id, week_number)
            )

            db.executemany(
                """
                INSERT INTO weekly_rankings
                (season_id, season_type_id, week_number, ranking_type_id, team_id,
                 current_rank, previous_rank, points, first_place_votes, trend,
                 wins, losses, record_summary,
                 ranking_date, last_updated,
                 api_ref)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                all_rankings
            )
            db.commit()
            print(f"✓ Inserted {len(all_rankings)} ranking entries for {week_display}")
        else:
            print("No ranking data to insert")

        # Verify
        cursor = db.execute(
            """SELECT COUNT(*) FROM weekly_rankings
               WHERE season_id = ? AND ranking_type_id = ? AND week_number = ?""",
            (season, ranking_type_id, week_number)
        )
        count = cursor.fetchone()[0]
        print(f"✓ Verified: {count} rankings in database")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == '__main__':
    get_latest_week_rankings()
