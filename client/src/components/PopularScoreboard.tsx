import React from 'react';
import { Link } from 'wouter';
import { Medal, Eye, Trophy, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Anime } from '@/lib/types';
import { cn } from '@/lib/utils';
import { OptimizedImage } from '@/components/OptimizedImage';

interface PopularScoreboardProps {
  animes: Anime[];
  title?: string;
  className?: string;
}

export function PopularScoreboard({ animes, title = "Popular This Week", className }: PopularScoreboardProps) {
  // Sort animes by weeklyViews in descending order
  const sortedAnimes = [...animes].sort((a, b) => (b.weeklyViews || 0) - (a.weeklyViews || 0));

  return (
    <section className={cn("mb-8", className)}>
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center">
            <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
            {title}
          </h2>
        </div>
      )}
      
      <div className="bg-card/40 rounded-lg overflow-hidden border border-border/50">
        {sortedAnimes.map((anime, index) => (
          <Link 
            key={anime.id} 
            href={`/anime/${anime.id}`}
          >
            <div className={cn(
              "flex items-center gap-3 p-3 transition-colors hover:bg-card cursor-pointer",
              index !== sortedAnimes.length - 1 ? "border-b border-border/30" : ""
            )}>
              {/* Rank Number with Medal for top 3 */}
              <div className="flex-shrink-0 w-10 flex justify-center">
                {index === 0 ? (
                  <div className="bg-yellow-500/20 rounded-full p-1.5">
                    <Medal className="h-5 w-5 text-yellow-500" />
                  </div>
                ) : index === 1 ? (
                  <div className="bg-gray-300/20 rounded-full p-1.5">
                    <Medal className="h-5 w-5 text-gray-400" />
                  </div>
                ) : index === 2 ? (
                  <div className="bg-amber-600/20 rounded-full p-1.5">
                    <Medal className="h-5 w-5 text-amber-600" />
                  </div>
                ) : (
                  <div className="font-bold text-muted-foreground w-8 h-8 flex items-center justify-center">
                    {index + 1}
                  </div>
                )}
              </div>
              
              {/* Anime Cover & Title */}
              <div className="flex-shrink-0 w-12 h-16 rounded overflow-hidden">
                <OptimizedImage 
                  src={anime.coverpage} 
                  alt={anime.anime_name} 
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex-grow">
                <h3 className="font-medium text-foreground text-sm md:text-base line-clamp-1">
                  {anime.anime_name}
                </h3>
                <p className="text-muted-foreground text-xs">
                  <span className="text-primary font-medium">{anime.releasedEpisodes}</span>/{anime.episode_count} Episodes
                </p>
              </div>
              
              {/* Views Count */}
              <div className="flex flex-col items-end ml-auto">
                <div className="flex items-center text-sm font-semibold">
                  <Eye className="h-4 w-4 mr-1 text-muted-foreground" />
                  <span>{anime.weeklyViews || 0}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}