'use client';

import { useMemo } from "react";

interface BettingTabProps {
  completedGames: any[];
  upcomingGames: any[];
  teamId: number;
  standings: any;
}

export default function BettingTab({
  completedGames,
  upcomingGames,
  teamId,
  standings,
}: BettingTabProps) {
  // Calculate ATS (Against The Spread) record
  const atsRecord = useMemo(() => {
    let covers = 0;
    let losses = 0;
    let pushes = 0;
    let gamesWithLines = 0;

    // Track unique games to avoid double-counting
    const processedGames = new Set<number>();

    completedGames.forEach(game => {
      // Skip if no spread or already processed this game
      if (!game.spread || !game.event_id || processedGames.has(game.event_id)) return;

      processedGames.add(game.event_id);
      gamesWithLines++;

      const isHome = game.location === 'home';
      const teamScore = isHome ? game.home_score : game.away_score;
      const oppScore = isHome ? game.away_score : game.home_score;
      const actualMargin = teamScore - oppScore;

      // Spread from THIS team's perspective
      // Database stores spread from HOME team's perspective, so flip it for away teams
      const teamSpread = isHome ? game.spread : -game.spread;

      // CORRECT SPREAD LOGIC:
      // Cover margin = actual margin + spread (from team's perspective)
      // Example: Team loses by 3 (-3) with +4.5 spread = -3 + 4.5 = +1.5 (covered)
      // Example: Team wins by 10 (+10) with -7 spread = +10 - 7 = +3 (covered)
      const coverMargin = actualMargin + teamSpread;

      // Check if it's a push (within 0.5 points)
      if (Math.abs(coverMargin) < 0.5) {
        pushes++;
      } else if (coverMargin > 0) {
        // Positive cover margin means team covered
        covers++;
      } else {
        // Negative cover margin means team didn't cover
        losses++;
      }
    });

    return { covers, losses, pushes, gamesWithLines };
  }, [completedGames]);

  const atsPercentage = atsRecord.covers + atsRecord.losses > 0
    ? ((atsRecord.covers / (atsRecord.covers + atsRecord.losses)) * 100).toFixed(1)
    : '0.0';

  // Calculate ATS splits by location
  const atsSplits = useMemo(() => {
    const splits = {
      home: { covers: 0, losses: 0, pushes: 0 },
      away: { covers: 0, losses: 0, pushes: 0 },
      favorite: { covers: 0, losses: 0, pushes: 0 },
      underdog: { covers: 0, losses: 0, pushes: 0 },
      conference: { covers: 0, losses: 0, pushes: 0 },
    };

    const processedGames = new Set<number>();

    completedGames.forEach(game => {
      if (!game.spread || !game.event_id || processedGames.has(game.event_id)) return;
      processedGames.add(game.event_id);

      const isHome = game.location === 'home';
      const teamScore = isHome ? game.home_score : game.away_score;
      const oppScore = isHome ? game.away_score : game.home_score;
      const actualMargin = teamScore - oppScore;

      // Spread from THIS team's perspective
      const teamSpread = isHome ? game.spread : -game.spread;

      // CORRECT: Cover margin = actual margin + spread (from team's perspective)
      const coverMargin = actualMargin + teamSpread;

      const result = Math.abs(coverMargin) < 0.5 ? 'push' : coverMargin > 0 ? 'cover' : 'loss';

      // Location splits
      if (isHome) {
        splits.home[result === 'push' ? 'pushes' : result === 'cover' ? 'covers' : 'losses']++;
      } else {
        splits.away[result === 'push' ? 'pushes' : result === 'cover' ? 'covers' : 'losses']++;
      }

      // Favorite/Underdog splits
      // IMPORTANT: spread is ALWAYS from HOME team's perspective in the database
      // Negative spread = HOME team is favorite (e.g., -10.5 means home favored by 10.5)
      // Positive spread = HOME team is underdog (e.g., +7 means home getting 7 points)
      //
      // If THIS team is HOME: spread < 0 means THIS team is favorite, spread > 0 means underdog
      // If THIS team is AWAY: spread < 0 means HOME is favorite (so THIS team is underdog),
      //                       spread > 0 means HOME is underdog (so THIS team is favorite)
      const isFavorite = isHome ? game.spread < 0 : game.spread > 0;
      const isUnderdog = isHome ? game.spread > 0 : game.spread < 0;

      if (isFavorite) {
        splits.favorite[result === 'push' ? 'pushes' : result === 'cover' ? 'covers' : 'losses']++;
      } else if (isUnderdog) {
        splits.underdog[result === 'push' ? 'pushes' : result === 'cover' ? 'covers' : 'losses']++;
      }

      // Conference splits
      if (game.is_conference_game) {
        splits.conference[result === 'push' ? 'pushes' : result === 'cover' ? 'covers' : 'losses']++;
      }
    });

    return splits;
  }, [completedGames]);

  // Recent trends (last 5, 10 games)
  const recentTrends = useMemo(() => {
    const trends = { last5: { covers: 0, losses: 0 }, last10: { covers: 0, losses: 0 } };
    const processedGames = new Set<number>();
    let count = 0;

    for (const game of completedGames) {
      if (!game.spread || !game.event_id || processedGames.has(game.event_id)) continue;
      if (count >= 10) break;

      processedGames.add(game.event_id);
      count++;

      const isHome = game.location === 'home';
      const teamScore = isHome ? game.home_score : game.away_score;
      const oppScore = isHome ? game.away_score : game.home_score;
      const actualMargin = teamScore - oppScore;

      // Spread from THIS team's perspective
      const teamSpread = isHome ? game.spread : -game.spread;

      // CORRECT: Cover margin = actual margin + spread (from team's perspective)
      const coverMargin = actualMargin + teamSpread;

      if (Math.abs(coverMargin) >= 0.5) {
        const covered = coverMargin > 0;
        if (count <= 5) {
          if (covered) trends.last5.covers++;
          else trends.last5.losses++;
        }
        if (covered) trends.last10.covers++;
        else trends.last10.losses++;
      }
    }

    return trends;
  }, [completedGames]);

  // Best and worst covers
  const extremeCovers = useMemo(() => {
    const games: Array<{ opponent: string, margin: number, isHome: boolean, date: string }> = [];
    const processedGames = new Set<number>();

    completedGames.forEach(game => {
      if (!game.spread || !game.event_id || processedGames.has(game.event_id)) return;
      processedGames.add(game.event_id);

      const isHome = game.location === 'home';
      const teamScore = isHome ? game.home_score : game.away_score;
      const oppScore = isHome ? game.away_score : game.home_score;
      const actualMargin = teamScore - oppScore;

      // Spread from THIS team's perspective
      const teamSpread = isHome ? game.spread : -game.spread;

      // CORRECT: Cover margin = actual margin + spread (from team's perspective)
      const coverMargin = actualMargin + teamSpread;

      games.push({
        opponent: game.opponent_name,
        margin: coverMargin,
        isHome,
        date: new Date(game.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      });
    });

    games.sort((a, b) => b.margin - a.margin);

    return {
      best: games.length > 0 ? games[0] : null,
      worst: games.length > 0 ? games[games.length - 1] : null,
    };
  }, [completedGames]);

  return (
    <div className="space-y-6">
      {/* ATS Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="border border-gray-200 p-6 bg-white rounded-lg shadow-sm text-center">
          <div className="text-3xl font-bold text-gray-900">
            {atsRecord.covers}-{atsRecord.losses}{atsRecord.pushes > 0 ? `-${atsRecord.pushes}` : ''}
          </div>
          <div className="text-sm text-gray-600 mt-1">ATS Record</div>
        </div>
        <div className="border border-gray-200 p-6 bg-white rounded-lg shadow-sm text-center">
          <div className={`text-3xl font-bold ${parseFloat(atsPercentage) >= 55 ? 'text-green-600' : parseFloat(atsPercentage) <= 45 ? 'text-red-600' : 'text-gray-900'}`}>
            {atsPercentage}%
          </div>
          <div className="text-sm text-gray-600 mt-1">Cover Rate</div>
        </div>
        <div className="border border-gray-200 p-6 bg-white rounded-lg shadow-sm text-center">
          <div className="text-3xl font-bold text-gray-900">
            {standings.wins || 0}-{standings.losses || 0}
          </div>
          <div className="text-sm text-gray-600 mt-1">Straight Up</div>
        </div>
        <div className="border border-gray-200 p-6 bg-white rounded-lg shadow-sm text-center">
          <div className="text-3xl font-bold text-blue-600">
            {atsRecord.gamesWithLines}
          </div>
          <div className="text-sm text-gray-600 mt-1">Games w/ Line</div>
        </div>
      </div>

      {/* ATS Splits by Location and Situation */}
      <div className="border border-gray-200 p-6 bg-white rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">ATS Performance Splits</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Location Splits */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">By Location</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                <span className="text-sm text-gray-600">Home</span>
                <span className="font-bold text-gray-900">
                  {atsSplits.home.covers}-{atsSplits.home.losses}{atsSplits.home.pushes > 0 ? `-${atsSplits.home.pushes}` : ''}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                <span className="text-sm text-gray-600">Away</span>
                <span className="font-bold text-gray-900">
                  {atsSplits.away.covers}-{atsSplits.away.losses}{atsSplits.away.pushes > 0 ? `-${atsSplits.away.pushes}` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Favorite/Underdog Splits */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">By Role</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-purple-50 rounded">
                <span className="text-sm text-gray-600">As Favorite</span>
                <span className="font-bold text-gray-900">
                  {atsSplits.favorite.covers}-{atsSplits.favorite.losses}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                <span className="text-sm text-gray-600">As Underdog</span>
                <span className="font-bold text-gray-900">
                  {atsSplits.underdog.covers}-{atsSplits.underdog.losses}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Trends */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Trends</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Last 5 Games</span>
                <span className={`font-bold ${
                  recentTrends.last5.covers > recentTrends.last5.losses ? 'text-green-600' :
                  recentTrends.last5.covers < recentTrends.last5.losses ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {recentTrends.last5.covers}-{recentTrends.last5.losses}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Last 10 Games</span>
                <span className={`font-bold ${
                  recentTrends.last10.covers > recentTrends.last10.losses ? 'text-green-600' :
                  recentTrends.last10.covers < recentTrends.last10.losses ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {recentTrends.last10.covers}-{recentTrends.last10.losses}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Conference Games */}
        {atsSplits.conference.covers + atsSplits.conference.losses > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Conference Games ATS</span>
              <span className="text-lg font-bold text-gray-900">
                {atsSplits.conference.covers}-{atsSplits.conference.losses}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Best and Worst Covers */}
      {(extremeCovers.best || extremeCovers.worst) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {extremeCovers.best && (
            <div className="border border-green-200 bg-green-50 p-6 rounded-lg">
              <h3 className="text-lg font-bold text-green-900 mb-2">Best Cover</h3>
              <div className="text-3xl font-bold text-green-600 mb-1">
                +{extremeCovers.best.margin.toFixed(1)}
              </div>
              <div className="text-sm text-green-800">
                {extremeCovers.best.isHome ? 'vs' : '@'} {extremeCovers.best.opponent}
              </div>
              <div className="text-xs text-green-600 mt-1">{extremeCovers.best.date}</div>
            </div>
          )}
          {extremeCovers.worst && (
            <div className="border border-red-200 bg-red-50 p-6 rounded-lg">
              <h3 className="text-lg font-bold text-red-900 mb-2">Worst Loss</h3>
              <div className="text-3xl font-bold text-red-600 mb-1">
                {extremeCovers.worst.margin.toFixed(1)}
              </div>
              <div className="text-sm text-red-800">
                {extremeCovers.worst.isHome ? 'vs' : '@'} {extremeCovers.worst.opponent}
              </div>
              <div className="text-xs text-red-600 mt-1">{extremeCovers.worst.date}</div>
            </div>
          )}
        </div>
      )}

      {/* Next Game Preview */}
      {upcomingGames.length > 0 && upcomingGames[upcomingGames.length - 1].spread && (
        <div className="border border-gray-200 p-6 bg-white rounded-lg shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Next Game Betting Info</h3>
          <div className="space-y-2 text-gray-700">
            <div className="flex justify-between">
              <span>Opponent:</span>
              <span className="font-semibold">{upcomingGames[upcomingGames.length - 1].opponent_name}</span>
            </div>
            <div className="flex justify-between">
              <span>Spread:</span>
              <span className="font-semibold">
                {upcomingGames[upcomingGames.length - 1].spread > 0 ? '+' : ''}
                {upcomingGames[upcomingGames.length - 1].spread}
              </span>
            </div>
            {upcomingGames[upcomingGames.length - 1].home_win_probability && (
              <div className="flex justify-between">
                <span>Win Probability:</span>
                <span className="font-semibold">
                  {Math.round(upcomingGames[upcomingGames.length - 1].location === 'home'
                    ? upcomingGames[upcomingGames.length - 1].home_win_probability
                    : upcomingGames[upcomingGames.length - 1].away_win_probability)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detailed ATS Results Table */}
      {completedGames.filter(g => g.spread).length > 0 && (
        <div className="border border-gray-200 bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Game-by-Game ATS Results</h2>
            <p className="text-sm text-gray-600 mt-1">Detailed breakdown of each game with a betting line</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Opponent
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Result
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    O/U Line
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Spread
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Margin
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ATS Result
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cover By
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(() => {
                  // Deduplicate games by event_id
                  const seenGames = new Set<number>();
                  const uniqueGames = completedGames.filter(g => {
                    if (!g.spread || !g.event_id || seenGames.has(g.event_id)) return false;
                    seenGames.add(g.event_id);
                    return true;
                  });

                  return uniqueGames.map((game: any) => {
                    const isHome = game.location === 'home';
                    const teamScore = isHome ? game.home_score : game.away_score;
                    const oppScore = isHome ? game.away_score : game.home_score;
                    const actualMargin = teamScore - oppScore;

                    // Spread from THIS team's perspective
                    // Database stores spread from HOME team's perspective, so flip it for away teams
                    const teamSpread = isHome ? game.spread : -game.spread;

                    // CORRECT: Cover margin = actual margin + spread (from team's perspective)
                    const coverMargin = actualMargin + teamSpread;
                    const won = teamScore > oppScore;

                    // Calculate total points for O/U
                    const totalPoints = game.home_score + game.away_score;
                    const overUnderLine = game.over_under;

                    // Display spread is same as teamSpread
                    const displaySpread = teamSpread;

                    let atsResult = 'Cover';
                    let atsColor = 'text-green-600 bg-green-50';
                    if (Math.abs(coverMargin) < 0.5) {
                      atsResult = 'Push';
                      atsColor = 'text-gray-600 bg-gray-50';
                    } else if (coverMargin < 0) {
                      atsResult = 'Loss';
                      atsColor = 'text-red-600 bg-red-50';
                    }

                    return (
                      <tr key={game.event_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {new Date(game.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 text-xs">{isHome ? 'vs' : '@'}</span>
                            <span className="font-medium text-gray-900">{game.opponent_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${
                            won ? 'text-green-800 bg-green-100' : 'text-red-800 bg-red-100'
                          }`}>
                            {won ? 'W' : 'L'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-medium text-gray-900">
                          {teamScore}-{oppScore}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-medium text-gray-900">
                          {totalPoints}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-600">
                          {overUnderLine ? overUnderLine.toFixed(1) : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-700">
                          {displaySpread > 0 ? '+' : ''}{displaySpread}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                          <span className={actualMargin > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                            {actualMargin > 0 ? '+' : ''}{actualMargin}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${atsColor}`}>
                            {atsResult}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                          <span className={`font-medium ${
                            Math.abs(coverMargin) < 0.5 ? 'text-gray-600' :
                            coverMargin > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {coverMargin > 0 ? '+' : ''}{coverMargin.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
