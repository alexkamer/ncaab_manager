// TypeScript interfaces and enums for play-by-play data

export interface EnhancedPlay {
  // Existing fields (backward compatible)
  id: string;
  text: string;
  shortText: string;
  awayScore: number;
  homeScore: number;
  period: number;
  periodDisplay: string;
  clock: string;
  clockValue: number;
  scoreValue: number;
  scoringPlay: boolean;
  team: string | null;
  homeWinPercentage?: number;

  // NEW: Player information
  playerId?: string;
  playerName?: string;
  playerShortName?: string;
  assistPlayerId?: string;
  assistPlayerName?: string;

  // NEW: Play type classification
  playType: PlayType;
  playTypeText: string;
  playCategory: PlayCategory;

  // NEW: Shot chart data
  shotCoordinate?: {
    x: number; // 0-94 (ESPN coordinates)
    y: number; // 0-50 (ESPN coordinates)
  };
  shotResult?: "made" | "missed";

  // NEW: Metadata
  sequenceNumber: number;
}

// Play type classification
export enum PlayType {
  THREE_POINT_MADE = "three_point_made",
  THREE_POINT_MISSED = "three_point_missed",
  TWO_POINT_MADE = "two_point_made",
  TWO_POINT_MISSED = "two_point_missed",
  FREE_THROW_MADE = "free_throw_made",
  FREE_THROW_MISSED = "free_throw_missed",
  REBOUND_OFFENSIVE = "rebound_offensive",
  REBOUND_DEFENSIVE = "rebound_defensive",
  ASSIST = "assist",
  TURNOVER = "turnover",
  STEAL = "steal",
  BLOCK = "block",
  FOUL_PERSONAL = "foul_personal",
  FOUL_TECHNICAL = "foul_technical",
  TIMEOUT = "timeout",
  SUBSTITUTION = "substitution",
  JUMP_BALL = "jump_ball",
  END_PERIOD = "end_period",
  OTHER = "other"
}

// High-level categories for filtering
export enum PlayCategory {
  SCORING = "scoring",
  REBOUNDING = "rebounding",
  ASSISTS = "assists",
  TURNOVERS = "turnovers",
  FOULS = "fouls",
  DEFENSIVE = "defensive",
  ADMINISTRATIVE = "administrative"
}

// View modes
export type ViewMode = "grid" | "shotchart";

// Filter state interface
export interface FilterState {
  selectedPeriod: number | "all";
  selectedPlayTypes: string[];
  selectedPlayers: string[];
  showScoringOnly: boolean;
  clutchTimeOnly: boolean;
  momentumPlaysOnly: boolean;
  leadChangesOnly: boolean;
}

// Helper function to detect lead changes
export function isLeadChange(currentPlay: EnhancedPlay, previousPlay: EnhancedPlay): boolean {
  const prevLeader = previousPlay.homeScore > previousPlay.awayScore ? "home" :
                     previousPlay.awayScore > previousPlay.homeScore ? "away" : "tied";
  const currLeader = currentPlay.homeScore > currentPlay.awayScore ? "home" :
                     currentPlay.awayScore > currentPlay.homeScore ? "away" : "tied";

  return prevLeader !== currLeader && currLeader !== "tied";
}

// Helper function to check if play is in clutch time
export function isClutchTime(play: EnhancedPlay): boolean {
  // Last 5 minutes (300 seconds) and score within 5 points
  const scoreDiff = Math.abs(play.homeScore - play.awayScore);
  return play.clockValue <= 300 && scoreDiff <= 5;
}

// Helper function to detect momentum runs
export function detectMomentumRuns(plays: EnhancedPlay[]): Set<string> {
  const momentumPlayIds = new Set<string>();

  // Look for runs of 6+ points by one team without the other scoring
  for (let i = 0; i < plays.length; i++) {
    let runPoints = 0;
    let runTeam: string | null = null;

    for (let j = i; j < Math.min(i + 10, plays.length); j++) {
      const play = plays[j];

      if (play.scoringPlay && play.team) {
        if (runTeam === null) {
          runTeam = play.team;
          runPoints = play.scoreValue;
        } else if (runTeam === play.team) {
          runPoints += play.scoreValue;
        } else {
          // Other team scored, break the run
          break;
        }

        // If run reaches 6+ points, mark all plays in the run
        if (runPoints >= 6) {
          for (let k = i; k <= j; k++) {
            momentumPlayIds.add(plays[k].id);
          }
        }
      }
    }
  }

  return momentumPlayIds;
}

// Helper function to get unique players from plays
export function getUniquePlayers(plays: EnhancedPlay[]): Array<{ id: string; name: string }> {
  const playerMap = new Map<string, string>();

  plays.forEach(play => {
    if (play.playerId && play.playerName) {
      playerMap.set(play.playerId, play.playerName);
    }
    if (play.assistPlayerId && play.assistPlayerName) {
      playerMap.set(play.assistPlayerId, play.assistPlayerName);
    }
  });

  return Array.from(playerMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Helper function to get play type counts
export function getPlayTypeCounts(plays: EnhancedPlay[]): Record<string, number> {
  const counts: Record<string, number> = {};

  plays.forEach(play => {
    const category = play.playCategory;
    counts[category] = (counts[category] || 0) + 1;
  });

  return counts;
}

// Play type display labels
export const PLAY_TYPE_LABELS: Record<string, string> = {
  three_point_made: "3PT Made",
  three_point_missed: "3PT Missed",
  two_point_made: "2PT Made",
  two_point_missed: "2PT Missed",
  free_throw_made: "FT Made",
  free_throw_missed: "FT Missed",
  rebound_offensive: "Off. Rebound",
  rebound_defensive: "Def. Rebound",
  turnover: "Turnover",
  steal: "Steal",
  block: "Block",
  foul_personal: "Personal Foul",
  foul_technical: "Technical Foul",
  timeout: "Timeout",
  substitution: "Substitution",
  jump_ball: "Jump Ball",
  end_period: "End Period",
  other: "Other"
};

// Play category display labels
export const PLAY_CATEGORY_LABELS: Record<string, string> = {
  scoring: "Scoring",
  rebounding: "Rebounds",
  assists: "Assists",
  turnovers: "Turnovers",
  fouls: "Fouls",
  defensive: "Defensive",
  administrative: "Administrative"
};
