'use client';

import { useEffect, useState } from 'react';
import TabNavigation from './TabNavigation';

interface StickyHeaderProps {
  awayTeam: {
    name: string;
    abbr: string;
    logo: string;
    score: number;
  };
  homeTeam: {
    name: string;
    abbr: string;
    logo: string;
    score: number;
  };
  status: string;
  isCompleted?: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function StickyHeader({
  awayTeam,
  homeTeam,
  status,
  isCompleted,
  activeTab,
  onTabChange,
}: StickyHeaderProps) {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show sticky header after scrolling past 400px (past hero section)
      setIsSticky(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const awayWon = awayTeam.score > homeTeam.score;
  const homeWon = homeTeam.score > awayTeam.score;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-md transition-transform duration-300 ${
        isSticky ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="max-w-7xl mx-auto">
        {/* Compact Score Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
          {/* Away Team */}
          <div className="flex items-center space-x-3">
            {awayTeam.logo && (
              <img src={awayTeam.logo} alt={awayTeam.name} className="w-8 h-8" />
            )}
            <div className="flex items-center space-x-2">
              <span className={`font-semibold ${awayWon ? 'text-gray-900' : 'text-gray-500'}`}>
                {awayTeam.abbr}
              </span>
              <span className={`text-xl font-bold ${awayWon ? 'text-gray-900' : 'text-gray-400'}`}>
                {awayTeam.score}
              </span>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center space-x-2">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
              isCompleted
                ? 'bg-gray-100 text-gray-700'
                : 'bg-red-500 text-white'
            }`}>
              {status}
            </span>
          </div>

          {/* Home Team */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className={`text-xl font-bold ${homeWon ? 'text-gray-900' : 'text-gray-400'}`}>
                {homeTeam.score}
              </span>
              <span className={`font-semibold ${homeWon ? 'text-gray-900' : 'text-gray-500'}`}>
                {homeTeam.abbr}
              </span>
            </div>
            {homeTeam.logo && (
              <img src={homeTeam.logo} alt={homeTeam.name} className="w-8 h-8" />
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <TabNavigation activeTab={activeTab} onTabChange={onTabChange} />
      </div>
    </div>
  );
}
