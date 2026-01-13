'use client';

interface PlayerHeadshotProps {
  athleteId: number;
  fullName: string;
}

export default function PlayerHeadshot({ athleteId, fullName }: PlayerHeadshotProps) {
  return (
    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
      <img
        src={`https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/${athleteId}.png`}
        alt={fullName}
        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
          e.currentTarget.src = 'https://a.espncdn.com/combiner/i?img=/i/headshots/nophoto.png';
        }}
      />
    </div>
  );
}
