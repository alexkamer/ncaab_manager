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

  const topRankings = rankingsData.rankings.slice(0, 25);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">NCAA Basketball</h1>
        <p className="text-lg text-gray-600">Live scores, stats, and rankings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Games */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Recent Games</h2>
            <Link href="/games" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View All →
            </Link>
          </div>

          {gamesData.games.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gamesData.games.map((game: Game) => (
                <GameCard key={game.event_id} game={game} />
              ))}
            </div>
          ) : (
            <div className="border border-gray-200 p-8 text-center text-gray-500">
              <p>No recent games found. Make sure the API server is running.</p>
              <p className="text-sm mt-2">Run: <code className="bg-gray-100 px-2 py-1 rounded text-gray-700">cd api && python main.py</code></p>
            </div>
          )}
        </div>

        {/* AP Poll Rankings */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">AP Poll Top 25</h2>
            <Link href="/rankings" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View All →
            </Link>
          </div>

          <div className="border border-gray-200">
            {topRankings.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {topRankings.map((team: any) => (
                  <Link
                    key={team.team_id}
                    href={`/teams/${team.team_id}`}
                    className="flex items-center p-3 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-lg font-bold text-gray-900 w-8">{team.current_rank}</span>
                    {team.team_logo && (
                      <img src={team.team_logo} alt={team.team_name} className="w-6 h-6 mx-2" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{team.team_name}</div>
                      <div className="text-xs text-gray-500">{team.record_summary}</div>
                    </div>
                    {team.previous_rank && (
                      <span className={`text-sm font-medium ${
                        team.previous_rank > team.current_rank ? 'text-green-600' :
                        team.previous_rank < team.current_rank ? 'text-red-600' :
                        'text-gray-500'
                      }`}>
                        {team.trend}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">
                No rankings data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/teams" className="border border-gray-200 p-6 hover:bg-gray-50 transition-all">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Browse Teams</h3>
          <p className="text-gray-600 text-sm">View all NCAA teams, stats, and schedules</p>
        </Link>
        <Link href="/players" className="border border-gray-200 p-6 hover:bg-gray-50 transition-all">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Player Stats</h3>
          <p className="text-gray-600 text-sm">Individual player statistics and profiles</p>
        </Link>
        <Link href="/rankings" className="border border-gray-200 p-6 hover:bg-gray-50 transition-all">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Rankings</h3>
          <p className="text-gray-600 text-sm">AP Poll, Coaches Poll, and conference standings</p>
        </Link>
      </div>
    </div>
  );
}
