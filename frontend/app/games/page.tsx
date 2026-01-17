"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, memo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  home_team_conf_record?: string;
  home_team_rank?: number;
  home_team_ap_rank?: number;
  home_team_id?: number;
  away_team_name: string;
  away_team_abbr: string;
  away_team_logo: string;
  away_team_record?: string;
  away_team_conf_record?: string;
  away_team_rank?: number;
  away_team_ap_rank?: number;
  away_team_id?: number;
  venue_name: string;
  spread?: number;
  over_under?: number;
  favorite_abbr?: string;
  home_win_probability?: number;
  away_win_probability?: number;
  home_predicted_margin?: number;
  away_predicted_margin?: number;
}

type GameStatus = 'live' | 'completed' | 'upcoming';

function getGameStatus(game: Game): GameStatus {
  if (!game.is_completed && ((game.away_score || 0) > 0 || (game.home_score || 0) > 0)) {
    return 'live';
  }
  if (game.is_completed) {
    return 'completed';
  }
  return 'upcoming';
}

// Memoize GameCard to prevent unnecessary re-renders in game lists
const GameCard = memo(function GameCard({ game, expanded, onToggle }: { game: Game; expanded: boolean; onToggle: () => void }) {
  const awayWon = game.is_completed && (game.away_score || 0) > (game.home_score || 0);
  const homeWon = game.is_completed && (game.home_score || 0) > (game.away_score || 0);
  const status = getGameStatus(game);
  const showScores = status !== 'upcoming';
  const scoreDiff = Math.abs((game.away_score || 0) - (game.home_score || 0));

  return (
    <div className="border border-gray-200 hover:border-gray-300 transition-all bg-white">
      <div className="p-4">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Badge */}
            {status === 'live' && (
              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold uppercase rounded border border-red-300 animate-pulse">
                Live
              </span>
            )}
            {status === 'completed' && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-bold uppercase rounded">
                Final
              </span>
            )}
            {status === 'upcoming' && game.status_detail && (
              <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded">
                {game.status_detail}
              </span>
            )}

            {/* Score Differential (for completed games) */}
            {status === 'completed' && scoreDiff > 0 && (
              <span className="px-2 py-1 bg-gray-50 text-gray-600 text-xs font-medium rounded">
                {scoreDiff > 20 ? 'Blowout' : scoreDiff > 10 ? 'Comfortable' : 'Close'} ({scoreDiff})
              </span>
            )}
          </div>

          <div className="text-right space-y-1">
            <div className="text-xs text-gray-500 truncate max-w-[200px]">
              {game.venue_name}
            </div>

            {/* Betting Info */}
            {status === 'upcoming' && (game.spread !== null && game.spread !== undefined || game.over_under || game.is_conference_game || game.home_win_probability) && (
              <div className="flex items-center justify-end gap-2 text-xs">
                {game.is_conference_game && (
                  <span className="text-blue-600 font-medium">CONF</span>
                )}
                {game.spread !== null && game.spread !== undefined && game.favorite_abbr && (
                  <span className="text-gray-700 font-semibold">
                    {game.favorite_abbr} -{Math.abs(game.spread)}
                  </span>
                )}
                {game.over_under && (
                  <span className="text-gray-600">
                    O/U {game.over_under}
                  </span>
                )}
                {game.home_win_probability !== null && game.home_win_probability !== undefined &&
                 game.away_win_probability !== null && game.away_win_probability !== undefined && (
                  <span className="text-purple-600 font-medium">
                    ESPN: {game.home_win_probability > game.away_win_probability
                      ? `${game.home_team_abbr} ${Math.round(game.home_win_probability)}%${
                          game.home_predicted_margin !== null && game.home_predicted_margin !== undefined
                            ? ` (${game.home_predicted_margin > 0 ? '+' : ''}${game.home_predicted_margin.toFixed(1)})`
                            : ''
                        }`
                      : `${game.away_team_abbr} ${Math.round(game.away_win_probability)}%${
                          game.away_predicted_margin !== null && game.away_predicted_margin !== undefined
                            ? ` (${game.away_predicted_margin > 0 ? '+' : ''}${game.away_predicted_margin.toFixed(1)})`
                            : ''
                        }`
                    }
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Teams and Scores */}
        <div className="flex items-center justify-between">
          {/* Teams */}
          <div className="flex-1 space-y-2.5">
            {/* Away Team */}
            <div className="flex items-center space-x-3">
              {game.away_team_logo && (
                <img
                  src={game.away_team_logo}
                  alt={game.away_team_name}
                  className="w-10 h-10 flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className={`font-medium truncate ${awayWon ? 'text-gray-900 font-bold' : 'text-gray-700'}`}>
                  {game.away_team_ap_rank && game.away_team_ap_rank <= 25 && (
                    <span className="inline-block w-6 text-center font-bold mr-1">#{game.away_team_ap_rank}</span>
                  )}
                  {game.away_team_name}
                </div>
                {game.away_team_record && (
                  <div className="text-xs text-gray-500">
                    {game.away_team_record}
                    {!!game.is_conference_game && game.away_team_conf_record && (
                      <span className="ml-1">({game.away_team_conf_record})</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Home Team */}
            <div className="flex items-center space-x-3">
              {game.home_team_logo && (
                <img
                  src={game.home_team_logo}
                  alt={game.home_team_name}
                  className="w-10 h-10 flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className={`font-medium truncate ${homeWon ? 'text-gray-900 font-bold' : 'text-gray-700'}`}>
                  {game.home_team_ap_rank && game.home_team_ap_rank <= 25 && (
                    <span className="inline-block w-6 text-center font-bold mr-1">#{game.home_team_ap_rank}</span>
                  )}
                  {game.home_team_name}
                </div>
                {game.home_team_record && (
                  <div className="text-xs text-gray-500">
                    {game.home_team_record}
                    {!!game.is_conference_game && game.home_team_conf_record && (
                      <span className="ml-1">({game.home_team_conf_record})</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Scores */}
          <div className="text-right space-y-2.5 min-w-[70px] ml-4">
            {showScores ? (
              <>
                <div className={`text-3xl font-bold tabular-nums ${awayWon ? 'text-gray-900' : 'text-gray-400'}`}>
                  {game.away_score || 0}
                </div>
                <div className={`text-3xl font-bold tabular-nums ${homeWon ? 'text-gray-900' : 'text-gray-400'}`}>
                  {game.home_score || 0}
                </div>
              </>
            ) : (
              <>
                <div className="h-[36px]"></div>
                <div className="h-[36px]"></div>
              </>
            )}
          </div>

          {/* Action Button */}
          <div className="ml-4 flex flex-col gap-2">
            {showScores ? (
              <Link
                href={`/games/${game.event_id}`}
                className="px-4 py-2 text-sm font-medium text-center text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                Box Score
              </Link>
            ) : (
              <Link
                href={`/games/${game.event_id}/preview`}
                className="px-4 py-2 text-sm font-medium text-center text-white bg-green-600 rounded hover:bg-green-700 transition-colors whitespace-nowrap"
              >
                Preview
              </Link>
            )}
            {showScores && (
              <button
                onClick={onToggle}
                className="px-4 py-1 text-xs font-medium text-center text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                {expanded ? 'Less' : 'More'}
              </button>
            )}
          </div>
        </div>

        {/* Expanded Quick Stats */}
        {expanded && showScores && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-700 mb-1">Game Info</div>
                <div className="text-xs text-gray-600 space-y-0.5">
                  <div>Status: {game.status}</div>
                  {game.status_detail && <div>{game.status_detail}</div>}
                  {status === 'completed' && scoreDiff > 0 && (
                    <div className="font-medium text-gray-700 mt-1">
                      Margin of Victory: {scoreDiff} points
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-700 mb-1">Betting</div>
                <div className="text-xs text-gray-600 space-y-0.5">
                  {game.spread !== null && game.spread !== undefined && game.favorite_abbr && (
                    <div>Spread: {game.favorite_abbr} -{Math.abs(game.spread)}</div>
                  )}
                  {game.over_under && (
                    <div>Over/Under: {game.over_under}</div>
                  )}
                  {status === 'completed' && game.over_under && (
                    <div className="font-medium text-gray-700 mt-1">
                      Total: {(game.away_score || 0) + (game.home_score || 0)}
                      ({(game.away_score || 0) + (game.home_score || 0) > game.over_under ? 'Over' : 'Under'})
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default function GamesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedDate = searchParams?.get('date') || undefined;

  const [games, setGames] = useState<Game[]>([]);
  const [serverToday, setServerToday] = useState('');
  const [loading, setLoading] = useState(true);
  const [conferenceOnly, setConferenceOnly] = useState(false);
  const [rankedOnly, setRankedOnly] = useState(false);
  const [searchTeam, setSearchTeam] = useState('');
  const [expandedGames, setExpandedGames] = useState<Set<number>>(new Set());

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [gamesRes, todayRes] = await Promise.all([
          fetch(`${API_BASE}/api/games?season=2026&limit=200${selectedDate ? `&date_from=${selectedDate}&date_to=${selectedDate}` : ''}`, { cache: 'no-store' }),
          fetch(`${API_BASE}/api/today`, { cache: 'no-store' })
        ]);

        let todayDate = '';
        if (todayRes.ok) {
          const todayData = await todayRes.json();
          todayDate = todayData.date;
          setServerToday(todayDate);
        } else {
          todayDate = new Date().toISOString().split('T')[0];
          setServerToday(todayDate);
        }

        // If no date parameter, redirect to today
        if (!selectedDate && todayDate) {
          router.replace(`/games?date=${todayDate}`);
          return;
        }

        if (gamesRes.ok) {
          const gamesData = await gamesRes.json();
          setGames(gamesData.games || []);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        const fallbackDate = new Date().toISOString().split('T')[0];
        setServerToday(fallbackDate);
        if (!selectedDate) {
          router.replace(`/games?date=${fallbackDate}`);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedDate, router]);

  // Filter and group games
  const { filteredGames, groupedGames } = useMemo(() => {
    const filtered = games.filter(game => {
      // Conference games only filter
      if (conferenceOnly && !game.is_conference_game) {
        return false;
      }

      // Ranked matchups only filter (both teams ranked in top 25)
      if (rankedOnly) {
        const awayRanked = game.away_team_ap_rank && game.away_team_ap_rank <= 25;
        const homeRanked = game.home_team_ap_rank && game.home_team_ap_rank <= 25;
        if (!awayRanked || !homeRanked) {
          return false;
        }
      }

      // Team search filter
      if (searchTeam) {
        const search = searchTeam.toLowerCase();
        const matchesAway = game.away_team_name?.toLowerCase().includes(search);
        const matchesHome = game.home_team_name?.toLowerCase().includes(search);
        if (!matchesAway && !matchesHome) {
          return false;
        }
      }

      return true;
    });

    // Group by status
    const grouped = {
      live: [] as Game[],
      completed: [] as Game[],
      upcoming: [] as Game[]
    };

    filtered.forEach(game => {
      const status = getGameStatus(game);
      grouped[status].push(game);
    });

    // Sort upcoming games by time
    grouped.upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { filteredGames: filtered, groupedGames: grouped };
  }, [games, conferenceOnly, rankedOnly, searchTeam]);

  // Get the display date
  const displayDate = selectedDate
    ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'All Games';

  // Quick filter handlers
  const handleQuickFilter = (type: 'conference' | 'ranked' | 'reset') => {
    if (type === 'conference') {
      setConferenceOnly(true);
      setRankedOnly(false);
      setSearchTeam('');
    } else if (type === 'ranked') {
      setConferenceOnly(false);
      setRankedOnly(true);
      setSearchTeam('');
    } else {
      setConferenceOnly(false);
      setRankedOnly(false);
      setSearchTeam('');
    }
  };

  const toggleExpanded = (eventId: number) => {
    setExpandedGames(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const totalGames = groupedGames.live.length + groupedGames.completed.length + groupedGames.upcoming.length;

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">Men's College Basketball Scoreboard</h1>
      </div>

      <DateCarousel selectedDate={selectedDate} serverToday={serverToday} />

      {/* Filters */}
      <div className="border border-gray-200 p-4 bg-white rounded-lg shadow-sm">
        <div className="space-y-4">
          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleQuickFilter('reset')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                !conferenceOnly && !rankedOnly && !searchTeam
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Games
            </button>
            <button
              onClick={() => handleQuickFilter('conference')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                conferenceOnly
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Conference Games
            </button>
            <button
              onClick={() => handleQuickFilter('ranked')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                rankedOnly
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Top 25 Matchups
            </button>
          </div>

          {/* Search Team Filter */}
          <div>
            <label htmlFor="team-search" className="block text-sm font-medium text-gray-700 mb-1">
              Search by Team
            </label>
            <input
              id="team-search"
              type="text"
              value={searchTeam}
              onChange={(e) => setSearchTeam(e.target.value)}
              placeholder="Search for a team..."
              className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 space-x-4">
              <span className="font-medium">Showing {totalGames} of {games.length} games</span>
              {groupedGames.live.length > 0 && (
                <span className="text-red-600 font-semibold">• {groupedGames.live.length} Live</span>
              )}
            </div>
            {(conferenceOnly || rankedOnly || searchTeam) && (
              <button
                onClick={() => handleQuickFilter('reset')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{displayDate}</h2>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="border border-gray-200 p-8 text-center text-gray-500 rounded-lg">
          <p>Loading games...</p>
        </div>
      )}

      {/* Games List - Grouped by Status */}
      {!loading && totalGames > 0 ? (
        <div className="space-y-6">
          {/* Live Games */}
          {groupedGames.live.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                Live Now ({groupedGames.live.length})
              </h3>
              <div className="space-y-3">
                {groupedGames.live.map((game) => (
                  <GameCard
                    key={game.event_id}
                    game={game}
                    expanded={expandedGames.has(game.event_id)}
                    onToggle={() => toggleExpanded(game.event_id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Games */}
          {groupedGames.completed.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Final ({groupedGames.completed.length})
              </h3>
              <div className="space-y-3">
                {groupedGames.completed.map((game) => (
                  <GameCard
                    key={game.event_id}
                    game={game}
                    expanded={expandedGames.has(game.event_id)}
                    onToggle={() => toggleExpanded(game.event_id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Games */}
          {groupedGames.upcoming.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Upcoming ({groupedGames.upcoming.length})
              </h3>
              <div className="space-y-3">
                {groupedGames.upcoming.map((game) => (
                  <GameCard
                    key={game.event_id}
                    game={game}
                    expanded={expandedGames.has(game.event_id)}
                    onToggle={() => toggleExpanded(game.event_id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : !loading && totalGames === 0 ? (
        <div className="border border-gray-200 p-8 text-center text-gray-500 rounded-lg">
          <p>No games found matching your filters for the selected date.</p>
          {(conferenceOnly || rankedOnly || searchTeam) && (
            <button
              onClick={() => handleQuickFilter('reset')}
              className="mt-2 text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
