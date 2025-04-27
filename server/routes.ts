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
      
      // Validate input
      if (!commentId || !userId) {
        return res.status(400).json({ 
          message: 'Comment ID and user ID are required',
          liked: false,
          success: false
        });
      }
      
      // Validate user ID format
      if (typeof userId !== 'string' || userId.length < 1 || userId.length > 32) {
        return res.status(400).json({
          message: 'Invalid user ID format',
          liked: false,
          success: false
        });
      }
      
      // Check if the comment exists
      const comment = await storage.getCommentById(commentId);
      if (!comment) {
        return res.status(404).json({
          message: 'Comment not found',
          liked: false,
          success: false
        });
      }
      
      // Check if user already liked this comment
      const alreadyLiked = await storage.hasUserLikedComment(commentId, userId);
      
      if (alreadyLiked) {
        return res.status(400).json({ 
          message: 'You have already liked this comment',
          liked: false,
          success: false
        });
      }
      
      // Like the comment
      const success = await storage.likeComment(commentId, userId);
      
      if (success) {
        res.status(200).json({ message: 'Comment liked successfully', liked: true, success: true });
      } else {
        res.status(400).json({ message: 'Failed to like the comment', liked: false, success: false });
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      res.status(500).json({ message: 'Server error while processing the like', liked: false, success: false });
    }
  });
  
  // Unlike a comment
  app.post('/api/comments/:id/unlike', async (req, res) => {
    try {
      const commentId = req.params.id;
      const { userId } = req.body;
      
      // Validate input
      if (!commentId || !userId) {
        return res.status(400).json({ 
          message: 'Comment ID and user ID are required',
          unliked: false,
          success: false
        });
      }
      
      // Validate user ID format
      if (typeof userId !== 'string' || userId.length < 1 || userId.length > 32) {
        return res.status(400).json({
          message: 'Invalid user ID format',
          unliked: false,
          success: false
        });
      }
      
      // Check if the comment exists
      const comment = await storage.getCommentById(commentId);
      if (!comment) {
        return res.status(404).json({
          message: 'Comment not found',
          unliked: false,
          success: false
        });
      }
      
      // Check if user has liked this comment
      const hasLiked = await storage.hasUserLikedComment(commentId, userId);
      
      if (!hasLiked) {
        return res.status(400).json({ 
          message: 'You have not liked this comment',
          unliked: false,
          success: false
        });
      }
      
      // Unlike the comment
      const success = await storage.unlikeComment(commentId, userId);
      
      if (success) {
        res.status(200).json({ 
          message: 'Comment unliked successfully', 
          unliked: true,
          success: true 
        });
      } else {
        res.status(400).json({ 
          message: 'Failed to unlike the comment', 
          unliked: false,
          success: false 
        });
      }
    } catch (error) {
      console.error('Error unliking comment:', error);
      res.status(500).json({ 
        message: 'Server error while processing the unlike', 
        unliked: false,
        success: false 
      });
    }
  });
  
  // Check if user has liked a comment
  app.get('/api/comments/:id/like', async (req, res) => {
    try {
      const commentId = req.params.id;
      const userId = req.query.userId as string;
      
      // Validate input
      if (!commentId || !userId) {
        return res.status(400).json({ 
          message: 'Comment ID and user ID are required',
          hasLiked: false,
          success: false
        });
      }
      
      // Validate user ID format
      if (typeof userId !== 'string' || userId.length < 1 || userId.length > 32) {
        return res.status(400).json({
          message: 'Invalid user ID format',
          hasLiked: false,
          success: false
        });
      }
      
      // Check if the comment exists
      const comment = await storage.getCommentById(commentId);
      if (!comment) {
        return res.status(404).json({
          message: 'Comment not found',
          hasLiked: false,
          success: false
        });
      }
      
      const hasLiked = await storage.hasUserLikedComment(commentId, userId);
      
      res.json({ 
        hasLiked, 
        success: true,
        commentId,
        userId
      });
    } catch (error) {
      console.error('Error checking like status:', error);
      res.status(500).json({ 
        message: 'Failed to check like status',
        hasLiked: false,
        success: false
      });
    }
  });
  
  // Delete a comment
  app.delete('/api/comments/:id', async (req, res) => {
    try {
      const commentId = req.params.id;
      const { userName } = req.body;
      
      if (!commentId || !userName) {
        return res.status(400).json({ message: 'Comment ID and userName are required' });
      }
      
      // Verify the comment exists and belongs to the user
      const comment = await storage.getCommentById(commentId);
      
      if (!comment) {
        return res.status(404).json({ message: 'Comment not found' });
      }
      
      if (comment.userName !== userName) {
        return res.status(403).json({ message: 'You can only delete your own comments' });
      }
      
      await storage.deleteComment(commentId);
      res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (error) {
      console.error('Error deleting comment:', error);
      res.status(500).json({ message: 'Failed to delete comment' });
    }
  });
  
  // Add a reply to a comment
  app.post('/api/comments/:id/reply', async (req, res) => {
    try {
      const parentId = req.params.id;
      
      // Verify that the parent comment exists
      const parentComment = await storage.getCommentById(parentId);
      if (!parentComment) {
        return res.status(404).json({ 
          message: 'Parent comment not found',
          success: false
        });
      }
      
      // Validate the input
      const result = insertCommentSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: 'Invalid comment data',
          errors: result.error.errors,
          success: false
        });
      }
      
      // Limit reply text length
      if (result.data.text.length > 600) {
        return res.status(400).json({
          message: 'Reply text is too long (maximum 600 characters)',
          success: false
        });
      }
      
      try {
        // Add the reply to the database
        const reply = await storage.addReply({
          ...result.data,
          parentId
        });
        
        res.status(201).json({
          reply,
          success: true
        });
      } catch (error) {
        console.error('Error adding reply:', error);
        res.status(500).json({ 
          message: 'Failed to add reply',
          success: false
        });
      }
    } catch (error) {
      console.error('Error adding reply:', error);
      res.status(500).json({ 
        message: 'Failed to add reply',
        success: false
      });
    }
  });
  
  // Get replies for a specific comment
  app.get('/api/comments/:id/replies', async (req, res) => {
    try {
      const commentId = req.params.id;
      const replies = await storage.getRepliesForComment(commentId);
      res.json(replies);
    } catch (error) {
      console.error('Error fetching replies:', error);
      res.status(500).json({ message: 'Failed to fetch replies' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
