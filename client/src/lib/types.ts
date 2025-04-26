export interface Anime {
  id: number;
  anime_name: string;
  coverpage: string;
  episode_count: number;
  releasedEpisodes: number;
  releaseDate: string;
  genres: string[];
  description: string;
  episodes: Episode[];
  lastEpisodeTimestamp?: string; // ISO date string for most recent episode
}

export interface Episode {
  id: number;
  episode_number: number;
  title: string;
  video_url: string;
  thumbnail: string;
  duration: number;
}

export interface WatchHistoryItem {
  animeId: number;
  episodeId: number;
  timestamp: number; // seconds watched
  progress: number; // percentage 0-100
  lastWatched: string; // ISO date string
}



// Navigation types
export type SidebarSection = 'home' | 'trending' | 'subscriptions' | 'history' | 'watchlater' | 'favorites' | 'genres';

// Theme
export type ThemeMode = 'dark' | 'light';

export interface Notification {
  id: string;
  animeId: number;
  animeName: string;
  message: string;
  timestamp: string; // ISO date string
  episodeId?: number;
  read: boolean;
}

export interface Comment {
  id: string;
  animeId: number;
  episodeId: number;
  userName: string;
  text: string;
  timestamp: string; // ISO date string
  likes: number;
}
