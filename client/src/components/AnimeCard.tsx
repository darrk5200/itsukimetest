import { Link } from 'wouter';
import { Play, ChevronLeft, ChevronRight, Clock, CheckCircle2 } from 'lucide-react';
import { Anime } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect, useMemo } from 'react';
import { isInWatchLater, toggleWatchLater } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface AnimeCardProps {
  anime: Anime;
  isNew?: boolean;
  className?: string;
}

export function AnimeCard({ anime, isNew = false, className }: AnimeCardProps) {
  const [inWatchLater, setInWatchLater] = useState(isInWatchLater(anime.id));
  const { toast } = useToast();
  
  // Check if anime is recently added (within the last 3 days) based on lastEpisodeTimestamp
  const isRecentlyAdded = useMemo(() => {
    if (!anime.lastEpisodeTimestamp) return false;
    
    const releaseDate = new Date(anime.lastEpisodeTimestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - releaseDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays <= 3; // Consider "new" if added within the last 3 days
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
      title: added ? "Added to Watch Later" : "Removed from Watch Later",
      description: added 
        ? `${anime.anime_name} has been added to your Watch Later list` 
        : `${anime.anime_name} has been removed from your Watch Later list`,
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
          <img 
            src={anime.coverpage} 
            alt={anime.anime_name} 
            className="w-full aspect-[2/3] object-cover" 
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 play-button transition-opacity">
            <div className="bg-primary text-white rounded-full p-3 transform hover:scale-110 transition-transform">
              <Play className="h-8 w-8" />
            </div>
          </div>
          {showNewBadge && (
            <span className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded">NEW</span>
          )}
          
          {/* Watch Later button */}
          <button 
            className="absolute top-2 right-2 bg-background/80 p-1.5 rounded-full hover:bg-background transition-colors z-10"
            onClick={handleWatchLaterClick}
            aria-label={inWatchLater ? "Remove from Watch Later" : "Add to Watch Later"}
          >
            {inWatchLater ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <Clock className="h-4 w-4" />
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

interface AnimeListGridProps {
  animes: Anime[];
  title?: string;
  viewAllLink?: string;
  isNewTag?: boolean;
  className?: string;
}

export function AnimeListGrid({ 
  animes, 
  title, 
  viewAllLink, 
  isNewTag = false,
  className
}: AnimeListGridProps) {
  return (
    <section className={cn("mb-8", className)}>
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          {viewAllLink && (
            <Link href={viewAllLink}>
              <div 
                className="text-primary hover:text-primary/80 text-sm cursor-pointer"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                View All
              </div>
            </Link>
          )}
        </div>
      )}
      
      {/* Desktop and tablet view: Carousel for horizontal scrolling */}
      <div className="hidden md:block">
        <Carousel
          className="w-full"
          opts={{
            align: "start",
            dragFree: true,
          }}
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {animes.map((anime) => (
              <CarouselItem key={anime.id} className="pl-2 md:pl-4 basis-1/3 md:basis-1/4 lg:basis-1/5">
                <AnimeCard 
                  anime={anime} 
                  isNew={isNewTag}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex left-0 h-8 w-8 opacity-70 hover:opacity-100" />
          <CarouselNext className="hidden md:flex right-0 h-8 w-8 opacity-70 hover:opacity-100" />
        </Carousel>
      </div>
      
      {/* Mobile view: Grid layout */}
      <div className="grid grid-cols-3 gap-2 md:hidden">
        {animes.map((anime) => (
          <AnimeCard 
            key={anime.id} 
            anime={anime} 
            isNew={isNewTag}
          />
        ))}
      </div>
    </section>
  );
}
