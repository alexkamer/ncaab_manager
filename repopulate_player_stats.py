"""
Re-populate all player statistics with corrected stat mapping.
Run this after fixing the stat array mapping in populate_game_details.py
"""
from database import Database
from api_client import ESPNAPIClient
from populate_game_details import populate_game_details


def main():
    db = Database()
    client = ESPNAPIClient()

    try:
        db.connect()

        # Get all completed events first (before deleting player stats)
        cursor = db.execute('''
            SELECT event_id
            FROM events
            WHERE is_completed = 1
            ORDER BY date DESC
        ''')
        event_ids = [row[0] for row in cursor.fetchall()]

        print(f'Found {len(event_ids)} completed games to re-populate')

        # Delete all existing player statistics
        print('Deleting existing player statistics...')
        db.execute('DELETE FROM player_statistics')
        db.commit()
        print('✓ Deleted all player statistics')

        # Re-populate with corrected mapping
        print('\nRe-populating with corrected stat mapping...')
        populate_game_details(db, client, event_ids=event_ids)

        print('\n✓ Re-population complete!')

    except Exception as e:
        print(f'\n✗ Error: {e}')
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == '__main__':
    main()
