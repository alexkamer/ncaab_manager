'use client';

import Link from 'next/link';
import { useState } from 'react';

interface PlayerStat {
  athlete_id?: number;
  full_name?: string;
  display_name?: string;
  position_name?: string;
  starter?: boolean;
  minutes_played?: number;
  points?: number;
  field_goals_made?: number;
  field_goals_attempted?: number;
  three_point_made?: number;
  three_point_attempted?: number;
  free_throws_made?: number;
  free_throws_attempted?: number;
  rebounds?: number;
  assists?: number;
  turnovers?: number;
  steals?: number;
  blocks?: number;
  fouls?: number;
  athlete?: {
    id: string;
    displayName: string;
    shortName: string;
    jersey: string;
    position: { abbreviation: string };
    headshot?: { href: string };
  };
  stats?: string[];
}

interface BoxScoreTabProps {
  game: any;
  awayTeamLogo: string;
  homeTeamLogo: string;
}

export default function BoxScoreTab({ game, awayTeamLogo, homeTeamLogo }: BoxScoreTabProps) {
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Render ESPN format player tables
  const renderESPNFormat = () => {
    if (!game.players) return null;

    return game.players.map((teamData: any) => {
      const allPlayers = teamData.statistics[0]?.athletes || [];
      const starters = allPlayers.filter((p: any) => p.starter);
      const bench = allPlayers.filter((p: any) => !p.starter);

      return (
        <div key={teamData.team.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Team Header */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <img src={teamData.team.logo} alt={teamData.team.displayName} className="w-10 h-10" />
              <h2 className="text-xl font-bold text-gray-900">{teamData.team.displayName}</h2>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead className="bg-gray-100 border-b-2 border-gray-300">
                <tr>
                  <th className="text-left px-6 py-3 font-bold text-gray-700 sticky left-0 bg-gray-100 z-10">
                    Player
                  </th>
                  {teamData.statistics[0]?.labels.map((label: string, idx: number) => (
                    <th key={idx} className="text-center px-3 py-3 font-bold text-gray-700 min-w-[60px]">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Starters Section */}
                {starters.length > 0 && (
                  <>
                    <tr className="bg-blue-50">
                      <td
                        colSpan={teamData.statistics[0]?.labels.length + 1}
                        className="px-6 py-2 text-xs font-bold text-blue-900 uppercase tracking-wider"
                      >
                        Starters
                      </td>
                    </tr>
                    {starters.map((player: any, idx: number) => (
                      <tr
                        key={`starter-${idx}`}
                        className="hover:bg-gray-50 border-t border-gray-200 transition-colors"
                      >
                        <td className="px-6 py-4 sticky left-0 bg-white hover:bg-gray-50 z-10">
                          <div className="flex items-center space-x-3">
                            {player.athlete?.headshot && (
                              <img
                                src={player.athlete.headshot.href}
                                alt={player.athlete.displayName}
                                className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                              />
                            )}
                            <div>
                              <Link
                                href={`/players/${player.athlete?.id}`}
                                className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {player.athlete?.displayName}
                              </Link>
                              <div className="text-xs text-gray-500">
                                {player.athlete?.position.abbreviation} • #{player.athlete?.jersey}
                              </div>
                            </div>
                          </div>
                        </td>
                        {player.stats?.map((stat: string, statIdx: number) => (
                          <td key={statIdx} className="text-center px-3 py-4 text-gray-700 font-medium">
                            {stat}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                )}

                {/* Bench Section */}
                {bench.length > 0 && (
                  <>
                    <tr className="bg-gray-50">
                      <td
                        colSpan={teamData.statistics[0]?.labels.length + 1}
                        className="px-6 py-2 text-xs font-bold text-gray-700 uppercase tracking-wider"
                      >
                        Bench
                      </td>
                    </tr>
                    {bench.map((player: any, idx: number) => (
                      <tr
                        key={`bench-${idx}`}
                        className="hover:bg-gray-50 border-t border-gray-200 transition-colors"
                      >
                        <td className="px-6 py-4 sticky left-0 bg-white hover:bg-gray-50 z-10">
                          <div className="flex items-center space-x-3">
                            {player.athlete?.headshot && (
                              <img
                                src={player.athlete.headshot.href}
                                alt={player.athlete.displayName}
                                className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                              />
                            )}
                            <div>
                              <Link
                                href={`/players/${player.athlete?.id}`}
                                className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {player.athlete?.displayName}
                              </Link>
                              <div className="text-xs text-gray-500">
                                {player.athlete?.position.abbreviation} • #{player.athlete?.jersey}
                              </div>
                            </div>
                          </div>
                        </td>
                        {player.stats?.map((stat: string, statIdx: number) => (
                          <td key={statIdx} className="text-center px-3 py-4 text-gray-700 font-medium">
                            {stat}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    });
  };

  // Render Database format player tables
  const renderDatabaseFormat = () => {
    if (!game.player_stats || game.player_stats.length === 0) return null;

    // Group players by team_id
    const playersByTeam = game.player_stats.reduce((acc: any, player: any) => {
      const teamId = player.team_id;
      if (!acc[teamId]) acc[teamId] = [];
      acc[teamId].push(player);
      return acc;
    }, {});

    return Object.keys(playersByTeam).map((teamId) => {
      const teamStats = playersByTeam[Number(teamId)];
      const isHomeTeam = Number(teamId) === game.home_team_id;
      const teamName = isHomeTeam ? game.home_team_name : game.away_team_name;
      const teamLogo = isHomeTeam ? homeTeamLogo : awayTeamLogo;

      const starters = teamStats.filter((p: any) => p.is_starter === 1);
      const bench = teamStats.filter((p: any) => p.is_starter === 0 || !p.is_starter);

      return (
        <div key={teamId} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Team Header */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <img src={teamLogo} alt={teamName} className="w-10 h-10" />
              <h2 className="text-xl font-bold text-gray-900">{teamName}</h2>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead className="bg-gray-100 border-b-2 border-gray-300">
                <tr>
                  <th className="text-left px-6 py-3 font-bold text-gray-700 sticky left-0 bg-gray-100 z-10">
                    Player
                  </th>
                  <th className="text-center px-3 py-3 font-bold text-gray-700">MIN</th>
                  <th className="text-center px-3 py-3 font-bold text-gray-700">PTS</th>
                  <th className="text-center px-3 py-3 font-bold text-gray-700">FG</th>
                  <th className="text-center px-3 py-3 font-bold text-gray-700">3PT</th>
                  <th className="text-center px-3 py-3 font-bold text-gray-700">FT</th>
                  <th className="text-center px-3 py-3 font-bold text-gray-700">REB</th>
                  <th className="text-center px-3 py-3 font-bold text-gray-700">AST</th>
                  <th className="text-center px-3 py-3 font-bold text-gray-700">TO</th>
                  <th className="text-center px-3 py-3 font-bold text-gray-700">STL</th>
                  <th className="text-center px-3 py-3 font-bold text-gray-700">BLK</th>
                </tr>
              </thead>
              <tbody>
                {/* Starters */}
                {starters.length > 0 && (
                  <>
                    <tr className="bg-blue-50">
                      <td colSpan={11} className="px-6 py-2 text-xs font-bold text-blue-900 uppercase tracking-wider">
                        Starters
                      </td>
                    </tr>
                    {starters.map((player: PlayerStat) => (
                      <tr key={`starter-${player.athlete_id}`} className="hover:bg-gray-50 border-t border-gray-200 transition-colors">
                        <td className="px-6 py-4 sticky left-0 bg-white hover:bg-gray-50 z-10">
                          <Link
                            href={`/players/${player.athlete_id}`}
                            className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {player.display_name || player.full_name}
                          </Link>
                          <div className="text-xs text-gray-500">{player.position_name}</div>
                        </td>
                        <td className="text-center px-3 py-4 text-gray-700">{player.minutes_played || 0}</td>
                        <td className="text-center px-3 py-4 font-bold text-gray-900">{player.points || 0}</td>
                        <td className="text-center px-3 py-4 text-gray-700">
                          {player.field_goals_made || 0}-{player.field_goals_attempted || 0}
                        </td>
                        <td className="text-center px-3 py-4 text-gray-700">
                          {player.three_point_made || 0}-{player.three_point_attempted || 0}
                        </td>
                        <td className="text-center px-3 py-4 text-gray-700">
                          {player.free_throws_made || 0}-{player.free_throws_attempted || 0}
                        </td>
                        <td className="text-center px-3 py-4 text-gray-700">{player.rebounds || 0}</td>
                        <td className="text-center px-3 py-4 text-gray-700">{player.assists || 0}</td>
                        <td className="text-center px-3 py-4 text-gray-700">{player.turnovers || 0}</td>
                        <td className="text-center px-3 py-4 text-gray-700">{player.steals || 0}</td>
                        <td className="text-center px-3 py-4 text-gray-700">{player.blocks || 0}</td>
                      </tr>
                    ))}
                  </>
                )}

                {/* Bench */}
                {bench.length > 0 && (
                  <>
                    <tr className="bg-gray-50">
                      <td colSpan={11} className="px-6 py-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Bench
                      </td>
                    </tr>
                    {bench.map((player: PlayerStat) => (
                      <tr key={`bench-${player.athlete_id}`} className="hover:bg-gray-50 border-t border-gray-200 transition-colors">
                        <td className="px-6 py-4 sticky left-0 bg-white hover:bg-gray-50 z-10">
                          <Link
                            href={`/players/${player.athlete_id}`}
                            className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {player.display_name || player.full_name}
                          </Link>
                          <div className="text-xs text-gray-500">{player.position_name}</div>
                        </td>
                        <td className="text-center px-3 py-4 text-gray-700">{player.minutes_played || 0}</td>
                        <td className="text-center px-3 py-4 font-bold text-gray-900">{player.points || 0}</td>
                        <td className="text-center px-3 py-4 text-gray-700">
                          {player.field_goals_made || 0}-{player.field_goals_attempted || 0}
                        </td>
                        <td className="text-center px-3 py-4 text-gray-700">
                          {player.three_point_made || 0}-{player.three_point_attempted || 0}
                        </td>
                        <td className="text-center px-3 py-4 text-gray-700">
                          {player.free_throws_made || 0}-{player.free_throws_attempted || 0}
                        </td>
                        <td className="text-center px-3 py-4 text-gray-700">{player.rebounds || 0}</td>
                        <td className="text-center px-3 py-4 text-gray-700">{player.assists || 0}</td>
                        <td className="text-center px-3 py-4 text-gray-700">{player.turnovers || 0}</td>
                        <td className="text-center px-3 py-4 text-gray-700">{player.steals || 0}</td>
                        <td className="text-center px-3 py-4 text-gray-700">{player.blocks || 0}</td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Line Score Table */}
      {game.home_line_scores && game.home_line_scores.length > 0 && game.away_line_scores && game.away_line_scores.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Scoring by Period</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead className="bg-gray-100 border-b-2 border-gray-300">
                <tr>
                  <th className="text-left px-6 py-3 font-bold text-gray-700">Team</th>
                  {game.home_line_scores.map((_: any, idx: number) => (
                    <th key={idx} className="text-center px-4 py-3 font-bold text-gray-700">
                      {idx === 0 ? '1st' : idx === 1 ? '2nd' : `OT${idx - 1}`}
                    </th>
                  ))}
                  <th className="text-center px-6 py-3 font-bold text-gray-900 bg-gray-200">T</th>
                </tr>
              </thead>
              <tbody>
                {/* Away Team */}
                <tr className="border-t border-gray-200 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <img src={awayTeamLogo} alt={game.away_team_name} className="w-8 h-8" />
                      <span className="font-semibold text-gray-900">{game.away_team_name}</span>
                    </div>
                  </td>
                  {game.away_line_scores.map((score: string, idx: number) => (
                    <td key={idx} className="text-center px-4 py-4 font-medium text-gray-700">
                      {score}
                    </td>
                  ))}
                  <td className="text-center px-6 py-4 font-black text-xl bg-gray-100 text-gray-900">
                    {game.away_score}
                  </td>
                </tr>
                {/* Home Team */}
                <tr className="border-t border-gray-200 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <img src={homeTeamLogo} alt={game.home_team_name} className="w-8 h-8" />
                      <span className="font-semibold text-gray-900">{game.home_team_name}</span>
                    </div>
                  </td>
                  {game.home_line_scores.map((score: string, idx: number) => (
                    <td key={idx} className="text-center px-4 py-4 font-medium text-gray-700">
                      {score}
                    </td>
                  ))}
                  <td className="text-center px-6 py-4 font-black text-xl bg-gray-100 text-gray-900">
                    {game.home_score}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Player Statistics Tables */}
      {game.source === 'espn' && game.players ? (
        renderESPNFormat()
      ) : game.player_stats && game.player_stats.length > 0 ? (
        renderDatabaseFormat()
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-500">
          <p className="text-lg">Box score not available for this game.</p>
        </div>
      )}
    </div>
  );
}
