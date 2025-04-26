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
});

// Table to track user likes on comments
export const commentLikes = sqliteTable("comment_likes", {
  id: text("id").primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  commentId: text("comment_id").notNull(),
  userId: text("user_id").notNull(), // This will be a combination of username + device fingerprint
  timestamp: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
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
});

export const insertAnimeSchema = createInsertSchema(animes).extend({
  episodes: z.array(episodeSchema),
});

export const commentSchema = z.object({
  id: z.string(),
  animeId: z.number(),
  episodeId: z.number(),
  userName: z.string(),
  userAvatar: z.string().default("icon_01"),
  text: z.string(),
  timestamp: z.date().or(z.string()),
  likes: z.number(),
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

export type InsertAnime = z.infer<typeof insertAnimeSchema>;
export type Anime = typeof animes.$inferSelect;
export type Episode = z.infer<typeof episodeSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type CommentLike = typeof commentLikes.$inferSelect;
export type InsertCommentLike = z.infer<typeof insertCommentLikeSchema>;
