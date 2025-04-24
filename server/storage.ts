import { animes, type Anime, type InsertAnime, type Episode } from "@shared/schema";
import fs from 'fs/promises';
import path from 'path';

// Interface for anime storage operations
export interface IStorage {
  getAllAnimes(): Promise<Anime[]>;
  getAnimeById(id: number): Promise<Anime | undefined>;
  searchAnimes(query: string): Promise<Anime[]>;
}

export class MemStorage implements IStorage {
  private animes: Map<number, Anime>;

  constructor() {
    this.animes = new Map();
  }
  
  async initialize() {
    try {
      // Load animes from JSON file
      const dataPath = path.resolve(process.cwd(), 'server', 'data', 'animes.json');
      const data = await fs.readFile(dataPath, 'utf-8');
      const animesList = JSON.parse(data) as Anime[];
      
      // Store animes in memory
      animesList.forEach(anime => {
        this.animes.set(anime.id, anime);
      });
      
      console.log(`Loaded ${this.animes.size} animes from data file.`);
    } catch (error) {
      console.error('Failed to load anime data:', error);
      // Initialize with empty data if file loading fails
    }
  }

  async getAllAnimes(): Promise<Anime[]> {
    return Array.from(this.animes.values());
  }

  async getAnimeById(id: number): Promise<Anime | undefined> {
    return this.animes.get(id);
  }

  async searchAnimes(query: string): Promise<Anime[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.animes.values()).filter(anime => 
      anime.anime_name.toLowerCase().includes(lowerQuery) ||
      anime.genres.some(genre => genre.toLowerCase().includes(lowerQuery))
    );
  }
}

export const storage = new MemStorage();
