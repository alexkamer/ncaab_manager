'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Play {
  id: string;
  text: string;
  shortText: string;
  awayScore: number;
  homeScore: number;
  period: number;
  periodDisplay: string;
  clock: string;
  clockValue: number;
  scoreValue: number;
  scoringPlay: boolean;
  team: string | null;
  homeWinPercentage?: number;
}

interface PlayByPlayProps {
  eventId: number;
  awayTeamName: string;
  awayTeamAbbr: string;
  awayTeamId: number;
  awayTeamColor: string;
  homeTeamName: string;
  homeTeamAbbr: string;
  homeTeamId: number;
  homeTeamColor: string;
  onPlayClick?: (playId: string) => void;
}

export default function PlayByPlay({
  eventId,
  awayTeamName,
  awayTeamAbbr,
  awayTeamId,
  awayTeamColor,
  homeTeamName,
  homeTeamAbbr,
  homeTeamId,
  homeTeamColor,
  onPlayClick
}: PlayByPlayProps) {
  const [plays, setPlays] = useState<Play[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<number | 'all'>('all');
  const [showScoringOnly, setShowScoringOnly] = useState(false);

  // Fetch play-by-play data
  useEffect(() => {
    async function fetchPlays() {
      try {
        const response = await fetch(`${API_BASE}/api/games/${eventId}/playbyplay`);
        const data = await response.json();
        if (data.plays) {
          setPlays(data.plays);
        }
      } catch (error) {
        console.error('Error fetching plays:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchPlays();
  }, [eventId]);

  // Get unique periods
  const periods = Array.from(new Set(plays.map(p => p.period))).sort();

  // Filter plays based on selected period and scoring filter
  const filteredPlays = plays.filter(play => {
    if (selectedPeriod !== 'all' && play.period !== selectedPeriod) {
      return false;
    }
    if (showScoringOnly && !play.scoringPlay) {
      return false;
    }
    return true;
  });

  // Group plays by period for display
  const playsByPeriod: Record<number, Play[]> = {};
  filteredPlays.forEach(play => {
    if (!playsByPeriod[play.period]) {
      playsByPeriod[play.period] = [];
    }
    playsByPeriod[play.period].push(play);
  });

  return (
    <div className="rounded-lg shadow-sm overflow-hidden border border-gray-200">
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-gray-200">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-left"
        >
          <div>
            <h2 className="text-xl font-bold text-gray-900">Play-by-Play</h2>
            <p className="text-xs text-gray-600 mt-1">
              {filteredPlays.length} plays {showScoringOnly && '(scoring only)'}
            </p>
          </div>
          <svg
            className={`w-6 h-6 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="bg-white">
          {/* Filters */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Period:</span>
                <button
                  onClick={() => setSelectedPeriod('all')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    selectedPeriod === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  All
                </button>
                {periods.map(period => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      selectedPeriod === period
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {plays.find(p => p.period === period)?.periodDisplay || `Period ${period}`}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showScoringOnly}
                    onChange={(e) => setShowScoringOnly(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Scoring plays only</span>
                </label>
              </div>
            </div>
          </div>

          {/* Plays list */}
          <div className="max-h-[600px] overflow-y-auto">
            {Object.entries(playsByPeriod).map(([period, periodPlays]) => (
              <div key={period}>
                {selectedPeriod === 'all' && (
                  <div className="sticky top-0 bg-gray-100 px-6 py-2 border-b border-gray-200 z-10">
                    <h3 className="font-bold text-gray-900">
                      {periodPlays[0].periodDisplay}
                    </h3>
                  </div>
                )}

                {periodPlays.map((play, idx) => {
                  const isAwayTeam = play.team === String(awayTeamId);
                  const isHomeTeam = play.team === String(homeTeamId);
                  const teamColor = isAwayTeam ? awayTeamColor : isHomeTeam ? homeTeamColor : null;

                  return (
                    <div
                      key={play.id}
                      onClick={() => onPlayClick?.(play.id)}
                      className={`px-6 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        onPlayClick ? 'cursor-pointer' : ''
                      } ${play.scoringPlay ? 'bg-blue-50/30' : ''}`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Time */}
                        <div className="flex-shrink-0 w-16 text-sm font-medium text-gray-600">
                          {play.clock}
                        </div>

                        {/* Team Logo */}
                        <div className="flex-shrink-0 w-8 h-8">
                          {isAwayTeam && (
                            <img
                              src={`https://a.espncdn.com/i/teamlogos/ncaa/500/${awayTeamId}.png`}
                              alt={awayTeamAbbr}
                              className="w-8 h-8"
                            />
                          )}
                          {isHomeTeam && (
                            <img
                              src={`https://a.espncdn.com/i/teamlogos/ncaa/500/${homeTeamId}.png`}
                              alt={homeTeamAbbr}
                              className="w-8 h-8"
                            />
                          )}
                          {!isAwayTeam && !isHomeTeam && (
                            <div className="w-8 h-8" />
                          )}
                        </div>

                        {/* Play description */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-900 break-words">
                            {play.text}
                          </div>
                          {play.scoringPlay && (
                            <div className="mt-1 text-xs font-medium text-blue-600">
                              +{play.scoreValue} points
                            </div>
                          )}
                        </div>

                        {/* Score */}
                        <div className="flex-shrink-0 text-right">
                          <div className="text-sm font-bold text-gray-900">
                            {play.awayScore}-{play.homeScore}
                          </div>
                          {play.homeWinPercentage !== undefined && play.homeWinPercentage !== null && (
                            <div className="text-xs text-gray-500 mt-1">
                              {awayTeamAbbr} {((1 - play.homeWinPercentage) * 100).toFixed(0)}%
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {filteredPlays.length === 0 && (
              <div className="px-6 py-12 text-center text-gray-500">
                No plays match the selected filters.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
