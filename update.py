#!/usr/bin/env python3
"""
Unified NCAA Basketball Data Update Script

This script is the single entry point for all regular updates, replacing:
- update_incremental.py
- update_latest_rankings.py
- update_recent_scores.py
- update_line_scores.py

Features:
- 7-phase comprehensive update strategy
- Automatic backfill for missing data
- Parallel processing for game summaries
- Updates: events, statistics, odds, predictions, rankings, standings, entities
- Default 7-day window with configurable options

Usage:
    python update.py                    # Default: last 7 days
    python update.py --days 14          # Custom date range
    python update.py --backfill-only    # Only fill gaps
    python update.py --verbose          # Verbose output
"""

import argparse
import json
import time
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set, Tuple
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed

from database import Database
from api_client import ESPNAPIClient
from populate_events import parse_event_data
from populate_all import (
    parse_team_statistics,
    parse_player_statistics,
    parse_game_odds,
    parse_game_predictions
)


class ThreadSafeDatabase:
    """Thread-safe database wrapper for concurrent writes."""

    def __init__(self, db_path: str = None):
        self.db_path = db_path
        self.lock = threading.Lock()
        self.local = threading.local()

    def get_connection(self):
        """Get thread-local database connection."""
        if not hasattr(self.local, 'db'):
            self.local.db = Database(self.db_path)
            self.local.db.connect()
            # Enable WAL mode for better concurrent access
            self.local.db.execute("PRAGMA journal_mode=WAL")
            self.local.db.execute("PRAGMA synchronous=NORMAL")
        return self.local.db

    def execute(self, query: str, params: tuple = ()):
        """Execute a query with thread safety."""
        db = self.get_connection()
        with self.lock:
            return db.execute(query, params)

    def executemany(self, query: str, params_list: List[tuple]):
        """Execute many with thread safety."""
        db = self.get_connection()
        with self.lock:
            db.executemany(query, params_list)
            db.commit()

    def commit(self):
        """Commit current transaction."""
        db = self.get_connection()
        with self.lock:
            db.commit()

    def close_all(self):
        """Close all thread-local connections."""
        if hasattr(self.local, 'db'):
            self.local.db.close()


