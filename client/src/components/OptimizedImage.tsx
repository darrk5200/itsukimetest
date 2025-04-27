import React from 'react';
import { useOptimizedImage } from '@/hooks/use-optimized-image';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  // Add any custom props here
  lowQualitySrc?: string;
  loadOnVisible?: boolean;
}

/**
 * Memory-optimized image component that implements:
 * - Lazy loading
 * - Intersection observer-based loading
 * - Automatic resource cleanup
 * - Optional low-quality image placeholder
 */
export function OptimizedImage({
  src,
  alt,
  className,
  lowQualitySrc,
  loadOnVisible = true,
  ...rest
}: OptimizedImageProps) {
  const imgProps = useOptimizedImage(src || '', {
    lowQualitySrc,
    loadOnVisible
  });

  return (
    <img
      {...imgProps}
      {...rest}
      alt={alt || ''}
      className={cn("transition-opacity duration-300", className)}
    />
  );
}