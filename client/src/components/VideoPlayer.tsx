import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Maximize, AlertTriangle, RefreshCw, Lock } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { formatDuration } from '@/lib/utils';
import { saveToWatchHistory } from '@/lib/storage';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { throttle, debounce, createCleanupFn } from '@/lib/memoryOptimizer';
import { apiRequest } from '@/lib/queryClient';

// Define the interface for the video token response
interface VideoTokenResponse {
  token: string;
  animeId: number;
  episodeId: number;
  success: boolean;
  expiresIn: number;
}

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
  
  // State for secured video URL with token
  const [securedVideoUrl, setSecuredVideoUrl] = useState<string>("");
  const [isTokenLoading, setIsTokenLoading] = useState<boolean>(true);
  
  // Check if the URL is a direct video file or should be embedded
  const isVideoFile = /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(src);
  const useIframeEmbed = !isVideoFile;
  
  // Check if device is mobile
  const isMobile = useIsMobile();
  
  // Function to fetch and apply video token
  const fetchVideoToken = useCallback(async () => {
    if (!isVideoFile) {
      // For non-video files just use the source directly
      setSecuredVideoUrl(src);
      setIsTokenLoading(false);
      return;
    }
    
    try {
      setIsTokenLoading(true);
      
      // Request video token from server
      const rawResponse = await apiRequest('/api/video/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          animeId,
          episodeId,
        }),
      });
      
      // Parse the response as JSON and validate it has the expected format
      const response = rawResponse as unknown as VideoTokenResponse;
      
      if (response && response.success && response.token) {
        // Determine if URL already has query parameters
        const hasQueryParams = src.includes('?');
        const tokenParam = `token=${encodeURIComponent(response.token)}`;
        
        // Construct secure URL with token
        const secureUrl = hasQueryParams 
          ? `${src}&${tokenParam}`
          : `${src}?${tokenParam}`;
        
        setSecuredVideoUrl(secureUrl);
        console.log('Video URL secured with token');
      } else {
        // If token request failed, still try to play without token
        // Only log to console, don't show warnings to regular users
        console.error('Failed to get video token:', response);
        setSecuredVideoUrl(src);
        
        // No toast messages for regular users
      }
    } catch (error) {
      // Log the error to console, but don't show it to the user
      console.error('Error fetching video token:', error);
      setSecuredVideoUrl(src);
      
      // No toast messages for regular users
    } finally {
      setIsTokenLoading(false);
    }
  }, [animeId, episodeId, src, toast]);
  
  // Control visibility timer
  const controlsTimerRef = useRef<NodeJS.Timeout>();
  
  // Memoize the event handlers to prevent recreating them on every render
  const onVideoPlay = useCallback(() => {
    console.log('Video play event fired');
    // When video starts playing, it's definitely loaded
    setIsLoading(false);
    setIsPlaying(true);
  }, []);
  
  const onVideoPause = useCallback(() => {
    console.log('Video pause event fired');
    // Ensure we're not showing loading when paused
    setIsLoading(false);
    setIsPlaying(false);
  }, []);
  
  // Additional handlers for loading states
  const onVideoPlaying = useCallback(() => {
    console.log('Video playing event fired');
    setIsLoading(false);
  }, []);
  
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
    
    // Set the duration immediately
    setDuration(video.duration);
    
    // Hide loading animation immediately
    setIsLoading(false);
    setHasError(false);
    
    // Also log for debugging
    console.log('Video metadata loaded, duration:', video.duration);
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
    let isTokenError = false;
    
    if (video.error) {
      switch (video.error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorDetails = "The video playback was aborted.";
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          // Network errors are often caused by expired tokens
          errorDetails = "A network error occurred while loading the video.";
          isTokenError = securedVideoUrl.includes('token='); // Check if we're using a token
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorDetails = "The video could not be decoded.";
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorDetails = "The video format is not supported by your browser.";
          break;
      }
    }
    
    // If it's a network error and we're using tokens, try to refresh the token first
    if (isTokenError) {
      console.log("[Security] Possible token expiration detected. Attempting to refresh token...");
      // Don't show error to user, just quietly refresh the token
      setIsLoading(true); // Show loading state while we get a new token
      
      // Fetch a new token and try again
      fetchVideoToken().then(() => {
        setIsLoading(false);
        // Reset error state since we're trying again with a new token
        setHasError(false);
        setErrorMessage("");
      }).catch(() => {
        // If token refresh fails, then show the error
        setHasError(true);
        setErrorMessage(errorDetails);
        setIsLoading(false);
        
        // Only show toast to user if token refresh failed
        toast({
          title: "Video Playback Error",
          description: "Unable to continue playback. Please try refreshing the page.",
          variant: "destructive",
        });
      });
      
      return; // Exit early, we're handling the error by refreshing token
    }
    
    // For non-token related errors, show the normal error state
    setHasError(true);
    setErrorMessage(errorDetails);
    setIsLoading(false);
    
    // Show toast notification for non-token errors
    toast({
      title: "Video Error",
      description: errorDetails,
      variant: "destructive",
    });
  }, [toast, securedVideoUrl, fetchVideoToken]);

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

  // Fetch secure video token when source or episode changes
  useEffect(() => {
    // Fetch the video token when source changes
    fetchVideoToken();
  }, [src, animeId, episodeId, fetchVideoToken]);

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

  // Track if we're in the initialization phase to avoid re-initializing the player
  const isInitializing = useRef(false);
  
  // Initialize video player
  useEffect(() => {
    // Don't initialize until we have a secured URL or for iframe embeds
    if (useIframeEmbed || isTokenLoading) return () => {}; 
    
    // If we're already initializing, don't do it again
    if (isInitializing.current) return () => {};
    
    isInitializing.current = true;
    
    const video = videoRef.current;
    if (!video) {
      isInitializing.current = false;
      return () => {};
    }
    
    // Remember current position if we're reloading the same video
    const wasPlaying = isPlaying;
    const currentTimePosition = video.currentTime || 0;
    
    // Reset error state when src changes
    setHasError(false);
    setErrorMessage("");
    setIsLoading(true);
    
    // Reset view tracking only for new episodes
    if (securedVideoUrl !== video.src) {
      setViewTracked(false);
      // Reset first toggle state only when loading a new video
      isFirstToggle.current = true;
      // Reset the progress if it's a new source
      setProgress(0);
      setCurrentTime(0);
    } else {
      // Keep the current time position if just reloading the same video
      setProgress((currentTimePosition / duration) * 100);
      setCurrentTime(currentTimePosition);
    }
    
    console.log('Initializing player with URL:', securedVideoUrl, 
                'currentTime:', currentTimePosition, 
                'wasPlaying:', wasPlaying);
    
    // Define all the event handlers
    const onCanPlay = () => {
      console.log('Video can play now');
      setIsLoading(false);
      // If we were playing before reload, resume
      if (wasPlaying && video && video.paused) {
        video.currentTime = currentTimePosition;
        video.play().catch(e => console.warn('Could not auto-resume video', e));
      }
    };
    
    const onLoadedData = () => {
      console.log('Video data loaded');
      setIsLoading(false);
      // Ensure we maintain the time position on reload
      if (currentTimePosition > 0 && Math.abs(video.currentTime - currentTimePosition) > 0.5) {
        console.log('Restoring time position:', currentTimePosition);
        video.currentTime = currentTimePosition;
      }
    };
    
    const onSeeking = () => {
      console.log('Video seeking at time:', video.currentTime);
    };
    
    const onSeeked = () => {
      console.log('Video seeked to time:', video.currentTime);
      // Update UI after seeking finishes
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / duration) * 100);
    };
    
    // Add these event listeners right away
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('loadeddata', onLoadedData);
    video.addEventListener('seeking', onSeeking);
    video.addEventListener('seeked', onSeeked);
    
    // Set the source and load the video
    if (video.src !== securedVideoUrl) {
      video.src = securedVideoUrl;
      video.load();
    }
    
    // Reset the initializing flag
    setTimeout(() => {
      isInitializing.current = false;
    }, 500);
    
    // Fallback timeout to ensure loading indicator is hidden
    setTimeout(() => {
      setIsLoading(false);
    }, 5000);
    
    // Start control visibility timer
    startControlsTimer();
    
    // Add standard event listeners
    video.addEventListener('play', onVideoPlay);
    video.addEventListener('pause', onVideoPause);
    video.addEventListener('playing', onVideoPlaying);
    video.addEventListener('timeupdate', onVideoTimeUpdate);
    video.addEventListener('loadedmetadata', onVideoLoadedMetadata);
    video.addEventListener('ended', onVideoEnded);
    video.addEventListener('error', onVideoError);
    
    // Remove event listeners on cleanup
    return createCleanupFn(
      () => video.removeEventListener('play', onVideoPlay),
      () => video.removeEventListener('pause', onVideoPause),
      () => video.removeEventListener('playing', onVideoPlaying),
      () => video.removeEventListener('timeupdate', onVideoTimeUpdate),
      () => video.removeEventListener('loadedmetadata', onVideoLoadedMetadata),
      () => video.removeEventListener('ended', onVideoEnded),
      () => video.removeEventListener('error', onVideoError),
      () => video.removeEventListener('canplay', onCanPlay),
      () => video.removeEventListener('loadeddata', onLoadedData),
      () => video.removeEventListener('seeking', onSeeking),
      () => video.removeEventListener('seeked', onSeeked),
      // Clear control timer
      () => {
        if (controlsTimerRef.current) {
          clearTimeout(controlsTimerRef.current);
        }
      }
    );
  }, [
    securedVideoUrl,
    isTokenLoading,
    useIframeEmbed, 
    onVideoPlay, 
    onVideoPause,
    onVideoPlaying,
    onVideoTimeUpdate, 
    onVideoLoadedMetadata, 
    onVideoEnded, 
    onVideoError,
    startControlsTimer,
    isPlaying
  ]);
  
  // Separate effect for handling volume changes to prevent reloading
  useEffect(() => {
    if (useIframeEmbed) return;
    
    const video = videoRef.current;
    if (!video) return;
    
    // Set volume without affecting video loading/playback
    video.volume = isMuted ? 0 : volume;
  }, [volume, isMuted, useIframeEmbed]);
  
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
  
  // Keep track of if this is the first toggle since loading
  const isFirstToggle = useRef(true);
  
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    
    console.log('Toggle play called, current state:', video.paused ? 'paused' : 'playing');
    console.log('Current time:', video.currentTime);
    console.log('Is first toggle:', isFirstToggle.current);
    
    // Always use the actual video state rather than React state
    // This ensures we're responding to the actual DOM element state
    if (video.paused) {
      // Play the video if it was paused (without changing current time)
      const currentPosition = video.currentTime;
      
      // Force the UI state to reflect what we expect
      setIsPlaying(true);
      
      try {
        // If this is the first play after loading, reset the current time to ensure
        // it starts from the beginning if needed
        if (isFirstToggle.current && currentPosition < 1) {
          video.currentTime = 0;
          console.log('First play - resetting to beginning');
        }
        
        // Now we're no longer on first toggle
        isFirstToggle.current = false;
        
        video.play().catch(err => {
          // Handle autoplay restrictions gracefully
          console.warn('Playback failed, likely due to autoplay restrictions:', err);
          // Make sure the UI state reflects the actual video state
          setIsPlaying(false);
        }).then(() => {
          if (!video) return;
          
          // Verify we're still at the expected position
          if (Math.abs(video.currentTime - currentPosition) > 1 && currentPosition > 1) {
            console.log('Correcting time position after play', 
              'from', video.currentTime, 'to', currentPosition);
            video.currentTime = currentPosition;
          }
        });
      } catch (err) {
        console.error('Error in togglePlay (play):', err);
        setIsPlaying(false);
      }
    } else {
      // Pause the video if it was playing
      // Store current position before pausing
      const currentPosition = video.currentTime;
      
      // Mark that we've toggled at least once
      isFirstToggle.current = false;
      
      // Force UI state first
      setIsPlaying(false);
      
      // Pause the video
      video.pause();
      
      // Ensure the position didn't change
      if (Math.abs(video.currentTime - currentPosition) > 1) {
        console.log('Correcting time position after pause',
          'from', video.currentTime, 'to', currentPosition);
        video.currentTime = currentPosition;
      }
    }
  }, []);
  
  // Throttle volume changes to reduce state updates during slider dragging
  const handleVolumeChange = useCallback(throttle((value: number[]) => {
    const newVolume = value[0] / 100;
    
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    
    // To prevent reloading the video when changing volume, we use a different approach
    // Update volume state without causing video reload
    requestAnimationFrame(() => {
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    });
  }, 50), []);
  
  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume;
        // Use requestAnimationFrame to prevent video reload during state updates
        requestAnimationFrame(() => {
          setIsMuted(false);
        });
      } else {
        videoRef.current.volume = 0;
        // Use requestAnimationFrame to prevent video reload during state updates
        requestAnimationFrame(() => {
          setIsMuted(true);
        });
      }
    }
  }, [isMuted, volume]);
  
  // Handle progress bar interactions - immediate response
  const handleProgressChange = useCallback((value: number[]) => {
    const newProgress = value[0];
    console.log('Progress change:', newProgress);
    
    // Prevent operations if video not ready
    if (!videoRef.current || duration <= 0) return;
    
    // Calculate the new time position in seconds
    const newTime = (newProgress / 100) * duration;
    console.log('Setting new time:', newTime, 
                'from progress:', newProgress, 
                'duration:', duration);
    
    // Update UI immediately for responsive feel
    setProgress(newProgress);
    setCurrentTime(newTime);
    
    try {
      // Actually set the video time with more reliable direct access
      const video = videoRef.current;
      
      // Set the current time directly
      video.currentTime = newTime;
      
      // Set a flag to indicate we're seeking manually
      // This can help prevent flickering or jumping
      const isSeeking = true;
      
      // Double check that our seek worked correctly
      requestAnimationFrame(() => {
        if (!videoRef.current) return;
        
        const actualTime = videoRef.current.currentTime;
        // If there's a significant difference between intended and actual time,
        // try once more with a direct assignment
        if (Math.abs(actualTime - newTime) > 0.5) {
          console.log('Correcting seek difference:',
                     'intended:', newTime,
                     'actual:', actualTime);
                     
          // Force the time again
          videoRef.current.currentTime = newTime;
          
          // Update the UI one more time
          setCurrentTime(newTime);
          setProgress((newTime / duration) * 100);
        }
      });
    } catch (err) {
      console.error('Error in seek operation:', err);
    }
  }, [duration, videoRef]);
  
  const handleSkipBackward = useCallback(() => {
    if (videoRef.current) {
      // Update the current time by skipping backward 5 seconds
      const newTime = Math.max(0, videoRef.current.currentTime - 5);
      videoRef.current.currentTime = newTime;
      // Update current time state to trigger UI update
      setCurrentTime(newTime);
      // Force a progress update to keep UI in sync
      const newProgress = (newTime / duration) * 100;
      setProgress(newProgress);
    }
  }, [duration]);
  
  const handleSkipForward = useCallback(() => {
    if (videoRef.current) {
      // Update the current time by skipping forward 5 seconds
      const newTime = Math.min(duration, videoRef.current.currentTime + 5);
      videoRef.current.currentTime = newTime;
      // Update current time state to trigger UI update
      setCurrentTime(newTime);
      // Force a progress update to keep UI in sync
      const newProgress = (newTime / duration) * 100;
      setProgress(newProgress);
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
          handleSkipForward();
          break;
        case 'ArrowLeft': // Left arrow for 5s backward
          e.preventDefault();
          handleSkipBackward();
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
  }, [togglePlay, toggleFullscreen, toggleMute, handleSkipForward, handleSkipBackward, duration]);
  
  // Function to retry loading the video
  const retryPlayback = useCallback(() => {
    // Reset states
    setIsLoading(true);
    setHasError(false);
    setErrorMessage("");
    
    if (videoRef.current) {
      // Clear any existing source
      videoRef.current.pause();
      
      // Set a short timeout to ensure DOM updates before retrying
      setTimeout(() => {
        if (!videoRef.current) return;
        
        // Reset the video and reload from source
        videoRef.current.src = securedVideoUrl;
        videoRef.current.load();
        
        // Add a listener to attempt playback once video can play
        const onCanPlayRetry = () => {
          videoRef.current?.play().catch(error => {
            console.error("Error retrying video playback:", error);
            // Even if autoplay fails, we should still hide loading
            setIsLoading(false);
          });
          // Remove listener after first attempt
          videoRef.current?.removeEventListener('canplay', onCanPlayRetry);
        };
        
        videoRef.current.addEventListener('canplay', onCanPlayRetry);
        
        // Fallback in case canplay event never fires
        setTimeout(() => {
          setIsLoading(false);
        }, 5000);
      }, 300);
    }
  }, [securedVideoUrl]);

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
            poster={poster}
            onClick={hasError ? undefined : togglePlay}
            onContextMenu={(e) => { e.preventDefault(); return false; }}
            onCopy={(e) => { e.preventDefault(); return false; }}
            onCut={(e) => { e.preventDefault(); return false; }}
            onPaste={(e) => { e.preventDefault(); return false; }}
            onDragStart={(e) => { e.preventDefault(); return false; }}
            onSelect={(e) => { e.preventDefault(); return false; }}
            // TypeScript doesn't recognize onSelectStart, but browsers do
            // @ts-ignore
            onSelectStart={(e: any) => { e.preventDefault(); return false; }}
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
            onKeyDown={(e) => {
              // Block keyboard shortcuts for copy, inspect, view-source
              if ((e.ctrlKey && (e.key === 'c' || e.key === 'u' || e.key === 's')) ||  
                  (e.key === 'F12')) {
                e.preventDefault();
                return false;
              }
            }}
            draggable="false"
            controlsList="nodownload noplaybackrate nofullscreen noremoteplayback"
            disablePictureInPicture
            playsInline
            // Custom attributes for additional protection
            // @ts-ignore
            x-webkit-airplay="deny"
            // @ts-ignore
            x-webkit-javabridge="false"
          />
          
          {isLoading && !hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="fancy-loader">
                <div className="loader-inner">
                  <div className="loader-line-wrap">
                    <div className="loader-line border-primary"></div>
                  </div>
                  <div className="loader-line-wrap">
                    <div className="loader-line border-blue-500"></div>
                  </div>
                  <div className="loader-line-wrap">
                    <div className="loader-line border-purple-500"></div>
                  </div>
                  <div className="loader-line-wrap">
                    <div className="loader-line border-green-500"></div>
                  </div>
                  <div className="loader-line-wrap">
                    <div className="loader-line border-primary"></div>
                  </div>
                </div>
                <div className="mt-4 text-white font-medium text-lg">Loading...</div>
              </div>
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
          
          {/* Video title overlay - showing only episode number and title */}
          {!hasError && title && (
            <div className={`absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent px-4 py-3 transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0'
            }`}>
              <h2 className="text-white font-medium truncate">
                {title.includes('Episode') ? title.split(':')[0] + ': ' + title.split(':')[1] : title}
              </h2>
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
                
                <div 
                  className="h-2 group-hover:h-4 transition-all duration-200 relative rounded-full overflow-hidden bg-gray-800/90 shadow-inner"
                  onClick={(e) => {
                    // Calculate click position relative to the progress bar width
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = (x / rect.width) * 100;
                    
                    // Safety bounds check
                    const safePercentage = Math.max(0, Math.min(100, percentage));
                    
                    // Call the handler with the calculated position
                    handleProgressChange([safePercentage]);
                  }}
                >
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
                    className="absolute inset-0 z-10 opacity-0 cursor-pointer"
                    onValueChange={handleProgressChange}
                    onValueCommit={(value) => {
                      console.log('Value committed:', value);
                      // Force an explicit seek when the user finishes dragging
                      if (videoRef.current && duration > 0) {
                        const newProgress = value[0];
                        const newTime = (newProgress / 100) * duration;
                        
                        // Use setTimeout to ensure the final value is applied
                        // after any pending state updates
                        setTimeout(() => {
                          if (videoRef.current) {
                            videoRef.current.currentTime = newTime;
                            setCurrentTime(newTime);
                            setProgress(newProgress);
                          }
                        }, 0);
                      }
                    }}
                    aria-label="Seek video"
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
                    title={isPlaying ? "Pause" : "Play"}
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