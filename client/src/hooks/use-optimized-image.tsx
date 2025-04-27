import { useRef, useEffect } from 'react';
import { optimizedImageLoader, resourceManager } from '@/lib/memoryOptimizer';

interface UseOptimizedImageOptions {
  lowQualitySrc?: string;
  loadOnVisible?: boolean;
}

/**
 * Hook for optimized image loading with memory efficiency and lazy loading
 * 
 * @param src Original image URL
 * @param options Configuration options
 * @returns Props to spread on an image element
 */
export function useOptimizedImage(
  src: string,
  options: UseOptimizedImageOptions = {}
) {
  // Create a unique ID for resource tracking
  const imageId = useRef(`img-${Math.random().toString(36).substring(2, 9)}`);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // Initialize the optimized loader
  const loader = useRef(optimizedImageLoader(src, options));
  
  // Update loader when props change
  useEffect(() => {
    loader.current = optimizedImageLoader(src, options);
    
    // Register cleanup with the resource manager
    resourceManager.register(imageId.current, () => {
      loader.current.cleanup();
    });
    
    return () => {
      resourceManager.cleanup(imageId.current);
    };
  }, [src, options.lowQualitySrc, options.loadOnVisible]);
  
  // Return props to be spread on an img element
  return {
    ...loader.current.getProps(imageRef),
    ref: imageRef,
  };
}