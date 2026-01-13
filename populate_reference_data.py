"""
Populate all reference data (teams, venues, conferences, etc.) for multiple seasons.
"""
from typing import List
from tqdm import tqdm

from database import Database
from api_client import ESPNAPIClient


def populate_teams_for_seasons(db: Database, client: ESPNAPIClient, seasons: List[int]):
    """Populate teams for multiple seasons.

    Args:
        db: Database connection
        client: API client
        seasons: List of season years (e.g., [2024, 2025, 2026])
    """
    print("\n=== Populating Teams ===")

    for year in seasons:
        print(f"\nFetching teams for {year}...")
        team_refs = client.get_season_teams(year, limit=1000)
        print(f"Found {len(team_refs)} teams")

        teams_base_data = []
        team_seasons_data = []

        for ref_obj in tqdm(team_refs, desc=f"Processing teams for {year}"):
            try:
                team_data = client.get_from_ref(ref_obj['$ref'])

                team_id = int(team_data.get('id', 0))
                season_id = year
                season_type_id = 2  # Regular season

                # Basic team info for teams table
                uid = team_data.get('uid', '')
                guid = team_data.get('guid', '')
                slug = team_data.get('slug', '')
                location = team_data.get('location', '')
                name = team_data.get('name', '')
                nickname = team_data.get('nickname', '')
                abbreviation = team_data.get('abbreviation', '')
                display_name = team_data.get('displayName', '')
                short_display_name = team_data.get('shortDisplayName', '')
                color = team_data.get('color', '')
                alternate_color = team_data.get('alternateColor', '')

                # Logos
                logos = team_data.get('logos', [])
                logo_url = logos[0].get('href', '') if logos else ''
                logo_dark = logos[1].get('href', '') if len(logos) > 1 else ''

                is_active = True
                is_all_star = False

                api_ref = team_data.get('$ref', '')

                teams_base_data.append((
                    team_id, uid, guid, slug,
                    location, name, nickname, abbreviation,
                    display_name, short_display_name,
                    color, alternate_color,
                    logo_url, logo_dark,
                    is_active, is_all_star,
                    None, None, None, None, None,  # venue info
                    api_ref
                ))

                # Group/Conference for team_seasons
                groups = team_data.get('groups', {})
                group_id = int(groups.get('id')) if groups and groups.get('id') else None
                conference_abbr = groups.get('abbreviation', '') if groups else ''

                team_seasons_data.append((
                    team_id, season_id, season_type_id, group_id,
                    conference_abbr, api_ref
                ))

            except Exception as e:
                print(f"Error processing team {ref_obj.get('$ref')}: {e}")
                continue

        # Insert into teams table
        if teams_base_data:
            db.executemany(
                """
                INSERT OR REPLACE INTO teams
                (team_id, uid, guid, slug, location, name, nickname, abbreviation,
                 display_name, short_display_name, color, alternate_color,
                 logo_url, logo_dark_url, is_active, is_all_star,
                 venue_id, venue_name, venue_city, venue_state, college_id, api_ref)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                teams_base_data
            )
            db.commit()
            print(f"✓ Inserted {len(teams_base_data)} teams (base)")

        # Insert into team_seasons table
        if team_seasons_data:
            db.executemany(
                """
                INSERT OR REPLACE INTO team_seasons
                (team_id, season_id, season_type_id, group_id, conference_abbreviation, api_ref)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                team_seasons_data
            )
            db.commit()
            print(f"✓ Inserted {len(team_seasons_data)} team-season relationships for {year}")


