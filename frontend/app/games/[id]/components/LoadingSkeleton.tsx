export function CardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden animate-pulse">
      <div className="bg-gray-200 px-6 py-4 border-b border-gray-200">
        <div className="h-6 bg-gray-300 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-gray-300 rounded w-1/4"></div>
      </div>
      <div className="p-6 space-y-4">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden animate-pulse">
      <div className="bg-gray-200 px-6 py-4 border-b border-gray-200">
        <div className="h-5 bg-gray-300 rounded w-2/3 mb-1"></div>
        <div className="h-3 bg-gray-300 rounded w-1/3"></div>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
          <div className="flex items-center space-x-3 flex-1">
            <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-300 rounded w-24"></div>
              <div className="h-3 bg-gray-300 rounded w-16"></div>
            </div>
          </div>
          <div className="h-8 w-12 bg-gray-300 rounded"></div>
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
          <div className="flex items-center space-x-3 flex-1">
            <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-300 rounded w-24"></div>
              <div className="h-3 bg-gray-300 rounded w-16"></div>
            </div>
          </div>
          <div className="h-8 w-12 bg-gray-300 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden animate-pulse">
      <div className="bg-gray-200 px-6 py-4 border-b border-gray-200">
        <div className="h-6 bg-gray-300 rounded w-1/4"></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              {[...Array(8)].map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <div className="h-4 bg-gray-300 rounded"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(rows)].map((_, i) => (
              <tr key={i} className="border-b border-gray-200">
                {[...Array(8)].map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function OverviewSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <CardSkeleton />
    </div>
  );
}

export function BoxScoreSkeleton() {
  return (
    <div className="space-y-8">
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden animate-pulse">
        <div className="bg-gray-200 px-6 py-4 border-b border-gray-200">
          <div className="h-6 bg-gray-300 rounded w-48"></div>
        </div>
        <div className="p-6">
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
      <TableSkeleton rows={8} />
      <TableSkeleton rows={8} />
    </div>
  );
}

export function AdvancedStatsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden animate-pulse">
        <div className="bg-gray-200 px-6 py-4 border-b border-gray-200">
          <div className="h-6 bg-gray-300 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-1/4"></div>
        </div>
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-4">
                <div className="h-4 bg-gray-300 rounded w-1/2 mx-auto"></div>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="h-12 w-24 bg-gray-200 rounded mx-auto mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-16 mx-auto mb-3"></div>
                    <div className="w-full bg-gray-200 rounded-full h-3"></div>
                  </div>
                  <div className="text-center">
                    <div className="h-12 w-24 bg-gray-200 rounded mx-auto mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-16 mx-auto mb-3"></div>
                    <div className="w-full bg-gray-200 rounded-full h-3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}

export function PredictionsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden animate-pulse">
        <div className="bg-gray-200 px-6 py-4 border-b border-gray-200">
          <div className="h-6 bg-gray-300 rounded w-1/3"></div>
        </div>
        <div className="p-8 space-y-8">
          <div className="space-y-6">
            <div className="h-4 bg-gray-300 rounded w-32 mb-4"></div>
            <div className="space-y-6">
              {[...Array(2)].map((_, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                      <div className="h-5 bg-gray-300 rounded w-32"></div>
                    </div>
                    <div className="h-10 w-20 bg-gray-300 rounded"></div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <CardSkeleton />
    </div>
  );
}
