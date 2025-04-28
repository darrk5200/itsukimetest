import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Anime } from '@/lib/types';
import { getWatchLaterList, removeFromWatchLater } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AnimeCard } from '@/components/AnimeCard';
import { Trash2 } from 'lucide-react';

export default function WatchLaterPage() {
  const { toast } = useToast();
  const [watchLaterIds, setWatchLaterIds] = useState<number[]>([]);
  const [watchLaterAnimes, setWatchLaterAnimes] = useState<Anime[]>([]);
  
  // Get all animes
  const { data: animes } = useQuery({
    queryKey: ['/api/animes'],
  });
  
  // Load watch later list
  useEffect(() => {
    const ids = getWatchLaterList();
    setWatchLaterIds(ids);
  }, []);
  
  // Filter animes to get only those in watch later list
  useEffect(() => {
    if (animes && watchLaterIds.length > 0) {
      const filtered = animes.filter((anime: Anime) => 
        watchLaterIds.includes(anime.id)
      );
      setWatchLaterAnimes(filtered);
    } else {
      setWatchLaterAnimes([]);
    }
  }, [animes, watchLaterIds]);
  
  // Handle remove from watch later
  const handleRemove = (animeId: number, animeName: string) => {
    removeFromWatchLater(animeId);
    setWatchLaterIds(prev => prev.filter(id => id !== animeId));
    toast({
      title: "Removed from Bookmarks",
      description: `${animeName} has been removed from your Bookmarks list`,
      duration: 2000,
    });
  };
  
  // Clear all watch later items
  const handleClearAll = () => {
    if (watchLaterIds.length === 0) return;
    
    watchLaterIds.forEach(id => removeFromWatchLater(id));
    setWatchLaterIds([]);
    
    toast({
      title: "Bookmarks List Cleared",
      description: "All animes have been removed from your Bookmarks list",
      duration: 2000,
    });
  };
  
  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Bookmarks</h1>
        {watchLaterAnimes.length > 0 && (
          <Button 
            variant="destructive" 
            size="sm"
            className="flex items-center gap-2"
            onClick={handleClearAll}
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear All</span>
          </Button>
        )}
      </div>
      
      {watchLaterAnimes.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {watchLaterAnimes.map((anime) => (
            <div key={anime.id} className="relative group">
              <AnimeCard anime={anime} />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRemove(anime.id, anime.anime_name);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <h2 className="text-xl font-medium mb-2">Your Bookmarks list is empty</h2>
          <p className="text-muted-foreground mb-6">
            Add anime to your Bookmarks list by clicking the bookmark icon on anime cards or pages.
          </p>
        </div>
      )}
    </div>
  );
}