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

interface TeamStat {
  name: string;
  displayValue: string;
  label: string;
  abbreviation?: string;
}

interface TeamStats {
  team: {
    id: string;
    displayName: string;
    abbreviation: string;
    logo: string;
  };
  statistics: TeamStat[];
  homeAway: string;
}

interface GameDetail {
  event_id: number;
  date: string;
  home_team_name: string;
  home_team_abbr: string;
  home_team_logo: string;
  home_team_color?: string;
  home_score: number;
  home_team_ap_rank?: number;
  home_team_id?: number;
  home_line_scores?: string[];
  away_team_name: string;
  away_team_abbr: string;
  away_team_logo: string;
  away_team_color?: string;
  away_score: number;
  away_team_ap_rank?: number;
  away_line_scores?: string[];
  status: string;
  status_detail?: string;
  venue_name: string;
  attendance?: number;
  player_stats?: PlayerStat[];
  players?: TeamPlayerStats[];
  team_stats?: TeamStats[];
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

  // If logos are missing from game object, try to get them from players array (ESPN source)
  let homeTeamLogo = game.home_team_logo;
  let awayTeamLogo = game.away_team_logo;

  if (game.source === 'espn' && game.players) {
    // Find team logos from players array
    game.players.forEach((teamData) => {
      if (teamData.team.abbreviation === game.home_team_abbr && !homeTeamLogo) {
        homeTeamLogo = teamData.team.logo;
      }
      if (teamData.team.abbreviation === game.away_team_abbr && !awayTeamLogo) {
        awayTeamLogo = teamData.team.logo;
      }
    });
  }

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
          {(game.venue_name || game.attendance) && (
            <div className="text-sm text-gray-500">
              {game.venue_name}
              {game.venue_name && game.attendance && ' • '}
              {game.attendance && `${game.attendance.toLocaleString()} attendance`}
            </div>
          )}
        </div>

        {/* Score Display */}
        <div className="flex items-center justify-center space-x-8">
          {/* Away Team */}
          <div className="flex items-center space-x-4">
            {awayTeamLogo && (
              <img src={awayTeamLogo} alt={game.away_team_name} className="w-16 h-16" />
            )}
            <div className="text-right">
              <div className={`text-lg font-semibold ${awayWon ? 'text-gray-900' : 'text-gray-600'}`}>
                {game.away_team_ap_rank && game.away_team_ap_rank <= 25 && (
                  <span className="font-bold mr-2">#{game.away_team_ap_rank}</span>
                )}
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
                {game.home_team_ap_rank && game.home_team_ap_rank <= 25 && (
                  <span className="font-bold mr-2">#{game.home_team_ap_rank}</span>
                )}
                {game.home_team_name}
              </div>
              <div className={`text-4xl font-bold ${homeWon ? 'text-gray-900' : 'text-gray-400'}`}>
                {game.home_score}
              </div>
            </div>
            {homeTeamLogo && (
              <img src={homeTeamLogo} alt={game.home_team_name} className="w-16 h-16" />
            )}
          </div>
        </div>
      </div>

