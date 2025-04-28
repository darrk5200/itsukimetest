import React, { useState, useEffect, Suspense } from 'react';
import { Switch, Route } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { createLazyComponent } from '@/lib/codeSplitting';
import { resourceManager } from '@/lib/memoryOptimizer';
import { trackMemoryUsage } from '@/lib/performanceMonitor';
import { getTheme } from '@/lib/storage';
import { 
  ResizablePanelGroup, 
  ResizablePanel, 
  ResizableHandle 
} from '@/components/ui/resizable';
import { useMediaQuery } from '@/hooks/use-mobile';

// Enhanced lazy loading with automatic memory optimization
const WelcomeDialog = createLazyComponent(
  () => import('@/components/WelcomeDialog').then(module => ({
    default: module.WelcomeDialog
  })),
  {
    prefetch: true,
    prefetchDelay: 1000,
    onLoaded: () => trackMemoryUsage('WelcomeDialog:loaded')
  }
);

// Lazy load page components with memory optimizations
const HomePage = createLazyComponent(
  () => import('@/pages/HomePage'),
  { prefetch: true }
);

const AnimePage = createLazyComponent(
  () => import('@/pages/AnimePage')
);

const HistoryPage = createLazyComponent(
  () => import('@/pages/HistoryPage')
);

const SearchPage = createLazyComponent(
  () => import('@/pages/SearchPage')
);

const TrendingPage = createLazyComponent(
  () => import('@/pages/TrendingPage')
);

const RecommendedPage = createLazyComponent(
  () => import('@/pages/RecommendedPage')
);

const RecentPage = createLazyComponent(
  () => import('@/pages/RecentPage')
);

const WatchLaterPage = createLazyComponent(
  () => import('@/pages/WatchLaterPage')
);

const ProfilePage = createLazyComponent(
  () => import('@/pages/ProfilePage')
);

const CommentsPage = createLazyComponent(
  () => import('@/pages/CommentsPage')
);

const NotFound = createLazyComponent(
  () => import('@/pages/not-found')
);

function Router() {
  const isMobile = useMediaQuery("(max-width: 1024px)");
  
  // Desktop view with fixed sidebar
  if (!isMobile) {
    return (
      <div className="flex min-h-screen">
        {/* Fixed sidebar */}
        <Sidebar />
        
        {/* Main content with margin to prevent overlap with sidebar */}
        <main className="flex-1 ml-64">
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
              <Route path="/profile" component={ProfilePage} />
              <Route path="/comments" component={CommentsPage} />
              {/* Fallback to 404 */}
              <Route component={NotFound} />
            </Switch>
          </Suspense>
        </main>
      </div>
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
            <Route path="/profile" component={ProfilePage} />
            <Route path="/comments" component={CommentsPage} />
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
  // Start memory monitoring when the app loads
  useEffect(() => {
    // Import and start the memory monitor
    import('./lib/memoryMonitor').then(({ memoryMonitor }) => {
      memoryMonitor.start();
      
      // Log initial memory usage
      const initialUsage = memoryMonitor.checkMemoryUsage();
      console.log('Initial memory usage:', 
        (initialUsage.usedJSHeapSize || 0) / (1024 * 1024), 'MB',
        `(${initialUsage.usedPercentage?.toFixed(2)}%)`
      );
    });
    
    // Clean up when the app is unmounted
    return () => {
      // Stop memory monitoring and clean up resources
      import('./lib/memoryMonitor').then(({ memoryMonitor }) => {
        memoryMonitor.stop();
      });
      
      // Clean up all remaining resources
      resourceManager.cleanupAll();
    };
  }, []);
  
  // Initialize theme when app loads
  useEffect(() => {
    // Check user's theme preference
    const theme = getTheme();
    
    // Apply theme class to the body
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, []);
  
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
