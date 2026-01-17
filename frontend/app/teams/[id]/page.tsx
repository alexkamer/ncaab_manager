import Link from "next/link";
import PlayerHeadshot from "./PlayerHeadshot";
import TopContributorCard from "./TopContributorCard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getTeam(teamId: string) {
  try {
    const res = await fetch(`${API_BASE}/api/teams/${teamId}?season=2026`, {
      cache: 'no-store'
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Failed to fetch team:", error);
    return null;
  }
}

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await getTeam(id);

  if (!team) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900">Team Not Found</h1>
        <Link href="/teams" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
          ← Back to Teams
        </Link>
      </div>
    );
  }

  const standings = team.standings || {};
  const ranking = team.ranking;
  const teamStats = team.team_stats || {};
  const leaders = team.leaders || [];

  // Separate completed and upcoming games
  const completedGames = (team.games || []).filter((g: any) => g.is_completed);
  const upcomingGames = (team.games || []).filter((g: any) => !g.is_completed);

  return (
    <div className="space-y-6">
      {/* Team Header with Hero Background */}
      <div
        className="border border-gray-200 p-6 relative overflow-hidden transition-all duration-300 hover:shadow-lg"
        style={{
          background: team.color ? `linear-gradient(135deg, #${team.color}15 0%, #${team.color}05 100%)` : undefined,
          borderLeftWidth: '6px',
          borderLeftColor: team.color ? `#${team.color}` : '#d1d5db'
        }}
      >
        <div className="flex items-start space-x-6 relative z-10">
          {team.logo_url && (
            <img
              src={team.logo_url}
              alt={team.display_name}
              className="w-32 h-32 transition-transform duration-200 hover:scale-110 hover:drop-shadow-lg"
            />
          )}
          <div className="flex-1">
            {/* Team Name and Rank */}
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-4xl font-bold text-gray-900 transition-colors duration-200">{team.display_name}</h1>
              {ranking && (
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold text-white shadow-md transition-all duration-200 hover:shadow-xl hover:scale-105"
                  style={{
                    backgroundColor: team.color ? `#${team.color}` : '#1f2937'
                  }}
                >
                  #{ranking.current_rank}
                </span>
              )}
            </div>

            {/* Conference and Location */}
            <div className="flex items-center gap-2 text-base text-gray-600 mb-3">
              {team.conference_name && team.conference_name !== '' && (
                <>
                  <span className="font-medium">{team.conference_name}</span>
                  {standings.playoff_seed && (
                    <span className="text-sm text-gray-500 ml-1">
                      ({standings.playoff_seed}{standings.playoff_seed === 1 ? 'st' : standings.playoff_seed === 2 ? 'nd' : standings.playoff_seed === 3 ? 'rd' : 'th'})
                    </span>
                  )}
                </>
              )}
              {((team.conference_name && team.conference_name !== '') && (team.venue_city || team.location)) && (
                <span className="text-gray-400">•</span>
              )}
              {(team.venue_city || team.location) && (
                <span>{team.venue_city || team.location}{team.venue_state && `, ${team.venue_state}`}</span>
              )}
              {team.venue_name && team.venue_name !== '' && (
                <>
                  <span className="text-gray-400">•</span>
                  <span>🏟️ {team.venue_name}</span>
                </>
              )}
            </div>

            {/* All Records in One Row */}
            {standings.wins !== undefined && (
              <div className="flex items-center gap-4 text-base">
                <div>
                  <span className="font-bold text-gray-900">{standings.wins}-{standings.losses}</span>
                  <span className="text-gray-500 ml-1.5">Overall</span>
                </div>
                {standings.conference_wins !== undefined && (
                  <>
                    <span className="text-gray-300">•</span>
                    <div>
                      <span className="font-bold text-gray-900">{standings.conference_wins}-{standings.conference_losses}</span>
                      <span className="text-gray-500 ml-1.5">Conference</span>
                    </div>
                  </>
                )}
                {(standings.home_wins !== undefined && standings.home_wins !== null) && (
                  <>
                    <span className="text-gray-300">•</span>
                    <div>
                      <span className="font-bold text-gray-900">{standings.home_wins}-{standings.home_losses || 0}</span>
                      <span className="text-gray-500 ml-1.5">Home</span>
                    </div>
                  </>
                )}
                {(standings.road_wins !== undefined && standings.road_wins !== null) && (
                  <>
                    <span className="text-gray-300">•</span>
                    <div>
                      <span className="font-bold text-gray-900">{standings.road_wins}-{standings.road_losses || 0}</span>
                      <span className="text-gray-500 ml-1.5">Road</span>
                    </div>
                  </>
                )}
                {standings.current_streak && standings.streak_count && (
                  <>
                    <span className="text-gray-300">•</span>
                    <div className={`font-semibold px-2 py-0.5 rounded ${standings.current_streak.includes('-') || standings.current_streak === 'L' ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'} ${standings.streak_count >= 3 && !(standings.current_streak.includes('-') || standings.current_streak === 'L') ? 'animate-pulse' : ''}`}>
                      {standings.current_streak.includes('-') ? 'L' : (standings.current_streak === 'W' ? 'W' : 'W')}{Math.abs(standings.streak_count)}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Last 5 Games Visual & Next Game */}
            <div className="flex items-center gap-6 mt-3 flex-wrap">
              {completedGames.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Last 5:</span>
                  <div className="flex gap-1">
                    {completedGames.slice(0, 5).map((game: any, idx: number) => {
                      const isHome = game.location === 'home';
                      const teamScore = isHome ? game.home_score : game.away_score;
                      const oppScore = isHome ? game.away_score : game.home_score;
                      const won = teamScore > oppScore;

                      return (
                        <div
                          key={idx}
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white transition-transform hover:scale-125 ${
                            won ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          title={`${won ? 'W' : 'L'} vs ${game.opponent_name} ${teamScore}-${oppScore}`}
                        >
                          {won ? 'W' : 'L'}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {upcomingGames.length > 0 && (() => {
                const nextGame = upcomingGames[upcomingGames.length - 1];
                const gameDate = new Date(nextGame.date);
                const now = new Date();
                const daysUntil = Math.ceil((gameDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const isHome = nextGame.location === 'home';

                return (
                  <Link
                    href={`/games/${nextGame.event_id}`}
                    className="flex items-center gap-2 text-sm hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <span className="text-gray-500">Next:</span>
                    <span className="font-medium text-gray-900">
                      {isHome ? 'vs' : '@'} {nextGame.opponent_name}
                    </span>
                    <span className="text-gray-500">
                      {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil} days`}
                    </span>
                  </Link>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Team Stats Card */}
        {teamStats.avg_points_scored && (
          <div className="border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Team Averages</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Points Per Game</span>
                <span className="text-xl font-bold text-gray-900">{teamStats.avg_points_scored}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Points Allowed</span>
                <span className="text-xl font-bold text-gray-900">{teamStats.avg_points_allowed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Point Differential</span>
                <span className={`text-xl font-bold ${(teamStats.avg_points_scored - teamStats.avg_points_allowed) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(teamStats.avg_points_scored - teamStats.avg_points_allowed) > 0 ? '+' : ''}{(teamStats.avg_points_scored - teamStats.avg_points_allowed).toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-gray-600">Field Goal %</span>
                <span className="font-bold text-gray-900">{teamStats.avg_fg_pct}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">3-Point %</span>
                <span className="font-bold text-gray-900">{teamStats.avg_three_pct}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Free Throw %</span>
                <span className="font-bold text-gray-900">{teamStats.avg_ft_pct}%</span>
              </div>
            </div>
          </div>
        )}

        {/* More Team Stats */}
        {teamStats.avg_rebounds && (
          <div className="border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Team Statistics</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Rebounds</span>
                <span className="text-xl font-bold text-gray-900">{teamStats.avg_rebounds}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Assists</span>
                <span className="text-xl font-bold text-gray-900">{teamStats.avg_assists}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Steals</span>
                <span className="text-xl font-bold text-gray-900">{teamStats.avg_steals}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Blocks</span>
                <span className="text-xl font-bold text-gray-900">{teamStats.avg_blocks}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-gray-600">Turnovers</span>
                <span className="text-xl font-bold text-gray-900">{teamStats.avg_turnovers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Fouls</span>
                <span className="text-xl font-bold text-gray-900">{teamStats.avg_fouls}</span>
              </div>
            </div>
          </div>
        )}

        {/* Record Splits */}
        {standings.home_wins !== undefined && (
          <div className="border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Record Breakdown</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Home Record</span>
                <span className="text-xl font-bold text-gray-900">{standings.home_wins || 0}-{standings.home_losses || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Road Record</span>
                <span className="text-xl font-bold text-gray-900">{standings.road_wins || 0}-{standings.road_losses || 0}</span>
              </div>
              {/* Neutral site games if they exist */}
              {(standings.wins - standings.home_wins - standings.road_wins > 0) && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Neutral Site</span>
                  <span className="text-xl font-bold text-gray-900">
                    {standings.wins - standings.home_wins - standings.road_wins}-{standings.losses - standings.home_losses - standings.road_losses}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Conference</span>
                <span className="text-xl font-bold text-gray-900">{standings.conference_wins || 0}-{standings.conference_losses || 0}</span>
              </div>
              {standings.vs_ap_top25_wins !== undefined && (
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-gray-600">vs AP Top 25</span>
                  <span className="text-xl font-bold text-gray-900">{standings.vs_ap_top25_wins || 0} wins</span>
                </div>
              )}
              {standings.playoff_seed && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Conference Seed</span>
                  <span className="text-xl font-bold text-gray-900">#{standings.playoff_seed}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Top Contributors */}
      {leaders.length > 0 && (
        <div className="border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <h2 className="text-2xl font-bold text-gray-900">⭐ Top Contributors</h2>
            <p className="text-sm text-gray-600 mt-1">Team's top 3 overall performers</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-6 bg-gray-50">
            {leaders.slice(0, 3).map((leader: any, idx: number) => (
              <TopContributorCard key={leader.athlete_id} leader={leader} idx={idx} />
            ))}
          </div>
        </div>
      )}

      {/* Venue Information */}
      {team.venue_name && (
        <div className="border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Home Venue</h2>
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <div className="text-2xl font-bold text-gray-900 mb-2">{team.venue_name}</div>
              <div className="text-gray-600">
                {team.venue_city}, {team.venue_state}
              </div>
            </div>
            {standings.home_wins !== undefined && standings.home_losses !== undefined && (
              <div className="text-right">
                <div className="text-sm text-gray-500 mb-1">Home Record</div>
                <div className="text-2xl font-bold text-gray-900">
                  {standings.home_wins}-{standings.home_losses}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Roster */}
      {team.roster && team.roster.length > 0 && (
        <div className="border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Roster</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Height
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Weight
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Class
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {team.roster.map((player: any) => (
                  <tr key={player.athlete_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/players/${player.athlete_id}`}
                        className="flex items-center gap-3 group"
                      >
                        <PlayerHeadshot athleteId={player.athlete_id} fullName={player.full_name} />
                        <span className="text-sm font-medium text-blue-600 group-hover:text-blue-800">
                          {player.full_name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {player.jersey || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {player.position_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {player.height_inches ? `${Math.floor(player.height_inches / 12)}'${player.height_inches % 12}"` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {player.weight_lbs ? `${player.weight_lbs} lbs` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {player.experience_display || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Form */}
      {completedGames.length > 0 && (
        <div className="border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Recent Form</h2>
          </div>
          <div className="p-6">
            {/* Detailed recent games list */}
            <div className="space-y-2">
              {completedGames.slice(0, 10).map((game: any) => {
                const isHome = game.location === 'home';
                const teamScore = isHome ? game.home_score : game.away_score;
                const oppScore = isHome ? game.away_score : game.home_score;
                const won = teamScore > oppScore;

                return (
                  <Link
                    key={game.event_id}
                    href={`/games/${game.event_id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="text-sm text-gray-500 w-20">
                        {new Date(game.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-white text-sm ${
                        won ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                        {won ? 'W' : 'L'}
                      </div>
                      <div className="flex items-center space-x-2 flex-1">
                        <span className="text-sm text-gray-500 w-8">{isHome ? 'vs' : '@'}</span>
                        {game.opponent_logo && (
                          <img src={game.opponent_logo} alt={game.opponent_name} className="w-8 h-8" />
                        )}
                        <div className="flex items-center gap-2">
                          {game.opponent_rank && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gray-900 text-white">
                              #{game.opponent_rank}
                            </span>
                          )}
                          <span className="font-medium text-gray-900">{game.opponent_name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {game.is_conference_game === 1 && (
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">CONF</span>
                      )}
                      <div className="text-sm font-bold text-gray-900">
                        {teamScore}-{oppScore}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Schedule */}
      {upcomingGames.length > 0 && (
        <div className="border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Upcoming Schedule</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {upcomingGames.map((game: any) => {
              const isHome = game.location === 'home';
              const winProb = isHome ? game.home_win_probability : game.away_win_probability;

              return (
                <Link
                  key={game.event_id}
                  href={`/games/${game.event_id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="text-sm w-32">
                      <div className="font-medium text-gray-900">
                        {new Date(game.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="text-gray-500">
                        {new Date(game.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-1">
                      <span className="text-sm text-gray-500 w-8">{isHome ? 'vs' : '@'}</span>
                      {game.opponent_logo && (
                        <img src={game.opponent_logo} alt={game.opponent_name} className="w-8 h-8" />
                      )}
                      <div className="flex items-center gap-2">
                        {game.opponent_rank && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gray-900 text-white">
                            #{game.opponent_rank}
                          </span>
                        )}
                        <span className="font-medium text-gray-900">{game.opponent_name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {game.is_conference_game === 1 && (
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">CONF</span>
                    )}
                    {game.broadcast_network && game.broadcast_network !== '' && (
                      <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {game.broadcast_network}
                      </span>
                    )}
                    {winProb && (
                      <span className="text-sm font-medium text-gray-900">
                        {Math.round(winProb)}% win prob
                      </span>
                    )}
                    {game.spread && (
                      <span className="text-sm font-medium text-gray-600">
                        {game.spread > 0 ? '+' : ''}{game.spread}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
