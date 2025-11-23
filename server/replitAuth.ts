// Replit Auth integration - from blueprint:javascript_log_in_with_replit
import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { sendWelcomeEmail } from "./emailService";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  // Generate username from email if available, or use sub as fallback
  const email = claims["email"];
  let username = claims["sub"]; // fallback to user ID
  
  if (email && typeof email === 'string') {
    // Extract username part from email and sanitize it
    username = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
  }
  
  const userId = claims["sub"];
  
  // Check if user already exists (to determine if this is a new user)
  const existingUser = await storage.getUser(userId);
  const isNewUser = !existingUser;
  
  // Create or update user
  await storage.upsertUser({
    id: userId,
    username: username,
    password: "oauth_user", // Placeholder password for OAuth users
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
  
  // Create or update user profile
  const existingProfile = await storage.getUserProfile(userId);
  if (!existingProfile) {
    await storage.upsertUserProfile(userId, {
      bio: '',
      location: '',
      phone: '',
      dateOfBirth: null,
      notificationPreferences: {
        email: true,
        push: true,
        sms: false
      }
    });
  }

  // Send welcome email for new users (don't wait for it)
  if (isNewUser && email) {
    sendWelcomeEmail(email, claims["first_name"] || 'there').then(result => {
      if (result.success) {
        console.log('[Replit Auth] Welcome email sent to:', email);
      } else {
        console.error('[Replit Auth] Failed to send welcome email:', result.error);
      }
    }).catch(error => {
      console.error('[Replit Auth] Welcome email error:', error);
    });
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Helper to get the correct domain strategy name
  const getDomainStrategy = (hostname: string) => {
    const domains = process.env.REPLIT_DOMAINS!.split(",");
    // First try to find exact match
    const exactMatch = domains.find(d => d === hostname);
    if (exactMatch) return `replitauth:${exactMatch}`;
    
    // If no exact match, use the first domain (default)
    return `replitauth:${domains[0]}`;
  };

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(getDomainStrategy(req.hostname), {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(getDomainStrategy(req.hostname), {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  // Handle logout for Replit auth (GET request from Replit)
  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });

  // Handle logout for all providers (POST request from frontend)
  app.post("/api/logout", (req, res) => {
    req.logout(() => {
      res.json({ message: 'Logged out successfully' });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};