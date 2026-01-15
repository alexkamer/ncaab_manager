'use client';

import { useState } from 'react';

interface AdvancedStatsTabProps {
  game: any;
  awayTeamLogo: string;
  homeTeamLogo: string;
  awayTeamColor?: string;
  homeTeamColor?: string;
  awayTeamAbbr?: string;
  homeTeamAbbr?: string;
}

// Tooltip component for stat explanations
function StatTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block ml-2">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Info"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      </button>
      {show && (
        <div className="absolute z-10 w-64 p-2 mt-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg -left-28 top-full">
          {text}
        </div>
      )}
    </div>
  );
}

// Helper to determine if a team has advantage (higher is better by default)
function hasAdvantage(value1: number, value2: number, lowerIsBetter = false): 'first' | 'second' | 'tie' {
  if (value1 === value2) return 'tie';
  if (lowerIsBetter) {
    return value1 < value2 ? 'first' : 'second';
  }
  return value1 > value2 ? 'first' : 'second';
}

export default function AdvancedStatsTab({
  game,
  awayTeamLogo,
  homeTeamLogo,
  awayTeamColor,
  homeTeamColor,
  awayTeamAbbr,
  homeTeamAbbr,
}: AdvancedStatsTabProps) {
  if (!game.team_stats || game.team_stats.length !== 2) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-500">
        <p className="text-lg">Advanced statistics not available for this game.</p>
      </div>
    );
  }

  const awayStats = game.team_stats.find((t: any) => t.homeAway === 'away' || t.home_away === 'away');
  const homeStats = game.team_stats.find((t: any) => t.homeAway === 'home' || t.home_away === 'home');

  if (!awayStats || !homeStats) return null;

  const isESPNFormat = awayStats.statistics !== undefined;

  // Extract shooting efficiency data
  let awayFGPct: number, homeFGPct: number, away3PPct: number, home3PPct: number, awayFTPct: number, homeFTPct: number;
  let awayFGM: number, awayFGA: number, homeFGM: number, homeFGA: number;
  let away3PM: number, away3PA: number, home3PM: number, home3PA: number;
  let awayFTM: number, awayFTA: number, homeFTM: number, homeFTA: number;

  if (isESPNFormat) {
    const getStatValue = (stats: any[], name: string) => {
      const stat = stats.find((s: any) => s.name === name);
      return stat?.displayValue || '0';
    };

    const awayFGStr = getStatValue(awayStats.statistics, 'fieldGoalsMade-fieldGoalsAttempted');
    const homeFGStr = getStatValue(homeStats.statistics, 'fieldGoalsMade-fieldGoalsAttempted');
    [awayFGM, awayFGA] = awayFGStr.split('-').map(Number);
    [homeFGM, homeFGA] = homeFGStr.split('-').map(Number);

    const away3PStr = getStatValue(awayStats.statistics, 'threePointFieldGoalsMade-threePointFieldGoalsAttempted');
    const home3PStr = getStatValue(homeStats.statistics, 'threePointFieldGoalsMade-threePointFieldGoalsAttempted');
    [away3PM, away3PA] = away3PStr.split('-').map(Number);
    [home3PM, home3PA] = home3PStr.split('-').map(Number);

    const awayFTStr = getStatValue(awayStats.statistics, 'freeThrowsMade-freeThrowsAttempted');
    const homeFTStr = getStatValue(homeStats.statistics, 'freeThrowsMade-freeThrowsAttempted');
    [awayFTM, awayFTA] = awayFTStr.split('-').map(Number);
    [homeFTM, homeFTA] = homeFTStr.split('-').map(Number);

    awayFGPct = parseFloat(getStatValue(awayStats.statistics, 'fieldGoalPct'));
    homeFGPct = parseFloat(getStatValue(homeStats.statistics, 'fieldGoalPct'));
    away3PPct = parseFloat(getStatValue(awayStats.statistics, 'threePointFieldGoalPct'));
    home3PPct = parseFloat(getStatValue(homeStats.statistics, 'threePointFieldGoalPct'));
    awayFTPct = parseFloat(getStatValue(awayStats.statistics, 'freeThrowPct'));
    homeFTPct = parseFloat(getStatValue(homeStats.statistics, 'freeThrowPct'));
  } else {
    awayFGPct = awayStats.field_goal_pct || 0;
    homeFGPct = homeStats.field_goal_pct || 0;
    away3PPct = awayStats.three_point_pct || 0;
    home3PPct = homeStats.three_point_pct || 0;
    awayFTPct = awayStats.free_throw_pct || 0;
    homeFTPct = homeStats.free_throw_pct || 0;
    awayFGM = awayStats.field_goals_made;
    awayFGA = awayStats.field_goals_attempted;
    homeFGM = homeStats.field_goals_made;
    homeFGA = homeStats.field_goals_attempted;
    away3PM = awayStats.three_point_made;
    away3PA = awayStats.three_point_attempted;
    home3PM = homeStats.three_point_made;
    home3PA = homeStats.three_point_attempted;
    awayFTM = awayStats.free_throws_made;
    awayFTA = awayStats.free_throws_attempted;
    homeFTM = homeStats.free_throws_made;
    homeFTA = homeStats.free_throws_attempted;
  }

  // Calculate 2-pointers
  const away2PM = awayFGM - away3PM;
  const away2PA = awayFGA - away3PA;
  const home2PM = homeFGM - home3PM;
  const home2PA = homeFGA - home3PA;

  // Extract key stats
  let awayTurnovers: any, homeTurnovers: any;
  let awayFastBreak: any, homeFastBreak: any, awayPaint: any, homePaint: any, awayBench: any, homeBench: any;
  let awayLargestLead: any, homeLargestLead: any;

  if (isESPNFormat) {
    const getStatValue = (stats: any[], name: string) => {
      const stat = stats.find((s: any) => s.name === name);
      return stat?.displayValue ?? '--';
    };

    awayTurnovers = getStatValue(awayStats.statistics, 'turnovers');
    homeTurnovers = getStatValue(homeStats.statistics, 'turnovers');
    awayFastBreak = getStatValue(awayStats.statistics, 'fastBreakPoints');
    homeFastBreak = getStatValue(homeStats.statistics, 'fastBreakPoints');
    awayPaint = getStatValue(awayStats.statistics, 'pointsInPaint');
    homePaint = getStatValue(homeStats.statistics, 'pointsInPaint');
    awayBench = getStatValue(awayStats.statistics, 'benchPoints');
    homeBench = getStatValue(homeStats.statistics, 'benchPoints');
    awayLargestLead = getStatValue(awayStats.statistics, 'largestLead');
    homeLargestLead = getStatValue(homeStats.statistics, 'largestLead');
  } else {
    awayTurnovers = awayStats.total_turnovers || awayStats.turnovers || 0;
    homeTurnovers = homeStats.total_turnovers || homeStats.turnovers || 0;
    awayFastBreak = awayStats.fast_break_points || 0;
    homeFastBreak = homeStats.fast_break_points || 0;
    awayPaint = awayStats.points_in_paint || 0;
    homePaint = homeStats.points_in_paint || 0;
    awayBench = awayStats.bench_points || 0;
    homeBench = homeStats.bench_points || 0;
    awayLargestLead = awayStats.largest_lead || 0;
    homeLargestLead = homeStats.largest_lead || 0;
  }

  // Get team colors with fallback
  const getTeamColor = (color?: string, fallback: string = '#3B82F6') => {
    if (!color) return fallback;
    return color.startsWith('#') ? color : `#${color}`;
  };

  const awayColor = getTeamColor(awayTeamColor, '#3B82F6');
  const homeColor = getTeamColor(homeTeamColor, '#EF4444');

  return (
    <div className="space-y-6">
      {/* Shooting Efficiency Section */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900">Shooting Efficiency</h2>
            <StatTooltip text="Percentage of successful field goals, three-pointers, and free throws. Higher percentages indicate better shooting performance." />
          </div>
          <p className="text-sm text-gray-600 mt-1">Complete shooting breakdown</p>
        </div>
        <div className="p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {/* Field Goal % */}
            <div>
              <div className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4 text-center">
                Field Goal %
              </div>
              <div className="space-y-4">
                {(() => {
                  const fgAdvantage = hasAdvantage(awayFGPct, homeFGPct);
                  return (
                    <>
                      <div className={`text-center p-4 rounded-lg transition-all ${fgAdvantage === 'first' ? 'bg-green-50 ring-2 ring-green-200' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <img src={awayTeamLogo} alt="" className="w-6 h-6" />
                          <span className="text-sm font-semibold text-gray-700">{game.away_team_abbr}</span>
                          {fgAdvantage === 'first' && (
                            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="text-4xl font-black text-gray-900 mb-2">
                          {awayFGPct.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600 font-medium">{awayFGM}-{awayFGA}</div>
                        <div className="w-full bg-gray-200 rounded-full h-3 mt-3 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${awayFGPct}%`,
                              background: `linear-gradient(90deg, ${awayColor} 0%, ${awayColor}dd 100%)`
                            }}
                          />
                        </div>
                      </div>
                      <div className={`text-center p-4 rounded-lg transition-all ${fgAdvantage === 'second' ? 'bg-green-50 ring-2 ring-green-200' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <img src={homeTeamLogo} alt="" className="w-6 h-6" />
                          <span className="text-sm font-semibold text-gray-700">{game.home_team_abbr}</span>
                          {fgAdvantage === 'second' && (
                            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="text-4xl font-black text-gray-900 mb-2">
                          {homeFGPct.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600 font-medium">{homeFGM}-{homeFGA}</div>
                        <div className="w-full bg-gray-200 rounded-full h-3 mt-3 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${homeFGPct}%`,
                              background: `linear-gradient(90deg, ${homeColor} 0%, ${homeColor}dd 100%)`
                            }}
                          />
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* 3-Point % */}
            <div>
              <div className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4 text-center">
                3-Point %
              </div>
              <div className="space-y-4">
                {(() => {
                  const threeAdvantage = hasAdvantage(away3PPct, home3PPct);
                  return (
                    <>
                      <div className={`text-center p-4 rounded-lg transition-all ${threeAdvantage === 'first' ? 'bg-green-50 ring-2 ring-green-200' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <img src={awayTeamLogo} alt="" className="w-6 h-6" />
                          <span className="text-sm font-semibold text-gray-700">{game.away_team_abbr}</span>
                          {threeAdvantage === 'first' && (
                            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="text-4xl font-black text-gray-900 mb-2">
                          {away3PPct.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600 font-medium">{away3PM}-{away3PA}</div>
                        <div className="w-full bg-gray-200 rounded-full h-3 mt-3 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${away3PPct}%`,
                              background: `linear-gradient(90deg, ${awayColor} 0%, ${awayColor}dd 100%)`
                            }}
                          />
                        </div>
                      </div>
                      <div className={`text-center p-4 rounded-lg transition-all ${threeAdvantage === 'second' ? 'bg-green-50 ring-2 ring-green-200' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <img src={homeTeamLogo} alt="" className="w-6 h-6" />
                          <span className="text-sm font-semibold text-gray-700">{game.home_team_abbr}</span>
                          {threeAdvantage === 'second' && (
                            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="text-4xl font-black text-gray-900 mb-2">
                          {home3PPct.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600 font-medium">{home3PM}-{home3PA}</div>
                        <div className="w-full bg-gray-200 rounded-full h-3 mt-3 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${home3PPct}%`,
                              background: `linear-gradient(90deg, ${homeColor} 0%, ${homeColor}dd 100%)`
                            }}
                          />
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Free Throw % */}
            <div>
              <div className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4 text-center">
                Free Throw %
              </div>
              <div className="space-y-4">
                {(() => {
                  const ftAdvantage = hasAdvantage(awayFTPct, homeFTPct);
                  return (
                    <>
                      <div className={`text-center p-4 rounded-lg transition-all ${ftAdvantage === 'first' ? 'bg-green-50 ring-2 ring-green-200' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <img src={awayTeamLogo} alt="" className="w-6 h-6" />
                          <span className="text-sm font-semibold text-gray-700">{game.away_team_abbr}</span>
                          {ftAdvantage === 'first' && (
                            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="text-4xl font-black text-gray-900 mb-2">
                          {awayFTPct.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600 font-medium">{awayFTM}-{awayFTA}</div>
                        <div className="w-full bg-gray-200 rounded-full h-3 mt-3 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${awayFTPct}%`,
                              background: `linear-gradient(90deg, ${awayColor} 0%, ${awayColor}dd 100%)`
                            }}
                          />
                        </div>
                      </div>
                      <div className={`text-center p-4 rounded-lg transition-all ${ftAdvantage === 'second' ? 'bg-green-50 ring-2 ring-green-200' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <img src={homeTeamLogo} alt="" className="w-6 h-6" />
                          <span className="text-sm font-semibold text-gray-700">{game.home_team_abbr}</span>
                          {ftAdvantage === 'second' && (
                            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="text-4xl font-black text-gray-900 mb-2">
                          {homeFTPct.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600 font-medium">{homeFTM}-{homeFTA}</div>
                        <div className="w-full bg-gray-200 rounded-full h-3 mt-3 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${homeFTPct}%`,
                              background: `linear-gradient(90deg, ${homeColor} 0%, ${homeColor}dd 100%)`
                            }}
                          />
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Points Distribution */}
          <div className="border-t border-gray-200 pt-8 mt-8">
            <div className="flex items-center justify-center mb-6">
              <div className="text-sm font-bold text-gray-500 uppercase tracking-wide text-center">
                Points Distribution
              </div>
              <StatTooltip text="Breakdown of total points scored by shot type. Shows the contribution of 2-pointers, 3-pointers, and free throws to the final score." />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Away Team */}
              <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-center space-x-2 mb-6">
                  <img src={awayTeamLogo} alt={game.away_team_name} className="w-8 h-8" />
                  <span className="font-bold text-gray-900 text-lg">{game.away_team_name}</span>
                  <span className="text-2xl font-black text-gray-700">{game.away_score}</span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="w-24 text-sm text-gray-600 font-semibold">2-Pointers</div>
                    <div className="flex-1 mx-3">
                      <div className="bg-gray-200 rounded-full h-9 overflow-hidden shadow-inner">
                        <div
                          className="h-full flex items-center justify-center text-sm font-bold text-white transition-all duration-700"
                          style={{
                            width: `${(away2PM * 2 / game.away_score) * 100}%`,
                            background: `linear-gradient(90deg, #3B82F6 0%, #2563EB 100%)`
                          }}
                        >
                          {away2PM * 2} pts
                        </div>
                      </div>
                    </div>
                    <div className="w-16 text-xs text-gray-500 text-right">{away2PM}-{away2PA}</div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-24 text-sm text-gray-600 font-semibold">3-Pointers</div>
                    <div className="flex-1 mx-3">
                      <div className="bg-gray-200 rounded-full h-9 overflow-hidden shadow-inner">
                        <div
                          className="h-full flex items-center justify-center text-sm font-bold text-white transition-all duration-700"
                          style={{
                            width: `${(away3PM * 3 / game.away_score) * 100}%`,
                            background: `linear-gradient(90deg, ${awayColor} 0%, ${awayColor}dd 100%)`
                          }}
                        >
                          {away3PM * 3} pts
                        </div>
                      </div>
                    </div>
                    <div className="w-16 text-xs text-gray-500 text-right">{away3PM}-{away3PA}</div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-24 text-sm text-gray-600 font-semibold">Free Throws</div>
                    <div className="flex-1 mx-3">
                      <div className="bg-gray-200 rounded-full h-9 overflow-hidden shadow-inner">
                        <div
                          className="h-full flex items-center justify-center text-sm font-bold text-white transition-all duration-700"
                          style={{
                            width: `${(awayFTM / game.away_score) * 100}%`,
                            background: `linear-gradient(90deg, #1E40AF 0%, #1E3A8A 100%)`
                          }}
                        >
                          {awayFTM} pts
                        </div>
                      </div>
                    </div>
                    <div className="w-16 text-xs text-gray-500 text-right">{awayFTM}-{awayFTA}</div>
                  </div>
                </div>
              </div>

              {/* Home Team */}
              <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-center space-x-2 mb-6">
                  <img src={homeTeamLogo} alt={game.home_team_name} className="w-8 h-8" />
                  <span className="font-bold text-gray-900 text-lg">{game.home_team_name}</span>
                  <span className="text-2xl font-black text-gray-700">{game.home_score}</span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="w-24 text-sm text-gray-600 font-semibold">2-Pointers</div>
                    <div className="flex-1 mx-3">
                      <div className="bg-gray-200 rounded-full h-9 overflow-hidden shadow-inner">
                        <div
                          className="h-full flex items-center justify-center text-sm font-bold text-white transition-all duration-700"
                          style={{
                            width: `${(home2PM * 2 / game.home_score) * 100}%`,
                            background: `linear-gradient(90deg, #EF4444 0%, #DC2626 100%)`
                          }}
                        >
                          {home2PM * 2} pts
                        </div>
                      </div>
                    </div>
                    <div className="w-16 text-xs text-gray-500 text-right">{home2PM}-{home2PA}</div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-24 text-sm text-gray-600 font-semibold">3-Pointers</div>
                    <div className="flex-1 mx-3">
                      <div className="bg-gray-200 rounded-full h-9 overflow-hidden shadow-inner">
                        <div
                          className="h-full flex items-center justify-center text-sm font-bold text-white transition-all duration-700"
                          style={{
                            width: `${(home3PM * 3 / game.home_score) * 100}%`,
                            background: `linear-gradient(90deg, ${homeColor} 0%, ${homeColor}dd 100%)`
                          }}
                        >
                          {home3PM * 3} pts
                        </div>
                      </div>
                    </div>
                    <div className="w-16 text-xs text-gray-500 text-right">{home3PM}-{home3PA}</div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-24 text-sm text-gray-600 font-semibold">Free Throws</div>
                    <div className="flex-1 mx-3">
                      <div className="bg-gray-200 rounded-full h-9 overflow-hidden shadow-inner">
                        <div
                          className="h-full flex items-center justify-center text-sm font-bold text-white transition-all duration-700"
                          style={{
                            width: `${(homeFTM / game.home_score) * 100}%`,
                            background: `linear-gradient(90deg, #B91C1C 0%, #991B1B 100%)`
                          }}
                        >
                          {homeFTM} pts
                        </div>
                      </div>
                    </div>
                    <div className="w-16 text-xs text-gray-500 text-right">{homeFTM}-{homeFTA}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Stats Section */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="bg-gradient-to-r from-green-50 to-teal-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900">Key Stats</h2>
            <StatTooltip text="Critical performance indicators including turnovers, fast break points, points in the paint, bench contributions, and lead size. These stats often determine game outcomes." />
          </div>
          <p className="text-sm text-gray-600 mt-1">Possession and scoring metrics</p>
        </div>
        <div className="p-6 md:p-8">
          <div className="space-y-5">
            {/* Turnovers (lower is better) */}
            {(() => {
              const toAdvantage = hasAdvantage(Number(awayTurnovers), Number(homeTurnovers), true);
              const awayPct = (Number(awayTurnovers) / (Number(awayTurnovers) + Number(homeTurnovers)) * 100).toFixed(0);
              return (
                <div className="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="w-full md:w-36 text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center">
                      Turnovers
                      <span className="ml-2 text-xs text-gray-400">(lower is better)</span>
                    </div>
                    <div className="flex-1 flex items-center justify-between px-0 md:px-6">
                      <div className={`flex items-center space-x-3 ${toAdvantage === 'first' ? 'px-3 py-2 bg-green-100 rounded-lg' : ''}`}>
                        <span className="text-base font-semibold text-gray-700">{game.away_team_abbr}</span>
                        <span className="text-2xl font-black text-gray-900">{awayTurnovers}</span>
                        {toAdvantage === 'first' && (
                          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 mx-4 md:mx-6 h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                        <div
                          className="h-full transition-all duration-700"
                          style={{
                            width: `${awayPct}%`,
                            background: toAdvantage === 'first' ? 'linear-gradient(90deg, #10B981 0%, #059669 100%)' : 'linear-gradient(90deg, #EF4444 0%, #DC2626 100%)'
                          }}
                        />
                      </div>
                      <div className={`flex items-center space-x-3 ${toAdvantage === 'second' ? 'px-3 py-2 bg-green-100 rounded-lg' : ''}`}>
                        <span className="text-2xl font-black text-gray-900">{homeTurnovers}</span>
                        <span className="text-base font-semibold text-gray-700">{game.home_team_abbr}</span>
                        {toAdvantage === 'second' && (
                          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Helper function for rendering key stats */}
            {[
              { label: 'Fast Break', awayVal: awayFastBreak, homeVal: homeFastBreak, gradient: 'linear-gradient(90deg, #3B82F6 0%, #2563EB 100%)' },
              { label: 'Points in Paint', awayVal: awayPaint, homeVal: homePaint, gradient: 'linear-gradient(90deg, #10B981 0%, #059669 100%)' },
              { label: 'Bench Points', awayVal: awayBench, homeVal: homeBench, gradient: 'linear-gradient(90deg, #8B5CF6 0%, #7C3AED 100%)' },
              { label: 'Largest Lead', awayVal: awayLargestLead, homeVal: homeLargestLead, gradient: 'linear-gradient(90deg, #F59E0B 0%, #D97706 100%)' },
            ].filter(stat => {
              // Filter out stats where both teams have no data (-- or both 0)
              const awayNum = stat.awayVal === '--' ? NaN : Number(stat.awayVal);
              const homeNum = stat.homeVal === '--' ? NaN : Number(stat.homeVal);

              // If both values are invalid (NaN), filter out
              if (isNaN(awayNum) && isNaN(homeNum)) return false;

              // If both values are 0, likely means no data available, filter out
              if (awayNum === 0 && homeNum === 0) return false;

              return true;
            }).map((stat) => {
              // Parse numeric values, handling strings like "0" and "--"
              const awayNum = stat.awayVal === '--' ? NaN : Number(stat.awayVal);
              const homeNum = stat.homeVal === '--' ? NaN : Number(stat.homeVal);

              // Check if data is available
              const hasData = !isNaN(awayNum) && !isNaN(homeNum);

              const advantage = hasData ? hasAdvantage(awayNum, homeNum) : 'tie';
              const total = hasData ? (awayNum + homeNum) || 1 : 1;
              const awayPercentage = hasData ? ((awayNum / total) * 100).toFixed(0) : '0';

              return (
                <div key={stat.label} className="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="w-full md:w-36 text-sm font-bold text-gray-500 uppercase tracking-wide">
                      {stat.label}
                    </div>
                    <div className="flex-1 flex items-center justify-between px-0 md:px-6">
                      <div className={`flex items-center space-x-3 ${advantage === 'first' ? 'px-3 py-2 bg-green-100 rounded-lg' : ''}`}>
                        <span className="text-base font-semibold text-gray-700">{game.away_team_abbr}</span>
                        <span className={`text-2xl font-black ${stat.awayVal === '--' ? 'text-gray-400' : 'text-gray-900'}`}>{stat.awayVal}</span>
                        {advantage === 'first' && (
                          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 mx-4 md:mx-6 h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                        {hasData ? (
                          <div
                            className="h-full transition-all duration-700"
                            style={{
                              width: `${awayPercentage}%`,
                              background: stat.gradient
                            }}
                          />
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <span className="text-xs text-gray-400">No data</span>
                          </div>
                        )}
                      </div>
                      <div className={`flex items-center space-x-3 ${advantage === 'second' ? 'px-3 py-2 bg-green-100 rounded-lg' : ''}`}>
                        <span className={`text-2xl font-black ${stat.homeVal === '--' ? 'text-gray-400' : 'text-gray-900'}`}>{stat.homeVal}</span>
                        <span className="text-base font-semibold text-gray-700">{game.home_team_abbr}</span>
                        {advantage === 'second' && (
                          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Team Statistics Comparison Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900">Full Team Statistics</h2>
            <StatTooltip text="Complete statistical comparison between teams. View all traditional box score metrics side-by-side." />
          </div>
        </div>

        {/* Team Headers */}
        <div className="flex items-center justify-between px-4 md:px-6 py-4 bg-gradient-to-r from-gray-50 via-white to-gray-50 border-b-2 border-gray-200">
          <div className="w-28 md:w-32 flex items-center justify-end space-x-2">
            <span className="text-sm font-bold text-gray-700">{game.away_team_abbr}</span>
            <img src={awayTeamLogo} alt={game.away_team_abbr} className="w-6 h-6" />
          </div>
          <div className="flex-1 text-center text-xs text-gray-500 uppercase tracking-wide font-semibold px-4 md:px-6">
            Statistic
          </div>
          <div className="w-28 md:w-32 flex items-center justify-start space-x-2">
            <img src={homeTeamLogo} alt={game.home_team_abbr} className="w-6 h-6" />
            <span className="text-sm font-bold text-gray-700">{game.home_team_abbr}</span>
          </div>
        </div>

        <div className="p-4 md:p-6">
          {(() => {
            if (isESPNFormat) {
              const keyStatNames = [
                'fieldGoalsMade-fieldGoalsAttempted',
                'fieldGoalPct',
                'threePointFieldGoalsMade-threePointFieldGoalsAttempted',
                'threePointFieldGoalPct',
                'freeThrowsMade-freeThrowsAttempted',
                'freeThrowPct',
                'totalRebounds',
                'offensiveRebounds',
                'defensiveRebounds',
                'assists',
                'steals',
                'blocks',
                'turnovers',
                'fouls'
              ];

              return (
                <div className="space-y-1">
                  {keyStatNames.map((statName) => {
                    const awayStat = awayStats.statistics.find((s: any) => s.name === statName);
                    const homeStat = homeStats.statistics.find((s: any) => s.name === statName);

                    if (!awayStat || !homeStat) return null;

                    const label = awayStat.label || awayStat.abbreviation || statName;

                    // Determine advantage for percentage stats
                    const isPercentageStat = statName.includes('Pct');
                    const isTurnoverStat = statName.includes('turnovers') || statName.includes('fouls');
                    let advantage: 'first' | 'second' | 'tie' = 'tie';

                    if (isPercentageStat || isTurnoverStat) {
                      const awayNum = parseFloat(awayStat.displayValue) || 0;
                      const homeNum = parseFloat(homeStat.displayValue) || 0;
                      advantage = hasAdvantage(awayNum, homeNum, isTurnoverStat);
                    }

                    return (
                      <div key={statName} className="flex items-center justify-between py-3 px-3 md:px-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors rounded">
                        <div className={`w-28 md:w-32 text-right font-bold text-lg ${advantage === 'first' ? 'text-green-600' : 'text-gray-900'}`}>
                          {awayStat.displayValue}
                        </div>
                        <div className="flex-1 text-center text-xs md:text-sm font-bold text-gray-600 uppercase px-4 md:px-6">
                          {label}
                        </div>
                        <div className={`w-28 md:w-32 text-left font-bold text-lg ${advantage === 'second' ? 'text-green-600' : 'text-gray-900'}`}>
                          {homeStat.displayValue}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            } else {
              // Database format
              const stats = [
                { key: 'fg', label: 'Field Goals', awayValue: `${awayStats.field_goals_made}-${awayStats.field_goals_attempted}`, homeValue: `${homeStats.field_goals_made}-${homeStats.field_goals_attempted}` },
                { key: 'fg_pct', label: 'FG%', awayValue: `${awayStats.field_goal_pct}%`, homeValue: `${homeStats.field_goal_pct}%` },
                { key: '3pt', label: '3-Pointers', awayValue: `${awayStats.three_point_made}-${awayStats.three_point_attempted}`, homeValue: `${homeStats.three_point_made}-${homeStats.three_point_attempted}` },
                { key: '3pt_pct', label: '3P%', awayValue: `${awayStats.three_point_pct}%`, homeValue: `${homeStats.three_point_pct}%` },
                { key: 'ft', label: 'Free Throws', awayValue: `${awayStats.free_throws_made}-${awayStats.free_throws_attempted}`, homeValue: `${homeStats.free_throws_made}-${homeStats.free_throws_attempted}` },
                { key: 'ft_pct', label: 'FT%', awayValue: `${awayStats.free_throw_pct}%`, homeValue: `${homeStats.free_throw_pct}%` },
                { key: 'reb', label: 'Total Rebounds', awayValue: awayStats.total_rebounds, homeValue: homeStats.total_rebounds },
                { key: 'oreb', label: 'Offensive Rebounds', awayValue: awayStats.offensive_rebounds, homeValue: homeStats.offensive_rebounds },
                { key: 'dreb', label: 'Defensive Rebounds', awayValue: awayStats.defensive_rebounds, homeValue: homeStats.defensive_rebounds },
                { key: 'ast', label: 'Assists', awayValue: awayStats.assists, homeValue: homeStats.assists },
                { key: 'stl', label: 'Steals', awayValue: awayStats.steals, homeValue: homeStats.steals },
                { key: 'blk', label: 'Blocks', awayValue: awayStats.blocks, homeValue: homeStats.blocks },
                { key: 'to', label: 'Turnovers', awayValue: awayStats.turnovers, homeValue: homeStats.turnovers },
                { key: 'fouls', label: 'Fouls', awayValue: awayStats.fouls, homeValue: homeStats.fouls },
              ];

              return (
                <div className="space-y-1">
                  {stats.map((stat) => {
                    // Determine advantage for specific stats
                    const isPercentageStat = stat.key.includes('pct');
                    const isTurnoverStat = stat.key === 'to' || stat.key === 'fouls';
                    let advantage: 'first' | 'second' | 'tie' = 'tie';

                    if (isPercentageStat || isTurnoverStat) {
                      const awayNum = parseFloat(String(stat.awayValue).replace('%', '')) || 0;
                      const homeNum = parseFloat(String(stat.homeValue).replace('%', '')) || 0;
                      advantage = hasAdvantage(awayNum, homeNum, isTurnoverStat);
                    }

                    return (
                      <div key={stat.key} className="flex items-center justify-between py-3 px-3 md:px-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors rounded">
                        <div className={`w-28 md:w-32 text-right font-bold text-lg ${advantage === 'first' ? 'text-green-600' : 'text-gray-900'}`}>
                          {stat.awayValue}
                        </div>
                        <div className="flex-1 text-center text-xs md:text-sm font-bold text-gray-600 uppercase px-4 md:px-6">
                          {stat.label}
                        </div>
                        <div className={`w-28 md:w-32 text-left font-bold text-lg ${advantage === 'second' ? 'text-green-600' : 'text-gray-900'}`}>
                          {stat.homeValue}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            }
          })()}
        </div>
      </div>
    </div>
  );
}
