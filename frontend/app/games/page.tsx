import Link from "next/link";
import DateCarousel from "./DateCarousel";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Game {
  event_id: number;
  date: string;
  home_score: number;
  away_score: number;
  status: string;
  status_detail?: string;
  is_completed: boolean;
  is_conference_game: boolean;
  home_team_name: string;
  home_team_abbr: string;
  home_team_logo: string;
  home_team_record?: string;
  home_team_rank?: number;
  away_team_name: string;
  away_team_abbr: string;
  away_team_logo: string;
  away_team_record?: string;
  away_team_rank?: number;
  venue_name: string;
  spread?: number;
  over_under?: number;
  favorite_abbr?: string;
}

async function getGames(date?: string) {
  try {
    let url = `${API_BASE}/api/games?season=2026&limit=200`;
    if (date) {
      url += `&date_from=${date}&date_to=${date}`;
    }

    const res = await fetch(url, {
      cache: 'no-store'
    });
    if (!res.ok) return { games: [] };
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch games:", error);
    return { games: [] };
  }
}

async function getServerToday() {
  try {
    const res = await fetch(`${API_BASE}/api/today`, {
      cache: 'no-store'
    });
    if (!res.ok) return new Date().toISOString().split('T')[0];
    const data = await res.json();
    return data.date;
  } catch (error) {
    console.error("Failed to fetch server date:", error);
    return new Date().toISOString().split('T')[0];
  }
}

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const selectedDate = params.date;
  const [gamesData, serverToday] = await Promise.all([
    getGames(selectedDate),
    getServerToday()
  ]);
  const games = gamesData.games as Game[];

  // Get the display date
  const displayDate = selectedDate
    ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'All Games';

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">Men's College Basketball Scoreboard</h1>
      </div>

      <DateCarousel selectedDate={selectedDate} serverToday={serverToday} />

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{displayDate}</h2>
      </div>

      {games && games.length > 0 ? (
        <div className="space-y-4">
          {games.map((game) => {
            const awayWon = game.is_completed && (game.away_score || 0) > (game.home_score || 0);
            const homeWon = game.is_completed && (game.home_score || 0) > (game.away_score || 0);
            const isLive = game.status?.toLowerCase().includes("live") || game.status?.toLowerCase().includes("in progress");

            return (
              <div key={game.event_id} className="border border-gray-200">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-semibold text-gray-900 uppercase">
                      {isLive && <span className="text-red-600">LIVE</span>}
                      {game.is_completed && <span>FINAL</span>}
                      {!game.is_completed && !isLive && (
                        <span className="text-gray-500">
                          {game.status_detail || 'SCHEDULED'}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        {game.venue_name}
                      </div>
                      {(game.spread !== null && game.spread !== undefined) && (
                        <div className="text-xs text-gray-600 mt-1">
                          <span className="font-medium">{game.favorite_abbr} {game.spread > 0 ? '+' : ''}{game.spread}</span>
                          {game.over_under && <span className="ml-2">O/U {game.over_under}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Teams */}
                    <div className="flex-1 space-y-3">
                      {/* Away Team */}
                      <div className="flex items-center space-x-3">
                        {game.away_team_logo && (
                          <img src={game.away_team_logo} alt={game.away_team_name} className="w-8 h-8" />
                        )}
                        <div>
                          <div className={`font-medium ${awayWon ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>
                            {game.away_team_rank && game.away_team_rank <= 25 && <span className="font-bold mr-1">#{game.away_team_rank}</span>}
                            {game.away_team_name}
                          </div>
                          {game.away_team_record && (
                            <div className="text-xs text-gray-500">
                              {game.away_team_record}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Home Team */}
                      <div className="flex items-center space-x-3">
                        {game.home_team_logo && (
                          <img src={game.home_team_logo} alt={game.home_team_name} className="w-8 h-8" />
                        )}
                        <div>
                          <div className={`font-medium ${homeWon ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>
                            {game.home_team_rank && game.home_team_rank <= 25 && <span className="font-bold mr-1">#{game.home_team_rank}</span>}
                            {game.home_team_name}
                          </div>
                          {game.home_team_record && (
                            <div className="text-xs text-gray-500">
                              {game.home_team_record}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Scores */}
                    <div className="text-right space-y-3 min-w-[60px]">
                      <div className={`text-2xl font-bold ${awayWon ? 'text-gray-900' : 'text-gray-400'}`}>
                        {game.away_score || 0}
                      </div>
                      <div className={`text-2xl font-bold ${homeWon ? 'text-gray-900' : 'text-gray-400'}`}>
                        {game.home_score || 0}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="ml-6 space-y-2">
                      {game.is_completed || isLive ? (
                        <Link
                          href={`/games/${game.event_id}`}
                          className="block px-4 py-1.5 text-sm text-center text-blue-600 border border-blue-600 rounded hover:bg-blue-50 whitespace-nowrap"
                        >
                          Box Score
                        </Link>
                      ) : (
                        <Link
                          href={`/games/${game.event_id}/preview`}
                          className="block px-4 py-1.5 text-sm text-center text-green-600 border border-green-600 rounded hover:bg-green-50 whitespace-nowrap"
                        >
                          Preview
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border border-gray-200 p-8 text-center text-gray-500">
          <p>No games found for the selected date.</p>
        </div>
      )}
    </div>
  );
}
