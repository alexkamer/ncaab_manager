'use client';

import { hexToRgba } from '../utils/colors';

interface GameHeroProps {
  awayTeam: {
    name: string;
    abbr: string;
    logo: string;
    score: number;
    apRank?: number;
    color?: string;
  };
  homeTeam: {
    name: string;
    abbr: string;
    logo: string;
    score: number;
    apRank?: number;
    color?: string;
  };
  status: string;
  statusDetail?: string;
  venue?: string;
  attendance?: number;
  isCompleted?: boolean;
}

export default function GameHero({
  awayTeam,
  homeTeam,
  status,
  statusDetail,
  venue,
  attendance,
  isCompleted,
}: GameHeroProps) {
  const awayWon = awayTeam.score > homeTeam.score;
  const homeWon = homeTeam.score > awayTeam.score;
  const isTie = awayTeam.score === homeTeam.score;

  // Determine game status badge
  const getStatusBadge = () => {
    if (!isCompleted) {
      return { text: 'Live', color: 'bg-red-500' };
    }

    const margin = Math.abs(awayTeam.score - homeTeam.score);
    if (margin <= 5) {
      return { text: 'Close Game', color: 'bg-amber-500' };
    } else if (margin >= 20) {
      return { text: 'Blowout', color: 'bg-purple-500' };
    }

    return { text: 'Final', color: 'bg-gray-500' };
  };

  const statusBadge = getStatusBadge();

  // Determine if game went to OT
  const isOT = statusDetail?.includes('OT');

  // Function to get team card styling with winner glow
  const getTeamCardStyle = (isWinner: boolean, teamColor?: string) => {
    if (!isCompleted || isTie) return '';

    if (isWinner && teamColor) {
      // Winner gets a subtle glow with team color
      return `ring-2 ring-[${teamColor}] ring-opacity-70 shadow-lg shadow-[${teamColor}]/20`;
    }

    return 'opacity-75';
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Status Bar */}
      <div className="bg-gray-100 px-6 py-3 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <span className={`${statusBadge.color} text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide`}>
            {statusBadge.text}
          </span>
          {isOT && (
            <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 rounded-full">
              Overtime
            </span>
          )}
        </div>
        <div className="text-sm text-gray-600">
          {venue && (
            <>
              {venue}
              {attendance && ` • ${attendance.toLocaleString()} fans`}
            </>
          )}
        </div>
      </div>

      {/* Score Display */}
      <div className="p-8">
        <div className="flex items-center justify-center gap-12">
          {/* Away Team */}
          <div
            className={`flex-1 max-w-sm transition-all rounded-lg p-6 ${getTeamCardStyle(awayWon, awayTeam.color)}`}
            style={{ backgroundColor: hexToRgba(awayTeam.color, 0.1) }}
          >
            <div className="flex items-center justify-end space-x-6">
              <div className="text-right">
                <div className="flex items-center justify-end space-x-2 mb-1">
                  {awayTeam.apRank && awayTeam.apRank <= 25 && (
                    <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                      #{awayTeam.apRank}
                    </span>
                  )}
                  <h2 className={`text-2xl font-bold ${awayWon ? 'text-gray-900' : 'text-gray-500'}`}>
                    {awayTeam.name}
                  </h2>
                </div>
                <p className="text-sm text-gray-500 font-medium">{awayTeam.abbr}</p>
                <div className={`text-6xl font-black mt-3 ${awayWon ? 'text-gray-900' : 'text-gray-400'}`}>
                  {awayTeam.score}
                </div>
                {awayWon && isCompleted && (
                  <div className="mt-2">
                    <span className="inline-flex items-center text-green-600 font-semibold text-sm">
                      <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Winner
                    </span>
                  </div>
                )}
              </div>
              {awayTeam.logo && (
                <img
                  src={awayTeam.logo}
                  alt={awayTeam.name}
                  className={`w-24 h-24 object-contain ${!awayWon && isCompleted ? 'opacity-50' : ''}`}
                />
              )}
            </div>
          </div>

          {/* VS Divider */}
          <div className="text-3xl font-bold text-gray-300">@</div>

          {/* Home Team */}
          <div
            className={`flex-1 max-w-sm transition-all rounded-lg p-6 ${getTeamCardStyle(homeWon, homeTeam.color)}`}
            style={{ backgroundColor: hexToRgba(homeTeam.color, 0.1) }}
          >
            <div className="flex items-center space-x-6">
              {homeTeam.logo && (
                <img
                  src={homeTeam.logo}
                  alt={homeTeam.name}
                  className={`w-24 h-24 object-contain ${!homeWon && isCompleted ? 'opacity-50' : ''}`}
                />
              )}
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  {homeTeam.apRank && homeTeam.apRank <= 25 && (
                    <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                      #{homeTeam.apRank}
                    </span>
                  )}
                  <h2 className={`text-2xl font-bold ${homeWon ? 'text-gray-900' : 'text-gray-500'}`}>
                    {homeTeam.name}
                  </h2>
                </div>
                <p className="text-sm text-gray-500 font-medium">{homeTeam.abbr}</p>
                <div className={`text-6xl font-black mt-3 ${homeWon ? 'text-gray-900' : 'text-gray-400'}`}>
                  {homeTeam.score}
                </div>
                {homeWon && isCompleted && (
                  <div className="mt-2">
                    <span className="inline-flex items-center text-green-600 font-semibold text-sm">
                      <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Winner
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
