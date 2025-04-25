import { useEffect, useState } from 'react';
import { AnimeListGrid } from '@/components/AnimeCard';
import { Anime, WatchHistoryItem } from '@/lib/types';
import { useQuery } from '@tanstack/react-query';
import { getRandomItemsFromArray } from '@/lib/utils';
import { getWatchHistory } from '@/lib/storage';

export default function RecommendedPage() {
  const { isLoading, data: animes = [] } = useQuery({
    queryKey: ['/api/animes'],
    refetchOnWindowFocus: false,
  });

  const [recommendedAnimes, setRecommendedAnimes] = useState<Anime[]>([]);
  
  useEffect(() => {
    if (animes && animes.length > 0) {
      // Get watch history
      const watchHistory = getWatchHistory();
      
      // If no history, show all animes
      if (watchHistory.length === 0) {
        setRecommendedAnimes(animes);
        return;
      }
      
      // Extract genres from watched animes
      const watchedAnimeIds = watchHistory.map(item => item.animeId);
      const watchedAnimes = animes.filter(anime => watchedAnimeIds.includes(anime.id));
      const watchedGenres = new Set<string>();
      
      watchedAnimes.forEach(anime => {
        anime.genres.forEach(genre => watchedGenres.add(genre));
      });
      
      // Filter animes that match watched genres
      const recommendations = animes.filter(anime => {
        // Check if any genre matches
        return anime.genres.some(genre => watchedGenres.has(genre));
      });
      
      // If we have recommendations based on history, use them; otherwise, show all animes
      setRecommendedAnimes(recommendations.length > 0 ? recommendations : animes);
    }
  }, [animes]);
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading recommendations...</p>
      </div>
    );
  }
  
  return (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">Recommended For You</h1>
      
      {recommendedAnimes.length > 0 ? (
        <AnimeListGrid animes={recommendedAnimes} />
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No recommendations found</p>
        </div>
      )}
    </div>
  );
}