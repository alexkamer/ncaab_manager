'use client';

import Link from "next/link";
import { useState } from "react";
import PlayerHeadshot from "../PlayerHeadshot";

interface RosterTabProps {
  roster: any[];
  teamColor?: string;
}

export default function RosterTab({
  roster,
  teamColor,
}: RosterTabProps) {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  if (!roster || roster.length === 0) {
    return (
      <div className="border border-gray-200 p-12 bg-white rounded-lg shadow-sm text-center">
        <p className="text-gray-600">No roster information available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex justify-end">
        <div className="inline-flex rounded-lg border border-gray-300 p-1 bg-white">
          <button
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'table'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Table View
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'cards'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Card View
          </button>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="border border-gray-200 bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Roster</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Height
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Weight
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Class
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {roster.map((player: any) => (
                  <tr key={player.athlete_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/players/${player.athlete_id}`}
                        className="flex items-center gap-3 group"
                      >
                        <PlayerHeadshot athleteId={player.athlete_id} fullName={player.full_name} />
                        <span className="text-sm font-medium text-blue-600 group-hover:text-blue-800">
                          {player.full_name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {player.jersey || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {player.position_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {player.height_inches ? `${Math.floor(player.height_inches / 12)}'${player.height_inches % 12}"` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {player.weight_lbs ? `${player.weight_lbs} lbs` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {player.experience_display || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Card View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roster.map((player: any) => (
            <Link
              key={player.athlete_id}
              href={`/players/${player.athlete_id}`}
              className="border border-gray-200 p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <PlayerHeadshot athleteId={player.athlete_id} fullName={player.full_name} />
                  {player.jersey && (
                    <div
                      className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg"
                      style={{
                        backgroundColor: teamColor ? `#${teamColor}` : '#1f2937'
                      }}
                    >
                      {player.jersey}
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{player.full_name}</h3>
                <div className="flex gap-2 mb-3">
                  {player.position_name && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {player.position_name}
                    </span>
                  )}
                  {player.experience_display && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {player.experience_display}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  {player.height_inches && (
                    <div>{Math.floor(player.height_inches / 12)}'{player.height_inches % 12}"</div>
                  )}
                  {player.weight_lbs && (
                    <div>{player.weight_lbs} lbs</div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
