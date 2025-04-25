import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

// Add the missing useMediaQuery function that is imported in other components
// Optimized useMediaQuery that only runs when necessary and memoizes the result
export function useMediaQuery(query: string): boolean {
  // Start with the current match state on initial render
  const [matches, setMatches] = React.useState(() => {
    // SSR-friendly: only use window.matchMedia on the client
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });
  
  // Use useRef to store the media query to avoid creating a new one on every render
  const mediaQueryRef = React.useRef<MediaQueryList | null>(null);
  
  React.useEffect(() => {
    // Create the MediaQueryList only once per query
    if (!mediaQueryRef.current || mediaQueryRef.current.media !== query) {
      mediaQueryRef.current = window.matchMedia(query);
    }
    
    const media = mediaQueryRef.current;
    
    // Set initial value if it changed since component mounted
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    
    // Create the listener function and keep it referenced
    const listener = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };
    
    // Add event listener
    media.addEventListener("change", listener);
    
    // Clean up the listener when the component unmounts or query changes
    return () => media.removeEventListener("change", listener);
  }, [query]); // Only re-run if the query string changes

  return matches;
}
