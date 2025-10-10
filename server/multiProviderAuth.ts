import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as AppleStrategy } from "passport-apple";
import { Strategy as InstagramStrategy } from "passport-instagram";
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

interface AppleProfile {
  id: string;
  name?: { firstName?: string; lastName?: string };
  email?: string;
}

interface InstagramProfile {
  id: string;
  username?: string;
  account_type?: string;
}

// Generic OAuth user session format
interface OAuthUser {
  id: string;
  provider: 'google' | 'facebook' | 'apple' | 'instagram' | 'replit';
  providerUserId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  isNewUser?: boolean;
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
        let isNewUser = false;
        if (authIdentity) {
          // User already exists with this Google account
          user = await storage.getUser(authIdentity.userId);
        } else {
          // New Google account - check if user exists by email
          if (email) {
            user = await storage.getUserByEmail(email);
          }

          if (!user) {
            // Generate username from email or use Google ID as fallback
            let username = profile.id; // fallback to Google ID
            if (email && typeof email === 'string') {
              username = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
            }

            // Create new user
            user = await storage.upsertUser({
              username: username,
              password: "google_oauth_user", // Placeholder password for OAuth users
              email: email || undefined,
              firstName: firstName || undefined,
              lastName: lastName || undefined,
              profileImageUrl: profileImageUrl || undefined,
            });
            isNewUser = true;
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
            isNewUser
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
        let isNewUser = false;
        if (authIdentity) {
          // User already exists with this Facebook account
          user = await storage.getUser(authIdentity.userId);
        } else {
          // New Facebook account - check if user exists by email
          if (email) {
            user = await storage.getUserByEmail(email);
          }

          if (!user) {
            // Generate username from email or use Facebook ID as fallback
            let username = profile.id; // fallback to Facebook ID
            if (email && typeof email === 'string') {
              username = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
            }

            // Create new user
            user = await storage.upsertUser({
              username: username,
              password: "facebook_oauth_user", // Placeholder password for OAuth users
              email: email || undefined,
              firstName: firstName || undefined,
              lastName: lastName || undefined,
              profileImageUrl: profileImageUrl || undefined,
            });
            isNewUser = true;
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
            isNewUser
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

  // Apple OAuth Strategy (Sign in with Apple)
  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY) {
    passport.use(new AppleStrategy({
      clientID: process.env.APPLE_CLIENT_ID,
      teamID: process.env.APPLE_TEAM_ID,
      keyID: process.env.APPLE_KEY_ID,
      privateKeyString: process.env.APPLE_PRIVATE_KEY,
      callbackURL: "/api/auth/apple/callback",
      scope: ['name', 'email'],
      passReqToCallback: false,
    },
    async (accessToken: string, refreshToken: string, idToken: any, profile: AppleProfile, done: any) => {
      try {
        const email = profile.email;
        const firstName = profile.name?.firstName;
        const lastName = profile.name?.lastName;

        // Check if this Apple account is already linked
        let authIdentity = await storage.getAuthIdentity('apple', profile.id);
        
        let user;
        if (authIdentity) {
          // User already exists with this Apple account
          user = await storage.getUser(authIdentity.userId);
        } else {
          // New Apple account - check if user exists by email
          if (email) {
            user = await storage.getUserByEmail(email);
          }
          
          if (!user) {
            // Generate username from email or use Apple ID as fallback
            let username = profile.id; // fallback to Apple ID
            if (email && typeof email === 'string') {
              username = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
            }
            
            // Create new user
            user = await storage.upsertUser({
              username: username,
              password: "apple_oauth_user", // Placeholder password for OAuth users
              email: email || undefined,
              firstName: firstName || undefined,
              lastName: lastName || undefined,
              profileImageUrl: undefined, // Apple doesn't provide profile images
            });
          }

          // Link Apple account to user
          authIdentity = await storage.createAuthIdentity({
            userId: user.id,
            provider: 'apple',
            providerUserId: profile.id,
            email: email || undefined,
          });
        }

        // Store OAuth token for API access (Apple has limited API access)
        if (user) {
          await storage.upsertOAuthToken({
            userId: user.id,
            provider: 'apple',
            accessToken,
            refreshToken: refreshToken || undefined,
            expiresAt: null,
            scope: 'name email',
          });

          const oauthUser: OAuthUser = {
            id: user.id,
            provider: 'apple',
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
        console.error('Apple OAuth error:', error);
        return done(error, undefined);
      }
    }));
  }

  // Instagram Basic Display API OAuth Strategy
  if (process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET) {
    passport.use(new InstagramStrategy({
      clientID: process.env.INSTAGRAM_CLIENT_ID,
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
      callbackURL: "/api/auth/instagram/callback",
    },
    async (accessToken: string, refreshToken: string, profile: InstagramProfile, done: any) => {
      try {
        const username = profile.username;

        // Check if this Instagram account is already linked
        let authIdentity = await storage.getAuthIdentity('instagram', profile.id);
        
        let user;
        if (authIdentity) {
          // User already exists with this Instagram account
          user = await storage.getUser(authIdentity.userId);
        } else {
          // New Instagram account - Note: Instagram Basic Display API doesn't provide email
          // We can only create accounts with username
          if (!user) {
            // Generate username from Instagram username or use Instagram ID as fallback
            const sanitizedUsername = username ? username.replace(/[^a-zA-Z0-9_]/g, '_') : profile.id;
            
            // Create new user (Instagram doesn't provide email or names)
            user = await storage.upsertUser({
              username: sanitizedUsername,
              password: "instagram_oauth_user", // Placeholder password for OAuth users
              email: undefined, // Instagram Basic Display API doesn't provide email
              firstName: undefined,
              lastName: undefined,
              profileImageUrl: undefined, // We'd need additional API calls to get profile picture
            });
          }

          // Link Instagram account to user
          authIdentity = await storage.createAuthIdentity({
            userId: user.id,
            provider: 'instagram',
            providerUserId: profile.id,
            email: undefined, // Instagram doesn't provide email
          });
        }

        // Store OAuth token for API access
        if (user) {
          await storage.upsertOAuthToken({
            userId: user.id,
            provider: 'instagram',
            accessToken,
            refreshToken: refreshToken || undefined,
            expiresAt: null,
            scope: 'user_profile,user_media',
          });

          const oauthUser: OAuthUser = {
            id: user.id,
            provider: 'instagram',
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
        console.error('Instagram OAuth error:', error);
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
      // Check if this is a new user who needs profile completion
      const user = req.user as OAuthUser;
      if (user?.isNewUser) {
        // New user - redirect to profile completion
        res.redirect(`/?auth=success&newUser=true&userId=${user.id}`);
      } else {
        // Existing user - redirect to app
        res.redirect('/?auth=success');
      }
    }
  );

  // Facebook routes
  app.get('/api/auth/facebook',
    passport.authenticate('facebook', { scope: ['email'] })
  );

  app.get('/api/auth/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/?auth=error&provider=facebook&reason=app_not_active' }),
    (req, res) => {
      // Check if this is a new user who needs profile completion
      const user = req.user as OAuthUser;
      if (user?.isNewUser) {
        // New user - redirect to profile completion
        res.redirect(`/?auth=success&newUser=true&userId=${user.id}`);
      } else {
        // Existing user - redirect to app
        res.redirect('/?auth=success');
      }
    }
  );

  // Apple routes
  app.get('/api/auth/apple',
    passport.authenticate('apple')
  );

  app.post('/api/auth/apple/callback',
    passport.authenticate('apple', { failureRedirect: '/?auth=error' }),
    (req, res) => {
      // Successful authentication, redirect to app
      res.redirect('/?auth=success');
    }
  );

  // Instagram routes
  app.get('/api/auth/instagram',
    passport.authenticate('instagram')
  );

  app.get('/api/auth/instagram/callback',
    passport.authenticate('instagram', { failureRedirect: '/?auth=error' }),
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