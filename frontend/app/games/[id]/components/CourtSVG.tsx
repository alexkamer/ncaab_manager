// Basketball court SVG component for shot charts

interface CourtSVGProps {
  homeTeamColor?: string;
  awayTeamColor?: string;
}

export default function CourtSVG({ homeTeamColor = "#1f2937", awayTeamColor = "#374151" }: CourtSVGProps) {
  return (
    <svg
      viewBox="0 0 500 470"
      className="w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Court background */}
      <rect x="0" y="0" width="500" height="470" fill="#f9fafb" />

      {/* Court outline */}
      <rect x="10" y="10" width="480" height="450" fill="#d1d5db" stroke="#9ca3af" strokeWidth="2" />

      {/* Baseline */}
      <line x1="10" y1="10" x2="490" y2="10" stroke="#374151" strokeWidth="3" />

      {/* Free throw lane (the paint) */}
      <rect x="190" y="10" width="120" height="190" fill="none" stroke="#374151" strokeWidth="2" />

      {/* Free throw circle (top half) */}
      <circle cx="250" cy="200" r="60" fill="none" stroke="#374151" strokeWidth="2" strokeDasharray="0 188.5" />
      <path
        d="M 190 200 A 60 60 0 0 1 310 200"
        fill="none"
        stroke="#374151"
        strokeWidth="2"
      />

      {/* Free throw circle (bottom half - dashed) */}
      <path
        d="M 310 200 A 60 60 0 0 1 190 200"
        fill="none"
        stroke="#374151"
        strokeWidth="2"
        strokeDasharray="5,5"
      />

      {/* Backboard */}
      <line x1="210" y1="10" x2="290" y2="10" stroke="#374151" strokeWidth="4" />

      {/* Hoop */}
      <circle cx="250" cy="40" r="9" fill="none" stroke="#dc2626" strokeWidth="2.5" />

      {/* 3-point line (arc) */}
      <path
        d="M 30 10 Q 30 340, 250 340 T 470 10"
        fill="none"
        stroke="#374151"
        strokeWidth="2"
      />

      {/* 3-point line corners */}
      <line x1="10" y1="10" x2="30" y2="10" stroke="#374151" strokeWidth="2" />
      <line x1="30" y1="10" x2="30" y2="130" stroke="#374151" strokeWidth="2" />
      <line x1="470" y1="10" x2="490" y2="10" stroke="#374151" strokeWidth="2" />
      <line x1="470" y1="10" x2="470" y2="130" stroke="#374151" strokeWidth="2" />

      {/* Restricted area (small arc under basket) */}
      <path
        d="M 210 10 A 40 40 0 0 0 290 10"
        fill="none"
        stroke="#374151"
        strokeWidth="2"
      />

      {/* Center court line (half court) */}
      <line x1="10" y1="460" x2="490" y2="460" stroke="#374151" strokeWidth="2" strokeDasharray="5,5" />

      {/* Labels */}
      <text x="250" y="420" textAnchor="middle" fontSize="14" fill="#6b7280" fontWeight="600">
        3PT
      </text>
      <text x="250" y="220" textAnchor="middle" fontSize="12" fill="#6b7280" fontWeight="500">
        Paint
      </text>
    </svg>
  );
}
