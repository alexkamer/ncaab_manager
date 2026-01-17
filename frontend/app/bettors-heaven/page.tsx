"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Tooltip component for term definitions
function Tooltip({ term, definition, children }: { term: string, definition: string, children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block">
      <span
        className="border-b border-dotted border-gray-400 cursor-help"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </span>
      {show && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50">
          <div className="font-bold mb-1">{term}</div>
          <div>{definition}</div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </span>
  );
}

interface Game {
  event_id: number;
  date: string;
  status: string;
  home_team_id: number;
  home_team_name: string;
  home_team_logo: string;
  home_team_record: string | null;
  home_team_rank: number | null;
  away_team_id: number;
  away_team_name: string;
  away_team_logo: string;
  away_team_record: string | null;
  away_team_rank: number | null;
  home_win_probability: number | null;
  away_win_probability: number | null;
  home_predicted_margin: number | null;
  away_predicted_margin: number | null;
  predicted_total: number | null;
  matchup_quality: number | null;
  provider_name: string | null;
  spread: number | null;
  away_is_favorite: boolean | null;
  home_is_favorite: boolean | null;
  away_moneyline: number | null;
  home_moneyline: number | null;
  over_under: number | null;
  over_odds: number | null;
  under_odds: number | null;
}

interface GameWithValue extends Game {
  away_value_score: number;
  home_value_score: number;
  max_value_score: number;
  value_team: 'away' | 'home' | null;
  spread_differential: number;
  ou_differential: number | null;
}

interface OverallAccuracy {
  total: number;
  correct: number;
  accuracy_pct: number;
  avg_margin_error: number;
}

interface BettorsHeavenData {
  games: Game[];
  overall_accuracy: OverallAccuracy;
}

// Improved spread-to-probability conversion using logistic model
function spreadToImpliedProbability(spread: number, isTeamFavorite: boolean): number {
  // Using a more accurate logistic model based on historical data
  // Probability = 1 / (1 + exp(-0.23 * spread))
  const spreadPoints = isTeamFavorite ? Math.abs(spread) : -Math.abs(spread);
  const probability = 1 / (1 + Math.exp(-0.23 * spreadPoints));
  return Math.max(0.01, Math.min(0.99, probability));
}

function moneylineToImpliedProbability(moneyline: number | null): number | null {
  if (moneyline === null) return null;
  if (moneyline < 0) {
    return Math.abs(moneyline) / (Math.abs(moneyline) + 100);
  } else {
    return 100 / (moneyline + 100);
  }
}

function calculateValueScore(
  predictionProb: number | null,
  moneyline: number | null,
  spread: number | null,
  isTeamFavorite: boolean | null
): number {
  if (predictionProb === null) return 0;

  if (moneyline !== null) {
    const impliedProb = moneylineToImpliedProbability(moneyline);
    if (impliedProb !== null) {
      return predictionProb - impliedProb;
    }
  }

  if (spread !== null && isTeamFavorite !== null) {
    const impliedProb = spreadToImpliedProbability(spread, isTeamFavorite);
    return predictionProb - impliedProb;
  }

  return 0;
}

function formatGameTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Chicago'
  });
}

function formatGameDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function AccuracyBadge({ accuracy }: { accuracy: OverallAccuracy }) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Historical Prediction Accuracy</h2>
          <p className="text-sm text-gray-600">Based on {accuracy.total.toLocaleString()} completed games</p>
        </div>
        <div className="flex gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{accuracy.accuracy_pct}%</div>
            <div className="text-xs text-gray-600 mt-1">Win/Loss Accuracy</div>
            <div className="text-xs text-gray-500">({accuracy.correct}/{accuracy.total})</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-indigo-600">{accuracy.avg_margin_error}</div>
            <div className="text-xs text-gray-600 mt-1">Avg Margin Error</div>
            <div className="text-xs text-gray-500">(points)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ValueBadge({ valueScore, size = 'normal' }: { valueScore: number; size?: 'small' | 'normal' }) {
  const absValue = Math.abs(valueScore);
  const valuePercent = (absValue * 100).toFixed(1);

  let badgeColor = 'bg-gray-100 text-gray-600 border-gray-300';
  let label = 'No Edge';

  if (absValue >= 0.10) {
    badgeColor = 'bg-green-100 text-green-800 border-green-400';
    label = 'High Value';
  } else if (absValue >= 0.05) {
    badgeColor = 'bg-yellow-100 text-yellow-800 border-yellow-400';
    label = 'Moderate';
  }

  const sizeClasses = size === 'small' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center rounded-full font-bold border ${badgeColor} ${sizeClasses}`}>
      {label}
      {absValue >= 0.05 && ` (+${valuePercent}%)`}
    </span>
  );
}

function ConfidenceMeter({ probability }: { probability: number }) {
  const pct = (probability * 100).toFixed(0);
  const width = probability * 100;

  let color = 'bg-gray-400';
  if (probability >= 0.7) color = 'bg-green-500';
  else if (probability >= 0.55) color = 'bg-blue-500';
  else if (probability >= 0.45) color = 'bg-yellow-500';

  return (
    <div className="w-full">
      <div className="flex justify-between items-center text-xs text-gray-600 mb-1.5">
        <span>Win Probability</span>
        <span className="font-bold text-sm">{pct}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div className={`${color} h-2.5 rounded-full transition-all`} style={{ width: `${width}%` }}></div>
      </div>
    </div>
  );
}

function getApplicableStrategies(game: GameWithValue, strategies: Strategy[] | undefined): Array<{strategy: Strategy, recommendation: string}> {
  if (!strategies) return [];

  const applicable: Array<{strategy: Strategy, recommendation: string}> = [];
  const predictedMarginDiff = Math.abs((game.home_predicted_margin || 0) - Math.abs(game.spread || 0));
  const espnConfidence = Math.max(game.home_win_probability || 0, game.away_win_probability || 0);

  strategies.forEach(strategy => {
    // Only show profitable strategies
    if (strategy.roi <= 0 || !strategy.sample_size_adequate) return;

    let recommendation = '';

    // Fade the Spread strategies
    if (strategy.id.startsWith('fade_spread_')) {
      const threshold = strategy.threshold || 0;
      if (predictedMarginDiff >= threshold) {
        const espnPredictsBigger = Math.abs(game.home_predicted_margin || 0) > Math.abs(game.spread || 0);
        const teamTobet = espnPredictsBigger
          ? (game.home_is_favorite ? game.home_team_name : game.away_team_name)
          : (game.home_is_favorite ? game.away_team_name : game.home_team_name);
        recommendation = `Bet ${teamTobet.split(' ').pop()} ${espnPredictsBigger ? 'to cover' : '+' + game.spread}`;
        applicable.push({ strategy, recommendation });
      }
    }

    // High Confidence strategies
    if (strategy.id.startsWith('high_conf_')) {
      const confThreshold = strategy.confidence_threshold || 0;
      const marginThreshold = strategy.margin_threshold || 0;
      if (espnConfidence >= confThreshold && predictedMarginDiff >= marginThreshold) {
        const favoriteTeam = espnConfidence === (game.home_win_probability || 0)
          ? game.home_team_name
          : game.away_team_name;
        recommendation = `High confidence on ${favoriteTeam.split(' ').pop()}`;
        applicable.push({ strategy, recommendation });
      }
    }

    // Blowout Confirmation
    if (strategy.id === 'blowout_confirmation') {
      if (Math.abs(game.spread || 0) >= 12 && predictedMarginDiff <= 3) {
        const favoriteTeam = game.home_is_favorite ? game.home_team_name : game.away_team_name;
        recommendation = `Bet ${favoriteTeam.split(' ').pop()} to cover large spread`;
        applicable.push({ strategy, recommendation });
      }
    }

    // Home Underdog Special
    if (strategy.id === 'home_underdog_special') {
      const homeIsUnderdog = game.away_is_favorite;
      const spreadInRange = game.spread && Math.abs(game.spread) >= 3 && Math.abs(game.spread) <= 7;
      const espnPredictsClose = predictedMarginDiff <= 3;
      if (homeIsUnderdog && spreadInRange && espnPredictsClose) {
        recommendation = `Bet home underdog ${game.home_team_name.split(' ').pop()} +${Math.abs(game.spread || 0)}`;
        applicable.push({ strategy, recommendation });
      }
    }
  });

  return applicable;
}

function GameValueCard({ game, strategies }: { game: GameWithValue, strategies?: Strategy[] }) {
  const gameTime = formatGameTime(game.date);
  const gameDate = formatGameDate(game.date);

  const hasValueEdge = game.max_value_score >= 0.05;
  const valueTeamName = game.value_team === 'away' ? game.away_team_name : game.home_team_name;

  // Determine predicted winner and margin
  const predictedWinner = (game.home_win_probability || 0) > (game.away_win_probability || 0) ? 'home' : 'away';
  const predictedMargin = predictedWinner === 'home'
    ? (game.home_predicted_margin || 0)
    : (game.away_predicted_margin || 0);

  // Spread comparison
  const spreadFavorite = game.home_is_favorite ? 'home' : game.away_is_favorite ? 'away' : null;
  const spreadMargin = Math.abs(game.spread || 0);

  const spreadDiff = Math.abs(game.spread_differential);
  const agreeOnFavorite = predictedWinner === spreadFavorite;

  // O/U analysis
  const hasOUValue = game.ou_differential !== null && Math.abs(game.ou_differential) >= 3;

  // Get applicable strategies
  const applicableStrategies = getApplicableStrategies(game, strategies);

  // Card background color based on value
  let cardBgClass = 'bg-white';
  if (game.max_value_score >= 0.10) {
    cardBgClass = 'bg-green-50 border-green-200';
  } else if (game.max_value_score >= 0.05) {
    cardBgClass = 'bg-yellow-50 border-yellow-200';
  }

  return (
    <Link
      href={`/games/${game.event_id}`}
      className={`block border rounded-lg hover:shadow-lg transition-all ${cardBgClass}`}
    >
      <div className="p-5 md:p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <ValueBadge valueScore={game.max_value_score} />
            {hasOUValue && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 border border-purple-300 rounded-full text-xs font-bold">
                O/U Value
              </span>
            )}
            {applicableStrategies.map((item, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-xs font-bold"
                title={item.recommendation}
              >
                {item.strategy.name}
              </span>
            ))}
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-gray-900">{gameDate}</div>
            <div className="text-xs text-gray-600">{gameTime}</div>
          </div>
        </div>

        {/* Teams */}
        <div className="mb-4 space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <img src={game.away_team_logo} alt={game.away_team_name} className="w-12 h-12 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-gray-900 truncate">
                  {game.away_team_rank && game.away_team_rank <= 25 && (
                    <span className="text-blue-600 mr-1">#{game.away_team_rank}</span>
                  )}
                  {game.away_team_name}
                </div>
                {game.away_team_record && (
                  <div className="text-xs text-gray-500">{game.away_team_record}</div>
                )}
              </div>
            </div>
            <div className="w-48 flex-shrink-0">
              <ConfidenceMeter probability={game.away_win_probability || 0} />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <img src={game.home_team_logo} alt={game.home_team_name} className="w-12 h-12 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-gray-900 truncate">
                  {game.home_team_rank && game.home_team_rank <= 25 && (
                    <span className="text-blue-600 mr-1">#{game.home_team_rank}</span>
                  )}
                  {game.home_team_name}
                </div>
                {game.home_team_record && (
                  <div className="text-xs text-gray-500">{game.home_team_record}</div>
                )}
              </div>
            </div>
            <div className="w-48 flex-shrink-0">
              <ConfidenceMeter probability={game.home_win_probability || 0} />
            </div>
          </div>
        </div>

        {/* Prediction vs Spread Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-xs font-bold text-blue-700 uppercase mb-3">ESPN Prediction</h4>
            <div className="space-y-2">
              <div className="text-lg font-bold text-gray-900">
                {predictedWinner === 'home' ? game.home_team_name.split(' ').pop() : game.away_team_name.split(' ').pop()} by {predictedMargin.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">
                Win probability: {((predictedWinner === 'home' ? (game.home_win_probability || 0) : (game.away_win_probability || 0)) * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-xs font-bold text-gray-700 uppercase mb-3">
              Betting Line {game.provider_name && <span className="text-gray-500 normal-case text-xs">({game.provider_name})</span>}
            </h4>
            {game.spread !== null ? (
              <div className="space-y-2">
                <div className="text-lg font-bold text-gray-900">
                  {spreadFavorite === 'home' ? game.home_team_name.split(' ').pop() : game.away_team_name.split(' ').pop()} {game.spread}
                </div>
                {game.over_under && (
                  <div className="text-sm text-gray-600">O/U: {game.over_under}</div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">No line</div>
            )}
          </div>
        </div>

        {/* Value Analysis */}
        {hasValueEdge && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-lg p-4 mb-3">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <div className="font-bold text-green-900 mb-2">Betting Opportunity</div>
                <div className="text-sm text-green-800 leading-relaxed">
                  {agreeOnFavorite ? (
                    <>ESPN predicts a {spreadDiff.toFixed(1)} point larger margin than the spread suggests. Consider betting <span className="font-semibold">{valueTeamName}</span>.</>
                  ) : (
                    <>ESPN and the spread disagree on the favorite. ESPN favors <span className="font-semibold">{valueTeamName}</span> with a {(game.max_value_score * 100).toFixed(1)}% edge.</>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* O/U Analysis */}
        {hasOUValue && game.predicted_total && game.over_under && (
          <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-300 rounded-lg p-4 mb-3">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-purple-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
              </svg>
              <div>
                <div className="font-bold text-purple-900 mb-2">Over/Under Opportunity</div>
                <div className="text-sm text-purple-800 leading-relaxed">
                  ESPN predicts {game.predicted_total.toFixed(0)} total points vs O/U line of {game.over_under}.
                  Consider betting the <span className="font-semibold">{game.ou_differential! > 0 ? 'OVER' : 'UNDER'}</span>.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          {game.matchup_quality ? (
            <div className="text-xs text-gray-600">
              <span className="text-gray-500">Matchup Quality:</span>{' '}
              <span className="font-semibold">{game.matchup_quality.toFixed(1)}</span>
            </div>
          ) : (
            <div></div>
          )}
          <span className="text-xs text-gray-400">Click for details →</span>
        </div>
      </div>
    </Link>
  );
}

interface AnalyticsData {
  overall: {
    total: number;
    correct: number;
    avg_margin_error: number;
  };
  by_spread_range: Array<{
    spread_range: string;
    total: number;
    correct: number;
    avg_margin_error: number;
    avg_spread: number;
  }>;
  by_confidence: Array<{
    confidence_range: string;
    total: number;
    correct: number;
    avg_margin_error: number;
  }>;
  home_away: {
    home_correct: number;
    away_correct: number;
    total: number;
  };
  espn_vs_spread: {
    total: number;
    correct: number;
    avg_margin_error: number;
  };
  over_under: {
    total_with_ou: number;
    actual_overs: number;
    actual_unders: number;
    avg_ou_line: number;
    avg_actual_total: number;
  };
  best_scenarios: Array<{
    scenario: string;
    total: number;
    correct: number;
    accuracy_pct: number;
  }>;
}

interface Strategy {
  id: string;
  name: string;
  category: string;
  description: string;
  total_games: number;
  wins: number;
  losses: number;
  win_rate: number;
  roi: number;
  profit: number;
  sample_size_adequate: boolean;
  statistically_significant: boolean;
  threshold?: number;
  confidence_threshold?: number;
  margin_threshold?: number;
}

interface StrategiesData {
  strategies: Strategy[];
  season: string;
  note: string;
}

interface TeamATS {
  team_id: number;
  team_name: string;
  team_abbr: string;
  team_logo: string;
  team_color: string;
  total_games: number;
  games_with_spread: number;
  ats_wins: number;
  ats_losses: number;
  ats_pushes: number;
  ats_win_pct: number;
  avg_cover_margin: number;
}

interface TeamsATSData {
  teams: TeamATS[];
  season_id: number;
  min_games: number;
  total_teams: number;
  note: string;
}

interface TeamOverUnder {
  team_id: number;
  team_name: string;
  team_abbr: string;
  team_logo: string;
  team_color: string;
  total_games: number;
  games_with_line: number;
  overs: number;
  unders: number;
  pushes: number;
  over_pct: number;
  avg_total_margin: number;
}

interface TeamsOverUnderData {
  teams: TeamOverUnder[];
  season_id: number;
  min_games: number;
  total_teams: number;
  note: string;
}

export default function BettorsHeavenPage() {
  const [data, setData] = useState<BettorsHeavenData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [strategies, setStrategies] = useState<StrategiesData | null>(null);
  const [teamsATS, setTeamsATS] = useState<TeamsATSData | null>(null);
  const [teamsOverUnder, setTeamsOverUnder] = useState<TeamsOverUnderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'games' | 'analytics' | 'strategies'>('games');
  const [expandedProof, setExpandedProof] = useState<string | null>(null);
  const [proofData, setProofData] = useState<Record<string, any>>({});
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);
  const [strategyExamples, setStrategyExamples] = useState<Record<string, any>>({});
  const [examplesPage, setExamplesPage] = useState<Record<string, number>>({});
  const [showWorstATS, setShowWorstATS] = useState(false);
  const [showWorstOU, setShowWorstOU] = useState(false);

  const loadProofData = async (scenario: string) => {
    if (proofData[scenario]) {
      setExpandedProof(expandedProof === scenario ? null : scenario);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/betting-analytics/examples?scenario=${scenario}&limit=10`, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setProofData(prev => ({ ...prev, [scenario]: data.games }));
        setExpandedProof(scenario);
      }
    } catch (err) {
      console.error('Error loading proof data:', err);
    }
  };

  const loadStrategyExamples = async (strategyId: string) => {
    if (strategyExamples[strategyId]) {
      setExpandedStrategy(expandedStrategy === strategyId ? null : strategyId);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/betting-strategies/${strategyId}/examples?limit=10`, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setStrategyExamples(prev => ({ ...prev, [strategyId]: data.examples }));
        setExpandedStrategy(strategyId);
      }
    } catch (err) {
      console.error('Error loading strategy examples:', err);
    }
  };

  const exportStrategiesToCSV = () => {
    if (!strategies) return;

    // Create CSV content
    const headers = ['Strategy Name', 'Category', 'ROI (%)', 'Win Rate (%)', 'Wins', 'Losses', 'Total Games', 'Profit ($100/game)', 'Sample Size Adequate', 'Statistically Significant'];
    const rows = strategies.strategies.map(s => [
      s.name,
      s.category,
      s.roi,
      s.win_rate,
      s.wins,
      s.losses,
      s.total_games,
      s.profit,
      s.sample_size_adequate ? 'Yes' : 'No',
      s.statistically_significant ? 'Yes' : 'No'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: any[]) => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `betting-strategies-${strategies.season}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportExamplesToCSV = (strategyId: string, strategyName: string) => {
    const examples = strategyExamples[strategyId];
    if (!examples || examples.length === 0) return;

    // Create CSV content
    const headers = ['Date', 'Away Team', 'Home Team', 'Spread', 'ESPN Prediction Margin', 'Away Score', 'Home Score', 'Actual Margin', 'Bet Result'];
    const rows = examples.map((game: any) => [
      new Date(game.date).toLocaleDateString('en-US'),
      game.away_team_short || game.away_team,
      game.home_team_short || game.home_team,
      game.spread,
      game.home_predicted_margin,
      game.away_score,
      game.home_score,
      game.actual_margin,
      game.bet_won === 1 ? 'WON' : 'LOST'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: any[]) => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${strategyName.replace(/\s+/g, '-')}-examples.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Filters
  const [valueFilter, setValueFilter] = useState<'all' | 'high' | 'moderate'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'tomorrow'>('all');
  const [sortBy, setSortBy] = useState<'value' | 'time' | 'quality'>('value');
  const [minSpreadDiff, setMinSpreadDiff] = useState<number>(0);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [gamesRes, analyticsRes, strategiesRes, teamsATSRes, teamsOURes] = await Promise.all([
          fetch(`${API_BASE}/api/bettors-heaven`, { cache: 'no-store' }),
          fetch(`${API_BASE}/api/betting-analytics`, { cache: 'no-store' }),
          fetch(`${API_BASE}/api/betting-strategies`, { cache: 'no-store' }),
          // NOTE: No season_id parameter = ALL-TIME ATS records across all seasons
          fetch(`${API_BASE}/api/teams-ats?min_games=5`, { cache: 'no-store' }),
          // NOTE: No season_id parameter = ALL-TIME O/U records across all seasons
          fetch(`${API_BASE}/api/teams-over-under?min_games=5`, { cache: 'no-store' })
        ]);

        if (!gamesRes.ok) {
          throw new Error('Failed to fetch betting data');
        }
        const gamesData = await gamesRes.json();
        setData(gamesData);

        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          setAnalytics(analyticsData);
        }

        if (strategiesRes.ok) {
          const strategiesData = await strategiesRes.json();
          setStrategies(strategiesData);
        }

        if (teamsATSRes.ok) {
          const teamsATSData = await teamsATSRes.json();
          setTeamsATS(teamsATSData);
        }

        if (teamsOURes.ok) {
          const teamsOUData = await teamsOURes.json();
          setTeamsOverUnder(teamsOUData);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const gamesWithValue = useMemo<GameWithValue[]>(() => {
    if (!data) return [];

    return data.games.map(game => {
      const away_value_score = calculateValueScore(
        game.away_win_probability,
        game.away_moneyline,
        game.spread,
        game.away_is_favorite
      );
      const home_value_score = calculateValueScore(
        game.home_win_probability,
        game.home_moneyline,
        game.spread,
        game.home_is_favorite
      );

      const max_value_score = Math.max(Math.abs(away_value_score), Math.abs(home_value_score));
      const value_team = Math.abs(away_value_score) > Math.abs(home_value_score) ? 'away' : 'home';

      // Calculate spread differential
      const predictedMargin = (game.home_predicted_margin || 0) - (game.away_predicted_margin || 0);
      const spreadMargin = game.spread || 0;
      const spread_differential = Math.abs(predictedMargin - spreadMargin);

      // Calculate O/U differential
      const ou_differential = game.predicted_total && game.over_under
        ? game.predicted_total - game.over_under
        : null;

      return {
        ...game,
        away_value_score,
        home_value_score,
        max_value_score,
        value_team,
        spread_differential,
        ou_differential
      };
    });
  }, [data]);

  // Sorted teams data with toggle support
  const sortedATSTeams = useMemo(() => {
    if (!teamsATS) return [];
    const teams = [...teamsATS.teams];
    return showWorstATS
      ? teams.sort((a, b) => (a.ats_win_pct !== b.ats_win_pct ? a.ats_win_pct - b.ats_win_pct : a.games_with_spread - b.games_with_spread))
      : teams.sort((a, b) => (b.ats_win_pct !== a.ats_win_pct ? b.ats_win_pct - a.ats_win_pct : b.games_with_spread - a.games_with_spread));
  }, [teamsATS, showWorstATS]);

  const sortedOUTeams = useMemo(() => {
    if (!teamsOverUnder) return [];
    const teams = [...teamsOverUnder.teams];
    return showWorstOU
      ? teams.sort((a, b) => (a.over_pct !== b.over_pct ? a.over_pct - b.over_pct : a.games_with_line - b.games_with_line))
      : teams.sort((a, b) => (b.over_pct !== a.over_pct ? b.over_pct - a.over_pct : b.games_with_line - a.games_with_line));
  }, [teamsOverUnder, showWorstOU]);

  const filteredAndSortedGames = useMemo(() => {
    let filtered = gamesWithValue;

    // Value filter
    if (valueFilter === 'high') {
      filtered = filtered.filter(game => game.max_value_score >= 0.10);
    } else if (valueFilter === 'moderate') {
      filtered = filtered.filter(game => game.max_value_score >= 0.05 && game.max_value_score < 0.10);
    }

    // Time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(game => {
        const gameDate = new Date(game.date);
        const dateStr = formatGameDate(game.date);
        return timeFilter === 'today' ? dateStr === 'Today' : dateStr === 'Tomorrow';
      });
    }

    // Spread differential filter
    if (minSpreadDiff > 0) {
      filtered = filtered.filter(game => game.spread_differential >= minSpreadDiff);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'value') {
        return b.max_value_score - a.max_value_score;
      } else if (sortBy === 'time') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === 'quality') {
        return (b.matchup_quality || 0) - (a.matchup_quality || 0);
      }
      return 0;
    });

    return filtered;
  }, [gamesWithValue, valueFilter, timeFilter, sortBy, minSpreadDiff]);

  const stats = useMemo(() => {
    return {
      total: gamesWithValue.length,
      highValue: gamesWithValue.filter(g => g.max_value_score >= 0.10).length,
      moderateValue: gamesWithValue.filter(g => g.max_value_score >= 0.05 && g.max_value_score < 0.10).length,
      ouOpportunities: gamesWithValue.filter(g => g.ou_differential !== null && Math.abs(g.ou_differential) >= 3).length
    };
  }, [gamesWithValue]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">Bettors Heaven</h1>
        <p className="text-gray-600 mt-2">
          Smart betting insights powered by ESPN predictions vs live odds
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('games')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'games'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Today's Games
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Analytics & Insights
          </button>
          <button
            onClick={() => setActiveTab('strategies')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'strategies'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Strategy Lab
          </button>
        </nav>
      </div>

      {/* Overall Accuracy Badge */}
      {data && activeTab === 'games' && <AccuracyBadge accuracy={data.overall_accuracy} />}

      {/* Analytics View */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          {/* Best Teams ATS Section */}
          {teamsATS && teamsATS.teams.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {showWorstATS ? '📉 Worst' : '🏆 Best'} Teams Against The Spread (ATS) - All-Time
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Teams ranked by all-time ATS win percentage across all seasons in database (min. {teamsATS.min_games} games with spreads)
                    </p>
                    <p className="text-xs text-gray-500 mt-1 italic">
                      Note: This shows historical performance across ALL seasons, not just the current year
                    </p>
                  </div>
                  <button
                    onClick={() => setShowWorstATS(!showWorstATS)}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Show {showWorstATS ? 'Best' : 'Worst'}
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Team
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ATS Record
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ATS Win %
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Cover Margin
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Games
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedATSTeams.slice(0, 25).map((team, idx) => (
                      <tr key={team.team_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-center font-bold ${
                            idx < 3 ? 'text-yellow-600 text-xl' :
                            idx < 10 ? 'text-gray-900 text-lg' :
                            'text-gray-600'
                          }`}>
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/teams/${team.team_id}`}
                            className="flex items-center gap-3 group"
                          >
                            {team.team_logo && (
                              <img
                                src={team.team_logo}
                                alt={team.team_name}
                                className="w-10 h-10"
                              />
                            )}
                            <div>
                              <div className="text-sm font-bold text-blue-600 group-hover:text-blue-800">
                                {team.team_abbr}
                              </div>
                              <div className="text-xs text-gray-500">
                                {team.team_name}
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-lg font-bold text-gray-900">
                            {team.ats_wins}-{team.ats_losses}
                          </span>
                          {team.ats_pushes > 0 && (
                            <span className="text-xs text-gray-500 ml-1">
                              ({team.ats_pushes} push{team.ats_pushes > 1 ? 'es' : ''})
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className={`inline-flex items-center px-3 py-1 rounded-full font-bold ${
                            team.ats_win_pct >= 70 ? 'bg-green-100 text-green-800' :
                            team.ats_win_pct >= 60 ? 'bg-blue-100 text-blue-800' :
                            team.ats_win_pct >= 50 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {team.ats_win_pct}%
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`text-lg font-bold ${
                            team.avg_cover_margin > 5 ? 'text-green-600' :
                            team.avg_cover_margin > 0 ? 'text-blue-600' :
                            team.avg_cover_margin > -5 ? 'text-orange-600' :
                            'text-red-600'
                          }`}>
                            {team.avg_cover_margin > 0 ? '+' : ''}{team.avg_cover_margin}
                          </span>
                          <span className="text-xs text-gray-500 ml-1">pts</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                          {team.games_with_spread}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <p className="text-xs text-gray-600">
                  <strong>Note:</strong> {teamsATS.note}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Showing top 25 of {teamsATS.total_teams} teams. Click team name to view full team details.
                </p>
              </div>
            </div>
          )}

          {/* Over/Under Records Section */}
          {teamsOverUnder && teamsOverUnder.teams.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {showWorstOU ? '📉 Worst' : '🏆 Best'} Teams Over/Under Record - All-Time
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Teams ranked by all-time Over percentage across all seasons in database (min. {teamsOverUnder.min_games} games with O/U lines)
                    </p>
                    <p className="text-xs text-gray-500 mt-1 italic">
                      Note: This shows historical performance across ALL seasons, not just the current year
                    </p>
                  </div>
                  <button
                    onClick={() => setShowWorstOU(!showWorstOU)}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Show {showWorstOU ? 'Best' : 'Worst'}
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Team
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        O/U Record
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Over %
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Total Margin
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Games
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedOUTeams.slice(0, 25).map((team, idx) => (
                      <tr key={team.team_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-center font-bold ${
                            idx < 3 ? 'text-yellow-600 text-xl' :
                            idx < 10 ? 'text-gray-900 text-lg' :
                            'text-gray-600'
                          }`}>
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/teams/${team.team_id}`}
                            className="flex items-center gap-3 group"
                          >
                            {team.team_logo && (
                              <img
                                src={team.team_logo}
                                alt={team.team_name}
                                className="w-10 h-10"
                              />
                            )}
                            <div>
                              <div className="text-sm font-bold text-blue-600 group-hover:text-blue-800">
                                {team.team_abbr}
                              </div>
                              <div className="text-xs text-gray-500">
                                {team.team_name}
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-lg font-bold text-gray-900">
                            {team.overs}-{team.unders}
                          </span>
                          {team.pushes > 0 && (
                            <span className="text-xs text-gray-500 ml-1">
                              ({team.pushes} push{team.pushes > 1 ? 'es' : ''})
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className={`inline-flex items-center px-3 py-1 rounded-full font-bold ${
                            team.over_pct >= 70 ? 'bg-orange-100 text-orange-800' :
                            team.over_pct >= 60 ? 'bg-amber-100 text-amber-800' :
                            team.over_pct >= 50 ? 'bg-yellow-100 text-yellow-800' :
                            team.over_pct >= 40 ? 'bg-blue-100 text-blue-800' :
                            'bg-cyan-100 text-cyan-800'
                          }`}>
                            {team.over_pct}%
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`text-lg font-bold ${
                            team.avg_total_margin > 5 ? 'text-orange-600' :
                            team.avg_total_margin > 0 ? 'text-amber-600' :
                            team.avg_total_margin > -5 ? 'text-cyan-600' :
                            'text-blue-600'
                          }`}>
                            {team.avg_total_margin > 0 ? '+' : ''}{team.avg_total_margin}
                          </span>
                          <span className="text-xs text-gray-500 ml-1">pts</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                          {team.games_with_line}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <p className="text-xs text-gray-600">
                  <strong>Note:</strong> {teamsOverUnder.note}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Showing top 25 of {teamsOverUnder.total_teams} teams. Click team name to view full team details.
                </p>
              </div>
            </div>
          )}

          {/* Explanation Banner */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-xl font-bold text-gray-900">Understanding the Analytics</h2>
            </div>

            <div className="space-y-4">
              {/* What is this section */}
              <div className="bg-white rounded-lg p-4 border border-indigo-100">
                <h3 className="font-semibold text-gray-900 mb-2">What is this page?</h3>
                <p className="text-sm text-gray-700">
                  This page analyzes thousands of past college basketball games to reveal patterns in betting markets.
                  We compare ESPN's prediction model against actual game outcomes and betting lines to help you find edges where
                  the data suggests better odds than the market is offering.
                </p>
              </div>

              {/* Key terms */}
              <div className="bg-white rounded-lg p-4 border border-indigo-100">
                <h3 className="font-semibold text-gray-900 mb-3">Key Terms Explained</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-semibold text-indigo-600">Spread:</span>
                    <p className="text-gray-700 mt-1">
                      The betting line (e.g., -7.5 means team is favored by 7.5 points).
                      They must win by MORE than this to "cover the spread."
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-indigo-600">Over/Under (O/U):</span>
                    <p className="text-gray-700 mt-1">
                      Predicted total combined score of both teams. Bet "Over" if you think the actual total will be higher.
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-indigo-600">Win Probability:</span>
                    <p className="text-gray-700 mt-1">
                      ESPN's AI model's confidence that a team will win (50% = toss-up, 75% = strong favorite).
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-indigo-600">Value/Edge:</span>
                    <p className="text-gray-700 mt-1">
                      When ESPN's probability differs significantly from betting odds. Larger gaps = potentially better bets.
                    </p>
                  </div>
                </div>
              </div>

              {/* How to use */}
              <div className="bg-white rounded-lg p-4 border border-indigo-100">
                <h3 className="font-semibold text-gray-900 mb-2">How to Use This Data</h3>
                <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                  <li>
                    <strong>Look for patterns:</strong> Read each section to understand where ESPN's model is most accurate and where betting markets are most efficient.
                  </li>
                  <li>
                    <strong>Click "Show Proof":</strong> See real game examples with actual scores, predictions, and outcomes.
                    <span className="ml-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">Green</span> = correct prediction,
                    <span className="ml-1 px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded">Red</span> = incorrect.
                  </li>
                  <li>
                    <strong>Apply insights:</strong> Use these patterns when evaluating today's games in the "Today's Games" tab.
                  </li>
                </ol>
              </div>
            </div>
          </div>

          {/* Key Insights */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h2 className="text-xl font-bold text-gray-900">Where to Find Value</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {analytics.best_scenarios.map((scenario, idx) => (
                <div key={idx} className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-sm font-medium text-gray-700 mb-2">{scenario.scenario}</div>
                  <div className="text-3xl font-bold text-blue-600 mb-1">{scenario.accuracy_pct}%</div>
                  <div className="text-xs text-gray-500">{scenario.correct}/{scenario.total} correct</div>
                </div>
              ))}
            </div>
          </div>

          {/* Accuracy by Spread Range */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">ESPN Accuracy by Spread Range</h3>
            <p className="text-sm text-gray-600 mb-4">
              The spread indicates how many points the favorite is expected to win by. Larger spreads = bigger expected blowouts.
              This shows how accurate ESPN predictions are for different game types.
            </p>
            <div className="space-y-3">
              {analytics.by_spread_range.map((range, idx) => {
                const accuracy = ((range.correct / range.total) * 100).toFixed(1);
                const scenarioKey = range.spread_range === 'Blowout (12+)' ? 'blowouts' :
                                   range.spread_range === 'Close (<3)' ? 'close' : null;
                return (
                  <div key={idx}>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{range.spread_range}</div>
                        <div className="text-sm text-gray-600">
                          {range.correct}/{range.total} correct • Avg margin error: {range.avg_margin_error.toFixed(1)} pts
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-2xl font-bold text-blue-600">{accuracy}%</div>
                        <div className="w-32 bg-gray-200 rounded-full h-2 mt-2">
                          <div
                            className={`h-2 rounded-full ${
                              parseFloat(accuracy) >= 75 ? 'bg-green-500' :
                              parseFloat(accuracy) >= 60 ? 'bg-blue-500' :
                              'bg-yellow-500'
                            }`}
                            style={{ width: `${accuracy}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    {scenarioKey && (
                      <button
                        onClick={() => loadProofData(scenarioKey)}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                      >
                        {expandedProof === scenarioKey ? '▼ Hide Examples' : '▶ Show Proof'}
                      </button>
                    )}
                    {expandedProof === scenarioKey && scenarioKey && proofData[scenarioKey] && (
                      <div className="mt-3">
                        <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                          <strong>How to read this:</strong> Green rows = ESPN correctly predicted the winner. Red rows = ESPN was wrong.
                          "ESPN Prob" shows ESPN's confidence the home team would win. "Spread" is the betting line (negative = home favored).
                        </div>
                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Matchup</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Final Score</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">ESPN Prediction</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Spread</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Was ESPN Right?</th>
                              </tr>
                            </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {proofData[scenarioKey].map((game: any, gIdx: number) => {
                              const correct = game.espn_correct;
                              return (
                                <tr key={gIdx} className={correct ? 'bg-green-50' : 'bg-red-50'}>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                    {new Date(game.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-gray-900">
                                    {game.away_team} @ {game.home_team}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm font-semibold text-gray-900">
                                    {game.away_score}-{game.home_score}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                    {game.home_win_probability > 0.5
                                      ? `${game.home_team.split(' ').pop()} by ${Math.abs(game.home_predicted_margin || 0).toFixed(1)}`
                                      : `${game.away_team.split(' ').pop()} by ${Math.abs(game.away_predicted_margin || 0).toFixed(1)}`
                                    }
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                    {game.spread > 0 ? `+${game.spread}` : game.spread}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                      correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                      {correct ? '✓ Correct' : '✗ Wrong'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                </svg>
                <div className="text-sm text-yellow-800">
                  <strong>Insight:</strong> ESPN is most accurate on blowouts (12+ spread) at {((analytics.by_spread_range.find(r => r.spread_range === 'Blowout (12+)')?.correct || 0) / (analytics.by_spread_range.find(r => r.spread_range === 'Blowout (12+)')?.total || 1) * 100).toFixed(1)}%.
                  Close games are near coin-flip accuracy at {((analytics.by_spread_range.find(r => r.spread_range === 'Close (<3)')?.correct || 0) / (analytics.by_spread_range.find(r => r.spread_range === 'Close (<3)')?.total || 1) * 100).toFixed(1)}%.
                </div>
              </div>
            </div>
          </div>

          {/* Home vs Away Bias */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Home Court Advantage</h3>
            <p className="text-sm text-gray-600 mb-4">
              In college basketball, playing at home provides a significant advantage due to familiar surroundings, crowd support, and no travel fatigue.
              This shows how often home teams actually win.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                <div className="text-sm text-gray-600 mb-2">Home Team Wins</div>
                <div className="text-3xl font-bold text-green-600">{analytics.home_away.home_correct}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {((analytics.home_away.home_correct / analytics.home_away.total) * 100).toFixed(1)}% of all games
                </div>
              </div>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                <div className="text-sm text-gray-600 mb-2">Away Team Wins</div>
                <div className="text-3xl font-bold text-red-600">{analytics.home_away.away_correct}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {((analytics.home_away.away_correct / analytics.home_away.total) * 100).toFixed(1)}% of all games
                </div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                <div className="text-sm text-green-800">
                  <strong>Insight:</strong> Home teams win {((analytics.home_away.home_correct / analytics.home_away.total) * 100).toFixed(1)}% of the time.
                  Factor in home court advantage when evaluating close spreads.
                </div>
              </div>
            </div>
            <button
              onClick={() => loadProofData('home_wins')}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              {expandedProof === 'home_wins' ? '▼ Hide Examples' : '▶ Show Home Win Examples'}
            </button>
            {expandedProof === 'home_wins' && proofData['home_wins'] && (
              <div className="mt-3">
                <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                  <strong>How to read this:</strong> All these games show home team victories.
                  "Margin" shows how many points the home team won by.
                </div>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Matchup</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Final Score</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Spread</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Win Margin</th>
                      </tr>
                    </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {proofData['home_wins'].map((game: any, gIdx: number) => (
                      <tr key={gIdx} className="bg-green-50">
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {new Date(game.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {game.away_team} @ {game.home_team}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {game.away_score}-{game.home_score}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {game.spread > 0 ? `+${game.spread}` : game.spread}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          Home by {game.home_score - game.away_score}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Over/Under Market Efficiency */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Over/Under Market Analysis</h3>
            <p className="text-sm text-gray-600 mb-4">
              The Over/Under (O/U) is the predicted total combined score of both teams. Bet "Over" if you think the total will be higher, "Under" if lower.
              This shows how accurate the sportsbooks are at setting these lines.
            </p>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                <div className="text-sm text-gray-600 mb-2">Games Analyzed</div>
                <div className="text-3xl font-bold text-gray-900">{analytics.over_under.total_with_ou}</div>
              </div>
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-center">
                <div className="text-sm text-gray-600 mb-2">Went OVER</div>
                <div className="text-3xl font-bold text-orange-600">{analytics.over_under.actual_overs}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {((analytics.over_under.actual_overs / analytics.over_under.total_with_ou) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                <div className="text-sm text-gray-600 mb-2">Went UNDER</div>
                <div className="text-3xl font-bold text-blue-600">{analytics.over_under.actual_unders}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {((analytics.over_under.actual_unders / analytics.over_under.total_with_ou) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">Average O/U Line</div>
                <div className="text-xl font-bold text-gray-900">{analytics.over_under.avg_ou_line.toFixed(1)}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">Average Actual Total</div>
                <div className="text-xl font-bold text-gray-900">{analytics.over_under.avg_actual_total.toFixed(1)}</div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
                <div className="text-sm text-purple-800">
                  <strong>Market Efficiency:</strong> O/U markets are nearly perfectly efficient at {((analytics.over_under.actual_overs / analytics.over_under.total_with_ou) * 100).toFixed(1)}% overs vs {((analytics.over_under.actual_unders / analytics.over_under.total_with_ou) * 100).toFixed(1)}% unders.
                  Books are very accurate at setting these lines. Look for situational edges (tempo, injuries, etc.) rather than pure statistical models.
                </div>
              </div>
            </div>
            <div className="mt-3 flex gap-3">
              <button
                onClick={() => loadProofData('ou_over')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                {expandedProof === 'ou_over' ? '▼ Hide Overs' : '▶ Show Overs Examples'}
              </button>
              <button
                onClick={() => loadProofData('ou_under')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                {expandedProof === 'ou_under' ? '▼ Hide Unders' : '▶ Show Unders Examples'}
              </button>
            </div>
            {(expandedProof === 'ou_over' || expandedProof === 'ou_under') && proofData[expandedProof] && (
              <div className="mt-3">
                <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                  <strong>How to read this:</strong> "Total" is the actual combined score. "O/U Line" is what sportsbooks predicted.
                  Orange = went Over (higher than predicted). Blue = went Under (lower than predicted).
                </div>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Matchup</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Final Score</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actual Total</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">O/U Line</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                      </tr>
                    </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {proofData[expandedProof].map((game: any, gIdx: number) => {
                      const totalScore = game.home_score + game.away_score;
                      const isOver = totalScore > game.over_under;
                      return (
                        <tr key={gIdx} className={isOver ? 'bg-orange-50' : 'bg-blue-50'}>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                            {new Date(game.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            {game.away_team} @ {game.home_team}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {game.away_score}-{game.home_score}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-bold text-gray-900">
                            {totalScore}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                            {game.over_under}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              isOver ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {isOver ? 'OVER' : 'UNDER'} by {Math.abs(totalScore - game.over_under).toFixed(1)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ESPN vs Spread Disagreements */}
          {analytics.espn_vs_spread.total > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">When ESPN Disagrees with the Spread</h3>
              <p className="text-sm text-gray-600 mb-4">
                Sometimes ESPN's prediction model picks a different favorite than the betting markets (spread).
                This measures who is more accurate when they disagree: ESPN's AI model or the collective wisdom of betting markets.
              </p>
              <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
                <div className="text-sm text-gray-600 mb-2">ESPN Accuracy in These Scenarios</div>
                <div className="text-4xl font-bold text-red-600 mb-2">
                  {((analytics.espn_vs_spread.correct / analytics.espn_vs_spread.total) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">{analytics.espn_vs_spread.correct}/{analytics.espn_vs_spread.total} correct predictions</div>
              </div>
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm text-red-800">
                    <strong>Warning:</strong> When ESPN predicts a different favorite than the spread, their accuracy drops to {((analytics.espn_vs_spread.correct / analytics.espn_vs_spread.total) * 100).toFixed(1)}%.
                    The betting market (spread) is often more reliable in these scenarios. Be cautious betting against market consensus.
                  </div>
                </div>
              </div>
              <button
                onClick={() => loadProofData('disagree')}
                className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                {expandedProof === 'disagree' ? '▼ Hide Examples' : '▶ Show Disagreement Examples'}
              </button>
              {expandedProof === 'disagree' && proofData['disagree'] && (
                <div className="mt-3">
                  <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                    <strong>How to read this:</strong> These games show when ESPN and the spread picked different favorites.
                    Green = ESPN was right. Red = the spread/betting market was right.
                  </div>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Matchup</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Final Score</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">ESPN Picked</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Spread Picked</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actual Winner</th>
                        </tr>
                      </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {proofData['disagree'].map((game: any, gIdx: number) => {
                        const homeWon = game.home_score > game.away_score;
                        const espnCorrect = game.espn_correct;
                        return (
                          <tr key={gIdx} className={espnCorrect ? 'bg-green-50' : 'bg-red-50'}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                              {new Date(game.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900">
                              {game.away_team} @ {game.home_team}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-semibold text-gray-900">
                              {game.away_score}-{game.home_score}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                              {game.espn_favored_team}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                              {game.spread_favored_team}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                espnCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {homeWon ? game.home_team.split(' ').pop() : game.away_team.split(' ').pop()}
                                {espnCorrect ? ' ✓' : ' (Spread Won)'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Strategy Lab View */}
      {activeTab === 'strategies' && strategies && (
        <div className="space-y-6">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Strategy Lab</h2>
              </div>
              <span className="px-3 py-1 bg-white border border-emerald-300 rounded-full text-xs font-semibold text-emerald-700 self-start sm:self-auto">
                {strategies.season} Season
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white rounded-lg p-4 border border-emerald-100">
                <div className="text-xs text-gray-600 mb-1">Total Strategies Tested</div>
                <div className="text-2xl font-bold text-gray-900">{strategies.strategies.length}</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-emerald-100">
                <div className="text-xs text-gray-600 mb-1">Profitable Strategies</div>
                <div className="text-2xl font-bold text-green-600">
                  {strategies.strategies.filter(s => s.roi > 0 && s.sample_size_adequate).length}
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-emerald-100">
                <div className="text-xs text-gray-600 mb-1">Best ROI</div>
                <div className="text-2xl font-bold text-emerald-600">
                  +{Math.max(...strategies.strategies.map(s => s.roi))}%
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-yellow-800">
                  <strong>Important:</strong> Past performance does not guarantee future results. This is based on {strategies.season} data only.
                  Always bet responsibly and within your means. {strategies.note}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Picks - NEW SECTION for casual users */}
          {strategies.strategies.filter(s => s.roi > 0 && s.sample_size_adequate && s.statistically_significant).length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-4 sm:p-6">
              <div className="flex items-start gap-2 mb-3">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <h3 className="text-base sm:text-lg font-bold text-gray-900">🎯 Quick Picks - Best Strategies Right Now</h3>
              </div>
              <p className="text-xs sm:text-sm text-gray-700 mb-4">
                These strategies have proven profitable with statistical significance (large enough sample + high win rate).
                Check Today's Games tab to see which games match these patterns.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {strategies.strategies
                  .filter(s => s.roi > 0 && s.sample_size_adequate && s.statistically_significant)
                  .slice(0, 4)
                  .map((strategy, idx) => (
                    <div key={strategy.id} className="bg-white rounded-lg p-4 border-2 border-blue-200 hover:border-blue-400 transition-colors cursor-pointer"
                         onClick={() => loadStrategyExamples(strategy.id)}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-bold text-blue-600">#{idx + 1}</span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">
                          +{strategy.roi}% ROI
                        </span>
                      </div>
                      <h4 className="font-bold text-gray-900 mb-1">{strategy.name}</h4>
                      <p className="text-xs text-gray-600 mb-2">{strategy.description}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{strategy.wins}-{strategy.losses} ({strategy.win_rate}%)</span>
                        <span className="text-blue-600 font-medium">Click for examples →</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* All Strategies with Filters */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900">All Strategies</h3>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  className="text-xs sm:text-sm border border-gray-300 rounded px-2 sm:px-3 py-1.5 hover:bg-gray-50"
                  defaultValue="roi"
                  onChange={(e) => {
                    const sorted = [...strategies.strategies];
                    if (e.target.value === 'roi') sorted.sort((a, b) => b.roi - a.roi);
                    else if (e.target.value === 'winrate') sorted.sort((a, b) => b.win_rate - a.win_rate);
                    else if (e.target.value === 'sample') sorted.sort((a, b) => b.total_games - a.total_games);
                    setStrategies({...strategies, strategies: sorted});
                  }}
                >
                  <option value="roi">Sort by ROI</option>
                  <option value="winrate">Sort by Win Rate</option>
                  <option value="sample">Sort by Sample Size</option>
                </select>
                <button
                  className="text-xs sm:text-sm border border-gray-300 rounded px-2 sm:px-3 py-1.5 hover:bg-gray-50 whitespace-nowrap"
                  onClick={() => {
                    const filtered = strategies.strategies.filter(s => s.roi > 0 && s.sample_size_adequate);
                    setStrategies({...strategies, strategies: filtered.length > 0 ? filtered : strategies.strategies});
                  }}
                >
                  Show Profitable Only
                </button>
                <button
                  onClick={exportStrategiesToCSV}
                  className="text-xs sm:text-sm border border-gray-300 rounded px-2 sm:px-3 py-1.5 hover:bg-gray-50 flex items-center justify-center gap-1 whitespace-nowrap"
                  title="Export all strategies to CSV"
                >
                  <svg className="w-3 sm:w-4 h-3 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="hidden sm:inline">Export to CSV</span>
                  <span className="sm:hidden">Export</span>
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {strategies.strategies.map((strategy) => {
                const isExpanded = expandedStrategy === strategy.id;
                const isProfitable = strategy.roi > 0;
                const bgColor = isProfitable
                  ? 'bg-green-50 border-green-200'
                  : strategy.roi < -5
                    ? 'bg-red-50 border-red-200'
                    : 'bg-gray-50 border-gray-200';

                return (
                  <div key={strategy.id} className={`border rounded-lg p-3 sm:p-5 ${bgColor}`}>
                    {/* Strategy Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 gap-2">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 mb-2">{strategy.name}</h4>
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          <span className="px-2 py-0.5 bg-white border border-gray-300 rounded text-xs font-medium text-gray-700">
                            {strategy.category}
                          </span>
                          {!strategy.sample_size_adequate && (
                            <span className="px-2 py-0.5 bg-yellow-100 border border-yellow-300 rounded text-xs font-bold text-yellow-800">
                              Small Sample
                            </span>
                          )}
                          {strategy.statistically_significant && (
                            <Tooltip term="Statistically Significant" definition="This strategy has both a large enough sample size (50+ games) AND beats the 52.4% break-even threshold, suggesting it's not just luck.">
                              <span className="px-2 py-0.5 bg-blue-100 border border-blue-300 rounded text-xs font-bold text-blue-800">
                                Significant
                              </span>
                            </Tooltip>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-700">{strategy.description}</p>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                        <div className={`text-2xl font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                          {strategy.roi > 0 ? '+' : ''}{strategy.roi}%
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          <Tooltip term="ROI (Return on Investment)" definition="Profit or loss as a percentage of total money risked. Example: +10% ROI means you made $10 profit for every $100 bet. Calculated with -110 odds (standard betting juice).">
                            ROI
                          </Tooltip>
                        </div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                        <div className="text-2xl font-bold text-gray-900">{strategy.win_rate}%</div>
                        <div className="text-xs text-gray-600 mt-1">
                          <Tooltip term="Win Rate" definition="Percentage of bets that won. Need 52.4% to break even at -110 odds. Higher win rate doesn't always mean higher profit (ROI matters more).">
                            Win Rate
                          </Tooltip>
                        </div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                        <div className="text-2xl font-bold text-blue-600">{strategy.wins}</div>
                        <div className="text-xs text-gray-600 mt-1">Wins</div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                        <div className="text-2xl font-bold text-gray-600">{strategy.losses}</div>
                        <div className="text-xs text-gray-600 mt-1">Losses</div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                        <div className={`text-2xl font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                          ${strategy.profit > 0 ? '+' : ''}{strategy.profit}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Profit ($100/game)</div>
                      </div>
                    </div>

                    {/* Expand/Collapse Button */}
                    <button
                      onClick={() => loadStrategyExamples(strategy.id)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                    >
                      {isExpanded ? '▼ Hide Details' : '▶ Show Details & Analysis'}
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-300 space-y-3">
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <h5 className="font-semibold text-gray-900 mb-2">Performance Analysis</h5>
                          <div className="text-sm text-gray-700 space-y-2">
                            <p>
                              <strong>Record:</strong> {strategy.wins}-{strategy.losses} over {strategy.total_games} games
                            </p>
                            <p>
                              <strong>Break-Even Context:</strong> Need 52.4% win rate to break even at -110 odds.
                              This strategy's {strategy.win_rate}% win rate is {strategy.win_rate > 52.4 ? 'ABOVE' : 'BELOW'} break-even.
                            </p>
                            <p>
                              <strong>Sample Size:</strong> {strategy.sample_size_adequate
                                ? 'Adequate sample size for statistical reliability.'
                                : 'Small sample size - use with caution. More games needed for reliability.'}
                            </p>
                            {strategy.statistically_significant && (
                              <p className="text-green-700 font-semibold">
                                ✓ Statistically significant performance above break-even.
                              </p>
                            )}
                          </div>
                        </div>

                        {isProfitable ? (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <div className="text-sm text-green-800">
                                <strong>Profitable Strategy:</strong> This strategy has shown positive returns this season.
                                Betting $100 per game would have yielded ${strategy.profit > 0 ? '+' : ''}{strategy.profit} profit.
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                              <div className="text-sm text-red-800">
                                <strong>Losing Strategy:</strong> This strategy has not been profitable this season.
                                Avoid using this approach or wait for more data to confirm if it's truly unprofitable.
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Example Games */}
                        {strategyExamples[strategy.id] && strategyExamples[strategy.id].length > 0 && (() => {
                          const currentPage = examplesPage[strategy.id] || 1;
                          const pageSize = 5;
                          const totalPages = Math.ceil(strategyExamples[strategy.id].length / pageSize);
                          const startIdx = (currentPage - 1) * pageSize;
                          const endIdx = startIdx + pageSize;
                          const paginatedGames = strategyExamples[strategy.id].slice(startIdx, endIdx);

                          return (
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <h5 className="font-semibold text-gray-900">Recent Examples ({strategyExamples[strategy.id].length} games)</h5>
                                  <button
                                    onClick={() => exportExamplesToCSV(strategy.id, strategy.name)}
                                    className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1 px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                                    title="Export examples to CSV"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Export
                                  </button>
                                </div>
                                {totalPages > 1 && (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setExamplesPage(prev => ({ ...prev, [strategy.id]: Math.max(1, currentPage - 1) }))}
                                      disabled={currentPage === 1}
                                      className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                      ← Prev
                                    </button>
                                    <span className="text-xs text-gray-600">
                                      Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                      onClick={() => setExamplesPage(prev => ({ ...prev, [strategy.id]: Math.min(totalPages, currentPage + 1) }))}
                                      disabled={currentPage === totalPages}
                                      className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                      Next →
                                    </button>
                                  </div>
                                )}
                              </div>
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-xs">
                                  <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Date</th>
                                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Matchup</th>
                                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Spread</th>
                                      <th className="px-3 py-2 text-left font-semibold text-gray-700">ESPN Prediction</th>
                                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Final Score</th>
                                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Result</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {paginatedGames.map((game: any, idx: number) => {
                                    const wonBet = game.bet_won === 1;
                                    return (
                                      <tr key={idx} className={wonBet ? 'bg-green-50' : 'bg-red-50'}>
                                        <td className="px-3 py-2 whitespace-nowrap text-gray-900">
                                          {new Date(game.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="px-3 py-2 text-gray-900">
                                          <div>{game.away_team_short || game.away_team}</div>
                                          <div className="font-semibold">@ {game.home_team_short || game.home_team}</div>
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-gray-900">
                                          {game.home_is_favorite
                                            ? `${game.home_team_short || game.home_team} ${game.spread}`
                                            : `${game.away_team_short || game.away_team} ${Math.abs(game.spread)}`}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-gray-900">
                                          {game.home_predicted_margin > 0
                                            ? `${game.home_team_short || game.home_team} by ${Math.abs(game.home_predicted_margin).toFixed(1)}`
                                            : `${game.away_team_short || game.away_team} by ${Math.abs(game.away_predicted_margin || game.home_predicted_margin).toFixed(1)}`}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-gray-900">
                                          {game.away_score}-{game.home_score}
                                          <span className="text-gray-500 ml-1">
                                            ({game.actual_margin > 0 ? `${game.home_team_short || game.home_team}` : `${game.away_team_short || game.away_team}`} by {Math.abs(game.actual_margin)})
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                          <span className={`px-2 py-1 rounded text-xs font-bold ${wonBet ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                            {wonBet ? 'WON' : 'LOST'}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'games' && (
        <>
      {/* Explanation Banner for Games */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-bold text-gray-900">How to Find Betting Value</h3>
        </div>

        <div className="space-y-4">
          {/* Value Score explanation */}
          <div className="bg-white rounded-lg p-4 border border-green-100">
            <h4 className="font-semibold text-gray-900 mb-2">Understanding Value Scores</h4>
            <p className="text-sm text-gray-700 mb-3">
              The value score measures the difference between ESPN's win probability and the implied probability from betting odds.
              When ESPN thinks a team has a much better chance to win than the betting line suggests, that's potential value.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="px-3 py-1 bg-green-100 text-green-800 border border-green-400 rounded-full text-xs font-bold whitespace-nowrap">
                  High Value (+10%+)
                </span>
                <p className="text-gray-700">
                  <strong>Significant disagreement.</strong> ESPN's model differs by 10+ percentage points from betting odds.
                  These are the strongest signals but still require your own analysis.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 border border-yellow-400 rounded-full text-xs font-bold whitespace-nowrap">
                  Moderate (+5-10%)
                </span>
                <p className="text-gray-700">
                  <strong>Notable difference.</strong> ESPN sees 5-10% better odds than the market. Worth investigating further.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="px-3 py-1 bg-gray-100 text-gray-600 border border-gray-300 rounded-full text-xs font-bold whitespace-nowrap">
                  No Edge (&lt;5%)
                </span>
                <p className="text-gray-700">
                  <strong>General agreement.</strong> ESPN and betting markets largely align on this game's outcome.
                </p>
              </div>
            </div>
          </div>

          {/* What to look for */}
          <div className="bg-white rounded-lg p-4 border border-green-100">
            <h4 className="font-semibold text-gray-900 mb-2">What to Look For</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
              <div>
                <span className="font-semibold text-green-600">🎯 Spread Differential:</span>
                <p className="mt-1">When ESPN predicts a larger or smaller margin than the spread, it might indicate value on either side.</p>
              </div>
              <div>
                <span className="font-semibold text-purple-600">📊 O/U Opportunities:</span>
                <p className="mt-1">When ESPN's predicted total differs by 3+ points from the O/U line, there could be value on Over or Under.</p>
              </div>
              <div>
                <span className="font-semibold text-blue-600">⚖️ Disagreements:</span>
                <p className="mt-1">Games where ESPN and the spread pick different favorites (but check Analytics - markets often win these!).</p>
              </div>
              <div>
                <span className="font-semibold text-orange-600">🏆 High Confidence:</span>
                <p className="mt-1">When ESPN has 70%+ confidence AND shows value, the model is both confident and disagreeing with odds.</p>
              </div>
            </div>
          </div>

          {/* Important disclaimer */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-900">
              <strong>⚠️ Important:</strong> This data is for informational purposes only. Past performance doesn't guarantee future results.
              Always do your own research and bet responsibly. The Analytics tab shows where ESPN's model has historically been most accurate.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      {!loading && !error && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-600 mt-1">Total Games</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-700">{stats.highValue}</div>
            <div className="text-xs text-green-600 mt-1">High Value</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-700">{stats.moderateValue}</div>
            <div className="text-xs text-yellow-600 mt-1">Moderate Value</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-700">{stats.ouOpportunities}</div>
            <div className="text-xs text-purple-600 mt-1">O/U Opportunities</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Value Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Value Level</label>
            <div className="flex gap-2">
              <button
                onClick={() => setValueFilter('all')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  valueFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setValueFilter('high')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  valueFilter === 'high'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                High
              </button>
              <button
                onClick={() => setValueFilter('moderate')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  valueFilter === 'moderate'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Moderate
              </button>
            </div>
          </div>

          {/* Time Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Game Time</label>
            <div className="flex gap-2">
              <button
                onClick={() => setTimeFilter('all')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  timeFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTimeFilter('today')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  timeFilter === 'today'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setTimeFilter('tomorrow')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  timeFilter === 'tomorrow'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tomorrow
              </button>
            </div>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="value">Best Value</option>
              <option value="time">Game Time</option>
              <option value="quality">Matchup Quality</option>
            </select>
          </div>
        </div>

        {/* Advanced Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Min Spread Differential: {minSpreadDiff} pts
          </label>
          <input
            type="range"
            min="0"
            max="10"
            step="0.5"
            value={minSpreadDiff}
            onChange={(e) => setMinSpreadDiff(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Any</span>
            <span>10+ pts</span>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold">{filteredAndSortedGames.length}</span> of{' '}
            <span className="font-semibold">{gamesWithValue.length}</span> games
          </div>
          {(valueFilter !== 'all' || timeFilter !== 'all' || minSpreadDiff > 0) && (
            <button
              onClick={() => {
                setValueFilter('all');
                setTimeFilter('all');
                setMinSpreadDiff(0);
              }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="border border-gray-200 p-8 text-center text-gray-500 rounded-lg">
          <div className="animate-pulse">Loading betting opportunities...</div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="border border-red-200 bg-red-50 p-8 text-center text-red-700 rounded-lg">
          <p className="font-semibold">Error loading data</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Games List */}
      {!loading && !error && filteredAndSortedGames.length > 0 ? (
        <div className="space-y-4">
          {filteredAndSortedGames.map(game => (
            <GameValueCard
              key={game.event_id}
              game={game}
              strategies={strategies?.strategies.filter(s => s.roi > 0 && s.sample_size_adequate)}
            />
          ))}
        </div>
      ) : !loading && !error && filteredAndSortedGames.length === 0 ? (
        <div className="border border-gray-200 p-8 text-center text-gray-500 rounded-lg">
          <p>No games found matching your filters.</p>
          <button
            onClick={() => {
              setValueFilter('all');
              setTimeFilter('all');
              setMinSpreadDiff(0);
            }}
            className="mt-2 text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear all filters
          </button>
        </div>
      ) : null}
        </>
      )}
    </div>
  );
}
