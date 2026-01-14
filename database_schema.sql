-- ============================================================================
-- NCAA BASKETBALL DATABASE SCHEMA
-- ============================================================================
-- Based on ESPN API structure documented in ESPN_API_DOCS.md
-- ============================================================================

-- ============================================================================
-- SEASONS TABLE
-- ============================================================================
-- Stores information about each basketball season
-- API Source: /seasons endpoint
-- ============================================================================

CREATE TABLE seasons (
    -- Primary Key
    season_id INTEGER PRIMARY KEY,

    -- Season Information
    year INTEGER NOT NULL UNIQUE,
    display_name VARCHAR(100),

    -- API Reference
    api_ref TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick year lookups
CREATE INDEX idx_seasons_year ON seasons(year);

-- ============================================================================
-- SEASON TYPES TABLE
-- ============================================================================
-- Stores different types within a season (preseason, regular, postseason, etc.)
-- API Source: /seasons/{year}/types endpoint
-- ============================================================================

CREATE TABLE season_types (
    -- Primary Key
    season_type_id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Foreign Key
    season_id INTEGER NOT NULL,

    -- Type Information
    type_id INTEGER NOT NULL,
    type_name VARCHAR(50) NOT NULL,
    abbreviation VARCHAR(10),
    slug VARCHAR(100),

    -- Date Range
    start_date TIMESTAMP,
    end_date TIMESTAMP,

    -- Flags
    has_groups BOOLEAN DEFAULT FALSE,
    has_standings BOOLEAN DEFAULT FALSE,
    has_legs BOOLEAN DEFAULT FALSE,

    -- API Reference
    api_ref TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key Constraints
    FOREIGN KEY (season_id) REFERENCES seasons(season_id) ON DELETE CASCADE,

    -- Unique Constraint
    UNIQUE(season_id, type_id)
);

-- Indexes
CREATE INDEX idx_season_types_season ON season_types(season_id);
CREATE INDEX idx_season_types_type ON season_types(type_id);
CREATE INDEX idx_season_types_slug ON season_types(slug);

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- Season Types (type_id):
--   1 = Preseason
--   2 = Regular Season
--   3 = Postseason
--   4 = Off Season
--
-- The seasons table stores basic season information (88 seasons from 1939-2026)
-- The season_types table stores the different phases within each season
--
-- Typical workflow:
--   1. Populate seasons table from /seasons endpoint
--   2. For each season, populate season_types from /seasons/{year}/types
--   3. Regular Season (type_id=2) is where most data lives (standings, groups, etc.)
--
-- ============================================================================

-- ============================================================================
-- GROUPS TABLE
-- ============================================================================
-- Stores divisions and conferences (hierarchical structure)
-- API Source: /seasons/{year}/types/{type_id}/groups endpoint
-- ============================================================================

CREATE TABLE groups (
    -- Primary Key
    group_id INTEGER PRIMARY KEY,

    -- Foreign Key (optional - for season-specific data)
    season_id INTEGER,
    season_type_id INTEGER,

    -- Group Information
    uid VARCHAR(100) UNIQUE,
    name VARCHAR(200) NOT NULL,
    abbreviation VARCHAR(20),
    short_name VARCHAR(100),
    midsize_name VARCHAR(150),
    slug VARCHAR(200),

    -- Hierarchy
    parent_group_id INTEGER,
    is_conference BOOLEAN DEFAULT FALSE,

    -- Branding
    logo_url TEXT,

    -- API Reference
    api_ref TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key Constraints
    FOREIGN KEY (season_id) REFERENCES seasons(season_id) ON DELETE CASCADE,
    FOREIGN KEY (season_type_id) REFERENCES season_types(season_type_id) ON DELETE CASCADE,
    FOREIGN KEY (parent_group_id) REFERENCES groups(group_id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_groups_season ON groups(season_id);
CREATE INDEX idx_groups_season_type ON groups(season_type_id);
CREATE INDEX idx_groups_parent ON groups(parent_group_id);
CREATE INDEX idx_groups_slug ON groups(slug);
CREATE INDEX idx_groups_is_conference ON groups(is_conference);

-- ============================================================================
-- TEAMS TABLE
-- ============================================================================
-- Stores team information (base team data, not season-specific)
-- API Source: /seasons/{year}/teams/{team_id} endpoint
-- ============================================================================

CREATE TABLE teams (
    -- Primary Key
    team_id INTEGER PRIMARY KEY,

    -- Team Identification
    uid VARCHAR(100) UNIQUE,
    guid VARCHAR(100),
    slug VARCHAR(200) NOT NULL,

    -- Team Names
    location VARCHAR(200),
    name VARCHAR(200) NOT NULL,
    nickname VARCHAR(200),
    abbreviation VARCHAR(20),
    display_name VARCHAR(200),
    short_display_name VARCHAR(200),

    -- Branding
    color VARCHAR(10),
    alternate_color VARCHAR(10),

    -- Logos (storing primary logo URL, full logo data can be JSON)
    logo_url TEXT,
    logo_dark_url TEXT,

    -- Flags
    is_active BOOLEAN DEFAULT TRUE,
    is_all_star BOOLEAN DEFAULT FALSE,

    -- Venue Information (can be expanded to separate table if needed)
    venue_id INTEGER,
    venue_name VARCHAR(200),
    venue_city VARCHAR(100),
    venue_state VARCHAR(50),

    -- College Reference
    college_id INTEGER,

    -- API Reference
    api_ref TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_teams_slug ON teams(slug);
CREATE INDEX idx_teams_abbreviation ON teams(abbreviation);
CREATE INDEX idx_teams_is_active ON teams(is_active);
CREATE INDEX idx_teams_venue ON teams(venue_id);

-- ============================================================================
-- TEAM_SEASONS TABLE
-- ============================================================================
-- Junction table linking teams to specific seasons and groups/conferences
-- Handles team membership which can change over seasons
-- ============================================================================

CREATE TABLE team_seasons (
    -- Primary Key
    team_season_id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Foreign Keys
    team_id INTEGER NOT NULL,
    season_id INTEGER NOT NULL,
    season_type_id INTEGER NOT NULL,
    group_id INTEGER,

    -- Season-specific data
    conference_abbreviation VARCHAR(20),

    -- API Reference
    api_ref TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key Constraints
    FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
    FOREIGN KEY (season_id) REFERENCES seasons(season_id) ON DELETE CASCADE,
    FOREIGN KEY (season_type_id) REFERENCES season_types(season_type_id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE SET NULL,

    -- Unique Constraint
    UNIQUE(team_id, season_id, season_type_id)
);

-- Indexes
CREATE INDEX idx_team_seasons_team ON team_seasons(team_id);
CREATE INDEX idx_team_seasons_season ON team_seasons(season_id);
CREATE INDEX idx_team_seasons_season_type ON team_seasons(season_type_id);
CREATE INDEX idx_team_seasons_group ON team_seasons(group_id);

-- ============================================================================
-- NOTES: GROUPS, TEAMS, AND RELATIONSHIPS
-- ============================================================================
--
-- GROUPS:
--   - Hierarchical structure: Division I (group_id=50) → Conferences (31 children)
--   - is_conference=FALSE for divisions, TRUE for conferences
--   - Parent-child relationship tracked via parent_group_id
--
-- TEAMS:
--   - Base team information that doesn't change often
--   - 1,105 teams across all divisions in 2026 season
--   - Logos stored as URLs (can fetch on demand)
--
-- TEAM_SEASONS:
--   - Junction table handling many-to-many relationship
--   - Teams can change conferences between seasons
--   - Links team to season, season_type, and group/conference
--
-- ============================================================================

-- ============================================================================
-- EVENTS (GAMES) TABLE
-- ============================================================================
-- Stores individual game/event information
-- API Source: /events endpoint and /seasons/{year}/teams/{team_id}/events
-- ============================================================================

CREATE TABLE events (
    -- Primary Key
    event_id INTEGER PRIMARY KEY,

    -- Foreign Keys
    season_id INTEGER NOT NULL,
    season_type_id INTEGER NOT NULL,

    -- Teams
    home_team_id INTEGER NOT NULL,
    away_team_id INTEGER NOT NULL,

    -- Game Information
    date TIMESTAMP NOT NULL,
    venue_id INTEGER,
    venue_name VARCHAR(200),

    -- Status
    status VARCHAR(50),
    status_detail VARCHAR(200),
    is_completed BOOLEAN DEFAULT FALSE,

    -- Scores
    home_score INTEGER,
    away_score INTEGER,
    winner_team_id INTEGER,
    home_line_scores TEXT,  -- JSON array of period scores
    away_line_scores TEXT,  -- JSON array of period scores

    -- Game Type
    is_conference_game BOOLEAN DEFAULT FALSE,
    is_neutral_site BOOLEAN DEFAULT FALSE,

    -- Additional Info
    attendance INTEGER,
    broadcast_network VARCHAR(100),

    -- API Reference
    api_ref TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key Constraints
    FOREIGN KEY (season_id) REFERENCES seasons(season_id) ON DELETE CASCADE,
    FOREIGN KEY (season_type_id) REFERENCES season_types(season_type_id) ON DELETE CASCADE,
    FOREIGN KEY (home_team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
    FOREIGN KEY (away_team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
    FOREIGN KEY (winner_team_id) REFERENCES teams(team_id) ON DELETE SET NULL,
    FOREIGN KEY (venue_id) REFERENCES teams(venue_id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_events_season ON events(season_id);
CREATE INDEX idx_events_season_type ON events(season_type_id);
CREATE INDEX idx_events_home_team ON events(home_team_id);
CREATE INDEX idx_events_away_team ON events(away_team_id);
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_winner ON events(winner_team_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_is_completed ON events(is_completed);

-- ============================================================================
-- TEAM STATISTICS TABLE
-- ============================================================================
-- Stores team-level statistics for each game
-- API Source: /summary endpoint - boxscore.teams.statistics
-- ============================================================================

CREATE TABLE team_statistics (
    -- Primary Key
    team_stat_id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Foreign Keys
    event_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,

    -- Home/Away
    home_away VARCHAR(10) NOT NULL,

    -- Shooting Statistics
    field_goals_made INTEGER,
    field_goals_attempted INTEGER,
    field_goal_pct DECIMAL(5,2),
    three_point_made INTEGER,
    three_point_attempted INTEGER,
    three_point_pct DECIMAL(5,2),
    free_throws_made INTEGER,
    free_throws_attempted INTEGER,
    free_throw_pct DECIMAL(5,2),

    -- Rebounds
    total_rebounds INTEGER,
    offensive_rebounds INTEGER,
    defensive_rebounds INTEGER,

    -- Other Stats
    assists INTEGER,
    steals INTEGER,
    blocks INTEGER,
    turnovers INTEGER,
    team_turnovers INTEGER,
    total_turnovers INTEGER,

    -- Fouls
    fouls INTEGER,
    technical_fouls INTEGER,
    flagrant_fouls INTEGER,

    -- Advanced Stats
    turnover_points INTEGER,
    fast_break_points INTEGER,
    points_in_paint INTEGER,
    largest_lead INTEGER,
    lead_changes INTEGER,
    lead_percentage DECIMAL(5,2),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key Constraints
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,

    -- Unique Constraint
    UNIQUE(event_id, team_id)
);

-- Indexes
CREATE INDEX idx_team_stats_event ON team_statistics(event_id);
CREATE INDEX idx_team_stats_team ON team_statistics(team_id);

-- ============================================================================
-- PLAYER STATISTICS TABLE
-- ============================================================================
-- Stores individual player statistics for each game
-- API Source: /summary endpoint - boxscore.players.statistics.athletes
-- ============================================================================

CREATE TABLE player_statistics (
    -- Primary Key
    player_stat_id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Foreign Keys
    event_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    athlete_id INTEGER NOT NULL,

    -- Player Info
    athlete_name VARCHAR(200),
    athlete_short_name VARCHAR(200),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_starter BOOLEAN DEFAULT FALSE,

    -- Playing Time
    minutes_played VARCHAR(10),

    -- Scoring
    points INTEGER,
    field_goals_made INTEGER,
    field_goals_attempted INTEGER,
    three_point_made INTEGER,
    three_point_attempted INTEGER,
    free_throws_made INTEGER,
    free_throws_attempted INTEGER,

    -- Rebounds
    rebounds INTEGER,
    offensive_rebounds INTEGER,
    defensive_rebounds INTEGER,

    -- Other Stats
    assists INTEGER,
    turnovers INTEGER,
    steals INTEGER,
    blocks INTEGER,
    fouls INTEGER,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key Constraints
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,

    -- Unique Constraint
    UNIQUE(event_id, athlete_id)
);

-- Indexes
CREATE INDEX idx_player_stats_event ON player_statistics(event_id);
CREATE INDEX idx_player_stats_team ON player_statistics(team_id);
CREATE INDEX idx_player_stats_athlete ON player_statistics(athlete_id);

-- ============================================================================
-- STANDINGS TABLE
-- ============================================================================
-- Stores team standings/records for conferences and divisions
-- API Source: /seasons/{year}/types/{type_id}/groups/{group_id}/standings
-- ============================================================================

CREATE TABLE standings (
    -- Primary Key
    standing_id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Foreign Keys
    season_id INTEGER NOT NULL,
    season_type_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,

    -- Record
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    win_percentage DECIMAL(5,3),
    games_played INTEGER DEFAULT 0,

    -- Conference/Division Specific
    conference_wins INTEGER DEFAULT 0,
    conference_losses INTEGER DEFAULT 0,
    conference_win_percentage DECIMAL(5,3),
    division_wins INTEGER DEFAULT 0,
    division_losses INTEGER DEFAULT 0,
    division_win_percentage DECIMAL(5,3),

    -- Standings Position
    playoff_seed INTEGER,
    games_behind DECIMAL(4,1),

    -- Overtime Records
    ot_wins INTEGER DEFAULT 0,
    ot_losses INTEGER DEFAULT 0,

    -- Point Statistics
    points_for INTEGER DEFAULT 0,
    points_against INTEGER DEFAULT 0,
    avg_points_for DECIMAL(6,2),
    avg_points_against DECIMAL(6,2),
    point_differential INTEGER DEFAULT 0,
    avg_point_differential DECIMAL(6,2),

    -- Streaks
    current_streak VARCHAR(10),
    streak_count INTEGER,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key Constraints
    FOREIGN KEY (season_id) REFERENCES seasons(season_id) ON DELETE CASCADE,
    FOREIGN KEY (season_type_id) REFERENCES season_types(season_type_id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,

    -- Unique Constraint
    UNIQUE(season_id, season_type_id, group_id, team_id)
);

-- Indexes
CREATE INDEX idx_standings_season ON standings(season_id);
CREATE INDEX idx_standings_season_type ON standings(season_type_id);
CREATE INDEX idx_standings_group ON standings(group_id);
CREATE INDEX idx_standings_team ON standings(team_id);
CREATE INDEX idx_standings_win_pct ON standings(win_percentage DESC);

-- ============================================================================
-- NOTES: EVENTS, STATISTICS, AND STANDINGS
-- ============================================================================
--
-- EVENTS:
--   - Core game/event table with basic info
--   - 390+ games per year for 2026 season
--   - Links to home/away teams and winner
--   - Tracks game status and completion
--
-- TEAM_STATISTICS:
--   - Comprehensive team stats per game
--   - Includes shooting, rebounds, assists, turnovers, advanced stats
--   - One record per team per game (2 records per event)
--
-- PLAYER_STATISTICS:
--   - Individual player performance per game
--   - Tracks starters vs bench players
--   - Multiple records per team per game
--
-- STANDINGS:
--   - Team records and rankings within conferences/divisions
--   - Tracks overall and conference-specific records
--   - Updated after each game completion
--   - One record per team per group per season type
--
-- Typical Workflow:
--   1. Fetch events by date range or by team
--   2. For each event, fetch game summary for detailed stats
--   3. Parse and store team_statistics and player_statistics
--   4. Update standings after each completed game
--
-- ============================================================================

-- ============================================================================
-- ATHLETES (PLAYERS) TABLE
-- ============================================================================
-- Stores player/athlete information
-- API Source: /seasons/{year}/athletes endpoint
-- ============================================================================

CREATE TABLE athletes (
    -- Primary Key
    athlete_id INTEGER PRIMARY KEY,

    -- Athlete Identification
    uid VARCHAR(100) UNIQUE,
    guid VARCHAR(100),
    slug VARCHAR(200),

    -- Names
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(200),
    display_name VARCHAR(200),
    short_name VARCHAR(100),

    -- Physical Attributes
    height_inches INTEGER,
    display_height VARCHAR(20),
    weight_lbs INTEGER,
    display_weight VARCHAR(20),

    -- Birth Information
    birth_city VARCHAR(100),
    birth_state VARCHAR(50),
    birth_country VARCHAR(100),

    -- Current Team/College (season-specific, may need separate junction table)
    current_team_id INTEGER,
    college_id INTEGER,

    -- Position
    position_id INTEGER,
    position_name VARCHAR(50),
    position_abbreviation VARCHAR(10),

    -- Jersey
    jersey VARCHAR(10),

    -- API Reference
    api_ref TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key Constraints
    FOREIGN KEY (current_team_id) REFERENCES teams(team_id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_athletes_slug ON athletes(slug);
CREATE INDEX idx_athletes_team ON athletes(current_team_id);
CREATE INDEX idx_athletes_college ON athletes(college_id);
CREATE INDEX idx_athletes_position ON athletes(position_id);
CREATE INDEX idx_athletes_last_name ON athletes(last_name);

-- ============================================================================
-- ATHLETE_SEASONS TABLE
-- ============================================================================
-- Links athletes to specific seasons with season-specific data
-- Handles player transfers and team changes
-- ============================================================================

CREATE TABLE athlete_seasons (
    -- Primary Key
    athlete_season_id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Foreign Keys
    athlete_id INTEGER NOT NULL,
    season_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,

    -- Season-Specific Info
    jersey VARCHAR(10),
    experience_years INTEGER,
    experience_display VARCHAR(20),
    experience_abbreviation VARCHAR(5),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    status_id VARCHAR(10),
    status_name VARCHAR(50),
    status_type VARCHAR(50),

    -- API Reference
    api_ref TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key Constraints
    FOREIGN KEY (athlete_id) REFERENCES athletes(athlete_id) ON DELETE CASCADE,
    FOREIGN KEY (season_id) REFERENCES seasons(season_id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,

    -- Unique Constraint
    UNIQUE(athlete_id, season_id)
);

-- Indexes
CREATE INDEX idx_athlete_seasons_athlete ON athlete_seasons(athlete_id);
CREATE INDEX idx_athlete_seasons_season ON athlete_seasons(season_id);
CREATE INDEX idx_athlete_seasons_team ON athlete_seasons(team_id);
CREATE INDEX idx_athlete_seasons_status ON athlete_seasons(is_active);

-- ============================================================================
-- NOTES: ATHLETES
-- ============================================================================
--
-- ATHLETES:
--   - Base athlete information (names, physical attributes, birth info)
--   - 7,941 athletes in the 2026 season
--   - Height in inches, weight in pounds
--   - Position info stored directly (Guard, Forward, Center)
--
-- ATHLETE_SEASONS:
--   - Links athletes to specific seasons and teams
--   - Handles player transfers between teams/schools
--   - Tracks experience level (FR, SO, JR, SR)
--   - Active/inactive status per season
--
-- Position IDs (common):
--   - 3 = Guard (G)
--   - Other positions to be mapped as encountered
--
-- Experience Abbreviations:
--   - FR = Freshman
--   - SO = Sophomore
--   - JR = Junior
--   - SR = Senior
--
-- ============================================================================

-- ============================================================================
-- VENUES TABLE
-- ============================================================================
-- Stores venue/arena information
-- API Source: /venues endpoint
-- ============================================================================

CREATE TABLE venues (
    -- Primary Key
    venue_id INTEGER PRIMARY KEY,

    -- Venue Identification
    guid VARCHAR(100),
    full_name VARCHAR(200) NOT NULL,

    -- Address
    city VARCHAR(100),
    state VARCHAR(50),
    country VARCHAR(100),

    -- Venue Properties
    is_indoor BOOLEAN DEFAULT TRUE,
    capacity INTEGER,

    -- Images
    image_url TEXT,

    -- API Reference
    api_ref TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_venues_city ON venues(city);
CREATE INDEX idx_venues_state ON venues(state);
CREATE INDEX idx_venues_name ON venues(full_name);

-- ============================================================================
-- NOTES: VENUES
-- ============================================================================
--
-- VENUES:
--   - 988 total venues in the database
--   - Shared across multiple teams and seasons
--   - Referenced in teams table and events table
--   - Images available in high resolution (2000x1125)
--
-- ============================================================================

-- ============================================================================
-- GAME ODDS TABLE
-- ============================================================================
-- Stores betting odds and lines for games
-- API Source: /events/{event_id}/competitions/{competition_id}/odds
-- ============================================================================

CREATE TABLE game_odds (
    -- Primary Key
    odds_id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Foreign Keys
    event_id INTEGER NOT NULL,

    -- Provider Information
    provider_id INTEGER,
    provider_name VARCHAR(100),
    provider_priority INTEGER,

    -- Over/Under
    over_under DECIMAL(5,1),
    over_odds DECIMAL(7,2),
    under_odds DECIMAL(7,2),

    -- Opening Over/Under
    open_total DECIMAL(5,1),
    open_over_odds DECIMAL(7,2),
    open_under_odds DECIMAL(7,2),

    -- Closing Over/Under
    close_total DECIMAL(5,1),
    close_over_odds DECIMAL(7,2),
    close_under_odds DECIMAL(7,2),

    -- Point Spread (stored as positive number)
    spread DECIMAL(4,1),

    -- Away Team Odds
    away_is_favorite BOOLEAN,
    away_moneyline DECIMAL(7,2),
    away_spread_odds DECIMAL(7,2),
    away_open_spread DECIMAL(4,1),
    away_open_moneyline DECIMAL(7,2),
    away_close_spread DECIMAL(4,1),
    away_close_moneyline DECIMAL(7,2),

    -- Home Team Odds
    home_is_favorite BOOLEAN,
    home_moneyline DECIMAL(7,2),
    home_spread_odds DECIMAL(7,2),
    home_open_spread DECIMAL(4,1),
    home_open_moneyline DECIMAL(7,2),
    home_close_spread DECIMAL(4,1),
    home_close_moneyline DECIMAL(7,2),

    -- Results (populated after game)
    moneyline_winner BOOLEAN,
    spread_winner BOOLEAN,
    over_under_result VARCHAR(10),

    -- Summary
    details VARCHAR(100),

    -- API Reference
    api_ref TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key Constraints
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,

    -- Unique Constraint (one odds record per event per provider)
    UNIQUE(event_id, provider_id)
);

-- Indexes
CREATE INDEX idx_game_odds_event ON game_odds(event_id);
CREATE INDEX idx_game_odds_provider ON game_odds(provider_id);
CREATE INDEX idx_game_odds_spread ON game_odds(spread);
CREATE INDEX idx_game_odds_over_under ON game_odds(over_under);

-- ============================================================================
-- NOTES: GAME ODDS
-- ============================================================================
--
-- GAME ODDS:
--   - Betting lines and odds from various providers
--   - Provider ID 100 = Draft Kings (typically primary)
--   - Includes opening, closing, and current odds
--   - Point spread stored as positive number (favorite indicated by separate field)
--   - American odds format: negative = favorite, positive = underdog
--   - Over/Under line for total points
--   - Results (moneyline_winner, spread_winner) populated after game completion
--
-- Odds Formats:
--   - American: -325 (favorite), +260 (underdog)
--   - Spread: 7.5 points
--   - Over/Under: 157.5 total points
--
-- Not all games have odds data available
--
-- ============================================================================

-- ============================================================================
-- GAME PREDICTIONS TABLE
-- ============================================================================
-- Stores ESPN BPI (Basketball Power Index) predictions
-- API Source: /events/{event_id}/competitions/{competition_id}/predictor
-- ============================================================================

CREATE TABLE game_predictions (
    -- Primary Key
    prediction_id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Foreign Keys
    event_id INTEGER NOT NULL,

    -- Prediction Metadata
    last_modified TIMESTAMP,

    -- Matchup Quality (same for both teams)
    matchup_quality DECIMAL(5,2),

    -- Home Team Predictions
    home_win_probability DECIMAL(5,2),
    home_predicted_margin DECIMAL(6,2),

    -- Away Team Predictions
    away_win_probability DECIMAL(5,2),
    away_predicted_margin DECIMAL(6,2),

    -- Post-Game Performance (populated after game)
    home_game_score DECIMAL(6,2),
    away_game_score DECIMAL(6,2),

    -- Prediction Accuracy (calculated after game)
    home_prediction_correct BOOLEAN,
    away_prediction_correct BOOLEAN,
    margin_error DECIMAL(6,2),

    -- API Reference
    api_ref TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key Constraints
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,

    -- Unique Constraint
    UNIQUE(event_id)
);

-- Indexes
CREATE INDEX idx_game_predictions_event ON game_predictions(event_id);
CREATE INDEX idx_game_predictions_matchup_quality ON game_predictions(matchup_quality DESC);
CREATE INDEX idx_game_predictions_home_win_prob ON game_predictions(home_win_probability);
CREATE INDEX idx_game_predictions_last_modified ON game_predictions(last_modified);

-- ============================================================================
-- NOTES: GAME PREDICTIONS
-- ============================================================================
--
-- GAME PREDICTIONS (BPI):
--   - ESPN's Basketball Power Index predictions
--   - Win probability (0-100%) for each team
--   - Predicted point margin (margin of victory)
--   - Matchup quality (0-100, higher = more competitive/exciting)
--   - Updated regularly before game (check last_modified)
--
-- Matchup Quality Scale:
--   - > 70: High quality, competitive and exciting
--   - 40-70: Medium quality, moderate competitiveness
--   - < 40: Low quality, likely blowout
--
-- Post-Game Analysis:
--   - game_score: Performance vs expectations (populated after game)
--   - margin_error: |predicted_margin - actual_margin|
--   - Useful for tracking model accuracy over time
--
-- Use Cases:
--   1. Pre-game analysis and betting value identification
--   2. Filter for high-quality games to watch
--   3. Track BPI model accuracy and calibration
--   4. Compare BPI vs betting odds for discrepancies
--   5. Identify upset potential (low prob teams winning)
--   6. Strength of schedule calculations
--
-- Example:
--   Arizona @ TCU: 81.9% win prob, +9.4 margin, quality 83.1
--   High-quality game with clear favorite
--
-- ============================================================================

-- ============================================================================
-- RANKING TYPES TABLE
-- ============================================================================
-- Stores the different ranking poll types (AP Poll, Coaches Poll)
-- API Source: /seasons/{year}/rankings endpoint
-- ============================================================================

CREATE TABLE ranking_types (
    -- Primary Key
    ranking_type_id INTEGER PRIMARY KEY,

    -- Ranking Type Information
    type_code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(200),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Unique Constraint
    UNIQUE(type_code)
);

-- Index
CREATE INDEX idx_ranking_types_code ON ranking_types(type_code);

-- ============================================================================
-- WEEKLY RANKINGS TABLE
-- ============================================================================
-- Stores weekly poll rankings for teams (Top 25)
-- API Source: /seasons/{year}/types/{type_id}/weeks/{week}/rankings/{ranking_id}
-- ============================================================================

CREATE TABLE weekly_rankings (
    -- Primary Key
    ranking_id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Foreign Keys
    season_id INTEGER NOT NULL,
    season_type_id INTEGER NOT NULL,
    week_number INTEGER NOT NULL,
    ranking_type_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,

    -- Ranking Data
    current_rank INTEGER NOT NULL,
    previous_rank INTEGER,
    points DECIMAL(8,2),
    first_place_votes INTEGER DEFAULT 0,
    trend VARCHAR(10),

    -- Team Record
    wins INTEGER,
    losses INTEGER,
    record_summary VARCHAR(20),

    -- Dates
    ranking_date TIMESTAMP,
    last_updated TIMESTAMP,

    -- API Reference
    api_ref TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key Constraints
    FOREIGN KEY (season_id) REFERENCES seasons(season_id) ON DELETE CASCADE,
    FOREIGN KEY (season_type_id) REFERENCES season_types(season_type_id) ON DELETE CASCADE,
    FOREIGN KEY (ranking_type_id) REFERENCES ranking_types(ranking_type_id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,

    -- Unique Constraint (one ranking per team per week per poll)
    UNIQUE(season_id, week_number, ranking_type_id, team_id)
);

-- Indexes
CREATE INDEX idx_weekly_rankings_season ON weekly_rankings(season_id);
CREATE INDEX idx_weekly_rankings_week ON weekly_rankings(week_number);
CREATE INDEX idx_weekly_rankings_type ON weekly_rankings(ranking_type_id);
CREATE INDEX idx_weekly_rankings_team ON weekly_rankings(team_id);
CREATE INDEX idx_weekly_rankings_rank ON weekly_rankings(current_rank);
CREATE INDEX idx_weekly_rankings_date ON weekly_rankings(ranking_date);

-- ============================================================================
-- RANKINGS RECEIVING VOTES TABLE
-- ============================================================================
-- Stores teams that received votes but are not in the top 25
-- API Source: /seasons/{year}/types/{type_id}/weeks/{week}/rankings/{ranking_id}
-- ============================================================================

CREATE TABLE rankings_receiving_votes (
    -- Primary Key
    receiving_votes_id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Foreign Keys
    season_id INTEGER NOT NULL,
    season_type_id INTEGER NOT NULL,
    week_number INTEGER NOT NULL,
    ranking_type_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,

    -- Voting Data
    points DECIMAL(8,2),

    -- Dates
    ranking_date TIMESTAMP,

    -- API Reference
    api_ref TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key Constraints
    FOREIGN KEY (season_id) REFERENCES seasons(season_id) ON DELETE CASCADE,
    FOREIGN KEY (season_type_id) REFERENCES season_types(season_type_id) ON DELETE CASCADE,
    FOREIGN KEY (ranking_type_id) REFERENCES ranking_types(ranking_type_id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,

    -- Unique Constraint
    UNIQUE(season_id, week_number, ranking_type_id, team_id)
);

-- Indexes
CREATE INDEX idx_receiving_votes_season ON rankings_receiving_votes(season_id);
CREATE INDEX idx_receiving_votes_week ON rankings_receiving_votes(week_number);
CREATE INDEX idx_receiving_votes_type ON rankings_receiving_votes(ranking_type_id);
CREATE INDEX idx_receiving_votes_team ON rankings_receiving_votes(team_id);
CREATE INDEX idx_receiving_votes_points ON rankings_receiving_votes(points DESC);

-- ============================================================================
-- RANKINGS DROPPED OUT TABLE
-- ============================================================================
-- Tracks teams that dropped out of the top 25 for a given week
-- API Source: /seasons/{year}/types/{type_id}/weeks/{week}/rankings/{ranking_id}
-- ============================================================================

CREATE TABLE rankings_dropped_out (
    -- Primary Key
    dropped_out_id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Foreign Keys
    season_id INTEGER NOT NULL,
    season_type_id INTEGER NOT NULL,
    week_number INTEGER NOT NULL,
    ranking_type_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,

    -- Previous Week Rank (optional - can be looked up from previous week)
    previous_rank INTEGER,

    -- Dates
    ranking_date TIMESTAMP,

    -- API Reference
    api_ref TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key Constraints
    FOREIGN KEY (season_id) REFERENCES seasons(season_id) ON DELETE CASCADE,
    FOREIGN KEY (season_type_id) REFERENCES season_types(season_type_id) ON DELETE CASCADE,
    FOREIGN KEY (ranking_type_id) REFERENCES ranking_types(ranking_type_id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,

    -- Unique Constraint
    UNIQUE(season_id, week_number, ranking_type_id, team_id)
);

-- Indexes
CREATE INDEX idx_dropped_out_season ON rankings_dropped_out(season_id);
CREATE INDEX idx_dropped_out_week ON rankings_dropped_out(week_number);
CREATE INDEX idx_dropped_out_type ON rankings_dropped_out(ranking_type_id);
CREATE INDEX idx_dropped_out_team ON rankings_dropped_out(team_id);

-- ============================================================================
-- NOTES: RANKINGS TABLES
-- ============================================================================
--
-- RANKING_TYPES:
--   - Stores the different poll types (AP Poll, Coaches Poll)
--   - ID 1 = AP Top 25 (type_code: "ap")
--   - ID 2 = Coaches Poll (type_code: "usa")
--
-- WEEKLY_RANKINGS:
--   - Stores the top 25 teams for each week of each poll
--   - Includes voting details (points, first place votes)
--   - Trend indicator shows movement ("-", "+1", "-2", "NR", etc.)
--   - One record per team per week per poll type
--   - 25 records per week per poll (one for each ranked team)
--
-- RANKINGS_RECEIVING_VOTES:
--   - Teams that received votes but are not in top 25
--   - Just points received, no ranking position
--   - Varies in count each week
--
-- RANKINGS_DROPPED_OUT:
--   - Teams that fell out of top 25 this week
--   - Useful for tracking momentum loss
--   - Can cross-reference with previous week's rankings
--
-- Ranking Workflow:
--   1. Fetch available ranking types from /seasons/{year}/rankings
--   2. For each ranking type, fetch weekly rankings
--   3. For each week, parse:
--      - ranks[] array → weekly_rankings table (top 25)
--      - others[] array → rankings_receiving_votes table
--      - droppedOut[] array → rankings_dropped_out table
--
-- Use Cases:
--   - Track team ranking progression over season
--   - Compare AP Poll vs Coaches Poll rankings
--   - Identify teams on the rise (improving rank)
--   - Analyze voting patterns (first place votes, points)
--   - Correlate rankings with game performance
--   - Calculate strength of schedule based on opponent rankings
--   - Identify upsets (lower-ranked teams beating higher-ranked)
--
-- Points System:
--   - AP Poll: 25 points for #1 vote, 24 for #2, ..., 1 for #25
--   - Total points determine ranking
--   - First place votes indicate how many voters ranked team #1
--
-- Trend Values:
--   - "-": No change in rank
--   - "+N": Moved up N positions
--   - "-N": Moved down N positions
--   - "NR": Not ranked previously (newly ranked)
--
-- Example Data (Week 11, 2026):
--   - 11 weeks of rankings published so far
--   - Arizona #1 with 1524 points, 60 first-place votes
--   - Rankings date: 2026-01-12
--
-- ============================================================================
