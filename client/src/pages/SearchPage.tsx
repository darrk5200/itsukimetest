import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AnimeCard } from '@/components/AnimeCard';
import { Anime } from '@/lib/types';

export default function SearchPage() {
  // Properly handle location parameters
  const [locationPath] = useLocation();
  
  // Get the initial search query from the URL
  const [searchQuery, setSearchQuery] = useState(() => {
    const queryParams = new URLSearchParams(window.location.search);
    return queryParams.get('q') || '';
  });
  
  // Fetch all animes for search
  const { data: animes = [] } = useQuery<Anime[]>({
    queryKey: ['/api/animes'],
  });
  
  // Filter animes based on search query
  const filteredAnimes = animes.filter((anime: Anime) => 
    anime.anime_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    anime.genres.some((genre: string) => genre.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  // Update search when URL changes
  useEffect(() => {
    const newQueryParams = new URLSearchParams(window.location.search);
    const newQuery = newQueryParams.get('q') || '';
    if (newQuery !== searchQuery) {
      setSearchQuery(newQuery);
    }
  }, [locationPath, searchQuery]);
  
  // Handle real-time search input
  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    // Update URL with search query if value isn't empty
    if (value.trim()) {
      window.history.pushState({}, '', `/search?q=${encodeURIComponent(value)}`);
    } else {
      window.history.pushState({}, '', `/search`);
    }
  };
  
  const handleCategoryClick = (category: string) => {
    const categoryTerm = category.trim();
    // Update URL with category search
    window.history.pushState({}, '', `/search?q=${encodeURIComponent(categoryTerm)}`);
    // Force a state update to trigger filtering
    setSearchQuery(categoryTerm);
  };
  
  return (
    <div className="p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="relative">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Search for anime, genres..."
              className="bg-primary/10 text-foreground pl-10 py-6 text-lg rounded-lg border-primary/20 focus:ring-2 focus:ring-primary"
              autoComplete="off"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
          </div>
        </div>
        
        {searchQuery ? (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-medium mb-4">Search Results for "{searchQuery}"</h2>
              
              {filteredAnimes.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground mb-4">No results found for "{searchQuery}"</p>
                  <p className="text-sm text-muted-foreground">Try a different search term or browse categories</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
                  {filteredAnimes.map((anime) => (
                    <AnimeCard key={anime.id} anime={anime} />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Popular Categories */}
            <div className="mb-8">
              <h2 className="text-lg font-medium mb-4">Popular Categories</h2>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {["Action", "Comedy", "Drama", "Fantasy", "Romance", "Sci-Fi", "Slice of Life", "Supernatural"].map(
                  (category) => (
                    <Button
                      key={category}
                      variant="outline"
                      className="justify-start"
                      onClick={() => handleCategoryClick(category)}
                    >
                      {category}
                    </Button>
                  )
                )}
              </div>
            </div>
            
            {/* Top Anime */}
            {animes && animes.length > 0 && (
              <div>
                <h2 className="text-lg font-medium mb-4">Top Anime</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
                  {animes.slice(0, 10).map((anime) => (
                    <AnimeCard key={anime.id} anime={anime} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}