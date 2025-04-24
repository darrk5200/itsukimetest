import { Link } from 'wouter';
import { Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { Anime } from '@/lib/types';
import { cn } from '@/lib/utils';
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
  const handleClick = () => {
    // Scroll to top when anime is clicked
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
          {isNew && (
            <span className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded">NEW</span>
          )}
        </div>
        <div className="p-2 sm:p-3">
          <h3 className="anime-title font-medium text-foreground transition-colors text-xs sm:text-base line-clamp-1">{anime.anime_name}</h3>
          <p className="text-muted-foreground text-xs sm:text-sm">{anime.episode_count} Episodes</p>
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
