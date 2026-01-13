"""
Populate teams, groups, and team_seasons tables.
"""
from typing import List, Dict, Optional
from tqdm import tqdm

from database import Database
from api_client import ESPNAPIClient


def parse_team_data(team_data: Dict) -> tuple:
    """Parse team data from API.

    Args:
        team_data: Team data from API

    Returns:
        Tuple for database insertion
    """
    team_id = int(team_data.get('id', 0))
    uid = team_data.get('uid', '')
    guid = team_data.get('guid', '')
    slug = team_data.get('slug', '')

    # Names
    location = team_data.get('location', '')
    name = team_data.get('name', '')
    nickname = team_data.get('nickname', '')
    abbreviation = team_data.get('abbreviation', '')
    display_name = team_data.get('displayName', '')
    short_display_name = team_data.get('shortDisplayName', '')

    # Branding
    color = team_data.get('color', '')
    alternate_color = team_data.get('alternateColor', '')

    # Logos
    logos = team_data.get('logos', [])
    logo_url = logos[0].get('href', '') if logos else ''
    logo_dark_url = ''
    for logo in logos:
        if logo.get('rel') == ['dark']:
            logo_dark_url = logo.get('href', '')

    # Flags
    is_active = team_data.get('isActive', True)
    is_all_star = team_data.get('isAllStar', False)

    api_ref = team_data.get('$ref', '')

    return (
        team_id, uid, guid, slug,
        location, name, nickname, abbreviation,
        display_name, short_display_name,
        color, alternate_color,
        logo_url, logo_dark_url,
        is_active, is_all_star,
        api_ref
    )


def parse_group_data(season_id: int, season_type_id: int, group_data: Dict) -> tuple:
    """Parse group/conference data from API.

    Args:
        season_id: Season ID
        season_type_id: Season type ID
        group_data: Group data from API

    Returns:
        Tuple for database insertion
    """
    group_id = int(group_data.get('id', 0))
    uid = group_data.get('uid', '')
    name = group_data.get('name', '')
    abbreviation = group_data.get('abbreviation', '')
    short_name = group_data.get('shortName', '')
    midsize_name = group_data.get('midsizeName', '')
    slug = group_data.get('slug', '')

    # Check if this group has a parent (conference has parent division)
    parent_ref = group_data.get('parent', {}).get('$ref')
    parent_group_id = None
    if parent_ref:
        try:
            parent_group_id = int(parent_ref.split('/groups/')[-1].split('?')[0])
        except:
            pass

    is_conference = group_data.get('isConference', False)

    # Logo
    logos = group_data.get('logos', [])
    logo_url = logos[0].get('href', '') if logos else ''

    api_ref = group_data.get('$ref', '')

    return (
        group_id, season_id, season_type_id,
        uid, name, abbreviation, short_name, midsize_name, slug,
        parent_group_id, is_conference, logo_url, api_ref
    )


