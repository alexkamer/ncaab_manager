"use client";

import { useEffect } from "react";
import { EnhancedPlay, PLAY_TYPE_LABELS } from "../types/playTypes";

interface PlayDetailsModalProps {
  play: EnhancedPlay;
  prevPlays: EnhancedPlay[];
  nextPlays: EnhancedPlay[];
  homeTeamColor: string;
  awayTeamColor: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamLogo: string;
  awayTeamLogo: string;
  homeTeamAbbr: string;
  awayTeamAbbr: string;
  onClose: () => void;
  onNavigate?: (direction: "prev" | "next") => void;
}

export default function PlayDetailsModal({
  play,
  prevPlays,
  nextPlays,
  homeTeamColor,
  awayTeamColor,
  homeTeamId,
  awayTeamId,
  homeTeamLogo,
  awayTeamLogo,
  homeTeamAbbr,
  awayTeamAbbr,
  onClose,
  onNavigate
}: PlayDetailsModalProps) {
  const isHomeTeam = play.team === homeTeamId;
  const teamColor = isHomeTeam ? homeTeamColor : awayTeamColor;
  const teamLogo = isHomeTeam ? homeTeamLogo : awayTeamLogo;
  const teamAbbr = isHomeTeam ? homeTeamAbbr : awayTeamAbbr;

  // Score differential
  const scoreDiff = play.homeScore - play.awayScore;
  const leader = scoreDiff > 0 ? homeTeamAbbr : scoreDiff < 0 ? awayTeamAbbr : null;
  const diffText = scoreDiff === 0 ? "Tied" : `${leader} leads by ${Math.abs(scoreDiff)}`;

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div
        className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 px-6 py-4 border-b flex items-center justify-between"
          style={{ backgroundColor: `${teamColor}20` }}
        >
          <div className="flex items-center gap-3">
            {teamLogo && (
              <img
                src={teamLogo}
                alt={teamAbbr}
                className="w-10 h-10 rounded-full"
                style={{ border: `3px solid ${teamColor}` }}
              />
            )}
            <div>
              <div className="font-bold text-lg" style={{ color: teamColor }}>
                {play.clock} - {play.periodDisplay}
              </div>
              <div className="text-sm text-gray-600">
                Score: {play.awayScore}-{play.homeScore} ({diffText})
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Main Content */}
        <div className="p-6 space-y-6">
          {/* Play Details */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Play Details</h3>
            {play.playerName && (
              <div className="mb-3">
                <span className="text-lg font-bold text-gray-900">{play.playerName}</span>
                {play.playerId && (
                  <span className="ml-2 text-sm text-gray-500">#{play.playerId}</span>
                )}
              </div>
            )}
            <p className="text-base text-gray-800 leading-relaxed">{play.text}</p>

            {play.assistPlayerName && (
              <div className="mt-2 text-sm text-gray-600">
                <span className="font-semibold">Assist:</span> {play.assistPlayerName}
              </div>
            )}
          </div>

          {/* Play Classification */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Play Type</div>
              <div className="font-semibold text-gray-900">
                {PLAY_TYPE_LABELS[play.playType] || play.playType}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Category</div>
              <div className="font-semibold text-gray-900 capitalize">{play.playCategory}</div>
            </div>
          </div>

          {/* Shot Details */}
          {play.shotCoordinate && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Shot Information</h4>
              <div className="space-y-1 text-sm text-blue-800">
                <div>
                  <span className="font-medium">Result:</span>{" "}
                  {play.shotResult === "made" ? "✓ Made" : "✗ Missed"}
                </div>
                <div>
                  <span className="font-medium">Value:</span> {play.scoreValue} point{play.scoreValue !== 1 ? "s" : ""}
                </div>
                <div>
                  <span className="font-medium">Location:</span> x:{play.shotCoordinate.x.toFixed(1)}, y:{play.shotCoordinate.y.toFixed(1)}
                </div>
              </div>
            </div>
          )}

          {/* Win Probability */}
          {play.homeWinPercentage !== undefined && play.homeWinPercentage !== null && (
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Win Probability</h4>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-xs text-gray-600 mb-1">{awayTeamAbbr}</div>
                  <div className="text-2xl font-bold" style={{ color: awayTeamColor }}>
                    {(100 - play.homeWinPercentage).toFixed(1)}%
                  </div>
                </div>
                <div className="text-gray-400">vs</div>
                <div className="flex-1 text-right">
                  <div className="text-xs text-gray-600 mb-1">{homeTeamAbbr}</div>
                  <div className="text-2xl font-bold" style={{ color: homeTeamColor }}>
                    {play.homeWinPercentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Context: Previous Plays */}
          {prevPlays.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Previous Plays</h4>
              <div className="space-y-2">
                {prevPlays.map(p => (
                  <div key={p.id} className="text-sm text-gray-700 border-l-2 border-gray-300 pl-3">
                    <div className="text-xs text-gray-500">{p.clock} - {p.periodDisplay}</div>
                    <div>{p.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Context: Next Plays */}
          {nextPlays.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Next Plays</h4>
              <div className="space-y-2">
                {nextPlays.map(p => (
                  <div key={p.id} className="text-sm text-gray-700 border-l-2 border-gray-300 pl-3">
                    <div className="text-xs text-gray-500">{p.clock} - {p.periodDisplay}</div>
                    <div>{p.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <button
            onClick={() => onNavigate?.("prev")}
            disabled={prevPlays.length === 0}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-white rounded-lg"
            style={{ backgroundColor: teamColor }}
          >
            Close
          </button>
          <button
            onClick={() => onNavigate?.("next")}
            disabled={nextPlays.length === 0}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
