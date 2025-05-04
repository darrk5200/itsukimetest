import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Anime table
export const animes = sqliteTable("animes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  anime_name: text("anime_name").notNull(),
  coverpage: text("coverpage").notNull(),
  episode_count: integer("episode_count").notNull(),
  releasedEpisodes: integer("released_episodes").notNull(),
  releaseDate: text("release_date").notNull(),
  genres: text("genres", { mode: "json" }).notNull(),
  description: text("description").notNull(),
  lastEpisodeTimestamp: text("last_episode_timestamp"),
  episodes: text("episodes", { mode: "json" }).notNull(),
  artworks: text("artworks", { mode: "json" }),
  viewCount: integer("view_count").notNull().default(0), // Total all-time view count
});

// Comments table for global comments
export const comments = sqliteTable("comments", {
  id: text("id").primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  animeId: integer("anime_id").notNull(),
  episodeId: integer("episode_id").notNull(),
  userName: text("user_name").notNull(),
  userAvatar: text("user_avatar").notNull().default("icon_01"), // Default avatar
  text: text("comment_text").notNull(),
  timestamp: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  likes: integer("likes").notNull().default(0),
  parentId: text("parent_id"), // ID of the parent comment for replies, null for top-level comments
  isReply: integer("is_reply").notNull().default(0), // SQLite boolean: 0 = false, 1 = true
});

// Table to track user likes on comments
export const commentLikes = sqliteTable("comment_likes", {
  id: text("id").primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  commentId: text("comment_id").notNull(),
  userId: text("user_id").notNull(), // This will be a combination of username + device fingerprint
  timestamp: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// Table to track weekly view counts, resets every Sunday
export const weeklyViews = sqliteTable("weekly_views", {
  id: text("id").primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  animeId: integer("anime_id").notNull(),
  viewCount: integer("view_count").notNull().default(0),
  weekStartDate: text("week_start_date").notNull(), // ISO date string for the start of the week (Sunday)
  lastUpdated: text("last_updated").notNull().$defaultFn(() => new Date().toISOString()),
});

export const episodeSchema = z.object({
  id: z.number(),
  episode_number: z.number(),
  title: z.string(),
  video_url: z.string(),
  thumbnail: z.string(),
  duration: z.number(),
});

export const animeSchema = z.object({
  id: z.number(),
  anime_name: z.string(),
  coverpage: z.string(),
  episode_count: z.number(),
  releasedEpisodes: z.number(),
  releaseDate: z.string(),
  genres: z.array(z.string()),
  description: z.string(),
  lastEpisodeTimestamp: z.string().optional(),
  episodes: z.array(episodeSchema),
  artworks: z.array(z.string()).optional(),
  viewCount: z.number().int().nonnegative().default(0),
  weeklyViews: z.number().int().nonnegative().optional(),
});

export const insertAnimeSchema = createInsertSchema(animes).extend({
  episodes: z.array(episodeSchema),
});

// Define base comment schema without replies to avoid circular reference
export const baseCommentSchema = z.object({
  id: z.string().uuid(),
  animeId: z.number().int().positive(),
  episodeId: z.number().int().positive(),
  userName: z.string().min(1).max(16).regex(/^[a-zA-Z0-9]+$/, {
    message: "Username must only contain letters and numbers"
  }),
  userAvatar: z.string().regex(/^icon_0[1-6]$/, {
    message: "Avatar must be one of the predefined options"
  }).default("icon_01"),
  text: z.string().min(1).max(600).transform(str => 
    // Simple HTML sanitization
    str.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  ),
  timestamp: z.date().or(z.string()),
  likes: z.number().int().nonnegative(),
  parentId: z.string().uuid().nullable().optional(),
  isReply: z.boolean().optional().default(false),
});

// Now define the full comment schema with replies
export const commentSchema = baseCommentSchema.extend({
  replies: z.array(baseCommentSchema).optional(),
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  timestamp: true,
  likes: true,
});

export const commentLikeSchema = z.object({
  id: z.string(),
  commentId: z.string(),
  userId: z.string(),
  timestamp: z.date().or(z.string()),
});

export const insertCommentLikeSchema = createInsertSchema(commentLikes).omit({
  id: true,
  timestamp: true,
});

export const weeklyViewSchema = z.object({
  id: z.string(),
  animeId: z.number().int().positive(),
  viewCount: z.number().int().nonnegative(),
  weekStartDate: z.string(),
  lastUpdated: z.string(),
});

export const insertWeeklyViewSchema = createInsertSchema(weeklyViews).omit({
  id: true,
  lastUpdated: true,
});

export type InsertAnime = z.infer<typeof insertAnimeSchema>;
export type Anime = z.infer<typeof animeSchema>;
export type Episode = z.infer<typeof episodeSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type CommentLike = typeof commentLikes.$inferSelect;
export type InsertCommentLike = z.infer<typeof insertCommentLikeSchema>;
export type WeeklyView = typeof weeklyViews.$inferSelect;
export type InsertWeeklyView = z.infer<typeof insertWeeklyViewSchema>;
