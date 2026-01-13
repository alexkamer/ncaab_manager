import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Team {
  team_id: number;
  display_name: string;
  abbreviation: string;
  logo_url: string;
  color: string;
  venue_name: string;
  venue_city: string;
  venue_state: string;
  conference_name: string;
  conference_abbr: string;
}

async function getTeams() {
  try {
    // Note: Filtering to Division I would require group_id to be populated in team_seasons
    // For now, fetching all teams. The database has ~360 D1 teams out of ~1100 total.
    const res = await fetch(`${API_BASE}/api/teams?season=2026&limit=500`, {
      next: { revalidate: 3600 }
    });
    if (!res.ok) return { teams: [] };
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch teams:", error);
    return { teams: [] };
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

export default async function TeamsPage() {
  const [teamsData, conferencesData] = await Promise.all([
    getTeams(),
    getConferences()
  ]);

  const teams = teamsData.teams as Team[];

  // Group teams by conference
  const teamsByConference = teams.reduce((acc, team) => {
    const conf = team.conference_name || 'Independent';
    if (!acc[conf]) acc[conf] = [];
    acc[conf].push(team);
    return acc;
  }, {} as Record<string, Team[]>);

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">NCAA Division I Basketball Teams</h1>
        <p className="mt-2 text-gray-600">Browse all Division I teams (362 teams with active schedules)</p>
      </div>

      {teams.length > 0 ? (
        <div className="space-y-8">
          {Object.entries(teamsByConference)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([conference, confTeams]) => (
            <div key={conference} className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{conference}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {confTeams.map((team) => (
                  <Link
                    key={team.team_id}
                    href={`/teams/${team.team_id}`}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                  >
                    {team.logo_url && (
                      <img src={team.logo_url} alt={team.display_name} className="w-10 h-10" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{team.display_name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {team.venue_city}, {team.venue_state}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <p>No teams found. Make sure the API server is running.</p>
        </div>
      )}
    </div>
  );
}
