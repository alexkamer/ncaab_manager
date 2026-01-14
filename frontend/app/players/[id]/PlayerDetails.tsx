"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import PlayerHeadshot from "../../teams/[id]/PlayerHeadshot";

interface GameStat {
  event_id: number;
  event_date: string;
  opponent_id: number;
  opponent_name: string;
  is_home: boolean;
  is_active: boolean;
  is_starter: boolean;
  minutes_played: number | string;
  field_goals_made: number;
  field_goals_attempted: number;
  three_point_made: number;
  three_point_attempted: number;
  free_throws_made: number;
  free_throws_attempted: number;
  rebounds: number;
  offensive_rebounds: number;
  defensive_rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
}

interface Player {
  athlete_id: number;
  full_name: string;
  display_name: string;
  position_name: string;
  height_inches: number;
  weight_lbs: number;
  jersey: string;
  experience_display: string;
  team_id: number;
  team_name: string;
  team_logo: string;
  team_color: string;
  birth_city?: string;
  birth_state?: string;
  birth_country?: string;
  game_stats: GameStat[];
}

function calculateSeasonStats(gameStats: GameStat[], filterFn?: (game: GameStat) => boolean) {
  const filteredGames = filterFn ? gameStats.filter(filterFn) : gameStats;

  if (!filteredGames || filteredGames.length === 0) {
    return null;
  }

  const gamesPlayed = filteredGames.length;

  let totalPoints = 0;
  let totalMinutes = 0;
  let totalFGM = 0, totalFGA = 0;
  let total3PM = 0, total3PA = 0;
  let totalFTM = 0, totalFTA = 0;
  let totalReb = 0, totalOffReb = 0, totalDefReb = 0;
  let totalAst = 0, totalStl = 0, totalBlk = 0, totalTO = 0;
  let gamesStarted = 0;

  filteredGames.forEach(game => {
    const points = (game.field_goals_made || 0) * 2
                 + (game.three_point_made || 0) * 3
                 + (game.free_throws_made || 0);
    totalPoints += points;
    const minutes = typeof game.minutes_played === 'string'
      ? parseFloat(game.minutes_played) || 0
      : game.minutes_played || 0;
    totalMinutes += minutes;
    totalFGM += game.field_goals_made || 0;
    totalFGA += game.field_goals_attempted || 0;
    total3PM += game.three_point_made || 0;
    total3PA += game.three_point_attempted || 0;
    totalFTM += game.free_throws_made || 0;
    totalFTA += game.free_throws_attempted || 0;
    totalReb += game.rebounds || 0;
    totalOffReb += game.offensive_rebounds || 0;
    totalDefReb += game.defensive_rebounds || 0;
    totalAst += game.assists || 0;
    totalStl += game.steals || 0;
    totalBlk += game.blocks || 0;
    totalTO += game.turnovers || 0;
    if (game.is_starter) gamesStarted++;
  });

  return {
    gamesPlayed,
    gamesStarted,
    avgMinutes: (totalMinutes / gamesPlayed).toFixed(1),
    avgPoints: (totalPoints / gamesPlayed).toFixed(1),
    avgRebounds: (totalReb / gamesPlayed).toFixed(1),
    avgOffRebounds: (totalOffReb / gamesPlayed).toFixed(1),
    avgDefRebounds: (totalDefReb / gamesPlayed).toFixed(1),
    avgAssists: (totalAst / gamesPlayed).toFixed(1),
    avgSteals: (totalStl / gamesPlayed).toFixed(1),
    avgBlocks: (totalBlk / gamesPlayed).toFixed(1),
    avgTurnovers: (totalTO / gamesPlayed).toFixed(1),
    fgPct: totalFGA > 0 ? ((totalFGM / totalFGA) * 100).toFixed(1) : '0.0',
    threePct: total3PA > 0 ? ((total3PM / total3PA) * 100).toFixed(1) : '0.0',
    ftPct: totalFTA > 0 ? ((totalFTM / totalFTA) * 100).toFixed(1) : '0.0',
    avgFGM: (totalFGM / gamesPlayed).toFixed(1),
    avgFGA: (totalFGA / gamesPlayed).toFixed(1),
    avg3PM: (total3PM / gamesPlayed).toFixed(1),
    avg3PA: (total3PA / gamesPlayed).toFixed(1),
    avgFTM: (totalFTM / gamesPlayed).toFixed(1),
    avgFTA: (totalFTA / gamesPlayed).toFixed(1),
    eFGPct: totalFGA > 0 ? (((totalFGM + 0.5 * total3PM) / totalFGA) * 100).toFixed(1) : '0.0',
    tsPct: totalFGA > 0 ? ((totalPoints / (2 * (totalFGA + 0.44 * totalFTA))) * 100).toFixed(1) : '0.0',
    stlToRatio: totalTO > 0 ? (totalStl / totalTO).toFixed(2) : '0.00',
  };
}

