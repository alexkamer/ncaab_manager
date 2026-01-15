'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import GameHero from './GameHero';
import StickyHeader from './StickyHeader';
import TabNavigation from './TabNavigation';
import OverviewTab from '../tabs/OverviewTab';
import PlayByPlay from '../PlayByPlay';
import BoxScoreTab from '../tabs/BoxScoreTab';
import AdvancedStatsTab from '../tabs/AdvancedStatsTab';
import PredictionsTab from '../tabs/PredictionsTab';

interface GameDetailClientProps {
  game: any; // We'll type this properly later
  awayTeamLogo: string;
  homeTeamLogo: string;
}

// Map stat types to ESPN labels and database fields (moved outside component for performance)
const STAT_MAPPING: Record<string, { espnLabel: string; dbField: string }> = {
  'PTS': { espnLabel: 'PTS', dbField: 'points' },
  'REB': { espnLabel: 'REB', dbField: 'rebounds' },
  'AST': { espnLabel: 'AST', dbField: 'assists' },
  'STL': { espnLabel: 'STL', dbField: 'steals' },
  'BLK': { espnLabel: 'BLK', dbField: 'blocks' },
  'FG%': { espnLabel: 'FG%', dbField: 'field_goal_pct' },
  '3PT': { espnLabel: '3PM', dbField: 'three_point_made' },
};

