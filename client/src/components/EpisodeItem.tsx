import { Link, useLocation } from 'wouter';
import { Play, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Episode } from '@/lib/types';
import { cn, formatDuration } from '@/lib/utils';
import React, { useState, useEffect, FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface EpisodeItemProps {
  episode: Episode;
  animeId: number;
  isActive?: boolean;
  className?: string;
}

function EpisodeItemComponent({ episode, animeId, isActive = false, className }: EpisodeItemProps) {
  const [, navigate] = useLocation();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(`/anime/${animeId}/episode/${episode.id}`);
    // Scroll to episode title container instead of to the top
    setTimeout(() => {
      document.getElementById('episodeTitleContainer')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };
  
  return (
    <div 
      className={cn(
        "episode-item border border-muted rounded-lg overflow-hidden transition-colors hover:border-primary cursor-pointer",
        isActive && "border-blue-500 border-l-2 bg-blue-100/20",
        className
      )}
      onClick={handleClick}
    >
      <div className="relative">
        <img 
          src={episode.thumbnail} 
          alt={`Episode ${episode.episode_number}`} 
          className="w-full aspect-video object-cover" 
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black bg-opacity-40 hover:bg-opacity-20 transition-all flex items-center justify-center">
          <Play className="h-10 w-10 text-white" />
        </div>
        <div className="absolute bottom-2 right-2 bg-primary text-white text-xs px-1 rounded">
          {formatDuration(episode.duration)}
        </div>
      </div>
      <div className="p-1 sm:p-2">
        <div className="text-xs sm:text-sm font-medium">Ep {episode.episode_number}</div>
        <div className="text-xs text-muted-foreground truncate">{episode.title}</div>
      </div>
    </div>
  );
}

// Prevent unnecessary re-renders with comparison function
const episodeItemPropsAreEqual = (prevProps: EpisodeItemProps, nextProps: EpisodeItemProps): boolean => {
  return prevProps.episode.id === nextProps.episode.id && 
         prevProps.animeId === nextProps.animeId &&
         prevProps.isActive === nextProps.isActive;
};

// Create a memoized component first (to fix the circular reference)
const MemoizedEpisodeItem = React.memo(EpisodeItemComponent, episodeItemPropsAreEqual);

// Export the memoized component
export const EpisodeItem = MemoizedEpisodeItem;

interface EpisodeListProps {
  episodes: Episode[];
  animeId: number;
  activeEpisodeId?: number;
  className?: string;
  layout?: 'grid' | 'vertical'; // Add layout prop to control display style
}

export function EpisodeList({ 
  episodes, 
  animeId, 
  activeEpisodeId, 
  className,
  layout = 'grid' // Default to grid layout
}: EpisodeListProps) {
  const [, navigate] = useLocation();
  const [currentPage, setCurrentPage] = useState(0);
  const [episodeNumber, setEpisodeNumber] = useState('');
  
  // Responsive episodes per page based on screen size
  const EPISODES_PER_PAGE = {
    lg: 6,  // large devices (lg and above)
    md: 3,  // medium devices (md)
    sm: 3,  // small devices (sm)
    xs: 2   // extra small devices (default)
  };
  
  // Default to mobile size
  const [episodesPerPage, setEpisodesPerPage] = useState(EPISODES_PER_PAGE.xs);
  
  // Update episodes per page based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setEpisodesPerPage(EPISODES_PER_PAGE.lg);
      } else if (window.innerWidth >= 768) {
        setEpisodesPerPage(EPISODES_PER_PAGE.md);
      } else if (window.innerWidth >= 640) {
        setEpisodesPerPage(EPISODES_PER_PAGE.sm);
      } else {
        setEpisodesPerPage(EPISODES_PER_PAGE.xs);
      }
    };
    
    // Set initial value
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Calculate total pages needed
  const totalPages = Math.ceil(episodes.length / episodesPerPage);
  
  // Get current page of episodes
  const currentEpisodes = episodes.slice(
    currentPage * episodesPerPage, 
    (currentPage + 1) * episodesPerPage
  );
  
  // Handle page navigation
  const goToPrevPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };
  
  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };
  
  // Handle direct episode navigation
  const handleEpisodeJump = (e: FormEvent) => {
    e.preventDefault();
    
    const epNumber = parseInt(episodeNumber);
    
    // Validate episode number
    if (isNaN(epNumber) || epNumber < 1 || epNumber > episodes.length) {
      alert(`Please enter a valid episode number between 1 and ${episodes.length}.`);
      return;
    }
    
    // Find episode by number
    const episode = episodes.find(ep => ep.episode_number === epNumber);
    if (episode) {
      // Navigate to the episode
      navigate(`/anime/${animeId}/episode/${episode.id}`);
      // Scroll to episode title container for better user experience
      setTimeout(() => {
        document.getElementById('episodeTitleContainer')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      alert(`Episode ${epNumber} not found.`);
    }
  };
  
  return (
    <div className={cn("relative", className)}>
      {/* Episode jump form */}
      <div className={cn(
        "mb-4",
        // Adjust width for side panel
        "[.side-panel_&]:w-full"
      )}>
        <form onSubmit={handleEpisodeJump} className="flex items-center gap-2">
          <div className="flex-1 relative flex items-center">
            <Input
              type="number"
              min="1"
              max={episodes.length}
              placeholder={`Enter episode (1-${episodes.length})`}
              value={episodeNumber}
              onChange={(e) => setEpisodeNumber(e.target.value)}
              className="pr-2 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none"
            />
            <Button type="submit" size="sm" className="min-w-[40px] ml-1">Go</Button>
          </div>
        </form>
      </div>
      
      <div className="mb-2 max-h-[270px] overflow-y-auto side-panel">
        {layout === 'vertical' ? (
          // Vertical list layout for mobile
          <div className="flex flex-col gap-3 pr-2">
            {episodes.map((episode) => (
              <div
                key={episode.id}
                className={cn(
                  "episode-item border border-muted rounded-lg overflow-hidden transition-colors hover:border-primary cursor-pointer",
                  episode.id === activeEpisodeId && "border-blue-500 border-l-2 bg-blue-100/20"
                )}
                onClick={() => {
                  navigate(`/anime/${animeId}/episode/${episode.id}`);
                  setTimeout(() => {
                    document.getElementById('episodeTitleContainer')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
              >
                <div className="flex p-2 h-full">
                  <div className="relative w-[120px] h-[67px] flex-shrink-0 mr-3">
                    <img 
                      src={episode.thumbnail} 
                      alt={`Episode ${episode.episode_number}`} 
                      className="w-full h-full object-cover rounded" 
                      loading="lazy"
                    />
                    <div className="absolute bottom-1 right-1 bg-primary text-white text-xs px-1 rounded">
                      {formatDuration(episode.duration)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="text-xs sm:text-sm font-medium">Episode {episode.episode_number}</div>
                    <div className="text-xs text-muted-foreground truncate">{episode.title}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Grid layout (default)
          <div className={cn(
            "grid gap-3 pr-2", 
            "grid-cols-2", // xs default
            "sm:grid-cols-3", // sm breakpoint
            "md:grid-cols-4", // md breakpoint in main layout
            "lg:grid-cols-5", // lg in main layout
            // Side panel needs fewer columns
            "[.side-panel_&]:md:grid-cols-2",
            "[.side-panel_&]:lg:grid-cols-3"
          )}>
            {currentEpisodes.map((episode) => (
              <EpisodeItem
                key={episode.id}
                episode={episode}
                animeId={animeId}
                isActive={episode.id === activeEpisodeId}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Pagination Controls - Only show for grid layout */}
      {layout === 'grid' && (
        <div className="flex justify-center mt-4">
          <div className="flex items-center space-x-2">
            <button 
              onClick={goToPrevPage}
              disabled={currentPage === 0}
              className={cn(
                "p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors",
                currentPage === 0 && "opacity-50 cursor-not-allowed"
              )}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <button 
              onClick={goToNextPage}
              disabled={currentPage >= totalPages - 1}
              className={cn(
                "p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors",
                currentPage >= totalPages - 1 && "opacity-50 cursor-not-allowed"
              )}
              aria-label="Next page"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
