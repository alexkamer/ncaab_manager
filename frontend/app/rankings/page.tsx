import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getRankings(rankingType: string = 'ap') {
  try {
    const res = await fetch(`${API_BASE}/api/rankings?season=2026&ranking_type=${rankingType}`, {
      next: { revalidate: 3600 }
    });
    if (!res.ok) return { rankings: [], week: 0 };
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch rankings:", error);
    return { rankings: [], week: 0 };
  }
}

export default async function RankingsPage() {
  const rankingsData = await getRankings('ap');

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">NCAA Basketball Rankings</h1>
        <p className="mt-2 text-gray-600">
          AP Poll - Week {rankingsData.week} - 2026 Season
        </p>
      </div>

      {rankingsData.rankings.length > 0 ? (
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
                {rankingsData.rankings.map((team: any) => (
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
      ) : (
        <div className="border border-gray-200 p-8 text-center text-gray-500">
          <p>No rankings data available. Make sure the API server is running and rankings are populated.</p>
        </div>
      )}
    </div>
  );
}
