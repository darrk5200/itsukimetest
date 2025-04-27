import { useState, useEffect, useRef, useCallback } from 'react';
import { createVirtualList } from '@/lib/memoryOptimizer';

interface UseVirtualListOptions<T> {
  items: T[];
  itemHeight: number;
  overscan?: number;
  getKey: (item: T) => string | number;
}

/**
 * Hook for efficiently rendering large lists with virtualization
 * Only renders items that are visible in the viewport, greatly reducing memory usage
 * 
 * @param options Configuration options for the virtual list
 * @returns Props and data needed to render a virtualized list
 */
export function useVirtualList<T>({
  items,
  itemHeight,
  overscan = 3,
  getKey
}: UseVirtualListOptions<T>) {
  // Create the virtual list helper
  const virtualList = useRef(createVirtualList({
    items,
    itemHeight,
    overscan,
    getKey
  }));
  
  // Update virtualList ref when items change
  useEffect(() => {
    virtualList.current = createVirtualList({
      items,
      itemHeight,
      overscan,
      getKey
    });
  }, [items, itemHeight, overscan, getKey]);

  // Track the container element and its dimensions
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  
  // Calculate visible items based on scroll position and viewport height
  const {
    items: visibleItems,
    startOffset,
    totalHeight,
    visibleItemsWithPositions
  } = virtualList.current.getVisibleItems(scrollTop, viewportHeight);
  
  // Handle scroll events in the container
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);
  
  // Track resizes of the viewport
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    setViewportHeight(container.clientHeight);
    
    // Update scroll position
    setScrollTop(container.scrollTop);
    
    // Add scroll event listener
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Set up resize observer to detect container size changes
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === container) {
          setViewportHeight(container.clientHeight);
        }
      }
    });
    
    resizeObserver.observe(container);
    
    // Clean up
    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [handleScroll]);
  
  // Return everything needed to render the virtual list
  return {
    containerRef,
    totalHeight,
    startOffset,
    visibleItems,
    visibleItemsWithPositions,
    // Bind these props to the container div
    containerProps: {
      ref: containerRef,
      style: {
        height: '100%',
        overflow: 'auto',
        position: 'relative' as const,
      },
      onScroll: handleScroll,
    },
    // Bind these props to the inner container div
    innerProps: {
      style: {
        height: `${totalHeight}px`,
        position: 'relative' as const,
        width: '100%',
      },
    },
    // Helper function to get props for each item
    getItemProps: (index: number) => {
      const adjustedIndex = index;
      return {
        style: {
          position: 'absolute' as const,
          top: 0,
          left: 0,
          width: '100%',
          height: `${itemHeight}px`,
          transform: `translateY(${startOffset + (adjustedIndex * itemHeight)}px)`,
        },
      };
    },
  };
}