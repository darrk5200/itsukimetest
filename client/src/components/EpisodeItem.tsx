import { Link } from 'wouter';
import { Play } from 'lucide-react';
import { Episode } from '@/lib/types';
import { cn, formatDuration } from '@/lib/utils';

interface EpisodeItemProps {
  episode: Episode;
  animeId: number;
  isActive?: boolean;
  className?: string;
}

export function EpisodeItem({ episode, animeId, isActive = false, className }: EpisodeItemProps) {
  return (
    <Link href={`/anime/${animeId}/episode/${episode.id}`}>
      <div className={cn(
        "episode-item border border-muted rounded-lg overflow-hidden transition-colors hover:border-primary cursor-pointer",
        isActive && "active",
        className
      )}>
        <div className="relative">
          <img 
            src={episode.thumbnail} 
            alt={`Episode ${episode.episode_number}`} 
            className="w-full aspect-video object-cover" 
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
            <Play className="h-10 w-10 text-white" />
          </div>
          <div className="absolute bottom-2 right-2 bg-primary text-white text-xs px-1 rounded">
            {formatDuration(episode.duration)}
          </div>
        </div>
        <div className="p-1 sm:p-2">
          <div className="text-xs sm:text-sm font-medium">Ep {episode.episode_number}</div>
          <div className="text-xs text-muted-foreground truncate">{episode.title}</div>
        </div>
      </div>
    </Link>
  );
}

interface EpisodeListProps {
  episodes: Episode[];
  animeId: number;
  activeEpisodeId?: number;
  className?: string;
}

export function EpisodeList({ episodes, animeId, activeEpisodeId, className }: EpisodeListProps) {
  return (
    <div className={cn("overflow-auto max-h-[400px] pr-2", className)}>
      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-4">
        {episodes.map((episode) => (
          <EpisodeItem
            key={episode.id}
            episode={episode}
            animeId={animeId}
            isActive={episode.id === activeEpisodeId}
          />
        ))}
      </div>
    </div>
  );
}
