import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { type Express } from "express";
import { storage } from "./storage";
import { type AuthIdentity } from "@shared/schema";

// OAuth configuration interfaces
interface GoogleProfile {
  id: string;
  emails?: Array<{ value: string; verified?: boolean }>;
  name?: { givenName?: string; familyName?: string };
  photos?: Array<{ value: string }>;
}

interface FacebookProfile {
  id: string;
  emails?: Array<{ value: string }>;
  name?: { givenName?: string; familyName?: string };
  photos?: Array<{ value: string }>;
}

// Generic OAuth user session format
interface OAuthUser {
  id: string;
  provider: 'google' | 'facebook' | 'replit';
  providerUserId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

// Setup multi-provider OAuth strategies
export async function setupMultiProviderAuth(app: Express) {
  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
      scope: ['profile', 'email']
    },
    async (accessToken, refreshToken, profile: GoogleProfile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const firstName = profile.name?.givenName;
        const lastName = profile.name?.familyName;
        const profileImageUrl = profile.photos?.[0]?.value;

        // Check if this Google account is already linked
        let authIdentity = await storage.getAuthIdentity('google', profile.id);
        
        let user;
        if (authIdentity) {
          // User already exists with this Google account
          user = await storage.getUser(authIdentity.userId);
        } else {
          // New Google account - check if user exists by email
          if (email) {
            user = await storage.getUserByEmail(email);
          }
          
          if (!user) {
            // Create new user
            user = await storage.upsertUser({
              email: email || undefined,
              firstName: firstName || undefined,
              lastName: lastName || undefined,
              profileImageUrl: profileImageUrl || undefined,
            });
          }

          // Link Google account to user
          authIdentity = await storage.createAuthIdentity({
            userId: user.id,
            provider: 'google',
            providerUserId: profile.id,
            email: email || undefined,
          });
        }

        // Store OAuth token for API access
        if (user) {
          await storage.upsertOAuthToken({
            userId: user.id,
            provider: 'google',
            accessToken,
            refreshToken: refreshToken || undefined,
            expiresAt: null, // Google tokens don't have explicit expiry in this format
            scope: 'profile email',
          });

          const oauthUser: OAuthUser = {
            id: user.id,
            provider: 'google',
            providerUserId: profile.id,
            email: user.email || undefined,
            firstName: user.firstName || undefined,
            lastName: user.lastName || undefined,
            profileImageUrl: user.profileImageUrl || undefined,
          };

          return done(null, oauthUser);
        }

        return done(new Error('Failed to create or retrieve user'), undefined);
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error, undefined);
      }
    }));
  }

  // Facebook OAuth Strategy
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "/api/auth/facebook/callback",
      profileFields: ['id', 'emails', 'name', 'picture']
    },
    async (accessToken, refreshToken, profile: FacebookProfile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const firstName = profile.name?.givenName;
        const lastName = profile.name?.familyName;
        const profileImageUrl = profile.photos?.[0]?.value;

        // Check if this Facebook account is already linked
        let authIdentity = await storage.getAuthIdentity('facebook', profile.id);
        
        let user;
        if (authIdentity) {
          // User already exists with this Facebook account
          user = await storage.getUser(authIdentity.userId);
        } else {
          // New Facebook account - check if user exists by email
          if (email) {
            user = await storage.getUserByEmail(email);
          }
          
          if (!user) {
            // Create new user
            user = await storage.upsertUser({
              email: email || undefined,
              firstName: firstName || undefined,
              lastName: lastName || undefined,
              profileImageUrl: profileImageUrl || undefined,
            });
          }

          // Link Facebook account to user
          authIdentity = await storage.createAuthIdentity({
            userId: user.id,
            provider: 'facebook',
            providerUserId: profile.id,
            email: email || undefined,
          });
        }

        // Store OAuth token for API access
        if (user) {
          await storage.upsertOAuthToken({
            userId: user.id,
            provider: 'facebook',
            accessToken,
            refreshToken: refreshToken || undefined,
            expiresAt: null, // Facebook tokens have different expiry handling
            scope: 'email public_profile',
          });

          const oauthUser: OAuthUser = {
            id: user.id,
            provider: 'facebook',
            providerUserId: profile.id,
            email: user.email || undefined,
            firstName: user.firstName || undefined,
            lastName: user.lastName || undefined,
            profileImageUrl: user.profileImageUrl || undefined,
          };

          return done(null, oauthUser);
        }

        return done(new Error('Failed to create or retrieve user'), undefined);
      } catch (error) {
        console.error('Facebook OAuth error:', error);
        return done(error, undefined);
      }
    }));
  }

  // OAuth routes
  // Google routes
  app.get('/api/auth/google', 
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/?auth=error' }),
    (req, res) => {
      // Successful authentication, redirect to app
      res.redirect('/?auth=success');
    }
  );

  // Facebook routes
  app.get('/api/auth/facebook',
    passport.authenticate('facebook', { scope: ['email'] })
  );

  app.get('/api/auth/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/?auth=error' }),
    (req, res) => {
      // Successful authentication, redirect to app
      res.redirect('/?auth=success');
    }
  );
}

// Generic authentication middleware that works with all providers
export function isAuthenticatedGeneric(req: any, res: any, next: any) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  // Return 401 for unauthenticated requests
  res.status(401).json({ message: 'Unauthorized' });
}