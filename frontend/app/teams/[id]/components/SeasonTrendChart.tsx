'use client';

import { useMemo } from 'react';

interface SeasonTrendChartProps {
  completedGames: any[];
  teamColor?: string;
}

export default function SeasonTrendChart({ completedGames, teamColor }: SeasonTrendChartProps) {
  // Get last 10 games for the trend chart
  const recentGames = useMemo(() => {
    return completedGames.slice(0, 10).reverse(); // Reverse to show oldest first (left to right)
  }, [completedGames]);

  if (recentGames.length === 0) {
    return null;
  }

  // Calculate stats for each game
  const gameStats = useMemo(() => {
    return recentGames.map(game => {
      const isHome = game.location === 'home';
      const teamScore = isHome ? game.home_score : game.away_score;
      const oppScore = isHome ? game.away_score : game.home_score;
      const won = teamScore > oppScore;
      const margin = teamScore - oppScore;

      return {
        opponent: game.opponent_name,
        won,
        margin,
        teamScore,
        oppScore,
        isHome,
        date: new Date(game.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      };
    });
  }, [recentGames]);

  // Calculate current streak
  const currentStreak = useMemo(() => {
    let streak = 0;
    let streakType = gameStats[gameStats.length - 1]?.won ? 'W' : 'L';

    for (let i = gameStats.length - 1; i >= 0; i--) {
      if ((streakType === 'W' && gameStats[i].won) || (streakType === 'L' && !gameStats[i].won)) {
        streak++;
      } else {
        break;
      }
    }

    return { count: streak, type: streakType };
  }, [gameStats]);

  // Calculate win percentage for this stretch
  const wins = gameStats.filter(g => g.won).length;
  const winPct = ((wins / gameStats.length) * 100).toFixed(0);

  return (
    <div className="border border-gray-200 p-6 bg-white rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Recent Form</h2>
          <p className="text-sm text-gray-600">Last {gameStats.length} games</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            {wins}-{gameStats.length - wins}
          </div>
          <div className="text-sm text-gray-600">{winPct}% Win Rate</div>
        </div>
      </div>

      {/* Visual Game Results */}
      <div className="flex items-end justify-between gap-2 mb-4 h-32">
        {gameStats.map((game, idx) => {
          const barHeight = Math.min(Math.abs(game.margin) * 3, 100); // Scale margin to height
          const isWin = game.won;

          return (
            <div key={idx} className="flex-1 flex flex-col items-center justify-end group relative">
              {/* Bar */}
              <div
                className={`w-full rounded-t transition-all duration-200 ${
                  isWin ? 'bg-green-500 group-hover:bg-green-600' : 'bg-red-500 group-hover:bg-red-600'
                }`}
                style={{ height: `${Math.max(barHeight, 20)}%` }}
              />

              {/* Tooltip on hover */}
              <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap z-10">
                <div className="font-bold">{isWin ? 'W' : 'L'} {game.teamScore}-{game.oppScore}</div>
                <div className="text-gray-300">{game.isHome ? 'vs' : '@'} {game.opponent}</div>
                <div className="text-gray-400">{game.date}</div>
                <div className="text-gray-300">
                  Margin: {game.margin > 0 ? '+' : ''}{game.margin}
                </div>
                {/* Arrow pointing down */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Date Labels */}
      <div className="flex justify-between text-xs text-gray-500 mb-4">
        <span>{gameStats[0]?.date}</span>
        <span>{gameStats[gameStats.length - 1]?.date}</span>
      </div>

      {/* Current Streak Badge */}
      {currentStreak.count > 0 && (
        <div className="flex items-center justify-center">
          <div className={`inline-flex items-center px-4 py-2 rounded-full font-semibold ${
            currentStreak.type === 'W'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          } ${currentStreak.count >= 3 ? 'animate-pulse' : ''}`}>
            <span className="text-lg">
              {currentStreak.type}{currentStreak.count}
            </span>
            <span className="ml-2 text-sm">
              Current Streak
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
