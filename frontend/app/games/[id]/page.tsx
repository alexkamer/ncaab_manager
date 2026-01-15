import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface PlayerStat {
  athlete_id?: number;
  full_name?: string;
  display_name?: string;
  position_name?: string;
  starter?: boolean;
  minutes_played?: number;
  points?: number;
  field_goals_made?: number;
  field_goals_attempted?: number;
  three_point_made?: number;
  three_point_attempted?: number;
  free_throws_made?: number;
  free_throws_attempted?: number;
  rebounds?: number;
  assists?: number;
  turnovers?: number;
  steals?: number;
  blocks?: number;
  fouls?: number;
  // ESPN format
  athlete?: {
    id: string;
    displayName: string;
    shortName: string;
    jersey: string;
    position: { abbreviation: string };
    headshot?: { href: string };
  };
  stats?: string[];
}

interface TeamPlayerStats {
  team: {
    id: string;
    displayName: string;
    abbreviation: string;
    logo: string;
    color?: string;
  };
  statistics: Array<{
    names: string[];
    labels: string[];
    athletes: PlayerStat[];
  }>;
}

interface TeamStat {
  name: string;
  displayValue: string;
  label: string;
  abbreviation?: string;
}

interface TeamStats {
  team: {
    id: string;
    displayName: string;
    abbreviation: string;
    logo: string;
  };
  statistics: TeamStat[];
  homeAway: string;
}

interface GamePrediction {
  prediction_id: number;
  event_id: number;
  matchup_quality?: number;
  home_win_probability?: number;
  home_predicted_margin?: number;
  away_win_probability?: number;
  away_predicted_margin?: number;
  home_game_score?: number;
  away_game_score?: number;
  home_prediction_correct?: boolean;
  away_prediction_correct?: boolean;
  margin_error?: number;
}

interface GameOdds {
  odds_id: number;
  event_id: number;
  provider_name?: string;
  over_under?: number;
  over_odds?: number;
  under_odds?: number;
  open_total?: number;
  close_total?: number;
  spread?: number;
  away_is_favorite?: boolean;
  away_moneyline?: number;
  away_spread_odds?: number;
  away_open_spread?: number;
  away_close_spread?: number;
  home_is_favorite?: boolean;
  home_moneyline?: number;
  home_spread_odds?: number;
  home_open_spread?: number;
  home_close_spread?: number;
  moneyline_winner?: boolean;
  spread_winner?: boolean;
  over_under_result?: string;
}

interface GameDetail {
  event_id: number;
  date: string;
  home_team_name: string;
  home_team_abbr: string;
  home_team_logo: string;
  home_team_color?: string;
  home_score: number;
  home_team_ap_rank?: number;
  home_team_id?: number;
  home_line_scores?: string[];
  away_team_name: string;
  away_team_abbr: string;
  away_team_logo: string;
  away_team_color?: string;
  away_score: number;
  away_team_ap_rank?: number;
  away_line_scores?: string[];
  status: string;
  status_detail?: string;
  venue_name: string;
  attendance?: number;
  is_completed?: boolean;
  player_stats?: PlayerStat[];
  players?: TeamPlayerStats[];
  team_stats?: TeamStats[];
  prediction?: GamePrediction;
  odds?: GameOdds;
  source?: string;
}

