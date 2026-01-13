import Link from "next/link";

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

async function getPlayers() {
  try {
    const res = await fetch(`${API_BASE}/api/players?season=2026&limit=200`, {
      next: { revalidate: 3600 }
    });
    if (!res.ok) return { players: [] };
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch players:", error);
    return { players: [] };
  }
}

export default async function PlayersPage() {
  const playersData = await getPlayers();
  const players = playersData.players as Player[];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">NCAA Basketball Players</h1>
        <p className="mt-2 text-gray-600">Browse player statistics and profiles</p>
      </div>

      {players.length > 0 ? (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
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
                {players.map((player) => (
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
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <p>No players found. Make sure the API server is running.</p>
        </div>
      )}
    </div>
  );
}
