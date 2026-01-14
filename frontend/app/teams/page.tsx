"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";

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
  conference_id: number;
  wins: number;
  losses: number;
  win_percentage: number;
}

interface Conference {
  group_id: number;
  name: string;
  short_name: string;
  abbreviation: string;
  logo_url: string;
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConference, setSelectedConference] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [teamsRes, confsRes] = await Promise.all([
          fetch(`${API_BASE}/api/teams?season=2026&limit=500`),
          fetch(`${API_BASE}/api/conferences`)
        ]);

        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          setTeams(teamsData.teams || []);
        }

        if (confsRes.ok) {
          const confsData = await confsRes.json();
          setConferences(confsData.conferences || []);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Filter teams
  const filteredTeams = useMemo(() => {
    return teams.filter(team => {
      // Conference filter
      if (selectedConference && team.conference_name !== selectedConference) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesName = team.display_name?.toLowerCase().includes(search);
        const matchesCity = team.venue_city?.toLowerCase().includes(search);
        const matchesState = team.venue_state?.toLowerCase().includes(search);
        if (!matchesName && !matchesCity && !matchesState) return false;
      }

      return true;
    });
  }, [teams, selectedConference, searchTerm]);

  // Group teams by conference
  const teamsByConference = useMemo(() => {
    return filteredTeams.reduce((acc, team) => {
      const conf = team.conference_name || 'Independent';
      if (!acc[conf]) acc[conf] = [];
      acc[conf].push(team);
      return acc;
    }, {} as Record<string, Team[]>);
  }, [filteredTeams]);

  // Get unique conferences from teams for dropdown
  const conferenceOptions = useMemo(() => {
    const uniqueConferences = new Set(teams.map(t => t.conference_name).filter(Boolean));
    return Array.from(uniqueConferences).sort();
  }, [teams]);

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">NCAA Division I Basketball Teams</h1>
        <p className="mt-2 text-gray-600">Browse all Division I teams (362 teams with active schedules)</p>
      </div>

      {/* Filters */}
      <div className="border border-gray-200 p-4 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search Teams
            </label>
            <input
              id="search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by team name or location..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Conference Filter */}
          <div>
            <label htmlFor="conference" className="block text-sm font-medium text-gray-700 mb-1">
              Conference
            </label>
            <select
              id="conference"
              value={selectedConference}
              onChange={(e) => setSelectedConference(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Conferences</option>
              {conferenceOptions.map(conf => (
                <option key={conf} value={conf}>{conf}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results count and clear filters */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-gray-600">
            Showing {filteredTeams.length} of {teams.length} teams
          </span>
          {(searchTerm || selectedConference) && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedConference("");
              }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="border border-gray-200 p-8 text-center text-gray-500">
          <p>Loading teams...</p>
        </div>
      )}

      {/* Teams Grid */}
      {!loading && filteredTeams.length > 0 ? (
        <div className="space-y-8">
          {Object.entries(teamsByConference)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([conference, confTeams]) => (
            <div key={conference} className="border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {conference} ({confTeams.length} {confTeams.length === 1 ? 'team' : 'teams'})
              </h2>
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
      ) : !loading && filteredTeams.length === 0 ? (
        <div className="border border-gray-200 p-8 text-center text-gray-500">
          <p>No teams found matching your filters.</p>
          <button
            onClick={() => {
              setSearchTerm("");
              setSelectedConference("");
            }}
            className="mt-2 text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear filters
          </button>
        </div>
      ) : null}
    </div>
  );
}
