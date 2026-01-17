import Link from "next/link";
import TopContributorCard from "../TopContributorCard";
import SeasonTrendChart from "../components/SeasonTrendChart";

interface OverviewTabProps {
  team: any;
  standings: any;
  teamStats: any;
  leaders: any[];
  completedGames: any[];
  upcomingGames: any[];
}

export default function OverviewTab({
  team,
  standings,
  teamStats,
  leaders,
  completedGames,
  upcomingGames,
}: OverviewTabProps) {
  // Calculate neutral site record
  const neutralWins = standings.wins && standings.home_wins && standings.road_wins
    ? standings.wins - standings.home_wins - standings.road_wins
    : 0;
  const neutralLosses = standings.losses && standings.home_losses && standings.road_losses
    ? standings.losses - standings.home_losses - standings.road_losses
    : 0;

  return (
    <div className="space-y-6">
      {/* Season Trend Chart */}
      {completedGames.length > 0 && (
        <SeasonTrendChart completedGames={completedGames} teamColor={team.color} />
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Team Averages Card */}
        {teamStats.avg_points_scored && (
          <div className="border border-gray-200 p-6 bg-white rounded-lg shadow-sm">
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
          <div className="border border-gray-200 p-6 bg-white rounded-lg shadow-sm">
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
          <div className="border border-gray-200 p-6 bg-white rounded-lg shadow-sm">
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
              {neutralWins > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Neutral Site</span>
                  <span className="text-xl font-bold text-gray-900">
                    {neutralWins}-{neutralLosses}
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
        <div className="border border-gray-200 overflow-hidden rounded-lg shadow-sm bg-white">
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

      {/* Next Game Preview */}
      {upcomingGames.length > 0 && (() => {
        const nextGame = upcomingGames[upcomingGames.length - 1];
        const gameDate = new Date(nextGame.date);
        const now = new Date();
        const daysUntil = Math.ceil((gameDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const isHome = nextGame.location === 'home';
        const winProb = isHome ? nextGame.home_win_probability : nextGame.away_win_probability;

        return (
          <div className="border border-gray-200 p-6 bg-white rounded-lg shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🏀 Next Game</h2>
            <Link href={`/games/${nextGame.event_id}`} className="block hover:bg-gray-50 p-4 rounded-lg transition-colors border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {nextGame.opponent_logo && (
                    <img src={nextGame.opponent_logo} alt={nextGame.opponent_name} className="w-16 h-16" />
                  )}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-500">{isHome ? 'vs' : '@'}</span>
                      {nextGame.opponent_rank && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gray-900 text-white">
                          #{nextGame.opponent_rank}
                        </span>
                      )}
                      <span className="text-xl font-bold text-gray-900">{nextGame.opponent_name}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {gameDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at{' '}
                      {gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </div>
                    {nextGame.broadcast_network && (
                      <div className="text-xs text-gray-500 mt-1">
                        📺 {nextGame.broadcast_network}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? 'TOMORROW' : `${daysUntil} DAYS`}
                  </div>
                  {winProb && (
                    <div className="text-sm text-gray-600">
                      {Math.round(winProb)}% win prob
                    </div>
                  )}
                  {nextGame.spread && (
                    <div className="text-sm font-medium text-gray-700 mt-1">
                      Spread: {nextGame.spread > 0 ? '+' : ''}{nextGame.spread}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          </div>
        );
      })()}

      {/* Home Venue Information */}
      {team.venue_name && (
        <div className="border border-gray-200 p-6 bg-white rounded-lg shadow-sm">
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
    </div>
  );
}
