"""
Populate seasons and season_types tables.
"""
from datetime import datetime
from typing import List, Dict
from tqdm import tqdm

from database import Database
from api_client import ESPNAPIClient


def parse_season_data(season_data: Dict) -> tuple:
    """Parse season data from API.

    Args:
        season_data: Season data from API

    Returns:
        Tuple of (season_id, year, display_name, api_ref)
    """
    # Extract year from $ref URL
    ref = season_data.get('$ref', '')
    year = int(ref.split('/seasons/')[-1].split('?')[0])

    return (
        year,  # Using year as season_id
        year,
        str(year),  # display_name
        ref
    )


def parse_season_type_data(season_id: int, type_data: Dict) -> tuple:
    """Parse season type data from API.

    Args:
        season_id: Parent season ID
        type_data: Season type data from API

    Returns:
        Tuple for database insertion
    """
    type_id = int(type_data.get('type', type_data.get('id', 0)))
    type_name = type_data.get('name', '')
    abbreviation = type_data.get('abbreviation', '')
    slug = type_data.get('slug', '')

    # Parse dates
    start_date = type_data.get('startDate')
    end_date = type_data.get('endDate')

    # Flags
    has_groups = type_data.get('hasGroups', False)
    has_standings = type_data.get('hasStandings', False)
    has_legs = type_data.get('hasLegs', False)

    api_ref = type_data.get('$ref', '')

    return (
        season_id,
        type_id,
        type_name,
        abbreviation,
        slug,
        start_date,
        end_date,
        has_groups,
        has_standings,
        has_legs,
        api_ref
    )


def populate_seasons(db: Database, client: ESPNAPIClient, limit: int = None):
    """Populate seasons table.

    Args:
        db: Database connection
        client: API client
        limit: Maximum number of seasons to fetch (None = all)
    """
    print("\n=== Populating Seasons ===")

    # Fetch seasons
    print("Fetching seasons from API...")
    season_refs = client.get_seasons(limit=limit or 1000)

    if limit:
        season_refs = season_refs[:limit]

    print(f"Found {len(season_refs)} seasons")

    # Parse and insert seasons
    print("Inserting seasons into database...")
    seasons_data = []

    for ref_obj in tqdm(season_refs, desc="Processing seasons"):
        try:
            # Fetch full season data
            season_data = client.get_from_ref(ref_obj['$ref'])
            parsed = parse_season_data(season_data)
            seasons_data.append(parsed)
        except Exception as e:
            print(f"Error processing season {ref_obj.get('$ref')}: {e}")
            continue

    # Insert into database
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


def populate_season_types(db: Database, client: ESPNAPIClient, years: List[int] = None):
    """Populate season_types table.

    Args:
        db: Database connection
        client: API client
        years: List of years to populate (None = all seasons in DB)
    """
    print("\n=== Populating Season Types ===")

    # Get years from database if not provided
    if years is None:
        cursor = db.execute("SELECT year FROM seasons ORDER BY year DESC")
        years = [row[0] for row in cursor.fetchall()]

    print(f"Processing {len(years)} seasons...")

    types_data = []

    for year in tqdm(years, desc="Fetching season types"):
        try:
            # Fetch season types
            types_response = client.get_season_types(year)
            type_refs = types_response.get('items', [])

            # Fetch each type's details
            for type_ref in type_refs:
                try:
                    type_data = client.get_from_ref(type_ref['$ref'])
                    parsed = parse_season_type_data(year, type_data)
                    types_data.append(parsed)
                except Exception as e:
                    print(f"Error processing type {type_ref.get('$ref')}: {e}")
                    continue

        except Exception as e:
            print(f"Error processing year {year}: {e}")
            continue

    # Insert into database
    print("Inserting season types into database...")
    db.executemany(
        """
        INSERT OR REPLACE INTO season_types
        (season_id, type_id, type_name, abbreviation, slug,
         start_date, end_date, has_groups, has_standings, has_legs, api_ref)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        types_data
    )
    db.commit()

    print(f"✓ Inserted {len(types_data)} season types")


def main(year: int = None, limit_seasons: int = None):
    """Main function to populate seasons data.

    Args:
        year: Specific year to populate (None = all)
        limit_seasons: Limit number of seasons to fetch
    """
    db = Database()
    client = ESPNAPIClient()

    try:
        db.connect()

        # Populate seasons
        if year is None:
            populate_seasons(db, client, limit=limit_seasons)
        else:
            # Just insert the specific year
            print(f"\n=== Populating Season {year} ===")
            season_data = client.get(f'/seasons/{year}')
            parsed = parse_season_data(season_data)
            db.execute(
                """
                INSERT OR REPLACE INTO seasons
                (season_id, year, display_name, api_ref)
                VALUES (?, ?, ?, ?)
                """,
                parsed
            )
            db.commit()
            print(f"✓ Inserted season {year}")

        # Populate season types
        years_to_process = [year] if year else None
        populate_season_types(db, client, years=years_to_process)

        print("\n✓ Season population completed successfully!")

    except Exception as e:
        print(f"\n✗ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == '__main__':
    import sys

    year = None
    limit = None

    if len(sys.argv) > 1:
        year = int(sys.argv[1])
    if len(sys.argv) > 2:
        limit = int(sys.argv[2])

    main(year=year, limit_seasons=limit)
