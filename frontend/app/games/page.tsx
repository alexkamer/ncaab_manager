"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
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
  home_team_rank?: number;
  home_team_ap_rank?: number;
  home_team_id?: number;
  away_team_name: string;
  away_team_abbr: string;
  away_team_logo: string;
  away_team_record?: string;
  away_team_rank?: number;
  away_team_ap_rank?: number;
  away_team_id?: number;
  venue_name: string;
  spread?: number;
  over_under?: number;
  favorite_abbr?: string;
}

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

  // Filter games
  const filteredGames = useMemo(() => {
    return games.filter(game => {
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

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">Men's College Basketball Scoreboard</h1>
      </div>

      <DateCarousel selectedDate={selectedDate} serverToday={serverToday} />

      {/* Filters */}
      <div className="border border-gray-200 p-4 bg-white">
        <div className="space-y-4">
          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleQuickFilter('reset')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                !conferenceOnly && !rankedOnly && !searchTeam
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Games
            </button>
            <button
              onClick={() => handleQuickFilter('conference')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                conferenceOnly
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Conference Games
            </button>
            <button
              onClick={() => handleQuickFilter('ranked')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                rankedOnly
                  ? 'bg-blue-600 text-white'
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
              className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Showing {filteredGames.length} of {games.length} games
            </span>
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
        <div className="border border-gray-200 p-8 text-center text-gray-500">
          <p>Loading games...</p>
        </div>
      )}

      {/* Games List */}
      {!loading && filteredGames && filteredGames.length > 0 ? (
        <div className="space-y-4">
          {filteredGames.map((game) => {
            const awayWon = game.is_completed && (game.away_score || 0) > (game.home_score || 0);
            const homeWon = game.is_completed && (game.home_score || 0) > (game.away_score || 0);
            const hasStarted = !game.is_completed && ((game.away_score || 0) > 0 || (game.home_score || 0) > 0);
            const showScores = game.is_completed || hasStarted;

            return (
              <div key={game.event_id} className="border border-gray-200">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-semibold text-gray-900 uppercase">
                        {hasStarted && <span className="text-red-600">LIVE</span>}
                        {game.is_completed && <span>FINAL</span>}
                        {!game.is_completed && !hasStarted && (
                          <span className="text-gray-500">
                            {game.status_detail || 'SCHEDULED'}
                          </span>
                        )}
                        {game.is_conference_game && (
                          <span className="ml-2 text-xs text-blue-600 font-medium">CONF</span>
                        )}
                      </div>
                      {/* Prominent Spread Badge */}
                      {(game.spread !== null && game.spread !== undefined) && !game.is_completed && (
                        <div className="px-2 py-1 bg-green-100 border border-green-300 rounded text-xs font-bold text-green-800">
                          {game.favorite_abbr} {game.spread > 0 ? '+' : ''}{game.spread}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        {game.venue_name}
                      </div>
                      {/* Enhanced O/U Display */}
                      {game.over_under && !game.is_completed && (
                        <div className="text-sm font-semibold text-gray-700 mt-1">
                          O/U {game.over_under}
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
                            {game.away_team_ap_rank && game.away_team_ap_rank <= 25 && <span className="font-bold mr-1">#{game.away_team_ap_rank}</span>}
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
                            {game.home_team_ap_rank && game.home_team_ap_rank <= 25 && <span className="font-bold mr-1">#{game.home_team_ap_rank}</span>}
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
                      {showScores ? (
                        <>
                          <div className={`text-2xl font-bold ${awayWon ? 'text-gray-900' : 'text-gray-400'}`}>
                            {game.away_score || 0}
                          </div>
                          <div className={`text-2xl font-bold ${homeWon ? 'text-gray-900' : 'text-gray-400'}`}>
                            {game.home_score || 0}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-2xl">&nbsp;</div>
                          <div className="text-2xl">&nbsp;</div>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="ml-6 space-y-2">
                      {showScores ? (
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
      ) : !loading && filteredGames.length === 0 ? (
        <div className="border border-gray-200 p-8 text-center text-gray-500">
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
