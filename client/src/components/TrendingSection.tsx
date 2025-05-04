import { Link } from 'wouter';
import { Anime } from '@/lib/types';
import { cn } from '@/lib/utils';
import React from 'react';
import { AnimeCard } from '@/components/AnimeCard';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface TrendingSectionProps {
  animes: Anime[];
  title?: string;
  viewAllLink?: string;
  isNewTag?: boolean;
  className?: string;
}

export function TrendingSection({ 
  animes, 
  title, 
  viewAllLink, 
  isNewTag = false,
  className
}: TrendingSectionProps) {
  return (
    <div className={cn("mb-8", className)}>
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
    </div>
  );
}