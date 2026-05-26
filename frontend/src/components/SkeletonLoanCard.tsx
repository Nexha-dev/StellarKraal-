import Skeleton from "./Skeleton";

export default function SkeletonLoanCard() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow mt-6 space-y-4" aria-busy="true" aria-label="Loading loan form">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}
