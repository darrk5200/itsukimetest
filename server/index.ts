import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Security headers to protect against common web vulnerabilities
app.use((req, res, next) => {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Only apply CSP to HTML responses, not for assets or API calls
  if (req.path.endsWith('.html') || req.path === '/' || req.path === '') {
    res.setHeader('Content-Security-Policy', 
      "default-src 'self' 'unsafe-inline' 'unsafe-eval' *.render.com render.com; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.render.com render.com; " + 
      "style-src 'self' 'unsafe-inline' *.render.com render.com; " + 
      "img-src 'self' data: https: blob: *.render.com render.com; " + 
      "media-src 'self' data: https: blob: *.render.com render.com; " + 
      "connect-src 'self' https: ws: wss: *.render.com render.com;"
    );
  }
  
  // Prevent browser caching for API responses
  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
  
  // Block access to data files and server files directly
  const sensitiveExtensions = ['.db', '.sqlite', '.env'];
  const sensitiveFiles = ['/data/', '/server/data/', 'animes.json', 'itsukime.db'];
  const allowedSourceFilePatterns = ['/src/', '/assets/', '/components/', '/pages/'];
  
  const requestPath = req.path.toLowerCase();
  
  // Check for allowed source files needed by the application
  let isAllowedSourceFile = false;
  for (const pattern of allowedSourceFilePatterns) {
    if (requestPath.includes(pattern)) {
      isAllowedSourceFile = true;
      break;
    }
  }
  
  // If it's an allowed source file, let it through
  if (isAllowedSourceFile) {
    return next();
  }
  
  // Check for sensitive extensions
  for (const ext of sensitiveExtensions) {
    if (requestPath.endsWith(ext) && !requestPath.startsWith('/api/')) {
      console.warn(`[Security] Blocked direct access to ${req.path}`);
      return res.status(403).json({ error: 'Access Denied' });
    }
  }
  
  // Check for sensitive files/paths
  for (const file of sensitiveFiles) {
    if (requestPath.includes(file) && !requestPath.startsWith('/api/')) {
      console.warn(`[Security] Blocked access to sensitive file: ${req.path}`);
      return res.status(403).json({ error: 'Access Denied' });
    }
  }
  
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
