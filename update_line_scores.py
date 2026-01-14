#!/usr/bin/env python3
"""
Update line scores for existing completed games in the database.
Fetches line scores from ESPN API and stores them in the events table.
"""
import json
import sqlite3
import urllib.request
import time
from tqdm import tqdm

def fetch_line_scores(event_id):
    """Fetch line scores from ESPN API."""
    try:
        url = f'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary?event={event_id}'
        with urllib.request.urlopen(url, timeout=10) as response:
            data = json.loads(response.read())

        header = data.get('header', {})
        competition = header.get('competitions', [{}])[0]
        competitors = competition.get('competitors', [])

        home_team = next((c for c in competitors if c.get('homeAway') == 'home'), {})
        away_team = next((c for c in competitors if c.get('homeAway') == 'away'), {})

        home_line_scores = [ls.get('displayValue', '0') for ls in home_team.get('linescores', [])]
        away_line_scores = [ls.get('displayValue', '0') for ls in away_team.get('linescores', [])]

        if home_line_scores and away_line_scores:
            return json.dumps(home_line_scores), json.dumps(away_line_scores)
        return None, None
    except Exception as e:
        print(f"Error fetching event {event_id}: {e}")
        return None, None

def main():
    conn = sqlite3.connect('ncaab.db')
    cursor = conn.cursor()

    # Get all completed games without line scores
    cursor.execute("""
        SELECT event_id
        FROM events
        WHERE is_completed = 1
        AND (home_line_scores IS NULL OR away_line_scores IS NULL)
        ORDER BY date DESC
    """)

    event_ids = [row[0] for row in cursor.fetchall()]
    print(f"Found {len(event_ids)} completed games without line scores")

    if not event_ids:
        print("All completed games already have line scores!")
        return

    updated = 0
    failed = 0

    for event_id in tqdm(event_ids, desc="Updating line scores"):
        home_scores, away_scores = fetch_line_scores(event_id)

        if home_scores and away_scores:
            cursor.execute("""
                UPDATE events
                SET home_line_scores = ?, away_line_scores = ?
                WHERE event_id = ?
            """, (home_scores, away_scores, event_id))
            updated += 1
        else:
            failed += 1

        # Rate limit to avoid overwhelming ESPN API
        time.sleep(0.1)

        # Commit every 100 updates
        if updated % 100 == 0:
            conn.commit()

    conn.commit()
    conn.close()

    print(f"\n✓ Updated {updated} games")
    print(f"✗ Failed to fetch {failed} games")

if __name__ == '__main__':
    main()