      {/* Line Score */}
      {(game.home_line_scores && game.home_line_scores.length > 0 &&
        game.away_line_scores && game.away_line_scores.length > 0) && (
        <div className="border border-gray-200">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Scoring by Period</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold text-gray-700">Team</th>
                  {game.home_line_scores.map((_, idx) => (
                    <th key={idx} className="text-center px-4 py-3 font-semibold text-gray-700">
                      {idx === 0 ? '1st' : idx === 1 ? '2nd' : `OT${idx - 1}`}
                    </th>
                  ))}
                  <th className="text-center px-6 py-3 font-semibold text-gray-700 bg-gray-200">T</th>
                </tr>
              </thead>
              <tbody>
                {/* Away Team */}
                <tr className="border-t border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <div className="flex items-center space-x-3">
                      {awayTeamLogo && (
                        <img src={awayTeamLogo} alt={game.away_team_name} className="w-6 h-6" />
                      )}
                      <span className={`font-medium ${awayWon ? 'text-gray-900' : 'text-gray-600'}`}>
                        {game.away_team_ap_rank && game.away_team_ap_rank <= 25 && (
                          <span className="font-bold mr-1">#{game.away_team_ap_rank}</span>
                        )}
                        {game.away_team_name}
                      </span>
                    </div>
                  </td>
                  {game.away_line_scores.map((score, idx) => (
                    <td key={idx} className="text-center px-4 py-3 font-medium text-gray-700">
                      {score}
                    </td>
                  ))}
                  <td className={`text-center px-6 py-3 font-bold text-lg bg-gray-100 ${awayWon ? 'text-gray-900' : 'text-gray-600'}`}>
                    {game.away_score}
                  </td>
                </tr>
                {/* Home Team */}
                <tr className="border-t border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <div className="flex items-center space-x-3">
                      {homeTeamLogo && (
                        <img src={homeTeamLogo} alt={game.home_team_name} className="w-6 h-6" />
                      )}
                      <span className={`font-medium ${homeWon ? 'text-gray-900' : 'text-gray-600'}`}>
                        {game.home_team_ap_rank && game.home_team_ap_rank <= 25 && (
                          <span className="font-bold mr-1">#{game.home_team_ap_rank}</span>
                        )}
                        {game.home_team_name}
                      </span>
                    </div>
                  </td>
                  {game.home_line_scores.map((score, idx) => (
                    <td key={idx} className="text-center px-4 py-3 font-medium text-gray-700">
                      {score}
                    </td>
                  ))}
                  <td className={`text-center px-6 py-3 font-bold text-lg bg-gray-100 ${homeWon ? 'text-gray-900' : 'text-gray-600'}`}>
                    {game.home_score}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Betting Information */}
      {!game.is_completed && (game.spread !== null && game.spread !== undefined || game.over_under) && (
        <div className="border border-gray-200">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Betting Information</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Spread */}
              {(game.spread !== null && game.spread !== undefined) && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-600 mb-2">Point Spread</div>
                  <div className="text-3xl font-bold text-green-800">
                    {game.favorite_abbr} {game.spread > 0 ? '+' : ''}{game.spread}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {game.favorite_abbr} favored by {Math.abs(game.spread)} points
                  </div>
                </div>
              )}

              {/* Over/Under */}
              {game.over_under && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-600 mb-2">Over/Under</div>
                  <div className="text-3xl font-bold text-blue-800">
                    {game.over_under}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Total points over/under
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Team Statistics */}
      {game.team_stats && game.team_stats.length === 2 && (
        <div className="border border-gray-200">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Team Statistics</h2>
          </div>
          <div className="p-4">
            {(() => {
              const awayTeamStats = game.team_stats.find((t: any) => t.homeAway === 'away' || t.home_away === 'away');
              const homeTeamStats = game.team_stats.find((t: any) => t.homeAway === 'home' || t.home_away === 'home');

              if (!awayTeamStats || !homeTeamStats) return null;

              // Check if it's ESPN format (has statistics array) or database format (flat fields)
              const isESPNFormat = awayTeamStats.statistics !== undefined;

              if (isESPNFormat) {
                // ESPN format - existing code
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
                      const awayStat = awayTeamStats.statistics.find((s: any) => s.name === statName);
                      const homeStat = homeTeamStats.statistics.find((s: any) => s.name === statName);

                      if (!awayStat || !homeStat) return null;

                      const label = awayStat.label || awayStat.abbreviation || statName;

                      return (
                        <div key={statName} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                          <div className="w-24 text-right font-medium text-gray-900">
                            {awayStat.displayValue}
                          </div>
                          <div className="flex-1 text-center text-sm font-semibold text-gray-600 uppercase px-4">
                            {label}
                          </div>
                          <div className="w-24 text-left font-medium text-gray-900">
                            {homeStat.displayValue}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              } else {
                // Database format - transform to display
                const stats = [
                  { key: 'fg', label: 'Field Goals', awayValue: `${awayTeamStats.field_goals_made}-${awayTeamStats.field_goals_attempted}`, homeValue: `${homeTeamStats.field_goals_made}-${homeTeamStats.field_goals_attempted}` },
                  { key: 'fg_pct', label: 'FG%', awayValue: `${awayTeamStats.field_goal_pct}%`, homeValue: `${homeTeamStats.field_goal_pct}%` },
                  { key: '3pt', label: '3-Pointers', awayValue: `${awayTeamStats.three_point_made}-${awayTeamStats.three_point_attempted}`, homeValue: `${homeTeamStats.three_point_made}-${homeTeamStats.three_point_attempted}` },
                  { key: '3pt_pct', label: '3P%', awayValue: `${awayTeamStats.three_point_pct}%`, homeValue: `${homeTeamStats.three_point_pct}%` },
                  { key: 'ft', label: 'Free Throws', awayValue: `${awayTeamStats.free_throws_made}-${awayTeamStats.free_throws_attempted}`, homeValue: `${homeTeamStats.free_throws_made}-${homeTeamStats.free_throws_attempted}` },
                  { key: 'ft_pct', label: 'FT%', awayValue: `${awayTeamStats.free_throw_pct}%`, homeValue: `${homeTeamStats.free_throw_pct}%` },
                  { key: 'reb', label: 'Total Rebounds', awayValue: awayTeamStats.total_rebounds, homeValue: homeTeamStats.total_rebounds },
                  { key: 'oreb', label: 'Offensive Rebounds', awayValue: awayTeamStats.offensive_rebounds, homeValue: homeTeamStats.offensive_rebounds },
                  { key: 'dreb', label: 'Defensive Rebounds', awayValue: awayTeamStats.defensive_rebounds, homeValue: homeTeamStats.defensive_rebounds },
                  { key: 'ast', label: 'Assists', awayValue: awayTeamStats.assists, homeValue: homeTeamStats.assists },
                  { key: 'stl', label: 'Steals', awayValue: awayTeamStats.steals, homeValue: homeTeamStats.steals },
                  { key: 'blk', label: 'Blocks', awayValue: awayTeamStats.blocks, homeValue: homeTeamStats.blocks },
                  { key: 'to', label: 'Turnovers', awayValue: awayTeamStats.turnovers, homeValue: homeTeamStats.turnovers },
                  { key: 'fouls', label: 'Fouls', awayValue: awayTeamStats.fouls, homeValue: homeTeamStats.fouls },
                ];

                return (
                  <div className="space-y-2">
                    {stats.map((stat) => (
                      <div key={stat.key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                        <div className="w-24 text-right font-medium text-gray-900">
                          {stat.awayValue}
                        </div>
                        <div className="flex-1 text-center text-sm font-semibold text-gray-600 uppercase px-4">
                          {stat.label}
                        </div>
                        <div className="w-24 text-left font-medium text-gray-900">
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
      )}

      {/* Player Statistics */}
      {game.source === 'espn' && game.players ? (
        // ESPN format
        game.players.map((teamData) => {
          const allPlayers = teamData.statistics[0]?.athletes || [];
          const starters = allPlayers.filter(p => p.starter);
          const bench = allPlayers.filter(p => !p.starter);

          return (
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
                  <tbody>
                    {/* Starters Section */}
                    {starters.length > 0 && (
                      <>
                        <tr className="bg-gray-50">
                          <td colSpan={teamData.statistics[0]?.labels.length + 1} className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase">
                            Starters
                          </td>
                        </tr>
                        {starters.map((player, idx) => (
                          <tr key={`starter-${idx}`} className="hover:bg-gray-50 border-t border-gray-200">
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
                                  <Link
                                    href={`/players/${player.athlete?.id}`}
                                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                  >
                                    {player.athlete?.displayName}
                                  </Link>
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
                      </>
                    )}

                    {/* Bench Section */}
                    {bench.length > 0 && (
                      <>
                        <tr className="bg-gray-50">
                          <td colSpan={teamData.statistics[0]?.labels.length + 1} className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase">
                            Bench
                          </td>
                        </tr>
                        {bench.map((player, idx) => (
                          <tr key={`bench-${idx}`} className="hover:bg-gray-50 border-t border-gray-200">
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
                                  <Link
                                    href={`/players/${player.athlete?.id}`}
                                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                  >
                                    {player.athlete?.displayName}
                                  </Link>
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
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
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
              // Determine team name based on team_id by comparing with home/away team IDs
              const isHomeTeam = Number(teamId) === game.home_team_id;
              const teamName = isHomeTeam ? game.home_team_name : game.away_team_name;
              const teamLogo = isHomeTeam ? game.home_team_logo : game.away_team_logo;

              // Separate starters from bench
              const starters = teamStats.filter(p => (p as any).is_starter === 1);
              const bench = teamStats.filter(p => (p as any).is_starter === 0 || !(p as any).is_starter);

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
                    <tbody>
                      {/* Starters Section */}
                      {starters.length > 0 && (
                        <>
                          <tr className="bg-gray-50">
                            <td colSpan={11} className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase">
                              Starters
                            </td>
                          </tr>
                          {starters.map((player) => (
                            <tr key={`starter-${player.athlete_id}`} className="hover:bg-gray-50 border-t border-gray-200">
                              <td className="px-4 py-3">
                                <Link
                                  href={`/players/${player.athlete_id}`}
                                  className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  {player.display_name || player.full_name}
                                </Link>
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
                        </>
                      )}

                      {/* Bench Section */}
                      {bench.length > 0 && (
                        <>
                          <tr className="bg-gray-50">
                            <td colSpan={11} className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase">
                              Bench
                            </td>
                          </tr>
                          {bench.map((player) => (
                            <tr key={`bench-${player.athlete_id}`} className="hover:bg-gray-50 border-t border-gray-200">
                              <td className="px-4 py-3">
                                <Link
                                  href={`/players/${player.athlete_id}`}
                                  className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  {player.display_name || player.full_name}
                                </Link>
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
                        </>
                      )}
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
