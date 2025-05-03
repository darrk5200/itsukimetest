import { useEffect, useState, useRef, useCallback } from 'react';
import { Play, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimeListGrid } from '@/components/AnimeCard';
import { PopularScoreboard } from '@/components/PopularScoreboard';
import { Anime } from '@/lib/types';
import { 
  getFirstN, 
  getRandomItemsFromArray, 
  getMostRecent, 
  getAnimesByLatestEpisode,
  checkForNewEpisodeNotifications
} from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { getWatchHistory } from '@/lib/storage';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

function HeroSlide({ anime }: { anime: Anime }) {
  return (
    <div className="relative rounded-lg overflow-hidden h-[300px] md:h-[400px]">
      <img 
        src={anime.coverpage} 
        alt={anime.anime_name} 
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent select-none"></div>
      <div className="absolute bottom-0 left-0 p-4 md:p-6 select-none">
        <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs md:text-sm mb-2 inline-block">
          FEATURED
        </span>
        <h2 className="text-xl md:text-3xl font-bold mb-1 md:mb-2">{anime.anime_name}</h2>
        <p className="text-muted-foreground mb-3 md:mb-4 max-w-xl text-sm md:text-base line-clamp-2">{anime.description}</p>
        <div className="flex space-x-2 md:space-x-3">
          <Link href={`/anime/${anime.id}`}>
            <div>
              <Button className="flex items-center bg-primary hover:bg-primary/90 text-primary-foreground px-4 md:px-6 py-1 md:py-2 rounded-full text-sm md:text-base">
                <Play className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
                Play Now
              </Button>
            </div>
          </Link>
          <Link href={`/anime/${anime.id}`}>
            <div>
              <Button variant="outline" className="flex items-center bg-muted hover:bg-muted/90 text-foreground px-4 md:px-6 py-1 md:py-2 rounded-full text-sm md:text-base">
                <Info className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
                More Info
              </Button>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

function FeaturedCarousel({ animes }: { animes: Anime[] }) {
  const [api, setApi] = useState<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pauseRef = useRef<boolean>(false);
  
  // Auto-rotate slides every 5 seconds with smooth transitions
  useEffect(() => {
    if (!api) return;
    
    // Pause rotation when user interacts with carousel
    const handlePointerDown = () => { pauseRef.current = true; };
    const handlePointerUp = () => { 
      pauseRef.current = false;
      // Reset timer when user finishes interaction
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        startAutoRotation();
      }
    };
    
    const startAutoRotation = () => {
      intervalRef.current = setInterval(() => {
        if (!pauseRef.current) {
          api.scrollNext({ animation: "tween", duration: 600 });
        }
      }, 5000); // Increased to 5 seconds for better viewing experience
    };
    
    // Add event listeners for user interaction
    if (api.carouselNode) {
      api.carouselNode.addEventListener('pointerdown', handlePointerDown);
      api.carouselNode.addEventListener('pointerup', handlePointerUp);
      api.carouselNode.addEventListener('pointercancel', handlePointerUp);
    }
    
    startAutoRotation();
    
    // Cleanup interval and event listeners on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      if (api.carouselNode) {
        api.carouselNode.removeEventListener('pointerdown', handlePointerDown);
        api.carouselNode.removeEventListener('pointerup', handlePointerUp);
        api.carouselNode.removeEventListener('pointercancel', handlePointerUp);
      }
    };
  }, [api]);
  
  return (
    <section className="mb-8 select-none">
      <Carousel 
        setApi={setApi} 
        className="w-full" 
        opts={{
          loop: true,
          align: "center",
          skipSnaps: false,
          dragFree: false
        }}
      >
        <CarouselContent className="transition-transform duration-300 ease-out">
          {animes.map((anime) => (
            <CarouselItem key={anime.id} className="transition-transform duration-300 ease-out">
              <HeroSlide anime={anime} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
}

export default function HomePage() {
  // Prevent developer tools from being opened with keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent F12 key
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      
      // Prevent Ctrl+Shift+I / Cmd+Option+I (for developer tools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
        e.preventDefault();
        return false;
      }
      
      // Prevent Ctrl+Shift+J / Cmd+Option+J (for console)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
        e.preventDefault();
        return false;
      }
      
      // Prevent Ctrl+Shift+C / Cmd+Option+C (for element inspector)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        return false;
      }
      
      // Prevent Alt+Cmd+I (Mac developer tools)
      if ((e.altKey || e.metaKey) && (e.key === 'I' || e.key === 'i')) {
        e.preventDefault();
        return false;
      }
      
      // Prevent Ctrl+U (view source)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        return false;
      }
      
      return true;
    };
    
    // Prevent right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      // Block context menu for all elements
      e.preventDefault();
      return false;
    };
    
    // Disable "Inspect" option handler
    const handleInspect = () => {
      return false;
    };

    // Disable copy/paste on video elements
    const handleCopyPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'VIDEO' || target.closest('video')) {
        e.preventDefault();
        return false;
      }
    };
    
    // Add event listeners when component mounts
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    
    // Import and use the security measures utility
    // This will handle all devtools prevention and content protection
    import('@/lib/utils').then(utils => {
      utils.setupSecurityMeasures();
    });
    
    // Clean up when component unmounts
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
    };
  }, []);
  
  const { isLoading: animesLoading, data: animes = [] } = useQuery<Anime[]>({
    queryKey: ['/api/animes'],
    refetchOnWindowFocus: false,
  });
  
  const { isLoading: weeklyLoading, data: weeklyAnimes = [] } = useQuery<Anime[]>({
    queryKey: ['/api/animes/weekly/popular'],
    refetchOnWindowFocus: false,
  });

  // Prepare anime categories
  const [featuredAnimes, setFeaturedAnimes] = useState<Anime[]>([]);
  const [trendingAnimes, setTrendingAnimes] = useState<Anime[]>([]);
  const [weeklyPopularAnimes, setWeeklyPopularAnimes] = useState<Anime[]>([]);
  const [recommendedAnimes, setRecommendedAnimes] = useState<Anime[]>([]);
  const [recentAnimes, setRecentAnimes] = useState<Anime[]>([]);
  
  // Set weekly popular animes when API responds
  useEffect(() => {
    if (weeklyAnimes && weeklyAnimes.length > 0) {
      setWeeklyPopularAnimes(weeklyAnimes);
    }
  }, [weeklyAnimes]);
  
  useEffect(() => {
    if (animes && animes.length > 0) {
      // Select 5 random animes for the featured carousel
      setFeaturedAnimes(getRandomItemsFromArray(animes, 5));
      
      // Set popular animes (could be based on some metric, using random for demo)
      setTrendingAnimes(getRandomItemsFromArray(animes, 5));
      
      // Get watch history for recommendations
      const watchHistory = getWatchHistory();
      
      // If no history, show random recommendations
      if (watchHistory.length === 0) {
        setRecommendedAnimes(getRandomItemsFromArray(animes, 5));
      } else {
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
        
        // If we have recommendations based on history, use them (up to 5); otherwise, show random
        if (recommendations.length > 0) {
          setRecommendedAnimes(getRandomItemsFromArray(recommendations, 5));
        } else {
          setRecommendedAnimes(getRandomItemsFromArray(animes, 5));
        }
      }
      
      // Set recent animes sorted by lastEpisodeTimestamp
      const sortedByTimestamp = getAnimesByLatestEpisode(animes, 5);
      console.log("Recently added anime sorted by timestamp:", sortedByTimestamp.map(a => ({
        name: a.anime_name,
        timestamp: a.lastEpisodeTimestamp
      })));
      setRecentAnimes(sortedByTimestamp);
      
      // Check for new episode notifications, but only for episodes that were released
      // AFTER the user enabled notifications for specific animes
      checkForNewEpisodeNotifications(animes);
    }
  }, [animes]);
  
  const isLoading = animesLoading || weeklyLoading;
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading awesome anime...</p>
      </div>
    );
  }
  
  if (!isLoading && (!animes || animes.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold mb-4">No Anime Found</h2>
        <p className="text-muted-foreground">Check back later for new content!</p>
      </div>
    );
  }
  
  return (
    <div className="p-4 pb-20">
      {featuredAnimes.length > 0 && <FeaturedCarousel animes={featuredAnimes} />}
      
      <AnimeListGrid 
        animes={trendingAnimes} 
        title="Popular" 
        viewAllLink="/trending"
      />
      
      {weeklyPopularAnimes.length > 0 && (
        <PopularScoreboard 
          animes={weeklyPopularAnimes} 
          className="mt-8"
        />
      )}
      
      <AnimeListGrid 
        animes={recentAnimes} 
        title="Recently Added" 
        viewAllLink="/recent"
        isNewTag
      />
      
      <AnimeListGrid 
        animes={recommendedAnimes} 
        title="Recommended For You" 
        viewAllLink="/recommended"
      />
    </div>
  );
}
