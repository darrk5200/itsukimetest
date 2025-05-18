import { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { Play, CheckCircle2, ChevronDown, ChevronUp, Bell, BellRing, Eye, BookmarkPlus, Search, Settings, Images, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { VideoPlayer } from '@/components/VideoPlayer';
import { EpisodeList } from '@/components/EpisodeItem';
import { AnimeCard } from '@/components/AnimeCard';
import { CommentSection } from '@/components/CommentSection';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Anime, Episode, WatchHistoryItem } from '@/lib/types';
import { 
  getWatchHistory, 
  isInWatchLater, 
  toggleWatchLater, 
  isInNotify, 
  toggleNotify, 
  addNotification 
} from '@/lib/storage';
import { 
  getRandomItemsFromArray, 
  isWithinDaysInGMT6, 
  hasWatchedLatestEpisode,
  wasReleasedAfterNotificationEnabled
} from '@/lib/utils';

// Format duration in minutes to MM:SS format
function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
}

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
  const { toast } = useToast();
  
  // Fetch anime details
  const { isLoading, data: anime } = useQuery<Anime>({
    queryKey: [`/api/animes/${animeId}`],
    enabled: !!animeId,
  });
  
  // Fetch similar animes
  const { data: allAnimes } = useQuery<Anime[]>({
    queryKey: ['/api/animes'],
  });
  
  // Current episode to display
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  
  // Similar animes
  const [similarAnimes, setSimilarAnimes] = useState<Anime[]>([]);
  
  // Bookmarks state
  const [inWatchLater, setInWatchLater] = useState(animeId ? isInWatchLater(animeId) : false);
  
  // Notify state
  const [isNotified, setIsNotified] = useState(animeId ? isInNotify(animeId) : false);
  
  // Description expand/collapse state
  const [description, setDescription] = useState({ expanded: false });
  
  // Artworks dialog state
  const [artworksDialogOpen, setArtworksDialogOpen] = useState(false);
  
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
      {/* Artworks Dialog */}
      <Dialog open={artworksDialogOpen} onOpenChange={setArtworksDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto" hideCloseButton>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{anime.anime_name} Artworks</span>
              <DialogClose className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted">
                <X className="h-4 w-4" />
              </DialogClose>
            </DialogTitle>
            <DialogDescription>
              Official artwork and illustrations
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {anime.artworks?.map((artwork: string, index: number) => (
              <div key={index} className="overflow-hidden rounded-lg">
                <img 
                  src={artwork} 
                  alt={`${anime.anime_name} Artwork ${index + 1}`}
                  className="w-full h-auto object-cover transition-transform hover:scale-105"
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      {/* Anime Banner and Info */}
      <div className="bg-card relative">
        <div className="relative" style={{ height: '500px' }}>
          <div className="relative w-full h-full">
            <img 
              src={anime.coverpage} 
              alt={`${anime.anime_name} Banner`} 
              className="w-full h-full object-cover"
            />
            {/* Overlay with different opacity based on description state */}
            <div className={`absolute inset-0 bg-black transition-opacity duration-300 ${description.expanded ? 'opacity-80' : 'opacity-50'}`}></div>
            {/* Bottom gradient to ensure text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
          </div>
          
          <div className="absolute bottom-0 left-0 p-6 flex flex-col md:flex-row items-start md:items-end gap-6">
            <div className="hidden md:block w-32 h-48 rounded-lg overflow-hidden shadow-lg">
              <img 
                src={anime.coverpage} 
                alt={`${anime.anime_name} Cover`} 
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2 text-white dark:text-white" style={{ textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' }}>{anime.anime_name}</h1>
              <div className="flex flex-wrap gap-1 mb-3 max-w-[90%] md:max-w-none overflow-x-hidden">
                {anime.genres.map((genre, index) => (
                  <span key={index} className="bg-muted text-muted-foreground px-2 py-1 rounded text-xs font-semibold whitespace-nowrap">
                    {genre}
                  </span>
                ))}
              </div>
              <div className="flex flex-col mt-4 mb-4 max-w-3xl">
                <div className={description.expanded 
                  ? "relative max-h-[200px] overflow-y-auto pr-1 side-panel bg-black/60 rounded-md p-3 pb-8" 
                  : ""
                }>
                  <p className={description.expanded 
                    ? "text-white font-medium" 
                    : "text-white font-medium"
                  } style={{ textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' }}>
                    {description.expanded 
                      ? anime.description 
                      : anime.description.slice(0, 100) + (anime.description.length > 100 ? '...' : '')}
                  </p>
                  {/* Remove gradient indicator */}
                </div>
                {anime.description.length > 100 && (
                  <button 
                    onClick={() => setDescription(prev => ({ expanded: !prev.expanded }))} 
                    className="text-primary text-xs sm:text-sm mt-2 self-start font-medium flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-md hover:bg-primary/20 transition-colors"
                  >
                    {description.expanded ? (
                      <>
                        <ChevronUp className="h-3 w-3" /> 
                        LESS
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3" /> 
                        MORE
                      </>
                    )}
                  </button>
                )}
              </div>
              
              <div className="flex flex-wrap gap-6 mb-4 text-sm text-muted-foreground">
                <div>
                  <span className="font-semibold">Release Date:</span> {new Date(anime.releaseDate).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-semibold">Episodes:</span> <span className="text-primary font-medium">{anime.releasedEpisodes}</span>/{anime.episode_count}
                </div>
                <div className="flex items-center">
                  <Eye className="h-4 w-4 inline mr-1" />
                  <span className="font-semibold">Views:</span> <span className="ml-1">{anime.weeklyViews || 0} this week</span>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 md:gap-4">
                <Button 
                  variant="outline" 
                  className="flex items-center bg-muted hover:bg-muted/90 text-foreground px-3 sm:px-6 py-1 sm:py-2 text-xs sm:text-sm rounded-full"
                  onClick={() => {
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
                  }}
                >
                  {isNotified ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 text-primary" />
                      Notify On
                    </>
                  ) : (
                    <>
                      <Bell className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                      Notify
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  className="flex items-center bg-muted hover:bg-muted/90 text-foreground px-3 sm:px-6 py-1 sm:py-2 text-xs sm:text-sm rounded-full"
                  onClick={() => {
                    const added = toggleWatchLater(anime.id);
                    setInWatchLater(added);
                    toast({
                      title: added ? "Bookmarked" : "Bookmark Removed",
                      description: added 
                        ? `${anime.anime_name} has been added to your bookmarks` 
                        : `${anime.anime_name} has been removed from your bookmarks`,
                      duration: 2000,
                    });
                  }}
                >
                  {inWatchLater ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 text-primary" />
                      Bookmarked
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                      Bookmark
                    </>
                  )}
                </Button>
                
                {anime.artworks && anime.artworks.length > 0 && (
                  <Button 
                    variant="outline" 
                    className="flex items-center bg-muted hover:bg-muted/90 text-foreground px-3 sm:px-6 py-1 sm:py-2 text-xs sm:text-sm rounded-full"
                    onClick={() => setArtworksDialogOpen(true)}
                  >
                    <Images className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                    Artworks ({anime.artworks.length})
                  </Button>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Video Player Section */}
      {currentEpisode && (
        <div className="p-4 md:p-6">
          {/* Episode Title and Info - Visible above the video */}
          <div id="episodeTitleContainer" className="bg-card rounded-lg p-4 mb-6">
            <h2 className="text-2xl font-bold text-white dark:text-white" style={{ textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' }}>
              Episode {currentEpisode.episode_number}: {currentEpisode.title}
            </h2>
          </div>
          
          {/* Responsive layout - stacked on mobile and tablet, side-by-side on desktop */}
          <div id="videoPlayerContainer" className="flex flex-col lg:flex-row lg:h-[500px] gap-6 mb-12">
            {/* Video Player (full width on mobile/tablet, 2/3 on desktop) */}
            <div className="w-full lg:w-[calc(80%-60px)] lg:h-full md:min-h-[450px]">
              <VideoPlayer
                // Add a key prop with the episode ID to force the component to remount when the episode changes
                key={`video-player-${currentEpisode.id}`}
                src={currentEpisode.video_url}
                poster={currentEpisode.thumbnail}
                title={`${anime.anime_name} - Episode ${currentEpisode.episode_number}: ${currentEpisode.title}`}
                animeId={anime.id}
                episodeId={currentEpisode.id}
                onEnded={handleEpisodeEnded}
                className="lg:h-full"
              />
            </div>
            
            {/* Episodes List (hidden on mobile, below video on tablet, right side on desktop) */}
            <div className="hidden md:flex lg:w-[calc(20%+60px)] bg-background/50 rounded-md flex-col md:h-[300px] lg:h-full">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-sm">EPS 1-{anime.episodes.length}</h2>
                  <ChevronDown className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Filter episodes..."
                      className="text-xs py-1 px-2 pr-6 rounded bg-muted/70 border-none focus:outline-none focus:ring-1 focus:ring-primary w-[120px]"
                    />
                    <Search className="h-3 w-3 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2" />
                  </div>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto side-panel py-2 max-h-[380px] md:max-h-[calc(100%-40px)] md:min-h-0">
                {anime.episodes.slice(0, 50).map((episode) => (
                  <Link key={episode.id} href={`/anime/${anime.id}/episode/${episode.id}`} onClick={(e) => {
                    e.preventDefault();
                    navigate(`/anime/${anime.id}/episode/${episode.id}`);
                    // Scroll to episode title
                    setTimeout(() => {
                      document.getElementById('episodeTitleContainer')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}>
                    <div className={cn(
                      "flex gap-3 p-2 hover:bg-muted/50 transition-colors h-[85px] mb-2 border-b border-border/50 rounded",
                      episode.id === currentEpisode.id && "bg-blue-100/20 border-blue-500 border-l-2"
                    )}>
                      <div className="relative w-[120px] h-[70px] flex-shrink-0">
                        <img 
                          src={episode.thumbnail || anime.coverpage} 
                          alt={episode.title} 
                          className="w-full h-full object-cover rounded"
                        />
                        <div className="absolute bottom-1 right-1 bg-black/70 px-1 rounded text-xs">
                          EP {episode.episode_number}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm line-clamp-1">{episode.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {`Episode ${episode.episode_number} of ${anime.anime_name}`}
                        </p>
                        <div className="text-xs text-muted-foreground mt-1">
                          Apr {5 + episode.episode_number}, 2025
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
          
          {/* Episodes List - Mobile Only */}
          <div className="lg:hidden md:hidden mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white dark:text-white" style={{ textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' }}>Episodes</h2>
              {anime.episodes.length > 12 && (
                <div className="relative">
                  <Button variant="outline" className="bg-muted hover:bg-muted/90 text-foreground flex items-center">
                    <span>Season 1</span>
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
            
            <div className="h-[270px] overflow-y-auto pb-4 side-panel mobile-episode-scroll">
              <EpisodeList
                episodes={anime.episodes}
                animeId={anime.id}
                activeEpisodeId={currentEpisode?.id}
                className="pr-2"
                layout="vertical"
              />
            </div>
          </div>
          
          {/* Comments Section */}
          <div className="mb-8 md:mt-8">
            <CommentSection 
              animeId={anime.id} 
              episodeId={currentEpisode.id}
            />
          </div>
          
          {/* Recommendations */}
          <div>
            <h2 className="text-xl font-bold mb-4 text-white dark:text-white" style={{ textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' }}>You May Also Like</h2>
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
              {similarAnimes.map((similarAnime) => (
                <Link 
                  key={similarAnime.id} 
                  href={`/anime/${similarAnime.id}`}
                >
                  <div 
                    className="anime-card bg-card rounded-lg overflow-hidden shadow-lg transition-transform hover:scale-105 cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/anime/${similarAnime.id}`);
                      // Scroll to top of the page
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
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
                      <p className="text-muted-foreground text-xs sm:text-sm">
                        <span className="text-primary font-medium">{similarAnime.releasedEpisodes}</span>/{similarAnime.episode_count} Episodes
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
