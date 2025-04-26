import { animes, comments, type Anime, type InsertAnime, type Episode, type Comment, type InsertComment } from "@shared/schema";
import fs from 'fs/promises';
import path from 'path';
import { db } from './db-sqlite';
import { eq, and } from 'drizzle-orm';

// Interface for anime storage operations
export interface IStorage {
  // Anime operations
  getAllAnimes(): Promise<Anime[]>;
  getAnimeById(id: number): Promise<Anime | undefined>;
  searchAnimes(query: string): Promise<Anime[]>;
  
  // Comment operations
  getCommentsByEpisode(animeId: number, episodeId: number): Promise<Comment[]>;
  addComment(comment: InsertComment): Promise<Comment>;
  likeComment(commentId: string): Promise<void>;
  deleteComment(commentId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
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
      
      // Create the schema in the database
      await this.pushSchema();
    } catch (error) {
      console.error('Failed to load anime data:', error);
      // Initialize with empty data if file loading fails
    }
  }
  
  private async pushSchema() {
    try {
      // Create tables using Drizzle's schema
      const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');
      await migrate(db, { migrationsFolder: './drizzle' });
    
      // Check if the comments table exists and create it if it doesn't
      db.$client.exec(`
        CREATE TABLE IF NOT EXISTS comments (
          id TEXT PRIMARY KEY,
          anime_id INTEGER NOT NULL,
          episode_id INTEGER NOT NULL,
          user_name TEXT NOT NULL,
          user_avatar TEXT NOT NULL DEFAULT 'icon_01',
          comment_text TEXT NOT NULL,
          created_at TEXT NOT NULL,
          likes INTEGER DEFAULT 0 NOT NULL
        );
      `);
      console.log("Database schema initialized successfully");
    } catch (error) {
      console.error("Error initializing database schema:", error);
    }
  }

  // Anime operations
  async getAllAnimes(): Promise<Anime[]> {
    return Array.from(this.animes.values());
  }

  async getAnimeById(id: number): Promise<Anime | undefined> {
    return this.animes.get(id);
  }

  async searchAnimes(query: string): Promise<Anime[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.animes.values()).filter(anime => {
      const genres = anime.genres as string[];
      return anime.anime_name.toLowerCase().includes(lowerQuery) ||
        genres.some((genre: string) => genre.toLowerCase().includes(lowerQuery));
    });
  }
  
  // Comment operations
  async getCommentsByEpisode(animeId: number, episodeId: number): Promise<Comment[]> {
    return await db.select().from(comments)
      .where(and(
        eq(comments.animeId, animeId),
        eq(comments.episodeId, episodeId)
      ))
      .orderBy(comments.timestamp);
  }
  
  async addComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db.insert(comments)
      .values(comment)
      .returning();
      
    return newComment;
  }
  
  async likeComment(commentId: string): Promise<void> {
    // First get the current likes count
    const [comment] = await db.select()
      .from(comments)
      .where(eq(comments.id, commentId));
      
    if (comment) {
      // Increment the likes count
      await db.update(comments)
        .set({ likes: comment.likes + 1 })
        .where(eq(comments.id, commentId));
    }
  }
  
  async deleteComment(commentId: string): Promise<void> {
    await db.delete(comments)
      .where(eq(comments.id, commentId));
  }
}

export const storage = new DatabaseStorage();
