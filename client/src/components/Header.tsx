import { Link, useLocation } from 'wouter';
import { useState } from 'react';
import { Search, User, Menu, Home, TrendingUp, Clock, History as HistoryIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { NotificationList } from '@/components/NotificationList';

export function Header() {
  const [location] = useLocation();
  const isDesktop = !useMediaQuery("(max-width: 768px)");
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  return (
    <header className="bg-sidebar fixed top-0 left-0 right-0 z-50 border-b border-muted py-2">
      <div className="flex items-center justify-between px-4">
        {/* Sidebar toggle button in the header */}
        {!isDesktop && 
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
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
                      { href: '/search', label: 'Search', icon: <Search className="h-5 w-5" /> },
                      { href: '/trending', label: 'Popular', icon: <TrendingUp className="h-5 w-5" /> },
                      { href: '/watchlater', label: 'Bookmarks', icon: <Clock className="h-5 w-5" /> },
                      { href: '/history', label: 'History', icon: <HistoryIcon className="h-5 w-5" /> }
                    ].map((item) => (
                      <Link key={item.href} href={item.href}>
                        <a 
                          className={`flex items-center gap-3 py-3 px-4 hover:bg-muted ${
                            location === item.href ? 'text-primary' : 'text-muted-foreground'
                          }`}
                          onClick={(e) => {
                            // First close the sheet
                            setIsSheetOpen(false);
                            
                            // Use a small delay to ensure navigation happens first, 
                            // then scroll after the new page is rendered
                            setTimeout(() => {
                              window.scrollTo({ top: 0, behavior: 'auto' });
                            }, 100);
                          }}
                        >
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
              onClick={() => {
                setTimeout(() => {
                  window.scrollTo({ top: 0, behavior: 'auto' });
                }, 100);
              }}
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
          <NotificationList />
          <Link href="/profile">
            <Button 
              variant="ghost" 
              size="icon" 
              className="ml-2 text-muted-foreground hover:text-primary"
              onClick={() => {
                setTimeout(() => {
                  window.scrollTo({ top: 0, behavior: 'auto' });
                }, 100);
              }}
            >
              <User className="h-6 w-6" />
              <span className="sr-only">User Profile</span>
            </Button>
          </Link>
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
