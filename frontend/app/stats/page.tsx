"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Leader {
  athlete_id: number;
  full_name: string;
  display_name: string;
  position_name: string;
  headshot_url: string;
  team_id: number;
  team_name: string;
  team_abbr: string;
  team_logo: string;
  conference_id: number;
  conference_name: string;
  games_played: number;
  stat_value: number;
  ppg: number;
  rpg: number;
  apg: number;
}

interface LeadersData {
  leaders: Leader[];
  stat_category: string;
  stat_label: string;
  season: number;
  min_games: number;
}

const STAT_CATEGORIES = [
  { value: "points", label: "Points Per Game" },
  { value: "rebounds", label: "Rebounds Per Game" },
  { value: "assists", label: "Assists Per Game" },
  { value: "field_goal_pct", label: "Field Goal %" },
  { value: "three_point_pct", label: "Three Point %" },
  { value: "free_throw_pct", label: "Free Throw %" },
  { value: "steals", label: "Steals Per Game" },
  { value: "blocks", label: "Blocks Per Game" },
];

export default function StatsLeadersPage() {
  const [statCategory, setStatCategory] = useState("points");
  const [leadersData, setLeadersData] = useState<LeadersData>({
    leaders: [],
    stat_category: "points",
    stat_label: "Points Per Game",
    season: 2026,
    min_games: 5,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaders() {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}/api/stats/leaders?season=2026&stat_category=${statCategory}&limit=50&min_games=5`
        );
        if (res.ok) {
          const data = await res.json();
          setLeadersData(data);
        } else {
          setLeadersData({
            leaders: [],
            stat_category: statCategory,
            stat_label: "",
            season: 2026,
            min_games: 5,
          });
        }
      } catch (error) {
        console.error("Failed to fetch leaders:", error);
        setLeadersData({
          leaders: [],
          stat_category: statCategory,
          stat_label: "",
          season: 2026,
          min_games: 5,
        });
      } finally {
        setLoading(false);
      }
    }
    fetchLeaders();
  }, [statCategory]);

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">Season Leaders</h1>
        <p className="mt-2 text-gray-600">
          Top performers in the 2025-26 NCAA Basketball season
        </p>
      </div>

      {/* Stat Category Selector */}
      <div className="border border-gray-200 p-4 bg-white">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">
            Select Category:
          </span>
          <div className="flex flex-wrap gap-2">
            {STAT_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setStatCategory(cat.value)}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  statCategory === cat.value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-500">
          Minimum {leadersData.min_games} games played
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="border border-gray-200 p-8 text-center text-gray-500">
          <p>Loading leaders...</p>
        </div>
      )}

      {/* Leaders Table */}
      {!loading && leadersData.leaders.length > 0 ? (
        <div className="border border-gray-200">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">
              {leadersData.stat_label}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    GP
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {leadersData.stat_label}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PPG
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RPG
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    APG
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leadersData.leaders.map((player, index) => (
                  <tr key={player.athlete_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-lg font-bold text-gray-900">
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/players/${player.athlete_id}`}
                        className="flex items-center space-x-3"
                      >
                        {player.headshot_url && (
                          <img
                            src={player.headshot_url}
                            alt={player.full_name}
                            className="w-10 h-10 rounded-full"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-blue-600 hover:text-blue-800">
                            {player.full_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {player.position_name || "-"}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/teams/${player.team_id}`}
                        className="flex items-center space-x-2 text-gray-900 hover:text-blue-600"
                      >
                        {player.team_logo && (
                          <img
                            src={player.team_logo}
                            alt={player.team_name}
                            className="w-6 h-6"
                          />
                        )}
                        <span className="text-sm">{player.team_name}</span>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {player.conference_name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {player.games_played}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-lg font-bold text-blue-600">
                        {player.stat_value?.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {player.ppg?.toFixed(1) || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {player.rpg?.toFixed(1) || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {player.apg?.toFixed(1) || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : !loading && leadersData.leaders.length === 0 ? (
        <div className="border border-gray-200 p-8 text-center text-gray-500">
          <p>No leaders data available for this category.</p>
          <p className="text-sm mt-2">
            The API server may need to be running, or there may be insufficient
            data.
          </p>
        </div>
      ) : null}
    </div>
  );
}
