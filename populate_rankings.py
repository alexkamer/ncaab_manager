"""
Populate rankings (AP Poll, Coaches Poll, etc.) for multiple seasons.
"""
from typing import List
from tqdm import tqdm

from database import Database
from api_client import ESPNAPIClient


def populate_ranking_types(db: Database):
    """Populate ranking types (AP, Coaches, etc.).

    Args:
        db: Database connection
    """
    print("\n=== Populating Ranking Types ===")

    # Common ranking types in NCAA Basketball
    ranking_types = [
        (1, 'AP', 'AP Top 25', 'Associated Press Poll'),
        (2, 'COACHES', 'Coaches Poll', 'USA Today Coaches Poll'),
        (3, 'RPI', 'RPI Rankings', 'Rating Percentage Index'),
        (4, 'BPI', 'BPI Rankings', 'Basketball Power Index'),
        (5, 'NET', 'NET Rankings', 'NCAA Evaluation Tool'),
    ]

    db.executemany(
        """
        INSERT OR REPLACE INTO ranking_types
        (ranking_type_id, type_code, name, description)
        VALUES (?, ?, ?, ?)
        """,
        ranking_types
    )
    db.commit()
    print(f"✓ Inserted {len(ranking_types)} ranking types")


def populate_rankings_for_season(db: Database, client: ESPNAPIClient,
                                 season: int, ranking_type_id: int = 1):
    """Populate rankings for a specific season.

    Args:
        db: Database connection
        client: API client
        season: Season year
        ranking_type_id: 1=AP Poll, 2=Coaches Poll
    """
    print(f"\n=== Populating Rankings for {season} (Type ID: {ranking_type_id}) ===")

    try:
        # Fetch rankings data
        rankings_data_raw = client.get_rankings(season, ranking_type_id, type_id=2)

        # Check if we got data
        if not rankings_data_raw:
            print(f"No rankings data available for season {season}, type {ranking_type_id}")
            return

        # Get the rankings array
        items = rankings_data_raw.get('rankings', [])
        if not items:
            print(f"No ranking items found for season {season}, type {ranking_type_id}")
            return

        print(f"Found {len(items)} ranking weeks")

        all_rankings = []

        for item_ref in tqdm(items, desc="Processing ranking weeks"):
            try:
                # Dereference the item
                item_data = client.get_from_ref(item_ref['$ref'])

                # Extract week info
                week_number = item_data.get('week', {}).get('number', 0)
                ranking_date = item_data.get('lastUpdated') or item_data.get('date')

                # Get rankings list
                ranks = item_data.get('ranks', [])

                for rank_entry in ranks:
                    try:
                        # Team info - extract ID from $ref
                        team = rank_entry.get('team', {})
                        team_ref = team.get('$ref', '') if isinstance(team, dict) else ''

                        if team_ref:
                            # Extract team ID from URL like: .../teams/2509
                            team_id = int(team_ref.split('/')[-1].split('?')[0])
                        else:
                            continue

                        # Ranking data
                        current_rank = rank_entry.get('current', 0)
                        previous_rank = rank_entry.get('previous')
                        points = rank_entry.get('points')
                        first_place_votes = rank_entry.get('firstPlaceVotes', 0)
                        trend = rank_entry.get('trend', '')

                        # Record
                        record = rank_entry.get('record', {})
                        if record:
                            record_summary = record.get('summary', '')
                            # Extract wins/losses from stats array
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
                        print(f"Error processing rank entry: {e}")
                        continue

            except Exception as e:
                print(f"Error processing ranking week: {e}")
                continue

        # Insert rankings
        if all_rankings:
            db.executemany(
                """
                INSERT OR REPLACE INTO weekly_rankings
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
            print(f"✓ Inserted {len(all_rankings)} ranking entries")
        else:
            print("No ranking data to insert")

    except Exception as e:
        print(f"Error fetching rankings: {e}")
        import traceback
        traceback.print_exc()


def main(seasons: List[int], ranking_types: List[int] = None):
    """Main function to populate rankings.

    Args:
        seasons: List of season years (e.g., [2024, 2025, 2026])
        ranking_types: List of ranking type IDs (1=AP, 2=Coaches). Default: [1, 2]
    """
    if ranking_types is None:
        ranking_types = [1, 2]  # AP Poll and Coaches Poll

    print(f"\n{'='*60}")
    print(f"POPULATING RANKINGS FOR SEASONS: {', '.join(map(str, seasons))}")
    print(f"Ranking Types: {', '.join(map(str, ranking_types))}")
    print(f"{'='*60}")

    db = Database()
    client = ESPNAPIClient()

    try:
        db.connect()

        # Populate ranking types first
        populate_ranking_types(db)

        # Populate rankings for each season and ranking type
        for season in seasons:
            for ranking_type_id in ranking_types:
                populate_rankings_for_season(db, client, season, ranking_type_id)

        print(f"\n{'='*60}")
        print("RANKINGS POPULATION COMPLETE")
        print(f"{'='*60}")

        # Print summary
        print("\nDatabase Summary:")
        print("-" * 40)

        stats = [
            ("Ranking Types", "SELECT COUNT(*) FROM ranking_types"),
            ("Total Rankings", "SELECT COUNT(*) FROM weekly_rankings"),
            ("Seasons with Rankings", "SELECT COUNT(DISTINCT season_id) FROM weekly_rankings"),
            ("Weeks Covered", "SELECT COUNT(DISTINCT week_number) FROM weekly_rankings"),
        ]

        for name, query in stats:
            cursor = db.execute(query)
            count = cursor.fetchone()[0]
            print(f"{name:.<30} {count:>8}")

        print("="*60)

    except Exception as e:
        print(f"\n✗ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == '__main__':
    import sys

    if len(sys.argv) < 2:
        print("Usage: python populate_rankings.py <year1> [year2] [year3] ... [--types TYPE1,TYPE2]")
        print()
        print("Ranking Types:")
        print("  1 = AP Poll")
        print("  2 = Coaches Poll")
        print()
        print("Examples:")
        print("  python populate_rankings.py 2024")
        print("  python populate_rankings.py 2024 2025 2026")
        print("  python populate_rankings.py 2024 --types 1")
        print("  python populate_rankings.py 2024 2025 --types 1,2")
        sys.exit(1)

    # Parse arguments
    args = sys.argv[1:]
    ranking_types = None

    # Check for --types flag
    if '--types' in args:
        types_idx = args.index('--types')
        ranking_types = [int(t) for t in args[types_idx + 1].split(',')]
        args = args[:types_idx]

    seasons = [int(year) for year in args]
    main(seasons=seasons, ranking_types=ranking_types)
