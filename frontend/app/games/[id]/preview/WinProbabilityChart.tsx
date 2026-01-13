'use client';

import { useState } from 'react';

interface WinProbabilityChartProps {
  awayTeamName: string;
  awayTeamLogo: string;
  awayTeamColor?: string;
  awayWinProbability: string;
  homeTeamName: string;
  homeTeamLogo: string;
  homeTeamColor?: string;
  homeWinProbability: string;
}

export default function WinProbabilityChart({
  awayTeamName,
  awayTeamLogo,
  awayTeamColor,
  awayWinProbability,
  homeTeamName,
  homeTeamLogo,
  homeTeamColor,
  homeWinProbability,
}: WinProbabilityChartProps) {
  const [hoveredTeam, setHoveredTeam] = useState<'away' | 'home' | null>(null);

  const awayColor = awayTeamColor ? `#${awayTeamColor}` : '#2563eb';
  const homeColor = homeTeamColor ? `#${homeTeamColor}` : '#16a34a';

  const awayPercentage = parseFloat(awayWinProbability);
  const homePercentage = parseFloat(homeWinProbability);

  return (
    <div className="flex items-center justify-center py-8 overflow-visible">
      <div className="relative overflow-visible" style={{ width: '400px', height: '400px' }}>
        <svg width="400" height="400" viewBox="0 0 400 400" className="transform -rotate-90 overflow-visible" style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' }}>
          <defs>
            <linearGradient id="awayGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: awayColor, stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: awayColor + 'dd', stopOpacity: 1 }} />
            </linearGradient>
            <linearGradient id="homeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: homeColor, stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: homeColor + 'dd', stopOpacity: 1 }} />
            </linearGradient>
          </defs>

          {/* Away team slice */}
          <circle
            cx="200"
            cy="200"
            r="140"
            fill="transparent"
            stroke="url(#awayGradient)"
            strokeWidth="90"
            strokeDasharray={`${(awayPercentage / 100) * 879.65} 879.65`}
            className="transition-all duration-300 cursor-pointer"
            style={{ opacity: hoveredTeam === 'home' ? 0.3 : 1 }}
            onMouseEnter={() => setHoveredTeam('away')}
            onMouseLeave={() => setHoveredTeam(null)}
          />

          {/* Home team slice */}
          <circle
            cx="200"
            cy="200"
            r="140"
            fill="transparent"
            stroke="url(#homeGradient)"
            strokeWidth="90"
            strokeDasharray={`${(homePercentage / 100) * 879.65} 879.65`}
            strokeDashoffset={`-${(awayPercentage / 100) * 879.65}`}
            className="transition-all duration-300 cursor-pointer"
            style={{ opacity: hoveredTeam === 'away' ? 0.3 : 1 }}
            onMouseEnter={() => setHoveredTeam('home')}
            onMouseLeave={() => setHoveredTeam(null)}
          />

          {/* Center white circle */}
          <circle cx="200" cy="200" r="95" fill="white" />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center transform rotate-0">
            {/* Default state */}
            {!hoveredTeam && (
              <div className="transition-opacity duration-200">
                <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Matchup</div>
                <div className="text-lg font-bold text-gray-900">Predictor</div>
              </div>
            )}

            {/* Away team hover */}
            {hoveredTeam === 'away' && (
              <div className="transition-opacity duration-200" key="away-info">
                {awayTeamLogo && (
                  <img
                    src={awayTeamLogo}
                    alt={awayTeamName}
                    className="w-16 h-16 mx-auto mb-2"
                  />
                )}
                <div className="text-sm font-bold text-gray-900 mb-1">
                  {awayTeamName} (Away)
                </div>
                <div className="text-4xl font-bold" style={{ color: awayColor }}>
                  {awayWinProbability}%
                </div>
                <div className="text-xs text-gray-500 mt-1">Win Probability</div>
              </div>
            )}

            {/* Home team hover */}
            {hoveredTeam === 'home' && (
              <div className="transition-opacity duration-200" key="home-info">
                {homeTeamLogo && (
                  <img
                    src={homeTeamLogo}
                    alt={homeTeamName}
                    className="w-16 h-16 mx-auto mb-2"
                  />
                )}
                <div className="text-sm font-bold text-gray-900 mb-1">
                  {homeTeamName} (Home)
                </div>
                <div className="text-4xl font-bold" style={{ color: homeColor }}>
                  {homeWinProbability}%
                </div>
                <div className="text-xs text-gray-500 mt-1">Win Probability</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
