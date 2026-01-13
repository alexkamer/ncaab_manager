import Link from "next/link";
import WinProbabilityChart from "./WinProbabilityChart";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Leader {
  team: {
    id: string;
    displayName: string;
    logo: string;
  };
  leaders: Array<{
    displayName: string;
    leaders: Array<{
      displayValue: string;
      athlete: {
        displayName: string;
        shortName: string;
        headshot?: {
          href: string;
          alt: string;
        };
      };
    }>;
  }>;
}

interface Broadcast {
  station: string;
  media: {
    name: string;
  };
}

interface TeamStat {
  name: string;
  displayValue: string;
  abbreviation: string;
  label: string;
}

interface RecentGame {
  date: string;
  opponent_name: string;
  opponent_logo: string;
  team_score: string;
  opponent_score: string;
  won: boolean;
  home_away: string;
}

interface GamePreview {
  event_id: number;
  date: string;
  status: string;
  status_detail: string;
  venue_name: string;
  home_team_name: string;
  home_team_logo: string;
  home_team_color?: string;
  home_team_record?: string;
  home_team_rank?: number;
  home_team_stats?: TeamStat[];
  away_team_name: string;
  away_team_logo: string;
  away_team_color?: string;
  away_team_record?: string;
  away_team_rank?: number;
  away_team_stats?: TeamStat[];
  away_recent_games?: RecentGame[];
  home_recent_games?: RecentGame[];
  leaders?: Leader[];
  predictor?: {
    homeTeam: {
      gameProjection: string;
    };
    awayTeam: {
      gameProjection: string;
    };
  };
  broadcasts?: Broadcast[];
  odds?: Array<{
    details: string;
    overUnder: number;
  }>;
}

