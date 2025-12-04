import dotenv from "dotenv";
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupMultiProviderAuth } from "./multiProviderAuth";
import { initializeLLMProviders } from "./services/llmProviders";
import { handleStripeWebhook } from "./stripeWebhook";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync } from "./stripeClient";
import { startReminderProcessor } from "./services/reminderProcessor";
import { storage } from "./storage";

// Validate critical environment variables
function validateEnvironment() {
  const warnings: string[] = [];
  const errors: string[] = [];

  // OAuth providers - warn if not configured
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    warnings.push('⚠️  Google OAuth not configured (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)');
  }
  
  if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
    warnings.push('⚠️  Facebook OAuth not configured (FACEBOOK_APP_ID, FACEBOOK_APP_SECRET)');
  }

  if (!process.env.REPLIT_DOMAINS || !process.env.REPL_ID) {
    warnings.push('⚠️  Replit Auth not configured (REPLIT_DOMAINS, REPL_ID)');
  }

  // Database - critical error if missing
  if (!process.env.DATABASE_URL) {
    errors.push('❌ DATABASE_URL is required but not set');
  }

  // Log warnings
  if (warnings.length > 0) {
    console.log('\n🔐 Authentication Configuration:');
    warnings.forEach(w => console.log(w));
    console.log('   Some OAuth providers may not work. Configure secrets to enable them.\n');
  }

  // Throw errors
  if (errors.length > 0) {
    console.error('\n❌ Critical Configuration Errors:');
    errors.forEach(e => console.error(e));
    throw new Error('Missing required environment variables');
  }
}

// Validate environment before starting
validateEnvironment();

// Initialize LLM providers (OpenAI, Claude, DeepSeek) before starting server
initializeLLMProviders();

// Import seed function
import { seedSampleGroups } from './seedSampleGroups';

const app = express();

// Disable ETags globally to prevent 304 Not Modified responses
app.set('etag', false);

// ⚠️ CRITICAL: Stripe webhook MUST be registered BEFORE express.json()
// Stripe signature verification requires the RAW request body as a Buffer
// express.json() would parse it into an object, breaking verification
app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Serve static files from attached_assets directory
app.use('/attached_assets', express.static('attached_assets'));

// Cache control headers for production deployment (fixes browser caching after updates)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    // Force no-cache for HTML files and root to bust cache after deployments
    if (req.path.endsWith('.html') || req.path === '/' || req.path === '') {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    }
    // Long cache for versioned assets (Vite adds content hash)
    else if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
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
  // Initialize Stripe schema and sync data on startup
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl) {
      console.log('[STRIPE] Initializing schema...');
      await runMigrations({ 
        databaseUrl,
        schema: 'stripe'
      });
      console.log('[STRIPE] Schema ready');

      // Get StripeSync instance
      const stripeSync = await getStripeSync();

      // Start syncing data in background
      stripeSync.syncBackfill()
        .then(() => {
          console.log('[STRIPE] Data synced');
        })
        .catch((err) => {
          console.error('[STRIPE] Error syncing data:', err);
        });
    }
  } catch (error: any) {
    console.warn('[STRIPE] Failed to initialize Stripe:', error.message);
    // Don't throw - Stripe is optional
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Cache control middleware for production deployments
  // This ensures users always get fresh HTML while caching hashed assets
  if (app.get("env") !== "development") {
    app.use((req, res, next) => {
      // Hashed assets in /assets/ can be cached forever (immutable)
      if (req.path.startsWith('/assets/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      // HTML and root paths should never be cached
      else if (req.path === '/' || req.path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      next();
    });
  }

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // For GCP Cloud Run, this is typically 8080. For local dev, default to 5000.
  // this serves both the API and the client.
  const port = parseInt(process.env.PORT || (process.env.NODE_ENV === 'production' ? '8080' : '5000'), 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);
    
    // Seed sample groups for demo user on startup
    try {
      await seedSampleGroups();
    } catch (error) {
      console.error('[SEED] Failed to seed sample groups:', error);
    }
    
    // Start the reminder processor for plan notifications
    try {
      startReminderProcessor(storage);
      console.log('[REMINDER] Reminder processor started');
    } catch (error) {
      console.error('[REMINDER] Failed to start reminder processor:', error);
    }
  });
})();
