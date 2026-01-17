#!/usr/bin/env python3
"""
Populate game predictions in batches.
Usage: python populate_predictions_batch.py [limit]
"""

import sqlite3
import urllib.request
import json
import time
import sys

DATABASE_PATH = "/Users/alexkamer/ncaab_manager/ncaab.db"

def fetch_and_update_prediction(cursor, conn, row):
    """Fetch and update a single prediction."""
    prediction_id = row['prediction_id']
    event_id = row['event_id']
    api_ref = row['api_ref']

    try:
        # Fetch data
        with urllib.request.urlopen(api_ref, timeout=10) as response:
            data = json.loads(response.read())

        # Parse home team
        home_team = data.get('homeTeam', {})
        home_stats = home_team.get('statistics', [])
        home_parsed = {}
        for stat in home_stats:
            name = stat.get('name')
            value = stat.get('value')
            if name == 'matchupquality':
                home_parsed['matchup_quality'] = value
            elif name == 'teampredwinpct':
                home_parsed['win_probability'] = value
            elif name == 'teampredmov':
                home_parsed['predicted_margin'] = value

        # Parse away team
        away_team = data.get('awayTeam', {})
        away_stats = away_team.get('statistics', [])
        away_parsed = {}
        for stat in away_stats:
            name = stat.get('name')
            value = stat.get('value')
            if name == 'teampredwinpct':
                away_parsed['win_probability'] = value
            elif name == 'teampredmov':
                away_parsed['predicted_margin'] = value

        # Update database
        cursor.execute("""
            UPDATE game_predictions
            SET
                matchup_quality = ?,
                home_win_probability = ?,
                home_predicted_margin = ?,
                away_win_probability = ?,
                away_predicted_margin = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE prediction_id = ?
        """, (
            home_parsed.get('matchup_quality'),
            home_parsed.get('win_probability'),
            home_parsed.get('predicted_margin'),
            away_parsed.get('win_probability'),
            away_parsed.get('predicted_margin'),
            prediction_id
        ))

        return True, event_id

    except Exception as e:
        return False, event_id


def main():
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 100

    print(f"NCAA Basketball - Populate Predictions (Batch Mode)")
    print(f"Processing up to {limit} records")
    print("=" * 50)

    # Connect to database
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get predictions that need data - ONLY for events that exist in events table
    cursor.execute("""
        SELECT gp.prediction_id, gp.event_id, gp.api_ref
        FROM game_predictions gp
        INNER JOIN events e ON gp.event_id = e.event_id
        WHERE gp.api_ref IS NOT NULL
        AND gp.home_win_probability IS NULL
        LIMIT ?
    """, (limit,))

    predictions = cursor.fetchall()
    total = len(predictions)

    if total == 0:
        print("No predictions need updating.")
        conn.close()
        return

    print(f"\nProcessing {total} predictions...\n")

    success_count = 0
    error_count = 0
    start_time = time.time()

    for i, row in enumerate(predictions, 1):
        success, event_id = fetch_and_update_prediction(cursor, conn, row)

        if success:
            success_count += 1
        else:
            error_count += 1

        # Progress update
        if i % 10 == 0 or i == total:
            elapsed = time.time() - start_time
            rate = i / elapsed if elapsed > 0 else 0
            eta = (total - i) / rate if rate > 0 else 0
            print(f"  Progress: {i}/{total} ({success_count} success, {error_count} errors) - {rate:.1f}/sec - ETA: {eta:.0f}s")

        # Commit every 10 records
        if i % 10 == 0:
            conn.commit()

        # Rate limiting
        time.sleep(0.15)

    # Final commit
    conn.commit()
    conn.close()

    elapsed = time.time() - start_time
    print("\n" + "=" * 50)
    print(f"✓ Complete!")
    print(f"  Processed: {total}")
    print(f"  Success: {success_count}")
    print(f"  Errors: {error_count}")
    print(f"  Time: {elapsed:.1f}s ({total/elapsed:.1f} records/sec)")


if __name__ == "__main__":
    main()
