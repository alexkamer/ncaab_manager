"use client";

import { useState, useMemo } from "react";
import { EnhancedPlay } from "../types/playTypes";
import CourtSVG from "./CourtSVG";

interface ShotChartProps {
  plays: EnhancedPlay[];
  homeTeamColor: string;
  awayTeamColor: string;
  homeTeamId: string;
  awayTeamId: string;
  onPlayClick?: (playId: string) => void;
}

// Convert ESPN coordinates to SVG coordinates
function convertCoordinates(espnX: number, espnY: number): { x: number; y: number } {
  // ESPN coordinates: x is 0-94 (court length), y is 0-50 (court width)
  // SVG viewBox: 500x470
  // We're showing half court, so we only use 0-47 in x direction

  // Normalize and flip coordinates
  const normalizedX = espnX / 94; // 0-1
  const normalizedY = espnY / 50; // 0-1

  // Map to SVG (with some padding)
  const svgX = 30 + (normalizedY * 440); // Map Y to horizontal (court width)
  const svgY = 10 + (normalizedX * 400); // Map X to vertical (court length)

  return { x: svgX, y: Math.min(svgY, 460) };
}

export default function ShotChart({
  plays,
  homeTeamColor,
  awayTeamColor,
  homeTeamId,
  awayTeamId,
  onPlayClick
}: ShotChartProps) {
  const [showMadeOnly, setShowMadeOnly] = useState(false);
  const [showMissedOnly, setShowMissedOnly] = useState(false);
  const [hoveredPlayId, setHoveredPlayId] = useState<string | null>(null);

  // Filter plays with shot coordinates
  const shotPlays = useMemo(() => {
    return plays.filter(play => {
      if (!play.shotCoordinate) return false;
      if (showMadeOnly && play.shotResult !== "made") return false;
      if (showMissedOnly && play.shotResult !== "missed") return false;
      return true;
    });
  }, [plays, showMadeOnly, showMissedOnly]);

  // Calculate shooting stats
  const stats = useMemo(() => {
    const made = shotPlays.filter(p => p.shotResult === "made").length;
    const total = shotPlays.length;
    const percentage = total > 0 ? ((made / total) * 100).toFixed(1) : "0.0";
    return { made, total, percentage };
  }, [shotPlays]);

  const hoveredPlay = hoveredPlayId ? plays.find(p => p.id === hoveredPlayId) : null;

  return (
    <div className="space-y-4">
      {/* Filter toggles */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowMadeOnly(!showMadeOnly);
              setShowMissedOnly(false);
            }}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              showMadeOnly
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Made Only
          </button>
          <button
            onClick={() => {
              setShowMissedOnly(!showMissedOnly);
              setShowMadeOnly(false);
            }}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              showMissedOnly
                ? "bg-red-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Missed Only
          </button>
          {(showMadeOnly || showMissedOnly) && (
            <button
              onClick={() => {
                setShowMadeOnly(false);
                setShowMissedOnly(false);
              }}
              className="px-3 py-1.5 text-sm rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Show All
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-gray-600">FG:</span>{" "}
            <span className="font-bold">{stats.made}/{stats.total}</span>
          </div>
          <div>
            <span className="text-gray-600">FG%:</span>{" "}
            <span className="font-bold">{stats.percentage}%</span>
          </div>
        </div>
      </div>

      {/* Shot chart */}
      <div className="relative bg-white rounded-lg border-2 border-gray-200 p-4">
        <div className="relative w-full" style={{ paddingBottom: "94%" }}>
          <div className="absolute inset-0">
            <CourtSVG homeTeamColor={homeTeamColor} awayTeamColor={awayTeamColor} />

            {/* Shot markers overlay */}
            <svg
              viewBox="0 0 500 470"
              className="absolute inset-0 w-full h-full pointer-events-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {shotPlays.map(play => {
                if (!play.shotCoordinate) return null;

                const { x, y } = convertCoordinates(
                  play.shotCoordinate.x,
                  play.shotCoordinate.y
                );

                const isMade = play.shotResult === "made";
                const teamColor = play.team === homeTeamId ? homeTeamColor : awayTeamColor;
                const isHovered = hoveredPlayId === play.id;

                return (
                  <g
                    key={play.id}
                    className="pointer-events-auto cursor-pointer"
                    onMouseEnter={() => setHoveredPlayId(play.id)}
                    onMouseLeave={() => setHoveredPlayId(null)}
                    onClick={() => onPlayClick?.(play.id)}
                  >
                    {isMade ? (
                      // Made shot: filled circle
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? 8 : 6}
                        fill={teamColor}
                        fillOpacity={isHovered ? 1 : 0.8}
                        stroke="white"
                        strokeWidth={isHovered ? 2.5 : 1.5}
                        className="transition-all duration-150"
                      />
                    ) : (
                      // Missed shot: hollow circle with X
                      <>
                        <circle
                          cx={x}
                          cy={y}
                          r={isHovered ? 8 : 6}
                          fill="none"
                          stroke={teamColor}
                          strokeWidth={isHovered ? 2.5 : 2}
                          strokeOpacity={isHovered ? 1 : 0.7}
                          className="transition-all duration-150"
                        />
                        <line
                          x1={x - 4}
                          y1={y - 4}
                          x2={x + 4}
                          y2={y + 4}
                          stroke={teamColor}
                          strokeWidth={isHovered ? 2 : 1.5}
                          strokeOpacity={isHovered ? 1 : 0.7}
                          className="transition-all duration-150"
                        />
                        <line
                          x1={x + 4}
                          y1={y - 4}
                          x2={x - 4}
                          y2={y + 4}
                          stroke={teamColor}
                          strokeWidth={isHovered ? 2 : 1.5}
                          strokeOpacity={isHovered ? 1 : 0.7}
                          className="transition-all duration-150"
                        />
                      </>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Tooltip */}
        {hoveredPlay && (
          <div className="absolute top-4 left-4 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm max-w-xs z-10">
            <div className="font-bold">{hoveredPlay.playerName || "Unknown Player"}</div>
            <div className="text-gray-300">{hoveredPlay.clock} - {hoveredPlay.periodDisplay}</div>
            <div className="text-gray-300">
              {hoveredPlay.shotResult === "made" ? "✓ Made" : "✗ Missed"} {" "}
              {hoveredPlay.scoreValue === 3 ? "3PT" : hoveredPlay.scoreValue === 2 ? "2PT" : "FT"}
            </div>
            {hoveredPlay.assistPlayerName && (
              <div className="text-gray-400 text-xs mt-1">
                Assist: {hoveredPlay.assistPlayerName}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <svg width="20" height="20">
            <circle cx="10" cy="10" r="6" fill={homeTeamColor} fillOpacity="0.8" stroke="white" strokeWidth="1.5" />
          </svg>
          <span>Made Shot</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="20" height="20">
            <circle cx="10" cy="10" r="6" fill="none" stroke={awayTeamColor} strokeWidth="2" strokeOpacity="0.7" />
            <line x1="6" y1="6" x2="14" y2="14" stroke={awayTeamColor} strokeWidth="1.5" strokeOpacity="0.7" />
            <line x1="14" y1="6" x2="6" y2="14" stroke={awayTeamColor} strokeWidth="1.5" strokeOpacity="0.7" />
          </svg>
          <span>Missed Shot</span>
        </div>
      </div>
    </div>
  );
}
