'use client';

import GameFlow from '../GameFlow';
import { hexToRgba, isLightColor, ensureHexPrefix } from '../utils/colors';

interface Player {
  name: string;
  value: number;
  headshot?: string;
  playerId?: string;
}

interface OverviewTabProps {
  eventId: number;
  awayTeam: {
    name: string;
    abbr: string;
    logo: string;
    color?: string;
    id?: number;
  };
  homeTeam: {
    name: string;
    abbr: string;
    logo: string;
    color?: string;
    id?: number;
  };
  leadingScorers: {
    away: Player[];
    home: Player[];
  };
  shootingEfficiency: {
    away: { fgPct: number; fgMade: number; fgAttempted: number };
    home: { fgPct: number; fgMade: number; fgAttempted: number };
  };
  leadChanges: number;
  isCompleted?: boolean;
}

export default function OverviewTab({
  eventId,
  awayTeam,
  homeTeam,
  leadingScorers,
  shootingEfficiency,
  leadChanges,
  isCompleted,
}: OverviewTabProps) {
  // Helper function to get dynamic font size based on name length
  const getNameFontSize = (name: string) => {
    const length = name.length;
    if (length <= 12) return 'text-base'; // 16px
    if (length <= 16) return 'text-sm'; // 14px
    if (length <= 20) return 'text-xs'; // 12px
    return 'text-[11px]'; // 11px for very long names
  };

  return (
    <div className="space-y-8">
      {/* Key Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Leading Scorers Card */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Leading Scorers</h3>
            <p className="text-xs text-gray-600 mt-1">Top points per team</p>
          </div>
          <div className="p-6 space-y-4">
            {/* Away Team Leader */}
            {leadingScorers.away[0] && (
              <div
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: hexToRgba(awayTeam.color, 0.15) }}
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {leadingScorers.away[0].headshot ? (
                    <img
                      src={leadingScorers.away[0].headshot}
                      alt={leadingScorers.away[0].name}
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-white shadow-md"
                    />
                  ) : (
                    <img src={awayTeam.logo} alt={awayTeam.name} className="w-10 h-10 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 mr-4">
                    <p className={`font-semibold text-gray-900 truncate ${getNameFontSize(leadingScorers.away[0].name)}`}>
                      {leadingScorers.away[0].name}
                    </p>
                    <p className="text-xs text-gray-500">{awayTeam.abbr}</p>
                  </div>
                </div>
                <span
                  className="text-3xl font-black flex-shrink-0"
                  style={{ color: ensureHexPrefix(awayTeam.color) || '#3B82F6' }}
                >
                  {leadingScorers.away[0].value}
                </span>
              </div>
            )}

            {/* Home Team Leader */}
            {leadingScorers.home[0] && (
              <div
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: hexToRgba(homeTeam.color, 0.15) }}
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {leadingScorers.home[0].headshot ? (
                    <img
                      src={leadingScorers.home[0].headshot}
                      alt={leadingScorers.home[0].name}
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-white shadow-md"
                    />
                  ) : (
                    <img src={homeTeam.logo} alt={homeTeam.name} className="w-10 h-10 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 mr-4">
                    <p className={`font-semibold text-gray-900 truncate ${getNameFontSize(leadingScorers.home[0].name)}`}>
                      {leadingScorers.home[0].name}
                    </p>
                    <p className="text-xs text-gray-500">{homeTeam.abbr}</p>
                  </div>
                </div>
                <span
                  className="text-3xl font-black flex-shrink-0"
                  style={{ color: ensureHexPrefix(homeTeam.color) || '#EF4444' }}
                >
                  {leadingScorers.home[0].value}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Shooting Efficiency Card */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Shooting Efficiency</h3>
            <p className="text-xs text-gray-600 mt-1">Field goal percentage</p>
          </div>
          <div className="p-6 space-y-6">
            {/* Away Team */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <img src={awayTeam.logo} alt={awayTeam.name} className="w-6 h-6" />
                  <span className="text-sm font-medium text-gray-700">{awayTeam.abbr}</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {shootingEfficiency.away.fgPct.toFixed(1)}%
                </span>
              </div>
              <div className="text-xs text-gray-500 mb-2">
                {shootingEfficiency.away.fgMade}-{shootingEfficiency.away.fgAttempted} FG
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${shootingEfficiency.away.fgPct}%`,
                    backgroundColor: ensureHexPrefix(awayTeam.color) || '#3B82F6',
                  }}
                />
              </div>
            </div>

            {/* Home Team */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <img src={homeTeam.logo} alt={homeTeam.name} className="w-6 h-6" />
                  <span className="text-sm font-medium text-gray-700">{homeTeam.abbr}</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {shootingEfficiency.home.fgPct.toFixed(1)}%
                </span>
              </div>
              <div className="text-xs text-gray-500 mb-2">
                {shootingEfficiency.home.fgMade}-{shootingEfficiency.home.fgAttempted} FG
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${shootingEfficiency.home.fgPct}%`,
                    backgroundColor: ensureHexPrefix(homeTeam.color) || '#EF4444',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Lead Changes Card */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Game Competitiveness</h3>
            <p className="text-xs text-gray-600 mt-1">Lead changes</p>
          </div>
          <div className="p-6 flex flex-col items-center justify-center h-48">
            <div className="text-center">
              <div className="text-6xl font-black text-purple-600 mb-3">
                {leadChanges}
              </div>
              <p className="text-sm font-medium text-gray-600">
                {leadChanges === 0 && 'Dominant Performance'}
                {leadChanges >= 1 && leadChanges <= 3 && 'Competitive Game'}
                {leadChanges >= 4 && leadChanges <= 8 && 'Back and Forth Battle'}
                {leadChanges > 8 && 'Highly Competitive Thriller'}
              </p>
              <p className="text-xs text-gray-500 mt-2">Times the lead changed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Game Flow Chart */}
      <GameFlow
        eventId={eventId}
        awayTeamName={awayTeam.name}
        awayTeamAbbr={awayTeam.abbr}
        awayTeamId={awayTeam.id}
        awayTeamColor={awayTeam.color}
        homeTeamName={homeTeam.name}
        homeTeamAbbr={homeTeam.abbr}
        homeTeamId={homeTeam.id}
        homeTeamColor={homeTeam.color}
        isCompleted={isCompleted}
      />

      {/* Line Score - if we want to include it here */}
    </div>
  );
}
