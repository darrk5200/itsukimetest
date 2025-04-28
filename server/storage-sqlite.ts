import { animes, comments, commentLikes, weeklyViews, type Anime, type InsertAnime, type Episode, type Comment, type InsertComment, type CommentLike, type InsertCommentLike, type WeeklyView, type InsertWeeklyView } from "@shared/schema";
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
  
  getCommentById(commentId: string): Promise<Comment | null>;
  getTotalCommentsCount(animeId: number, episodeId: number): Promise<number>;
  addComment(comment: InsertComment): Promise<Comment>;
  likeComment(commentId: string, userId: string): Promise<boolean>; // returns true if liked, false if already liked
  unlikeComment(commentId: string, userId: string): Promise<boolean>; // returns true if unliked, false if not liked
  hasUserLikedComment(commentId: string, userId: string): Promise<boolean>;
  deleteComment(commentId: string): Promise<void>;
  
  // User comments operations
  getCommentsByUser(userName: string): Promise<Comment[]>;
  
  // Comment reply operations
  addReply(reply: InsertComment & { parentId: string }): Promise<Comment>;
  getRepliesForComment(commentId: string): Promise<Comment[]>;
  
  // View tracking operations
  incrementAnimeViews(animeId: number): Promise<number>; // Returns the new view count
  getWeeklyPopular(limit?: number): Promise<Anime[]>; // Get most popular animes of the week
  resetWeeklyViews(): Promise<void>; // Reset weekly view counters (run on Sundays)
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
          likes INTEGER DEFAULT 0 NOT NULL,
          parent_id TEXT DEFAULT NULL,
          is_reply INTEGER DEFAULT 0 NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS comment_likes (
          id TEXT PRIMARY KEY,
          comment_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          UNIQUE(comment_id, user_id)
        );
        
        CREATE TABLE IF NOT EXISTS animes (
          id INTEGER PRIMARY KEY,
          anime_name TEXT NOT NULL,
          coverpage TEXT NOT NULL,
          episode_count INTEGER NOT NULL,
          released_episodes INTEGER NOT NULL,
          release_date TEXT NOT NULL,
          genres TEXT NOT NULL,
          description TEXT NOT NULL,
          last_episode_timestamp TEXT,
          episodes TEXT NOT NULL,
          view_count INTEGER NOT NULL DEFAULT 0
        );
        
        CREATE TABLE IF NOT EXISTS weekly_views (
          id TEXT PRIMARY KEY,
          anime_id INTEGER NOT NULL,
          view_count INTEGER NOT NULL DEFAULT 0,
          week_start_date TEXT NOT NULL,
          last_updated TEXT NOT NULL
        );
      `);
      
      // Check if parent_id and is_reply columns exist, add them if they don't
      try {
        // Check if parent_id column exists
        const parentIdCheck = db.$client.prepare("PRAGMA table_info(comments)").all()
          .some((col: any) => col.name === 'parent_id');
          
        if (!parentIdCheck) {
          // Add parent_id column if it doesn't exist
          db.$client.exec(`ALTER TABLE comments ADD COLUMN parent_id TEXT DEFAULT NULL`);
          console.log("Added parent_id column to comments table");
        }
        
        // Check if is_reply column exists
        const isReplyCheck = db.$client.prepare("PRAGMA table_info(comments)").all()
          .some((col: any) => col.name === 'is_reply');
          
        if (!isReplyCheck) {
          // Add is_reply column if it doesn't exist
          db.$client.exec(`ALTER TABLE comments ADD COLUMN is_reply INTEGER DEFAULT 0 NOT NULL`);
          console.log("Added is_reply column to comments table");
        }
        
        // Check if view_count column exists in animes table
        const viewCountCheck = db.$client.prepare("PRAGMA table_info(animes)").all()
          .some((col: any) => col.name === 'view_count');
          
        if (!viewCountCheck) {
          // Add view_count column if it doesn't exist
          db.$client.exec(`ALTER TABLE animes ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0`);
          console.log("Added view_count column to animes table");
        }
      } catch (error) {
        console.log("Error checking or adding columns:", error);
      }
      
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
    const anime = this.animes.get(id);
    if (!anime) return undefined;
    
    try {
      // Get the current week's start date
      const weekStartDate = this.getCurrentWeekStartDate();
      
      // Get weekly views for this anime
      const weeklyViewData = db.$client.prepare(`
        SELECT view_count FROM weekly_views 
        WHERE anime_id = ? AND week_start_date = ?
        LIMIT 1
      `).get(id, weekStartDate) as any;
      
      // Return anime with weeklyViews property
      return {
        ...anime,
        weeklyViews: weeklyViewData?.view_count || 0
      };
    } catch (error) {
      console.error("Error getting weekly views for anime:", error);
      return anime;
    }
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
      // We need to fetch top-level comments (those that aren't replies)
      const offset = (page - 1) * limit;
      
      // Get top-level comments using raw SQL
      let topLevelCommentsQuery = `
        SELECT * FROM comments 
        WHERE anime_id = ? AND episode_id = ? AND is_reply = 0
      `;
      
      // Add sorting
      if (sortOrder === SORT_BY_LIKES) {
        topLevelCommentsQuery += ` ORDER BY likes DESC, created_at DESC`;
      } else {
        topLevelCommentsQuery += ` ORDER BY created_at DESC`;
      }
      
      // Add pagination
      topLevelCommentsQuery += ` LIMIT ? OFFSET ?`;
      
      // Execute the query with parameters
      const topLevelComments = db.$client.prepare(topLevelCommentsQuery)
        .all(animeId, episodeId, limit, offset) as any[];
      
      // If there are no comments, return empty array
      if (topLevelComments.length === 0) {
        return [];
      }
      
      // Get all comment IDs
      const commentIds = topLevelComments.map((comment: any) => comment.id);
      
      // Fetch all replies for these comments using raw SQL to avoid column name issues
      const repliesQuery = `
        SELECT * FROM comments 
        WHERE anime_id = ? AND episode_id = ? AND is_reply = 1 AND parent_id IN (${commentIds.map(() => '?').join(',')})
        ORDER BY created_at
      `;
      
      // Execute the query with parameters
      const params = [animeId, episodeId, ...commentIds];
      const replies = db.$client.prepare(repliesQuery).all(params) as any[];
      
      // Group replies by parent ID
      const repliesByParentId = new Map<string, Comment[]>();
      for (const reply of replies) {
        // Convert SQLite column names to camelCase for consistency
        const processedReply = {
          id: reply.id,
          animeId: reply.anime_id,
          episodeId: reply.episode_id,
          userName: reply.user_name,
          userAvatar: reply.user_avatar,
          text: reply.comment_text,
          timestamp: reply.created_at,
          likes: reply.likes,
          parentId: reply.parent_id,
          isReply: reply.is_reply === 1
        };
        
        if (!repliesByParentId.has(processedReply.parentId)) {
          repliesByParentId.set(processedReply.parentId, []);
        }
        repliesByParentId.get(processedReply.parentId)!.push(processedReply as unknown as Comment);
      }
      
      // Process top-level comments to have consistent field names
      const processedTopLevelComments = topLevelComments.map((comment: any) => {
        return {
          id: comment.id,
          animeId: comment.anime_id,
          episodeId: comment.episode_id,
          userName: comment.user_name,
          userAvatar: comment.user_avatar,
          text: comment.comment_text,
          timestamp: comment.created_at,
          likes: comment.likes,
          parentId: comment.parent_id,
          isReply: comment.is_reply === 1,
          replies: [] as Comment[]
        };
      });
      
      // Add replies to their parent comments
      const commentsWithReplies = processedTopLevelComments.map(comment => {
        const result = { ...comment };
        
        if (repliesByParentId.has(comment.id)) {
          result.replies = repliesByParentId.get(comment.id)!;
        }
        
        return result as unknown as Comment;
      });
      
      return commentsWithReplies;
    } catch (error) {
      console.error("Error fetching comments:", error);
      return [];
    }
  }
  
  async getCommentById(commentId: string): Promise<Comment | null> {
    try {
      // Use parameterized queries to prevent SQL injection
      const query = `
        SELECT * FROM comments 
        WHERE id = ?
        LIMIT 1
      `;
      
      const result = db.$client.prepare(query).get(commentId) as any;
      
      if (!result) {
        return null;
      }
      
      // Convert from database schema to Comment type with correct field names
      const processedComment = {
        id: result.id,
        animeId: result.anime_id,
        episodeId: result.episode_id,
        userName: result.user_name,
        userAvatar: result.user_avatar,
        text: result.comment_text,
        timestamp: result.created_at,
        likes: result.likes,
        parentId: result.parent_id,
        isReply: result.is_reply
      };
      
      // Cast to any first to bypass type checking, then to Comment
      return processedComment as any as Comment;
    } catch (error) {
      console.error("Error fetching comment by ID:", error);
      return null;
    }
  }
  
  async getTotalCommentsCount(animeId: number, episodeId: number): Promise<number> {
    try {
      // Only count top-level comments for pagination
      const result = await db.select({ count: sql`count(*)` }).from(comments)
        .where(and(
          eq(comments.animeId, animeId),
          eq(comments.episodeId, episodeId),
          eq(comments.isReply, 0) // Only count top-level comments, not replies
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
  
  async unlikeComment(commentId: string, userId: string): Promise<boolean> {
    try {
      // Check if user has liked this comment
      const hasLiked = await this.hasUserLikedComment(commentId, userId);
      
      if (!hasLiked) {
        return false; // User hasn't liked this comment
      }
      
      // Begin transaction
      db.$client.exec('BEGIN TRANSACTION');
      
      try {
        // Remove from likes table
        await db.delete(commentLikes)
          .where(and(
            eq(commentLikes.commentId, commentId),
            eq(commentLikes.userId, userId)
          ));
        
        // Decrement likes count in comment
        await db.update(comments)
          .set({ 
            likes: sql`CASE WHEN likes > 0 THEN likes - 1 ELSE 0 END` 
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
      console.error("Error unliking comment:", error);
      return false;
    }
  }
  
  async getCommentsByUser(userName: string): Promise<Comment[]> {
    try {
      // Use parameterized query to get all comments by this user
      const query = `
        SELECT * FROM comments 
        WHERE user_name = ?
        ORDER BY created_at DESC
      `;
      
      const userComments = db.$client.prepare(query).all(userName) as any[];
      
      if (!userComments || userComments.length === 0) {
        return [];
      }
      
      // Convert from database schema to Comment type with correct field names
      const processedComments = userComments.map((comment: any) => {
        return {
          id: comment.id,
          animeId: comment.anime_id,
          episodeId: comment.episode_id,
          userName: comment.user_name,
          userAvatar: comment.user_avatar,
          text: comment.comment_text,
          createdAt: comment.created_at, // Keep created_at for timestamp
          timestamp: comment.created_at, // Also provide timestamp for consistency
          likes: comment.likes,
          parentId: comment.parent_id,
          isReply: comment.is_reply === 1
        } as any as Comment;
      });
      
      return processedComments;
    } catch (error) {
      console.error("Error fetching comments by user:", error);
      return [];
    }
  }
  
  async deleteComment(commentId: string): Promise<void> {
    try {
      // Begin transaction
      db.$client.exec('BEGIN TRANSACTION');
      
      try {
        // Delete replies first (if any)
        const replies = await db.select().from(comments)
          .where(eq(comments.parentId, commentId));
          
        // Delete likes for any replies
        for (const reply of replies) {
          await db.delete(commentLikes)
            .where(eq(commentLikes.commentId, reply.id));
        }
        
        // Delete the replies themselves
        await db.delete(comments)
          .where(eq(comments.parentId, commentId));
        
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
  
  // Comment reply operations
  async addReply(reply: InsertComment & { parentId: string }): Promise<Comment> {
    try {
      // Generate ID and timestamp
      const id = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      
      // Set is_reply to true (1 in SQLite) and add the parent_id
      const replyData = {
        ...reply,
        id,
        timestamp,
        likes: 0,
        isReply: 1, // This indicates it's a reply
        parentId: reply.parentId,
      };
      
      // Insert the reply
      await db.insert(comments).values(replyData);
      
      return replyData as unknown as Comment;
    } catch (error) {
      console.error("Error adding reply:", error);
      throw error;
    }
  }
  
  async getRepliesForComment(commentId: string): Promise<Comment[]> {
    try {
      const replies = await db.select().from(comments)
        .where(eq(comments.parentId, commentId))
        .orderBy(comments.timestamp);
        
      return replies as unknown as Comment[];
    } catch (error) {
      console.error("Error fetching replies for comment:", error);
      return [];
    }
  }
  
  // Helper method to get current week's start date (Sunday)
  private getCurrentWeekStartDate(): string {
    const now = new Date();
    const day = now.getDay(); // 0 is Sunday
    const diff = now.getDate() - day;
    
    // Set to previous Sunday (or today if it's Sunday)
    const sunday = new Date(now);
    sunday.setDate(diff);
    sunday.setHours(0, 0, 0, 0);
    
    return sunday.toISOString();
  }
  
  // View tracking operations
  async incrementAnimeViews(animeId: number): Promise<number> {
    try {
      // Start transaction for atomicity
      db.$client.exec('BEGIN TRANSACTION');
      
      try {
        // 1. Update total view count in animes table
        db.$client.prepare('UPDATE animes SET view_count = view_count + 1 WHERE id = ?').run(animeId);
        
        // 2. Get or create weekly view record
        const weekStartDate = this.getCurrentWeekStartDate();
        
        // Check if there's already a weekly view record for this anime and week
        const existingWeeklyView = db.$client.prepare(`
          SELECT * FROM weekly_views 
          WHERE anime_id = ? AND week_start_date = ?
          LIMIT 1
        `).get(animeId, weekStartDate) as any;
        
        if (existingWeeklyView) {
          // Update existing record
          db.$client.prepare(`
            UPDATE weekly_views 
            SET view_count = view_count + 1, last_updated = ? 
            WHERE anime_id = ? AND week_start_date = ?
          `).run(new Date().toISOString(), animeId, weekStartDate);
        } else {
          // Create new weekly view record
          db.$client.prepare(`
            INSERT INTO weekly_views (id, anime_id, view_count, week_start_date, last_updated)
            VALUES (?, ?, ?, ?, ?)
          `).run(crypto.randomUUID(), animeId, 1, weekStartDate, new Date().toISOString());
        }
        
        // 3. Get the current view counts to return
        const animeResult = db.$client.prepare('SELECT view_count FROM animes WHERE id = ?')
          .get(animeId) as any;
          
        // Get weekly view count
        const weeklyResult = db.$client.prepare(`
          SELECT view_count FROM weekly_views 
          WHERE anime_id = ? AND week_start_date = ?
        `).get(animeId, weekStartDate) as any;
        
        // Commit transaction
        db.$client.exec('COMMIT');
        
        // Update in-memory cache
        const cachedAnime = this.animes.get(animeId);
        if (cachedAnime) {
          this.animes.set(animeId, {
            ...cachedAnime,
            viewCount: animeResult?.view_count || 0
          });
        }
        
        // Return regular view count (for backward compatibility)
        return animeResult?.view_count || 0;
      } catch (error) {
        // Rollback on error
        db.$client.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error("Error incrementing anime views:", error);
      return 0;
    }
  }
  
  async getWeeklyPopular(limit: number = 10): Promise<Anime[]> {
    try {
      // Get the current week's start date
      const weekStartDate = this.getCurrentWeekStartDate();
      
      // Get the top animes by weekly views
      const topAnimeViews = db.$client.prepare(`
        SELECT anime_id, view_count 
        FROM weekly_views 
        WHERE week_start_date = ? 
        ORDER BY view_count DESC 
        LIMIT ?
      `).all(weekStartDate, limit) as any[];
      
      if (topAnimeViews.length === 0) {
        // If no weekly data, get top overall viewed animes
        const allAnimes = Array.from(this.animes.values());
        return [...allAnimes]
          .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
          .slice(0, limit);
      }
      
      // Map anime IDs to actual anime objects with their weekly view counts
      const result: Anime[] = [];
      for (const { anime_id, view_count } of topAnimeViews) {
        const anime = this.animes.get(anime_id);
        if (anime) {
          result.push({
            ...anime,
            weeklyViews: view_count || 0
          });
        }
      }
      
      return result;
    } catch (error) {
      console.error("Error getting weekly popular animes:", error);
      return [];
    }
  }
  
  async resetWeeklyViews(): Promise<void> {
    try {
      // Get the new week's start date
      const newWeekStartDate = this.getCurrentWeekStartDate();
      
      // Start transaction
      db.$client.exec('BEGIN TRANSACTION');
      
      try {
        // Delete all weekly view records except for the current week
        db.$client.prepare(`
          DELETE FROM weekly_views 
          WHERE week_start_date != ?
        `).run(newWeekStartDate);
        
        // Commit transaction
        db.$client.exec('COMMIT');
        
        console.log(`Weekly views reset. New week starting: ${newWeekStartDate}`);
      } catch (error) {
        // Rollback on error
        db.$client.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error("Error resetting weekly views:", error);
    }
  }
}

export const storage = new SQLiteStorage();