import Skeleton from "./Skeleton";

export default function SkeletonCollateralCard() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow mb-4" aria-busy="true" aria-label="Loading loan data">
      <Skeleton className="h-6 w-40 mb-4" />
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  );
}
