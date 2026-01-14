"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Ranking {
  team_id: number;
  team_name: string;
  team_logo: string;
  current_rank: number;
  previous_rank: number | null;
  points: number;
  first_place_votes: number;
  wins: number;
  losses: number;
  record_summary: string;
  trend: string;
}

interface RankingsData {
  rankings: Ranking[];
  week: number;
}

export default function RankingsPage() {
  const [rankingType, setRankingType] = useState<'ap' | 'coaches'>('ap');
  const [rankingsData, setRankingsData] = useState<RankingsData>({ rankings: [], week: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRankings() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/rankings?season=2026&ranking_type=${rankingType}`);
        if (res.ok) {
          const data = await res.json();
          setRankingsData(data);
        } else {
          setRankingsData({ rankings: [], week: 0 });
        }
      } catch (error) {
        console.error("Failed to fetch rankings:", error);
        setRankingsData({ rankings: [], week: 0 });
      } finally {
        setLoading(false);
      }
    }
    fetchRankings();
  }, [rankingType]);

  const rankingTypeName = rankingType === 'ap' ? 'AP Poll' : 'Coaches Poll';

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">NCAA Basketball Rankings</h1>
        <p className="mt-2 text-gray-600">
          {rankingTypeName} - Week {rankingsData.week} - 2026 Season
        </p>
      </div>

      {/* Poll Type Toggle */}
      <div className="border border-gray-200 p-4 bg-white">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Select Poll:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setRankingType('ap')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                rankingType === 'ap'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              AP Poll
            </button>
            <button
              onClick={() => setRankingType('coaches')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                rankingType === 'coaches'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Coaches Poll
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="border border-gray-200 p-8 text-center text-gray-500">
          <p>Loading {rankingTypeName.toLowerCase()}...</p>
        </div>
      )}

      {/* Rankings Table */}
      {!loading && rankingsData.rankings.length > 0 ? (
        <div className="border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Record
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    FPV
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rankingsData.rankings.map((team) => (
                  <tr key={team.team_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-lg font-bold text-gray-900">{team.current_rank}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/teams/${team.team_id}`}
                        className="flex items-center space-x-3 text-blue-600 hover:text-blue-800"
                      >
                        {team.team_logo && (
                          <img src={team.team_logo} alt={team.team_name} className="w-8 h-8" />
                        )}
                        <span className="font-medium">{team.team_name}</span>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {team.record_summary || `${team.wins}-${team.losses}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {team.points || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {team.first_place_votes || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {team.previous_rank ? (
                        <span className={`text-sm font-medium ${
                          team.previous_rank > team.current_rank ? 'text-green-600' :
                          team.previous_rank < team.current_rank ? 'text-red-600' :
                          'text-gray-400'
                        }`}>
                          {team.trend || '-'}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : !loading && rankingsData.rankings.length === 0 ? (
        <div className="border border-gray-200 p-8 text-center text-gray-500">
          <p>No {rankingTypeName.toLowerCase()} data available.</p>
          <p className="text-sm mt-2">Rankings may not be published yet for this week, or the API server may need to be running.</p>
        </div>
      ) : null}
    </div>
  );
}
