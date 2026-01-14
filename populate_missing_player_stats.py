"""
Populate player statistics for games that are missing them.
This script finds completed games without player stats and populates them.
"""
from database import Database
from api_client import ESPNAPIClient
from populate_game_details import populate_game_details


def main():
    db = Database()
    client = ESPNAPIClient()

    try:
        db.connect()

        # Find completed games without player statistics
        cursor = db.execute('''
            SELECT e.event_id
            FROM events e
            WHERE e.is_completed = 1
            AND NOT EXISTS (
                SELECT 1 FROM player_statistics ps
                WHERE ps.event_id = e.event_id
            )
            ORDER BY e.date DESC
        ''')

        event_ids = [row[0] for row in cursor.fetchall()]

        if not event_ids:
            print('✓ No games missing player statistics!')
            return

        print(f'Found {len(event_ids)} completed games missing player statistics')
        print(f'Populating player stats for these games...\n')

        # Populate game details (team stats, player stats, odds, predictions)
        populate_game_details(db, client, event_ids=event_ids)

        print(f'\n✓ Successfully populated player stats for {len(event_ids)} games!')

    except Exception as e:
        print(f'\n✗ Error: {e}')
        import traceback
        traceback.print_exc()
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == '__main__':
    main()
