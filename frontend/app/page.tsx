import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Game {
  event_id: number;
  date: string;
  name: string;
  short_name: string;
  home_score: number;
  away_score: number;
  status: string;
  is_completed: boolean;
  is_conference_game: boolean;
  home_team_name: string;
  home_team_abbr: string;
  home_team_logo: string;
  away_team_name: string;
  away_team_abbr: string;
  away_team_logo: string;
  venue_name: string;
  season_year: number;
}

async function getRecentGames() {
  try {
    const res = await fetch(`${API_BASE}/api/games?season=2026&limit=20`, {
      next: { revalidate: 60 }
    });
    if (!res.ok) return { games: [] };
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch games:", error);
    return { games: [] };
  }
}

async function getRankings() {
  try {
    const res = await fetch(`${API_BASE}/api/rankings?season=2026&ranking_type=ap`, {
      next: { revalidate: 3600 }
    });
    if (!res.ok) return { rankings: [] };
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch rankings:", error);
    return { rankings: [] };
  }
}

function GameCard({ game }: { game: Game }) {
  const gameDate = new Date(game.date);
  const now = new Date();
  const isLive = game.status.toLowerCase().includes("live") || game.status.toLowerCase().includes("in progress");

  const awayWon = game.is_completed && (game.away_score || 0) > (game.home_score || 0);
  const homeWon = game.is_completed && (game.home_score || 0) > (game.away_score || 0);

  // Calculate relative time
  const getRelativeTime = () => {
    const diffMs = now.getTime() - gameDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 24) {
      return gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return gameDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <Link href={`/games/${game.event_id}`} className="block">
      <div className="border border-gray-200 hover:bg-gray-50 transition-all p-4">
        <div className="text-xs text-gray-500 mb-2 flex items-center gap-2 flex-wrap">
          <span>{getRelativeTime()} • {game.venue_name}</span>
          {game.is_conference_game && (
            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded font-medium border border-blue-200">
              CONF
            </span>
          )}
          {isLive && <span className="text-red-600 font-semibold">LIVE</span>}
          {game.is_completed && <span className="text-green-600 font-semibold">FINAL</span>}
        </div>

        <div className="space-y-3">
          {/* Away Team */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              {game.away_team_logo && (
                <img src={game.away_team_logo} alt={game.away_team_name} className="w-8 h-8" />
              )}
              <span className={`font-medium ${awayWon ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>
                {game.away_team_name}
              </span>
            </div>
            <span className={`text-2xl font-bold ${awayWon ? 'text-gray-900' : 'text-gray-400'}`}>
              {game.away_score || 0}
            </span>
          </div>

          {/* Home Team */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              {game.home_team_logo && (
                <img src={game.home_team_logo} alt={game.home_team_name} className="w-8 h-8" />
              )}
              <span className={`font-medium ${homeWon ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>
                {game.home_team_name}
              </span>
            </div>
            <span className={`text-2xl font-bold ${homeWon ? 'text-gray-900' : 'text-gray-400'}`}>
              {game.home_score || 0}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function Home() {
  const [gamesData, rankingsData] = await Promise.all([
    getRecentGames(),
    getRankings()
  ]);

  const allGames = gamesData.games || [];
  const topRankings = rankingsData.rankings.slice(0, 25);

  // Separate games by status
  const liveGames = allGames.filter((g: Game) =>
    !g.is_completed && ((g.away_score || 0) > 0 || (g.home_score || 0) > 0)
  );
  const completedGames = allGames.filter((g: Game) => g.is_completed);
  const upcomingGames = allGames.filter((g: Game) =>
    !g.is_completed && (g.away_score || 0) === 0 && (g.home_score || 0) === 0
  );

  // Find ranked matchups (games where both teams are in top 25)
  const rankedTeamIds = new Set(rankingsData.rankings.slice(0, 25).map((r: any) => r.team_id));
  const rankedMatchups = completedGames.filter((g: Game) => {
    // This is a rough approximation - ideally we'd have team_id on games
    return g.is_conference_game; // Using conference games as proxy for "featured"
  }).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">NCAA Basketball</h1>
        <p className="text-gray-600">2025-26 Season</p>
      </div>

      {/* Live Games Alert */}
      {liveGames.length > 0 && (
        <div className="border-l-4 border-red-500 bg-red-50 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">
                {liveGames.length} game{liveGames.length > 1 ? 's' : ''} in progress
              </p>
            </div>
            <div className="ml-auto">
              <Link href="/games" className="text-sm font-medium text-red-800 hover:text-red-900">
                View Live →
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content - 3 columns */}
        <div className="lg:col-span-3 space-y-6">
          {/* Featured Games */}
          {rankedMatchups.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold text-gray-900">Featured Games</h2>
                <Link href="/games" className="text-sm font-medium text-blue-600 hover:text-blue-800">
                  All Games →
                </Link>
              </div>
              <div className="space-y-3">
                {rankedMatchups.map((game: Game) => (
                  <GameCard key={game.event_id} game={game} />
                ))}
              </div>
            </div>
          )}

          {/* Recent Results */}
          {completedGames.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold text-gray-900">Recent Results</h2>
                <Link href="/games" className="text-sm font-medium text-blue-600 hover:text-blue-800">
                  View All →
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {completedGames.slice(0, 6).map((game: Game) => (
                  <GameCard key={game.event_id} game={game} />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Games */}
          {upcomingGames.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold text-gray-900">Upcoming Games</h2>
                <Link href="/games" className="text-sm font-medium text-blue-600 hover:text-blue-800">
                  Full Schedule →
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {upcomingGames.slice(0, 4).map((game: Game) => (
                  <GameCard key={game.event_id} game={game} />
                ))}
              </div>
            </div>
          )}

          {allGames.length === 0 && (
            <div className="border border-gray-200 p-8 text-center text-gray-500">
              <p>No games found. Make sure the API server is running.</p>
              <p className="text-sm mt-2">Run: <code className="bg-gray-100 px-2 py-1 rounded text-gray-700">cd api && python main.py</code></p>
            </div>
          )}
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* AP Top 25 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">AP Top 25</h2>
              <Link href="/rankings" className="text-sm font-medium text-blue-600 hover:text-blue-800">
                View All →
              </Link>
            </div>
            <div className="border border-gray-200 divide-y divide-gray-200">
              {topRankings.length > 0 ? (
                topRankings.map((team: any) => (
                  <Link
                    key={team.team_id}
                    href={`/teams/${team.team_id}`}
                    className="flex items-center p-2.5 hover:bg-gray-50 transition-colors group"
                  >
                    <span className="text-base font-bold text-gray-400 w-6 group-hover:text-gray-900 transition-colors">
                      {team.current_rank}
                    </span>
                    {team.team_logo && (
                      <img src={team.team_logo} alt={team.team_name} className="w-5 h-5 mx-2" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm truncate">{team.team_name}</div>
                      <div className="text-xs text-gray-500">{team.record_summary}</div>
                    </div>
                    {team.previous_rank && team.previous_rank !== team.current_rank && (
                      <span className={`text-xs font-bold ml-1 ${
                        team.previous_rank > team.current_rank ? 'text-green-600' :
                        'text-red-600'
                      }`}>
                        {team.trend}
                      </span>
                    )}
                  </Link>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No rankings available
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Quick Links</h2>
            <div className="space-y-2">
              <Link href="/teams" className="block border border-gray-200 p-3 hover:bg-gray-50 transition-colors">
                <div className="font-semibold text-gray-900 text-sm mb-1">Teams</div>
                <div className="text-xs text-gray-600">Browse all teams</div>
              </Link>
              <Link href="/players" className="block border border-gray-200 p-3 hover:bg-gray-50 transition-colors">
                <div className="font-semibold text-gray-900 text-sm mb-1">Players</div>
                <div className="text-xs text-gray-600">Player statistics</div>
              </Link>
              <Link href="/standings" className="block border border-gray-200 p-3 hover:bg-gray-50 transition-colors">
                <div className="font-semibold text-gray-900 text-sm mb-1">Standings</div>
                <div className="text-xs text-gray-600">Conference standings</div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
