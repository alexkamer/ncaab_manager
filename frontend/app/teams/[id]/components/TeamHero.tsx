import Link from "next/link";

interface TeamHeroProps {
  team: {
    id: number;
    displayName: string;
    abbreviation: string;
    logo: string;
    color?: string;
    conferenceName?: string;
    conferenceAbbr?: string;
    venueCity?: string;
    venueState?: string;
    venueName?: string;
  };
  ranking?: {
    current_rank: number;
  };
  standings: {
    wins?: number;
    losses?: number;
    conference_wins?: number;
    conference_losses?: number;
    home_wins?: number;
    home_losses?: number;
    road_wins?: number;
    road_losses?: number;
    current_streak?: string;
    streak_count?: number;
    playoff_seed?: number;
  };
  completedGames: any[];
  upcomingGames: any[];
}

export default function TeamHero({
  team,
  ranking,
  standings,
  completedGames,
  upcomingGames,
}: TeamHeroProps) {
  return (
    <div
      className="border border-gray-200 p-6 relative overflow-hidden transition-all duration-300 hover:shadow-lg"
      style={{
        background: team.color ? `linear-gradient(135deg, #${team.color}15 0%, #${team.color}05 100%)` : undefined,
        borderLeftWidth: '6px',
        borderLeftColor: team.color ? `#${team.color}` : '#d1d5db'
      }}
    >
      <div className="flex items-start space-x-6 relative z-10">
        {team.logo && (
          <img
            src={team.logo}
            alt={team.displayName}
            className="w-32 h-32 transition-transform duration-200 hover:scale-110 hover:drop-shadow-lg"
          />
        )}
        <div className="flex-1">
          {/* Team Name and Rank */}
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-4xl font-bold text-gray-900 transition-colors duration-200">{team.displayName}</h1>
            {ranking && (
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold text-white shadow-md transition-all duration-200 hover:shadow-xl hover:scale-105"
                style={{
                  backgroundColor: team.color ? `#${team.color}` : '#1f2937'
                }}
              >
                #{ranking.current_rank}
              </span>
            )}
          </div>

          {/* Conference and Location */}
          <div className="flex items-center gap-2 text-base text-gray-600 mb-3">
            {team.conferenceName && team.conferenceName !== '' && (
              <>
                <span className="font-medium">{team.conferenceName}</span>
                {standings.playoff_seed && (
                  <span className="text-sm text-gray-500 ml-1">
                    ({standings.playoff_seed}{standings.playoff_seed === 1 ? 'st' : standings.playoff_seed === 2 ? 'nd' : standings.playoff_seed === 3 ? 'rd' : 'th'})
                  </span>
                )}
              </>
            )}
            {((team.conferenceName && team.conferenceName !== '') && team.venueCity) && (
              <span className="text-gray-400">•</span>
            )}
            {team.venueCity && (
              <span>{team.venueCity}{team.venueState && `, ${team.venueState}`}</span>
            )}
            {team.venueName && team.venueName !== '' && (
              <>
                <span className="text-gray-400">•</span>
                <span>🏟️ {team.venueName}</span>
              </>
            )}
          </div>

          {/* All Records in One Row */}
          {standings.wins !== undefined && (
            <div className="flex items-center gap-4 text-base">
              <div>
                <span className="font-bold text-gray-900">{standings.wins}-{standings.losses}</span>
                <span className="text-gray-500 ml-1.5">Overall</span>
              </div>
              {standings.conference_wins !== undefined && (
                <>
                  <span className="text-gray-300">•</span>
                  <div>
                    <span className="font-bold text-gray-900">{standings.conference_wins}-{standings.conference_losses}</span>
                    <span className="text-gray-500 ml-1.5">Conference</span>
                  </div>
                </>
              )}
              {(standings.home_wins !== undefined && standings.home_wins !== null) && (
                <>
                  <span className="text-gray-300">•</span>
                  <div>
                    <span className="font-bold text-gray-900">{standings.home_wins}-{standings.home_losses || 0}</span>
                    <span className="text-gray-500 ml-1.5">Home</span>
                  </div>
                </>
              )}
              {(standings.road_wins !== undefined && standings.road_wins !== null) && (
                <>
                  <span className="text-gray-300">•</span>
                  <div>
                    <span className="font-bold text-gray-900">{standings.road_wins}-{standings.road_losses || 0}</span>
                    <span className="text-gray-500 ml-1.5">Road</span>
                  </div>
                </>
              )}
              {standings.current_streak && standings.streak_count && (
                <>
                  <span className="text-gray-300">•</span>
                  <div className={`font-semibold px-2 py-0.5 rounded ${standings.current_streak.includes('-') || standings.current_streak === 'L' ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'} ${standings.streak_count >= 3 && !(standings.current_streak.includes('-') || standings.current_streak === 'L') ? 'animate-pulse' : ''}`}>
                    {standings.current_streak.includes('-') ? 'L' : (standings.current_streak === 'W' ? 'W' : 'W')}{Math.abs(standings.streak_count)}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Last 5 Games Visual & Next Game */}
          <div className="flex items-center gap-6 mt-3 flex-wrap">
            {completedGames.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Last 5:</span>
                <div className="flex gap-1">
                  {completedGames.slice(0, 5).map((game: any, idx: number) => {
                    const isHome = game.location === 'home';
                    const teamScore = isHome ? game.home_score : game.away_score;
                    const oppScore = isHome ? game.away_score : game.home_score;
                    const won = teamScore > oppScore;

                    return (
                      <div
                        key={idx}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white transition-transform hover:scale-125 ${
                          won ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        title={`${won ? 'W' : 'L'} vs ${game.opponent_name} ${teamScore}-${oppScore}`}
                      >
                        {won ? 'W' : 'L'}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {upcomingGames.length > 0 && (() => {
              const nextGame = upcomingGames[upcomingGames.length - 1];
              const gameDate = new Date(nextGame.date);
              const now = new Date();
              const daysUntil = Math.ceil((gameDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const isHome = nextGame.location === 'home';

              return (
                <Link
                  href={`/games/${nextGame.event_id}`}
                  className="flex items-center gap-2 text-sm hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <span className="text-gray-500">Next:</span>
                  <span className="font-medium text-gray-900">
                    {isHome ? 'vs' : '@'} {nextGame.opponent_name}
                  </span>
                  <span className="text-gray-500">
                    {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil} days`}
                  </span>
                </Link>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
