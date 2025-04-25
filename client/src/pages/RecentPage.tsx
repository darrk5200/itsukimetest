import { useEffect, useState } from 'react';
import { AnimeListGrid } from '@/components/AnimeCard';
import { Anime } from '@/lib/types';
import { useQuery } from '@tanstack/react-query';
import { getAnimesByLatestEpisode } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

// Helper function to format dates in a readable way
function formatDateForDisplay(dateString: string | undefined): string {
  if (!dateString) return 'Unknown date';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    // Format as month day
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  }
}

export default function RecentPage() {
  const { isLoading, data: animes = [] } = useQuery({
    queryKey: ['/api/animes'],
    refetchOnWindowFocus: false,
  });

  const [recentAnimes, setRecentAnimes] = useState<Anime[]>([]);
  
  useEffect(() => {
    if (animes && animes.length > 0) {
      // Sort by latest episode timestamp
      const sorted = getAnimesByLatestEpisode(animes, animes.length);
      console.log("Recent page sorted anime by timestamp:", 
        sorted.map(a => ({
          name: a.anime_name,
          timestamp: a.lastEpisodeTimestamp,
          formattedDate: formatDateForDisplay(a.lastEpisodeTimestamp)
        }))
      );
      setRecentAnimes(sorted);
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
        <>
          <div className="mb-8">
            <p className="text-muted-foreground mb-4">
              The newest anime episodes that have been added to our collection.
            </p>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {recentAnimes.slice(0, 3).map((anime) => (
                <Badge key={anime.id} variant="outline" className="flex items-center gap-1 px-3 py-1.5">
                  <Clock className="h-3 w-3" />
                  <span>{anime.anime_name}</span>
                  <span className="text-xs text-muted-foreground ml-1">
                    {formatDateForDisplay(anime.lastEpisodeTimestamp)}
                  </span>
                </Badge>
              ))}
            </div>
          </div>
          
          <AnimeListGrid animes={recentAnimes} isNewTag />
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No recent anime found</p>
        </div>
      )}
    </div>
  );
}