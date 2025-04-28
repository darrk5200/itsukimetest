import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  getWatchHistory, 
  removeFromWatchHistory, 
  clearWatchHistory 
} from '@/lib/storage';
import { Anime, WatchHistoryItem } from '@/lib/types';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface WatchHistoryEntryProps {
  historyItem: WatchHistoryItem;
  anime?: Anime;
  onRemove: () => void;
}

function WatchHistoryEntry({ historyItem, anime, onRemove }: WatchHistoryEntryProps) {
  if (!anime) return null;
  
  const episode = anime.episodes.find(ep => ep.id === historyItem.episodeId);
  if (!episode) return null;
  
  const date = new Date(historyItem.lastWatched);
  const formattedDate = date.toLocaleDateString();
  const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  return (
    <div className="bg-card border border-border rounded-md overflow-hidden flex flex-row">
      <Link href={`/anime/${anime.id}/episode/${episode.id}`} className="w-2/5">
        <div 
          className="w-full h-28 relative flex-shrink-0 cursor-pointer"
          onClick={() => setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 10)}
        >
          <img 
            src={episode.thumbnail} 
            alt={`${anime.anime_name} - Episode ${episode.episode_number}`} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-40 hover:bg-opacity-20 transition-opacity flex items-center justify-center">
            <div className="bg-primary/90 rounded-full p-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </Link>
      
      <div className="p-3 flex-1 w-3/5 flex flex-col justify-center">
        <div>
          <Link href={`/anime/${anime.id}`}>
            <span 
              className="text-base font-semibold hover:text-primary transition-colors cursor-pointer block"
              onClick={() => setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 10)}
            >
              {anime.anime_name}
            </span>
          </Link>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            Episode {episode.episode_number}: {episode.title || 'No Title'}
          </p>
          
          <div className="flex justify-end items-center mt-2">
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onRemove}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [updateTrigger, setUpdateTrigger] = useState(0);
  
  // Fetch all animes
  const { data: animes = [] } = useQuery<Anime[]>({
    queryKey: ['/api/animes'],
  });
  
  // Load watch history from local storage
  useEffect(() => {
    setHistory(getWatchHistory());
  }, [updateTrigger]);
  
  const handleRemoveItem = (animeId: number, episodeId: number) => {
    removeFromWatchHistory(animeId, episodeId);
    setUpdateTrigger(prev => prev + 1);
  };
  
  const handleClearHistory = () => {
    clearWatchHistory();
    setUpdateTrigger(prev => prev + 1);
  };
  
  // Sort history by most recent first
  const sortedHistory = [...history].sort((a, b) => {
    return new Date(b.lastWatched).getTime() - new Date(a.lastWatched).getTime();
  });
  
  // Group history by day
  const groupedHistory: Record<string, WatchHistoryItem[]> = {};
  sortedHistory.forEach(item => {
    const date = new Date(item.lastWatched).toLocaleDateString();
    if (!groupedHistory[date]) {
      groupedHistory[date] = [];
    }
    groupedHistory[date].push(item);
  });
  
  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Watch History</h1>
        <div className="flex flex-wrap gap-2 md:mt-0">
          <Button variant="outline" onClick={() => setUpdateTrigger(prev => prev + 1)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={history.length === 0}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear History
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear Watch History?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently clear your entire watch history.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearHistory}>
                  Clear History
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      
      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <svg
            className="h-16 w-16 text-muted-foreground mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-xl font-medium mb-2">No Watch History</h2>
          <p className="text-muted-foreground mb-6">Start watching some anime to build your history.</p>
          <Button asChild>
            <Link href="/">Browse Anime</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedHistory)
            .sort((a, b) => {
              // Sort dates in descending order (newest first)
              return new Date(b[0]).getTime() - new Date(a[0]).getTime();
            })
            .map(([date, items]) => (
            <div key={date}>
              <h2 className="text-lg font-medium mb-4 border-b border-muted pb-2">{date}</h2>
              <div className="space-y-3">
                {items.map((item) => {
                  const anime = animes.find((a: Anime) => a.id === item.animeId);
                  return (
                    <WatchHistoryEntry
                      key={`${item.animeId}-${item.episodeId}`}
                      historyItem={item}
                      anime={anime}
                      onRemove={() => handleRemoveItem(item.animeId, item.episodeId)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
