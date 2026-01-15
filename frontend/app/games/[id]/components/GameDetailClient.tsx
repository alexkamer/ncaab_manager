'use client';

import { useState, useEffect } from 'react';
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

export default function GameDetailClient({ game, awayTeamLogo, homeTeamLogo }: GameDetailClientProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [leadChanges, setLeadChanges] = useState(7); // Default placeholder
  const [showLeadChangesFilter, setShowLeadChangesFilter] = useState(false);

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

  // Calculate actual lead changes from play-by-play data
  useEffect(() => {
    const calculateLeadChanges = async () => {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${API_BASE}/api/games/${game.event_id}/playbyplay`);
        if (!response.ok) return;

        const data = await response.json();
        const plays = data.plays || [];

        // Count lead changes using the same logic as the play-by-play filter
        // IMPORTANT: Lead changes can ONLY happen on scoring plays
        let count = 0;
        for (let i = 0; i < plays.length; i++) {
          const currentPlay = plays[i];

          // Lead changes can ONLY occur on scoring plays
          if (!currentPlay.scoringPlay) continue;

          const currLeader = currentPlay.homeScore > currentPlay.awayScore ? "home" :
                             currentPlay.awayScore > currentPlay.homeScore ? "away" : "tied";

          // Current play must result in a team leading (not tied)
          if (currLeader === "tied") continue;

          // Find the last play where a team had the lead (skip ties)
          let isLeadChange = false;
          for (let j = i - 1; j >= 0; j--) {
            const prevPlay = plays[j];
            const leader = prevPlay.homeScore > prevPlay.awayScore ? "home" :
                          prevPlay.awayScore > prevPlay.homeScore ? "away" : "tied";

            if (leader !== "tied") {
              // This is the last time someone had the lead
              isLeadChange = leader !== currLeader;
              break;
            }
          }

          // If no previous leader found (start of game), this is the first lead
          if (i === 0 || plays.slice(0, i).every((p: any) => p.homeScore === p.awayScore)) {
            isLeadChange = true;
          }

          if (isLeadChange) count++;
        }

        setLeadChanges(count);
      } catch (error) {
        console.error('Error calculating lead changes:', error);
      }
    };

    if (game.is_completed && game.event_id) {
      calculateLeadChanges();
    }
  }, [game.event_id, game.is_completed]);

  // Extract leading scorers
  const extractLeadingScorers = () => {
    let awayLeaders: any[] = [];
    let homeLeaders: any[] = [];

    if (game.source === 'espn' && game.players) {
      game.players.forEach((teamData: any) => {
        const allPlayers = teamData.statistics[0]?.athletes || [];
        const isHomeTeam = teamData.team.id === String(game.home_team_id);
        const pointsIndex = teamData.statistics[0]?.labels?.indexOf('PTS') ?? -1;

        if (pointsIndex !== -1) {
          const leaders = allPlayers
            .map((p: any) => ({
              name: p.athlete?.displayName || '',
              value: parseInt(p.stats?.[pointsIndex] || '0'),
              headshot: p.athlete?.headshot?.href,
              playerId: p.athlete?.id,
            }))
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
          .map((p: any) => ({
            name: p.display_name || p.full_name,
            value: p.points || 0,
            headshot: p.headshot_url || p.photo_url,
            playerId: p.player_id || p.id,
          }))
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
  };

  // Extract shooting efficiency
  const extractShootingEfficiency = () => {
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
  };

  const leadingScorers = extractLeadingScorers();
  const shootingEfficiency = extractShootingEfficiency();

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
            leadingScorers={leadingScorers}
            shootingEfficiency={shootingEfficiency}
            leadChanges={leadChanges}
            isCompleted={game.is_completed}
            onViewLeadChanges={handleViewLeadChanges}
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
