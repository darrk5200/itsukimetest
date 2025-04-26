import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage, SORT_BY_RECENT, SORT_BY_LIKES } from "./storage-sqlite";
import { insertCommentSchema, type InsertComment } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize storage with anime data
  await storage.initialize();
  
  // Get all animes
  app.get('/api/animes', async (req, res) => {
    try {
      const animes = await storage.getAllAnimes();
      res.json(animes);
    } catch (error) {
      console.error('Error fetching animes:', error);
      res.status(500).json({ message: 'Failed to fetch animes' });
    }
  });
  
  // Get anime by ID
  app.get('/api/animes/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid anime ID' });
      }
      
      const anime = await storage.getAnimeById(id);
      if (!anime) {
        return res.status(404).json({ message: 'Anime not found' });
      }
      
      res.json(anime);
    } catch (error) {
      console.error('Error fetching anime by ID:', error);
      res.status(500).json({ message: 'Failed to fetch anime' });
    }
  });
  
  // Search animes
  app.get('/api/animes/search', async (req, res) => {
    try {
      const query = req.query.q as string || '';
      const animes = await storage.searchAnimes(query);
      res.json(animes);
    } catch (error) {
      console.error('Error searching animes:', error);
      res.status(500).json({ message: 'Failed to search animes' });
    }
  });

  // Get comments for an episode with pagination and sorting
  app.get('/api/comments/:animeId/:episodeId', async (req, res) => {
    try {
      const animeId = parseInt(req.params.animeId);
      const episodeId = parseInt(req.params.episodeId);
      
      if (isNaN(animeId) || isNaN(episodeId)) {
        return res.status(400).json({ message: 'Invalid anime or episode ID' });
      }
      
      // Parse query parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const sortOrder = req.query.sort as string || 'recent';
      
      // Get total count for pagination info
      const totalCount = await storage.getTotalCommentsCount(animeId, episodeId);
      
      // Get comments for current page
      const comments = await storage.getCommentsByEpisode(
        animeId, 
        episodeId, 
        page, 
        limit, 
        sortOrder === 'likes' ? SORT_BY_LIKES : SORT_BY_RECENT
      );
      
      res.json({
        comments,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasMore: page * limit < totalCount
        }
      });
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ message: 'Failed to fetch comments' });
    }
  });
  
  // Add a new comment
  app.post('/api/comments', async (req, res) => {
    try {
      // Validate the input
      const result = insertCommentSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: 'Invalid comment data',
          errors: result.error.errors 
        });
      }
      
      // Add the comment to the database
      const comment = await storage.addComment(result.data);
      res.status(201).json(comment);
    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({ message: 'Failed to add comment' });
    }
  });
  
  // Like a comment
  app.post('/api/comments/:id/like', async (req, res) => {
    try {
      const commentId = req.params.id;
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ 
          message: 'A userId is required',
          liked: false
        });
      }
      
      // Use the provided username as the user identifier
      const userIdentifier = userId;
      
      // Check if user already liked this comment
      const alreadyLiked = await storage.hasUserLikedComment(commentId, userIdentifier);
      
      if (alreadyLiked) {
        return res.status(400).json({ 
          message: 'You have already liked this comment',
          liked: false
        });
      }
      
      // Like the comment
      const success = await storage.likeComment(commentId, userIdentifier);
      
      if (success) {
        res.status(200).json({ message: 'Comment liked successfully', liked: true });
      } else {
        res.status(400).json({ message: 'Already liked or comment not found', liked: false });
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      res.status(500).json({ message: 'Failed to like comment', liked: false });
    }
  });
  
  // Check if user has liked a comment
  app.get('/api/comments/:id/like', async (req, res) => {
    try {
      const commentId = req.params.id;
      const userId = req.query.userId as string;
      
      if (!userId) {
        return res.status(400).json({ 
          message: 'A userId parameter is required',
          hasLiked: false
        });
      }
      
      // Generate a user identifier based on username
      const userIdentifier = userId;
      
      const hasLiked = await storage.hasUserLikedComment(commentId, userIdentifier);
      
      res.json({ hasLiked });
    } catch (error) {
      console.error('Error checking like status:', error);
      res.status(500).json({ message: 'Failed to check like status' });
    }
  });
  
  // Delete a comment
  app.delete('/api/comments/:id', async (req, res) => {
    try {
      const commentId = req.params.id;
      await storage.deleteComment(commentId);
      res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (error) {
      console.error('Error deleting comment:', error);
      res.status(500).json({ message: 'Failed to delete comment' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
