import { Link } from 'wouter';
import { Play, BookmarkPlus, CheckCircle2, Bell } from 'lucide-react';
import { Anime } from '@/lib/types';
import { 
  cn, 
  isWithinDaysInGMT6, 
  hasWatchedLatestEpisode,
  wasReleasedAfterNotificationEnabled
} from '@/lib/utils';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { isInWatchLater, toggleWatchLater, isInNotify, toggleNotify, addNotification } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { OptimizedImage } from '@/components/OptimizedImage';

interface AnimeCardProps {
  anime: Anime;
  isNew?: boolean;
  className?: string;
}

function AnimeCardComponent({ anime, isNew = false, className }: AnimeCardProps) {
  const [inWatchLater, setInWatchLater] = useState(isInWatchLater(anime.id));
  const [isNotified, setIsNotified] = useState(isInNotify(anime.id));
  const { toast } = useToast();
  
  // Check if anime is recently added (within the last 3 days) based on lastEpisodeTimestamp
  // using GMT+6 timezone comparison
  const isRecentlyAdded = useMemo(() => {
    if (!anime.lastEpisodeTimestamp) return false;
    
    // Use our utility function that considers the GMT+6 timezone
    return isWithinDaysInGMT6(anime.lastEpisodeTimestamp, 3);
  }, [anime.lastEpisodeTimestamp]);

  // The anime is considered new if either it's explicitly marked as new OR it was recently added
  const showNewBadge = isNew || isRecentlyAdded;

  const handleClick = () => {
    // Scroll to top when anime is clicked
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleWatchLaterClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const added = toggleWatchLater(anime.id);
    setInWatchLater(added);
    
    toast({
      title: added ? "Bookmarked" : "Bookmark Removed",
      description: added 
        ? `${anime.anime_name} has been added to your bookmarks` 
        : `${anime.anime_name} has been removed from your bookmarks`,
      duration: 2000,
    });
  };
  
  const handleNotifyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const added = toggleNotify(anime.id);
    setIsNotified(added);
    
    // When notifications are enabled, we don't immediately show 
    // notifications for existing episodes. We'll only show notifications
    // for episodes that are released AFTER enabling notifications.
    
    // We don't need to do anything else here since we've saved the timestamp when 
    // notifications were enabled.
    // New episodes will be checked against this timestamp when they're released.
    
    toast({
      title: added ? "Notifications Enabled" : "Notifications Disabled",
      description: added 
        ? `You'll be notified about new episodes of ${anime.anime_name}` 
        : `You won't receive notifications for ${anime.anime_name}`,
      duration: 2000,
    });
  };

  return (
    <Link href={`/anime/${anime.id}`}>
      <div 
        className={cn(
          "anime-card bg-card rounded-lg overflow-hidden shadow-lg transition-transform hover:scale-105 cursor-pointer",
          className
        )}
        onClick={handleClick}
      >
        <div className="relative">
          <OptimizedImage 
            src={anime.coverpage} 
            alt={anime.anime_name} 
            className="w-full aspect-[2/3] object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 play-button transition-opacity">
            <div className="bg-primary text-white rounded-full p-3 transform hover:scale-110 transition-transform">
              <Play className="h-8 w-8" />
            </div>
          </div>
          {showNewBadge && (
            <span className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded">NEW</span>
          )}
          
          {/* Bookmark button */}
          <button 
            className="absolute top-2 right-2 bg-background/80 p-1.5 rounded-full hover:bg-background transition-colors z-10"
            onClick={handleWatchLaterClick}
            aria-label={inWatchLater ? "Remove from bookmarks" : "Add to bookmarks"}
          >
            {inWatchLater ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <BookmarkPlus className="h-4 w-4" />
            )}
          </button>
          
          {/* Notify button */}
          <button 
            className="absolute top-10 right-2 bg-background/80 p-1.5 rounded-full hover:bg-background transition-colors z-10"
            onClick={handleNotifyClick}
            aria-label={isNotified ? "Disable notifications" : "Enable notifications"}
          >
            {isNotified ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
          </button>
        </div>
        <div className="p-2 sm:p-3">
          <h3 className="anime-title font-medium text-foreground transition-colors text-xs sm:text-base line-clamp-1">{anime.anime_name}</h3>
          <p className="text-muted-foreground text-xs sm:text-sm">
            <span className="text-primary font-medium">{anime.releasedEpisodes}</span>/{anime.episode_count} Episodes
          </p>
        </div>
      </div>
    </Link>
  );
}

export const AnimeCard = React.memo(AnimeCardComponent, (prevProps: AnimeCardProps, nextProps: AnimeCardProps): boolean => {
  // Only re-render if these props change
  return prevProps.anime.id === nextProps.anime.id && 
         prevProps.isNew === nextProps.isNew &&
         prevProps.className === nextProps.className;
});