class UpdateOrchestrator:
    """Coordinates all update phases with progress tracking and reporting."""

    def __init__(self, db_path=None, workers=20, batch_size=50, verbose=False):
        self.thread_safe_db = ThreadSafeDatabase(db_path)
        self.client = ESPNAPIClient()
        self.workers = workers
        self.batch_size = batch_size
        self.verbose = verbose

        # Tracking
        self.stats = {
            'events_updated': 0,
            'summaries_fetched': 0,
            'team_stats': 0,
            'player_stats': 0,
            'odds': 0,
            'predictions': 0,
            'backfilled': 0,
            'rankings_updated': 0,
            'standings_updated': 0,
            'new_athletes': 0,
            'new_venues': 0,
            'errors': []
        }

        # Entity tracking for Phase 7
        self.discovered_athletes: Set[int] = set()
        self.discovered_venues: Set[int] = set()

        # Data buffers for batch inserts
        self.team_stats_buffer = []
        self.player_stats_buffer = []
        self.odds_buffer = []
        self.predictions_buffer = []

    def run(self, config: Dict):
        """Execute all enabled phases based on config."""
        print("=" * 70)
        print("NCAA BASKETBALL UNIFIED UPDATE")
        print("=" * 70)

        start_time = time.time()

        try:
            if not config.get('backfill_only'):
                completed_event_ids = self.phase_1_update_events(config)
                self.phase_2_fetch_summaries(completed_event_ids, config)
                self.phase_3_insert_statistics(config)

            if not config.get('skip_backfill'):
                self.phase_4_backfill_gaps(config)

            if not config.get('skip_rankings'):
                self.phase_5_update_rankings(config)

            if not config.get('skip_standings'):
                self.phase_6_update_standings(config)

            if not config.get('skip_entities'):
                self.phase_7_update_entities(config)

            self.verify_update()
            self.print_summary(time.time() - start_time)

        except Exception as e:
            print(f"\n✗ Fatal error: {e}")
            import traceback
            traceback.print_exc()
            raise
        finally:
            self.thread_safe_db.close_all()

    def phase_1_update_events(self, config: Dict) -> List[int]:
        """
        Phase 1: Update Events (Date Range)
        Fetch and upsert events for the date range.
        Returns list of completed event IDs for Phase 2.
        """
        print("\n" + "=" * 70)
        print("PHASE 1: UPDATE EVENTS")
        print("=" * 70)

        start_date = config['start_date']
        end_date = config['end_date']

        print(f"Fetching events from {start_date} to {end_date}...")

        events_data = self.client.get_events(dates=f"{start_date}-{end_date}")

        if not events_data:
            print("No events found in date range")
            return []

        events = []
        completed_event_ids = []

        for event_ref in tqdm(events_data, desc="Parsing events"):
            try:
                event_data = self.client.get_from_ref(event_ref['$ref'])
                parsed = parse_event_data(event_data, client=self.client)

                if parsed:
                    events.append(parsed)
                    # Track completed games for Phase 2
                    event_id = parsed[0]
                    is_completed = parsed[11]
                    if is_completed:
                        completed_event_ids.append(event_id)

                    # Track venue for Phase 7
                    venue_id = parsed[7]
                    if venue_id:
                        self.discovered_venues.add(venue_id)

            except Exception as e:
                self.stats['errors'].append(f"Event parsing error: {e}")
                if self.verbose:
                    print(f"\nError parsing event: {e}")
                continue

        # Upsert events
        if events:
            print(f"\nInserting {len(events)} events...")
            self.thread_safe_db.executemany(
                """
                INSERT OR REPLACE INTO events
                (event_id, season_id, season_type_id, week, home_team_id, away_team_id,
                 date, venue_id, venue_name, status, status_detail, is_completed,
                 home_score, away_score, winner_team_id,
                 is_conference_game, is_neutral_site, attendance, broadcast_network, api_ref,
                 home_line_scores, away_line_scores)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                events
            )
            self.stats['events_updated'] = len(events)
            print(f"✓ Updated {len(events)} events ({len(completed_event_ids)} completed)")

        return completed_event_ids

    def phase_2_fetch_summaries(self, event_ids: List[int], config: Dict):
        """
        Phase 2: Fetch Game Summaries (Parallel)
        Fetch summaries for completed games and parse statistics.
        """
        print("\n" + "=" * 70)
        print("PHASE 2: FETCH GAME SUMMARIES")
        print("=" * 70)

        if not event_ids:
            print("No completed games to fetch")
            return

        print(f"Fetching summaries for {len(event_ids)} completed games (parallel)...")

        def process_game(event_id):
            """Process a single game summary."""
            try:
                # Get game summary
                summary = self.client.get_game_summary(event_id)
                if not summary:
                    return None

                # Parse statistics
                boxscore = summary.get('boxscore', {})

                # Team statistics
                teams = boxscore.get('teams', [])
                for team_data in teams:
                    team_id = int(team_data.get('team', {}).get('id', 0))
                    home_away = team_data.get('homeAway', '')
                    statistics = team_data.get('statistics', [])
                    parsed = parse_team_statistics(event_id, team_id, home_away, statistics)
                    if parsed:
                        self.team_stats_buffer.append(parsed)

                # Player statistics
                players = boxscore.get('players', [])
                for team_players in players:
                    team_id = int(team_players.get('team', {}).get('id', 0))
                    statistics = team_players.get('statistics', [])

                    if statistics:
                        for stat_group in statistics:
                            athletes = stat_group.get('athletes', [])
                            for athlete_data in athletes:
                                parsed = parse_player_statistics(event_id, team_id, athlete_data)
                                if parsed:
                                    self.player_stats_buffer.append(parsed)
                                    # Track athlete for Phase 7
                                    athlete_id = parsed[2]
                                    if athlete_id:
                                        self.discovered_athletes.add(athlete_id)

                # Game odds
                parsed_odds = parse_game_odds(event_id, summary)
                if parsed_odds:
                    self.odds_buffer.append(parsed_odds)

                # Game predictions
                parsed_predictions = parse_game_predictions(event_id, summary)
                if parsed_predictions:
                    self.predictions_buffer.append(parsed_predictions)

                return True

            except Exception as e:
                self.stats['errors'].append(f"Game {event_id} summary error: {e}")
                if self.verbose:
                    print(f"\nError fetching game {event_id}: {e}")
                return None

        # Parallel fetch with progress bar
        with ThreadPoolExecutor(max_workers=self.workers) as executor:
            futures = {executor.submit(process_game, eid): eid for eid in event_ids}

            for future in tqdm(as_completed(futures), total=len(event_ids), desc="Fetching summaries"):
                result = future.result()
                if result:
                    self.stats['summaries_fetched'] += 1

        print(f"✓ Fetched {self.stats['summaries_fetched']} summaries")
        print(f"  • Team stats: {len(self.team_stats_buffer)}")
        print(f"  • Player stats: {len(self.player_stats_buffer)}")
        print(f"  • Odds: {len(self.odds_buffer)}")
        print(f"  • Predictions: {len(self.predictions_buffer)}")

    def phase_3_insert_statistics(self, config: Dict):
        """
        Phase 3: Insert Statistics (Batch)
        Batch insert all parsed statistics.
        """
        print("\n" + "=" * 70)
        print("PHASE 3: INSERT STATISTICS")
        print("=" * 70)

        # Team statistics
        if self.team_stats_buffer:
            print(f"Inserting {len(self.team_stats_buffer)} team statistics...")
            self.thread_safe_db.executemany(
                """
                INSERT OR REPLACE INTO team_statistics
                (event_id, team_id, home_away, field_goals_made, field_goals_attempted,
                 field_goal_pct, three_point_made, three_point_attempted, three_point_pct,
                 free_throws_made, free_throws_attempted, free_throw_pct, total_rebounds,
                 offensive_rebounds, defensive_rebounds, assists, steals, blocks, turnovers,
                 team_turnovers, total_turnovers, fouls, technical_fouls, flagrant_fouls,
                 turnover_points, fast_break_points, points_in_paint, largest_lead,
                 lead_changes, lead_percentage)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                self.team_stats_buffer
            )
            self.stats['team_stats'] = len(self.team_stats_buffer)
            self.team_stats_buffer.clear()

        # Player statistics
        if self.player_stats_buffer:
            print(f"Inserting {len(self.player_stats_buffer)} player statistics...")
            self.thread_safe_db.executemany(
                """
                INSERT OR REPLACE INTO player_statistics
                (event_id, team_id, athlete_id, athlete_name, athlete_short_name,
                 is_active, is_starter, minutes_played, points, field_goals_made,
                 field_goals_attempted, three_point_made, three_point_attempted,
                 free_throws_made, free_throws_attempted, rebounds, offensive_rebounds,
                 defensive_rebounds, assists, turnovers, steals, blocks, fouls)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                self.player_stats_buffer
            )
            self.stats['player_stats'] = len(self.player_stats_buffer)
            self.player_stats_buffer.clear()

        # Game odds
        if self.odds_buffer:
            print(f"Inserting {len(self.odds_buffer)} game odds...")
            self.thread_safe_db.executemany(
                """
                INSERT OR REPLACE INTO game_odds
                (event_id, provider, home_team_odds, away_team_odds, over_under,
                 over_odds, under_odds, spread, home_spread_odds, away_spread_odds,
                 details, last_modified)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                self.odds_buffer
            )
            self.stats['odds'] = len(self.odds_buffer)
            self.odds_buffer.clear()

        # Game predictions
        if self.predictions_buffer:
            print(f"Inserting {len(self.predictions_buffer)} game predictions...")
            self.thread_safe_db.executemany(
                """
                INSERT OR REPLACE INTO game_predictions
                (event_id, last_modified, matchup_quality, home_win_probability,
                 home_predicted_margin, away_win_probability, away_predicted_margin,
                 home_game_score, away_game_score, home_prediction_correct,
                 away_prediction_correct, margin_error, api_ref)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                self.predictions_buffer
            )
            self.stats['predictions'] = len(self.predictions_buffer)
            self.predictions_buffer.clear()

        print("✓ Statistics inserted")

    def phase_4_backfill_gaps(self, config: Dict):
        """
        Phase 4: Backfill Gaps (NEW - Key Feature)
        Find and fix missing data.
        """
        print("\n" + "=" * 70)
        print("PHASE 4: BACKFILL GAPS")
        print("=" * 70)

        backfill_limit = config.get('backfill_limit', 100)

        # Find completed games without statistics
        db = Database()
        db.connect()

        cursor = db.execute("""
            SELECT e.event_id
            FROM events e
            WHERE e.is_completed = 1
            AND NOT EXISTS (
                SELECT 1 FROM team_statistics ts
                WHERE ts.event_id = e.event_id
            )
            ORDER BY e.date DESC
            LIMIT ?
        """, (backfill_limit,))

        gap_event_ids = [row[0] for row in cursor.fetchall()]

        # Find games missing line scores
        cursor = db.execute("""
            SELECT event_id
            FROM events
            WHERE is_completed = 1
            AND (home_line_scores IS NULL OR away_line_scores IS NULL)
            ORDER BY date DESC
            LIMIT ?
        """, (backfill_limit,))

        line_score_gaps = [row[0] for row in cursor.fetchall()]
        db.close()

        # Combine and deduplicate
        all_gaps = list(set(gap_event_ids + line_score_gaps))

        if all_gaps:
            print(f"Found {len(gap_event_ids)} games without stats, {len(line_score_gaps)} without line scores")
            print(f"Backfilling {len(all_gaps)} unique games...")

            # Fetch summaries using Phase 2 logic
            self.phase_2_fetch_summaries(all_gaps, config)
            self.phase_3_insert_statistics(config)

            self.stats['backfilled'] = len(all_gaps)
            print(f"✓ Backfilled {len(all_gaps)} games")
        else:
            print("✓ No gaps found")

    def phase_5_update_rankings(self, config: Dict):
        """
        Phase 5: Update Rankings
        Fetch and update latest AP Poll rankings.
        """
        print("\n" + "=" * 70)
        print("PHASE 5: UPDATE RANKINGS")
        print("=" * 70)

        season = config.get('season', 2026)
        ranking_type_id = 1  # AP Poll

        try:
            # Get rankings overview to find latest week
            rankings_data = self.client.get_rankings(season)

            if not rankings_data or 'rankings' not in rankings_data:
                print("No rankings data available")
                return

            rankings = rankings_data['rankings']
            if not rankings:
                print("No rankings found")
                return

            # Get latest week
            latest = rankings[0]
            week_number = latest.get('week', 0)

            print(f"Updating rankings for week {week_number}...")

            # Delete existing rankings for this week
            db = Database()
            db.connect()
            db.execute("""
                DELETE FROM weekly_rankings
                WHERE season_id = ? AND week_number = ? AND ranking_type_id = ?
            """, (season, week_number, ranking_type_id))
            db.commit()

            # Parse and insert new rankings
            ranks = latest.get('ranks', [])
            rankings_data = []

            for rank_data in ranks:
                team_id = int(rank_data.get('team', {}).get('id', 0))
                current_rank = rank_data.get('current', 0)
                previous_rank = rank_data.get('previous')
                points = rank_data.get('points', 0)
                first_place_votes = rank_data.get('firstPlaceVotes', 0)

                rankings_data.append((
                    season, week_number, ranking_type_id, team_id,
                    current_rank, previous_rank, points, first_place_votes
                ))

            if rankings_data:
                db.executemany("""
                    INSERT INTO weekly_rankings
                    (season_id, week_number, ranking_type_id, team_id,
                     current_rank, previous_rank, points, first_place_votes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, rankings_data)
                db.commit()

                self.stats['rankings_updated'] = len(rankings_data)
                print(f"✓ Updated {len(rankings_data)} rankings for week {week_number}")

            db.close()

        except Exception as e:
            self.stats['errors'].append(f"Rankings update error: {e}")
            print(f"✗ Error updating rankings: {e}")

    def phase_6_update_standings(self, config: Dict):
        """
        Phase 6: Update Standings
        Update standings for the current season.
        """
        print("\n" + "=" * 70)
        print("PHASE 6: UPDATE STANDINGS")
        print("=" * 70)

        season = config.get('season', 2026)
        season_type_id = 2  # Regular season

        try:
            # Get conferences from database
            db = Database()
            db.connect()
            cursor = db.execute("""
                SELECT group_id, name
                FROM groups
                WHERE season_id = ?
            """, (season,))

            conferences = cursor.fetchall()
            db.close()

            if not conferences:
                print("No conferences found")
                return

            print(f"Updating standings for {len(conferences)} conferences...")

            standings_data = []

            for group_id, conf_name in tqdm(conferences, desc="Fetching standings"):
                try:
                    standings = self.client.get_standings(season, season_type_id, group_id)

                    if not standings or 'entries' not in standings:
                        continue

                    for entry in standings['entries']:
                        team = entry.get('team', {})
                        team_id = int(team.get('id', 0))

                        stats = entry.get('stats', [])
                        stat_dict = {s.get('name'): s.get('value') for s in stats}

                        standings_data.append((
                            season, season_type_id, group_id, team_id,
                            stat_dict.get('rank', 0),
                            stat_dict.get('wins', 0),
                            stat_dict.get('losses', 0),
                            stat_dict.get('winPercent', 0.0),
                            stat_dict.get('conferenceWins', 0),
                            stat_dict.get('conferenceLosses', 0),
                            stat_dict.get('streak', 0),
                            stat_dict.get('differential', 0.0)
                        ))

                except Exception as e:
                    if self.verbose:
                        print(f"\nError fetching standings for {conf_name}: {e}")
                    continue

            if standings_data:
                db = Database()
                db.connect()
                db.executemany("""
                    INSERT OR REPLACE INTO standings
                    (season_id, season_type_id, group_id, team_id,
                     rank, wins, losses, win_pct, conf_wins, conf_losses,
                     streak, differential)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, standings_data)
                db.commit()
                db.close()

                self.stats['standings_updated'] = len(standings_data)
                print(f"✓ Updated {len(standings_data)} standings entries")

        except Exception as e:
            self.stats['errors'].append(f"Standings update error: {e}")
            print(f"✗ Error updating standings: {e}")

    def phase_7_update_entities(self, config: Dict):
        """
        Phase 7: Update Entities (NEW)
        Update/insert new athletes and venues discovered during update.
        """
        print("\n" + "=" * 70)
        print("PHASE 7: UPDATE ENTITIES")
        print("=" * 70)

        # Check which athletes are new
        if self.discovered_athletes:
            db = Database()
            db.connect()

            placeholders = ','.join('?' * len(self.discovered_athletes))
            cursor = db.execute(f"""
                SELECT athlete_id FROM athletes
                WHERE athlete_id IN ({placeholders})
            """, tuple(self.discovered_athletes))

            existing_athletes = {row[0] for row in cursor.fetchall()}
            new_athletes = self.discovered_athletes - existing_athletes
            db.close()

            if new_athletes:
                print(f"Fetching {len(new_athletes)} new athletes...")
                athletes_data = []

                for athlete_id in tqdm(list(new_athletes)[:100], desc="Fetching athletes"):  # Cap at 100
                    try:
                        athlete = self.client.get_athlete(athlete_id)
                        if athlete:
                            athletes_data.append((
                                athlete_id,
                                athlete.get('fullName', ''),
                                athlete.get('displayName', ''),
                                athlete.get('shortName', ''),
                                athlete.get('position', {}).get('name', ''),
                                athlete.get('position', {}).get('abbreviation', ''),
                                athlete.get('jersey', ''),
                                athlete.get('height', ''),
                                athlete.get('weight', ''),
                                athlete.get('age', 0),
                                athlete.get('dateOfBirth', ''),
                                athlete.get('birthPlace', {}).get('city', ''),
                                athlete.get('birthPlace', {}).get('state', ''),
                                athlete.get('birthPlace', {}).get('country', ''),
                                athlete.get('headshot', {}).get('href', ''),
                                json.dumps(athlete)
                            ))
                    except Exception as e:
                        if self.verbose:
                            print(f"\nError fetching athlete {athlete_id}: {e}")
                        continue

                if athletes_data:
                    db = Database()
                    db.connect()
                    db.executemany("""
                        INSERT OR REPLACE INTO athletes
                        (athlete_id, full_name, display_name, short_name, position_name,
                         position_abbr, jersey, height, weight, age, date_of_birth,
                         birth_city, birth_state, birth_country, headshot_url, api_ref)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, athletes_data)
                    db.commit()
                    db.close()

                    self.stats['new_athletes'] = len(athletes_data)
                    print(f"✓ Added {len(athletes_data)} new athletes")

        # Check which venues are new
        if self.discovered_venues:
            db = Database()
            db.connect()

            placeholders = ','.join('?' * len(self.discovered_venues))
            cursor = db.execute(f"""
                SELECT venue_id FROM venues
                WHERE venue_id IN ({placeholders})
            """, tuple(self.discovered_venues))

            existing_venues = {row[0] for row in cursor.fetchall()}
            new_venues = self.discovered_venues - existing_venues
            db.close()

            if new_venues:
                print(f"Fetching {len(new_venues)} new venues...")
                venues_data = []

                for venue_id in tqdm(list(new_venues)[:50], desc="Fetching venues"):  # Cap at 50
                    try:
                        venue = self.client.get_venue(venue_id)
                        if venue:
                            venues_data.append((
                                venue_id,
                                venue.get('fullName', ''),
                                venue.get('address', {}).get('city', ''),
                                venue.get('address', {}).get('state', ''),
                                venue.get('capacity', 0),
                                venue.get('grass', False),
                                venue.get('indoor', False),
                                json.dumps(venue)
                            ))
                    except Exception as e:
                        if self.verbose:
                            print(f"\nError fetching venue {venue_id}: {e}")
                        continue

                if venues_data:
                    db = Database()
                    db.connect()
                    db.executemany("""
                        INSERT OR REPLACE INTO venues
                        (venue_id, full_name, city, state, capacity, grass, indoor, api_ref)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, venues_data)
                    db.commit()
                    db.close()

                    self.stats['new_venues'] = len(venues_data)
                    print(f"✓ Added {len(venues_data)} new venues")

        if not self.discovered_athletes and not self.discovered_venues:
            print("✓ No new entities to add")

    def verify_update(self):
        """Run verification queries after update completes."""
        print("\n" + "=" * 70)
        print("VERIFICATION")
        print("=" * 70)

        db = Database()
        db.connect()

        checks = [
            ("Events without scores",
             "SELECT COUNT(*) FROM events WHERE is_completed=1 AND home_score IS NULL"),

            ("Events without line scores",
             "SELECT COUNT(*) FROM events WHERE is_completed=1 AND home_line_scores IS NULL"),

            ("Events without statistics",
             """SELECT COUNT(*) FROM events e WHERE e.is_completed=1
                AND NOT EXISTS (SELECT 1 FROM team_statistics ts WHERE ts.event_id=e.event_id)"""),
        ]

        for name, query in checks:
            try:
                cursor = db.execute(query)
                result = cursor.fetchone()[0]
                status = "✓" if result == 0 else "⚠"
                print(f"{status} {name}: {result}")

                if result > 0 and result < 10:
                    self.stats['errors'].append(f"{name}: {result}")
            except Exception as e:
                print(f"✗ {name}: Error - {e}")

        db.close()

    def print_summary(self, duration):
        """Print final update summary."""
        print("\n" + "=" * 70)
        print("UPDATE SUMMARY")
        print("=" * 70)
        print(f"Duration: {duration:.1f} seconds")
        print(f"\nData Updated:")
        print(f"  • Events: {self.stats['events_updated']}")
        print(f"  • Game Summaries Fetched: {self.stats['summaries_fetched']}")
        print(f"  • Team Statistics: {self.stats['team_stats']}")
        print(f"  • Player Statistics: {self.stats['player_stats']}")
        print(f"  • Odds: {self.stats['odds']}")
        print(f"  • Predictions: {self.stats['predictions']}")
        print(f"  • Backfilled Games: {self.stats['backfilled']}")
        print(f"  • Rankings Entries: {self.stats['rankings_updated']}")
        print(f"  • Standings Entries: {self.stats['standings_updated']}")
        print(f"  • New Athletes: {self.stats['new_athletes']}")
        print(f"  • New Venues: {self.stats['new_venues']}")

        if self.stats['errors']:
            print(f"\n⚠ Warnings/Errors: {len(self.stats['errors'])}")
            for i, err in enumerate(self.stats['errors'][:5], 1):
                print(f"  {i}. {err}")
            if len(self.stats['errors']) > 5:
                print(f"  ... and {len(self.stats['errors']) - 5} more")

        print("=" * 70)


def get_date_range(days: int) -> Tuple[str, str]:
    """Calculate start and end dates for update."""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)

    return start_date.strftime('%Y%m%d'), end_date.strftime('%Y%m%d')


def main():
    parser = argparse.ArgumentParser(
        description='Unified NCAA Basketball data update script',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Default update (last 7 days)
  python update.py

  # Specify date range
  python update.py --days 14

  # Custom start/end dates
  python update.py --start-date 20260101 --end-date 20260114

  # Skip optional phases
  python update.py --skip-rankings --skip-standings

  # Performance tuning
  python update.py --workers 30 --batch-size 100

  # Backfill only (no date range update)
  python update.py --backfill-only --backfill-limit 100
        """
    )

    # Date range options
    parser.add_argument('--days', type=int, default=7,
                       help='Number of days to look back (default: 7)')
    parser.add_argument('--start-date', type=str,
                       help='Start date YYYYMMDD (overrides --days)')
    parser.add_argument('--end-date', type=str,
                       help='End date YYYYMMDD (default: today)')

    # Phase control
    parser.add_argument('--skip-rankings', action='store_true',
                       help='Skip rankings update')
    parser.add_argument('--skip-standings', action='store_true',
                       help='Skip standings update')
    parser.add_argument('--skip-entities', action='store_true',
                       help='Skip athlete/venue updates')
    parser.add_argument('--skip-backfill', action='store_true',
                       help='Skip backfill phase')
    parser.add_argument('--backfill-only', action='store_true',
                       help='Only run backfill, skip date range update')

    # Performance tuning
    parser.add_argument('--workers', type=int, default=20,
                       help='Number of parallel workers (default: 20)')
    parser.add_argument('--batch-size', type=int, default=50,
                       help='Batch size for inserts (default: 50)')
    parser.add_argument('--backfill-limit', type=int, default=100,
                       help='Max games to backfill (default: 100)')

    # Season config
    parser.add_argument('--season', type=int, default=2026,
                       help='Season year for rankings/standings (default: 2026)')

    # Verbosity
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Verbose output')

    args = parser.parse_args()

    # Calculate date range
    if args.start_date and args.end_date:
        start_date = args.start_date
        end_date = args.end_date
    elif args.start_date:
        start_date = args.start_date
        end_date = datetime.now().strftime('%Y%m%d')
    elif args.end_date:
        start_date, _ = get_date_range(args.days)
        end_date = args.end_date
    else:
        start_date, end_date = get_date_range(args.days)

    # Build config
    config = {
        'start_date': start_date,
        'end_date': end_date,
        'skip_rankings': args.skip_rankings,
        'skip_standings': args.skip_standings,
        'skip_entities': args.skip_entities,
        'skip_backfill': args.skip_backfill,
        'backfill_only': args.backfill_only,
        'backfill_limit': args.backfill_limit,
        'season': args.season,
    }

    # Create orchestrator and run
    orchestrator = UpdateOrchestrator(
        workers=args.workers,
        batch_size=args.batch_size,
        verbose=args.verbose
    )

    orchestrator.run(config)


if __name__ == '__main__':
    main()
