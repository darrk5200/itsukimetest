import React, { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { Home, TrendingUp, History, Heart, ChevronDown, Menu, Search, BookmarkPlus, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
  compact?: boolean;
}

const SidebarItem = ({ href, icon, children, active, compact }: SidebarItemProps) => {
  const handleClick = (e: React.MouseEvent) => {
    // Ensure we process the click first, then scroll after component re-renders
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 10);
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={href}>
              <div 
                className={cn(
                  "nav-link flex items-center justify-center p-2 my-2 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer rounded-lg",
                  active && "active text-primary bg-primary/10"
                )}
                onClick={handleClick}
              >
                {icon}
              </div>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{children}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Link href={href}>
      <div 
        className={cn(
          "nav-link flex items-center gap-3 px-4 py-2 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer rounded-md",
          active && "active text-primary bg-primary/10"
        )}
        onClick={handleClick}
      >
        {icon}
        <span>{children}</span>
      </div>
    </Link>
  );
};

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(min-width: 769px) and (max-width: 1024px)");
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Compact mode for tablet when not expanded
  const compact = isTablet && !isExpanded;

  const compactSidebarContent = (
    <>
      <div className="p-3 flex items-center justify-center border-b border-muted">
        <Link href="/">
          <div 
            className="flex items-center cursor-pointer" 
            onClick={(e) => {
              setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }, 10);
            }}
          >
            <h1 className="text-xl font-bold">I</h1>
          </div>
        </Link>
      </div>
      
      <Button 
        variant="ghost" 
        size="icon" 
        className="mx-auto mt-2 mb-3 block"
        onClick={() => setIsExpanded(true)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      
      <nav className="py-2 flex flex-col items-center">
        <SidebarItem href="/" icon={<Home className="h-5 w-5" />} active={location === '/'} compact={true}>
          Home
        </SidebarItem>
        <SidebarItem href="/trending" icon={<TrendingUp className="h-5 w-5" />} active={location === '/trending'} compact={true}>
          Popular
        </SidebarItem>
        <SidebarItem href="/search" icon={<Search className="h-5 w-5" />} active={location === '/search'} compact={true}>
          Search
        </SidebarItem>

        
        <div className="border-t border-muted w-8 my-2"></div>
        
        <SidebarItem href="/history" icon={<History className="h-5 w-5" />} active={location === '/history'} compact={true}>
          History
        </SidebarItem>
        <SidebarItem href="/watchlater" icon={<BookmarkPlus className="h-5 w-5" />} active={location === '/watchlater'} compact={true}>
          Bookmarks
        </SidebarItem>
        <SidebarItem href="/favorites" icon={<Heart className="h-5 w-5" />} active={location === '/favorites'} compact={true}>
          Favorites
        </SidebarItem>
      </nav>
    </>
  );
  
  const fullSidebarContent = (
    <>
      <div className="p-4 flex items-center justify-between gap-3 border-b border-muted">
        <Link href="/">
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={(e) => {
              setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }, 10);
            }}
          >
            <h1 className="text-xl font-bold">Itsukime</h1>
          </div>
        </Link>
        
        {isTablet && (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setIsExpanded(false)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <nav className="py-2">
        <SidebarItem href="/" icon={<Home className="h-5 w-5" />} active={location === '/'}>
          Home
        </SidebarItem>
        <SidebarItem href="/trending" icon={<TrendingUp className="h-5 w-5" />} active={location === '/trending'}>
          Popular
        </SidebarItem>
        <SidebarItem href="/search" icon={<Search className="h-5 w-5" />} active={location === '/search'}>
          Search
        </SidebarItem>

        
        <div className="border-t border-muted my-2 pt-2">
          <h3 className="px-4 py-2 text-xs uppercase text-muted-foreground font-semibold">Library</h3>
          <SidebarItem href="/history" icon={<History className="h-5 w-5" />} active={location === '/history'}>
            History
          </SidebarItem>
          <SidebarItem href="/watchlater" icon={<BookmarkPlus className="h-5 w-5" />} active={location === '/watchlater'}>
            Bookmarks
          </SidebarItem>
          <SidebarItem href="/favorites" icon={<Heart className="h-5 w-5" />} active={location === '/favorites'}>
            Favorites
          </SidebarItem>
        </div>
        
        <div className="border-t border-muted my-2 pt-2">
          <h3 className="px-4 py-2 text-xs uppercase text-muted-foreground font-semibold">Genres</h3>
          <SidebarItem href="/genre/action" icon={<span className="w-5" />} active={location === '/genre/action'}>
            Action
          </SidebarItem>
          <SidebarItem href="/genre/comedy" icon={<span className="w-5" />} active={location === '/genre/comedy'}>
            Comedy
          </SidebarItem>
          <SidebarItem href="/genre/drama" icon={<span className="w-5" />} active={location === '/genre/drama'}>
            Drama
          </SidebarItem>
          <SidebarItem href="/genre/fantasy" icon={<span className="w-5" />} active={location === '/genre/fantasy'}>
            Fantasy
          </SidebarItem>
          <Link href="/genres">
            <div 
              className="nav-link flex items-center gap-3 px-4 py-2 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer rounded-md"
              onClick={(e) => {
                setTimeout(() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 10);
              }}
            >
              <span className="w-5"></span>
              <span className="flex items-center">More <ChevronDown className="h-4 w-4 ml-1" /></span>
            </div>
          </Link>
        </div>
      </nav>
    </>
  );

  // Mobile version with bottom navigation
  if (isMobile) {
    return (
      <>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden fixed top-3 left-3 z-50 bg-background/80 backdrop-blur-sm" aria-label="Menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 bg-sidebar">
            {fullSidebarContent}
          </SheetContent>
        </Sheet>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-sidebar border-t border-muted h-16 flex justify-around items-center md:hidden z-50">
          <Link href="/">
            <div
              className={`flex flex-col items-center justify-center text-xs cursor-pointer ${location === '/' ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={(e) => {
                setTimeout(() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 10);
              }}
            >
              <Home className="h-6 w-6" />
              <span>Home</span>
            </div>
          </Link>
          <Link href="/trending">
            <div 
              className={`flex flex-col items-center justify-center text-xs cursor-pointer ${location === '/trending' ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={(e) => {
                setTimeout(() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 10);
              }}
            >
              <TrendingUp className="h-6 w-6" />
              <span>Popular</span>
            </div>
          </Link>
          <Link href="/search">
            <div 
              className={`flex flex-col items-center justify-center text-xs cursor-pointer ${location === '/search' ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={(e) => {
                setTimeout(() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 10);
              }}
            >
              <Search className="h-6 w-6" />
              <span>Search</span>
            </div>
          </Link>
          <Link href="/history">
            <div 
              className={`flex flex-col items-center justify-center text-xs cursor-pointer ${location.includes('/history') ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={(e) => {
                setTimeout(() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 10);
              }}
            >
              <History className="h-6 w-6" />
              <span>History</span>
            </div>
          </Link>
        </nav>
      </>
    );
  }

  // Tablet version with compact sidebar
  if (compact) {
    return (
      <aside className={cn(
        "bg-sidebar border-r border-muted fixed top-0 left-0 h-screen overflow-y-auto flex-shrink-0 z-30 w-16",
        className
      )}>
        {compactSidebarContent}
      </aside>
    );
  }

  // Desktop version with full sidebar
  return (
    <aside className={cn(
      "bg-sidebar border-r border-muted fixed top-0 left-0 h-screen overflow-y-auto flex-shrink-0 z-30",
      isTablet ? "w-64" : "w-64",
      className
    )}>
      {fullSidebarContent}
    </aside>
  );
}
