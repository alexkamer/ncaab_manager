"use client";

import Link from "next/link";
import { useState } from "react";

interface Leader {
  athlete_id: string;
  display_name: string;
  position_name: string;
  headshot_url: string;
  pra: number;
  avg_points: number;
  avg_rebounds: number;
  avg_assists: number;
}

export default function TopContributorCard({ leader, idx }: { leader: Leader; idx: number }) {
  const [imageError, setImageError] = useState(false);

  const rankColors = [
    { border: 'border-yellow-400', bg: 'bg-gradient-to-br from-yellow-50 to-amber-50', badge: 'bg-yellow-400 text-yellow-900', ring: 'ring-yellow-400' },
    { border: 'border-gray-300', bg: 'bg-gradient-to-br from-gray-50 to-slate-50', badge: 'bg-gray-300 text-gray-900', ring: 'ring-gray-300' },
    { border: 'border-orange-300', bg: 'bg-gradient-to-br from-orange-50 to-amber-50', badge: 'bg-orange-300 text-orange-900', ring: 'ring-orange-300' }
  ];
  const colors = rankColors[idx];

  return (
    <Link
      href={`/players/${leader.athlete_id}`}
      className={`relative p-5 rounded-xl border-2 ${colors.border} ${colors.bg} hover:shadow-xl hover:scale-105 transition-all duration-200 group`}
    >
      {/* Rank Badge */}
      <div className={`absolute -top-3 -left-3 w-10 h-10 ${colors.badge} rounded-full flex items-center justify-center text-lg font-bold shadow-lg z-10`}>
        {idx + 1}
      </div>

      {/* Player Photo & Info */}
      <div className="flex items-center gap-4 mb-5">
        <div className={`relative ring-4 ${colors.ring} rounded-full overflow-hidden bg-white flex-shrink-0`}>
          {leader.headshot_url && !imageError ? (
            <img
              src={leader.headshot_url}
              alt={leader.display_name}
              className="w-24 h-24 object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-24 h-24 flex items-center justify-center bg-gray-200 text-gray-400 text-3xl font-bold">
              {leader.display_name?.charAt(0)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-900 text-xl leading-tight group-hover:text-blue-600 transition-colors">
            {leader.display_name}
          </div>
          <div className="text-sm text-gray-600 mt-1">{leader.position_name}</div>
        </div>
      </div>

      {/* Stats Breakdown */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{leader.avg_points}</div>
          <div className="text-xs text-gray-500 font-medium">PPG</div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{leader.avg_rebounds}</div>
          <div className="text-xs text-gray-500 font-medium">RPG</div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{leader.avg_assists}</div>
          <div className="text-xs text-gray-500 font-medium">APG</div>
        </div>
      </div>
    </Link>
  );
}