def populate_groups_for_seasons(db: Database, client: ESPNAPIClient, seasons: List[int]):
    """Populate groups/conferences for multiple seasons.

    Args:
        db: Database connection
        client: API client
        seasons: List of season years
    """
    print("\n=== Populating Groups/Conferences ===")

    for year in seasons:
        print(f"\nFetching groups for {year}...")
        group_refs = client.get_groups(year, type_id=2)
        print(f"Found {len(group_refs)} groups")

        groups_data = []
        for ref_obj in tqdm(group_refs, desc=f"Processing groups for {year}"):
            try:
                group_data = client.get_from_ref(ref_obj['$ref'])

                group_id = int(group_data.get('id', 0))
                season_id = year
                season_type_id = 2

                name = group_data.get('name', '')
                short_name = group_data.get('shortName', '')
                abbreviation = group_data.get('abbreviation', '')

                # Logo
                logos = group_data.get('logos', [])
                logo_url = logos[0].get('href', '') if logos else ''

                api_ref = group_data.get('$ref', '')

                groups_data.append((
                    group_id, season_id, season_type_id,
                    name, short_name, abbreviation, logo_url, api_ref
                ))

            except Exception as e:
                print(f"Error processing group {ref_obj.get('$ref')}: {e}")
                continue

        # Insert groups
        if groups_data:
            db.executemany(
                """
                INSERT OR REPLACE INTO groups
                (group_id, season_id, season_type_id, name, short_name, abbreviation, logo_url, api_ref)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                groups_data
            )
            db.commit()
            print(f"✓ Inserted {len(groups_data)} groups for {year}")


def populate_season_types_for_seasons(db: Database, client: ESPNAPIClient, seasons: List[int]):
    """Populate season types for multiple seasons.

    Args:
        db: Database connection
        client: API client
        seasons: List of season years
    """
    print("\n=== Populating Season Types ===")

    for year in seasons:
        print(f"\nFetching season types for {year}...")
        types_data_raw = client.get_season_types(year)

        items = types_data_raw.get('items', [])
        print(f"Found {len(items)} season types")

        types_data = []
        for type_ref in items:
            try:
                type_data = client.get_from_ref(type_ref['$ref'])

                season_id = year
                type_id = int(type_data.get('type', 0))
                type_name = type_data.get('name', '')
                abbreviation = type_data.get('abbreviation', '')
                slug = type_data.get('slug', '')

                # Dates
                start_date = type_data.get('startDate')
                end_date = type_data.get('endDate')

                # Flags
                has_groups = type_data.get('hasGroups', False)
                has_standings = type_data.get('hasStandings', False)
                has_legs = type_data.get('hasLegs', False)

                api_ref = type_data.get('$ref', '')

                types_data.append((
                    season_id, type_id, type_name, abbreviation, slug,
                    start_date, end_date,
                    has_groups, has_standings, has_legs,
                    api_ref
                ))

            except Exception as e:
                print(f"Error processing season type: {e}")
                continue

        # Insert season types
        if types_data:
            db.executemany(
                """
                INSERT OR REPLACE INTO season_types
                (season_id, type_id, type_name, abbreviation, slug,
                 start_date, end_date,
                 has_groups, has_standings, has_legs,
                 api_ref)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                types_data
            )
            db.commit()
            print(f"✓ Inserted {len(types_data)} season types for {year}")


def populate_seasons(db: Database, client: ESPNAPIClient, seasons: List[int]):
    """Populate basic season records.

    Args:
        db: Database connection
        client: API client
        seasons: List of season years
    """
    print("\n=== Populating Seasons ===")

    seasons_data = []
    for year in seasons:
        try:
            season_url = f"{client.base_url}/seasons/{year}"
            season_data = client.get_from_ref(season_url)

            season_id = int(season_data.get('year', year))
            year_val = int(season_data.get('year', year))
            display_name = season_data.get('displayName', f'{year}')
            api_ref = season_data.get('$ref', '')

            seasons_data.append((
                season_id, year_val, display_name, api_ref
            ))

        except Exception as e:
            print(f"Error processing season {year}: {e}")
            continue

    # Insert seasons
    if seasons_data:
        db.executemany(
            """
            INSERT OR REPLACE INTO seasons
            (season_id, year, display_name, api_ref)
            VALUES (?, ?, ?, ?)
            """,
            seasons_data
        )
        db.commit()
        print(f"✓ Inserted {len(seasons_data)} seasons")


def main(seasons: List[int]):
    """Main function to populate all reference data.

    Args:
        seasons: List of season years (e.g., [2024, 2025, 2026])
    """
    print(f"\n{'='*60}")
    print(f"POPULATING REFERENCE DATA FOR SEASONS: {', '.join(map(str, seasons))}")
    print(f"{'='*60}")

    db = Database()
    client = ESPNAPIClient()

    try:
        db.connect()

        # Populate in logical order
        populate_seasons(db, client, seasons)
        populate_season_types_for_seasons(db, client, seasons)
        populate_groups_for_seasons(db, client, seasons)
        populate_teams_for_seasons(db, client, seasons)

        print(f"\n{'='*60}")
        print("REFERENCE DATA POPULATION COMPLETE")
        print(f"{'='*60}")

        # Print summary
        print("\nDatabase Summary:")
        print("-" * 40)

        stats = [
            ("Seasons", "SELECT COUNT(*) FROM seasons"),
            ("Season Types", "SELECT COUNT(*) FROM season_types"),
            ("Groups", "SELECT COUNT(*) FROM groups"),
            ("Team Seasons", "SELECT COUNT(*) FROM team_seasons"),
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
        print("Usage: python populate_reference_data.py <year1> [year2] [year3] ...")
        print()
        print("Examples:")
        print("  python populate_reference_data.py 2024")
        print("  python populate_reference_data.py 2024 2025 2026")
        sys.exit(1)

    seasons = [int(year) for year in sys.argv[1:]]
    main(seasons=seasons)
