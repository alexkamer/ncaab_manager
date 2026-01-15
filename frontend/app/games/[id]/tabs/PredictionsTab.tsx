'use client';

import BettingLines from '../BettingLines';

interface PredictionsTabProps {
  game: any;
  awayTeamLogo: string;
  homeTeamLogo: string;
}

export default function PredictionsTab({ game, awayTeamLogo, homeTeamLogo }: PredictionsTabProps) {
  const hasPredictions = game.prediction && (game.prediction.home_win_probability || game.prediction.away_win_probability);

  return (
    <div className="space-y-8">
      {/* ESPN Game Predictions */}
      {hasPredictions && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">ESPN Game Predictions</h2>
            {game.prediction.matchup_quality && (
              <p className="text-sm text-gray-600 mt-1">
                Matchup Quality: {game.prediction.matchup_quality.toFixed(1)}%
              </p>
            )}
          </div>
          <div className="p-8">
            <div className="space-y-8">
              {/* Win Probability */}
              <div>
                <div className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">
                  Win Probability
                </div>
                <div className="space-y-6">
                  {/* Away Team */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <img src={awayTeamLogo} alt={game.away_team_name} className="w-8 h-8" />
                        <span className="font-bold text-gray-900 text-lg">{game.away_team_name}</span>
                      </div>
                      <span className="text-3xl font-black text-gray-900">
                        {game.prediction.away_win_probability?.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${game.prediction.away_win_probability || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Home Team */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <img src={homeTeamLogo} alt={game.home_team_name} className="w-8 h-8" />
                        <span className="font-bold text-gray-900 text-lg">{game.home_team_name}</span>
                      </div>
                      <span className="text-3xl font-black text-gray-900">
                        {game.prediction.home_win_probability?.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                    <div className="flex items-center space-x-2 mb-3">
                      <img src={awayTeamLogo} alt={game.away_team_name} className="w-6 h-6" />
                      <span className="text-sm font-bold text-gray-700">Predicted Margin</span>
                    </div>
                    <div className="text-4xl font-black text-blue-800">
                      {game.prediction.away_predicted_margin && game.prediction.away_predicted_margin > 0 ? '+' : ''}
                      {game.prediction.away_predicted_margin?.toFixed(1)}
                    </div>
                  </div>

                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
                    <div className="flex items-center space-x-2 mb-3">
                      <img src={homeTeamLogo} alt={game.home_team_name} className="w-6 h-6" />
                      <span className="text-sm font-bold text-gray-700">Predicted Margin</span>
                    </div>
                    <div className="text-4xl font-black text-red-800">
                      {game.prediction.home_predicted_margin && game.prediction.home_predicted_margin > 0 ? '+' : ''}
                      {game.prediction.home_predicted_margin?.toFixed(1)}
                    </div>
                  </div>
                </div>
              )}

              {/* Post-Game Prediction Accuracy */}
              {game.is_completed && game.prediction.margin_error !== undefined && (
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-6">
                  <div className="text-lg font-bold text-gray-900 mb-4">Prediction Accuracy</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <span className="text-sm text-gray-600">Margin Error: </span>
                      <span className="text-2xl font-black text-gray-900">
                        {Math.abs(game.prediction.margin_error).toFixed(1)} points
                      </span>
                    </div>
                    {game.prediction.home_prediction_correct !== undefined && (
                      <div>
                        <span className="text-sm text-gray-600">Winner Prediction: </span>
                        {game.prediction.home_prediction_correct || game.prediction.away_prediction_correct ? (
                          <span className="inline-flex items-center text-green-600 font-bold text-xl">
                            ✓ Correct
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-red-600 font-bold text-xl">
                            ✗ Incorrect
                          </span>
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

      {/* Dynamic Betting Odds from ESPN API */}
      <BettingLines
        eventId={game.event_id}
        awayTeamName={game.away_team_name}
        awayTeamAbbr={game.away_team_abbr}
        awayTeamId={game.away_team_id}
        homeTeamName={game.home_team_name}
        homeTeamAbbr={game.home_team_abbr}
        homeTeamId={game.home_team_id}
        isCompleted={game.is_completed}
        awayScore={game.away_score}
        homeScore={game.home_score}
      />

      {/* Empty state if no predictions or odds */}
      {!hasPredictions && (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-500">
          <p className="text-lg">No pre-game predictions available for this game.</p>
        </div>
      )}
    </div>
  );
}