def populate_groups(db: Database, client: ESPNAPIClient, year: int, type_id: int = 2):
    """Populate groups table for a season.

    Args:
        db: Database connection
        client: API client
        year: Season year
        type_id: Season type ID (default 2 = Regular Season)
    """
    print(f"\nFetching groups for {year}...")

    # Get season_type_id from database
    cursor = db.execute(
        "SELECT season_type_id FROM season_types WHERE season_id = ? AND type_id = ?",
        (year, type_id)
    )
    row = cursor.fetchone()
    if not row:
        print(f"Season type not found for {year}, type {type_id}")
        return []

    season_type_id = row[0]

    # Fetch groups
    group_refs = client.get_groups(year, type_id)

    groups_data = []

    for ref_obj in tqdm(group_refs, desc="Processing groups"):
        try:
            group_data = client.get_from_ref(ref_obj['$ref'])
            parsed = parse_group_data(year, season_type_id, group_data)
            groups_data.append(parsed)

            # If this is a division with children (conferences), fetch them
            if not group_data.get('isConference', False):
                children_ref = group_data.get('children', {}).get('$ref')
                if children_ref:
                    children_response = client.get_from_ref(children_ref)
                    child_refs = children_response.get('items', [])

                    for child_ref in child_refs:
                        try:
                            child_data = client.get_from_ref(child_ref['$ref'])
                            child_parsed = parse_group_data(year, season_type_id, child_data)
                            groups_data.append(child_parsed)
                        except Exception as e:
                            print(f"Error processing child group: {e}")
                            continue

        except Exception as e:
            print(f"Error processing group {ref_obj.get('$ref')}: {e}")
            continue

    # Insert into database
    if groups_data:
        db.executemany(
            """
            INSERT OR REPLACE INTO groups
            (group_id, season_id, season_type_id, uid, name, abbreviation,
             short_name, midsize_name, slug, parent_group_id, is_conference,
             logo_url, api_ref)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            groups_data
        )
        db.commit()
        print(f"✓ Inserted {len(groups_data)} groups")

    return groups_data


def populate_teams(db: Database, client: ESPNAPIClient, year: int, limit: int = None):
    """Populate teams and team_seasons tables for a season.

    Args:
        db: Database connection
        client: API client
        year: Season year
        limit: Maximum teams to process (None = all)
    """
    print(f"\n=== Populating Teams for {year} ===")

    # Fetch team references
    print("Fetching teams from API...")
    team_refs = client.get_season_teams(year, limit=limit or 1000)

    if limit:
        team_refs = team_refs[:limit]

    print(f"Found {len(team_refs)} teams")

    # Process teams
    teams_data = []
    team_seasons_data = []

    for ref_obj in tqdm(team_refs, desc="Processing teams"):
        try:
            # Fetch full team data
            team_data = client.get_from_ref(ref_obj['$ref'])
            team_id = int(team_data.get('id', 0))

            # Parse base team data
            parsed_team = parse_team_data(team_data)
            teams_data.append(parsed_team)

            # Get season type ID (assuming regular season = 2)
            cursor = db.execute(
                "SELECT season_type_id FROM season_types WHERE season_id = ? AND type_id = 2",
                (year,)
            )
            row = cursor.fetchone()
            season_type_id = row[0] if row else None

            if season_type_id:
                # Parse team-season relationship
                # Try to extract group from team data
                groups = team_data.get('groups', {})
                group_id = None
                if groups:
                    group_ref = groups.get('$ref', '')
                    if group_ref:
                        try:
                            group_id = int(group_ref.split('/groups/')[-1].split('?')[0])
                        except:
                            pass

                team_seasons_data.append((
                    team_id,
                    year,
                    season_type_id,
                    group_id,
                    team_data.get('abbreviation', ''),
                    team_data.get('$ref', '')
                ))

        except Exception as e:
            print(f"Error processing team {ref_obj.get('$ref')}: {e}")
            continue

    # Insert teams
    print("Inserting teams into database...")
    db.executemany(
        """
        INSERT OR REPLACE INTO teams
        (team_id, uid, guid, slug, location, name, nickname, abbreviation,
         display_name, short_display_name, color, alternate_color,
         logo_url, logo_dark_url, is_active, is_all_star, api_ref)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        teams_data
    )

    # Insert team-season relationships
    print("Inserting team-season relationships...")
    db.executemany(
        """
        INSERT OR REPLACE INTO team_seasons
        (team_id, season_id, season_type_id, group_id, conference_abbreviation, api_ref)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        team_seasons_data
    )

    db.commit()
    print(f"✓ Inserted {len(teams_data)} teams and {len(team_seasons_data)} team-season records")


def main(year: int = 2026, limit_teams: int = None, populate_groups_flag: bool = True):
    """Main function to populate teams data.

    Args:
        year: Season year to populate
        limit_teams: Limit number of teams (None = all)
        populate_groups_flag: Whether to populate groups table
    """
    db = Database()
    client = ESPNAPIClient()

    try:
        db.connect()

        # Populate groups first (needed for team_seasons foreign key)
        if populate_groups_flag:
            populate_groups(db, client, year)

        # Populate teams
        populate_teams(db, client, year, limit=limit_teams)

        print(f"\n✓ Teams population for {year} completed successfully!")

    except Exception as e:
        print(f"\n✗ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == '__main__':
    import sys

    year = 2026
    limit = None

    if len(sys.argv) > 1:
        year = int(sys.argv[1])
    if len(sys.argv) > 2:
        limit = int(sys.argv[2])

    main(year=year, limit_teams=limit)
