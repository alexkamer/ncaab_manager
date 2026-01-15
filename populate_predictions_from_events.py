#!/usr/bin/env python3
"""
Populate game predictions by iterating through events table.

This script goes through actual events in your database and fetches/updates
their predictions from ESPN API.

Usage: python3 populate_predictions_from_events.py
"""

import sqlite3
import urllib.request
import json
import time
import sys

DATABASE_PATH = "/Users/alexkamer/ncaab_manager/ncaab.db"


def fetch_predictor_data(event_id):
    """Fetch predictor data from ESPN API."""
    api_url = f"http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/events/{event_id}/competitions/{event_id}/predictor?lang=en&region=us"

    try:
        with urllib.request.urlopen(api_url, timeout=10) as response:
            data = json.loads(response.read())
        return data, api_url
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None, api_url  # No prediction available for this game
        raise
    except Exception as e:
        print(f"  Error fetching event {event_id}: {e}")
        return None, api_url


def parse_predictor_data(data):
    """Parse predictor data into database fields."""
    if not data:
        return None

    result = {
        'last_modified': data.get('lastModified'),
        'matchup_quality': None,
        'home_win_probability': None,
        'home_predicted_margin': None,
        'away_win_probability': None,
        'away_predicted_margin': None,
    }

    # Parse home team stats
    home_team = data.get('homeTeam', {})
    home_stats = home_team.get('statistics', [])
    for stat in home_stats:
        name = stat.get('name')
        value = stat.get('value')
        if name == 'matchupquality':
            result['matchup_quality'] = value
        elif name == 'teampredwinpct':
            result['home_win_probability'] = value
        elif name == 'teampredmov':
            result['home_predicted_margin'] = value

    # Parse away team stats
    away_team = data.get('awayTeam', {})
    away_stats = away_team.get('statistics', [])
    for stat in away_stats:
        name = stat.get('name')
        value = stat.get('value')
        if name == 'teampredwinpct':
            result['away_win_probability'] = value
        elif name == 'teampredmov':
            result['away_predicted_margin'] = value

    return result


def upsert_prediction(cursor, conn, event_id, parsed_data, api_ref):
    """Insert or update prediction for an event."""
    try:
        # Check if prediction exists
        cursor.execute("SELECT prediction_id FROM game_predictions WHERE event_id = ?", (event_id,))
        existing = cursor.fetchone()

        if existing:
            # Update existing
            cursor.execute("""
                UPDATE game_predictions
                SET
                    last_modified = ?,
                    matchup_quality = ?,
                    home_win_probability = ?,
                    home_predicted_margin = ?,
                    away_win_probability = ?,
                    away_predicted_margin = ?,
                    api_ref = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE event_id = ?
            """, (
                parsed_data['last_modified'],
                parsed_data['matchup_quality'],
                parsed_data['home_win_probability'],
                parsed_data['home_predicted_margin'],
                parsed_data['away_win_probability'],
                parsed_data['away_predicted_margin'],
                api_ref,
                event_id
            ))
        else:
            # Insert new
            cursor.execute("""
                INSERT INTO game_predictions (
                    event_id, last_modified, matchup_quality,
                    home_win_probability, home_predicted_margin,
                    away_win_probability, away_predicted_margin,
                    api_ref
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event_id,
                parsed_data['last_modified'],
                parsed_data['matchup_quality'],
                parsed_data['home_win_probability'],
                parsed_data['home_predicted_margin'],
                parsed_data['away_win_probability'],
                parsed_data['away_predicted_margin'],
                api_ref
            ))

        conn.commit()
        return True
    except Exception as e:
        print(f"  Error upserting prediction for event {event_id}: {e}")
        return False


def main():
    print(f"NCAA Basketball - Populate Predictions from Events")
    print("=" * 50)

    # Connect to database
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get events that either:
    # 1. Don't have predictions yet, OR
    # 2. Have predictions but missing win probability data
    cursor.execute("""
        SELECT e.event_id, e.date
        FROM events e
        LEFT JOIN game_predictions gp ON e.event_id = gp.event_id
        WHERE gp.prediction_id IS NULL
           OR gp.home_win_probability IS NULL
        ORDER BY e.date DESC
    """)
    events = cursor.fetchall()
    total = len(events)

    if total == 0:
        print("All events have complete predictions!")
        conn.close()
        return

    print(f"\nProcessing {total} events...\n")

    success_count = 0
    not_available_count = 0
    error_count = 0
    start_time = time.time()

    for i, row in enumerate(events, 1):
        event_id = row['event_id']

        # Fetch prediction data
        data, api_ref = fetch_predictor_data(event_id)

        if data is None:
            not_available_count += 1
            # Still update the api_ref even if no data
            cursor.execute("""
                INSERT OR IGNORE INTO game_predictions (event_id, api_ref)
                VALUES (?, ?)
            """, (event_id, api_ref))
            conn.commit()
        else:
            # Parse the data
            parsed = parse_predictor_data(data)

            if parsed and (parsed['home_win_probability'] or parsed['away_win_probability']):
                # Upsert to database
                if upsert_prediction(cursor, conn, event_id, parsed, api_ref):
                    success_count += 1
                else:
                    error_count += 1
            else:
                not_available_count += 1

        # Progress update
        if i % 10 == 0 or i == total:
            elapsed = time.time() - start_time
            rate = i / elapsed if elapsed > 0 else 0
            eta = (total - i) / rate if rate > 0 else 0
            print(f"  Progress: {i}/{total} ({success_count} success, {not_available_count} N/A, {error_count} errors) - {rate:.1f}/sec - ETA: {eta:.0f}s")

        # Rate limiting
        time.sleep(0.15)

    conn.close()

    elapsed = time.time() - start_time
    print("\n" + "=" * 50)
    print(f"✓ Complete!")
    print(f"  Total events processed: {total}")
    print(f"  Predictions populated: {success_count}")
    print(f"  Not available: {not_available_count}")
    print(f"  Errors: {error_count}")
    print(f"  Time: {elapsed:.1f}s ({total/elapsed:.1f} events/sec)")


if __name__ == "__main__":
    main()
