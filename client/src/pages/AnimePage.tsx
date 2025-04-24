import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { Play, Plus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoPlayer } from '@/components/VideoPlayer';
import { EpisodeList } from '@/components/EpisodeItem';
import { AnimeListGrid } from '@/components/AnimeCard';
import { Anime, Episode, WatchHistoryItem } from '@/lib/types';
import { getWatchHistory } from '@/lib/storage';
import { getRandomItemsFromArray } from '@/lib/utils';

interface AnimePageProps {
  params: { 
    id?: string;
    episodeId?: string;
  }
}

export default function AnimePage({ params }: AnimePageProps) {
  const animeId = params.id ? parseInt(params.id) : undefined;
  const episodeId = params.episodeId ? parseInt(params.episodeId) : undefined;
  const [location, navigate] = useLocation();
  
  // Fetch anime details
  const { isLoading, data: anime } = useQuery({
    queryKey: [`/api/animes/${animeId}`],
    enabled: !!animeId,
  });
  
  // Fetch similar animes
  const { data: allAnimes } = useQuery({
    queryKey: ['/api/animes'],
  });
  
  // Current episode to display
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  
  // Similar animes
  const [similarAnimes, setSimilarAnimes] = useState<Anime[]>([]);
  
  // Handle episode change
  useEffect(() => {
    if (anime && anime.episodes) {
      if (episodeId) {
        // Find episode by ID
        const episode = anime.episodes.find(ep => ep.id === episodeId);
        if (episode) {
          setCurrentEpisode(episode);
        } else {
          // If episode not found, redirect to first episode
          navigate(`/anime/${animeId}/episode/${anime.episodes[0].id}`);
        }
      } else {
        // Check if there's a watch history for this anime
        const watchHistory = getWatchHistory();
        const animeHistory = watchHistory.find(h => h.animeId === animeId);
        
        if (animeHistory) {
          // Find episode from history
          const episode = anime.episodes.find(ep => ep.id === animeHistory.episodeId);
          if (episode) {
            navigate(`/anime/${animeId}/episode/${episode.id}`);
          } else {
            // Fallback to first episode if historical episode not found
            navigate(`/anime/${animeId}/episode/${anime.episodes[0].id}`);
          }
        } else {
          // No history, start with first episode
          navigate(`/anime/${animeId}/episode/${anime.episodes[0].id}`);
        }
      }
    }
  }, [anime, animeId, episodeId, navigate]);
  
  // Set similar animes
  useEffect(() => {
    if (allAnimes && anime) {
      // Filter out the current anime and get a random selection
      const filteredAnimes = allAnimes.filter(a => a.id !== anime.id);
      setSimilarAnimes(getRandomItemsFromArray(filteredAnimes, 5));
    }
  }, [allAnimes, anime]);
  
  // Handle episode ended event
  const handleEpisodeEnded = () => {
    if (anime && currentEpisode) {
      // Find the next episode
      const currentIndex = anime.episodes.findIndex(ep => ep.id === currentEpisode.id);
      if (currentIndex < anime.episodes.length - 1) {
        // Navigate to next episode
        const nextEpisode = anime.episodes[currentIndex + 1];
        navigate(`/anime/${animeId}/episode/${nextEpisode.id}`);
      }
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading anime...</p>
      </div>
    );
  }
  
  if (!anime) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold mb-4">Anime Not Found</h2>
        <p className="text-muted-foreground">The anime you're looking for doesn't exist.</p>
        <Button className="mt-4" asChild>
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    );
  }
  
  return (
    <div>
      {/* Anime Banner and Info */}
      <div className="bg-card relative">
        <div className="relative" style={{ height: '500px' }}>
          <img 
            src={anime.coverpage} 
            alt={`${anime.anime_name} Banner`} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-transparent"></div>
          
          <div className="absolute bottom-0 left-0 p-6 flex flex-col md:flex-row items-start md:items-end gap-6">
            <div className="w-32 h-48 rounded-lg overflow-hidden shadow-lg">
              <img 
                src={anime.coverpage} 
                alt={`${anime.anime_name} Cover`} 
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{anime.anime_name}</h1>
              <div className="flex flex-wrap gap-2 mb-3">
                {anime.genres.map((genre, index) => (
                  <span key={index} className="bg-muted text-muted-foreground px-2 py-1 rounded text-xs">
                    {genre}
                  </span>
                ))}
              </div>
              <p className="text-muted-foreground mb-4 max-w-3xl">{anime.description}</p>
              <div className="flex items-center gap-4">
                <Button className="flex items-center bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-full" asChild>
                  <Link href={`/anime/${anime.id}/episode/${anime.episodes[0].id}`}>
                    <Play className="h-5 w-5 mr-2" />
                    Watch Now
                  </Link>
                </Button>
                <Button variant="outline" className="flex items-center bg-muted hover:bg-muted/90 text-foreground px-6 py-2 rounded-full">
                  <Plus className="h-5 w-5 mr-2" />
                  Add to List
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Video Player Section */}
      {currentEpisode && (
        <div className="p-4 md:p-6">
          <VideoPlayer
            src={currentEpisode.video_url}
            poster={currentEpisode.thumbnail}
            title={`${anime.anime_name} - Episode ${currentEpisode.episode_number}: ${currentEpisode.title}`}
            animeId={anime.id}
            episodeId={currentEpisode.id}
            onEnded={handleEpisodeEnded}
            className="mb-6"
          />
          
          {/* Episodes List */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Episodes</h2>
              {anime.episodes.length > 12 && (
                <div className="relative">
                  <Button variant="outline" className="bg-muted hover:bg-muted/90 text-foreground flex items-center">
                    <span>Season 1</span>
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
            
            <EpisodeList
              episodes={anime.episodes}
              animeId={anime.id}
              activeEpisodeId={currentEpisode?.id}
            />
          </div>
          
          {/* Recommendations */}
          <div>
            <h2 className="text-xl font-bold mb-4">You May Also Like</h2>
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
              {similarAnimes.map((similarAnime) => (
                <Link 
                  key={similarAnime.id} 
                  href={`/anime/${similarAnime.id}`}
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  <a className="anime-card bg-card rounded-lg overflow-hidden shadow-lg transition-transform hover:scale-105">
                    <div className="relative">
                      <img 
                        src={similarAnime.coverpage} 
                        alt={similarAnime.anime_name} 
                        className="w-full aspect-[2/3] object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 play-button transition-opacity">
                        <div className="bg-primary text-white rounded-full p-2 sm:p-3 transform hover:scale-110 transition-transform">
                          <Play className="h-5 w-5 sm:h-8 sm:w-8" />
                        </div>
                      </div>
                    </div>
                    <div className="p-2 sm:p-3">
                      <h3 className="anime-title font-medium text-foreground transition-colors text-xs sm:text-base line-clamp-1">{similarAnime.anime_name}</h3>
                      <p className="text-muted-foreground text-xs sm:text-sm">{similarAnime.episode_count} Episodes</p>
                    </div>
                  </a>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
