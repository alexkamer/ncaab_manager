'use client';

interface AdvancedStatsTabProps {
  game: any;
  awayTeamLogo: string;
  homeTeamLogo: string;
  awayTeamColor?: string;
  homeTeamColor?: string;
  awayTeamAbbr?: string;
  homeTeamAbbr?: string;
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
      return stats.find((s: any) => s.name === name)?.displayValue || '0';
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

  return (
    <div className="space-y-8">
      {/* Shooting Efficiency Section */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Shooting Efficiency</h2>
          <p className="text-sm text-gray-600 mt-1">Complete shooting breakdown</p>
        </div>
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Field Goal % */}
            <div>
              <div className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4 text-center">
                Field Goal %
              </div>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <img src={awayTeamLogo} alt="" className="w-6 h-6" />
                    <span className="text-sm text-gray-600">{game.away_team_abbr}</span>
                  </div>
                  <div className="text-4xl font-black text-gray-900 mb-2">
                    {awayFGPct.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500">{awayFGM}-{awayFGA}</div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ backgroundColor: (awayTeamColor?.startsWith('#') ? awayTeamColor : awayTeamColor ? `#${awayTeamColor}` : '#3B82F6') }}
                      style={{ width: `${awayFGPct}%` }}
                    />
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <img src={homeTeamLogo} alt="" className="w-6 h-6" />
                    <span className="text-sm text-gray-600">{game.home_team_abbr}</span>
                  </div>
                  <div className="text-4xl font-black text-gray-900 mb-2">
                    {homeFGPct.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500">{homeFGM}-{homeFGA}</div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ backgroundColor: (homeTeamColor?.startsWith('#') ? homeTeamColor : homeTeamColor ? `#${homeTeamColor}` : '#EF4444') }}
                      style={{ width: `${homeFGPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3-Point % */}
            <div>
              <div className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4 text-center">
                3-Point %
              </div>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <img src={awayTeamLogo} alt="" className="w-6 h-6" />
                    <span className="text-sm text-gray-600">{game.away_team_abbr}</span>
                  </div>
                  <div className="text-4xl font-black text-gray-900 mb-2">
                    {away3PPct.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500">{away3PM}-{away3PA}</div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ backgroundColor: (awayTeamColor?.startsWith('#') ? awayTeamColor : awayTeamColor ? `#${awayTeamColor}` : '#3B82F6') }}
                      style={{ width: `${away3PPct}%` }}
                    />
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <img src={homeTeamLogo} alt="" className="w-6 h-6" />
                    <span className="text-sm text-gray-600">{game.home_team_abbr}</span>
                  </div>
                  <div className="text-4xl font-black text-gray-900 mb-2">
                    {home3PPct.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500">{home3PM}-{home3PA}</div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ backgroundColor: (homeTeamColor?.startsWith('#') ? homeTeamColor : homeTeamColor ? `#${homeTeamColor}` : '#EF4444') }}
                      style={{ width: `${home3PPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Free Throw % */}
            <div>
              <div className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4 text-center">
                Free Throw %
              </div>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <img src={awayTeamLogo} alt="" className="w-6 h-6" />
                    <span className="text-sm text-gray-600">{game.away_team_abbr}</span>
                  </div>
                  <div className="text-4xl font-black text-gray-900 mb-2">
                    {awayFTPct.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500">{awayFTM}-{awayFTA}</div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ backgroundColor: (awayTeamColor?.startsWith('#') ? awayTeamColor : awayTeamColor ? `#${awayTeamColor}` : '#3B82F6') }}
                      style={{ width: `${awayFTPct}%` }}
                    />
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <img src={homeTeamLogo} alt="" className="w-6 h-6" />
                    <span className="text-sm text-gray-600">{game.home_team_abbr}</span>
                  </div>
                  <div className="text-4xl font-black text-gray-900 mb-2">
                    {homeFTPct.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500">{homeFTM}-{homeFTA}</div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ backgroundColor: (homeTeamColor?.startsWith('#') ? homeTeamColor : homeTeamColor ? `#${homeTeamColor}` : '#EF4444') }}
                      style={{ width: `${homeFTPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Points Distribution */}
          <div className="border-t border-gray-200 pt-8 mt-8">
            <div className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-6 text-center">
              Points Distribution
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Away Team */}
              <div>
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <img src={awayTeamLogo} alt={game.away_team_name} className="w-8 h-8" />
                  <span className="font-bold text-gray-900 text-lg">{game.away_team_name}</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <div className="w-28 text-sm text-gray-600 font-medium">2-Pointers</div>
                    <div className="flex-1 mx-4">
                      <div className="bg-gray-200 rounded-full h-8 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 flex items-center justify-center text-sm font-bold text-white"
                          style={{ width: `${(away2PM * 2 / game.away_score) * 100}%` }}
                        >
                          {away2PM * 2} pts
                        </div>
                      </div>
                    </div>
                    <div className="w-20 text-sm text-gray-600 text-right">{away2PM}-{away2PA}</div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-28 text-sm text-gray-600 font-medium">3-Pointers</div>
                    <div className="flex-1 mx-4">
                      <div className="bg-gray-200 rounded-full h-8 overflow-hidden">
                        <div
                          className="h-full flex items-center justify-center text-sm font-bold text-white"
                          style={{ backgroundColor: (awayTeamColor?.startsWith('#') ? awayTeamColor : awayTeamColor ? `#${awayTeamColor}` : '#3B82F6') }}
                          style={{ width: `${(away3PM * 3 / game.away_score) * 100}%` }}
                        >
                          {away3PM * 3} pts
                        </div>
                      </div>
                    </div>
                    <div className="w-20 text-sm text-gray-600 text-right">{away3PM}-{away3PA}</div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-28 text-sm text-gray-600 font-medium">Free Throws</div>
                    <div className="flex-1 mx-4">
                      <div className="bg-gray-200 rounded-full h-8 overflow-hidden">
                        <div
                          className="h-full bg-blue-700 flex items-center justify-center text-sm font-bold text-white"
                          style={{ width: `${(awayFTM / game.away_score) * 100}%` }}
                        >
                          {awayFTM} pts
                        </div>
                      </div>
                    </div>
                    <div className="w-20 text-sm text-gray-600 text-right">{awayFTM}-{awayFTA}</div>
                  </div>
                </div>
              </div>

              {/* Home Team */}
              <div>
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <img src={homeTeamLogo} alt={game.home_team_name} className="w-8 h-8" />
                  <span className="font-bold text-gray-900 text-lg">{game.home_team_name}</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <div className="w-28 text-sm text-gray-600 font-medium">2-Pointers</div>
                    <div className="flex-1 mx-4">
                      <div className="bg-gray-200 rounded-full h-8 overflow-hidden">
                        <div
                          className="h-full bg-red-500 flex items-center justify-center text-sm font-bold text-white"
                          style={{ width: `${(home2PM * 2 / game.home_score) * 100}%` }}
                        >
                          {home2PM * 2} pts
                        </div>
                      </div>
                    </div>
                    <div className="w-20 text-sm text-gray-600 text-right">{home2PM}-{home2PA}</div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-28 text-sm text-gray-600 font-medium">3-Pointers</div>
                    <div className="flex-1 mx-4">
                      <div className="bg-gray-200 rounded-full h-8 overflow-hidden">
                        <div
                          className="h-full flex items-center justify-center text-sm font-bold text-white"
                          style={{ backgroundColor: (homeTeamColor?.startsWith('#') ? homeTeamColor : homeTeamColor ? `#${homeTeamColor}` : '#EF4444') }}
                          style={{ width: `${(home3PM * 3 / game.home_score) * 100}%` }}
                        >
                          {home3PM * 3} pts
                        </div>
                      </div>
                    </div>
                    <div className="w-20 text-sm text-gray-600 text-right">{home3PM}-{home3PA}</div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-28 text-sm text-gray-600 font-medium">Free Throws</div>
                    <div className="flex-1 mx-4">
                      <div className="bg-gray-200 rounded-full h-8 overflow-hidden">
                        <div
                          className="h-full bg-red-700 flex items-center justify-center text-sm font-bold text-white"
                          style={{ width: `${(homeFTM / game.home_score) * 100}%` }}
                        >
                          {homeFTM} pts
                        </div>
                      </div>
                    </div>
                    <div className="w-20 text-sm text-gray-600 text-right">{homeFTM}-{homeFTA}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Stats Section */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-green-50 to-teal-50 px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Key Stats</h2>
          <p className="text-sm text-gray-600 mt-1">Possession and scoring metrics</p>
        </div>
        <div className="p-8">
          <div className="space-y-6">
            {/* Turnovers */}
            <div className="flex items-center">
              <div className="w-36 text-sm font-bold text-gray-500 uppercase tracking-wide">Turnovers</div>
              <div className="flex-1 flex items-center justify-between px-6">
                <div className="flex items-center space-x-3">
                  <span className="text-base font-medium text-gray-600">{game.away_team_abbr}</span>
                  <span className="text-2xl font-black text-gray-900">{awayTurnovers}</span>
                </div>
                <div className="flex-1 mx-6 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-400 transition-all duration-500"
                    style={{
                      width: `${(Number(awayTurnovers) / (Number(awayTurnovers) + Number(homeTurnovers)) * 100).toFixed(0)}%`
                    }}
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl font-black text-gray-900">{homeTurnovers}</span>
                  <span className="text-base font-medium text-gray-600">{game.home_team_abbr}</span>
                </div>
              </div>
            </div>

            {/* Fast Break Points */}
            <div className="flex items-center">
              <div className="w-36 text-sm font-bold text-gray-500 uppercase tracking-wide">Fast Break</div>
              <div className="flex-1 flex items-center justify-between px-6">
                <div className="flex items-center space-x-3">
                  <span className="text-base font-medium text-gray-600">{game.away_team_abbr}</span>
                  <span className="text-2xl font-black text-gray-900">{awayFastBreak}</span>
                </div>
                <div className="flex-1 mx-6 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{
                      width: `${(Number(awayFastBreak) / (Number(awayFastBreak) + Number(homeFastBreak) || 1) * 100).toFixed(0)}%`
                    }}
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl font-black text-gray-900">{homeFastBreak}</span>
                  <span className="text-base font-medium text-gray-600">{game.home_team_abbr}</span>
                </div>
              </div>
            </div>

            {/* Points in Paint */}
            <div className="flex items-center">
              <div className="w-36 text-sm font-bold text-gray-500 uppercase tracking-wide">Points in Paint</div>
              <div className="flex-1 flex items-center justify-between px-6">
                <div className="flex items-center space-x-3">
                  <span className="text-base font-medium text-gray-600">{game.away_team_abbr}</span>
                  <span className="text-2xl font-black text-gray-900">{awayPaint}</span>
                </div>
                <div className="flex-1 mx-6 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{
                      width: `${(Number(awayPaint) / (Number(awayPaint) + Number(homePaint) || 1) * 100).toFixed(0)}%`
                    }}
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl font-black text-gray-900">{homePaint}</span>
                  <span className="text-base font-medium text-gray-600">{game.home_team_abbr}</span>
                </div>
              </div>
            </div>

            {/* Bench Points */}
            <div className="flex items-center">
              <div className="w-36 text-sm font-bold text-gray-500 uppercase tracking-wide">Bench Points</div>
              <div className="flex-1 flex items-center justify-between px-6">
                <div className="flex items-center space-x-3">
                  <span className="text-base font-medium text-gray-600">{game.away_team_abbr}</span>
                  <span className="text-2xl font-black text-gray-900">{awayBench}</span>
                </div>
                <div className="flex-1 mx-6 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 transition-all duration-500"
                    style={{
                      width: `${(Number(awayBench) / (Number(awayBench) + Number(homeBench) || 1) * 100).toFixed(0)}%`
                    }}
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl font-black text-gray-900">{homeBench}</span>
                  <span className="text-base font-medium text-gray-600">{game.home_team_abbr}</span>
                </div>
              </div>
            </div>

            {/* Largest Lead */}
            <div className="flex items-center">
              <div className="w-36 text-sm font-bold text-gray-500 uppercase tracking-wide">Largest Lead</div>
              <div className="flex-1 flex items-center justify-between px-6">
                <div className="flex items-center space-x-3">
                  <span className="text-base font-medium text-gray-600">{game.away_team_abbr}</span>
                  <span className="text-2xl font-black text-gray-900">{awayLargestLead}</span>
                </div>
                <div className="flex-1 mx-6 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-500"
                    style={{
                      width: `${(Number(awayLargestLead) / (Number(awayLargestLead) + Number(homeLargestLead) || 1) * 100).toFixed(0)}%`
                    }}
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl font-black text-gray-900">{homeLargestLead}</span>
                  <span className="text-base font-medium text-gray-600">{game.home_team_abbr}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Statistics Comparison Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Full Team Statistics</h2>
        </div>
        <div className="p-6">
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
                <div className="space-y-2">
                  {keyStatNames.map((statName) => {
                    const awayStat = awayStats.statistics.find((s: any) => s.name === statName);
                    const homeStat = homeStats.statistics.find((s: any) => s.name === statName);

                    if (!awayStat || !homeStat) return null;

                    const label = awayStat.label || awayStat.abbreviation || statName;

                    return (
                      <div key={statName} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
                        <div className="w-32 text-right font-bold text-gray-900 text-lg">
                          {awayStat.displayValue}
                        </div>
                        <div className="flex-1 text-center text-sm font-bold text-gray-600 uppercase px-6">
                          {label}
                        </div>
                        <div className="w-32 text-left font-bold text-gray-900 text-lg">
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
                <div className="space-y-2">
                  {stats.map((stat) => (
                    <div key={stat.key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
                      <div className="w-32 text-right font-bold text-gray-900 text-lg">
                        {stat.awayValue}
                      </div>
                      <div className="flex-1 text-center text-sm font-bold text-gray-600 uppercase px-6">
                        {stat.label}
                      </div>
                      <div className="w-32 text-left font-bold text-gray-900 text-lg">
                        {stat.homeValue}
                      </div>
                    </div>
                  ))}
                </div>
              );
            }
          })()}
        </div>
      </div>
    </div>
  );
}
