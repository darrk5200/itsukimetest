import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Search, Bell, User, Menu, Home, TrendingUp, History as HistoryIcon, X, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getSearchHistory, saveToSearchHistory, clearSearchHistory, removeFromSearchHistory } from '@/lib/storage';
import { cn, debounce } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [searchHistory, setSearchHistory] = useState(getSearchHistory());
  const [location, navigate] = useLocation();
  const searchRef = useRef<HTMLDivElement>(null);
  const isDesktop = !useMediaQuery("(max-width: 768px)");

  // Load search history on mount
  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);

  // Handle clicks outside of search results
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Only perform search if there's a non-empty query
    if (searchQuery.trim()) {
      // Don't override user's input with default suggestions
      const userQuery = searchQuery.trim();
      saveToSearchHistory(userQuery);
      setShowResults(false);
      navigate(`/search?q=${encodeURIComponent(userQuery)}`);
    }
  };

  const debouncedUpdateHistory = debounce(() => {
    setSearchHistory(getSearchHistory());
  }, 300);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (e.target.value.length > 0) {
      setShowResults(true);
      debouncedUpdateHistory();
    } else {
      setShowResults(false);
    }
  };

  const handleSearchItemClick = (term: string) => {
    setSearchQuery(term);
    saveToSearchHistory(term);
    setShowResults(false);
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <header className="bg-sidebar sticky top-0 z-20 border-b border-muted py-2">
      <div className="flex items-center justify-between px-4">
        {/* Sidebar toggle button in the header */}
        {!isDesktop && 
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-3 md:hidden flex-shrink-0">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 bg-sidebar">
              {/* Sidebar content inside Sheet */}
              <div className="py-6">
                <div className="p-4 flex items-center justify-between md:justify-start gap-3 border-b border-muted">
                  <h1 className="text-xl font-bold">Itsukime</h1>
                </div>
                
                <nav className="py-2">
                  <div className="nav-links space-y-1">
                    {[
                      { href: '/', label: 'Home', icon: <Home className="h-5 w-5" /> },
                      { href: '/trending', label: 'Trending', icon: <TrendingUp className="h-5 w-5" /> },
                      { href: '/history', label: 'History', icon: <HistoryIcon className="h-5 w-5" /> },
                      { href: '/search', label: 'Search', icon: <Search className="h-5 w-5" /> }
                    ].map((item) => (
                      <Link key={item.href} href={item.href}>
                        <a className={`flex items-center gap-3 py-3 px-4 hover:bg-muted ${
                          location === item.href ? 'text-primary' : 'text-muted-foreground'
                        }`}>
                          {item.icon}
                          <span>{item.label}</span>
                        </a>
                      </Link>
                    ))}
                  </div>
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        }
        
        <div className="w-full text-center">
          <Link href="/">
            <div
              className="flex items-center justify-center gap-2 cursor-pointer"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <img 
                src="https://raw.githubusercontent.com/darrk5200/website-images/refs/heads/main/itsuki_icon.png" 
                alt="Itsukime logo" 
                className="w-9 h-9" 
              />
              <h1 
                className="text-xl font-bold"
              >
                Itsukime
              </h1>
            </div>
          </Link>
        </div>
        
        <div className="flex items-center ml-4">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
            <Bell className="h-6 w-6" />
            <span className="sr-only">Notifications</span>
          </Button>
          <Button variant="ghost" size="icon" className="ml-2 text-muted-foreground hover:text-primary">
            <User className="h-6 w-6" />
            <span className="sr-only">User Account</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

function History(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
