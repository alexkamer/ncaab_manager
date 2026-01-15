'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface GameOdds {
  provider_name?: string;
  over_under?: number;
  over_odds?: number;
  under_odds?: number;
  spread?: number;
  away_is_favorite?: boolean;
  away_moneyline?: number;
  away_spread_odds?: number;
  home_is_favorite?: boolean;
  home_moneyline?: number;
  home_spread_odds?: number;
}

interface BettingLinesProps {
  eventId: number;
  awayTeamName: string;
  awayTeamAbbr: string;
  awayTeamId: number;
  homeTeamName: string;
  homeTeamAbbr: string;
  homeTeamId: number;
  isCompleted: boolean;
  awayScore?: number;
  homeScore?: number;
}

export default function BettingLines({
  eventId,
  awayTeamName,
  awayTeamAbbr,
  awayTeamId,
  homeTeamName,
  homeTeamAbbr,
  homeTeamId,
  isCompleted,
  awayScore,
  homeScore
}: BettingLinesProps) {
  const [odds, setOdds] = useState<GameOdds | null>(null);
  const [loading, setLoading] = useState(true);

  // Calculate betting results
  const calculateResults = () => {
    if (!isCompleted || !odds || awayScore === undefined || homeScore === undefined) {
      return { spreadWinner: null, moneylineWinner: null, totalResult: null };
    }

    const totalScore = awayScore + homeScore;
    const awayWon = awayScore > homeScore;
    const scoreDiff = Math.abs(awayScore - homeScore);

    // Spread winner
    let spreadWinner: 'away' | 'home' | 'push' | null = null;
    if (odds.spread) {
      if (odds.away_is_favorite) {
        // Away team is favorite, needs to win by more than spread
        if (awayWon && scoreDiff > odds.spread) {
          spreadWinner = 'away'; // Favorite covered
        } else if (!awayWon || scoreDiff < odds.spread) {
          spreadWinner = 'home'; // Underdog covered
        } else if (scoreDiff === odds.spread) {
          spreadWinner = 'push';
        }
      } else if (odds.home_is_favorite) {
        // Home team is favorite, needs to win by more than spread
        if (!awayWon && scoreDiff > odds.spread) {
          spreadWinner = 'home'; // Favorite covered
        } else if (awayWon || scoreDiff < odds.spread) {
          spreadWinner = 'away'; // Underdog covered
        } else if (scoreDiff === odds.spread) {
          spreadWinner = 'push';
        }
      }
    }

    // Moneyline winner
    const moneylineWinner = awayWon ? 'away' : 'home';

    // Over/Under result
    let totalResult: 'over' | 'under' | 'push' | null = null;
    if (odds.over_under) {
      if (totalScore > odds.over_under) {
        totalResult = 'over';
      } else if (totalScore < odds.over_under) {
        totalResult = 'under';
      } else {
        totalResult = 'push';
      }
    }

    return { spreadWinner, moneylineWinner, totalResult };
  };

  const results = calculateResults();

  useEffect(() => {
    async function fetchOdds() {
      try {
        const response = await fetch(`${API_BASE}/api/games/${eventId}/odds`);
        const data = await response.json();

        if (data.odds) {
          setOdds(data.odds);
        }
      } catch (error) {
        console.error('Error fetching odds:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchOdds();
  }, [eventId]);

  if (loading) {
    return (
      <div className="border border-gray-200">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Betting Lines</h2>
        </div>
        <div className="p-6 text-center text-gray-500">
          Loading betting lines...
        </div>
      </div>
    );
  }

  if (!odds || (!odds.spread && !odds.over_under && !odds.away_moneyline && !odds.home_moneyline)) {
    return null; // Don't show section if no odds available
  }

  return (
    <div className="rounded-lg shadow-sm overflow-hidden border border-gray-200">
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">Betting Lines</h2>
        {odds.provider_name && (
          <p className="text-xs text-gray-600 mt-1">
            {odds.provider_name} • {isCompleted ? 'Closing Lines' : 'Live Lines'}
          </p>
        )}
      </div>
      <div className="overflow-x-auto bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Team</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">Spread</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">Moneyline</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* Away Team Row */}
            <tr className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-5">
                <div className="flex items-center space-x-3">
                  <img src={`https://a.espncdn.com/i/teamlogos/ncaa/500/${awayTeamId}.png`} alt={awayTeamName} className="w-10 h-10" />
                  <div>
                    <div className="font-semibold text-gray-900">{awayTeamName}</div>
                    <div className="text-xs text-gray-500">{awayTeamAbbr}</div>
                  </div>
                </div>
              </td>
              <td className={`px-6 py-5 text-center transition-colors ${results.spreadWinner === 'away' ? 'bg-green-50' : ''}`}>
                {odds.spread !== undefined && odds.spread !== null ? (
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {odds.away_is_favorite ? `-${odds.spread}` : `+${odds.spread}`}
                    </div>
                    {odds.away_spread_odds && (
                      <div className="text-xs text-gray-500 mt-1">
                        {odds.away_spread_odds > 0 ? '+' : ''}{odds.away_spread_odds}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className={`px-6 py-5 text-center transition-colors ${results.moneylineWinner === 'away' ? 'bg-green-50' : ''}`}>
                {odds.away_moneyline ? (
                  <div className="text-2xl font-bold text-gray-900">
                    {odds.away_moneyline > 0 ? '+' : ''}{odds.away_moneyline}
                  </div>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className={`px-6 py-5 text-center transition-colors ${results.totalResult === 'over' ? 'bg-green-50' : ''}`}>
                {odds.over_under ? (
                  <div>
                    <div className="text-xl font-bold text-gray-900">O {odds.over_under}</div>
                    {odds.over_odds && (
                      <div className="text-xs text-gray-500 mt-1">
                        {odds.over_odds > 0 ? '+' : ''}{odds.over_odds}
                      </div>
                    )}
                    {isCompleted && awayScore !== undefined && homeScore !== undefined && results.totalResult === 'over' && (
                      <div className="text-xs text-gray-600 mt-1.5 font-medium">
                        Total: {awayScore + homeScore}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
            </tr>

            {/* Home Team Row */}
            <tr className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-5">
                <div className="flex items-center space-x-3">
                  <img src={`https://a.espncdn.com/i/teamlogos/ncaa/500/${homeTeamId}.png`} alt={homeTeamName} className="w-10 h-10" />
                  <div>
                    <div className="font-semibold text-gray-900">{homeTeamName}</div>
                    <div className="text-xs text-gray-500">{homeTeamAbbr}</div>
                  </div>
                </div>
              </td>
              <td className={`px-6 py-5 text-center transition-colors ${results.spreadWinner === 'home' ? 'bg-green-50' : ''}`}>
                {odds.spread !== undefined && odds.spread !== null ? (
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {odds.home_is_favorite ? `-${odds.spread}` : `+${odds.spread}`}
                    </div>
                    {odds.home_spread_odds && (
                      <div className="text-xs text-gray-500 mt-1">
                        {odds.home_spread_odds > 0 ? '+' : ''}{odds.home_spread_odds}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className={`px-6 py-5 text-center transition-colors ${results.moneylineWinner === 'home' ? 'bg-green-50' : ''}`}>
                {odds.home_moneyline ? (
                  <div className="text-2xl font-bold text-gray-900">
                    {odds.home_moneyline > 0 ? '+' : ''}{odds.home_moneyline}
                  </div>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className={`px-6 py-5 text-center transition-colors ${results.totalResult === 'under' ? 'bg-green-50' : ''}`}>
                {odds.over_under ? (
                  <div>
                    <div className="text-xl font-bold text-gray-900">U {odds.over_under}</div>
                    {odds.under_odds && (
                      <div className="text-xs text-gray-500 mt-1">
                        {odds.under_odds > 0 ? '+' : ''}{odds.under_odds}
                      </div>
                    )}
                    {isCompleted && awayScore !== undefined && homeScore !== undefined && results.totalResult === 'under' && (
                      <div className="text-xs text-gray-600 mt-1.5 font-medium">
                        Total: {awayScore + homeScore}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
