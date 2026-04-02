'use client'

export default function DashboardLoading() {
  return (
    <div className="flex h-full animate-pulse">
      {/* Email List Skeleton */}
      <div className="w-[380px] bg-white border-r border-gray-200 flex-shrink-0 flex flex-col">
        {/* Header skeleton */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-5 w-16 bg-gray-200 rounded" />
              <div className="h-4 w-8 bg-gray-100 rounded-full" />
            </div>
          </div>
          <div className="h-8 bg-gray-100 rounded-lg" />
        </div>

        {/* Email items skeleton */}
        <div className="flex-1 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-gray-200 rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="h-3.5 bg-gray-200 rounded w-28" />
                    <div className="h-3 bg-gray-100 rounded w-8" />
                  </div>
                  <div className="h-3.5 bg-gray-200 rounded w-48" />
                  <div className="h-3 bg-gray-100 rounded w-64" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Email View Skeleton */}
      <div className="flex-1 bg-white min-w-0 flex flex-col">
        <div className="p-8 space-y-6">
          <div className="h-6 bg-gray-200 rounded w-96" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-200 rounded-full" />
            <div className="space-y-1.5">
              <div className="h-3.5 bg-gray-200 rounded w-40" />
              <div className="h-3 bg-gray-100 rounded w-28" />
            </div>
          </div>
          <div className="space-y-3 pt-4">
            <div className="h-3.5 bg-gray-100 rounded w-full" />
            <div className="h-3.5 bg-gray-100 rounded w-5/6" />
            <div className="h-3.5 bg-gray-100 rounded w-4/6" />
            <div className="h-3.5 bg-gray-100 rounded w-full" />
            <div className="h-3.5 bg-gray-100 rounded w-3/6" />
          </div>
        </div>
      </div>
    </div>
  )
}
