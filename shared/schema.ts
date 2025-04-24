import { pgTable, text, serial, integer, array, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Anime table
export const animes = pgTable("animes", {
  id: serial("id").primaryKey(),
  anime_name: text("anime_name").notNull(),
  coverpage: text("coverpage").notNull(),
  episode_count: integer("episode_count").notNull(),
  genres: array(text("genres")).notNull(),
  description: text("description").notNull(),
  episodes: jsonb("episodes").notNull(),
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
  genres: z.array(z.string()),
  description: z.string(),
  episodes: z.array(episodeSchema),
});

export const insertAnimeSchema = createInsertSchema(animes).extend({
  episodes: z.array(episodeSchema),
});

export type InsertAnime = z.infer<typeof insertAnimeSchema>;
export type Anime = typeof animes.$inferSelect;
export type Episode = z.infer<typeof episodeSchema>;