function calculateGamePoints(game: GameStat) {
  return (game.field_goals_made || 0) * 2
       + (game.three_point_made || 0) * 3
       + (game.free_throws_made || 0);
}

function formatHeight(heightInches: number) {
  const feet = Math.floor(heightInches / 12);
  const inches = heightInches % 12;
  return `${feet}'${inches}"`;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function PlayerDetails({ player }: { player: Player }) {
  const [sortBy, setSortBy] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const stats = calculateSeasonStats(player.game_stats);
  const gameStats = player.game_stats || [];

  const homeStats = calculateSeasonStats(gameStats, game => game.is_home);
  const awayStats = calculateSeasonStats(gameStats, game => !game.is_home);
  const starterStats = calculateSeasonStats(gameStats, game => game.is_starter);
  const benchStats = calculateSeasonStats(gameStats, game => !game.is_starter);

  // Sort games
  const sortedGames = useMemo(() => {
    const games = [...gameStats];

    games.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortBy) {
        case "date":
          aVal = new Date(a.event_date).getTime();
          bVal = new Date(b.event_date).getTime();
          break;
        case "points":
          aVal = calculateGamePoints(a);
          bVal = calculateGamePoints(b);
          break;
        case "rebounds":
          aVal = a.rebounds || 0;
          bVal = b.rebounds || 0;
          break;
        case "assists":
          aVal = a.assists || 0;
          bVal = b.assists || 0;
          break;
        case "minutes":
          aVal = typeof a.minutes_played === 'string' ? parseFloat(a.minutes_played) || 0 : a.minutes_played || 0;
          bVal = typeof b.minutes_played === 'string' ? parseFloat(b.minutes_played) || 0 : b.minutes_played || 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return games;
  }, [gameStats, sortBy, sortOrder]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder(column === "date" ? "desc" : "desc");
    }
  };

  let hometown = '';
  if (player.birth_city) {
    hometown = player.birth_city;
    if (player.birth_state) {
      hometown += `, ${player.birth_state}`;
    } else if (player.birth_country && player.birth_country !== 'USA') {
      hometown += `, ${player.birth_country}`;
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link href="/players" className="text-blue-600 hover:text-blue-800 text-sm">
          ← Back to Players
        </Link>
      </div>

      {/* Player Header */}
      <div
        className="border border-gray-200 p-6 relative overflow-hidden transition-all duration-300 hover:shadow-lg"
        style={{
          background: player.team_color ? `linear-gradient(135deg, #${player.team_color}15 0%, #${player.team_color}05 100%)` : undefined,
          borderLeftWidth: '6px',
          borderLeftColor: player.team_color ? `#${player.team_color}` : '#d1d5db'
        }}
      >
        <div className="flex items-start space-x-6 relative z-10">
          <div className="flex-shrink-0">
            <PlayerHeadshot
              athleteId={player.athlete_id}
              fullName={player.full_name}
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold text-gray-900">
                {player.full_name}
              </h1>
              {player.jersey && (
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-lg font-bold text-white shadow-md transition-all duration-200 hover:shadow-xl hover:scale-105"
                  style={{
                    backgroundColor: player.team_color ? `#${player.team_color}` : '#1f2937'
                  }}
                >
                  #{player.jersey}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-base text-gray-600 mb-3">
              {player.position_name && <span className="font-medium">{player.position_name}</span>}
              {player.position_name && player.height_inches && <span className="text-gray-400">•</span>}
              {player.height_inches && <span>{formatHeight(player.height_inches)}</span>}
              {player.height_inches && player.weight_lbs && <span className="text-gray-400">•</span>}
              {player.weight_lbs && <span>{player.weight_lbs} lbs</span>}
            </div>

            <div className="flex items-center gap-3 mb-2">
              {player.team_logo && (
                <img
                  src={player.team_logo}
                  alt={player.team_name}
                  className="w-8 h-8"
                />
              )}
              <Link
                href={`/teams/${player.team_id}`}
                className="text-lg font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                {player.team_name}
              </Link>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              {player.experience_display && <span>{player.experience_display}</span>}
              {player.experience_display && hometown && <span className="text-gray-400">•</span>}
              {hometown && <span>{hometown}</span>}
            </div>
          </div>
        </div>
      </div>

      {!stats && (
        <div className="border border-gray-200 p-8 text-center text-gray-500">
          <p>No game statistics available for this player yet.</p>
        </div>
      )}

      {/* Stats Grid - Same as before */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Season Averages</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Games Played</span>
                <span className="text-xl font-bold text-gray-900">{stats.gamesPlayed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Games Started</span>
                <span className="text-xl font-bold text-gray-900">{stats.gamesStarted}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Minutes Per Game</span>
                <span className="text-xl font-bold text-gray-900">{stats.avgMinutes}</span>
              </div>
              <div className="pt-2 border-t border-gray-200" />
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Points</span>
                <span className="text-2xl font-bold text-gray-900">{stats.avgPoints}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Rebounds</span>
                <span className="text-xl font-bold text-gray-900">{stats.avgRebounds}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Assists</span>
                <span className="text-xl font-bold text-gray-900">{stats.avgAssists}</span>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Shooting Efficiency</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Field Goal %</span>
                <div className="text-right">
                  <div className="text-xl font-bold text-gray-900">{stats.fgPct}%</div>
                  <div className="text-xs text-gray-500">{stats.avgFGM}/{stats.avgFGA}</div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">3-Point %</span>
                <div className="text-right">
                  <div className="text-xl font-bold text-gray-900">{stats.threePct}%</div>
                  <div className="text-xs text-gray-500">{stats.avg3PM}/{stats.avg3PA}</div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Free Throw %</span>
                <div className="text-right">
                  <div className="text-xl font-bold text-gray-900">{stats.ftPct}%</div>
                  <div className="text-xs text-gray-500">{stats.avgFTM}/{stats.avgFTA}</div>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-200" />
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Effective FG%</span>
                <span className="text-xl font-bold text-gray-900">{stats.eFGPct}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">True Shooting %</span>
                <span className="text-xl font-bold text-gray-900">{stats.tsPct}%</span>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Defense & Other</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Steals</span>
                <span className="text-xl font-bold text-gray-900">{stats.avgSteals}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Blocks</span>
                <span className="text-xl font-bold text-gray-900">{stats.avgBlocks}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Turnovers</span>
                <span className="text-xl font-bold text-gray-900">{stats.avgTurnovers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">STL/TO Ratio</span>
                <span className="text-xl font-bold text-gray-900">{stats.stlToRatio}</span>
              </div>
              <div className="pt-2 border-t border-gray-200" />
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Off. Rebounds</span>
                <span className="text-xl font-bold text-gray-900">{stats.avgOffRebounds}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Def. Rebounds</span>
                <span className="text-xl font-bold text-gray-900">{stats.avgDefRebounds}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Season Splits */}
      {stats && (homeStats || awayStats || starterStats || benchStats) && (
        <div className="border border-gray-200">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Season Splits</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {homeStats && awayStats && (
                <div>
                  <h3 className="text-md font-semibold text-gray-700 mb-3">Home vs Away</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Split</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">GP</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">PPG</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">RPG</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">APG</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">FG%</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        <tr>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">Home</td>
                          <td className="px-4 py-2 text-sm text-center text-gray-900">{homeStats.gamesPlayed}</td>
                          <td className="px-4 py-2 text-sm text-center text-gray-900">{homeStats.avgPoints}</td>
                          <td className="px-4 py-2 text-sm text-center text-gray-900">{homeStats.avgRebounds}</td>
                          <td className="px-4 py-2 text-sm text-center text-gray-900">{homeStats.avgAssists}</td>
                          <td className="px-4 py-2 text-sm text-center text-gray-900">{homeStats.fgPct}%</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">Away</td>
                          <td className="px-4 py-2 text-sm text-center text-gray-900">{awayStats.gamesPlayed}</td>
                          <td className="px-4 py-2 text-sm text-center text-gray-900">{awayStats.avgPoints}</td>
                          <td className="px-4 py-2 text-sm text-center text-gray-900">{awayStats.avgRebounds}</td>
                          <td className="px-4 py-2 text-sm text-center text-gray-900">{awayStats.avgAssists}</td>
                          <td className="px-4 py-2 text-sm text-center text-gray-900">{awayStats.fgPct}%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {starterStats && benchStats && (
                <div>
                  <h3 className="text-md font-semibold text-gray-700 mb-3">Starter vs Bench</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Split</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">GP</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">MPG</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">PPG</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">RPG</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">APG</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        <tr>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">Starter</td>
                          <td className="px-4 py-2 text-sm text-center text-gray-900">{starterStats.gamesPlayed}</td>
                          <td className="px-4 py-2 text-sm text-center text-gray-900">{starterStats.avgMinutes}</td>
                          <td className="px-4 py-2 text-sm text-center text-gray-900">{starterStats.avgPoints}</td>
                          <td className="px-4 py-2 text-sm text-center text-gray-900">{starterStats.avgRebounds}</td>
                          <td className="px-4 py-2 text-sm text-center text-gray-900">{starterStats.avgAssists}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">Bench</td>
                          <td className="px-4 py-2 text-sm text-center text-gray-900">{benchStats.gamesPlayed}</td>
                          <td className="px-4 py-2 text-sm text-center text-gray-900">{benchStats.avgMinutes}</td>
                          <td className="px-4 py-2 text-sm text-center text-gray-900">{benchStats.avgPoints}</td>
                          <td className="px-4 py-2 text-sm text-center text-gray-900">{benchStats.avgRebounds}</td>
                          <td className="px-4 py-2 text-sm text-center text-gray-900">{benchStats.avgAssists}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Performance Trends */}
      {stats && sortedGames.length >= 5 && (
        <div className="border border-gray-200">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Recent Performance (Last 5 Games)</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm font-medium text-gray-600 mb-3">Points Per Game</div>
                <div className="space-y-2">
                  {[...sortedGames].sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()).slice(0, 5).reverse().map((game, idx) => {
                    const points = calculateGamePoints(game);
                    const avgPoints = parseFloat(stats.avgPoints);
                    const isAbove = points > avgPoints;
                    const barWidth = Math.min((points / (avgPoints * 2)) * 100, 100);
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="text-xs text-gray-500 w-16">{formatDate(game.event_date)}</div>
                        <div className="flex-1 bg-gray-100 rounded h-6 relative overflow-hidden">
                          <div
                            className={`h-full ${isAbove ? 'bg-green-500' : 'bg-blue-400'} transition-all`}
                            style={{ width: `${barWidth}%` }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-900">
                            {points}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="text-xs text-gray-500 mt-2">
                    Avg: {stats.avgPoints} PPG
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-600 mb-3">Rebounds Per Game</div>
                <div className="space-y-2">
                  {[...sortedGames].sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()).slice(0, 5).reverse().map((game, idx) => {
                    const rebounds = game.rebounds || 0;
                    const avgRebounds = parseFloat(stats.avgRebounds);
                    const isAbove = rebounds > avgRebounds;
                    const barWidth = Math.min((rebounds / (avgRebounds * 2)) * 100, 100);
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="text-xs text-gray-500 w-16">{formatDate(game.event_date)}</div>
                        <div className="flex-1 bg-gray-100 rounded h-6 relative overflow-hidden">
                          <div
                            className={`h-full ${isAbove ? 'bg-green-500' : 'bg-blue-400'} transition-all`}
                            style={{ width: `${barWidth}%` }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-900">
                            {rebounds}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="text-xs text-gray-500 mt-2">
                    Avg: {stats.avgRebounds} RPG
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-600 mb-3">Assists Per Game</div>
                <div className="space-y-2">
                  {[...sortedGames].sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()).slice(0, 5).reverse().map((game, idx) => {
                    const assists = game.assists || 0;
                    const avgAssists = parseFloat(stats.avgAssists);
                    const isAbove = assists > avgAssists;
                    const maxAssists = Math.max(avgAssists * 2, 5);
                    const barWidth = Math.min((assists / maxAssists) * 100, 100);
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="text-xs text-gray-500 w-16">{formatDate(game.event_date)}</div>
                        <div className="flex-1 bg-gray-100 rounded h-6 relative overflow-hidden">
                          <div
                            className={`h-full ${isAbove ? 'bg-green-500' : 'bg-blue-400'} transition-all`}
                            style={{ width: `${barWidth}%` }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-900">
                            {assists}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="text-xs text-gray-500 mt-2">
                    Avg: {stats.avgAssists} APG
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Context Card */}
      <div className="border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Team</h2>
        <Link
          href={`/teams/${player.team_id}`}
          className="flex items-center gap-4 hover:bg-gray-50 p-4 rounded-lg transition-colors"
        >
          {player.team_logo && (
            <img
              src={player.team_logo}
              alt={player.team_name}
              className="w-16 h-16"
            />
          )}
          <div>
            <div className="text-lg font-bold text-blue-600">{player.team_name}</div>
            <div className="text-sm text-gray-500">View team page →</div>
          </div>
        </Link>
      </div>

      {/* Game Log Table with Sorting */}
      {stats && sortedGames.length > 0 && (
        <div className="border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Game Log</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("date")}
                  >
                    <div className="flex items-center gap-1">
                      Date
                      {sortBy === "date" && (
                        <span className="text-blue-600">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Opponent
                  </th>
                  <th
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("minutes")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      MIN
                      {sortBy === "minutes" && (
                        <span className="text-blue-600">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("points")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      PTS
                      {sortBy === "points" && (
                        <span className="text-blue-600">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("rebounds")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      REB
                      {sortBy === "rebounds" && (
                        <span className="text-blue-600">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("assists")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      AST
                      {sortBy === "assists" && (
                        <span className="text-blue-600">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    STL
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    BLK
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    FG
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    3P
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    FT
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    TO
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedGames.map((game) => {
                  const points = calculateGamePoints(game);
                  return (
                    <tr key={game.event_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/games/${game.event_id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {formatDate(game.event_date)}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/teams/${game.opponent_id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {game.is_home ? 'vs' : '@'} {game.opponent_name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {game.minutes_played}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-center">
                        {points}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {game.rebounds || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {game.assists || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {game.steals || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {game.blocks || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                        {game.field_goals_made || 0}/{game.field_goals_attempted || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                        {game.three_point_made || 0}/{game.three_point_attempted || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                        {game.free_throws_made || 0}/{game.free_throws_attempted || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {game.turnovers || 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
