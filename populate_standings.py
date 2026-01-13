"""
Populate conference standings for NCAA Basketball seasons.
"""
from typing import List
from tqdm import tqdm

from database import Database
from api_client import ESPNAPIClient


def populate_standings_for_season(db: Database, client: ESPNAPIClient, season: int, season_type_id: int = 2, fetch_conferences: bool = True):
    """Populate standings for a specific season.

    Args:
        db: Database connection
        client: API client
        season: Season year
        season_type_id: Season type ID (default 2 = Regular Season)
        fetch_conferences: If True, also fetch conference-specific standings (default True)
    """
    print(f"\n=== Populating Standings for {season} (Type ID: {season_type_id}) ===")

    try:
        # If fetch_conferences is True, get all conferences from the database
        # and fetch their standings individually
        if fetch_conferences:
            print("Fetching conference-specific standings...")
            cursor = db.execute("SELECT group_id, name FROM groups WHERE name NOT LIKE '%Division%' ORDER BY name")
            conferences = cursor.fetchall()

            groups_to_process = [{'$ref': f"{client.base_url}/seasons/{season}/types/{season_type_id}/groups/{conf[0]}", 'id': conf[0], 'name': conf[1]} for conf in conferences]
        else:
            # First, get all groups/conferences for this season
            print("Fetching conferences...")
            groups = client.get_groups(season, season_type_id)
            groups_to_process = groups

        if not groups_to_process:
            print(f"No conferences found for season {season}")
            return

        print(f"Found {len(groups_to_process)} conferences")

        all_standings = []

        for group_info in tqdm(groups_to_process, desc="Processing conferences"):
            try:
                # Get the group data if not already in the dict
                if 'id' in group_info and 'name' in group_info:
                    group_id = group_info['id']
                    group_name = group_info['name']
                else:
                    group_data = client.get_from_ref(group_info['$ref'])
                    group_id = group_data.get('id')
                    group_name = group_data.get('name', 'Unknown')

                # Try to fetch standings directly using the API pattern
                # Pattern: /seasons/{year}/types/{type_id}/groups/{group_id}/standings/0
                standings_url = f"{client.base_url}/seasons/{season}/types/{season_type_id}/groups/{group_id}/standings/0"

                try:
                    standings_data = client.get_from_ref(standings_url)
                except Exception as e:
                    print(f"  No standings for {group_name}: {e}")
                    continue

                # Get standings entries - the API structure has "standings" array
                entries = standings_data.get('standings', [])

                if not entries:
                    print(f"  No entries in standings for {group_name}")
                    continue

                print(f"  Processing {len(entries)} teams in {group_name}")

                for entry in entries:
                    try:
                        # Get team ID from reference
                        team = entry.get('team', {})
                        team_ref = team.get('$ref', '') if isinstance(team, dict) else ''

                        if team_ref:
                            team_id = int(team_ref.split('/')[-1].split('?')[0])
                        else:
                            continue

                        # Extract stats from the records array
                        # The API has records[] with each record having stats[]
                        records = entry.get('records', [])

                        stats_dict = {}
                        wins = 0
                        losses = 0
                        win_pct = 0.0
                        conf_wins = 0
                        conf_losses = 0
                        conf_win_pct = 0.0
                        home_wins = 0
                        home_losses = 0
                        road_wins = 0
                        road_losses = 0

                        for record in records:
                            record_name = record.get('name', '').lower()
                            record_type = record.get('type', '')

                            # Extract wins and losses from summary like "4-12"
                            summary = record.get('summary', '')
                            if summary and '-' in summary:
                                parts = summary.split('-')
                                if len(parts) == 2:
                                    try:
                                        rec_wins = int(parts[0])
                                        rec_losses = int(parts[1])

                                        if record_name == 'overall' or record_type == 'total':
                                            wins = rec_wins
                                            losses = rec_losses
                                            win_pct = record.get('value', 0.0)
                                        elif record_name in ('vsconf', 'vs. conf.', 'vs conf') or 'conf' in record_name:
                                            conf_wins = rec_wins
                                            conf_losses = rec_losses
                                            conf_win_pct = record.get('value', 0.0)
                                        elif record_name == 'home':
                                            home_wins = rec_wins
                                            home_losses = rec_losses
                                        elif record_name == 'road':
                                            road_wins = rec_wins
                                            road_losses = rec_losses
                                    except (ValueError, IndexError):
                                        pass

                            # Extract stats from the stats array within each record
                            stats = record.get('stats', [])
                            for stat in stats:
                                stat_name = stat.get('name', '').lower()
                                stat_value = stat.get('value', 0)
                                stats_dict[stat_name] = stat_value

                        games_played = wins + losses

                        # Division record (if available)
                        div_wins = 0
                        div_losses = 0
                        div_win_pct = 0.0

                        # Standings info
                        playoff_seed = stats_dict.get('rank', stats_dict.get('playoffseed'))
                        games_behind = stats_dict.get('gamesbehind', 0)

                        # Streak
                        streak = stats_dict.get('streak', stats_dict.get('currentstreak', ''))
                        if isinstance(streak, (int, float)):
                            streak = str(int(streak))
                        streak_count = 0
                        if streak and isinstance(streak, str):
                            # Extract number from streak like "W3" or "L2"
                            try:
                                streak_count = int(''.join(filter(str.isdigit, streak)))
                            except ValueError:
                                streak_count = 0

                        # OT records
                        ot_wins = stats_dict.get('otwins', 0)
                        ot_losses = stats_dict.get('otlosses', 0)

                        # Points
                        points_for = stats_dict.get('pointsfor', 0)
                        points_against = stats_dict.get('pointsagainst', 0)
                        avg_points_for = stats_dict.get('avgpointsfor', 0)
                        avg_points_against = stats_dict.get('avgpointsagainst', 0)
                        point_diff = stats_dict.get('differential', stats_dict.get('pointdifferential', 0))
                        avg_point_diff = stats_dict.get('avgdifferential', stats_dict.get('avgpointdifferential', 0))

                        all_standings.append((
                            season, season_type_id, group_id, team_id,
                            wins, losses, win_pct, games_played,
                            conf_wins, conf_losses, conf_win_pct,
                            div_wins, div_losses, div_win_pct,
                            playoff_seed, games_behind,
                            ot_wins, ot_losses,
                            points_for, points_against, avg_points_for, avg_points_against,
                            point_diff, avg_point_diff,
                            streak, streak_count,
                            home_wins, home_losses, road_wins, road_losses
                        ))

                    except Exception as e:
                        print(f"    Error processing team entry: {e}")
                        continue

            except Exception as e:
                print(f"  Error processing conference: {e}")
                continue

        # Insert standings
        if all_standings:
            db.executemany(
                """
                INSERT OR REPLACE INTO standings
                (season_id, season_type_id, group_id, team_id,
                 wins, losses, win_percentage, games_played,
                 conference_wins, conference_losses, conference_win_percentage,
                 division_wins, division_losses, division_win_percentage,
                 playoff_seed, games_behind,
                 ot_wins, ot_losses,
                 points_for, points_against, avg_points_for, avg_points_against,
                 point_differential, avg_point_differential,
                 current_streak, streak_count,
                 home_wins, home_losses, road_wins, road_losses)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                all_standings
            )
            db.commit()
            print(f"✓ Inserted {len(all_standings)} standing entries")
        else:
            print("No standings data to insert")

    except Exception as e:
        print(f"Error fetching standings: {e}")
        import traceback
        traceback.print_exc()


def main(seasons: List[int]):
    """Main function to populate standings.

    Args:
        seasons: List of season years (e.g., [2024, 2025, 2026])
    """
    print(f"\n{'='*60}")
    print(f"POPULATING STANDINGS FOR SEASONS: {', '.join(map(str, seasons))}")
    print(f"{'='*60}")

    db = Database()
    client = ESPNAPIClient()

    try:
        db.connect()

        # Populate standings for each season
        for season in seasons:
            populate_standings_for_season(db, client, season)

        print(f"\n{'='*60}")
        print("STANDINGS POPULATION COMPLETE")
        print(f"{'='*60}")

        # Print summary
        print("\nDatabase Summary:")
        print("-" * 40)

        stats = [
            ("Total Standings", "SELECT COUNT(*) FROM standings"),
            ("Seasons with Standings", "SELECT COUNT(DISTINCT season_id) FROM standings"),
            ("Conferences Covered", "SELECT COUNT(DISTINCT group_id) FROM standings"),
            ("Teams in Standings", "SELECT COUNT(DISTINCT team_id) FROM standings"),
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
        print("Usage: python populate_standings.py <year1> [year2] [year3] ...")
        print()
        print("Examples:")
        print("  python populate_standings.py 2026")
        print("  python populate_standings.py 2024 2025 2026")
        sys.exit(1)

    seasons = [int(year) for year in sys.argv[1:]]
    main(seasons=seasons)
