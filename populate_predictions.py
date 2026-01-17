#!/usr/bin/env python3
"""
Populate game predictions data from ESPN API references.

This script reads existing game_predictions records that have api_ref URLs
but missing actual prediction data, fetches the data from ESPN, and updates
the database with win probabilities and predicted margins.
"""

import sqlite3
import urllib.request
import json
import time
from typing import Optional, Dict, Any
from concurrent.futures import ThreadPoolExecutor, as_completed

DATABASE_PATH = "/Users/alexkamer/ncaab_manager/ncaab.db"

def get_db_connection():
    """Create database connection."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def fetch_predictor_data(api_ref: str) -> Optional[Dict[str, Any]]:
    """Fetch predictor data from ESPN API."""
    try:
        with urllib.request.urlopen(api_ref, timeout=10) as response:
            data = response.read()
            return json.loads(data)
    except Exception as e:
        print(f"  Error fetching {api_ref}: {e}")
        return None


def parse_team_statistics(statistics: list) -> Dict[str, Any]:
    """Parse team statistics array from ESPN predictor API."""
    result = {}

    for stat in statistics:
        name = stat.get('name')
        value = stat.get('value')

        if name == 'matchupquality':
            result['matchup_quality'] = value
        elif name == 'teampredwinpct':
            result['win_probability'] = value
        elif name == 'teampredmov':
            result['predicted_margin'] = value

    return result


def parse_predictor_response(data: Dict[str, Any]) -> Dict[str, Any]:
    """Parse the predictor API response into database fields."""
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
    home_parsed = parse_team_statistics(home_stats)

    result['home_win_probability'] = home_parsed.get('win_probability')
    result['home_predicted_margin'] = home_parsed.get('predicted_margin')
    result['matchup_quality'] = home_parsed.get('matchup_quality')  # Same for both teams

    # Parse away team stats
    away_team = data.get('awayTeam', {})
    away_stats = away_team.get('statistics', [])
    away_parsed = parse_team_statistics(away_stats)

    result['away_win_probability'] = away_parsed.get('win_probability')
    result['away_predicted_margin'] = away_parsed.get('predicted_margin')

    return result


def update_prediction(conn: sqlite3.Connection, prediction_id: int, event_id: int,
                     parsed_data: Dict[str, Any]) -> bool:
    """Update a prediction record with parsed data."""
    try:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE game_predictions
            SET
                last_modified = ?,
                matchup_quality = ?,
                home_win_probability = ?,
                home_predicted_margin = ?,
                away_win_probability = ?,
                away_predicted_margin = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE prediction_id = ?
        """, (
            parsed_data['last_modified'],
            parsed_data['matchup_quality'],
            parsed_data['home_win_probability'],
            parsed_data['home_predicted_margin'],
            parsed_data['away_win_probability'],
            parsed_data['away_predicted_margin'],
            prediction_id
        ))
        conn.commit()
        return True
    except Exception as e:
        print(f"  Error updating prediction {prediction_id}: {e}")
        return False


def process_prediction(row: sqlite3.Row) -> tuple:
    """Process a single prediction record."""
    prediction_id = row['prediction_id']
    event_id = row['event_id']
    api_ref = row['api_ref']

    # Fetch data from API
    data = fetch_predictor_data(api_ref)
    if not data:
        return (prediction_id, event_id, False, "Failed to fetch")

    # Parse the response
    parsed = parse_predictor_response(data)

    # Check if we got valid data
    if parsed['home_win_probability'] is None and parsed['away_win_probability'] is None:
        return (prediction_id, event_id, False, "No win probability data")

    return (prediction_id, event_id, True, parsed)


def main():
    """Main execution function."""
    print("NCAA Basketball - Populate Predictions Data")
    print("=" * 50)

    # Connect to database
    conn = get_db_connection()
    cursor = conn.cursor()

    # Get predictions that need data
    print("\nFetching predictions with missing data...")
    cursor.execute("""
        SELECT prediction_id, event_id, api_ref
        FROM game_predictions
        WHERE api_ref IS NOT NULL
        AND (home_win_probability IS NULL OR away_win_probability IS NULL)
        ORDER BY prediction_id
    """)

    predictions = cursor.fetchall()
    total = len(predictions)

    if total == 0:
        print("No predictions need updating.")
        conn.close()
        return

    print(f"Found {total} predictions to update")
    print("\nProcessing predictions...")

    success_count = 0
    error_count = 0

    # Process sequentially with rate limiting
    for i, row in enumerate(predictions, 1):
        prediction_id, event_id, success, result = process_prediction(row)

        if success:
            # Update database
            if update_prediction(conn, prediction_id, event_id, result):
                success_count += 1
            else:
                error_count += 1
        else:
            error_count += 1
            if error_count <= 10:  # Only print first 10 errors
                print(f"  Event {event_id}: {result}")

        # Progress update every 100 records
        if i % 100 == 0:
            print(f"  Progress: {i}/{total} ({success_count} success, {error_count} errors)")

        # Rate limiting - be nice to ESPN
        time.sleep(0.2)

    conn.close()

    print("\n" + "=" * 50)
    print(f"✓ Processing complete!")
    print(f"  Total predictions processed: {total}")
    print(f"  Successfully updated: {success_count}")
    print(f"  Errors: {error_count}")
    print(f"  Success rate: {success_count/total*100:.1f}%")


if __name__ == "__main__":
    main()
