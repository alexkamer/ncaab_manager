"use client";

import { useState, useMemo } from "react";
import { FilterState, PLAY_CATEGORY_LABELS } from "../types/playTypes";

interface FilterPanelProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  periods: number[];
  players: Array<{ id: string; name: string }>;
  playTypeCounts: Record<string, number>;
}

export default function FilterPanel({
  filters,
  onFilterChange,
  periods,
  players,
  playTypeCounts
}: FilterPanelProps) {
  const [showPlayTypeDropdown, setShowPlayTypeDropdown] = useState(false);
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");

  // Period labels
  const getPeriodLabel = (period: number) => {
    if (period === 1) return "1st Half";
    if (period === 2) return "2nd Half";
    return `OT${period - 2}`;
  };

  // Memoize filtered players based on search to avoid recomputing on every render
  const filteredPlayers = useMemo(() => {
    return players.filter(p =>
      p.name.toLowerCase().includes(playerSearch.toLowerCase())
    );
  }, [players, playerSearch]);

  // Memoize play categories to avoid recreating array on every render
  const playCategories = useMemo(() => {
    return [
      { value: "scoring", label: "Scoring", count: playTypeCounts.scoring || 0 },
      { value: "rebounding", label: "Rebounds", count: playTypeCounts.rebounding || 0 },
      { value: "turnovers", label: "Turnovers", count: playTypeCounts.turnovers || 0 },
      { value: "fouls", label: "Fouls", count: playTypeCounts.fouls || 0 },
      { value: "defensive", label: "Defensive", count: playTypeCounts.defensive || 0 }
    ];
  }, [playTypeCounts]);

  // Memoize active filter count to avoid recalculation on every render
  const activeFilterCount = useMemo(() => {
    return (filters.selectedPeriod !== "all" ? 1 : 0) +
      filters.selectedPlayTypes.length +
      filters.selectedPlayers.length +
      (filters.showScoringOnly ? 1 : 0) +
      (filters.clutchTimeOnly ? 1 : 0) +
      (filters.momentumPlaysOnly ? 1 : 0) +
      (filters.leadChangesOnly ? 1 : 0);
  }, [filters]);

  const clearAllFilters = () => {
    onFilterChange({
      selectedPeriod: "all",
      selectedPlayTypes: [],
      selectedPlayers: [],
      showScoringOnly: false,
      clutchTimeOnly: false,
      momentumPlaysOnly: false,
      leadChangesOnly: false
    });
  };

  return (
    <div className="sticky top-0 z-10 bg-white border-b-2 border-gray-200 p-4 space-y-3">
      {/* Period Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold text-gray-700">Period:</span>
        <button
          onClick={() => onFilterChange({ ...filters, selectedPeriod: "all" })}
          className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
            filters.selectedPeriod === "all"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All
        </button>
        {periods.map(period => (
          <button
            key={period}
            onClick={() => onFilterChange({ ...filters, selectedPeriod: period })}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              filters.selectedPeriod === period
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {getPeriodLabel(period)}
          </button>
        ))}
      </div>

      {/* Play Type & Player Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Play Type Filter */}
        <div className="relative">
          <button
            onClick={() => setShowPlayTypeDropdown(!showPlayTypeDropdown)}
            className="px-3 py-1.5 text-sm rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            Play Type
            {filters.selectedPlayTypes.length > 0 && (
              <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                {filters.selectedPlayTypes.length}
              </span>
            )}
            <svg
              className={`w-4 h-4 transition-transform ${showPlayTypeDropdown ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showPlayTypeDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg p-2 min-w-[200px] z-20">
              {playCategories.map(category => (
                <label
                  key={category.value}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filters.selectedPlayTypes.includes(category.value)}
                    onChange={(e) => {
                      const newTypes = e.target.checked
                        ? [...filters.selectedPlayTypes, category.value]
                        : filters.selectedPlayTypes.filter(t => t !== category.value);
                      onFilterChange({ ...filters, selectedPlayTypes: newTypes });
                    }}
                    className="rounded"
                  />
                  <span className="text-sm flex-1">{category.label}</span>
                  <span className="text-xs text-gray-500">({category.count})</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Player Filter */}
        {players.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowPlayerDropdown(!showPlayerDropdown)}
              className="px-3 py-1.5 text-sm rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              Player
              {filters.selectedPlayers.length > 0 && (
                <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                  {filters.selectedPlayers.length}
                </span>
              )}
              <svg
                className={`w-4 h-4 transition-transform ${showPlayerDropdown ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showPlayerDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg p-2 min-w-[250px] max-h-[300px] overflow-y-auto z-20">
                <input
                  type="text"
                  placeholder="Search players..."
                  value={playerSearch}
                  onChange={(e) => setPlayerSearch(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded-lg text-sm mb-2"
                  onClick={(e) => e.stopPropagation()}
                />
                {filteredPlayers.map(player => (
                  <label
                    key={player.id}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.selectedPlayers.includes(player.id)}
                      onChange={(e) => {
                        const newPlayers = e.target.checked
                          ? [...filters.selectedPlayers, player.id]
                          : filters.selectedPlayers.filter(p => p !== player.id);
                        onFilterChange({ ...filters, selectedPlayers: newPlayers });
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{player.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Game Situation Filters */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onFilterChange({ ...filters, clutchTimeOnly: !filters.clutchTimeOnly })}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              filters.clutchTimeOnly
                ? "bg-orange-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Clutch Time
          </button>
          <button
            onClick={() => onFilterChange({ ...filters, momentumPlaysOnly: !filters.momentumPlaysOnly })}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              filters.momentumPlaysOnly
                ? "bg-orange-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            🔥 Momentum
          </button>
          <button
            onClick={() => onFilterChange({ ...filters, leadChangesOnly: !filters.leadChangesOnly })}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              filters.leadChangesOnly
                ? "bg-orange-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Lead Changes
          </button>
        </div>

        {/* Quick Toggle */}
        <label className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors">
          <input
            type="checkbox"
            checked={filters.showScoringOnly}
            onChange={(e) => onFilterChange({ ...filters, showScoringOnly: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm font-medium text-gray-700">Scoring Only</span>
        </label>
      </div>

      {/* Active filters display */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600">
            {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active:
          </span>
          <button
            onClick={clearAllFilters}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Close dropdowns when clicking outside */}
      {(showPlayTypeDropdown || showPlayerDropdown) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setShowPlayTypeDropdown(false);
            setShowPlayerDropdown(false);
          }}
        />
      )}
    </div>
  );
}
