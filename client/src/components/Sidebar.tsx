import React from 'react';
import { useLocation, Link } from 'wouter';
import { Home, TrendingUp, Package, History, Bookmark, Heart, ChevronDown, Menu, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
}

const SidebarItem = ({ href, icon, children, active }: SidebarItemProps) => {
  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Link href={href}>
      <div 
        className={cn(
          "nav-link flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer",
          active && "active text-primary"
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
  
  const sidebarContent = (
    <>
      <div className="p-4 flex items-center justify-between md:justify-start gap-3 border-b border-muted">
        <Link href="/">
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <h1 className="text-xl font-bold">Itsukime</h1>
          </div>
        </Link>
      </div>
      
      <nav className="py-2">
        <SidebarItem href="/" icon={<Home className="h-5 w-5" />} active={location === '/'}>
          Home
        </SidebarItem>
        <SidebarItem href="/trending" icon={<TrendingUp className="h-5 w-5" />} active={location === '/trending'}>
          Trending
        </SidebarItem>
        <SidebarItem href="/search" icon={<Search className="h-5 w-5" />} active={location === '/search'}>
          Search
        </SidebarItem>
        <SidebarItem href="/subscriptions" icon={<Package className="h-5 w-5" />} active={location === '/subscriptions'}>
          Subscriptions
        </SidebarItem>
        
        <div className="border-t border-muted my-2 pt-2">
          <h3 className="px-4 py-2 text-xs uppercase text-muted-foreground font-semibold">Library</h3>
          <SidebarItem href="/history" icon={<History className="h-5 w-5" />} active={location === '/history'}>
            History
          </SidebarItem>
          <SidebarItem href="/watchlater" icon={<Bookmark className="h-5 w-5" />} active={location === '/watchlater'}>
            Watch Later
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
              className="nav-link flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <span className="w-5"></span>
              <span className="flex items-center">More <ChevronDown className="h-4 w-4 ml-1" /></span>
            </div>
          </Link>
        </div>
      </nav>
    </>
  );

  // Mobile version with Sheet component
  if (isMobile) {
    return (
      <>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" style={{ display: 'none' }}>
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 bg-sidebar">
            {sidebarContent}
          </SheetContent>
        </Sheet>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-sidebar border-t border-muted h-16 flex justify-around items-center md:hidden z-50">
          <Link href="/">
            <div 
              className={`flex flex-col items-center justify-center text-xs cursor-pointer ${location === '/' ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <Home className="h-6 w-6" />
              <span>Home</span>
            </div>
          </Link>
          <Link href="/trending">
            <div 
              className={`flex flex-col items-center justify-center text-xs cursor-pointer ${location === '/trending' ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <TrendingUp className="h-6 w-6" />
              <span>Trending</span>
            </div>
          </Link>
          <Link href="/search">
            <div 
              className={`flex flex-col items-center justify-center text-xs cursor-pointer ${location === '/search' ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <Search className="h-6 w-6" />
              <span>Search</span>
            </div>
          </Link>
          <Link href="/history">
            <div 
              className={`flex flex-col items-center justify-center text-xs cursor-pointer ${location.includes('/history') ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <History className="h-6 w-6" />
              <span>History</span>
            </div>
          </Link>
        </nav>
      </>
    );
  }

  // Desktop version
  return (
    <aside className={cn(
      "bg-sidebar border-r border-muted w-64 h-screen overflow-y-auto flex-shrink-0 fixed top-0 left-0 z-30",
      className
    )}>
      {sidebarContent}
    </aside>
  );
}