async function getGameDetail(eventId: string) {
  try {
    const res = await fetch(`${API_BASE}/api/games/${eventId}`, {
      cache: 'no-store'
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data as GameDetail;
  } catch (error) {
    console.error("Failed to fetch game detail:", error);
    return null;
  }
}

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = await getGameDetail(id);

  if (!game) {
    return (
      <div className="space-y-6">
        <Link href="/games" className="text-blue-600 hover:underline">
          ← Back to Games
        </Link>
        <div className="border border-gray-200 p-8 text-center text-gray-500">
          <p>Game not found.</p>
        </div>
      </div>
    );
  }

  const awayWon = game.away_score > game.home_score;
  const homeWon = game.home_score > game.away_score;

  // If logos are missing from game object, try to get them from players array (ESPN source)
  let homeTeamLogo = game.home_team_logo;
  let awayTeamLogo = game.away_team_logo;

  if (game.source === 'espn' && game.players) {
    // Find team logos from players array
    game.players.forEach((teamData) => {
      if (teamData.team.abbreviation === game.home_team_abbr && !homeTeamLogo) {
        homeTeamLogo = teamData.team.logo;
      }
      if (teamData.team.abbreviation === game.away_team_abbr && !awayTeamLogo) {
        awayTeamLogo = teamData.team.logo;
      }
    });
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
            {game.status_detail || game.status}
          </div>
          {(game.venue_name || game.attendance) && (
            <div className="text-sm text-gray-500">
              {game.venue_name}
              {game.venue_name && game.attendance && ' • '}
              {game.attendance && `${game.attendance.toLocaleString()} attendance`}
            </div>
          )}
        </div>

        {/* Score Display */}
        <div className="flex items-center justify-center space-x-8">
          {/* Away Team */}
          <div className="flex items-center space-x-4">
            {awayTeamLogo && (
              <img src={awayTeamLogo} alt={game.away_team_name} className="w-16 h-16" />
            )}
            <div className="text-right">
              <div className={`text-lg font-semibold ${awayWon ? 'text-gray-900' : 'text-gray-600'}`}>
                {game.away_team_ap_rank && game.away_team_ap_rank <= 25 && (
                  <span className="font-bold mr-2">#{game.away_team_ap_rank}</span>
                )}
                {game.away_team_name}
              </div>
              <div className={`text-4xl font-bold ${awayWon ? 'text-gray-900' : 'text-gray-400'}`}>
                {game.away_score}
              </div>
            </div>
          </div>

          <div className="text-2xl text-gray-400">@</div>

          {/* Home Team */}
          <div className="flex items-center space-x-4">
            <div className="text-left">
              <div className={`text-lg font-semibold ${homeWon ? 'text-gray-900' : 'text-gray-600'}`}>
                {game.home_team_ap_rank && game.home_team_ap_rank <= 25 && (
                  <span className="font-bold mr-2">#{game.home_team_ap_rank}</span>
                )}
                {game.home_team_name}
              </div>
              <div className={`text-4xl font-bold ${homeWon ? 'text-gray-900' : 'text-gray-400'}`}>
                {game.home_score}
              </div>
            </div>
            {homeTeamLogo && (
              <img src={homeTeamLogo} alt={game.home_team_name} className="w-16 h-16" />
            )}
          </div>
        </div>
      </div>

      {/* Line Score */}
      {(game.home_line_scores && game.home_line_scores.length > 0 &&
        game.away_line_scores && game.away_line_scores.length > 0) && (
        <div className="border border-gray-200">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Scoring by Period</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold text-gray-700">Team</th>
                  {game.home_line_scores.map((_, idx) => (
                    <th key={idx} className="text-center px-4 py-3 font-semibold text-gray-700">
                      {idx === 0 ? '1st' : idx === 1 ? '2nd' : `OT${idx - 1}`}
                    </th>
                  ))}
                  <th className="text-center px-6 py-3 font-semibold text-gray-700 bg-gray-200">T</th>
                </tr>
              </thead>
              <tbody>
                {/* Away Team */}
                <tr className="border-t border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <div className="flex items-center space-x-3">
                      {awayTeamLogo && (
                        <img src={awayTeamLogo} alt={game.away_team_name} className="w-6 h-6" />
                      )}
                      <span className={`font-medium ${awayWon ? 'text-gray-900' : 'text-gray-600'}`}>
                        {game.away_team_ap_rank && game.away_team_ap_rank <= 25 && (
                          <span className="font-bold mr-1">#{game.away_team_ap_rank}</span>
                        )}
                        {game.away_team_name}
                      </span>
                    </div>
                  </td>
                  {game.away_line_scores.map((score, idx) => (
                    <td key={idx} className="text-center px-4 py-3 font-medium text-gray-700">
                      {score}
                    </td>
                  ))}
                  <td className={`text-center px-6 py-3 font-bold text-lg bg-gray-100 ${awayWon ? 'text-gray-900' : 'text-gray-600'}`}>
                    {game.away_score}
                  </td>
                </tr>
                {/* Home Team */}
                <tr className="border-t border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <div className="flex items-center space-x-3">
                      {homeTeamLogo && (
                        <img src={homeTeamLogo} alt={game.home_team_name} className="w-6 h-6" />
                      )}
                      <span className={`font-medium ${homeWon ? 'text-gray-900' : 'text-gray-600'}`}>
                        {game.home_team_ap_rank && game.home_team_ap_rank <= 25 && (
                          <span className="font-bold mr-1">#{game.home_team_ap_rank}</span>
                        )}
                        {game.home_team_name}
                      </span>
                    </div>
                  </td>
                  {game.home_line_scores.map((score, idx) => (
                    <td key={idx} className="text-center px-4 py-3 font-medium text-gray-700">
                      {score}
                    </td>
                  ))}
                  <td className={`text-center px-6 py-3 font-bold text-lg bg-gray-100 ${homeWon ? 'text-gray-900' : 'text-gray-600'}`}>
                    {game.home_score}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Game Flow Visualization */}
      {game.is_completed && game.home_line_scores && game.away_line_scores &&
       game.home_line_scores.length > 0 && game.away_line_scores.length > 0 && (
        <div className="border border-gray-200">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Game Flow</h2>
          </div>
          <div className="p-6">
            {(() => {
              // Calculate running scores for each period
              const periods = game.home_line_scores.length;
              let awayRunningScores = [0];
              let homeRunningScores = [0];

              for (let i = 0; i < periods; i++) {
                awayRunningScores.push(awayRunningScores[i] + parseInt(game.away_line_scores[i]));
                homeRunningScores.push(homeRunningScores[i] + parseInt(game.home_line_scores[i]));
              }

              const maxScore = Math.max(...awayRunningScores, ...homeRunningScores);
              const periodLabels = ['Start', ...Array.from({ length: periods }, (_, i) =>
                i === 0 ? '1st' : i === 1 ? '2nd' : `OT${i - 1}`
              )];

              return (
                <div className="space-y-4">
                  {/* Score progression chart */}
                  <div className="relative" style={{ height: '300px' }}>
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-gray-500 pr-2 text-right">
                      <span>{maxScore}</span>
                      <span>{Math.floor(maxScore * 0.75)}</span>
                      <span>{Math.floor(maxScore * 0.5)}</span>
                      <span>{Math.floor(maxScore * 0.25)}</span>
                      <span>0</span>
                    </div>

                    {/* Chart area */}
                    <div className="absolute left-12 right-0 top-0 bottom-8">
                      {/* Grid lines */}
                      <div className="absolute inset-0">
                        {[0, 25, 50, 75, 100].map((pct) => (
                          <div
                            key={pct}
                            className="absolute w-full border-t border-gray-200"
                            style={{ bottom: `${pct}%` }}
                          />
                        ))}
                      </div>

                      {/* Away team line */}
                      <svg className="absolute inset-0" preserveAspectRatio="none">
                        <polyline
                          points={awayRunningScores.map((score, idx) => {
                            const x = (idx / periods) * 100;
                            const y = 100 - (score / maxScore * 100);
                            return `${x}%,${y}%`;
                          }).join(' ')}
                          fill="none"
                          stroke="rgb(37, 99, 235)"
                          strokeWidth="3"
                          vectorEffect="non-scaling-stroke"
                        />
                        {awayRunningScores.map((score, idx) => {
                          const x = (idx / periods) * 100;
                          const y = 100 - (score / maxScore * 100);
                          return (
                            <circle
                              key={`away-${idx}`}
                              cx={`${x}%`}
                              cy={`${y}%`}
                              r="4"
                              fill="rgb(37, 99, 235)"
                            />
                          );
                        })}
                      </svg>

                      {/* Home team line */}
                      <svg className="absolute inset-0" preserveAspectRatio="none">
                        <polyline
                          points={homeRunningScores.map((score, idx) => {
                            const x = (idx / periods) * 100;
                            const y = 100 - (score / maxScore * 100);
                            return `${x}%,${y}%`;
                          }).join(' ')}
                          fill="none"
                          stroke="rgb(220, 38, 38)"
                          strokeWidth="3"
                          vectorEffect="non-scaling-stroke"
                        />
                        {homeRunningScores.map((score, idx) => {
                          const x = (idx / periods) * 100;
                          const y = 100 - (score / maxScore * 100);
                          return (
                            <circle
                              key={`home-${idx}`}
                              cx={`${x}%`}
                              cy={`${y}%`}
                              r="4"
                              fill="rgb(220, 38, 38)"
                            />
                          );
                        })}
                      </svg>
                    </div>

                    {/* X-axis labels */}
                    <div className="absolute left-12 right-0 bottom-0 h-8 flex justify-between text-xs text-gray-500">
                      {periodLabels.map((label, idx) => (
                        <span key={idx} className="flex-1 text-center">{label}</span>
                      ))}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-center space-x-6 pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-blue-600 rounded"></div>
                      <img src={game.away_team_logo} alt="" className="w-5 h-5" />
                      <span className="text-sm font-medium text-gray-700">{game.away_team_name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-red-600 rounded"></div>
                      <img src={game.home_team_logo} alt="" className="w-5 h-5" />
                      <span className="text-sm font-medium text-gray-700">{game.home_team_name}</span>
                    </div>
                  </div>

                  {/* Period-by-period breakdown */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
                    {game.away_line_scores.map((awayScore, idx) => {
                      const homeScore = parseInt(game.home_line_scores![idx]);
                      const awaySc = parseInt(awayScore);
                      const periodLabel = idx === 0 ? '1st Half' : idx === 1 ? '2nd Half' : `OT ${idx - 1}`;

                      return (
                        <div key={idx} className="bg-gray-50 border border-gray-200 rounded p-3">
                          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">{periodLabel}</div>
                          <div className="flex justify-between items-center">
                            <div className="text-center">
                              <div className="text-sm text-gray-600">{game.away_team_abbr}</div>
                              <div className={`text-xl font-bold ${awaySc > homeScore ? 'text-gray-900' : 'text-gray-400'}`}>
                                {awayScore}
                              </div>
                            </div>
                            <div className="text-gray-400">-</div>
                            <div className="text-center">
                              <div className="text-sm text-gray-600">{game.home_team_abbr}</div>
                              <div className={`text-xl font-bold ${homeScore > awaySc ? 'text-gray-900' : 'text-gray-400'}`}>
                                {homeScore}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Game Predictions */}
      {game.prediction && (game.prediction.home_win_probability || game.prediction.away_win_probability) && (
        <div className="border border-gray-200">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">ESPN Game Predictions</h2>
            {game.prediction.matchup_quality && (
              <p className="text-xs text-gray-500 mt-1">
                Matchup Quality: {game.prediction.matchup_quality.toFixed(1)}%
              </p>
            )}
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {/* Win Probability */}
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Win Probability
                </div>
                <div className="space-y-4">
                  {/* Away Team */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <img src={game.away_team_logo} alt={game.away_team_name} className="w-6 h-6" />
                        <span className="font-medium text-gray-900">{game.away_team_name}</span>
                      </div>
                      <span className="text-2xl font-bold text-gray-900">
                        {game.prediction.away_win_probability?.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${game.prediction.away_win_probability || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Home Team */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <img src={game.home_team_logo} alt={game.home_team_name} className="w-6 h-6" />
                        <span className="font-medium text-gray-900">{game.home_team_name}</span>
                      </div>
                      <span className="text-2xl font-bold text-gray-900">
                        {game.prediction.home_win_probability?.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-red-600 transition-all duration-500"
                        style={{ width: `${game.prediction.home_win_probability || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Predicted Margins */}
              {(game.prediction.home_predicted_margin || game.prediction.away_predicted_margin) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <img src={game.away_team_logo} alt={game.away_team_name} className="w-5 h-5" />
                      <span className="text-sm font-medium text-gray-600">Predicted Margin</span>
                    </div>
                    <div className="text-3xl font-bold text-blue-800">
                      {game.prediction.away_predicted_margin && game.prediction.away_predicted_margin > 0 ? '+' : ''}
                      {game.prediction.away_predicted_margin?.toFixed(1)}
                    </div>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <img src={game.home_team_logo} alt={game.home_team_name} className="w-5 h-5" />
                      <span className="text-sm font-medium text-gray-600">Predicted Margin</span>
                    </div>
                    <div className="text-3xl font-bold text-red-800">
                      {game.prediction.home_predicted_margin && game.prediction.home_predicted_margin > 0 ? '+' : ''}
                      {game.prediction.home_predicted_margin?.toFixed(1)}
                    </div>
                  </div>
                </div>
              )}

              {/* Post-Game Prediction Accuracy */}
              {game.is_completed && game.prediction.margin_error !== undefined && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Prediction Accuracy</div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-600">Margin Error: </span>
                      <span className="text-lg font-bold text-gray-900">
                        {Math.abs(game.prediction.margin_error).toFixed(1)} points
                      </span>
                    </div>
                    {game.prediction.home_prediction_correct !== undefined && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Winner: </span>
                        {game.prediction.home_prediction_correct || game.prediction.away_prediction_correct ? (
                          <span className="text-green-600 font-semibold">✓ Correct</span>
                        ) : (
                          <span className="text-red-600 font-semibold">✗ Incorrect</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Betting Odds */}
      {game.odds && (
        <div className="border border-gray-200">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Betting Lines</h2>
            {game.odds.provider_name && (
              <p className="text-xs text-gray-500 mt-1">Source: {game.odds.provider_name}</p>
            )}
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Spread */}
              {game.odds.spread !== undefined && game.odds.spread !== null && (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide pb-2 border-b border-gray-200">
                    Point Spread
                  </div>
                  <div className="space-y-3">
                    {/* Current/Closing Spread */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="text-xs text-gray-600 mb-1">Current Line</div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-700">{game.away_team_abbr}</div>
                          <div className="text-2xl font-bold text-green-800">
                            {game.odds.away_is_favorite ? '-' : '+'}{game.odds.spread}
                          </div>
                          {game.odds.away_spread_odds && (
                            <div className="text-xs text-gray-500">({game.odds.away_spread_odds > 0 ? '+' : ''}{game.odds.away_spread_odds})</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-700">{game.home_team_abbr}</div>
                          <div className="text-2xl font-bold text-green-800">
                            {game.odds.home_is_favorite ? '-' : '+'}{game.odds.spread}
                          </div>
                          {game.odds.home_spread_odds && (
                            <div className="text-xs text-gray-500">({game.odds.home_spread_odds > 0 ? '+' : ''}{game.odds.home_spread_odds})</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Opening Spread */}
                    {(game.odds.away_open_spread || game.odds.home_open_spread) && (
                      <div className="text-xs text-gray-500">
                        <div className="flex justify-between">
                          <span>Opening: {game.away_team_abbr} {game.odds.away_open_spread && ((game.odds.away_is_favorite ? '-' : '+') + game.odds.away_open_spread)}</span>
                          <span>{game.home_team_abbr} {game.odds.home_open_spread && ((game.odds.home_is_favorite ? '-' : '+') + game.odds.home_open_spread)}</span>
                        </div>
                      </div>
                    )}

                    {/* Post-Game Result */}
                    {game.is_completed && game.odds.spread_winner !== undefined && (
                      <div className="text-xs">
                        {game.odds.spread_winner ? (
                          <span className="text-green-600 font-semibold">✓ Cover</span>
                        ) : (
                          <span className="text-red-600 font-semibold">✗ No Cover</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Moneyline */}
              {(game.odds.home_moneyline || game.odds.away_moneyline) && (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide pb-2 border-b border-gray-200">
                    Moneyline
                  </div>
                  <div className="space-y-2">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">{game.away_team_abbr}</div>
                          <div className="text-2xl font-bold text-blue-800">
                            {game.odds.away_moneyline && (game.odds.away_moneyline > 0 ? '+' : '')}{game.odds.away_moneyline}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-700 mb-1">{game.home_team_abbr}</div>
                          <div className="text-2xl font-bold text-blue-800">
                            {game.odds.home_moneyline && (game.odds.home_moneyline > 0 ? '+' : '')}{game.odds.home_moneyline}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Post-Game Result */}
                    {game.is_completed && game.odds.moneyline_winner !== undefined && (
                      <div className="text-xs text-center">
                        <span className="text-gray-600">Winner: </span>
                        <span className="font-semibold text-gray-900">
                          {game.odds.moneyline_winner ? game.away_team_abbr : game.home_team_abbr}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Over/Under */}
              {game.odds.over_under && (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide pb-2 border-b border-gray-200">
                    Total (Over/Under)
                  </div>
                  <div className="space-y-3">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="text-xs text-gray-600 mb-1">Current Total</div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-800 mb-2">
                          {game.odds.over_under}
                        </div>
                        <div className="flex justify-between text-xs text-gray-600">
                          <div>
                            O: {game.odds.over_odds && ((game.odds.over_odds > 0 ? '+' : '') + game.odds.over_odds)}
                          </div>
                          <div>
                            U: {game.odds.under_odds && ((game.odds.under_odds > 0 ? '+' : '') + game.odds.under_odds)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Opening/Closing Total */}
                    {(game.odds.open_total || game.odds.close_total) && (
                      <div className="text-xs text-gray-500 space-y-1">
                        {game.odds.open_total && (
                          <div>Opening: {game.odds.open_total}</div>
                        )}
                        {game.odds.close_total && game.odds.close_total !== game.odds.over_under && (
                          <div>Closing: {game.odds.close_total}</div>
                        )}
                      </div>
                    )}

                    {/* Post-Game Result */}
                    {game.is_completed && game.odds.over_under_result && (
                      <div className="text-center">
                        <div className="text-xs text-gray-600 mb-1">
                          Total Score: {game.home_score + game.away_score}
                        </div>
                        <div className="text-sm font-semibold">
                          {game.odds.over_under_result === 'over' ? (
                            <span className="text-green-600">✓ Over</span>
                          ) : game.odds.over_under_result === 'under' ? (
                            <span className="text-red-600">✓ Under</span>
                          ) : (
                            <span className="text-gray-600">Push</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Team Leaders */}
      {game.is_completed && (
        <>
          {(() => {
            // Extract team leaders based on format
            let awayLeaders: { points: any[], rebounds: any[], assists: any[] } = { points: [], rebounds: [], assists: [] };
            let homeLeaders: { points: any[], rebounds: any[], assists: any[] } = { points: [], rebounds: [], assists: [] };

            if (game.source === 'espn' && game.players) {
              // ESPN format
              game.players.forEach((teamData) => {
                const allPlayers = teamData.statistics[0]?.athletes || [];
                const isHomeTeam = teamData.team.id === game.home_team_id;
                const leaders = isHomeTeam ? homeLeaders : awayLeaders;

                // Find points index
                const pointsIndex = teamData.statistics[0]?.labels?.indexOf('PTS') ?? -1;
                const reboundsIndex = teamData.statistics[0]?.labels?.indexOf('REB') ?? -1;
                const assistsIndex = teamData.statistics[0]?.labels?.indexOf('AST') ?? -1;

                if (pointsIndex !== -1) {
                  leaders.points = allPlayers
                    .map(p => ({ ...p, value: parseInt(p.stats?.[pointsIndex] || '0') }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 3);
                }
                if (reboundsIndex !== -1) {
                  leaders.rebounds = allPlayers
                    .map(p => ({ ...p, value: parseInt(p.stats?.[reboundsIndex] || '0') }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 3);
                }
                if (assistsIndex !== -1) {
                  leaders.assists = allPlayers
                    .map(p => ({ ...p, value: parseInt(p.stats?.[assistsIndex] || '0') }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 3);
                }
              });
            } else if (game.player_stats && game.player_stats.length > 0) {
              // Database format
              const playersByTeam = game.player_stats.reduce((acc, player) => {
                const teamId = (player as any).team_id;
                if (!acc[teamId]) acc[teamId] = [];
                acc[teamId].push(player);
                return acc;
              }, {} as Record<number, any[]>);

              Object.entries(playersByTeam).forEach(([teamId, players]) => {
                const isHomeTeam = Number(teamId) === game.home_team_id;
                const leaders = isHomeTeam ? homeLeaders : awayLeaders;

                leaders.points = players
                  .map(p => ({ ...p, value: p.points || 0 }))
                  .sort((a, b) => b.value - a.value)
                  .slice(0, 3);

                leaders.rebounds = players
                  .map(p => ({ ...p, value: p.rebounds || 0 }))
                  .sort((a, b) => b.value - a.value)
                  .slice(0, 3);

                leaders.assists = players
                  .map(p => ({ ...p, value: p.assists || 0 }))
                  .sort((a, b) => b.value - a.value)
                  .slice(0, 3);
              });
            }

            if (awayLeaders.points.length === 0 && homeLeaders.points.length === 0) return null;

            return (
              <div className="border border-gray-200">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900">Team Leaders</h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Points Leaders */}
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-200">
                        Points
                      </div>
                      <div className="space-y-3">
                        {awayLeaders.points.slice(0, 1).map((player, idx) => (
                          <div key={`away-pts-${idx}`} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 flex-1">
                              <img src={game.away_team_logo} alt="" className="w-5 h-5" />
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {game.source === 'espn' ? player.athlete?.displayName : (player.display_name || player.full_name)}
                              </span>
                            </div>
                            <span className="text-lg font-bold text-gray-900 ml-2">{player.value}</span>
                          </div>
                        ))}
                        {homeLeaders.points.slice(0, 1).map((player, idx) => (
                          <div key={`home-pts-${idx}`} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 flex-1">
                              <img src={game.home_team_logo} alt="" className="w-5 h-5" />
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {game.source === 'espn' ? player.athlete?.displayName : (player.display_name || player.full_name)}
                              </span>
                            </div>
                            <span className="text-lg font-bold text-gray-900 ml-2">{player.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Rebounds Leaders */}
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-200">
                        Rebounds
                      </div>
                      <div className="space-y-3">
                        {awayLeaders.rebounds.slice(0, 1).map((player, idx) => (
                          <div key={`away-reb-${idx}`} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 flex-1">
                              <img src={game.away_team_logo} alt="" className="w-5 h-5" />
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {game.source === 'espn' ? player.athlete?.displayName : (player.display_name || player.full_name)}
                              </span>
                            </div>
                            <span className="text-lg font-bold text-gray-900 ml-2">{player.value}</span>
                          </div>
                        ))}
                        {homeLeaders.rebounds.slice(0, 1).map((player, idx) => (
                          <div key={`home-reb-${idx}`} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 flex-1">
                              <img src={game.home_team_logo} alt="" className="w-5 h-5" />
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {game.source === 'espn' ? player.athlete?.displayName : (player.display_name || player.full_name)}
                              </span>
                            </div>
                            <span className="text-lg font-bold text-gray-900 ml-2">{player.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Assists Leaders */}
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-200">
                        Assists
                      </div>
                      <div className="space-y-3">
                        {awayLeaders.assists.slice(0, 1).map((player, idx) => (
                          <div key={`away-ast-${idx}`} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 flex-1">
                              <img src={game.away_team_logo} alt="" className="w-5 h-5" />
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {game.source === 'espn' ? player.athlete?.displayName : (player.display_name || player.full_name)}
                              </span>
                            </div>
                            <span className="text-lg font-bold text-gray-900 ml-2">{player.value}</span>
                          </div>
                        ))}
                        {homeLeaders.assists.slice(0, 1).map((player, idx) => (
                          <div key={`home-ast-${idx}`} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 flex-1">
                              <img src={game.home_team_logo} alt="" className="w-5 h-5" />
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {game.source === 'espn' ? player.athlete?.displayName : (player.display_name || player.full_name)}
                              </span>
                            </div>
                            <span className="text-lg font-bold text-gray-900 ml-2">{player.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* Game Summary */}
      {game.is_completed && game.team_stats && game.team_stats.length === 2 && (
        <>
          {(() => {
            const awayStats = game.team_stats.find((t: any) => t.homeAway === 'away' || t.home_away === 'away');
            const homeStats = game.team_stats.find((t: any) => t.homeAway === 'home' || t.home_away === 'home');

            if (!awayStats || !homeStats) return null;

            // Check format
            const isESPNFormat = awayStats.statistics !== undefined;

            let awayTurnovers, homeTurnovers;
            let awayFastBreak, homeFastBreak, awayPaint, homePaint, awayBench, homeBench;
            let awayLargestLead, homeLargestLead;

            if (isESPNFormat) {
              // ESPN format
              const getStatValue = (stats: any[], name: string) => {
                return stats.find((s: any) => s.name === name)?.displayValue || '0';
              };

              awayTurnovers = getStatValue(awayStats.statistics, 'turnovers');
              homeTurnovers = getStatValue(homeStats.statistics, 'turnovers');
              awayFastBreak = getStatValue(awayStats.statistics, 'fastBreakPoints');
              homeFastBreak = getStatValue(homeStats.statistics, 'fastBreakPoints');
              awayPaint = getStatValue(awayStats.statistics, 'pointsInPaint');
              homePaint = getStatValue(homeStats.statistics, 'pointsInPaint');
              awayBench = getStatValue(awayStats.statistics, 'benchPoints');
              homeBench = getStatValue(homeStats.statistics, 'benchPoints');
              awayLargestLead = getStatValue(awayStats.statistics, 'largestLead');
              homeLargestLead = getStatValue(homeStats.statistics, 'largestLead');
            } else {
              // Database format
              awayTurnovers = awayStats.total_turnovers || awayStats.turnovers || 0;
              homeTurnovers = homeStats.total_turnovers || homeStats.turnovers || 0;
              awayFastBreak = awayStats.fast_break_points || 0;
              homeFastBreak = homeStats.fast_break_points || 0;
              awayPaint = awayStats.points_in_paint || 0;
              homePaint = homeStats.points_in_paint || 0;
              awayBench = awayStats.bench_points || 0;
              homeBench = homeStats.bench_points || 0;
              awayLargestLead = awayStats.largest_lead || 0;
              homeLargestLead = homeStats.largest_lead || 0;
            }

            return (
              <div className="border border-gray-200">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900">Key Stats</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {/* Turnovers */}
                    <div className="flex items-center">
                      <div className="w-32 text-xs font-semibold text-gray-500 uppercase tracking-wide">Turnovers</div>
                      <div className="flex-1 flex items-center justify-between px-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-600">{game.away_team_abbreviation}</span>
                          <span className="text-xl font-bold text-gray-900">{awayTurnovers}</span>
                        </div>
                        <div className="flex-1 mx-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gray-300 transition-all duration-500"
                            style={{
                              width: `${(Number(awayTurnovers) / (Number(awayTurnovers) + Number(homeTurnovers)) * 100).toFixed(0)}%`
                            }}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xl font-bold text-gray-900">{homeTurnovers}</span>
                          <span className="text-sm font-medium text-gray-600">{game.home_team_abbreviation}</span>
                        </div>
                      </div>
                    </div>

                    {/* Fast Break Points */}
                    <div className="flex items-center">
                      <div className="w-32 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fast Break</div>
                      <div className="flex-1 flex items-center justify-between px-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-600">{game.away_team_abbreviation}</span>
                          <span className="text-xl font-bold text-gray-900">{awayFastBreak}</span>
                        </div>
                        <div className="flex-1 mx-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gray-400 transition-all duration-500"
                            style={{
                              width: `${(Number(awayFastBreak) / (Number(awayFastBreak) + Number(homeFastBreak) || 1) * 100).toFixed(0)}%`
                            }}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xl font-bold text-gray-900">{homeFastBreak}</span>
                          <span className="text-sm font-medium text-gray-600">{game.home_team_abbreviation}</span>
                        </div>
                      </div>
                    </div>

                    {/* Points in Paint */}
                    <div className="flex items-center">
                      <div className="w-32 text-xs font-semibold text-gray-500 uppercase tracking-wide">Points in Paint</div>
                      <div className="flex-1 flex items-center justify-between px-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-600">{game.away_team_abbreviation}</span>
                          <span className="text-xl font-bold text-gray-900">{awayPaint}</span>
                        </div>
                        <div className="flex-1 mx-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gray-500 transition-all duration-500"
                            style={{
                              width: `${(Number(awayPaint) / (Number(awayPaint) + Number(homePaint) || 1) * 100).toFixed(0)}%`
                            }}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xl font-bold text-gray-900">{homePaint}</span>
                          <span className="text-sm font-medium text-gray-600">{game.home_team_abbreviation}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bench Points */}
                    <div className="flex items-center">
                      <div className="w-32 text-xs font-semibold text-gray-500 uppercase tracking-wide">Bench Points</div>
                      <div className="flex-1 flex items-center justify-between px-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-600">{game.away_team_abbreviation}</span>
                          <span className="text-xl font-bold text-gray-900">{awayBench}</span>
                        </div>
                        <div className="flex-1 mx-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gray-600 transition-all duration-500"
                            style={{
                              width: `${(Number(awayBench) / (Number(awayBench) + Number(homeBench) || 1) * 100).toFixed(0)}%`
                            }}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xl font-bold text-gray-900">{homeBench}</span>
                          <span className="text-sm font-medium text-gray-600">{game.home_team_abbreviation}</span>
                        </div>
                      </div>
                    </div>

                    {/* Largest Lead */}
                    <div className="flex items-center">
                      <div className="w-32 text-xs font-semibold text-gray-500 uppercase tracking-wide">Largest Lead</div>
                      <div className="flex-1 flex items-center justify-between px-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-600">{game.away_team_abbreviation}</span>
                          <span className="text-xl font-bold text-gray-900">{awayLargestLead}</span>
                        </div>
                        <div className="flex-1 mx-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gray-700 transition-all duration-500"
                            style={{
                              width: `${(Number(awayLargestLead) / (Number(awayLargestLead) + Number(homeLargestLead) || 1) * 100).toFixed(0)}%`
                            }}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xl font-bold text-gray-900">{homeLargestLead}</span>
                          <span className="text-sm font-medium text-gray-600">{game.home_team_abbreviation}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* Betting Information */}
      {!game.is_completed && (game.spread !== null && game.spread !== undefined || game.over_under) && (
        <div className="border border-gray-200">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Betting Information</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Spread */}
              {(game.spread !== null && game.spread !== undefined) && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-600 mb-2">Point Spread</div>
                  <div className="text-3xl font-bold text-green-800">
                    {game.favorite_abbr} {game.spread > 0 ? '+' : ''}{game.spread}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {game.favorite_abbr} favored by {Math.abs(game.spread)} points
                  </div>
                </div>
              )}

              {/* Over/Under */}
              {game.over_under && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-600 mb-2">Over/Under</div>
                  <div className="text-3xl font-bold text-blue-800">
                    {game.over_under}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Total points over/under
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shooting Efficiency Visualization */}
      {game.is_completed && game.team_stats && game.team_stats.length === 2 && (
        <>
          {(() => {
            const awayStats = game.team_stats.find((t: any) => t.homeAway === 'away' || t.home_away === 'away');
            const homeStats = game.team_stats.find((t: any) => t.homeAway === 'home' || t.home_away === 'home');

            if (!awayStats || !homeStats) return null;

            const isESPNFormat = awayStats.statistics !== undefined;

            // Extract shooting stats
            let awayFGPct, homeFGPct, away3PPct, home3PPct, awayFTPct, homeFTPct;
            let awayFGM, awayFGA, homeFGM, homeFGA;
            let away3PM, away3PA, home3PM, home3PA;
            let awayFTM, awayFTA, homeFTM, homeFTA;

            if (isESPNFormat) {
              const getStatValue = (stats: any[], name: string) => {
                const stat = stats.find((s: any) => s.name === name);
                return stat?.displayValue || '0';
              };

              const awayFGStr = getStatValue(awayStats.statistics, 'fieldGoalsMade-fieldGoalsAttempted');
              const homeFGStr = getStatValue(homeStats.statistics, 'fieldGoalsMade-fieldGoalsAttempted');
              [awayFGM, awayFGA] = awayFGStr.split('-').map(Number);
              [homeFGM, homeFGA] = homeFGStr.split('-').map(Number);

              const away3PStr = getStatValue(awayStats.statistics, 'threePointFieldGoalsMade-threePointFieldGoalsAttempted');
              const home3PStr = getStatValue(homeStats.statistics, 'threePointFieldGoalsMade-threePointFieldGoalsAttempted');
              [away3PM, away3PA] = away3PStr.split('-').map(Number);
              [home3PM, home3PA] = home3PStr.split('-').map(Number);

              const awayFTStr = getStatValue(awayStats.statistics, 'freeThrowsMade-freeThrowsAttempted');
              const homeFTStr = getStatValue(homeStats.statistics, 'freeThrowsMade-freeThrowsAttempted');
              [awayFTM, awayFTA] = awayFTStr.split('-').map(Number);
              [homeFTM, homeFTA] = homeFTStr.split('-').map(Number);

              awayFGPct = parseFloat(getStatValue(awayStats.statistics, 'fieldGoalPct'));
              homeFGPct = parseFloat(getStatValue(homeStats.statistics, 'fieldGoalPct'));
              away3PPct = parseFloat(getStatValue(awayStats.statistics, 'threePointFieldGoalPct'));
              home3PPct = parseFloat(getStatValue(homeStats.statistics, 'threePointFieldGoalPct'));
              awayFTPct = parseFloat(getStatValue(awayStats.statistics, 'freeThrowPct'));
              homeFTPct = parseFloat(getStatValue(homeStats.statistics, 'freeThrowPct'));
            } else {
              awayFGPct = awayStats.field_goal_pct || 0;
              homeFGPct = homeStats.field_goal_pct || 0;
              away3PPct = awayStats.three_point_pct || 0;
              home3PPct = homeStats.three_point_pct || 0;
              awayFTPct = awayStats.free_throw_pct || 0;
              homeFTPct = homeStats.free_throw_pct || 0;
              awayFGM = awayStats.field_goals_made;
              awayFGA = awayStats.field_goals_attempted;
              homeFGM = homeStats.field_goals_made;
              homeFGA = homeStats.field_goals_attempted;
              away3PM = awayStats.three_point_made;
              away3PA = awayStats.three_point_attempted;
              home3PM = homeStats.three_point_made;
              home3PA = homeStats.three_point_attempted;
              awayFTM = awayStats.free_throws_made;
              awayFTA = awayStats.free_throws_attempted;
              homeFTM = homeStats.free_throws_made;
              homeFTA = homeStats.free_throws_attempted;
            }

            // Calculate 2-pointers (FG - 3P)
            const away2PM = awayFGM - away3PM;
            const away2PA = awayFGA - away3PA;
            const home2PM = homeFGM - home3PM;
            const home2PA = homeFGA - home3PA;

            return (
              <div className="border border-gray-200">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900">Shooting Efficiency</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-8">
                    {/* Shooting Percentages Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Field Goal % */}
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 text-center">
                          Field Goal %
                        </div>
                        <div className="space-y-3">
                          <div className="text-center">
                            <div className="flex items-center justify-center space-x-2 mb-2">
                              <img src={game.away_team_logo} alt="" className="w-5 h-5" />
                              <span className="text-sm text-gray-600">{game.away_team_abbr}</span>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-2">
                              {awayFGPct.toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-500">{awayFGM}-{awayFGA}</div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                              <div
                                className="h-full bg-blue-600 rounded-full transition-all"
                                style={{ width: `${awayFGPct}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center space-x-2 mb-2">
                              <img src={game.home_team_logo} alt="" className="w-5 h-5" />
                              <span className="text-sm text-gray-600">{game.home_team_abbr}</span>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-2">
                              {homeFGPct.toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-500">{homeFGM}-{homeFGA}</div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                              <div
                                className="h-full bg-red-600 rounded-full transition-all"
                                style={{ width: `${homeFGPct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3-Point % */}
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 text-center">
                          3-Point %
                        </div>
                        <div className="space-y-3">
                          <div className="text-center">
                            <div className="flex items-center justify-center space-x-2 mb-2">
                              <img src={game.away_team_logo} alt="" className="w-5 h-5" />
                              <span className="text-sm text-gray-600">{game.away_team_abbr}</span>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-2">
                              {away3PPct.toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-500">{away3PM}-{away3PA}</div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                              <div
                                className="h-full bg-blue-600 rounded-full transition-all"
                                style={{ width: `${away3PPct}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center space-x-2 mb-2">
                              <img src={game.home_team_logo} alt="" className="w-5 h-5" />
                              <span className="text-sm text-gray-600">{game.home_team_abbr}</span>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-2">
                              {home3PPct.toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-500">{home3PM}-{home3PA}</div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                              <div
                                className="h-full bg-red-600 rounded-full transition-all"
                                style={{ width: `${home3PPct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Free Throw % */}
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 text-center">
                          Free Throw %
                        </div>
                        <div className="space-y-3">
                          <div className="text-center">
                            <div className="flex items-center justify-center space-x-2 mb-2">
                              <img src={game.away_team_logo} alt="" className="w-5 h-5" />
                              <span className="text-sm text-gray-600">{game.away_team_abbr}</span>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-2">
                              {awayFTPct.toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-500">{awayFTM}-{awayFTA}</div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                              <div
                                className="h-full bg-blue-600 rounded-full transition-all"
                                style={{ width: `${awayFTPct}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center space-x-2 mb-2">
                              <img src={game.home_team_logo} alt="" className="w-5 h-5" />
                              <span className="text-sm text-gray-600">{game.home_team_abbr}</span>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-2">
                              {homeFTPct.toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-500">{homeFTM}-{homeFTA}</div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                              <div
                                className="h-full bg-red-600 rounded-full transition-all"
                                style={{ width: `${homeFTPct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Shot Distribution Chart */}
                    <div className="border-t border-gray-200 pt-6">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 text-center">
                        Points Distribution
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Away Team */}
                        <div>
                          <div className="flex items-center justify-center space-x-2 mb-3">
                            <img src={game.away_team_logo} alt={game.away_team_name} className="w-6 h-6" />
                            <span className="font-semibold text-gray-900">{game.away_team_name}</span>
                          </div>
                          <div className="space-y-2">
                            {/* 2-Pointers */}
                            <div className="flex items-center">
                              <div className="w-24 text-sm text-gray-600">2-Pointers</div>
                              <div className="flex-1 mx-3">
                                <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
                                  <div
                                    className="h-full bg-blue-500 flex items-center justify-center text-xs font-semibold text-white"
                                    style={{ width: `${(away2PM * 2 / game.away_score) * 100}%` }}
                                  >
                                    {away2PM * 2} pts
                                  </div>
                                </div>
                              </div>
                              <div className="w-16 text-sm text-gray-600 text-right">{away2PM}-{away2PA}</div>
                            </div>
                            {/* 3-Pointers */}
                            <div className="flex items-center">
                              <div className="w-24 text-sm text-gray-600">3-Pointers</div>
                              <div className="flex-1 mx-3">
                                <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
                                  <div
                                    className="h-full bg-blue-600 flex items-center justify-center text-xs font-semibold text-white"
                                    style={{ width: `${(away3PM * 3 / game.away_score) * 100}%` }}
                                  >
                                    {away3PM * 3} pts
                                  </div>
                                </div>
                              </div>
                              <div className="w-16 text-sm text-gray-600 text-right">{away3PM}-{away3PA}</div>
                            </div>
                            {/* Free Throws */}
                            <div className="flex items-center">
                              <div className="w-24 text-sm text-gray-600">Free Throws</div>
                              <div className="flex-1 mx-3">
                                <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
                                  <div
                                    className="h-full bg-blue-700 flex items-center justify-center text-xs font-semibold text-white"
                                    style={{ width: `${(awayFTM / game.away_score) * 100}%` }}
                                  >
                                    {awayFTM} pts
                                  </div>
                                </div>
                              </div>
                              <div className="w-16 text-sm text-gray-600 text-right">{awayFTM}-{awayFTA}</div>
                            </div>
                          </div>
                        </div>

                        {/* Home Team */}
                        <div>
                          <div className="flex items-center justify-center space-x-2 mb-3">
                            <img src={game.home_team_logo} alt={game.home_team_name} className="w-6 h-6" />
                            <span className="font-semibold text-gray-900">{game.home_team_name}</span>
                          </div>
                          <div className="space-y-2">
                            {/* 2-Pointers */}
                            <div className="flex items-center">
                              <div className="w-24 text-sm text-gray-600">2-Pointers</div>
                              <div className="flex-1 mx-3">
                                <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
                                  <div
                                    className="h-full bg-red-500 flex items-center justify-center text-xs font-semibold text-white"
                                    style={{ width: `${(home2PM * 2 / game.home_score) * 100}%` }}
                                  >
                                    {home2PM * 2} pts
                                  </div>
                                </div>
                              </div>
                              <div className="w-16 text-sm text-gray-600 text-right">{home2PM}-{home2PA}</div>
                            </div>
                            {/* 3-Pointers */}
                            <div className="flex items-center">
                              <div className="w-24 text-sm text-gray-600">3-Pointers</div>
                              <div className="flex-1 mx-3">
                                <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
                                  <div
                                    className="h-full bg-red-600 flex items-center justify-center text-xs font-semibold text-white"
                                    style={{ width: `${(home3PM * 3 / game.home_score) * 100}%` }}
                                  >
                                    {home3PM * 3} pts
                                  </div>
                                </div>
                              </div>
                              <div className="w-16 text-sm text-gray-600 text-right">{home3PM}-{home3PA}</div>
                            </div>
                            {/* Free Throws */}
                            <div className="flex items-center">
                              <div className="w-24 text-sm text-gray-600">Free Throws</div>
                              <div className="flex-1 mx-3">
                                <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
                                  <div
                                    className="h-full bg-red-700 flex items-center justify-center text-xs font-semibold text-white"
                                    style={{ width: `${(homeFTM / game.home_score) * 100}%` }}
                                  >
                                    {homeFTM} pts
                                  </div>
                                </div>
                              </div>
                              <div className="w-16 text-sm text-gray-600 text-right">{homeFTM}-{homeFTA}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* Team Statistics */}
      {game.team_stats && game.team_stats.length === 2 && (
        <div className="border border-gray-200">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Team Statistics</h2>
          </div>
          <div className="p-4">
            {(() => {
              const awayTeamStats = game.team_stats.find((t: any) => t.homeAway === 'away' || t.home_away === 'away');
              const homeTeamStats = game.team_stats.find((t: any) => t.homeAway === 'home' || t.home_away === 'home');

              if (!awayTeamStats || !homeTeamStats) return null;

              // Check if it's ESPN format (has statistics array) or database format (flat fields)
              const isESPNFormat = awayTeamStats.statistics !== undefined;

              if (isESPNFormat) {
                // ESPN format - existing code
                const keyStatNames = [
                  'fieldGoalsMade-fieldGoalsAttempted',
                  'fieldGoalPct',
                  'threePointFieldGoalsMade-threePointFieldGoalsAttempted',
                  'threePointFieldGoalPct',
                  'freeThrowsMade-freeThrowsAttempted',
                  'freeThrowPct',
                  'totalRebounds',
                  'offensiveRebounds',
                  'defensiveRebounds',
                  'assists',
                  'steals',
                  'blocks',
                  'turnovers',
                  'fouls'
                ];

                return (
                  <div className="space-y-2">
                    {keyStatNames.map((statName) => {
                      const awayStat = awayTeamStats.statistics.find((s: any) => s.name === statName);
                      const homeStat = homeTeamStats.statistics.find((s: any) => s.name === statName);

                      if (!awayStat || !homeStat) return null;

                      const label = awayStat.label || awayStat.abbreviation || statName;

                      return (
                        <div key={statName} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                          <div className="w-24 text-right font-medium text-gray-900">
                            {awayStat.displayValue}
                          </div>
                          <div className="flex-1 text-center text-sm font-semibold text-gray-600 uppercase px-4">
                            {label}
                          </div>
                          <div className="w-24 text-left font-medium text-gray-900">
                            {homeStat.displayValue}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              } else {
                // Database format - transform to display
                const stats = [
                  { key: 'fg', label: 'Field Goals', awayValue: `${awayTeamStats.field_goals_made}-${awayTeamStats.field_goals_attempted}`, homeValue: `${homeTeamStats.field_goals_made}-${homeTeamStats.field_goals_attempted}` },
                  { key: 'fg_pct', label: 'FG%', awayValue: `${awayTeamStats.field_goal_pct}%`, homeValue: `${homeTeamStats.field_goal_pct}%` },
                  { key: '3pt', label: '3-Pointers', awayValue: `${awayTeamStats.three_point_made}-${awayTeamStats.three_point_attempted}`, homeValue: `${homeTeamStats.three_point_made}-${homeTeamStats.three_point_attempted}` },
                  { key: '3pt_pct', label: '3P%', awayValue: `${awayTeamStats.three_point_pct}%`, homeValue: `${homeTeamStats.three_point_pct}%` },
                  { key: 'ft', label: 'Free Throws', awayValue: `${awayTeamStats.free_throws_made}-${awayTeamStats.free_throws_attempted}`, homeValue: `${homeTeamStats.free_throws_made}-${homeTeamStats.free_throws_attempted}` },
                  { key: 'ft_pct', label: 'FT%', awayValue: `${awayTeamStats.free_throw_pct}%`, homeValue: `${homeTeamStats.free_throw_pct}%` },
                  { key: 'reb', label: 'Total Rebounds', awayValue: awayTeamStats.total_rebounds, homeValue: homeTeamStats.total_rebounds },
                  { key: 'oreb', label: 'Offensive Rebounds', awayValue: awayTeamStats.offensive_rebounds, homeValue: homeTeamStats.offensive_rebounds },
                  { key: 'dreb', label: 'Defensive Rebounds', awayValue: awayTeamStats.defensive_rebounds, homeValue: homeTeamStats.defensive_rebounds },
                  { key: 'ast', label: 'Assists', awayValue: awayTeamStats.assists, homeValue: homeTeamStats.assists },
                  { key: 'stl', label: 'Steals', awayValue: awayTeamStats.steals, homeValue: homeTeamStats.steals },
                  { key: 'blk', label: 'Blocks', awayValue: awayTeamStats.blocks, homeValue: homeTeamStats.blocks },
                  { key: 'to', label: 'Turnovers', awayValue: awayTeamStats.turnovers, homeValue: homeTeamStats.turnovers },
                  { key: 'fouls', label: 'Fouls', awayValue: awayTeamStats.fouls, homeValue: homeTeamStats.fouls },
                ];

                return (
                  <div className="space-y-2">
                    {stats.map((stat) => (
                      <div key={stat.key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                        <div className="w-24 text-right font-medium text-gray-900">
                          {stat.awayValue}
                        </div>
                        <div className="flex-1 text-center text-sm font-semibold text-gray-600 uppercase px-4">
                          {stat.label}
                        </div>
                        <div className="w-24 text-left font-medium text-gray-900">
                          {stat.homeValue}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }
            })()}
          </div>
        </div>
      )}

      {/* Player Statistics */}
      {game.source === 'espn' && game.players ? (
        // ESPN format
        game.players.map((teamData) => {
          const allPlayers = teamData.statistics[0]?.athletes || [];
          const starters = allPlayers.filter(p => p.starter);
          const bench = allPlayers.filter(p => !p.starter);

          return (
            <div key={teamData.team.id} className="border border-gray-200">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <img src={teamData.team.logo} alt={teamData.team.displayName} className="w-8 h-8" />
                  <h2 className="text-lg font-bold text-gray-900">{teamData.team.displayName}</h2>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold text-gray-700">Player</th>
                      {teamData.statistics[0]?.labels.map((label, idx) => (
                        <th key={idx} className="text-center px-2 py-2 font-semibold text-gray-700">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Starters Section */}
                    {starters.length > 0 && (
                      <>
                        <tr className="bg-gray-50">
                          <td colSpan={teamData.statistics[0]?.labels.length + 1} className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase">
                            Starters
                          </td>
                        </tr>
                        {starters.map((player, idx) => (
                          <tr key={`starter-${idx}`} className="hover:bg-gray-50 border-t border-gray-200">
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-2">
                                {player.athlete?.headshot && (
                                  <img
                                    src={player.athlete.headshot.href}
                                    alt={player.athlete.displayName}
                                    className="w-8 h-8 rounded-full"
                                  />
                                )}
                                <div>
                                  <Link
                                    href={`/players/${player.athlete?.id}`}
                                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                  >
                                    {player.athlete?.displayName}
                                  </Link>
                                  <div className="text-xs text-gray-500">
                                    {player.athlete?.position.abbreviation} • #{player.athlete?.jersey}
                                  </div>
                                </div>
                              </div>
                            </td>
                            {player.stats?.map((stat, statIdx) => (
                              <td key={statIdx} className="text-center px-2 py-3 text-gray-700">
                                {stat}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </>
                    )}

                    {/* Bench Section */}
                    {bench.length > 0 && (
                      <>
                        <tr className="bg-gray-50">
                          <td colSpan={teamData.statistics[0]?.labels.length + 1} className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase">
                            Bench
                          </td>
                        </tr>
                        {bench.map((player, idx) => (
                          <tr key={`bench-${idx}`} className="hover:bg-gray-50 border-t border-gray-200">
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-2">
                                {player.athlete?.headshot && (
                                  <img
                                    src={player.athlete.headshot.href}
                                    alt={player.athlete.displayName}
                                    className="w-8 h-8 rounded-full"
                                  />
                                )}
                                <div>
                                  <Link
                                    href={`/players/${player.athlete?.id}`}
                                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                  >
                                    {player.athlete?.displayName}
                                  </Link>
                                  <div className="text-xs text-gray-500">
                                    {player.athlete?.position.abbreviation} • #{player.athlete?.jersey}
                                  </div>
                                </div>
                              </div>
                            </td>
                            {player.stats?.map((stat, statIdx) => (
                              <td key={statIdx} className="text-center px-2 py-3 text-gray-700">
                                {stat}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      ) : game.player_stats && game.player_stats.length > 0 ? (
        // Database format - group by team_id
        <>
          {(() => {
            // Group players by team_id
            const playersByTeam = game.player_stats!.reduce((acc, player) => {
              const teamId = (player as any).team_id;
              if (!acc[teamId]) acc[teamId] = [];
              acc[teamId].push(player);
              return acc;
            }, {} as Record<number, PlayerStat[]>);

            const teamIds = Object.keys(playersByTeam);

            return teamIds.map((teamId) => {
              const teamStats = playersByTeam[Number(teamId)];
              // Determine team name based on team_id by comparing with home/away team IDs
              const isHomeTeam = Number(teamId) === game.home_team_id;
              const teamName = isHomeTeam ? game.home_team_name : game.away_team_name;
              const teamLogo = isHomeTeam ? game.home_team_logo : game.away_team_logo;

              // Separate starters from bench
              const starters = teamStats.filter(p => (p as any).is_starter === 1);
              const bench = teamStats.filter(p => (p as any).is_starter === 0 || !(p as any).is_starter);

              return (
                <div key={teamId} className="border border-gray-200">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                      <img src={teamLogo} alt={teamName} className="w-8 h-8" />
                      <h2 className="text-lg font-bold text-gray-900">{teamName}</h2>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-2 font-semibold text-gray-700">Player</th>
                        <th className="text-center px-2 py-2 font-semibold text-gray-700">MIN</th>
                        <th className="text-center px-2 py-2 font-semibold text-gray-700">PTS</th>
                        <th className="text-center px-2 py-2 font-semibold text-gray-700">FG</th>
                        <th className="text-center px-2 py-2 font-semibold text-gray-700">3PT</th>
                        <th className="text-center px-2 py-2 font-semibold text-gray-700">FT</th>
                        <th className="text-center px-2 py-2 font-semibold text-gray-700">REB</th>
                        <th className="text-center px-2 py-2 font-semibold text-gray-700">AST</th>
                        <th className="text-center px-2 py-2 font-semibold text-gray-700">TO</th>
                        <th className="text-center px-2 py-2 font-semibold text-gray-700">STL</th>
                        <th className="text-center px-2 py-2 font-semibold text-gray-700">BLK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Starters Section */}
                      {starters.length > 0 && (
                        <>
                          <tr className="bg-gray-50">
                            <td colSpan={11} className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase">
                              Starters
                            </td>
                          </tr>
                          {starters.map((player) => (
                            <tr key={`starter-${player.athlete_id}`} className="hover:bg-gray-50 border-t border-gray-200">
                              <td className="px-4 py-3">
                                <Link
                                  href={`/players/${player.athlete_id}`}
                                  className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  {player.display_name || player.full_name}
                                </Link>
                                <div className="text-xs text-gray-500">{player.position_name}</div>
                              </td>
                              <td className="text-center px-2 py-3">{player.minutes_played || 0}</td>
                              <td className="text-center px-2 py-3 font-medium">{player.points || 0}</td>
                              <td className="text-center px-2 py-3">
                                {player.field_goals_made || 0}-{player.field_goals_attempted || 0}
                              </td>
                              <td className="text-center px-2 py-3">
                                {player.three_point_made || 0}-{player.three_point_attempted || 0}
                              </td>
                              <td className="text-center px-2 py-3">
                                {player.free_throws_made || 0}-{player.free_throws_attempted || 0}
                              </td>
                              <td className="text-center px-2 py-3">{player.rebounds || 0}</td>
                              <td className="text-center px-2 py-3">{player.assists || 0}</td>
                              <td className="text-center px-2 py-3">{player.turnovers || 0}</td>
                              <td className="text-center px-2 py-3">{player.steals || 0}</td>
                              <td className="text-center px-2 py-3">{player.blocks || 0}</td>
                            </tr>
                          ))}
                        </>
                      )}

                      {/* Bench Section */}
                      {bench.length > 0 && (
                        <>
                          <tr className="bg-gray-50">
                            <td colSpan={11} className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase">
                              Bench
                            </td>
                          </tr>
                          {bench.map((player) => (
                            <tr key={`bench-${player.athlete_id}`} className="hover:bg-gray-50 border-t border-gray-200">
                              <td className="px-4 py-3">
                                <Link
                                  href={`/players/${player.athlete_id}`}
                                  className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  {player.display_name || player.full_name}
                                </Link>
                                <div className="text-xs text-gray-500">{player.position_name}</div>
                              </td>
                              <td className="text-center px-2 py-3">{player.minutes_played || 0}</td>
                              <td className="text-center px-2 py-3 font-medium">{player.points || 0}</td>
                              <td className="text-center px-2 py-3">
                                {player.field_goals_made || 0}-{player.field_goals_attempted || 0}
                              </td>
                              <td className="text-center px-2 py-3">
                                {player.three_point_made || 0}-{player.three_point_attempted || 0}
                              </td>
                              <td className="text-center px-2 py-3">
                                {player.free_throws_made || 0}-{player.free_throws_attempted || 0}
                              </td>
                              <td className="text-center px-2 py-3">{player.rebounds || 0}</td>
                              <td className="text-center px-2 py-3">{player.assists || 0}</td>
                              <td className="text-center px-2 py-3">{player.turnovers || 0}</td>
                              <td className="text-center px-2 py-3">{player.steals || 0}</td>
                              <td className="text-center px-2 py-3">{player.blocks || 0}</td>
                            </tr>
                          ))}
                        </>
                      )}
                    </tbody>
                  </table>
                  </div>
                </div>
              );
            });
          })()}
        </>
      ) : (
        <div className="border border-gray-200 p-8 text-center text-gray-500">
          <p>Box score not available for this game.</p>
        </div>
      )}
    </div>
  );
}
