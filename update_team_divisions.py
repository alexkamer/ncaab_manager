#!/usr/bin/env python3
"""
Update team division IDs in the database by fetching from ESPN API.
"""

import sqlite3
import httpx
import asyncio
import time

DATABASE_PATH = "/Users/alexkamer/ncaab_manager/ncaab.db"


async def fetch_team_division(client: httpx.AsyncClient, team_id: int) -> int | None:
    """Fetch team division from ESPN API."""
    try:
        url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/{team_id}"
        response = await client.get(url, timeout=10.0)

        if response.status_code == 200:
            data = response.json()
            groups = data.get('team', {}).get('groups', {})
            parent_id = groups.get('parent', {}).get('id')

            if parent_id:
                return int(parent_id)

        return None
    except Exception as e:
        print(f"Error fetching division for team {team_id}: {e}")
        return None


async def update_all_divisions():
    """Update division_id for all teams in events."""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    # Get all unique team IDs from events
    cursor.execute("""
        SELECT DISTINCT team_id FROM (
            SELECT home_team_id as team_id FROM events
            UNION
            SELECT away_team_id as team_id FROM events
        ) ORDER BY team_id
    """)

    team_ids = [row[0] for row in cursor.fetchall()]
    print(f"Found {len(team_ids)} unique teams to update")

    async with httpx.AsyncClient() as client:
        updated = 0
        d1_count = 0
        non_d1_count = 0
        failed = 0

        for i, team_id in enumerate(team_ids, 1):
            division_id = await fetch_team_division(client, team_id)

            if division_id:
                cursor.execute(
                    "UPDATE teams SET division_id = ? WHERE team_id = ?",
                    (division_id, team_id)
                )
                updated += 1

                if division_id == 50:
                    d1_count += 1
                else:
                    non_d1_count += 1
                    # Print non-D1 teams for verification
                    cursor.execute("SELECT display_name FROM teams WHERE team_id = ?", (team_id,))
                    team_name = cursor.fetchone()
                    if team_name:
                        print(f"  Non-D1 team: {team_name[0]} (ID: {team_id}, Division: {division_id})")
            else:
                failed += 1
                print(f"  Failed to fetch division for team_id: {team_id}")

            if i % 50 == 0:
                print(f"Progress: {i}/{len(team_ids)} teams processed")
                conn.commit()

            # Rate limiting
            await asyncio.sleep(0.1)

        conn.commit()
        print(f"\nUpdate complete!")
        print(f"Total teams updated: {updated}")
        print(f"  - Division I (50): {d1_count}")
        print(f"  - Non-D1: {non_d1_count}")
        print(f"  - Failed: {failed}")

    conn.close()


if __name__ == "__main__":
    asyncio.run(update_all_divisions())
