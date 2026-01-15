import Link from "next/link";
import GameDetailClient from "./components/GameDetailClient";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Type definitions (keeping these from original)
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
  away_team_id?: number;
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Link href="/games" className="text-blue-600 hover:underline inline-flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Games
        </Link>
        <div className="border border-gray-200 rounded-lg p-8 text-center text-gray-500">
          <p>Game not found.</p>
        </div>
      </div>
    );
  }

  // Extract team logos
  let homeTeamLogo = game.home_team_logo;
  let awayTeamLogo = game.away_team_logo;

  if (game.source === 'espn' && game.players) {
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
    <div className="min-h-screen bg-gray-50">
      {/* Back Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link href="/games" className="text-blue-600 hover:underline inline-flex items-center text-base font-medium">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Games
        </Link>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 space-y-6">
        <GameDetailClient
          game={game}
          awayTeamLogo={awayTeamLogo}
          homeTeamLogo={homeTeamLogo}
        />
      </div>
    </div>
  );
}