async function getGamePreview(eventId: string) {
  try {
    const res = await fetch(`${API_BASE}/api/games/${eventId}/preview`, {
      cache: 'no-store'
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data as GamePreview;
  } catch (error) {
    console.error("Failed to fetch game preview:", error);
    return null;
  }
}

export default async function GamePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const preview = await getGamePreview(id);

  if (!preview) {
    return (
      <div className="space-y-6">
        <Link href="/games" className="text-blue-600 hover:underline">
          ← Back to Games
        </Link>
        <div className="border border-gray-200 p-8 text-center text-gray-500">
          <p>Game preview not available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/games" className="text-blue-600 hover:underline">
        ← Back to Games
      </Link>

      {/* Game Header */}
      <div className="border border-gray-200 p-6">
        <div className="text-center mb-4">
          <div className="text-sm font-semibold text-gray-500 uppercase mb-2">
            {preview.status_detail}
          </div>
          <div className="text-sm text-gray-500">
            {preview.venue_name}
          </div>
        </div>

        {/* Matchup Display */}
        <div className="flex items-center justify-center space-x-8">
          {/* Away Team */}
          <div className="flex flex-col items-center">
            {preview.away_team_logo && (
              <img src={preview.away_team_logo} alt={preview.away_team_name} className="w-24 h-24 mb-3" />
            )}
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">
                {preview.away_team_rank && preview.away_team_rank <= 25 && (
                  <span className="mr-2">#{preview.away_team_rank}</span>
                )}
                {preview.away_team_name}
              </div>
              {preview.away_team_record && (
                <div className="text-sm text-gray-600 mt-1">{preview.away_team_record}</div>
              )}
            </div>
          </div>

          <div className="text-3xl text-gray-400 font-bold">@</div>

          {/* Home Team */}
          <div className="flex flex-col items-center">
            {preview.home_team_logo && (
              <img src={preview.home_team_logo} alt={preview.home_team_name} className="w-24 h-24 mb-3" />
            )}
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">
                {preview.home_team_rank && preview.home_team_rank <= 25 && (
                  <span className="mr-2">#{preview.home_team_rank}</span>
                )}
                {preview.home_team_name}
              </div>
              {preview.home_team_record && (
                <div className="text-sm text-gray-600 mt-1">{preview.home_team_record}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Win Probability */}
      {preview.predictor && (
        <div className="border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Win Probability</h2>
          <WinProbabilityChart
            awayTeamName={preview.away_team_name}
            awayTeamLogo={preview.away_team_logo}
            awayTeamColor={preview.away_team_color}
            awayWinProbability={preview.predictor.awayTeam.gameProjection}
            homeTeamName={preview.home_team_name}
            homeTeamLogo={preview.home_team_logo}
            homeTeamColor={preview.home_team_color}
            homeWinProbability={preview.predictor.homeTeam.gameProjection}
          />
        </div>
      )}

      {/* Last 5 Games */}
      {(preview.away_recent_games && preview.away_recent_games.length > 0) || (preview.home_recent_games && preview.home_recent_games.length > 0) ? (
        <div className="border border-gray-200">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Last 5 Games</h2>
          </div>
          <div className="grid grid-cols-2 divide-x divide-gray-200">
            {/* Away Team Recent Games */}
            <div className="p-4">
              {preview.away_recent_games && preview.away_recent_games.length > 0 && (
                <>
                  <div className="flex items-center space-x-3 mb-3">
                    {preview.away_team_logo && (
                      <img src={preview.away_team_logo} alt={preview.away_team_name} className="w-8 h-8" />
                    )}
                    <h3 className="font-bold text-gray-900">{preview.away_team_name}</h3>
                  </div>
                  <div className="space-y-2">
                    {preview.away_recent_games.slice().reverse().map((game, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm hover:bg-gray-50 p-2 rounded">
                        <div className="flex items-center space-x-3 flex-1">
                          <div
                            className="w-8 h-8 flex items-center justify-center font-bold rounded"
                            style={{
                              backgroundColor: game.won ? '#10b981' : 'transparent',
                              color: game.won ? 'white' : '#6b7280',
                              border: game.won ? 'none' : '2px solid #d1d5db'
                            }}
                          >
                            {game.won ? 'W' : 'L'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {game.home_away === 'home' ? 'vs' : '@'} {game.opponent_name}
                            </div>
                          </div>
                        </div>
                        <div className="font-semibold text-gray-900 ml-2">
                          {game.won ? game.team_score : game.opponent_score}-{game.won ? game.opponent_score : game.team_score}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Home Team Recent Games */}
            <div className="p-4">
              {preview.home_recent_games && preview.home_recent_games.length > 0 && (
                <>
                  <div className="flex items-center space-x-3 mb-3">
                    {preview.home_team_logo && (
                      <img src={preview.home_team_logo} alt={preview.home_team_name} className="w-8 h-8" />
                    )}
                    <h3 className="font-bold text-gray-900">{preview.home_team_name}</h3>
                  </div>
                  <div className="space-y-2">
                    {preview.home_recent_games.slice().reverse().map((game, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm hover:bg-gray-50 p-2 rounded">
                        <div className="flex items-center space-x-3 flex-1">
                          <div
                            className="w-8 h-8 flex items-center justify-center font-bold rounded"
                            style={{
                              backgroundColor: game.won ? '#10b981' : 'transparent',
                              color: game.won ? 'white' : '#6b7280',
                              border: game.won ? 'none' : '2px solid #d1d5db'
                            }}
                          >
                            {game.won ? 'W' : 'L'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {game.home_away === 'home' ? 'vs' : '@'} {game.opponent_name}
                            </div>
                          </div>
                        </div>
                        <div className="font-semibold text-gray-900 ml-2">
                          {game.won ? game.team_score : game.opponent_score}-{game.won ? game.opponent_score : game.team_score}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Team Stats Comparison */}
      {preview.home_team_stats && preview.away_team_stats && (
        <div className="border border-gray-200">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Team Stats Comparison</h2>
          </div>
          <div className="p-6">
            {/* Team Headers */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-300">
              <div className="flex items-center space-x-3 w-2/5">
                {preview.away_team_logo && (
                  <img src={preview.away_team_logo} alt={preview.away_team_name} className="w-12 h-12" />
                )}
                <div>
                  <div className="font-bold text-gray-900 text-lg">{preview.away_team_name}</div>
                  {preview.away_team_record && (
                    <div className="text-sm text-gray-500">{preview.away_team_record}</div>
                  )}
                </div>
              </div>
              <div className="w-1/5 text-center">
                <span className="text-xs font-semibold text-gray-400 uppercase">vs</span>
              </div>
              <div className="flex items-center justify-end space-x-3 w-2/5">
                <div className="text-right">
                  <div className="font-bold text-gray-900 text-lg">{preview.home_team_name}</div>
                  {preview.home_team_record && (
                    <div className="text-sm text-gray-500">{preview.home_team_record}</div>
                  )}
                </div>
                {preview.home_team_logo && (
                  <img src={preview.home_team_logo} alt={preview.home_team_name} className="w-12 h-12" />
                )}
              </div>
            </div>

            {/* Display key stats side by side */}
            {(() => {
              const keyStats = ['avgPoints', 'avgPointsAgainst', 'fieldGoalPct', 'threePointFieldGoalPct', 'avgRebounds', 'avgAssists', 'streak'];

              return keyStats.map((statName) => {
                const awayStat = preview.away_team_stats?.find(s => s.name === statName);
                const homeStat = preview.home_team_stats?.find(s => s.name === statName);

                if (!awayStat && !homeStat) return null;

                // Compare values to highlight the better stat
                const awayValue = parseFloat(awayStat?.displayValue || '0');
                const homeValue = parseFloat(homeStat?.displayValue || '0');

                // For points against, lower is better
                const awayIsBetter = statName === 'avgPointsAgainst'
                  ? awayValue < homeValue && awayValue > 0
                  : awayValue > homeValue;
                const homeIsBetter = statName === 'avgPointsAgainst'
                  ? homeValue < awayValue && homeValue > 0
                  : homeValue > awayValue;

                return (
                  <div key={statName} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0">
                    <div className="w-2/5 text-right">
                      <span
                        className="text-2xl font-bold"
                        style={{
                          color: awayIsBetter
                            ? preview.away_team_color ? `#${preview.away_team_color}` : '#2563eb'
                            : '#9ca3af'
                        }}
                      >
                        {awayStat?.displayValue || '-'}
                      </span>
                    </div>
                    <div className="w-1/5 text-center px-4">
                      <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                        {awayStat?.abbreviation || homeStat?.abbreviation}
                      </div>
                      <div className="text-xs text-gray-400">
                        {awayStat?.label || homeStat?.label}
                      </div>
                    </div>
                    <div className="w-2/5 text-left">
                      <span
                        className="text-2xl font-bold"
                        style={{
                          color: homeIsBetter
                            ? preview.home_team_color ? `#${preview.home_team_color}` : '#16a34a'
                            : '#9ca3af'
                        }}
                      >
                        {homeStat?.displayValue || '-'}
                      </span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Team Leaders */}
      {preview.leaders && preview.leaders.length > 0 && (
        <div className="border border-gray-200">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Team Leaders</h2>
          </div>
          <div className="p-6 space-y-8">
            {preview.leaders.map((teamLeaders, idx) => (
              <div key={idx}>
                <div className="flex items-center space-x-3 mb-4">
                  <img src={teamLeaders.team.logo} alt={teamLeaders.team.displayName} className="w-8 h-8" />
                  <h3 className="text-lg font-bold text-gray-900">{teamLeaders.team.displayName}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {teamLeaders.leaders.map((stat, statIdx) => (
                    <div key={statIdx} className="bg-gray-50 p-4 rounded">
                      <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        {stat.displayName}
                      </div>
                      {stat.leaders.slice(0, 1).map((leader, leaderIdx) => (
                        <div key={leaderIdx} className="flex items-center space-x-3">
                          {leader.athlete.headshot && (
                            <img
                              src={leader.athlete.headshot.href}
                              alt={leader.athlete.headshot.alt}
                              className="w-12 h-12 object-cover rounded-full"
                            />
                          )}
                          <div>
                            <div className="font-semibold text-gray-900">{leader.athlete.shortName}</div>
                            <div className="text-2xl font-bold text-blue-600">{leader.displayValue}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Broadcast & Betting Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Broadcast */}
        {preview.broadcasts && preview.broadcasts.length > 0 && (
          <div className="border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">How to Watch</h3>
            <div className="space-y-2">
              {preview.broadcasts.map((broadcast, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="text-gray-900 font-medium">{broadcast.media.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Betting Lines */}
        {preview.odds && preview.odds.length > 0 && (
          <div className="border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Betting Lines</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Spread:</span>
                <span className="font-semibold text-gray-900">{preview.odds[0].details}</span>
              </div>
              {preview.odds[0].overUnder && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Over/Under:</span>
                  <span className="font-semibold text-gray-900">{preview.odds[0].overUnder}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
