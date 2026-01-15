export default function PlayByPlaySkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header Skeleton */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-gray-300 rounded w-48"></div>
          <div className="flex space-x-2">
            <div className="h-10 w-24 bg-gray-200 rounded"></div>
            <div className="h-10 w-24 bg-gray-200 rounded"></div>
          </div>
        </div>

        {/* Filters Skeleton */}
        <div className="flex flex-wrap gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-8 w-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>

      {/* Plays List Skeleton */}
      <div className="space-y-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-gray-300 rounded w-32"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="h-5 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="flex space-x-4 mt-2">
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
