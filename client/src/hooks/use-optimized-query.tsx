import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useResourceCleanup } from './use-resource-cleanup';
import { useComponentLifecycle } from './use-component-lifecycle';
import { queryClient, getQueryFn } from '@/lib/queryClient';
import { trackMemoryUsage } from '@/lib/performanceMonitor';

/**
 * Optimized version of useQuery that includes memory optimization
 * Handles proper cleanup and tracks memory usage
 * 
 * @param queryKey Query key as array or string
 * @param options TanStack Query options
 * @returns TanStack Query result
 */
export function useOptimizedQuery<
  TData = unknown,
  TError = Error
>(
  queryKey: string | readonly unknown[],
  options?: Omit<UseQueryOptions<TData, TError, TData>, 'queryKey' | 'queryFn'>
): UseQueryResult<TData, TError> {
  // Create standardized key
  const normalizedKey = Array.isArray(queryKey) ? queryKey : [queryKey];
  const componentName = `Query:${normalizedKey.join(':')}`;
  
  // Use our lifecycle hooks
  const { registerCleanup } = useResourceCleanup();
  const { trackHeapUsage } = useComponentLifecycle(componentName);
  
  // Wrap the query with memory tracking
  const result = useQuery<TData, TError>({
    queryKey: normalizedKey,
    queryFn: getQueryFn({ on401: 'throw' })(),
    ...options,
    onSuccess: (data) => {
      // Track memory after data is loaded
      trackMemoryUsage(`${componentName}:success`);
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });

  // Register cleanup for query cache when component unmounts
  // This helps prevent memory leaks from unused query data
  registerCleanup(() => {
    // Remove this query data from cache if it's not actively used elsewhere
    // but only if configured to do so in the options
    if (options?.gcTime === 0) {
      queryClient.removeQueries({ queryKey: normalizedKey });
    }
  });

  return result;
}

/**
 * Hook for optimizing data prefetching with memory considerations
 * 
 * @param queryKeys Array of query keys to prefetch
 * @param options Options for controlling prefetch behavior
 */
export function usePrefetchOptimized(
  queryKeys: (string | readonly unknown[])[],
  options?: {
    staleTime?: number;
    cacheTime?: number;
  }
) {
  // Track memory before prefetching
  const prefetchWithMemoryTracking = async () => {
    trackMemoryUsage('prefetch:start');
    
    // Prefetch all provided query keys
    await Promise.all(
      queryKeys.map(queryKey => {
        const normalizedKey = Array.isArray(queryKey) ? queryKey : [queryKey];
        return queryClient.prefetchQuery({
          queryKey: normalizedKey,
          queryFn: getQueryFn({ on401: 'returnNull' })(),
          staleTime: options?.staleTime,
          gcTime: options?.cacheTime,
        });
      })
    );
    
    // Track memory after prefetching
    trackMemoryUsage('prefetch:complete');
  };
  
  return {
    prefetch: prefetchWithMemoryTracking
  };
}