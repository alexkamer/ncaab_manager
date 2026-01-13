'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

interface DateSelectorProps {
  initialDateFrom?: string;
  initialDateTo?: string;
}

export default function DateSelector({ initialDateFrom, initialDateTo }: DateSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dateFrom, setDateFrom] = useState(initialDateFrom || '');
  const [dateTo, setDateTo] = useState(initialDateTo || '');

  const handleApply = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (dateFrom) {
      params.set('date_from', dateFrom);
    } else {
      params.delete('date_from');
    }

    if (dateTo) {
      params.set('date_to', dateTo);
    } else {
      params.delete('date_to');
    }

    router.push(`/games?${params.toString()}`);
  };

  const handleClear = () => {
    setDateFrom('');
    setDateTo('');
    router.push('/games');
  };

  const setToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setDateFrom(today);
    setDateTo(today);
  };

  const setThisWeek = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    setDateFrom(startOfWeek.toISOString().split('T')[0]);
    setDateTo(endOfWeek.toISOString().split('T')[0]);
  };

  return (
    <div className="border border-gray-200 p-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="date_from" className="block text-sm font-medium text-gray-700 mb-1">
            From Date
          </label>
          <input
            type="date"
            id="date_from"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex-1 min-w-[200px]">
          <label htmlFor="date_to" className="block text-sm font-medium text-gray-700 mb-1">
            To Date
          </label>
          <input
            type="date"
            id="date_to"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={setToday}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Today
          </button>
          <button
            onClick={setThisWeek}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            This Week
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            Apply
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
