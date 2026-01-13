"""
Populate athletes (players) for multiple seasons.
"""
from typing import List
from tqdm import tqdm

from database import Database
from api_client import ESPNAPIClient


def populate_athletes_for_season(db: Database, client: ESPNAPIClient, season: int):
    """Populate athletes for a specific season.

    Args:
        db: Database connection
        client: API client
        season: Season year
    """
    print(f"\n=== Populating Athletes for {season} ===")

    # Fetch athlete references
    print("Fetching athlete list...")
    athlete_refs = client.get_athletes(season, limit=1000)
    print(f"Found {len(athlete_refs)} athletes")

    athletes_base_data = []
    athlete_seasons_data = []

    for ref_obj in tqdm(athlete_refs, desc=f"Processing athletes for {season}"):
        try:
            athlete_data = client.get_from_ref(ref_obj['$ref'])

            athlete_id = int(athlete_data.get('id', 0))

            # Basic identification
            uid = athlete_data.get('uid', '')
            guid = athlete_data.get('guid', '')
            slug = athlete_data.get('slug', '')

            # Names
            first_name = athlete_data.get('firstName', '')
            last_name = athlete_data.get('lastName', '')
            full_name = athlete_data.get('fullName', '')
            display_name = athlete_data.get('displayName', '')
            short_name = athlete_data.get('shortName', '')

            # Physical attributes
            height_inches = None
            display_height = None
            weight_lbs = None
            display_weight = None

            if 'displayHeight' in athlete_data:
                display_height = athlete_data.get('displayHeight', '')
                # Try to parse height in inches (e.g., "6'2\"" -> 74)
                try:
                    height_str = display_height.replace('"', '').replace("'", '-')
                    if '-' in height_str:
                        feet, inches = height_str.split('-')
                        height_inches = int(feet) * 12 + int(inches)
                except:
                    pass

            if 'displayWeight' in athlete_data:
                display_weight = athlete_data.get('displayWeight', '')
                # Try to parse weight (e.g., "185 lbs" -> 185)
                try:
                    weight_lbs = int(display_weight.split()[0])
                except:
                    pass

            # Birth information
            birth_place = athlete_data.get('birthPlace', {})
            birth_city = birth_place.get('city', '') if birth_place else ''
            birth_state = birth_place.get('state', '') if birth_place else ''
            birth_country = birth_place.get('country', '') if birth_place else ''

            # Current team
            team = athlete_data.get('team', {})
            if team and '$ref' in team:
                # Extract team ID from ref
                team_ref = team['$ref']
                current_team_id = int(team_ref.split('/')[-1].split('?')[0])
            else:
                current_team_id = None

            # College
            college = athlete_data.get('college', {})
            college_id = int(college.get('id', 0)) if college and college.get('id') else None

            # Position
            position = athlete_data.get('position', {})
            position_id = int(position.get('id', 0)) if position and position.get('id') else None
            position_name = position.get('name', '') if position else ''
            position_abbreviation = position.get('abbreviation', '') if position else ''

            # Jersey
            jersey = athlete_data.get('jersey', '')

            api_ref = athlete_data.get('$ref', '')

            # Add to athletes base data
            athletes_base_data.append((
                athlete_id, uid, guid, slug,
                first_name, last_name, full_name, display_name, short_name,
                height_inches, display_height, weight_lbs, display_weight,
                birth_city, birth_state, birth_country,
                current_team_id, college_id,
                position_id, position_name, position_abbreviation,
                jersey, api_ref
            ))

            # Add to athlete_seasons data
            # Experience
            experience = athlete_data.get('experience', {})
            experience_years = int(experience.get('years', 0)) if experience else 0
            experience_display = experience.get('displayValue', '') if experience else ''
            experience_abbreviation = experience.get('abbreviation', '') if experience else ''

            # Status
            status = athlete_data.get('status', {})
            status_id = status.get('id', '') if status else ''
            status_name = status.get('name', '') if status else ''
            status_type = status.get('type', '') if status else ''

            is_active = athlete_data.get('active', True)

            athlete_seasons_data.append((
                athlete_id, season, current_team_id if current_team_id else 0,
                jersey, experience_years, experience_display, experience_abbreviation,
                is_active, status_id, status_name, status_type,
                api_ref
            ))

        except Exception as e:
            print(f"\nError processing athlete {ref_obj.get('$ref')}: {e}")
            continue

    # Insert into athletes table
    if athletes_base_data:
        db.executemany(
            """
            INSERT OR REPLACE INTO athletes
            (athlete_id, uid, guid, slug,
             first_name, last_name, full_name, display_name, short_name,
             height_inches, display_height, weight_lbs, display_weight,
             birth_city, birth_state, birth_country,
             current_team_id, college_id,
             position_id, position_name, position_abbreviation,
             jersey, api_ref)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            athletes_base_data
        )
        db.commit()
        print(f"✓ Inserted {len(athletes_base_data)} athletes (base)")

    # Insert into athlete_seasons table
    if athlete_seasons_data:
        db.executemany(
            """
            INSERT OR REPLACE INTO athlete_seasons
            (athlete_id, season_id, team_id, jersey,
             experience_years, experience_display, experience_abbreviation,
             is_active, status_id, status_name, status_type, api_ref)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            athlete_seasons_data
        )
        db.commit()
        print(f"✓ Inserted {len(athlete_seasons_data)} athlete-season relationships")


def main(seasons: List[int]):
    """Main function to populate athletes.

    Args:
        seasons: List of season years (e.g., [2024, 2025, 2026])
    """
    print(f"\n{'='*60}")
    print(f"POPULATING ATHLETES FOR SEASONS: {', '.join(map(str, seasons))}")
    print(f"{'='*60}")

    db = Database()
    client = ESPNAPIClient()

    try:
        db.connect()

        for season in seasons:
            populate_athletes_for_season(db, client, season)

        print(f"\n{'='*60}")
        print("ATHLETES POPULATION COMPLETE")
        print(f"{'='*60}")

        # Print summary
        print("\nDatabase Summary:")
        print("-" * 40)

        stats = [
            ("Total Athletes", "SELECT COUNT(*) FROM athletes"),
            ("Athlete-Season Records", "SELECT COUNT(*) FROM athlete_seasons"),
            ("Seasons with Athletes", "SELECT COUNT(DISTINCT season_id) FROM athlete_seasons"),
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
        print("Usage: python populate_athletes.py <year1> [year2] [year3] ...")
        print()
        print("Examples:")
        print("  python populate_athletes.py 2024")
        print("  python populate_athletes.py 2024 2025 2026")
        sys.exit(1)

    seasons = [int(year) for year in sys.argv[1:]]
    main(seasons=seasons)
