import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, SORT_BY_RECENT, SORT_BY_LIKES } from "./storage-sqlite";
import { insertCommentSchema, type InsertComment } from "@shared/schema";
import crypto from "crypto";

// Secret key for video token generation
const VIDEO_SECRET_KEY = process.env.VIDEO_SECRET_KEY || "itsuki-anime-secure-key-2025";

// Function to generate a secure video token
function generateVideoToken(animeId: number, episodeId: number, expiresIn = 2700): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const expiresAt = timestamp + expiresIn;
  
  // Create payload with anime/episode IDs and expiration
  const payload = {
    animeId,
    episodeId,
    exp: expiresAt,
    iat: timestamp,
    jti: crypto.randomUUID().substring(0, 8)
  };
  
  // Generate HMAC signature
  const payloadStr = JSON.stringify(payload);
  const hmac = crypto.createHmac("sha256", VIDEO_SECRET_KEY);
  const signature = hmac.update(payloadStr).digest("hex");
  
  // Return base64 encoded token
  const token = Buffer.from(JSON.stringify({
    payload,
    signature
  })).toString("base64");
  
  console.log(`[Security] Generated video token for anime ${animeId}, episode ${episodeId}, expires in ${expiresIn}s`);
  return token;
}

// Function to verify video token
function verifyVideoToken(token: string): { isValid: boolean; animeId?: number; episodeId?: number } {
  try {
    // Decode token
    const decoded = JSON.parse(Buffer.from(token, "base64").toString());
    const { payload, signature } = decoded;
    
    // Verify signature
    const hmac = crypto.createHmac("sha256", VIDEO_SECRET_KEY);
    const expectedSignature = hmac.update(JSON.stringify(payload)).digest("hex");
    
    if (signature !== expectedSignature) {
      console.warn("[Security] Token signature verification failed");
      return { isValid: false };
    }
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      console.warn(`[Security] Token expired - Expired at: ${new Date(payload.exp * 1000).toISOString()}`);
      return { isValid: false };
    }
    
    // Token is valid
    console.log(`[Security] Successfully verified token for anime ${payload.animeId}, episode ${payload.episodeId}`);
    
    return { 
      isValid: true, 
      animeId: payload.animeId, 
      episodeId: payload.episodeId 
    };
  } catch (error) {
    console.error("[Security] Video token verification error:", error);
    return { isValid: false };
  }
}

