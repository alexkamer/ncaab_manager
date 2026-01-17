import Link from "next/link";
import PlayerDetails from "./PlayerDetails";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getPlayer(athleteId: string) {
  try {
    const res = await fetch(`${API_BASE}/api/players/${athleteId}?season=2026`, {
      cache: 'no-store'
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Failed to fetch player:", error);
    return null;
  }
}

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getPlayer(id);

  if (!player) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900">Player Not Found</h1>
        <Link href="/players" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
          ← Back to Players
        </Link>
      </div>
    );
  }

  return <PlayerDetails player={player} />;
}
