import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  // ESPN format
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

interface TeamPlayerStats {
  team: {
    id: string;
    displayName: string;
    abbreviation: string;
    logo: string;
    color?: string;
  };
  statistics: Array<{
    names: string[];
    labels: string[];
    athletes: PlayerStat[];
  }>;
}

interface GameDetail {
  event_id: number;
  date: string;
  home_team_name: string;
  home_team_abbr: string;
  home_team_logo: string;
  home_team_color?: string;
  home_score: number;
  away_team_name: string;
  away_team_abbr: string;
  away_team_logo: string;
  away_team_color?: string;
  away_score: number;
  status: string;
  status_detail?: string;
  venue_name: string;
  attendance?: number;
  player_stats?: PlayerStat[];
  players?: TeamPlayerStats[];
  source?: string;
}

async function getGameDetail(eventId: string) {
  try {
    const res = await fetch(`${API_BASE}/api/games/${eventId}`, {
      cache: 'no-store'
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data as GameDetail;
  } catch (error) {
    console.error("Failed to fetch game detail:", error);
    return null;
  }
}

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = await getGameDetail(id);

  if (!game) {
    return (
      <div className="space-y-6">
        <Link href="/games" className="text-blue-600 hover:underline">
          ← Back to Games
        </Link>
        <div className="border border-gray-200 p-8 text-center text-gray-500">
          <p>Game not found.</p>
        </div>
      </div>
    );
  }

  const awayWon = game.away_score > game.home_score;
  const homeWon = game.home_score > game.away_score;

  return (
    <div className="space-y-6">
      <Link href="/games" className="text-blue-600 hover:underline">
        ← Back to Games
      </Link>

      {/* Game Header */}
      <div className="border border-gray-200 p-6">
        <div className="text-center mb-4">
          <div className="text-sm font-semibold text-gray-500 uppercase mb-2">
            {game.status_detail || game.status}
          </div>
          <div className="text-sm text-gray-500">
            {game.venue_name}
            {game.attendance && ` • ${game.attendance.toLocaleString()} attendance`}
          </div>
        </div>

        {/* Score Display */}
        <div className="flex items-center justify-center space-x-8">
          {/* Away Team */}
          <div className="flex items-center space-x-4">
            <img src={game.away_team_logo} alt={game.away_team_name} className="w-16 h-16" />
            <div className="text-right">
              <div className={`text-lg font-semibold ${awayWon ? 'text-gray-900' : 'text-gray-600'}`}>
                {game.away_team_name}
              </div>
              <div className={`text-4xl font-bold ${awayWon ? 'text-gray-900' : 'text-gray-400'}`}>
                {game.away_score}
              </div>
            </div>
          </div>

          <div className="text-2xl text-gray-400">@</div>

          {/* Home Team */}
          <div className="flex items-center space-x-4">
            <div className="text-left">
              <div className={`text-lg font-semibold ${homeWon ? 'text-gray-900' : 'text-gray-600'}`}>
                {game.home_team_name}
              </div>
              <div className={`text-4xl font-bold ${homeWon ? 'text-gray-900' : 'text-gray-400'}`}>
                {game.home_score}
              </div>
            </div>
            <img src={game.home_team_logo} alt={game.home_team_name} className="w-16 h-16" />
          </div>
        </div>
      </div>

      {/* Player Statistics */}
      {game.source === 'espn' && game.players ? (
        // ESPN format
        game.players.map((teamData) => (
          <div key={teamData.team.id} className="border border-gray-200">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <img src={teamData.team.logo} alt={teamData.team.displayName} className="w-8 h-8" />
                <h2 className="text-lg font-bold text-gray-900">{teamData.team.displayName}</h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold text-gray-700">Player</th>
                    {teamData.statistics[0]?.labels.map((label, idx) => (
                      <th key={idx} className="text-center px-2 py-2 font-semibold text-gray-700">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {teamData.statistics[0]?.athletes.map((player, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          {player.athlete?.headshot && (
                            <img
                              src={player.athlete.headshot.href}
                              alt={player.athlete.displayName}
                              className="w-8 h-8 rounded-full"
                            />
                          )}
                          <div>
                            <div className="font-medium text-gray-900">
                              {player.athlete?.displayName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {player.athlete?.position.abbreviation} • #{player.athlete?.jersey}
                            </div>
                          </div>
                        </div>
                      </td>
                      {player.stats?.map((stat, statIdx) => (
                        <td key={statIdx} className="text-center px-2 py-3 text-gray-700">
                          {stat}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      ) : game.player_stats && game.player_stats.length > 0 ? (
        // Database format - group by team_id
        <>
          {(() => {
            // Group players by team_id
            const playersByTeam = game.player_stats!.reduce((acc, player) => {
              const teamId = (player as any).team_id;
              if (!acc[teamId]) acc[teamId] = [];
              acc[teamId].push(player);
              return acc;
            }, {} as Record<number, PlayerStat[]>);

            const teamIds = Object.keys(playersByTeam);

            return teamIds.map((teamId) => {
              const teamStats = playersByTeam[Number(teamId)];
              // Determine team name based on team_id (first player's team)
              const isAwayTeam = teamStats.length > 0 && (teamStats[0] as any).team_id === teamIds[0];
              const teamName = isAwayTeam ? game.away_team_name : game.home_team_name;
              const teamLogo = isAwayTeam ? game.away_team_logo : game.home_team_logo;

              return (
                <div key={teamId} className="border border-gray-200">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                      <img src={teamLogo} alt={teamName} className="w-8 h-8" />
                      <h2 className="text-lg font-bold text-gray-900">{teamName}</h2>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-2 font-semibold text-gray-700">Player</th>
                        <th className="text-center px-2 py-2 font-semibold text-gray-700">MIN</th>
                        <th className="text-center px-2 py-2 font-semibold text-gray-700">PTS</th>
                        <th className="text-center px-2 py-2 font-semibold text-gray-700">FG</th>
                        <th className="text-center px-2 py-2 font-semibold text-gray-700">3PT</th>
                        <th className="text-center px-2 py-2 font-semibold text-gray-700">FT</th>
                        <th className="text-center px-2 py-2 font-semibold text-gray-700">REB</th>
                        <th className="text-center px-2 py-2 font-semibold text-gray-700">AST</th>
                        <th className="text-center px-2 py-2 font-semibold text-gray-700">TO</th>
                        <th className="text-center px-2 py-2 font-semibold text-gray-700">STL</th>
                        <th className="text-center px-2 py-2 font-semibold text-gray-700">BLK</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {teamStats.map((player) => (
                        <tr key={player.athlete_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">
                              {player.display_name || player.full_name}
                            </div>
                            <div className="text-xs text-gray-500">{player.position_name}</div>
                          </td>
                          <td className="text-center px-2 py-3">{player.minutes_played || 0}</td>
                          <td className="text-center px-2 py-3 font-medium">{player.points || 0}</td>
                          <td className="text-center px-2 py-3">
                            {player.field_goals_made || 0}-{player.field_goals_attempted || 0}
                          </td>
                          <td className="text-center px-2 py-3">
                            {player.three_point_made || 0}-{player.three_point_attempted || 0}
                          </td>
                          <td className="text-center px-2 py-3">
                            {player.free_throws_made || 0}-{player.free_throws_attempted || 0}
                          </td>
                          <td className="text-center px-2 py-3">{player.rebounds || 0}</td>
                          <td className="text-center px-2 py-3">{player.assists || 0}</td>
                          <td className="text-center px-2 py-3">{player.turnovers || 0}</td>
                          <td className="text-center px-2 py-3">{player.steals || 0}</td>
                          <td className="text-center px-2 py-3">{player.blocks || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              );
            });
          })()}
        </>
      ) : (
        <div className="border border-gray-200 p-8 text-center text-gray-500">
          <p>Box score not available for this game.</p>
        </div>
      )}
    </div>
  );
}
