import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Maximize, Settings } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { formatDuration } from '@/lib/utils';
import { saveToWatchHistory } from '@/lib/storage';
import { useIsMobile } from '@/hooks/use-mobile';

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

export function VideoPlayer({
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
  
  // Check if device is mobile
  const isMobile = useIsMobile();
  
  // Control visibility timer
  const controlsTimerRef = useRef<NodeJS.Timeout>();
  
  // Initialize video player
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    // Set initial volume
    video.volume = volume;
    
    // Load the video
    video.load();
    
    // Start control visibility timer
    startControlsTimer();
    
    // Event listeners
    const onVideoPlay = () => setIsPlaying(true);
    const onVideoPause = () => setIsPlaying(false);
    const onVideoTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
      
      // Save to watch history every 5 seconds
      if (Math.round(video.currentTime) % 5 === 0) {
        saveToWatchHistory({
          animeId,
          episodeId,
          timestamp: video.currentTime,
          progress: (video.currentTime / video.duration) * 100,
          lastWatched: new Date().toISOString(),
        });
        
        if (onProgress) {
          onProgress((video.currentTime / video.duration) * 100);
        }
      }
    };
    const onVideoLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };
    const onVideoEnded = () => {
      setIsPlaying(false);
      if (onEnded) onEnded();
    };
    
    // Add event listeners
    video.addEventListener('play', onVideoPlay);
    video.addEventListener('pause', onVideoPause);
    video.addEventListener('timeupdate', onVideoTimeUpdate);
    video.addEventListener('loadedmetadata', onVideoLoadedMetadata);
    video.addEventListener('ended', onVideoEnded);
    
    // Remove event listeners on cleanup
    return () => {
      video.removeEventListener('play', onVideoPlay);
      video.removeEventListener('pause', onVideoPause);
      video.removeEventListener('timeupdate', onVideoTimeUpdate);
      video.removeEventListener('loadedmetadata', onVideoLoadedMetadata);
      video.removeEventListener('ended', onVideoEnded);
      
      // Clear control timer
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
      }
    };
  }, [animeId, episodeId, onEnded, onProgress, volume]);
  
  const startControlsTimer = () => {
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
  };
  
  const handleContainerMouseMove = () => {
    setShowControls(true);
    startControlsTimer();
  };
  
  // Handle touch events for mobile
  const handleContainerTouch = () => {
    // Toggle controls visibility on touch
    setShowControls(!showControls);
    
    if (!showControls) {
      startControlsTimer();
    } else if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
    }
  };
  
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };
  
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0] / 100;
    setVolume(newVolume);
    
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    
    // Update muted state
    setIsMuted(newVolume === 0);
  };
  
  const toggleMute = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume;
        setIsMuted(false);
      } else {
        videoRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };
  
  const handleProgressChange = (value: number[]) => {
    const newProgress = value[0];
    setProgress(newProgress);
    
    if (videoRef.current) {
      const newTime = (newProgress / 100) * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };
  
  const handleSkipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
    }
  };
  
  const handleSkipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
    }
  };
  
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };
  
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  return (
    <div 
      ref={containerRef}
      className={`video-container relative bg-black rounded-lg overflow-hidden ${className}`}
      style={{ paddingBottom: '56.25%' }}
      onMouseMove={handleContainerMouseMove}
      onTouchStart={isMobile ? handleContainerTouch : undefined}
    >
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full cursor-pointer"
        src={src}
        poster={poster}
        onClick={togglePlay}
        onTouchEnd={(e) => {
          // Prevent propagation to avoid duplicate events
          e.stopPropagation();
          if (isMobile && !showControls) {
            // If controls are hidden, show them first instead of toggling play
            setShowControls(true);
            startControlsTimer();
          } else {
            togglePlay();
          }
        }}
        playsInline
      />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
        </div>
      )}
      
      {!isPlaying && !isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
          onTouchEnd={(e) => {
            e.stopPropagation();
            if (isMobile) {
              setShowControls(true);
              startControlsTimer();
            }
            togglePlay();
          }}
        >
          <div className={`text-white opacity-80 ${isMobile ? 'h-20 w-20' : 'h-24 w-24'}`}>
            <Play className="h-full w-full" />
          </div>
        </div>
      )}
      
      <div 
        className={`video-controls absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-white text-sm">{title}</div>
          <div className="text-white text-sm">{formatDuration(currentTime)} / {formatDuration(duration)}</div>
        </div>
        
        <div className="progress-bar mb-4 rounded-full overflow-hidden">
          <Slider
            value={[progress]}
            min={0}
            max={100}
            step={0.1}
            onValueChange={handleProgressChange}
            className="cursor-pointer h-1.5"
          />
        </div>
        
        {/* Mobile layout */}
        {isMobile ? (
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Button variant="ghost" size="icon" className="text-white hover:text-primary" onClick={handleSkipBackward}>
                <SkipBack className="h-5 w-5" />
              </Button>
              
              <Button variant="ghost" size="icon" className="text-white hover:text-primary h-10 w-10" onClick={togglePlay}>
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </Button>
              
              <Button variant="ghost" size="icon" className="text-white hover:text-primary" onClick={handleSkipForward}>
                <SkipForward className="h-5 w-5" />
              </Button>
              
              <Button variant="ghost" size="icon" className="text-white hover:text-primary" onClick={toggleFullscreen}>
                <Maximize className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-white hover:text-primary h-8 w-8" onClick={toggleMute}>
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume * 100]}
                min={0}
                max={100}
                step={1}
                onValueChange={handleVolumeChange}
                className="cursor-pointer flex-1"
              />
              <Button variant="ghost" size="icon" className="text-white hover:text-primary">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        ) : (
          // Desktop layout
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="text-white hover:text-primary" onClick={handleSkipBackward}>
                <SkipBack className="h-5 w-5" />
              </Button>
              
              <Button variant="ghost" size="icon" className="text-white hover:text-primary h-10 w-10" onClick={togglePlay}>
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </Button>
              
              <Button variant="ghost" size="icon" className="text-white hover:text-primary" onClick={handleSkipForward}>
                <SkipForward className="h-5 w-5" />
              </Button>
              
              <div className="flex items-center gap-2 w-28">
                <Button variant="ghost" size="icon" className="text-white hover:text-primary h-8 w-8" onClick={toggleMute}>
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume * 100]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={handleVolumeChange}
                  className="cursor-pointer"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="text-white hover:text-primary">
                <Settings className="h-5 w-5" />
              </Button>
              
              <Button variant="ghost" size="icon" className="text-white hover:text-primary" onClick={toggleFullscreen}>
                <Maximize className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
