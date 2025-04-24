import { useEffect, useState } from 'react';
import { AnimeListGrid } from '@/components/AnimeCard';
import { Anime } from '@/lib/types';
import { useQuery } from '@tanstack/react-query';
import { getAnimesByLatestEpisode } from '@/lib/utils';

export default function RecentPage() {
  const { isLoading, data: animes = [] } = useQuery({
    queryKey: ['/api/animes'],
    refetchOnWindowFocus: false,
  });

  const [recentAnimes, setRecentAnimes] = useState<Anime[]>([]);
  
  useEffect(() => {
    if (animes && animes.length > 0) {
      // Sort by latest episode addition
      setRecentAnimes(getAnimesByLatestEpisode(animes, animes.length));
    }
  }, [animes]);
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading recent anime...</p>
      </div>
    );
  }
  
  return (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">Recently Added</h1>
      
      {recentAnimes.length > 0 ? (
        <AnimeListGrid animes={recentAnimes} isNewTag />
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No recent anime found</p>
        </div>
      )}
    </div>
  );
}