export default function GameDetailClient({ game, awayTeamLogo, homeTeamLogo }: GameDetailClientProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [leadChanges, setLeadChanges] = useState(7); // Default placeholder
  const [showLeadChangesFilter, setShowLeadChangesFilter] = useState(false);
  const [selectedStatType, setSelectedStatType] = useState('PTS');
  const [plays, setPlays] = useState<any[]>([]); // Centralized play-by-play data

  const awayWon = game.away_score > game.home_score;
  const homeWon = game.home_score > game.away_score;

  // Handler for viewing lead changes
  const handleViewLeadChanges = () => {
    setShowLeadChangesFilter(true);
    setActiveTab('playbyplay');
  };

  // Reset lead changes filter when changing tabs
  const handleTabChange = (tab: string) => {
    if (tab !== 'playbyplay') {
      setShowLeadChangesFilter(false);
    }
    setActiveTab(tab);
  };

  // Fetch play-by-play data once and calculate lead changes from it
  // This data is shared with GameFlow and PlayByPlay to eliminate duplicate API calls
  useEffect(() => {
    const fetchPlayByPlayData = async () => {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${API_BASE}/api/games/${game.event_id}/playbyplay`);
        if (!response.ok) return;

        const data = await response.json();
        const fetchedPlays = data.plays || [];
        setPlays(fetchedPlays);

        // Calculate lead changes using optimized O(n) algorithm
        // IMPORTANT: Lead changes can ONLY happen on scoring plays
        let count = 0;
        let lastLeader: "home" | "away" | null = null;

        for (const play of fetchedPlays) {
          if (!play.scoringPlay) continue;

          const currLeader = play.homeScore > play.awayScore ? "home" :
                             play.awayScore > play.homeScore ? "away" : null;

          if (currLeader === null) continue;

          if (lastLeader === null) {
            count++;
          } else if (lastLeader !== currLeader) {
            count++;
          }

          lastLeader = currLeader;
        }

        setLeadChanges(count);
      } catch (error) {
        console.error('Error fetching play-by-play data:', error);
      }
    };

    if (game.is_completed && game.event_id) {
      fetchPlayByPlayData();
    }
  }, [game.event_id, game.is_completed]);

  // Extract team leaders by stat type (memoized with useCallback to prevent recreation on every render)
  const extractTeamLeaders = useCallback((statType: string) => {
    let awayLeaders: any[] = [];
    let homeLeaders: any[] = [];

    const mapping = STAT_MAPPING[statType];
    if (!mapping) return { away: awayLeaders, home: homeLeaders };

    if (game.source === 'espn' && game.players) {
      game.players.forEach((teamData: any) => {
        const allPlayers = teamData.statistics[0]?.athletes || [];
        const isHomeTeam = teamData.team.id === String(game.home_team_id);
        const statIndex = teamData.statistics[0]?.labels?.indexOf(mapping.espnLabel) ?? -1;

        if (statIndex !== -1) {
          const leaders = allPlayers
            .map((p: any) => {
              let value = 0;
              const statValue = p.stats?.[statIndex];

              // Handle FG% specially
              if (statType === 'FG%') {
                value = parseFloat(statValue || '0');
              } else {
                value = parseInt(statValue || '0');
              }

              return {
                name: p.athlete?.displayName || '',
                value: value,
                headshot: p.athlete?.headshot?.href,
                playerId: p.athlete?.id,
              };
            })
            .filter((p: any) => p.value > 0)
            .sort((a: any, b: any) => b.value - a.value)
            .slice(0, 1);

          if (isHomeTeam) {
            homeLeaders = leaders;
          } else {
            awayLeaders = leaders;
          }
        }
      });
    } else if (game.player_stats && game.player_stats.length > 0) {
      const playersByTeam = game.player_stats.reduce((acc: any, player: any) => {
        const teamId = player.team_id;
        if (!acc[teamId]) acc[teamId] = [];
        acc[teamId].push(player);
        return acc;
      }, {});

      Object.entries(playersByTeam).forEach(([teamId, players]: [string, any]) => {
        const isHomeTeam = Number(teamId) === game.home_team_id;

        const leaders = players
          .map((p: any) => {
            let value = 0;

            // Handle FG% calculation
            if (statType === 'FG%') {
              const made = p.field_goals_made || 0;
              const attempted = p.field_goals_attempted || 0;
              value = attempted > 0 ? (made / attempted) * 100 : 0;
            } else {
              value = p[mapping.dbField] || 0;
            }

            return {
              name: p.display_name || p.full_name,
              value: value,
              headshot: p.headshot_url || p.photo_url,
              playerId: p.player_id || p.id,
            };
          })
          .filter((p: any) => p.value > 0)
          .sort((a: any, b: any) => b.value - a.value)
          .slice(0, 1);

        if (isHomeTeam) {
          homeLeaders = leaders;
        } else {
          awayLeaders = leaders;
        }
      });
    }

    return { away: awayLeaders, home: homeLeaders };
  }, [game.source, game.players, game.player_stats, game.home_team_id, game.away_team_id]);

  // Extract shooting efficiency (memoized with useCallback to prevent recreation on every render)
  const extractShootingEfficiency = useCallback(() => {
    const awayStats = game.team_stats?.find((t: any) => t.homeAway === 'away' || t.home_away === 'away');
    const homeStats = game.team_stats?.find((t: any) => t.homeAway === 'home' || t.home_away === 'home');

    if (!awayStats || !homeStats) {
      return {
        away: { fgPct: 0, fgMade: 0, fgAttempted: 0 },
        home: { fgPct: 0, fgMade: 0, fgAttempted: 0 },
      };
    }

    const isESPNFormat = awayStats.statistics !== undefined;

    if (isESPNFormat) {
      const getStatValue = (stats: any[], name: string) => {
        return stats.find((s: any) => s.name === name)?.displayValue || '0';
      };

      const awayFGStr = getStatValue(awayStats.statistics, 'fieldGoalsMade-fieldGoalsAttempted');
      const homeFGStr = getStatValue(homeStats.statistics, 'fieldGoalsMade-fieldGoalsAttempted');
      const [awayFGM, awayFGA] = awayFGStr.split('-').map(Number);
      const [homeFGM, homeFGA] = homeFGStr.split('-').map(Number);
      const awayFGPct = parseFloat(getStatValue(awayStats.statistics, 'fieldGoalPct'));
      const homeFGPct = parseFloat(getStatValue(homeStats.statistics, 'fieldGoalPct'));

      return {
        away: { fgPct: awayFGPct, fgMade: awayFGM, fgAttempted: awayFGA },
        home: { fgPct: homeFGPct, fgMade: homeFGM, fgAttempted: homeFGA },
      };
    } else {
      return {
        away: {
          fgPct: awayStats.field_goal_pct || 0,
          fgMade: awayStats.field_goals_made || 0,
          fgAttempted: awayStats.field_goals_attempted || 0,
        },
        home: {
          fgPct: homeStats.field_goal_pct || 0,
          fgMade: homeStats.field_goals_made || 0,
          fgAttempted: homeStats.field_goals_attempted || 0,
        },
      };
    }
  }, [game.team_stats]);

  // Memoize team leaders calculation to avoid recomputing on every render
  const teamLeaders = useMemo(() => {
    return extractTeamLeaders(selectedStatType);
  }, [extractTeamLeaders, selectedStatType]);

  // Memoize shooting efficiency calculation to avoid recomputing on every render
  const shootingEfficiency = useMemo(() => {
    return extractShootingEfficiency();
  }, [extractShootingEfficiency]);

  return (
    <>
      {/* Sticky Header */}
      <StickyHeader
        awayTeam={{
          name: game.away_team_name,
          abbr: game.away_team_abbr,
          logo: awayTeamLogo,
          score: game.away_score,
        }}
        homeTeam={{
          name: game.home_team_name,
          abbr: game.home_team_abbr,
          logo: homeTeamLogo,
          score: game.home_score,
        }}
        status={game.status_detail || game.status}
        isCompleted={game.is_completed}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Hero Section */}
      <GameHero
        awayTeam={{
          name: game.away_team_name,
          abbr: game.away_team_abbr,
          logo: awayTeamLogo,
          score: game.away_score,
          apRank: game.away_team_ap_rank,
          color: game.away_team_color,
        }}
        homeTeam={{
          name: game.home_team_name,
          abbr: game.home_team_abbr,
          logo: homeTeamLogo,
          score: game.home_score,
          apRank: game.home_team_ap_rank,
          color: game.home_team_color,
        }}
        status={game.status_detail || game.status}
        statusDetail={game.status_detail}
        venue={game.venue_name}
        attendance={game.attendance}
        isCompleted={game.is_completed}
      />

      {/* Tab Navigation - becomes sticky on scroll */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {/* Tab Content */}
      <div className="mt-8">
        {activeTab === 'overview' && (
          <OverviewTab
            eventId={game.event_id}
            awayTeam={{
              name: game.away_team_name,
              abbr: game.away_team_abbr,
              logo: awayTeamLogo,
              color: game.away_team_color,
              id: game.away_team_id,
            }}
            homeTeam={{
              name: game.home_team_name,
              abbr: game.home_team_abbr,
              logo: homeTeamLogo,
              color: game.home_team_color,
              id: game.home_team_id,
            }}
            teamLeaders={teamLeaders}
            selectedStatType={selectedStatType}
            onStatTypeChange={setSelectedStatType}
            shootingEfficiency={shootingEfficiency}
            leadChanges={leadChanges}
            isCompleted={game.is_completed}
            onViewLeadChanges={handleViewLeadChanges}
            plays={plays}
          />
        )}

        {activeTab === 'playbyplay' && (
          <PlayByPlay
            eventId={game.event_id}
            awayTeamName={game.away_team_name}
            awayTeamAbbr={game.away_team_abbr}
            awayTeamId={game.away_team_id ? String(game.away_team_id) : undefined}
            awayTeamColor={game.away_team_color}
            awayTeamLogo={awayTeamLogo}
            homeTeamName={game.home_team_name}
            homeTeamAbbr={game.home_team_abbr}
            homeTeamId={game.home_team_id ? String(game.home_team_id) : undefined}
            homeTeamColor={game.home_team_color}
            homeTeamLogo={homeTeamLogo}
            initialFilterLeadChanges={showLeadChangesFilter}
            plays={plays}
          />
        )}

        {activeTab === 'boxscore' && (
          <BoxScoreTab
            game={game}
            awayTeamLogo={awayTeamLogo}
            homeTeamLogo={homeTeamLogo}
          />
        )}

        {activeTab === 'advanced' && (
          <AdvancedStatsTab
            game={game}
            awayTeamLogo={awayTeamLogo}
            homeTeamLogo={homeTeamLogo}
            awayTeamColor={game.away_team_color}
            homeTeamColor={game.home_team_color}
            awayTeamAbbr={game.away_team_abbr}
            homeTeamAbbr={game.home_team_abbr}
          />
        )}

        {activeTab === 'betting' && (
          <PredictionsTab
            game={game}
            awayTeamLogo={awayTeamLogo}
            homeTeamLogo={homeTeamLogo}
          />
        )}
      </div>
    </>
  );
}
