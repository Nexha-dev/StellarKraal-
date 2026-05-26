import Skeleton from "./Skeleton";

export default function SkeletonHealthDashboard() {
  return (
    <div className="mt-8 bg-white rounded-2xl p-6 shadow" aria-busy="true" aria-label="Loading health factor">
      <Skeleton className="h-6 w-36 mb-4" />
      <div className="flex gap-2 items-center">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-20" />
      </div>
      <div className="mt-4">
        <div className="flex justify-between mb-1">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-10" />
        </div>
        <Skeleton className="h-4 w-full rounded-full" />
      </div>
    </div>
  );
}
