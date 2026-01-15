"use client";

import { useEffect, useState, useMemo } from "react";
import PlayByPlaySkeleton from "./components/PlayByPlaySkeleton";
import { EnhancedPlay, FilterState, ViewMode, detectMomentumRuns, getUniquePlayers, getPlayTypeCounts, isClutchTime, isLeadChange } from "./types/playTypes";
import FilterPanel from "./components/FilterPanel";
import PlayGrid from "./components/PlayGrid";
import ShotChart from "./components/ShotChart";
import PlayDetailsModal from "./components/PlayDetailsModal";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface PlayByPlayProps {
  eventId: number;
  awayTeamName: string;
  awayTeamAbbr: string;
  awayTeamId?: string;
  awayTeamColor?: string;
  awayTeamLogo: string;
  homeTeamName: string;
  homeTeamAbbr: string;
  homeTeamId?: string;
  homeTeamColor?: string;
  homeTeamLogo: string;
  onPlayClick?: (playId: string) => void;
}

export default function PlayByPlay({
  eventId,
  awayTeamName,
  awayTeamAbbr,
  awayTeamId,
  awayTeamColor,
  awayTeamLogo,
  homeTeamName,
  homeTeamAbbr,
  homeTeamId,
  homeTeamColor,
  homeTeamLogo,
  onPlayClick
}: PlayByPlayProps) {
  const [plays, setPlays] = useState<EnhancedPlay[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true); // Start expanded for new design
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedPlayId, setSelectedPlayId] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    selectedPeriod: "all",
    selectedPlayTypes: [],
    selectedPlayers: [],
    showScoringOnly: false,
    clutchTimeOnly: false,
    momentumPlaysOnly: false,
    leadChangesOnly: false
  });

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
        console.error("Error fetching plays:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPlays();
  }, [eventId]);

  // Get unique periods
  const periods = useMemo(() => {
    return Array.from(new Set(plays.map(p => p.period))).sort();
  }, [plays]);

  // Detect momentum runs
  const momentumPlayIds = useMemo(() => {
    return detectMomentumRuns(plays);
  }, [plays]);

  // Detect lead changes
  const leadChangePlayIds = useMemo(() => {
    const ids = new Set<string>();
    for (let i = 1; i < plays.length; i++) {
      if (isLeadChange(plays[i], plays[i - 1], plays)) {
        ids.add(plays[i].id);
      }
    }
    return ids;
  }, [plays]);

  // Get unique players
  const players = useMemo(() => {
    return getUniquePlayers(plays);
  }, [plays]);

  // Get play type counts
  const playTypeCounts = useMemo(() => {
    return getPlayTypeCounts(plays);
  }, [plays]);

  // Filter plays based on all filter criteria
  const filteredPlays = useMemo(() => {
    return plays.filter(play => {
      // Period filter
      if (filters.selectedPeriod !== "all" && play.period !== filters.selectedPeriod) {
        return false;
      }

      // Play type filter (by category)
      if (filters.selectedPlayTypes.length > 0 && !filters.selectedPlayTypes.includes(play.playCategory)) {
        return false;
      }

      // Player filter
      if (filters.selectedPlayers.length > 0) {
        const playInvolvesSelectedPlayer =
          filters.selectedPlayers.includes(play.playerId || "") ||
          filters.selectedPlayers.includes(play.assistPlayerId || "");
        if (!playInvolvesSelectedPlayer) {
          return false;
        }
      }

      // Scoring plays only
      if (filters.showScoringOnly && !play.scoringPlay) {
        return false;
      }

      // Clutch time only
      if (filters.clutchTimeOnly && !isClutchTime(play)) {
        return false;
      }

      // Momentum plays only
      if (filters.momentumPlaysOnly && !momentumPlayIds.has(play.id)) {
        return false;
      }

      // Lead changes only
      if (filters.leadChangesOnly && !leadChangePlayIds.has(play.id)) {
        return false;
      }

      return true;
    });
  }, [plays, filters, momentumPlayIds, leadChangePlayIds]);

  // Get selected play for modal
  const selectedPlay = selectedPlayId ? plays.find(p => p.id === selectedPlayId) : null;

  // Get context plays for modal (prev 3 and next 3)
  const getContextPlays = (playId: string) => {
    const index = plays.findIndex(p => p.id === playId);
    if (index === -1) return { prev: [], next: [] };

    const prev = plays.slice(Math.max(0, index - 3), index).reverse();
    const next = plays.slice(index + 1, Math.min(plays.length, index + 4));

    return { prev, next };
  };

  const contextPlays = selectedPlayId ? getContextPlays(selectedPlayId) : { prev: [], next: [] };

  // Navigate in modal
  const handleModalNavigate = (direction: "prev" | "next") => {
    if (!selectedPlayId) return;
    const index = plays.findIndex(p => p.id === selectedPlayId);
    if (index === -1) return;

    if (direction === "prev" && index > 0) {
      setSelectedPlayId(plays[index - 1].id);
    } else if (direction === "next" && index < plays.length - 1) {
      setSelectedPlayId(plays[index + 1].id);
    }
  };

  return (
    <div className="rounded-lg shadow-sm overflow-hidden border border-gray-200 bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-gray-200">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">Play-by-Play</h2>
            {!loading && (
              <span className="text-sm text-gray-500">
                {filteredPlays.length} {filteredPlays.length === 1 ? "play" : "plays"}
              </span>
            )}
          </div>
          <svg
            className={`w-6 h-6 text-gray-600 transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Content */}
      {expanded && (
        <>
          {loading ? (
            <PlayByPlaySkeleton />
          ) : plays.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <svg
                className="w-16 h-16 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-lg font-medium">No play-by-play data available</p>
              <p className="text-sm">This game may not have started yet</p>
            </div>
          ) : (
            <>
              {/* View Toggle */}
              <div className="px-6 py-3 bg-gray-50 border-b flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                      viewMode === "grid"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    Grid View
                  </button>
                  <button
                    onClick={() => setViewMode("shotchart")}
                    className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                      viewMode === "shotchart"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    Shot Chart
                  </button>
                </div>
              </div>

              {/* Filters */}
              <FilterPanel
                filters={filters}
                onFilterChange={setFilters}
                periods={periods}
                players={players}
                playTypeCounts={playTypeCounts}
              />

              {/* Main Content Area */}
              {viewMode === "grid" ? (
                <PlayGrid
                  plays={filteredPlays}
                  momentumPlayIds={momentumPlayIds}
                  homeTeamColor={homeTeamColor}
                  awayTeamColor={awayTeamColor}
                  homeTeamId={homeTeamId || ""}
                  awayTeamId={awayTeamId || ""}
                  homeTeamLogo={homeTeamLogo}
                  awayTeamLogo={awayTeamLogo}
                  homeTeamAbbr={homeTeamAbbr}
                  awayTeamAbbr={awayTeamAbbr}
                  onPlayClick={(playId) => {
                    setSelectedPlayId(playId);
                    onPlayClick?.(playId);
                  }}
                />
              ) : (
                <div className="p-6">
                  <ShotChart
                    plays={filteredPlays}
                    homeTeamColor={homeTeamColor}
                    awayTeamColor={awayTeamColor}
                    homeTeamId={homeTeamId || ""}
                    awayTeamId={awayTeamId || ""}
                    onPlayClick={(playId) => {
                      setSelectedPlayId(playId);
                      onPlayClick?.(playId);
                    }}
                  />
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Play Details Modal */}
      {selectedPlay && (
        <PlayDetailsModal
          play={selectedPlay}
          prevPlays={contextPlays.prev}
          nextPlays={contextPlays.next}
          homeTeamColor={homeTeamColor}
          awayTeamColor={awayTeamColor}
          homeTeamId={homeTeamId || ""}
          awayTeamId={awayTeamId || ""}
          homeTeamLogo={homeTeamLogo}
          awayTeamLogo={awayTeamLogo}
          homeTeamAbbr={homeTeamAbbr}
          awayTeamAbbr={awayTeamAbbr}
          onClose={() => setSelectedPlayId(null)}
          onNavigate={handleModalNavigate}
        />
      )}
    </div>
  );
}
