"use client";

import { memo } from "react";
import { EnhancedPlay } from "../types/playTypes";

interface PlayCardProps {
  play: EnhancedPlay;
  isLeadChange: boolean;
  isTied: boolean;
  isMomentumPlay: boolean;
  homeTeamColor: string;
  awayTeamColor: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamLogo: string;
  awayTeamLogo: string;
  homeTeamAbbr: string;
  awayTeamAbbr: string;
  onClick?: () => void;
}

function PlayCard({
  play,
  isLeadChange,
  isTied,
  isMomentumPlay,
  homeTeamColor,
  awayTeamColor,
  homeTeamId,
  awayTeamId,
  homeTeamLogo,
  awayTeamLogo,
  homeTeamAbbr,
  awayTeamAbbr,
  onClick
}: PlayCardProps) {
  const isHomeTeam = play.team === homeTeamId;
  const teamColor = isHomeTeam ? homeTeamColor : awayTeamColor;
  const teamLogo = isHomeTeam ? homeTeamLogo : awayTeamLogo;
  const teamAbbr = isHomeTeam ? homeTeamAbbr : awayTeamAbbr;

  // Determine score differential
  const scoreDiff = play.homeScore - play.awayScore;
  const leader = scoreDiff > 0 ? homeTeamAbbr : scoreDiff < 0 ? awayTeamAbbr : null;
  const diffText = scoreDiff === 0 ? "Tied" : `${leader} by ${Math.abs(scoreDiff)}`;

  // Get shot type label
  const getShotLabel = () => {
    if (play.scoreValue === 3) return "3PT";
    if (play.scoreValue === 2) return "2PT";
    if (play.scoreValue === 1) return "FT";
    return "";
  };

  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-3 px-4 py-3 border-b border-gray-200
        hover:bg-gray-50 cursor-pointer transition-colors
        ${play.scoringPlay && play.scoreValue > 0 ? "bg-yellow-50" : "bg-white"}
      `}
      style={{
        borderLeftWidth: "4px",
        borderLeftColor: teamColor || "#6b7280"
      }}
    >
      {/* Time & Period */}
      <div className="flex-shrink-0 w-20 text-right">
        <div className="font-bold text-sm" style={{ color: teamColor }}>
          {play.clock}
        </div>
        <div className="text-xs text-gray-500">{play.periodDisplay}</div>
      </div>

      {/* Team Logo */}
      {teamLogo && (
        <img
          src={teamLogo}
          alt={teamAbbr}
          className="w-8 h-8 rounded-full flex-shrink-0"
          style={{ border: `2px solid ${teamColor}` }}
        />
      )}

      {/* Play Description */}
      <div className="flex-1 min-w-0">
        {play.playerName && (
          <div className="font-semibold text-gray-900 text-sm">
            {play.playerShortName || play.playerName}
          </div>
        )}
        <div className="text-sm text-gray-700">
          {play.text}
        </div>
        {play.assistPlayerName && (
          <div className="text-xs text-gray-500 italic mt-0.5">
            Assist: {play.assistPlayerName}
          </div>
        )}
      </div>

      {/* Indicators & Score */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Lead change indicator */}
        {isLeadChange && (
          <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded">
            LEAD
          </span>
        )}

        {/* Tie indicator */}
        {isTied && (
          <span className="px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded">
            TIE
          </span>
        )}

        {/* Momentum indicator */}
        {isMomentumPlay && !isLeadChange && !isTied && (
          <span className="text-orange-500 text-lg">🔥</span>
        )}

        {/* Scoring badge */}
        {play.scoringPlay && play.scoreValue > 0 && (
          <div
            className="px-2 py-1 rounded text-xs font-bold text-white whitespace-nowrap"
            style={{ backgroundColor: teamColor }}
          >
            +{play.scoreValue} {getShotLabel()}
          </div>
        )}

        {/* Score */}
        <div className="text-right w-24">
          <div className="font-bold text-sm tabular-nums">
            {play.awayScore}-{play.homeScore}
          </div>
          <div className="text-xs text-gray-500">
            {diffText}
          </div>
        </div>

        {/* Win Probability */}
        {play.homeWinPercentage !== undefined && play.homeWinPercentage !== null && (
          <div className="text-xs text-gray-500 w-20 text-right">
            <div>{awayTeamAbbr} {((1 - play.homeWinPercentage) * 100).toFixed(0)}%</div>
            <div>{homeTeamAbbr} {(play.homeWinPercentage * 100).toFixed(0)}%</div>
          </div>
        )}

        {/* Expand icon */}
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 16 16">
          <path d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
        </svg>
      </div>
    </div>
  );
}

export default memo(PlayCard);
