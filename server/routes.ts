import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

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

  const httpServer = createServer(app);
  return httpServer;
}
