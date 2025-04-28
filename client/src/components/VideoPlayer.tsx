import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Maximize, AlertTriangle, RefreshCw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { formatDuration } from '@/lib/utils';
import { saveToWatchHistory } from '@/lib/storage';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { throttle, debounce, createCleanupFn } from '@/lib/memoryOptimizer';
import { apiRequest } from '@/lib/queryClient';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  animeId: number;
  episodeId: number;
  onProgress?: (progress: number) => void;
  onEnded?: () => void;
  className?: string;
}

// Define function component first
function VideoPlayerComponent({
  src,
  poster,
  title,
  animeId,
  episodeId,
  onProgress,
  onEnded,
  className
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [viewTracked, setViewTracked] = useState(false);
  const { toast } = useToast();
  
  // Check if the URL is a direct video file or should be embedded
  const isVideoFile = /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(src);
  const useIframeEmbed = !isVideoFile;
  
  // Check if device is mobile
  const isMobile = useIsMobile();
  
  // Control visibility timer
  const controlsTimerRef = useRef<NodeJS.Timeout>();
  
  // Memoize the event handlers to prevent recreating them on every render
  const onVideoPlay = useCallback(() => setIsPlaying(true), []);
  const onVideoPause = useCallback(() => setIsPlaying(false), []);
  
  // Throttle time updates to reduce state changes
  const onVideoTimeUpdate = useCallback(throttle(() => {
    const video = videoRef.current;
    if (!video) return;
    
    setCurrentTime(video.currentTime);
    const newProgress = (video.currentTime / video.duration) * 100;
    setProgress(newProgress);
    
    // Save to watch history every 5 seconds
    if (Math.round(video.currentTime) % 5 === 0) {
      saveToWatchHistory({
        animeId,
        episodeId,
        timestamp: video.currentTime,
        progress: newProgress,
        lastWatched: new Date().toISOString(),
      });
      
      if (onProgress) {
        onProgress(newProgress);
      }
    }
  }, 250), [animeId, episodeId, onProgress]);
  
  const onVideoLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    
    setDuration(video.duration);
    setIsLoading(false);
    setHasError(false);
  }, []);
  
  const onVideoEnded = useCallback(() => {
    setIsPlaying(false);
    if (onEnded) onEnded();
  }, [onEnded]);
  
  // Error handling
  const onVideoError = useCallback((e: Event) => {
    console.error("Video error:", e);
    const video = videoRef.current;
    if (!video) return;
    
    // Get more detailed error information from the video element
    let errorDetails = "An error occurred while loading the video.";
    
    if (video.error) {
      switch (video.error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorDetails = "The video playback was aborted.";
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorDetails = "A network error occurred while loading the video.";
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorDetails = "The video could not be decoded.";
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorDetails = "The video format is not supported by your browser.";
          break;
      }
    }
    
    // Set error state
    setHasError(true);
    setErrorMessage(errorDetails);
    setIsLoading(false);
    
    // Show toast notification
    toast({
      title: "Video Error",
      description: errorDetails,
      variant: "destructive",
    });
  }, [toast]);

  // Track view when anime is watched
  const trackAnimeView = useCallback(() => {
    if (!viewTracked) {
      // Call API to increment view count
      apiRequest(`/api/animes/${animeId}/view`, { method: 'POST' })
        .then(response => {
          console.log('View tracked for anime:', animeId, response);
          setViewTracked(true);
        })
        .catch(error => {
          console.error('Failed to track view:', error);
        });
    }
  }, [animeId, viewTracked]);
  
  // Track view when video starts playing
  useEffect(() => {
    if (isPlaying && !viewTracked) {
      trackAnimeView();
    }
  }, [isPlaying, trackAnimeView]);

  // Initialize video player
  useEffect(() => {
    if (useIframeEmbed) return () => {}; // Skip for iframe embeds
    
    const video = videoRef.current;
    if (!video) return () => {};
    
    // Reset error state when src changes
    setHasError(false);
    setErrorMessage("");
    setIsLoading(true);
    
    // Set initial volume
    video.volume = volume;
    
    // Load the video
    video.load();
    
    // Start control visibility timer
    startControlsTimer();
    
    // Add event listeners
    video.addEventListener('play', onVideoPlay);
    video.addEventListener('pause', onVideoPause);
    video.addEventListener('timeupdate', onVideoTimeUpdate);
    video.addEventListener('loadedmetadata', onVideoLoadedMetadata);
    video.addEventListener('ended', onVideoEnded);
    video.addEventListener('error', onVideoError);
    
    // Remove event listeners on cleanup
    return createCleanupFn(
      () => video.removeEventListener('play', onVideoPlay),
      () => video.removeEventListener('pause', onVideoPause),
      () => video.removeEventListener('timeupdate', onVideoTimeUpdate),
      () => video.removeEventListener('loadedmetadata', onVideoLoadedMetadata),
      () => video.removeEventListener('ended', onVideoEnded),
      () => video.removeEventListener('error', onVideoError),
      // Clear control timer
      () => {
        if (controlsTimerRef.current) {
          clearTimeout(controlsTimerRef.current);
        }
      }
    );
  }, [
    animeId, 
    episodeId, 
    volume, 
    src, 
    useIframeEmbed, 
    onVideoPlay, 
    onVideoPause, 
    onVideoTimeUpdate, 
    onVideoLoadedMetadata, 
    onVideoEnded, 
    onVideoError
  ]);
  
  // For iframe embeds, just save to watch history once and track view
  useEffect(() => {
    if (useIframeEmbed) {
      // Record the start of watching
      saveToWatchHistory({
        animeId,
        episodeId,
        timestamp: 0,
        progress: 0,
        lastWatched: new Date().toISOString(),
      });
      
      // Track view for iframe embeds immediately
      if (!viewTracked) {
        apiRequest(`/api/animes/${animeId}/view`, { method: 'POST' })
          .then(response => {
            console.log('View tracked for iframe embed:', animeId, response);
            setViewTracked(true);
          })
          .catch(error => {
            console.error('Failed to track view for iframe:', error);
          });
      }
    }
  }, [useIframeEmbed, animeId, episodeId, viewTracked]);
  
  // Memoize the controls timer function to prevent recreation on each render
  const startControlsTimer = useCallback(() => {
    // Clear existing timer
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
    }
    
    // Set new timer to hide controls after 3 seconds of inactivity
    controlsTimerRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying]);
  
  // Throttle mousemove handler to reduce frequent state updates
  const handleContainerMouseMove = useCallback(throttle(() => {
    setShowControls(true);
    startControlsTimer();
  }, 150), [startControlsTimer]);
  
  // Optimize event handlers with useCallback to prevent unnecessary re-renders
  
  // Handle touch events for mobile - throttled to prevent too many updates
  const handleContainerTouch = useCallback(throttle(() => {
    // Toggle controls visibility on touch
    setShowControls(prevState => {
      const newState = !prevState;
      
      if (!newState) {
        startControlsTimer();
      } else if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
      }
      
      return newState;
    });
  }, 150), [startControlsTimer]);
  
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(err => {
        // Handle autoplay restrictions gracefully
        console.warn('Playback failed, likely due to autoplay restrictions:', err);
      });
    }
  }, [isPlaying]);
  
  // Throttle volume changes to reduce state updates during slider dragging
  const handleVolumeChange = useCallback(throttle((value: number[]) => {
    const newVolume = value[0] / 100;
    
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, 50), []);
  
  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume;
        setIsMuted(false);
      } else {
        videoRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  }, [isMuted, volume]);
  
  // Debounce progress changes to reduce state updates during scrubbing
  const handleProgressChange = useCallback(debounce((value: number[]) => {
    const newProgress = value[0];
    setProgress(newProgress);
    
    if (videoRef.current) {
      const newTime = (newProgress / 100) * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, 50), [duration]);
  
  const handleSkipBackward = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
    }
  }, []);
  
  const handleSkipForward = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
    }
  }, [duration]);
  
  // Optimize fullscreen toggle with useCallback
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(err => {
          console.warn('Error attempting to enter fullscreen:', err);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => {
          console.warn('Error attempting to exit fullscreen:', err);
        });
      }
    }
  }, [isFullscreen]);
  
  // Fullscreen change event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    // Create combined cleanup function
    return createCleanupFn(
      () => document.removeEventListener('fullscreenchange', handleFullscreenChange),
      // Release any other resources when component unmounts
      () => {
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.src = '';
          videoRef.current.load();
        }
        
        // Clear any timers
        if (controlsTimerRef.current) {
          clearTimeout(controlsTimerRef.current);
        }
      }
    );
  }, []);
  
  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle key events if video player is in view/focus
      const videoContainer = containerRef.current;
      if (!videoContainer || !videoRef.current) return;
      
      // Check if video container is in viewport
      const rect = videoContainer.getBoundingClientRect();
      const isInViewport = (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
      );
      
      if (!isInViewport) return;
      
      // Only if the target is not an input element
      if (e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.key) {
        case ' ': // Spacebar for play/pause
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight': // Right arrow for 5s forward
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
          }
          break;
        case 'ArrowLeft': // Left arrow for 5s backward
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
          }
          break;
        case 'f': // f for fullscreen
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm': // m for mute
          e.preventDefault();
          toggleMute();
          break;
      }
    };
    
    // Add event listener for keyboard controls
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [togglePlay, toggleFullscreen, toggleMute, duration]);
  
  // Function to retry loading the video
  const retryPlayback = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage("");
    
    if (videoRef.current) {
      // Re-load and attempt to play again
      videoRef.current.load();
      videoRef.current.play().catch(error => {
        console.error("Error retrying video playback:", error);
      });
    }
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`video-container relative bg-black rounded-lg overflow-hidden shadow-xl ${className}`}
      style={{ 
        paddingBottom: className?.includes('md:h-full') && !isMobile ? '0' : '56.25%', 
        height: className?.includes('md:h-full') && !isMobile ? '100%' : undefined
      }}
      onMouseMove={useIframeEmbed ? undefined : handleContainerMouseMove}
      onTouchStart={useIframeEmbed ? undefined : (isMobile ? handleContainerTouch : undefined)}
    >
      {useIframeEmbed ? (
        // For non-video URLs, use iframe embed
        <iframe
          src={src}
          className="absolute inset-0 w-full h-full border-0"
          allowFullScreen
          title={title || "Embedded video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-popups"
        />
      ) : (
        // For direct video files, use native video player with controls
        <>
          <video
            ref={videoRef}
            className={`absolute inset-0 w-full h-full cursor-pointer ${hasError ? 'opacity-30' : ''}`}
            src={src}
            poster={poster}
            onClick={hasError ? undefined : togglePlay}
            onTouchEnd={(e) => {
              e.stopPropagation();
              if (hasError) return;
              
              if (isMobile && !showControls) {
                setShowControls(true);
                startControlsTimer();
              } else {
                togglePlay();
              }
            }}
            playsInline
          />
          
          {isLoading && !hasError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
            </div>
          )}
          
          {hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-6 text-center backdrop-blur-sm">
              <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Video Error</h3>
              <p className="mb-4">{errorMessage}</p>
              <Button 
                className="flex items-center gap-2 bg-primary hover:bg-primary/90" 
                onClick={retryPlayback}
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          )}
          
          {/* Big center play button removed */}
          
          {/* Video title overlay */}
          {!hasError && title && (
            <div className={`absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent px-4 py-3 transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0'
            }`}>
              <h2 className="text-white font-medium truncate">{title}</h2>
            </div>
          )}
          
          {/* Video controls */}
          {!hasError && (
            <div 
              className={`video-controls absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent pb-4 pt-8 px-4 transition-opacity duration-300 ${
                showControls ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {/* Progress bar */}
              <div className="progress-bar-container group relative mb-3">
                <div className="absolute -top-6 left-0 right-0 flex justify-between items-center px-1">
                  <div className="text-white text-xs font-medium drop-shadow-md">{formatDuration(currentTime)}</div>
                  <div className="text-white text-xs font-medium drop-shadow-md">{formatDuration(duration)}</div>
                </div>
                
                <div className="h-2 group-hover:h-4 transition-all duration-200 relative rounded-full overflow-hidden bg-gray-800/90 shadow-inner">
                  <div 
                    className="absolute top-0 left-0 h-full bg-primary rounded-r-full shadow-lg" 
                    style={{ width: `${progress}%` }}
                  >
                    {/* Rounded cap at the end of the progress bar with pop-out effect */}
                    <div 
                      className="absolute top-0 bottom-0 right-0 w-4 h-4 -mr-2 bg-primary rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform duration-200"
                      style={{ 
                        transformOrigin: 'center',
                        transform: `scale(${showControls ? 1 : 0})` 
                      }}
                    ></div>
                  </div>
                  <Slider
                    value={[progress]}
                    min={0}
                    max={100}
                    step={0.1}
                    className="absolute inset-0 z-10 opacity-0"
                    onValueChange={handleProgressChange}
                  />
                </div>
              </div>
              
              {/* Control buttons */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center space-x-3">
                  {/* Play/Pause button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/10 rounded-full h-9 w-9 p-0"
                    onClick={togglePlay}
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </Button>
                  
                  {/* Skip forward/backward */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/10 rounded-full h-8 w-8 p-0"
                    onClick={handleSkipBackward}
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/10 rounded-full h-8 w-8 p-0"
                    onClick={handleSkipForward}
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                  
                  {/* Volume control */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/10 rounded-full h-8 w-8 p-0"
                      onClick={toggleMute}
                    >
                      {isMuted ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <div className="relative w-20 h-8 hidden sm:flex items-center">
                      <div className="absolute inset-0 w-full h-1 bg-gray-700 rounded-full">
                        <div 
                          className="absolute top-0 left-0 h-full bg-primary rounded-full" 
                          style={{ width: `${isMuted ? 0 : volume * 100}%` }}
                        ></div>
                      </div>
                      <Slider
                        value={[isMuted ? 0 : volume * 100]}
                        min={0}
                        max={100}
                        step={1}
                        className="absolute inset-0"
                        onValueChange={handleVolumeChange}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Right controls */}
                <div className="flex items-center">
                  {/* Fullscreen button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/10 rounded-full h-8 w-8 p-0"
                    onClick={toggleFullscreen}
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Memoization with custom comparison function to prevent unnecessary re-renders
const videoPlayerPropsAreEqual = (prevProps: VideoPlayerProps, nextProps: VideoPlayerProps): boolean => {
  return (
    prevProps.src === nextProps.src &&
    prevProps.poster === nextProps.poster &&
    prevProps.title === nextProps.title &&
    prevProps.animeId === nextProps.animeId &&
    prevProps.episodeId === nextProps.episodeId &&
    prevProps.className === nextProps.className
  );
};

export const VideoPlayer = memo(VideoPlayerComponent, videoPlayerPropsAreEqual);