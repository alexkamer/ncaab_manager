-- Update home_score and away_score in events table from team_statistics
-- Score calculation: (field_goals_made - three_point_made) * 2 + three_point_made * 3 + free_throws_made

-- Update home scores
UPDATE events
SET home_score = (
    SELECT
        COALESCE((ts.field_goals_made - ts.three_point_made) * 2, 0) +
        COALESCE(ts.three_point_made * 3, 0) +
        COALESCE(ts.free_throws_made, 0)
    FROM team_statistics ts
    WHERE ts.event_id = events.event_id
    AND ts.home_away = 'home'
    AND ts.field_goals_made IS NOT NULL
)
WHERE EXISTS (
    SELECT 1 FROM team_statistics ts
    WHERE ts.event_id = events.event_id
    AND ts.home_away = 'home'
    AND ts.field_goals_made IS NOT NULL
);

-- Update away scores
UPDATE events
SET away_score = (
    SELECT
        COALESCE((ts.field_goals_made - ts.three_point_made) * 2, 0) +
        COALESCE(ts.three_point_made * 3, 0) +
        COALESCE(ts.free_throws_made, 0)
    FROM team_statistics ts
    WHERE ts.event_id = events.event_id
    AND ts.home_away = 'away'
    AND ts.field_goals_made IS NOT NULL
)
WHERE EXISTS (
    SELECT 1 FROM team_statistics ts
    WHERE ts.event_id = events.event_id
    AND ts.home_away = 'away'
    AND ts.field_goals_made IS NOT NULL
);

-- Verify the update
SELECT
    COUNT(*) as total_games,
    COUNT(CASE WHEN home_score IS NOT NULL AND home_score > 0 THEN 1 END) as games_with_home_score,
    COUNT(CASE WHEN away_score IS NOT NULL AND away_score > 0 THEN 1 END) as games_with_away_score
FROM events;
