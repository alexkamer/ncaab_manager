'use client';

import { useMemo } from 'react';

interface StatsTabProps {
  team: any;
  teamStats: any;
  standings: any;
  ranking: any;
}

export default function StatsTab({
  team,
  teamStats,
  standings,
  ranking,
}: StatsTabProps) {
  // Calculate Four Factors
  const fourFactors = useMemo(() => {
    if (!teamStats) return null;

    // eFG% = (FGM + 0.5 * 3PM) / FGA
    const efg = teamStats.avg_fg_made && teamStats.avg_fg_attempted
      ? ((teamStats.avg_fg_made + 0.5 * (teamStats.avg_three_made || 0)) / teamStats.avg_fg_attempted * 100).toFixed(1)
      : teamStats.avg_fg_pct || 0;

    // TOV% = Turnovers / Possessions (estimate possessions as FGA + 0.44*FTA + TO)
    const estimatedPossessions = (teamStats.avg_fg_attempted || 0) + 0.44 * (teamStats.avg_ft_attempted || 0) + (teamStats.avg_turnovers || 0);
    const tovPct = estimatedPossessions > 0
      ? ((teamStats.avg_turnovers / estimatedPossessions) * 100).toFixed(1)
      : '0.0';

    // ORB% - would need opponent rebounds, use placeholder
    // FTR = FTA / FGA
    const ftr = teamStats.avg_fg_attempted && teamStats.avg_ft_attempted
      ? ((teamStats.avg_ft_attempted / teamStats.avg_fg_attempted) * 100).toFixed(1)
      : '0.0';

    return { efg, tovPct, ftr };
  }, [teamStats]);

  // Calculate neutral site record
  const neutralWins = standings.wins && standings.home_wins && standings.road_wins
    ? standings.wins - standings.home_wins - standings.road_wins
    : 0;
  const neutralLosses = standings.losses && standings.home_losses && standings.road_losses
    ? standings.losses - standings.home_losses - standings.road_losses
    : 0;

  return (
    <div className="space-y-6">
      {/* Four Factors */}
      {fourFactors && (
        <div className="border border-gray-200 p-6 bg-white rounded-lg shadow-sm">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Four Factors</h2>
            <p className="text-sm text-gray-600 mt-1">Key performance indicators for basketball success</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Effective FG% */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Effective FG%</span>
                <span className="text-2xl font-bold text-gray-900">{fourFactors.efg}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(parseFloat(fourFactors.efg as string), 100)}%`,
                    backgroundColor: team.color ? `#${team.color}` : '#3b82f6'
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Shooting efficiency including 3-point value</p>
            </div>

            {/* Turnover % */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Turnover Rate</span>
                <span className="text-2xl font-bold text-gray-900">{fourFactors.tovPct}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="h-3 rounded-full bg-red-500 transition-all duration-300"
                  style={{
                    width: `${Math.min(parseFloat(fourFactors.tovPct as string), 100)}%`
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Lower is better - ball security metric</p>
            </div>

            {/* Free Throw Rate */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Free Throw Rate</span>
                <span className="text-2xl font-bold text-gray-900">{fourFactors.ftr}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(parseFloat(fourFactors.ftr as string), 100)}%`,
                    backgroundColor: team.color ? `#${team.color}` : '#3b82f6'
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Free throw attempts per field goal attempt</p>
            </div>
          </div>
        </div>
      )}

      {/* Shooting Breakdown */}
      {teamStats && (
        <div className="border border-gray-200 p-6 bg-white rounded-lg shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Shooting Breakdown</h2>
          <div className="space-y-4">
            {/* Field Goals */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Field Goal %</span>
                <span className="text-lg font-bold text-gray-900">{teamStats.avg_fg_pct}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="h-4 rounded-full transition-all duration-300"
                  style={{
                    width: `${teamStats.avg_fg_pct}%`,
                    backgroundColor: team.color ? `#${team.color}` : '#3b82f6'
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {teamStats.avg_fg_made?.toFixed(1) || 0} / {teamStats.avg_fg_attempted?.toFixed(1) || 0} per game
              </p>
            </div>

            {/* 3-Pointers */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">3-Point %</span>
                <span className="text-lg font-bold text-gray-900">{teamStats.avg_three_pct}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="h-4 rounded-full bg-purple-600 transition-all duration-300"
                  style={{
                    width: `${teamStats.avg_three_pct}%`
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {teamStats.avg_three_made?.toFixed(1) || 0} / {teamStats.avg_three_attempted?.toFixed(1) || 0} per game
              </p>
            </div>

            {/* Free Throws */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Free Throw %</span>
                <span className="text-lg font-bold text-gray-900">{teamStats.avg_ft_pct}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="h-4 rounded-full bg-green-600 transition-all duration-300"
                  style={{
                    width: `${teamStats.avg_ft_pct}%`
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {teamStats.avg_ft_made?.toFixed(1) || 0} / {teamStats.avg_ft_attempted?.toFixed(1) || 0} per game
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Per-Game Statistics Grid */}
      {teamStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Offensive Stats */}
          <div className="border border-gray-200 p-6 bg-white rounded-lg shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Offensive Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Points Per Game</span>
                <span className="text-xl font-bold text-gray-900">{teamStats.avg_points_scored}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Rebounds</span>
                <span className="text-xl font-bold text-gray-900">{teamStats.avg_rebounds}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Assists</span>
                <span className="text-xl font-bold text-gray-900">{teamStats.avg_assists}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-gray-600">Offensive Rebounds</span>
                <span className="font-bold text-gray-900">{teamStats.avg_offensive_rebounds?.toFixed(1) || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Turnovers</span>
                <span className="font-bold text-red-600">{teamStats.avg_turnovers}</span>
              </div>
            </div>
          </div>

          {/* Defensive Stats */}
          <div className="border border-gray-200 p-6 bg-white rounded-lg shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Defensive Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Points Allowed</span>
                <span className="text-xl font-bold text-gray-900">{teamStats.avg_points_allowed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Steals</span>
                <span className="text-xl font-bold text-green-600">{teamStats.avg_steals}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Blocks</span>
                <span className="text-xl font-bold text-green-600">{teamStats.avg_blocks}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-gray-600">Defensive Rebounds</span>
                <span className="font-bold text-gray-900">{teamStats.avg_defensive_rebounds?.toFixed(1) || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Fouls</span>
                <span className="font-bold text-gray-900">{teamStats.avg_fouls}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Splits Analysis */}
      <div className="border border-gray-200 p-6 bg-white rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Performance Splits</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Home vs Away */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Home vs Away</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                <span className="text-sm text-gray-600">Home</span>
                <span className="font-bold text-green-700">
                  {standings.home_wins || 0}-{standings.home_losses || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                <span className="text-sm text-gray-600">Away</span>
                <span className="font-bold text-blue-700">
                  {standings.road_wins || 0}-{standings.road_losses || 0}
                </span>
              </div>
              {neutralWins > 0 && (
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">Neutral</span>
                  <span className="font-bold text-gray-700">
                    {neutralWins}-{neutralLosses}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Conference vs Non-Conference */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Conference Play</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-purple-50 rounded">
                <span className="text-sm text-gray-600">Conference</span>
                <span className="font-bold text-purple-700">
                  {standings.conference_wins || 0}-{standings.conference_losses || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Non-Conference</span>
                <span className="font-bold text-gray-700">
                  {(standings.wins || 0) - (standings.conference_wins || 0)}-
                  {(standings.losses || 0) - (standings.conference_losses || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Quality Wins */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Quality Results</h3>
            <div className="space-y-2">
              {standings.vs_ap_top25_wins !== undefined && (
                <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                  <span className="text-sm text-gray-600">vs AP Top 25</span>
                  <span className="font-bold text-yellow-700">
                    {standings.vs_ap_top25_wins} wins
                  </span>
                </div>
              )}
              {ranking && (
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">Current Rank</span>
                  <span className="font-bold text-gray-900">
                    #{ranking.current_rank}
                  </span>
                </div>
              )}
              {standings.playoff_seed && (
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">Conf Seed</span>
                  <span className="font-bold text-gray-900">
                    #{standings.playoff_seed}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ranking Information */}
      {ranking && (
        <div className="border border-gray-200 p-6 bg-white rounded-lg shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">AP Poll Ranking</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-1">#{ranking.current_rank}</div>
              <div className="text-sm text-gray-600">Current Rank</div>
            </div>
            {ranking.points && (
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-1">{ranking.points}</div>
                <div className="text-sm text-gray-600">Poll Points</div>
              </div>
            )}
            {ranking.first_place_votes !== undefined && (
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-600 mb-1">{ranking.first_place_votes}</div>
                <div className="text-sm text-gray-600">1st Place Votes</div>
              </div>
            )}
            {ranking.previous_rank && (
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-600 mb-1">
                  {ranking.previous_rank > ranking.current_rank ? (
                    <span className="text-green-600">↑ {ranking.previous_rank - ranking.current_rank}</span>
                  ) : ranking.previous_rank < ranking.current_rank ? (
                    <span className="text-red-600">↓ {ranking.current_rank - ranking.previous_rank}</span>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </div>
                <div className="text-sm text-gray-600">Trend</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
