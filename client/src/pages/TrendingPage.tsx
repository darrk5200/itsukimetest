import { useEffect, useState } from 'react';
import { TrendingSection } from '@/components/TrendingSection';
import { Anime } from '@/lib/types';
import { useQuery } from '@tanstack/react-query';

export default function TrendingPage() {
  const { isLoading, data: animes = [] } = useQuery<Anime[]>({
    queryKey: ['/api/animes'],
    refetchOnWindowFocus: false,
  });

  const [trendingAnimes, setTrendingAnimes] = useState<Anime[]>([]);
  
  useEffect(() => {
    if (animes && animes.length > 0) {
      // For a real app, we'd sort by popularity or trending metrics
      // For now, we'll just show all animes as trending
      setTrendingAnimes(animes);
    }
  }, [animes]);
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading popular anime...</p>
      </div>
    );
  }
  
  return (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">Popular Anime</h1>
      
      {trendingAnimes.length > 0 ? (
        <TrendingSection animes={trendingAnimes} />
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No popular anime found</p>
        </div>
      )}
    </div>
  );
}