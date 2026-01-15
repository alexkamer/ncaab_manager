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
  teamLeaders: {
    away: Player[];
    home: Player[];
  };
  selectedStatType: string;
  onStatTypeChange: (statType: string) => void;
  shootingEfficiency: {
    away: { fgPct: number; fgMade: number; fgAttempted: number };
    home: { fgPct: number; fgMade: number; fgAttempted: number };
  };
  leadChanges: number;
  isCompleted?: boolean;
  onViewLeadChanges?: () => void;
}

export default function OverviewTab({
  eventId,
  awayTeam,
  homeTeam,
  teamLeaders,
  selectedStatType,
  onStatTypeChange,
  shootingEfficiency,
  leadChanges,
  isCompleted,
  onViewLeadChanges,
}: OverviewTabProps) {
  // Stat type options
  const statTypes = [
    { value: 'PTS', label: 'Points', unit: 'PTS' },
    { value: 'REB', label: 'Rebounds', unit: 'REB' },
    { value: 'AST', label: 'Assists', unit: 'AST' },
    { value: 'STL', label: 'Steals', unit: 'STL' },
    { value: 'BLK', label: 'Blocks', unit: 'BLK' },
    { value: 'FG%', label: 'FG%', unit: '%' },
    { value: '3PT', label: '3-Pointers', unit: '3PT' },
  ];

  const currentStatType = statTypes.find(s => s.value === selectedStatType) || statTypes[0];

  // Helper function to get dynamic font size based on name length - removed, using responsive sizing instead

  // Format stat value based on type
  const formatStatValue = (value: number, statType: string) => {
    if (statType === 'FG%') {
      return value.toFixed(1) + '%';
    }
    return Math.round(value).toString();
  };

  return (
    <div className="space-y-8">
      {/* Key Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Team Leaders Card */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 leading-tight" style={{ fontSize: 'clamp(0.75rem, 3vw, 1.125rem)' }}>
                  Team Leaders
                </h3>
                <p className="text-xs text-gray-600 mt-1">Top performer per team</p>
              </div>
              <select
                value={selectedStatType}
                onChange={(e) => onStatTypeChange(e.target.value)}
                className="font-semibold text-gray-700 bg-white border border-gray-300 rounded-md px-2 py-1.5 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors cursor-pointer flex-shrink-0"
                style={{ fontSize: 'clamp(0.65rem, 2.5vw, 0.875rem)' }}
              >
                {statTypes.map(stat => (
                  <option key={stat.value} value={stat.value}>
                    {stat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {/* Away Team Leader */}
            {teamLeaders.away[0] && (
              <div
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: hexToRgba(awayTeam.color, 0.15) }}
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {teamLeaders.away[0].headshot ? (
                    <img
                      src={teamLeaders.away[0].headshot}
                      alt={teamLeaders.away[0].name}
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-white shadow-md"
                    />
                  ) : (
                    <img src={awayTeam.logo} alt={awayTeam.name} className="w-10 h-10 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="font-semibold text-gray-900 leading-tight" style={{ fontSize: 'clamp(0.625rem, 2.5vw, 1rem)' }}>
                      {teamLeaders.away[0].name}
                    </p>
                    <p className="text-xs text-gray-500">{awayTeam.abbr}</p>
                  </div>
                </div>
                <span
                  className="text-3xl font-black flex-shrink-0"
                  style={{ color: ensureHexPrefix(awayTeam.color) || '#3B82F6' }}
                >
                  {formatStatValue(teamLeaders.away[0].value, selectedStatType)}
                </span>
              </div>
            )}

            {/* Home Team Leader */}
            {teamLeaders.home[0] && (
              <div
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: hexToRgba(homeTeam.color, 0.15) }}
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {teamLeaders.home[0].headshot ? (
                    <img
                      src={teamLeaders.home[0].headshot}
                      alt={teamLeaders.home[0].name}
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-white shadow-md"
                    />
                  ) : (
                    <img src={homeTeam.logo} alt={homeTeam.name} className="w-10 h-10 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="font-semibold text-gray-900 leading-tight" style={{ fontSize: 'clamp(0.625rem, 2.5vw, 1rem)' }}>
                      {teamLeaders.home[0].name}
                    </p>
                    <p className="text-xs text-gray-500">{homeTeam.abbr}</p>
                  </div>
                </div>
                <span
                  className="text-3xl font-black flex-shrink-0"
                  style={{ color: ensureHexPrefix(homeTeam.color) || '#EF4444' }}
                >
                  {formatStatValue(teamLeaders.home[0].value, selectedStatType)}
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
        <div
          className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all cursor-pointer group hover:border-purple-300"
          onClick={onViewLeadChanges}
        >
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200 group-hover:from-purple-100 group-hover:to-pink-100 transition-all">
            <h3 className="text-lg font-bold text-gray-900">Game Competitiveness</h3>
            <p className="text-xs text-gray-600 mt-1">Lead changes</p>
          </div>
          <div className="p-6 flex flex-col items-center justify-center h-48">
            <div className="text-center">
              <div className="text-6xl font-black text-purple-600 mb-3 group-hover:scale-110 transition-transform">
                {leadChanges}
              </div>
              <p className="text-sm font-medium text-gray-600">
                {leadChanges === 0 && 'Dominant Performance'}
                {leadChanges >= 1 && leadChanges <= 3 && 'Competitive Game'}
                {leadChanges >= 4 && leadChanges <= 8 && 'Back and Forth Battle'}
                {leadChanges > 8 && 'Highly Competitive Thriller'}
              </p>
              <p className="text-xs text-gray-500 mt-2">Times the lead changed</p>
              {leadChanges > 0 && (
                <button className="mt-3 text-xs text-purple-600 font-semibold hover:text-purple-700 flex items-center gap-1 mx-auto group-hover:gap-2 transition-all">
                  View all lead changes
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
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
