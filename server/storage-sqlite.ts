import { animes, comments, commentLikes, type Anime, type InsertAnime, type Episode, type Comment, type InsertComment, type CommentLike, type InsertCommentLike } from "@shared/schema";
import fs from 'fs/promises';
import path from 'path';
import { db } from './db-sqlite';
import { eq, and, desc, asc, sql } from 'drizzle-orm';

// Sort orders for comments
export const SORT_BY_RECENT = 'recent';
export const SORT_BY_LIKES = 'likes';

// Define type for sort order
export type CommentSortOrder = typeof SORT_BY_RECENT | typeof SORT_BY_LIKES;

// Interface for anime storage operations
export interface IStorage {
  // Anime operations
  getAllAnimes(): Promise<Anime[]>;
  getAnimeById(id: number): Promise<Anime | undefined>;
  searchAnimes(query: string): Promise<Anime[]>;
  
  // Comment operations
  getCommentsByEpisode(
    animeId: number, 
    episodeId: number, 
    page?: number, 
    limit?: number, 
    sortOrder?: CommentSortOrder
  ): Promise<Comment[]>;
  
  getTotalCommentsCount(animeId: number, episodeId: number): Promise<number>;
  addComment(comment: InsertComment): Promise<Comment>;
  likeComment(commentId: string, userId: string): Promise<boolean>; // returns true if liked, false if already liked
  hasUserLikedComment(commentId: string, userId: string): Promise<boolean>;
  deleteComment(commentId: string): Promise<void>;
}

export class SQLiteStorage implements IStorage {
  private animes: Map<number, Anime> = new Map();

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
      // Use SQLite's $client to execute raw SQL for creating tables
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
        
        CREATE TABLE IF NOT EXISTS comment_likes (
          id TEXT PRIMARY KEY,
          comment_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          UNIQUE(comment_id, user_id)
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
      const animeObj = anime as unknown as { anime_name: string; genres: string[] };
      return animeObj.anime_name.toLowerCase().includes(lowerQuery) ||
        animeObj.genres.some((genre: string) => genre.toLowerCase().includes(lowerQuery));
    });
  }
  
  // Comment operations
  async getCommentsByEpisode(
    animeId: number, 
    episodeId: number,
    page: number = 1,
    limit: number = 10,
    sortOrder: CommentSortOrder = SORT_BY_RECENT
  ): Promise<Comment[]> {
    try {
      const offset = (page - 1) * limit;
      
      let query = db.select().from(comments)
        .where(and(
          eq(comments.animeId, animeId),
          eq(comments.episodeId, episodeId)
        ))
        .limit(limit)
        .offset(offset);
      
      // Apply sorting based on order parameter
      if (sortOrder === SORT_BY_LIKES) {
        query = query.orderBy((cols) => [desc(cols.likes), desc(cols.timestamp)]);
      } else {
        query = query.orderBy((cols) => [desc(cols.timestamp)]);
      }
      
      const results = await query;
      return results as unknown as Comment[];
    } catch (error) {
      console.error("Error fetching comments:", error);
      return [];
    }
  }
  
  async getTotalCommentsCount(animeId: number, episodeId: number): Promise<number> {
    try {
      const result = await db.select({ count: sql`count(*)` }).from(comments)
        .where(and(
          eq(comments.animeId, animeId),
          eq(comments.episodeId, episodeId)
        ));
      
      return Number(result[0].count) || 0;
    } catch (error) {
      console.error("Error counting comments:", error);
      return 0;
    }
  }
  
  async addComment(comment: InsertComment): Promise<Comment> {
    try {
      const id = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      
      await db.insert(comments).values({
        ...comment,
        id,
        timestamp,
        likes: 0
      });
      
      return {
        ...comment,
        id,
        timestamp,
        likes: 0
      } as Comment;
    } catch (error) {
      console.error("Error adding comment:", error);
      throw error;
    }
  }
  
  async hasUserLikedComment(commentId: string, userId: string): Promise<boolean> {
    try {
      const results = await db.select()
        .from(commentLikes)
        .where(and(
          eq(commentLikes.commentId, commentId),
          eq(commentLikes.userId, userId)
        ));
      
      return results.length > 0;
    } catch (error) {
      console.error("Error checking if user liked comment:", error);
      return false;
    }
  }
  
  async likeComment(commentId: string, userId: string): Promise<boolean> {
    try {
      // Check if user already liked this comment
      const hasLiked = await this.hasUserLikedComment(commentId, userId);
      
      if (hasLiked) {
        return false; // User already liked this comment
      }
      
      // Begin transaction
      db.$client.exec('BEGIN TRANSACTION');
      
      try {
        // Add to likes table
        await db.insert(commentLikes).values({
          commentId,
          userId,
        });
        
        // Increment likes count in comment
        await db.update(comments)
          .set({ 
            likes: sql`likes + 1` 
          })
          .where(eq(comments.id, commentId));
        
        // Commit transaction
        db.$client.exec('COMMIT');
        return true;
      } catch (error) {
        // Rollback on error
        db.$client.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error("Error liking comment:", error);
      return false;
    }
  }
  
  async deleteComment(commentId: string): Promise<void> {
    try {
      // Begin transaction
      db.$client.exec('BEGIN TRANSACTION');
      
      try {
        // Delete all likes for this comment
        await db.delete(commentLikes)
          .where(eq(commentLikes.commentId, commentId));
        
        // Delete the comment itself
        await db.delete(comments)
          .where(eq(comments.id, commentId));
        
        // Commit transaction
        db.$client.exec('COMMIT');
      } catch (error) {
        // Rollback on error
        db.$client.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      throw error;
    }
  }
}

export const storage = new SQLiteStorage();