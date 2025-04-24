import { useState, useEffect } from 'react';
import { Switch, Route } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import HomePage from '@/pages/HomePage';
import AnimePage from '@/pages/AnimePage';
import HistoryPage from '@/pages/HistoryPage';
import SearchPage from '@/pages/SearchPage';
import TrendingPage from '@/pages/TrendingPage';
import RecommendedPage from '@/pages/RecommendedPage';
import RecentPage from '@/pages/RecentPage';
import NotFound from '@/pages/not-found';
import { useMediaQuery } from '@/hooks/use-mobile';

function Router() {
  const isMobile = useMediaQuery("(max-width: 1024px)");
  
  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <Sidebar />
      
      <main className={`flex-1 ${isMobile ? '' : 'lg:ml-64'}`}>
        <Header />
        
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
          <Route path="/watchlater" component={HistoryPage} />
          <Route path="/favorites" component={HistoryPage} />
          {/* Fallback to 404 */}
          <Route component={NotFound} />
        </Switch>
        
        {/* Add padding at the bottom on mobile for the nav bar */}
        {isMobile && <div className="h-16"></div>}
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
