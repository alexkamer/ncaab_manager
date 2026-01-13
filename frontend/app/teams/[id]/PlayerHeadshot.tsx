'use client';

import { useState, useEffect, useRef } from 'react';

interface PlayerHeadshotProps {
  athleteId: number;
  fullName: string;
}

export default function PlayerHeadshot({ athleteId, fullName }: PlayerHeadshotProps) {
  const [imgSrc, setImgSrc] = useState(
    `https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/${athleteId}.png`
  );
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc('https://a.espncdn.com/combiner/i?img=/i/headshots/nophoto.png');
    }
  };

  // Check if image failed to load after mounting
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      handleError();
    }
  }, []);

  return (
    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
      <img
        ref={imgRef}
        src={imgSrc}
        alt={fullName}
        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
        onError={handleError}
      />
    </div>
  );
}
