#!/usr/bin/env python3
"""
Calculate prediction accuracy for completed games.

This script updates game_predictions with:
- home_prediction_correct / away_prediction_correct (boolean)
- margin_error (difference between predicted and actual margin)
"""

import sqlite3

DATABASE_PATH = "/Users/alexkamer/ncaab_manager/ncaab.db"


def main():
    print("NCAA Basketball - Calculate Prediction Accuracy")
    print("=" * 50)

    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get completed games with predictions but missing accuracy data
    cursor.execute("""
        SELECT
            e.event_id,
            e.home_score,
            e.away_score,
            p.prediction_id,
            p.home_win_probability,
            p.away_win_probability,
            p.home_predicted_margin,
            p.away_predicted_margin
        FROM events e
        JOIN game_predictions p ON e.event_id = p.event_id
        WHERE e.is_completed = 1
        AND e.home_score IS NOT NULL
        AND e.away_score IS NOT NULL
        AND p.home_win_probability IS NOT NULL
        AND p.margin_error IS NULL
    """)

    games = cursor.fetchall()
    total = len(games)

    if total == 0:
        print("No completed games need accuracy calculations.")
        conn.close()
        return

    print(f"\nProcessing {total} completed games...\n")

    updated = 0

    for game in games:
        event_id = game['event_id']
        home_score = game['home_score']
        away_score = game['away_score']
        home_win_prob = game['home_win_probability']
        away_win_prob = game['away_win_probability']
        home_pred_margin = game['home_predicted_margin']
        away_pred_margin = game['away_predicted_margin']

        # Determine actual winner
        home_won = home_score > away_score
        away_won = away_score > home_score

        # Determine if prediction was correct
        # A team's prediction is correct if they had >50% win probability and actually won
        home_prediction_correct = (home_win_prob > 50 and home_won)
        away_prediction_correct = (away_win_prob > 50 and away_won)

        # Calculate actual margin (from home team perspective)
        actual_margin = home_score - away_score

        # Calculate predicted margin (from home team perspective)
        predicted_margin = home_pred_margin if home_pred_margin is not None else 0

        # Calculate error (predicted - actual)
        margin_error = predicted_margin - actual_margin

        # Update database
        cursor.execute("""
            UPDATE game_predictions
            SET
                home_prediction_correct = ?,
                away_prediction_correct = ?,
                margin_error = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE prediction_id = ?
        """, (
            1 if home_prediction_correct else 0,
            1 if away_prediction_correct else 0,
            margin_error,
            game['prediction_id']
        ))

        updated += 1

        if updated % 100 == 0:
            print(f"  Progress: {updated}/{total}")
            conn.commit()

    conn.commit()
    conn.close()

    print(f"\n{'=' * 50}")
    print(f"✓ Complete!")
    print(f"  Updated accuracy for {updated} games")

    # Show some stats
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN home_prediction_correct = 1 OR away_prediction_correct = 1 THEN 1 ELSE 0 END) as correct,
            AVG(ABS(margin_error)) as avg_margin_error
        FROM game_predictions
        WHERE margin_error IS NOT NULL
    """)

    stats = cursor.fetchone()
    total_with_accuracy = stats[0]
    correct_predictions = stats[1]
    avg_error = stats[2]

    if total_with_accuracy > 0:
        accuracy_pct = (correct_predictions / total_with_accuracy) * 100
        print(f"\n  Overall Prediction Accuracy: {accuracy_pct:.1f}% ({correct_predictions}/{total_with_accuracy})")
        print(f"  Average Margin Error: {avg_error:.1f} points")

    conn.close()


if __name__ == "__main__":
    main()