// Middleware to validate video access
function validateVideoAccess(req: Request, res: Response, next: NextFunction) {
  const { token } = req.query;
  
  // If no token in video request, deny access
  if (!token || typeof token !== 'string') {
    console.warn("[Security] Blocked unauthorized video access attempt");
    return res.status(403).json({ error: 'Access Denied - Invalid Token' });
  }
  
  // Verify token
  const verification = verifyVideoToken(token);
  if (!verification.isValid) {
    console.warn("[Security] Invalid or expired video token");
    return res.status(403).json({ error: 'Access Denied - Invalid Token' });
  }
  
  // Token is valid, proceed
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize storage with anime data
  await storage.initialize();
  
  // Protect video file access - any URL with .mp4 must have a valid token
  app.use((req, res, next) => {
    const requestPath = req.path.toLowerCase();
    
    // Check if this is a video file request
    if (requestPath.endsWith('.mp4') || requestPath.endsWith('.webm') || requestPath.endsWith('.m3u8')) {
      return validateVideoAccess(req, res, next);
    }
    
    // Not a video file, continue to next middleware
    next();
  });

  // Security middleware to block access to sensitive server files
  app.use((req, res, next) => {
    const blockedPaths = [
      '/server/data',
      '/server/data/animes.json',
      '/data/animes.json',
      '/data/itsukime.db',
      '/server/db.ts',
      '/server/storage.ts',
      '/server/storage-sqlite.ts',
      '/.env',
      '/server/.env'
    ];
    
    // Check if the requested path contains any of the blocked paths
    const requestPath = req.path.toLowerCase();
    
    for (const blockedPath of blockedPaths) {
      if (requestPath.includes(blockedPath.toLowerCase())) {
        console.warn(`Security: Blocked access attempt to ${req.path}`);
        return res.status(403).json({
          error: 'Access Denied',
          message: 'You do not have permission to access this resource'
        });
      }
    }
    
    // Check for suspicious query parameters
    const queryString = JSON.stringify(req.query).toLowerCase();
    const suspiciousParams = ['../', '..\\', 'file:', 'file://', 'data:', 'base64'];
    
    for (const param of suspiciousParams) {
      if (queryString.includes(param)) {
        console.warn(`Security: Blocked suspicious query parameters: ${queryString}`);
        return res.status(403).json({
          error: 'Access Denied',
          message: 'Invalid request parameters'
        });
      }
    }
    
    next();
  });
  
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
  
  // Increment view count for an anime
  app.post('/api/animes/:id/view', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid anime ID' });
      }
      
      // Check if anime exists
      const anime = await storage.getAnimeById(id);
      if (!anime) {
        return res.status(404).json({ message: 'Anime not found' });
      }
      
      // Increment view count and get new count
      const newViewCount = await storage.incrementAnimeViews(id);
      
      // Get the updated anime with weekly view count
      const updatedAnime = await storage.getAnimeById(id);
      
      res.json({ 
        id, 
        viewCount: newViewCount,
        weeklyViews: updatedAnime?.weeklyViews || 0 
      });
    } catch (error) {
      console.error('Error incrementing view count:', error);
      res.status(500).json({ message: 'Failed to increment view count' });
    }
  });
  
  // Get weekly popular animes
  app.get('/api/animes/weekly/popular', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const weeklyPopular = await storage.getWeeklyPopular(limit);
      
      res.json(weeklyPopular);
    } catch (error) {
      console.error('Error fetching weekly popular animes:', error);
      res.status(500).json({ message: 'Failed to fetch weekly popular animes' });
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
  
  // Generate a secure video access token
  app.post('/api/video/token', async (req, res) => {
    try {
      const { animeId, episodeId } = req.body;
      
      // Validate inputs
      if (!animeId || !episodeId) {
        return res.status(400).json({ 
          message: 'animeId and episodeId are required',
          success: false
        });
      }
      
      const numAnimeId = parseInt(animeId);
      const numEpisodeId = parseInt(episodeId);
      
      if (isNaN(numAnimeId) || isNaN(numEpisodeId)) {
        return res.status(400).json({
          message: 'Invalid animeId or episodeId',
          success: false
        });
      }
      
      // Verify anime and episode exist
      const anime = await storage.getAnimeById(numAnimeId);
      if (!anime) {
        return res.status(404).json({
          message: 'Anime not found',
          success: false
        });
      }
      
      const episode = anime.episodes.find(ep => ep.id === numEpisodeId);
      if (!episode) {
        return res.status(404).json({
          message: 'Episode not found',
          success: false
        });
      }
      
      // Generate token with 45 minutes expiration (2700 seconds)
      const token = generateVideoToken(numAnimeId, numEpisodeId, 2700);
      
      res.json({
        token,
        animeId: numAnimeId,
        episodeId: numEpisodeId,
        success: true,
        expiresIn: 2700
      });
    } catch (error) {
      console.error('Error generating video token:', error);
      res.status(500).json({
        message: 'Failed to generate video token',
        success: false
      });
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

  // Get all comments made by a specific user
  app.get('/api/user/:userName/comments', async (req, res) => {
    try {
      const userName = req.params.userName;
      
      if (!userName) {
        return res.status(400).json({ message: 'Username is required' });
      }
      
      // Get all animes to be able to include anime names in the response
      const animes = await storage.getAllAnimes();
      const animeMap = new Map(animes.map(anime => [anime.id, anime]));
      
      // Get all comments by this user
      const allComments = await storage.getCommentsByUser(userName);
      
      // Enhance comments with anime information
      const enhancedComments = allComments.map(comment => {
        const anime = animeMap.get(comment.animeId);
        const episodeIndex = anime?.episodes.findIndex(ep => ep.id === comment.episodeId) || 0;
        const episode = anime?.episodes[episodeIndex];
        
        return {
          id: comment.id,
          animeId: comment.animeId,
          episodeId: comment.episodeId,
          animeName: anime?.anime_name || 'Unknown Anime',
          episodeNumber: episode?.episode_number || 0,
          text: comment.text,
          timestamp: comment.timestamp, // Using timestamp instead of createdAt
          likes: comment.likes
        };
      });
      
      res.json(enhancedComments);
    } catch (error) {
      console.error('Error fetching user comments:', error);
      res.status(500).json({ message: 'Failed to fetch user comments' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
