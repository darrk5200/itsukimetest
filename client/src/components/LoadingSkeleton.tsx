import { Skeleton } from "@/components/ui/skeleton";

export function LoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-6 animate-pulse">
      {/* Hero section skeleton */}
      <div className="rounded-lg bg-muted/30 w-full h-64 mb-8"></div>
      
      {/* Section Title */}
      <div className="mb-6">
        <Skeleton className="h-7 w-48 mb-4" />
        
        {/* Grid of content cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="flex flex-col">
              <Skeleton className="w-full aspect-[2/3] rounded-md mb-2" />
              <Skeleton className="h-4 w-3/4 mb-1" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Second section */}
      <div className="mt-8">
        <Skeleton className="h-7 w-36 mb-4" />
        
        {/* Second grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="flex flex-col">
              <Skeleton className="w-full aspect-[2/3] rounded-md mb-2" />
              <Skeleton className="h-4 w-3/4 mb-1" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AnimeDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-6 animate-pulse">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Anime poster */}
        <Skeleton className="w-full md:w-64 aspect-[2/3] rounded-md flex-shrink-0" />
        
        {/* Anime details */}
        <div className="flex-1">
          <Skeleton className="h-8 w-3/4 mb-4" />
          <div className="flex gap-2 mb-4">
            {Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-5 w-16 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-4 w-2/3 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-6" />
          
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>
      
      {/* Episodes section */}
      <div className="mt-8">
        <Skeleton className="h-7 w-48 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}