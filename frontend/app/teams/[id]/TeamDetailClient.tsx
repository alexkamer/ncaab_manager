'use client';

import { useState } from 'react';
import TeamHero from './components/TeamHero';
import StickyHeader from './components/StickyHeader';
import TabNavigation from './components/TabNavigation';
import OverviewTab from './tabs/OverviewTab';
import ScheduleTab from './tabs/ScheduleTab';
import StatsTab from './tabs/StatsTab';
import RosterTab from './tabs/RosterTab';
import BettingTab from './tabs/BettingTab';

interface TeamDetailClientProps {
  team: any; // Full team data from API
}

export default function TeamDetailClient({ team }: TeamDetailClientProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const standings = team.standings || {};
  const ranking = team.ranking;
  const teamStats = team.team_stats || {};
  const leaders = team.leaders || [];
  const roster = team.roster || [];

  // Separate completed and upcoming games
  const completedGames = (team.games || []).filter((g: any) => g.is_completed);
  const upcomingGames = (team.games || []).filter((g: any) => !g.is_completed);

  return (
    <>
      {/* Sticky Header */}
      <StickyHeader
        team={{
          id: team.team_id,
          displayName: team.display_name,
          abbreviation: team.abbreviation,
          logo: team.logo_url,
          color: team.color,
          rank: ranking?.current_rank,
        }}
        record={{
          wins: standings.wins,
          losses: standings.losses,
        }}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Hero Section */}
      <TeamHero
        team={{
          id: team.team_id,
          displayName: team.display_name,
          abbreviation: team.abbreviation,
          logo: team.logo_url,
          color: team.color,
          conferenceName: team.conference_name,
          conferenceAbbr: team.conference_abbr,
          venueCity: team.venue_city,
          venueState: team.venue_state,
          venueName: team.venue_name,
        }}
        ranking={ranking}
        standings={standings}
        completedGames={completedGames}
        upcomingGames={upcomingGames}
      />

      {/* Tab Navigation - becomes sticky on scroll */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Tab Content */}
      <div className="mt-8">
        {activeTab === 'overview' && (
          <OverviewTab
            team={team}
            standings={standings}
            teamStats={teamStats}
            leaders={leaders}
            completedGames={completedGames}
            upcomingGames={upcomingGames}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleTab
            completedGames={completedGames}
            upcomingGames={upcomingGames}
            teamId={team.team_id}
          />
        )}

        {activeTab === 'stats' && (
          <StatsTab
            team={team}
            teamStats={teamStats}
            standings={standings}
            ranking={ranking}
          />
        )}

        {activeTab === 'roster' && (
          <RosterTab
            roster={roster}
            teamColor={team.color}
          />
        )}

        {activeTab === 'betting' && (
          <BettingTab
            completedGames={completedGames}
            upcomingGames={upcomingGames}
            teamId={team.team_id}
            standings={standings}
          />
        )}
      </div>
    </>
  );
}
