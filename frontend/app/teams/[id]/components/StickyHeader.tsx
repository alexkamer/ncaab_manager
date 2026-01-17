'use client';

import { useEffect, useState } from 'react';
import TabNavigation from './TabNavigation';

interface StickyHeaderProps {
  team: {
    id: number;
    displayName: string;
    abbreviation: string;
    logo: string;
    color?: string;
    rank?: number;
  };
  record: {
    wins?: number;
    losses?: number;
  };
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function StickyHeader({
  team,
  record,
  activeTab,
  onTabChange,
}: StickyHeaderProps) {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show sticky header after scrolling past 300px (past hero section)
      setIsSticky(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-md transition-transform duration-300 ${
        isSticky ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="max-w-7xl mx-auto">
        {/* Compact Team Info Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
          {/* Team Logo and Name */}
          <div className="flex items-center space-x-3">
            {team.logo && (
              <img src={team.logo} alt={team.displayName} className="w-10 h-10" />
            )}
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-gray-900">
                {team.abbreviation || team.displayName}
              </span>
              {team.rank && (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold text-white"
                  style={{
                    backgroundColor: team.color ? `#${team.color}` : '#1f2937'
                  }}
                >
                  #{team.rank}
                </span>
              )}
            </div>
          </div>

          {/* Record */}
          {record.wins !== undefined && record.losses !== undefined && (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-gray-600">Record:</span>
              <span className="text-base font-bold text-gray-900">
                {record.wins}-{record.losses}
              </span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <TabNavigation activeTab={activeTab} onTabChange={onTabChange} />
      </div>
    </div>
  );
}
