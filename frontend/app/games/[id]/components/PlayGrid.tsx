"use client";

import { EnhancedPlay, isLeadChange } from "../types/playTypes";
import PlayCard from "./PlayCard";

interface PlayGridProps {
  plays: EnhancedPlay[];
  momentumPlayIds: Set<string>;
  homeTeamColor: string;
  awayTeamColor: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamLogo: string;
  awayTeamLogo: string;
  homeTeamAbbr: string;
  awayTeamAbbr: string;
  onPlayClick?: (playId: string) => void;
}

export default function PlayGrid({
  plays,
  momentumPlayIds,
  homeTeamColor,
  awayTeamColor,
  homeTeamId,
  awayTeamId,
  homeTeamLogo,
  awayTeamLogo,
  homeTeamAbbr,
  awayTeamAbbr,
  onPlayClick
}: PlayGridProps) {
  if (plays.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <svg
          className="w-16 h-16 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-lg font-medium">No plays match your filters</p>
        <p className="text-sm">Try adjusting your filter settings</p>
      </div>
    );
  }

  return (
    <div className="max-h-[600px] overflow-y-auto">
      {plays.map((play, index) => {
        const prevPlay = index > 0 ? plays[index - 1] : undefined;
        const leadChange = prevPlay ? isLeadChange(play, prevPlay) : false;
        const momentumPlay = momentumPlayIds.has(play.id);

        return (
          <PlayCard
            key={play.id}
            play={play}
            isLeadChange={leadChange}
            isMomentumPlay={momentumPlay}
            homeTeamColor={homeTeamColor}
            awayTeamColor={awayTeamColor}
            homeTeamId={homeTeamId}
            awayTeamId={awayTeamId}
            homeTeamLogo={homeTeamLogo}
            awayTeamLogo={awayTeamLogo}
            homeTeamAbbr={homeTeamAbbr}
            awayTeamAbbr={awayTeamAbbr}
            onClick={() => onPlayClick?.(play.id)}
          />
        );
      })}
    </div>
  );
}
