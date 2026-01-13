"""
Populate venues table.
"""
from typing import Dict
from tqdm import tqdm

from database import Database
from api_client import ESPNAPIClient


def parse_venue_data(venue_data: Dict) -> tuple:
    """Parse venue data from API.

    Args:
        venue_data: Venue data from API

    Returns:
        Tuple for database insertion
    """
    venue_id = int(venue_data.get('id', 0))
    guid = venue_data.get('guid', '')
    full_name = venue_data.get('fullName', '')

    # Address
    address = venue_data.get('address', {})
    city = address.get('city', '')
    state = address.get('state', '')
    country = address.get('country', 'USA')

    # Properties
    is_indoor = venue_data.get('indoor', True)
    capacity = venue_data.get('capacity')

    # Images
    images = venue_data.get('images', [])
    image_url = images[0].get('href', '') if images else ''

    api_ref = venue_data.get('$ref', '')

    return (
        venue_id, guid, full_name,
        city, state, country,
        is_indoor, capacity, image_url,
        api_ref
    )


def populate_venues(db: Database, client: ESPNAPIClient, limit: int = None):
    """Populate venues table.

    Args:
        db: Database connection
        client: API client
        limit: Maximum venues to fetch (None = all)
    """
    print("\n=== Populating Venues ===")

    # Fetch venues
    print("Fetching venues from API...")
    venue_refs = client.get_venues(limit=limit or 1000)

    if limit:
        venue_refs = venue_refs[:limit]

    print(f"Found {len(venue_refs)} venues")

    # Process venues
    venues_data = []

    for ref_obj in tqdm(venue_refs, desc="Processing venues"):
        try:
            # Fetch full venue data
            venue_data = client.get_from_ref(ref_obj['$ref'])
            parsed = parse_venue_data(venue_data)
            venues_data.append(parsed)

        except Exception as e:
            print(f"Error processing venue {ref_obj.get('$ref')}: {e}")
            continue

    # Insert into database
    print("Inserting venues into database...")
    db.executemany(
        """
        INSERT OR REPLACE INTO venues
        (venue_id, guid, full_name, city, state, country,
         is_indoor, capacity, image_url, api_ref)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        venues_data
    )
    db.commit()

    print(f"✓ Inserted {len(venues_data)} venues")


def main(limit: int = None):
    """Main function to populate venues.

    Args:
        limit: Limit number of venues (None = all)
    """
    db = Database()
    client = ESPNAPIClient()

    try:
        db.connect()
        populate_venues(db, client, limit=limit)
        print("\n✓ Venues population completed successfully!")

    except Exception as e:
        print(f"\n✗ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == '__main__':
    import sys

    limit = None
    if len(sys.argv) > 1:
        limit = int(sys.argv[1])

    main(limit=limit)
