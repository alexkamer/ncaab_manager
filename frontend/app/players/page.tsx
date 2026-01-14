"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Player {
  athlete_id: number;
  full_name: string;
  display_name: string;
  position_name: string;
  height_inches: number;
  weight_lbs: number;
  jersey: string;
  experience_display: string;
  team_name: string;
  team_logo: string;
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 100;

  useEffect(() => {
    async function fetchPlayers() {
      const isInitialLoad = page === 1;
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const offset = (page - 1) * ITEMS_PER_PAGE;
        const res = await fetch(`${API_BASE}/api/players?season=2026&limit=${ITEMS_PER_PAGE}&offset=${offset}`);
        if (res.ok) {
          const data = await res.json();
          const newPlayers = data.players || [];

          if (isInitialLoad) {
            setPlayers(newPlayers);
          } else {
            setPlayers(prev => [...prev, ...newPlayers]);
          }

          // Check if there are more players to load
          setHasMore(newPlayers.length === ITEMS_PER_PAGE);
        }
      } catch (error) {
        console.error("Failed to fetch players:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    }
    fetchPlayers();
  }, [page]);

  // Get unique positions and classes for filters
  const positions = useMemo(() => {
    const uniquePositions = new Set(players.map(p => p.position_name).filter(Boolean));
    return Array.from(uniquePositions).sort();
  }, [players]);

  const classes = useMemo(() => {
    const uniqueClasses = new Set(players.map(p => p.experience_display).filter(Boolean));
    return Array.from(uniqueClasses).sort();
  }, [players]);

  // Filter players based on search and filters
  const filteredPlayers = useMemo(() => {
    return players.filter(player => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesName = player.full_name?.toLowerCase().includes(search);
        const matchesTeam = player.team_name?.toLowerCase().includes(search);
        if (!matchesName && !matchesTeam) return false;
      }

      // Position filter
      if (positionFilter && player.position_name !== positionFilter) {
        return false;
      }

      // Class filter
      if (classFilter && player.experience_display !== classFilter) {
        return false;
      }

      return true;
    });
  }, [players, searchTerm, positionFilter, classFilter]);

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">NCAA Basketball Players</h1>
        <p className="mt-2 text-gray-600">Browse player statistics and profiles for the 2025-26 season</p>
      </div>

      {/* Search and Filters */}
      <div className="border border-gray-200 p-4 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search Players or Teams
            </label>
            <input
              id="search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or team..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Position Filter */}
          <div>
            <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
              Position
            </label>
            <select
              id="position"
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Positions</option>
              {positions.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>

          {/* Class Filter */}
          <div>
            <label htmlFor="class" className="block text-sm font-medium text-gray-700 mb-1">
              Class
            </label>
            <select
              id="class"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Classes</option>
              {classes.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results count and clear filters */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-gray-600">
            Showing {filteredPlayers.length} of {players.length} players
          </span>
          {(searchTerm || positionFilter || classFilter) && (
            <button
              onClick={() => {
                setSearchTerm("");
                setPositionFilter("");
                setClassFilter("");
              }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="border border-gray-200 p-8 text-center text-gray-500">
          <p>Loading players...</p>
        </div>
      )}

      {/* Players Table */}
      {!loading && filteredPlayers.length > 0 ? (
        <div className="border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Height
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Weight
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Class
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPlayers.map((player) => (
                  <tr key={player.athlete_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/players/${player.athlete_id}`}
                        className="flex items-center space-x-2"
                      >
                        <span className="text-sm font-medium text-blue-600 hover:text-blue-800">
                          {player.full_name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {player.team_logo && (
                          <img src={player.team_logo} alt={player.team_name} className="w-6 h-6" />
                        )}
                        <span className="text-sm text-gray-900">{player.team_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {player.position_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {player.height_inches ? `${Math.floor(player.height_inches / 12)}'${player.height_inches % 12}"` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {player.weight_lbs ? `${player.weight_lbs} lbs` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {player.experience_display || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : !loading && filteredPlayers.length === 0 ? (
        <div className="border border-gray-200 p-8 text-center text-gray-500">
          <p>No players found matching your filters.</p>
          <button
            onClick={() => {
              setSearchTerm("");
              setPositionFilter("");
              setClassFilter("");
            }}
            className="mt-2 text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear filters
          </button>
        </div>
      ) : null}

      {/* Load More Button */}
      {!loading && filteredPlayers.length > 0 && hasMore && !searchTerm && !positionFilter && !classFilter && (
        <div className="flex justify-center">
          <button
            onClick={() => setPage(prev => prev + 1)}
            disabled={loadingMore}
            className="px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loadingMore ? "Loading..." : "Load More Players"}
          </button>
        </div>
      )}

      {!loading && !hasMore && players.length >= ITEMS_PER_PAGE && (
        <div className="text-center text-sm text-gray-500">
          All players loaded ({players.length} total)
        </div>
      )}
    </div>
  );
}
