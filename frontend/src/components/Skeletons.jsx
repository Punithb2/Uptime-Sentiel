function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`sentinel-skeleton ${className}`} />;
}

export function RouteSkeleton() {
  return (
    <div className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-64 rounded-xl" />
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8" aria-label="Loading dashboard">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );
}

export function MonitorGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3" aria-label="Loading monitors">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-36 rounded-lg" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-4 w-52 rounded" />
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
          <Skeleton className="h-8 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <div className="flex items-center gap-4">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-60 rounded-lg" />
          <Skeleton className="h-4 w-96 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, idx) => (
          <Skeleton key={idx} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );
}

export function ListSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-4" aria-label="Loading list">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-24 rounded-2xl" />
      ))}
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <Skeleton className="h-9 w-60 rounded-xl" />
      <Skeleton className="h-12 w-80 rounded-xl" />
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}

export function PublicStatusSkeleton() {
  return (
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="mx-auto space-y-3 text-center flex flex-col items-center">
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <Skeleton className="h-8 w-56 rounded-xl" />
        </div>
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}

export default Skeleton;
