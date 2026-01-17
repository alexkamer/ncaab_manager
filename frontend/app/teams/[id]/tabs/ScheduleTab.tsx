'use client';

import Link from "next/link";
import { useMemo, useState } from "react";

interface ScheduleTabProps {
  completedGames: any[];
  upcomingGames: any[];
  teamId: number;
}

export default function ScheduleTab({
  completedGames,
  upcomingGames,
  teamId,
}: ScheduleTabProps) {
  const [homeAwayFilter, setHomeAwayFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [conferenceFilter, setConferenceFilter] = useState('all');

  // Filter completed games
  const filteredCompleted = useMemo(() => {
    return completedGames.filter(game => {
      // Home/Away filter
      if (homeAwayFilter === 'home' && game.location !== 'home') return false;
      if (homeAwayFilter === 'away' && game.location !== 'away') return false;

      // Result filter
      if (resultFilter !== 'all') {
        const isHome = game.location === 'home';
        const teamScore = isHome ? game.home_score : game.away_score;
        const oppScore = isHome ? game.away_score : game.home_score;
        const won = teamScore > oppScore;
        if (resultFilter === 'wins' && !won) return false;
        if (resultFilter === 'losses' && won) return false;
      }

      // Conference filter
      if (conferenceFilter === 'conference' && !game.is_conference_game) return false;
      if (conferenceFilter === 'non-conference' && game.is_conference_game) return false;

      return true;
    });
  }, [completedGames, homeAwayFilter, resultFilter, conferenceFilter]);

  // Calculate summary stats
  const wins = filteredCompleted.filter(g => {
    const isHome = g.location === 'home';
    const teamScore = isHome ? g.home_score : g.away_score;
    const oppScore = isHome ? g.away_score : g.home_score;
    return teamScore > oppScore;
  }).length;

  const losses = filteredCompleted.length - wins;
  const winPct = filteredCompleted.length > 0 ? ((wins / filteredCompleted.length) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      {/* Filter Panel */}
      <div className="border border-gray-200 p-4 bg-white rounded-lg shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Filters</h3>
        <div className="flex flex-wrap gap-4">
          {/* Home/Away Filter */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Location</label>
            <select
              value={homeAwayFilter}
              onChange={(e) => setHomeAwayFilter(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm"
            >
              <option value="all">All Games</option>
              <option value="home">Home</option>
              <option value="away">Away</option>
            </select>
          </div>

          {/* Result Filter */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Result</label>
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm"
            >
              <option value="all">All Results</option>
              <option value="wins">Wins Only</option>
              <option value="losses">Losses Only</option>
            </select>
          </div>

          {/* Conference Filter */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Conference</label>
            <select
              value={conferenceFilter}
              onChange={(e) => setConferenceFilter(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm"
            >
              <option value="all">All Games</option>
              <option value="conference">Conference</option>
              <option value="non-conference">Non-Conference</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-gray-200 p-4 bg-white rounded-lg text-center">
          <div className="text-3xl font-bold text-gray-900">{wins}-{losses}</div>
          <div className="text-sm text-gray-600 mt-1">Filtered Record</div>
        </div>
        <div className="border border-gray-200 p-4 bg-white rounded-lg text-center">
          <div className="text-3xl font-bold text-blue-600">{winPct}%</div>
          <div className="text-sm text-gray-600 mt-1">Win Percentage</div>
        </div>
        <div className="border border-gray-200 p-4 bg-white rounded-lg text-center">
          <div className="text-3xl font-bold text-gray-900">{filteredCompleted.length}</div>
          <div className="text-sm text-gray-600 mt-1">Games Shown</div>
        </div>
      </div>

      {/* Recent Form */}
      {filteredCompleted.length > 0 && (
        <div className="border border-gray-200 bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Completed Games</h2>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              {filteredCompleted.map((game: any) => {
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
        <div className="border border-gray-200 bg-white rounded-lg shadow-sm">
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
                        {Math.round(winProb)}% win
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
