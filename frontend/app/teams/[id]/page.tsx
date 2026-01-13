import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getTeam(teamId: string) {
  try {
    const res = await fetch(`${API_BASE}/api/teams/${teamId}?season=2026`, {
      next: { revalidate: 60 }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Failed to fetch team:", error);
    return null;
  }
}

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await getTeam(id);

  if (!team) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900">Team Not Found</h1>
        <Link href="/teams" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
          ← Back to Teams
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Header */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-start space-x-6">
          {team.logo_url && (
            <img src={team.logo_url} alt={team.display_name} className="w-24 h-24" />
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{team.display_name}</h1>
            <p className="text-lg text-gray-600 mt-1">{team.conference_name}</p>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Venue:</span>
                <div className="font-medium">{team.venue_name}</div>
              </div>
              <div>
                <span className="text-gray-500">Location:</span>
                <div className="font-medium">{team.venue_city}, {team.venue_state}</div>
              </div>
              <div>
                <span className="text-gray-500">Abbreviation:</span>
                <div className="font-medium">{team.abbreviation}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Roster */}
      {team.roster && team.roster.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Roster</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
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
                {team.roster.map((player: any) => (
                  <tr key={player.athlete_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {player.jersey || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/players/${player.athlete_id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        {player.full_name}
                      </Link>
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
      )}

      {/* Recent Games */}
      {team.games && team.games.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Recent Games</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {team.games.slice(0, 10).map((game: any) => {
              const isHome = game.location === 'home';
              const teamScore = isHome ? game.home_score : game.away_score;
              const oppScore = isHome ? game.away_score : game.home_score;
              const won = game.is_completed && teamScore > oppScore;
              const lost = game.is_completed && teamScore < oppScore;

              return (
                <Link
                  key={game.event_id}
                  href={`/games/${game.event_id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="text-sm text-gray-500 w-20">
                      {new Date(game.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className={`w-4 h-4 rounded-full ${
                      won ? 'bg-green-500' : lost ? 'bg-red-500' : 'bg-gray-300'
                    }`}></div>
                    <div className="flex items-center space-x-2 flex-1">
                      <span className="text-sm text-gray-500">{isHome ? 'vs' : '@'}</span>
                      {game.opponent_logo && (
                        <img src={game.opponent_logo} alt={game.opponent_name} className="w-6 h-6" />
                      )}
                      <span className="font-medium text-gray-900">{game.opponent_name}</span>
                    </div>
                  </div>
                  {game.is_completed ? (
                    <div className="text-sm font-medium">
                      <span className={won ? 'text-green-600' : 'text-red-600'}>
                        {won ? 'W' : 'L'}
                      </span>
                      <span className="ml-2 text-gray-900">{teamScore}-{oppScore}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">Scheduled</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
