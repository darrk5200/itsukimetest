import { useState, useEffect, lazy, Suspense } from 'react';
import { Switch, Route } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

// Lazy load the welcome dialog to reduce initial memory usage
const WelcomeDialog = lazy(() => import('@/components/WelcomeDialog').then(module => ({
  default: module.WelcomeDialog
})));
import { 
  ResizablePanelGroup, 
  ResizablePanel, 
  ResizableHandle 
} from '@/components/ui/resizable';

// Lazy load page components to reduce initial bundle size
const HomePage = lazy(() => import('@/pages/HomePage'));
const AnimePage = lazy(() => import('@/pages/AnimePage'));
const HistoryPage = lazy(() => import('@/pages/HistoryPage'));
const SearchPage = lazy(() => import('@/pages/SearchPage'));
const TrendingPage = lazy(() => import('@/pages/TrendingPage'));
const RecommendedPage = lazy(() => import('@/pages/RecommendedPage'));
const RecentPage = lazy(() => import('@/pages/RecentPage'));
const WatchLaterPage = lazy(() => import('@/pages/WatchLaterPage'));
const NotFound = lazy(() => import('@/pages/not-found'));
import { useMediaQuery } from '@/hooks/use-mobile';

function Router() {
  const isMobile = useMediaQuery("(max-width: 1024px)");
  
  // Use ResizablePanelGroup for desktop view
  if (!isMobile) {
    return (
      <ResizablePanelGroup
        direction="horizontal"
        className="min-h-screen"
      >
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          <Sidebar className="h-screen relative w-full" />
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        <ResizablePanel defaultSize={80}>
          <main className="flex-1">
            <Header />
            
            <Suspense fallback={<LoadingSkeleton />}>
              <Switch>
                <Route path="/" component={HomePage} />
                <Route path="/anime/:id" component={AnimePage} />
                <Route path="/anime/:id/episode/:episodeId" component={AnimePage} />
                <Route path="/history" component={HistoryPage} />
                <Route path="/search" component={SearchPage} />
                <Route path="/trending" component={TrendingPage} />
                <Route path="/recommended" component={RecommendedPage} />
                <Route path="/recent" component={RecentPage} />
                <Route path="/subscriptions" component={HomePage} />
                <Route path="/watchlater" component={WatchLaterPage} />
                <Route path="/favorites" component={HistoryPage} />
                {/* Fallback to 404 */}
                <Route component={NotFound} />
              </Switch>
            </Suspense>
          </main>
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  }
  
  // Mobile view remains the same
  return (
    <div className="flex flex-col min-h-screen">
      <Sidebar />
      
      <main className="flex-1">
        <Header />
        
        <Suspense fallback={<LoadingSkeleton />}>
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/anime/:id" component={AnimePage} />
            <Route path="/anime/:id/episode/:episodeId" component={AnimePage} />
            <Route path="/history" component={HistoryPage} />
            <Route path="/search" component={SearchPage} />
            <Route path="/trending" component={TrendingPage} />
            <Route path="/recommended" component={RecommendedPage} />
            <Route path="/recent" component={RecentPage} />
            <Route path="/subscriptions" component={HomePage} />
            <Route path="/watchlater" component={WatchLaterPage} />
            <Route path="/favorites" component={HistoryPage} />
            {/* Fallback to 404 */}
            <Route component={NotFound} />
          </Switch>
        </Suspense>
        
        {/* Add padding at the bottom on mobile for the nav bar */}
        <div className="h-16"></div>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Suspense fallback={null}>
          <WelcomeDialog />
        </Suspense>
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
