import { useEffect, useState, useRef, useCallback } from 'react';
import { Play, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimeListGrid } from '@/components/AnimeCard';
import { Anime } from '@/lib/types';
import { getFirstN, getRandomItemsFromArray, getMostRecent, getAnimesByLatestEpisode } from '@/lib/utils';
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
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent"></div>
      <div className="absolute bottom-0 left-0 p-4 md:p-6">
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
    <section className="mb-8">
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
  const { isLoading, data: animes = [] } = useQuery({
    queryKey: ['/api/animes'],
    refetchOnWindowFocus: false,
  });

  // Prepare anime categories
  const [featuredAnimes, setFeaturedAnimes] = useState<Anime[]>([]);
  const [trendingAnimes, setTrendingAnimes] = useState<Anime[]>([]);
  const [recommendedAnimes, setRecommendedAnimes] = useState<Anime[]>([]);
  const [recentAnimes, setRecentAnimes] = useState<Anime[]>([]);
  
  useEffect(() => {
    if (animes && animes.length > 0) {
      // Select 5 random animes for the featured carousel
      setFeaturedAnimes(getRandomItemsFromArray(animes, 5));
      
      // Set trending animes (could be based on some metric, using random for demo)
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
    }
  }, [animes]);
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading awesome anime...</p>
      </div>
    );
  }
  
  if (!animes || animes.length === 0) {
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
        title="Trending" 
        viewAllLink="/trending"
      />
      
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
