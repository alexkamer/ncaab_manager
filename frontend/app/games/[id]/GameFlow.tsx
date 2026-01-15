'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

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

interface GameFlowProps {
  eventId: number;
  awayTeamName: string;
  awayTeamAbbr: string;
  awayTeamId: number;
  awayTeamColor: string;
  homeTeamName: string;
  homeTeamAbbr: string;
  homeTeamId: number;
  homeTeamColor: string;
  isCompleted: boolean;
  plays?: any[]; // Play-by-play data passed from parent
}

export default function GameFlow({
  eventId,
  awayTeamName,
  awayTeamAbbr,
  awayTeamId,
  awayTeamColor,
  homeTeamName,
  homeTeamAbbr,
  homeTeamId,
  homeTeamColor,
  isCompleted,
  plays = []
}: GameFlowProps) {
  const [hoveredPlay, setHoveredPlay] = useState<Play | null>(null);
  const [mouseX, setMouseX] = useState<number | null>(null);
  const [runsExpanded, setRunsExpanded] = useState(false);

  // Throttle ref to limit mouse move handler execution
  const lastCallTime = useRef<number>(0);
  const THROTTLE_MS = 16; // ~60fps

  // Filter to only scoring plays for all calculations and visualization
  const scoringPlays = plays.filter(p => p.scoringPlay);

  // Helper function to convert game time to seconds elapsed
  const getGameTimeInSeconds = (play: Play): number => {
    const period = play.period || 1;
    const clockDisplay = play.clock || '0:00';

    // Parse MM:SS format
    const parts = clockDisplay.split(':');
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    const clockSeconds = minutes * 60 + seconds;

    // Each half is 20 minutes (1200 seconds)
    const periodLength = 1200;
    // Calculate elapsed time: (period-1) * periodLength + (periodLength - remaining)
    return (period - 1) * periodLength + (periodLength - clockSeconds);
  };

  // Calculate total game time for X-axis scaling
  const totalGameTime = scoringPlays.length > 0 ? getGameTimeInSeconds(scoringPlays[scoringPlays.length - 1]) : 2400;

  // Throttled mouse move handler to reduce expensive calculations
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();

    // Throttle: only execute if enough time has passed
    if (now - lastCallTime.current < THROTTLE_MS) {
      return;
    }
    lastCallTime.current = now;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;

    // Account for the Y-axis label area (40px wide, which is 2.5rem = 10 * 4px)
    const chartStartX = 40; // This matches the "left-10" class which is 2.5rem = 40px
    const chartWidth = rect.width - chartStartX;
    const adjustedX = x - chartStartX;

    // Only calculate if mouse is within the chart area
    if (adjustedX >= 0 && adjustedX <= chartWidth) {
      const percentage = adjustedX / chartWidth;
      const targetTime = percentage * totalGameTime;

      // Find the closest play by game time
      let closestPlay = scoringPlays[0];
      let closestDiff = Math.abs(getGameTimeInSeconds(scoringPlays[0]) - targetTime);

      for (const play of scoringPlays) {
        const playTime = getGameTimeInSeconds(play);
        const diff = Math.abs(playTime - targetTime);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestPlay = play;
        }
      }

      setHoveredPlay(closestPlay);
      setMouseX(x);
    } else {
      setHoveredPlay(null);
      setMouseX(null);
    }
  }, [scoringPlays, totalGameTime]);

  const handleMouseLeave = () => {
    setHoveredPlay(null);
    setMouseX(null);
  };

  // No longer fetching - data comes from parent to eliminate duplicate API calls
  // Early return AFTER all hooks are called
  if (!isCompleted || plays.length === 0) {
    return null;
  }

  if (scoringPlays.length === 0) {
    return null;
  }

  // Calculate max score and add padding to prevent cutoff
  const maxScore = Math.max(
    ...scoringPlays.map(p => Math.max(p.awayScore, p.homeScore)),
    1 // Minimum value to prevent division by zero
  );

  // Add 10% padding to the top so lines don't get cut off
  const yAxisMax = Math.ceil(maxScore * 1.1);

  // Calculate scoring runs using basketball logic:
  // Track which team has the run and end when opponent scores twice
  const runs: Array<{
    team: 'away' | 'home';
    points: number;
    opponentPoints: number;
    startPlay: number;
    endPlay: number;
    differential: number;
  }> = [];

  let currentRunTeam: 'away' | 'home' | null = null;
  let runStart = 0;

  for (let idx = 0; idx < scoringPlays.length; idx++) {
    const currPlay = scoringPlays[idx];
    const prevPlay = idx > 0 ? scoringPlays[idx - 1] : { awayScore: 0, homeScore: 0 };
    const currScorer = currPlay.awayScore > prevPlay.awayScore ? 'away' : 'home';

    // Check if opponent scored 2 consecutive times (ends current run)
    if (idx >= 2 && currentRunTeam) {
      const twoBack = scoringPlays[idx - 1];
      const threeBack = scoringPlays[idx - 2];
      const prevScorer = twoBack.awayScore > threeBack.awayScore ? 'away' : 'home';

      // If current and previous scorer are same AND they're the opponent, run ends
      if (currScorer === prevScorer && currScorer !== currentRunTeam) {
        // Run ended at idx - 2 (before opponent scored twice)
        const endIdx = idx - 2;
        const endPlay = scoringPlays[endIdx];
        const startPlay = runStart > 0 ? scoringPlays[runStart - 1] : { awayScore: 0, homeScore: 0 };

        const awayPoints = endPlay.awayScore - startPlay.awayScore;
        const homePoints = endPlay.homeScore - startPlay.homeScore;
        const diff = Math.abs(awayPoints - homePoints);

        // Check if significant
        if (diff >= 8 || (diff >= 6 && Math.min(awayPoints, homePoints) <= 4)) {
          const team = awayPoints > homePoints ? 'away' : 'home';
          runs.push({
            team,
            points: Math.max(awayPoints, homePoints),
            opponentPoints: Math.min(awayPoints, homePoints),
            startPlay: runStart,
            endPlay: endIdx,
            differential: diff
          });
        }

        // New run starts with current scorer at first of the 2 consecutive scores
        currentRunTeam = currScorer;
        runStart = idx - 1;
      }
    }

    // Initialize run team if not set
    if (!currentRunTeam) {
      currentRunTeam = currScorer;
      runStart = 0;
    }
  }

  // Check if final run is significant
  if (currentRunTeam && scoringPlays.length > 0) {
    const endPlay = scoringPlays[scoringPlays.length - 1];
    const startPlay = runStart > 0 ? scoringPlays[runStart - 1] : { awayScore: 0, homeScore: 0 };

    const awayPoints = endPlay.awayScore - startPlay.awayScore;
    const homePoints = endPlay.homeScore - startPlay.homeScore;
    const diff = Math.abs(awayPoints - homePoints);

    if (diff >= 8 || (diff >= 6 && Math.min(awayPoints, homePoints) <= 4)) {
      const team = awayPoints > homePoints ? 'away' : 'home';
      runs.push({
        team,
        points: Math.max(awayPoints, homePoints),
        opponentPoints: Math.min(awayPoints, homePoints),
        startPlay: runStart,
        endPlay: scoringPlays.length - 1,
        differential: diff
      });
    }
  }

  // Sort runs chronologically
  const topRuns = runs.sort((a, b) => a.startPlay - b.startPlay);

  return (
    <div className="rounded-lg shadow-sm overflow-hidden border border-gray-200">
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">Game Flow</h2>
        <p className="text-xs text-gray-600 mt-1">
          Score progression throughout the game • Hover to see details
        </p>
      </div>
      <div className="p-6 bg-white">
        <div className="space-y-6">
          {/* Score progression chart */}
          <div
            className="relative cursor-crosshair"
            style={{ height: '350px' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-8 w-10 flex flex-col justify-between text-xs text-gray-500 pr-2 text-right pointer-events-none">
              <span className="font-medium">{yAxisMax}</span>
              <span>{Math.floor(yAxisMax * 0.75)}</span>
              <span>{Math.floor(yAxisMax * 0.5)}</span>
              <span>{Math.floor(yAxisMax * 0.25)}</span>
              <span className="font-medium">0</span>
            </div>

            {/* Chart area */}
            <div className="absolute left-10 right-0 top-0 bottom-8 pointer-events-none">
              {/* Grid lines */}
              <div className="absolute inset-0">
                {[0, 25, 50, 75, 100].map((pct) => (
                  <div
                    key={pct}
                    className="absolute w-full border-t border-gray-200"
                    style={{ bottom: `${pct}%` }}
                  />
                ))}
              </div>

              {/* Score differential area fill */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id={`awayGradient-${eventId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={`#${awayTeamColor}`} stopOpacity="0.15" />
                    <stop offset="100%" stopColor={`#${awayTeamColor}`} stopOpacity="0.05" />
                  </linearGradient>
                  <linearGradient id={`homeGradient-${eventId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={`#${homeTeamColor}`} stopOpacity="0.05" />
                    <stop offset="100%" stopColor={`#${homeTeamColor}`} stopOpacity="0.15" />
                  </linearGradient>
                </defs>

                {/* Scoring run highlights - behind the lines */}
                {topRuns.map((run, idx) => {
                  const startTime = run.startPlay > 0 ? getGameTimeInSeconds(scoringPlays[run.startPlay]) : 0;
                  const endTime = getGameTimeInSeconds(scoringPlays[run.endPlay]);
                  const startX = (startTime / totalGameTime) * 100;
                  const endX = (endTime / totalGameTime) * 100;
                  const width = endX - startX;

                  return (
                    <rect
                      key={idx}
                      x={startX}
                      y={0}
                      width={width}
                      height={100}
                      fill={run.team === 'away' ? `url(#awayGradient-${eventId})` : `url(#homeGradient-${eventId})`}
                      opacity="0.6"
                    />
                  );
                })}

                {/* Away team line */}
                <polyline
                  points={[
                    '0,100', // Start at 0,0 score
                    ...scoringPlays.map((play) => {
                      // Map plays based on actual game time
                      const gameTime = getGameTimeInSeconds(play);
                      const x = (gameTime / totalGameTime) * 100;
                      const y = 100 - (play.awayScore / yAxisMax * 100);
                      return `${x},${y}`;
                    })
                  ].join(' ')}
                  fill="none"
                  stroke={`#${awayTeamColor}`}
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />

                {/* Home team line */}
                <polyline
                  points={[
                    '0,100', // Start at 0,0 score
                    ...scoringPlays.map((play) => {
                      // Map plays based on actual game time
                      const gameTime = getGameTimeInSeconds(play);
                      const x = (gameTime / totalGameTime) * 100;
                      const y = 100 - (play.homeScore / yAxisMax * 100);
                      return `${x},${y}`;
                    })
                  ].join(' ')}
                  fill="none"
                  stroke={`#${homeTeamColor}`}
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>

              {/* Hover indicator line and tooltip */}
              {hoveredPlay && mouseX !== null && (
                <>
                  {/* Vertical line - positioned relative to chart area, not container */}
                  <div
                    className="absolute top-0 bottom-0 w-px bg-gray-400 pointer-events-none"
                    style={{ left: `${mouseX - 40}px` }}
                  />

                  {/* Tooltip */}
                  <div
                    className="absolute pointer-events-none z-10"
                    style={{
                      left: `${mouseX - 40}px`,
                      top: '50%',
                      transform: (mouseX - 40) < 300 ? 'translate(0, -50%) translateX(12px)' : 'translate(-100%, -50%) translateX(-12px)'
                    }}
                  >
                    <div className="bg-white border-2 border-gray-300 rounded-lg shadow-lg p-4 w-[280px] max-w-[280px]">
                      {/* Score header */}
                      <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <img
                            src={`https://a.espncdn.com/i/teamlogos/ncaa/500/${awayTeamId}.png`}
                            alt={awayTeamAbbr}
                            className="w-6 h-6"
                          />
                          <span className="font-bold text-gray-900">{awayTeamAbbr}</span>
                        </div>
                        <span className="text-2xl font-bold text-gray-900">{hoveredPlay.awayScore}</span>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={`https://a.espncdn.com/i/teamlogos/ncaa/500/${homeTeamId}.png`}
                            alt={homeTeamAbbr}
                            className="w-6 h-6"
                          />
                          <span className="font-bold text-gray-900">{homeTeamAbbr}</span>
                        </div>
                        <span className="text-2xl font-bold text-gray-900">{hoveredPlay.homeScore}</span>
                      </div>

                      {/* Game time */}
                      <div className="text-xs text-gray-600 font-medium mb-2 pt-2 border-t border-gray-200">
                        {hoveredPlay.clock} • {hoveredPlay.periodDisplay}
                      </div>

                      {/* Win Probability */}
                      {hoveredPlay.homeWinPercentage !== undefined && hoveredPlay.homeWinPercentage !== null && (
                        <div className="mb-2 pt-2 border-t border-gray-200">
                          <div className="text-xs font-semibold text-gray-700 mb-2">Win Probability</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="font-medium">{awayTeamAbbr}</span>
                                <span className="font-bold">{((1 - hoveredPlay.homeWinPercentage) * 100).toFixed(1)}%</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden flex">
                                <div
                                  className="h-full transition-all"
                                  style={{
                                    width: `${(1 - hoveredPlay.homeWinPercentage) * 100}%`,
                                    backgroundColor: `#${awayTeamColor}`
                                  }}
                                />
                                <div
                                  className="h-full transition-all"
                                  style={{
                                    width: `${hoveredPlay.homeWinPercentage * 100}%`,
                                    backgroundColor: `#${homeTeamColor}`
                                  }}
                                />
                              </div>
                              <div className="flex justify-between text-xs mt-1">
                                <span className="font-medium">{homeTeamAbbr}</span>
                                <span className="font-bold">{(hoveredPlay.homeWinPercentage * 100).toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Play description */}
                      <div className="text-sm text-gray-700 bg-gray-50 rounded p-2 break-words">
                        {hoveredPlay.text}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* X-axis labels */}
            <div className="absolute left-10 right-0 bottom-0 h-8 flex justify-between items-center text-xs text-gray-600 font-medium pointer-events-none">
              <span>Start</span>
              {plays.length > 0 && (
                <>
                  <span>Halftime</span>
                  <span>Final</span>
                </>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 pt-2 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5" style={{ backgroundColor: `#${awayTeamColor}` }}></div>
              <span className="text-sm text-gray-700">{awayTeamAbbr}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5" style={{ backgroundColor: `#${homeTeamColor}` }}></div>
              <span className="text-sm text-gray-700">{homeTeamAbbr}</span>
            </div>
          </div>

          {/* Key runs */}
          {topRuns.length > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => setRunsExpanded(!runsExpanded)}
                className="w-full flex items-center justify-between text-left mb-3 hover:bg-gray-50 p-2 rounded transition-colors"
              >
                <h3 className="text-sm font-semibold text-gray-900">
                  Key Scoring Runs ({topRuns.length})
                </h3>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${runsExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {runsExpanded && (
                <div className="space-y-2 overflow-x-auto">
                  {topRuns.map((run, idx) => {
                    const teamName = run.team === 'away' ? awayTeamAbbr : homeTeamAbbr;
                    const startPlay = scoringPlays[run.startPlay];
                    const endPlay = scoringPlays[run.endPlay];

                    const teamColor = run.team === 'away' ? awayTeamColor : homeTeamColor;

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg gap-2"
                        style={{ backgroundColor: `#${teamColor}15` }}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className="w-1.5 h-12 rounded-full flex-shrink-0"
                            style={{ backgroundColor: `#${teamColor}` }}
                          ></div>
                          <div className="flex-1 break-words">
                            <div className="font-semibold text-gray-900">
                              {teamName} {run.points}-{run.opponentPoints} Run
                            </div>
                            <div className="text-xs text-gray-600">
                              {startPlay.periodDisplay} • {startPlay.clock} - {endPlay.clock}
                            </div>
                          </div>
                        </div>
                        <div
                          className="text-2xl font-bold flex-shrink-0 whitespace-nowrap"
                          style={{ color: `#${teamColor}` }}
                        >
                          +{run.differential}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
