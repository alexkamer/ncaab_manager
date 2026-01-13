import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Standing {
  team_id: number;
  team_name: string;
  team_logo: string;
  team_abbr: string;
  conference_name: string;
  conference_logo: string;
  conference_wins: number;
  conference_losses: number;
  conference_win_percentage: number;
  win_percentage: number;
  games_behind: number;
  current_streak: string;
  streak_count: number;
  playoff_seed: number | null;
  wins: number;
  losses: number;
  home_wins: number;
  home_losses: number;
  road_wins: number;
  road_losses: number;
}

interface Conference {
  group_id: number;
  name: string;
  short_name: string;
}

async function getStandings() {
  try {
    const res = await fetch(`${API_BASE}/api/standings?season=2026`, {
      next: { revalidate: 60 }
    });
    if (!res.ok) return { standings: [] };
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch standings:", error);
    return { standings: [] };
  }
}

async function getConferences() {
  try {
    const res = await fetch(`${API_BASE}/api/conferences`, {
      next: { revalidate: 3600 }
    });
    if (!res.ok) return { conferences: [] };
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch conferences:", error);
    return { conferences: [] };
  }
}

export default async function StandingsPage() {
  const [standingsData, conferencesData] = await Promise.all([
    getStandings(),
    getConferences()
  ]);

  const standings = standingsData.standings as Standing[];

  // Group standings by conference
  const standingsByConference = (standings || []).reduce((acc, standing) => {
    const conf = standing.conference_name || 'Independent';
    if (!acc[conf]) acc[conf] = [];
    acc[conf].push(standing);
    return acc;
  }, {} as Record<string, Standing[]>);

  // Sort each conference by playoff_seed (ESPN's official ranking)
  // Teams without a playoff_seed go to the end, sorted by conference record
  Object.keys(standingsByConference).forEach(conf => {
    standingsByConference[conf].sort((a, b) => {
      // Teams with playoff_seed come first, sorted by seed
      if (a.playoff_seed !== null && b.playoff_seed !== null) {
        return a.playoff_seed - b.playoff_seed;
      }
      if (a.playoff_seed !== null) return -1;
      if (b.playoff_seed !== null) return 1;

      // If neither has playoff_seed, sort by conference win percentage
      const confDiff = b.conference_win_percentage - a.conference_win_percentage;
      if (confDiff !== 0) return confDiff;
      return b.win_percentage - a.win_percentage;
    });
  });

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">Conference Standings</h1>
        <p className="mt-2 text-gray-600">2026 Season Conference Records</p>
      </div>

      {standings && standings.length > 0 ? (
        <div className="space-y-8">
          {Object.entries(standingsByConference)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([conference, confStandings]) => (
            <div key={conference} className="bg-white rounded-lg shadow border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  {confStandings[0]?.conference_logo && (
                    <img
                      src={confStandings[0].conference_logo}
                      alt={conference}
                      className="w-10 h-10 object-contain"
                    />
                  )}
                  <h2 className="text-xl font-bold text-gray-900">{conference}</h2>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Team
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Conf
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Overall
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Home
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Away
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Win %
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        GB
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Streak
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {confStandings.map((team, index) => (
                      <tr key={team.team_id} className="hover:bg-gray-50">
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
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                          {team.conference_wins}-{team.conference_losses}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                          {team.wins}-{team.losses}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                          {team.home_wins}-{team.home_losses}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                          {team.road_wins}-{team.road_losses}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                          {team.conference_win_percentage.toFixed(3)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                          {team.games_behind === 0 ? '-' : team.games_behind.toFixed(1)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                          {(() => {
                            const streakNum = parseInt(team.current_streak || '0');
                            if (streakNum === 0) return <span className="text-gray-400">-</span>;
                            const isWinStreak = streakNum > 0;
                            return (
                              <span className={`font-semibold ${
                                isWinStreak ? 'text-emerald-700' : 'text-rose-700'
                              }`}>
                                {isWinStreak ? 'W' : 'L'}{Math.abs(streakNum)}
                              </span>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <p>No standings data available. Make sure the API server is running and standings are populated.</p>
        </div>
      )}
    </div>
  );
}
