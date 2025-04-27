import React, { lazy, Suspense, ComponentType } from 'react';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

/**
 * Configuration for code splitting
 */
export interface CodeSplitOptions {
  /**
   * Custom loading component to show while loading
   */
  LoadingComponent?: React.ComponentType;
  
  /**
   * Prefetch this component when window is idle
   */
  prefetch?: boolean;
  
  /**
   * Prefetch after specified delay in milliseconds
   */
  prefetchDelay?: number;
  
  /**
   * Callback fired when the component starts loading
   */
  onLoad?: () => void;
  
  /**
   * Callback fired when the component is loaded
   */
  onLoaded?: () => void;
  
  /**
   * Error component to show if loading fails
   */
  ErrorComponent?: React.ComponentType<{ error: Error; retry: () => void }>;
}

/**
 * Default error component for code splitting
 */
const DefaultErrorComponent = ({ error, retry }: { error: Error; retry: () => void }) => (
  <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-destructive/10 text-destructive">
    <h3 className="text-lg font-medium mb-2">Failed to load component</h3>
    <p className="text-sm mb-4">{error.message}</p>
    <button
      onClick={retry}
      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
    >
      Retry
    </button>
  </div>
);

/**
 * Creates a code-split component that's loaded on demand
 * 
 * @param loadComponent Function that imports the component
 * @param options Configuration options
 * @returns Lazy-loaded component
 */
export function createLazyComponent<T extends ComponentType<any>>(
  loadComponent: () => Promise<{ default: T }>,
  options: CodeSplitOptions = {}
): React.ComponentType<React.ComponentProps<T>> {
  const {
    LoadingComponent = LoadingSkeleton,
    prefetch = false,
    prefetchDelay = 2000,
    onLoad,
    onLoaded,
    ErrorComponent = DefaultErrorComponent
  } = options;
  
  // Create the lazy component
  const LazyComponent = lazy(() => {
    onLoad?.();
    
    return loadComponent()
      .then(module => {
        onLoaded?.();
        return module;
      })
      .catch(error => {
        console.error('Error loading component:', error);
        // Re-throw to trigger the error boundary
        throw error;
      });
  });
  
  // Setup prefetching if enabled
  if (prefetch && typeof window !== 'undefined') {
    if (prefetchDelay > 0) {
      // Delay prefetch
      setTimeout(() => {
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(() => {
            loadComponent();
          });
        } else {
          // Fallback for browsers without requestIdleCallback
          loadComponent();
        }
      }, prefetchDelay);
    } else {
      // Immediate prefetch when idle
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          loadComponent();
        });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(loadComponent, 100);
      }
    }
  }
  
  // Create error boundary component
  class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error: Error | null }
  > {
    constructor(props: { children: React.ReactNode }) {
      super(props);
      this.state = { hasError: false, error: null };
    }
    
    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }
    
    retry = () => {
      this.setState({ hasError: false, error: null });
    };
    
    render() {
      if (this.state.hasError && this.state.error) {
        return <ErrorComponent error={this.state.error} retry={this.retry} />;
      }
      
      return this.props.children;
    }
  }
  
  // Return the wrapped component
  return (props: React.ComponentProps<T>) => (
    <ErrorBoundary>
      <Suspense fallback={<LoadingComponent />}>
        <LazyComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * Preload a component in the background
 * 
 * @param loadComponent Function that imports the component
 * @returns Promise resolving when component is loaded
 */
export function preloadComponent<T extends ComponentType<any>>(
  loadComponent: () => Promise<{ default: T }>
): Promise<void> {
  return loadComponent().then(() => {
    // Component loaded successfully
  }).catch(error => {
    console.error('Error preloading component:', error);
  });
}