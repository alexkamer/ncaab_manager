#!/usr/bin/env python3
"""Test script to populate a few predictions."""

import sqlite3
import urllib.request
import json

DATABASE_PATH = "/Users/alexkamer/ncaab_manager/ncaab.db"

def fetch_predictor_data(api_ref: str):
    """Fetch predictor data from ESPN API."""
    try:
        with urllib.request.urlopen(api_ref, timeout=10) as response:
            data = response.read()
            return json.loads(data)
    except Exception as e:
        print(f"Error fetching: {e}")
        return None


def parse_team_statistics(statistics: list):
    """Parse team statistics array."""
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


# Connect to database
conn = sqlite3.connect(DATABASE_PATH)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Get 5 predictions to test
cursor.execute("""
    SELECT prediction_id, event_id, api_ref
    FROM game_predictions
    WHERE api_ref IS NOT NULL
    AND home_win_probability IS NULL
    LIMIT 5
""")

predictions = cursor.fetchall()
print(f"Testing with {len(predictions)} predictions\n")

for row in predictions:
    prediction_id = row['prediction_id']
    event_id = row['event_id']
    api_ref = row['api_ref']

    print(f"Event {event_id}:")

    # Fetch data
    data = fetch_predictor_data(api_ref)
    if not data:
        print("  Failed to fetch\n")
        continue

    # Parse home team
    home_team = data.get('homeTeam', {})
    home_stats = home_team.get('statistics', [])
    home_parsed = parse_team_statistics(home_stats)

    # Parse away team
    away_team = data.get('awayTeam', {})
    away_stats = away_team.get('statistics', [])
    away_parsed = parse_team_statistics(away_stats)

    matchup_quality = home_parsed.get('matchup_quality')
    home_win_prob = home_parsed.get('win_probability')
    home_margin = home_parsed.get('predicted_margin')
    away_win_prob = away_parsed.get('win_probability')
    away_margin = away_parsed.get('predicted_margin')

    print(f"  Home: {home_win_prob}% win prob, {home_margin} margin")
    print(f"  Away: {away_win_prob}% win prob, {away_margin} margin")
    print(f"  Matchup quality: {matchup_quality}")

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
    """, (matchup_quality, home_win_prob, home_margin, away_win_prob, away_margin, prediction_id))

    print("  ✓ Updated\n")

conn.commit()
conn.close()
print("Done!")
