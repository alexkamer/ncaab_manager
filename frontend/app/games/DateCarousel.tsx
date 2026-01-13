'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface DateCarouselProps {
  selectedDate?: string;
  serverToday: string;
}

export default function DateCarousel({ selectedDate, serverToday }: DateCarouselProps) {
  const router = useRouter();
  const [todayStr, setTodayStr] = useState(serverToday);

  // Use server date as the source of truth
  useEffect(() => {
    setTodayStr(serverToday);
  }, [serverToday]);

  // Generate 7 days centered around today or selected date
  const generateDates = () => {
    const dates = [];
    const centerDate = selectedDate ? new Date(selectedDate + 'T12:00:00') : new Date(todayStr + 'T12:00:00');

    for (let i = -3; i <= 3; i++) {
      const date = new Date(centerDate);
      date.setDate(centerDate.getDate() + i);
      dates.push(date);
    }

    return dates;
  };

  const dates = generateDates();

  const handleDateClick = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    router.push(`/games?date=${dateStr}`);
  };

  const handlePrevious = () => {
    const newDate = new Date(dates[0]);
    newDate.setDate(newDate.getDate() - 1);
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, '0');
    const day = String(newDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    router.push(`/games?date=${dateStr}`);
  };

  const handleNext = () => {
    const newDate = new Date(dates[dates.length - 1]);
    newDate.setDate(newDate.getDate() + 1);
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, '0');
    const day = String(newDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    router.push(`/games?date=${dateStr}`);
  };

  return (
    <div className="border border-gray-200 bg-white">
      <div className="flex items-center">
        {/* Previous button */}
        <button
          onClick={handlePrevious}
          className="px-4 py-4 text-gray-600 hover:bg-gray-50 border-r border-gray-200"
          aria-label="Previous dates"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Date buttons */}
        <div className="flex-1 flex overflow-x-auto">
          {dates.map((date) => {
            const dateStr = date.toISOString().split('T')[0];
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === todayStr;

            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const actualDateStr = `${year}-${month}-${day}`;
            const actualIsSelected = actualDateStr === selectedDate;

            return (
              <button
                key={actualDateStr}
                onClick={() => handleDateClick(date)}
                className={`flex-1 min-w-[100px] px-4 py-3 text-center border-r border-gray-200 hover:bg-gray-50 transition-colors ${
                  actualIsSelected ? 'bg-gray-900 text-white hover:bg-gray-800' : ''
                }`}
              >
                <div className={`text-xs font-medium uppercase mb-1 ${actualIsSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={`text-sm font-bold ${actualIsSelected ? 'text-white' : 'text-gray-900'}`}>
                  {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                {isToday && !actualIsSelected && (
                  <div className="text-xs text-blue-600 font-medium mt-1">Today</div>
                )}
              </button>
            );
          })}
        </div>

        {/* Next button */}
        <button
          onClick={handleNext}
          className="px-4 py-4 text-gray-600 hover:bg-gray-50 border-l border-gray-200"
          aria-label="Next dates"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
