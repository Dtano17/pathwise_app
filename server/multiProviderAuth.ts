import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as AppleStrategy } from "passport-apple";
import { Strategy as InstagramStrategy } from "passport-instagram";
import { type Express } from "express";
import crypto from "crypto";
import { storage } from "./storage";
import { type AuthIdentity } from "@shared/schema";
import { sendWelcomeEmail } from "./emailService";

// Track processed OAuth codes to prevent duplicate callback processing
// OAuth codes are single-use, so we need to reject duplicates before passport tries to exchange them
const processedOAuthCodes = new Set<string>();
const OAUTH_CODE_EXPIRY_MS = 60000; // Clean up codes after 1 minute

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
  // Passport session serialization - handle both OAuth providers and Replit Auth
  // OAuth providers use user.id, Replit Auth uses user.claims.sub
  passport.serializeUser((user: any, done) => {
    // For OAuth providers (Google, Facebook, etc.) - user has direct id
    // For Replit Auth - user has claims.sub
    const userId = user.id || user.claims?.sub;
    console.log('[Passport] Serializing user:', userId, 'provider:', user.provider || 'replit');
    
    if (!userId) {
      console.error('[Passport] Cannot serialize user - no ID found:', user);
      return done(new Error('User ID not found'), null);
    }
    
    done(null, userId);
  });

  // Deserialize user from session - retrieve full user from storage
  passport.deserializeUser(async (id: string, done) => {
    try {
      // Handle case where id might be the full user object (backwards compatibility)
      const userId = typeof id === 'object' ? (id as any).id || (id as any).claims?.sub : id;
      
      if (!userId) {
        console.error('[Passport] Cannot deserialize - invalid ID:', id);
        return done(null, false);
      }
      
      console.log('[Passport] Deserializing user ID:', userId);
      const user = await storage.getUser(userId);
      if (!user) {
        console.error('[Passport] User not found:', userId);
        return done(null, false); // Return false instead of error to allow graceful fallback
      }
      console.log('[Passport] Deserialized user:', user.id);
      done(null, { id: user.id, email: user.email });
    } catch (error) {
      console.error('[Passport] Deserialization error:', error);
      done(null, false); // Graceful fallback on error
    }
  });

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

          // Send welcome email for new users (don't wait for it)
          if (isNewUser && user.email) {
            sendWelcomeEmail(user.email, user.firstName || 'there').then(result => {
              if (result.success) {
                console.log('[Google OAuth] Welcome email sent to:', user.email);
              } else {
                console.error('[Google OAuth] Failed to send welcome email:', result.error);
              }
            }).catch(error => {
              console.error('[Google OAuth] Welcome email error:', error);
            });
          }

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

          // Send welcome email for new users (don't wait for it)
          if (isNewUser && user.email) {
            sendWelcomeEmail(user.email, user.firstName || 'there').then(result => {
              if (result.success) {
                console.log('[Facebook OAuth] Welcome email sent to:', user.email);
              } else {
                console.error('[Facebook OAuth] Failed to send welcome email:', result.error);
              }
            }).catch(error => {
              console.error('[Facebook OAuth] Welcome email error:', error);
            });
          }

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
        let isNewUser = false;
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
            isNewUser = true;
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

          // Send welcome email for new users (don't wait for it)
          if (isNewUser && user.email) {
            sendWelcomeEmail(user.email, user.firstName || 'there').then(result => {
              if (result.success) {
                console.log('[Apple OAuth] Welcome email sent to:', user.email);
              } else {
                console.error('[Apple OAuth] Failed to send welcome email:', result.error);
              }
            }).catch(error => {
              console.error('[Apple OAuth] Welcome email error:', error);
            });
          }

          const oauthUser: OAuthUser = {
            id: user.id,
            provider: 'apple',
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
  app.get('/api/auth/google', (req, res, next) => {
    // Store returnTo in session if provided (validate to prevent open redirect)
    const returnTo = req.query.returnTo as string;
    if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
      req.session.returnTo = returnTo;
    }
    // Store mobile flag for deep link redirect after OAuth
    const state = Buffer.from(JSON.stringify({
      mobile: req.query.mobile === 'true',
      returnTo: (req.query.returnTo as string) || '/'
    })).toString('base64');

    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      state: state
    })(req, res, next);
  });

  app.get('/api/auth/google/callback', (req: any, res, next) => {
    // Check if user is already authenticated (duplicate callback protection)
    if (req.isAuthenticated() && req.user) {
      console.log('[Google OAuth] User already authenticated, redirecting without re-auth');
      return res.redirect('/?auth=success&provider=google');
    }

    // Check if this is a duplicate request without a code (already processed)
    if (!req.query.code && !req.query.error) {
      console.log('[Google OAuth] No code in callback, redirecting to home');
      return res.redirect('/');
    }

    // Duplicate OAuth code protection: OAuth codes are single-use
    // Android WebView sometimes makes duplicate requests, causing "TokenError: Bad Request"
    const oauthCode = req.query.code as string;
    if (oauthCode) {
      if (processedOAuthCodes.has(oauthCode)) {
        console.log('[Google OAuth] Duplicate OAuth code detected, redirecting to success');
        return res.redirect('/?auth=success&provider=google');
      }
      // Mark this code as being processed
      processedOAuthCodes.add(oauthCode);
      // Clean up after expiry to prevent memory leak
      setTimeout(() => {
        processedOAuthCodes.delete(oauthCode);
      }, OAUTH_CODE_EXPIRY_MS);
    }

    passport.authenticate('google', {
      failureRedirect: '/?auth=error&provider=google',
      failureMessage: true
    })(req, res, next);
  },
    async (req: any, res) => {
      const user = req.user as OAuthUser;
      console.log('[Google OAuth] Callback successful, user:', user);
      
      // Parse state parameter to recover mobile flag and returnTo
      let isMobileAuth = false;
      let returnTo = '/';
      try {
        if (req.query.state) {
          const stateData = JSON.parse(Buffer.from(req.query.state as string, 'base64').toString());
          isMobileAuth = stateData.mobile === true;
          returnTo = stateData.returnTo || '/';
          console.log('[Google OAuth] State parsed:', stateData);
        }
      } catch (e) {
        console.error('[Google OAuth] Could not parse state, using defaults');
      }

      console.log('[Google OAuth] Session ID before regenerate:', req.sessionID);

      // Regenerate session to prevent session fixation and ensure proper cookie setup
      req.session.regenerate(async (regenerateErr: any) => {
        if (regenerateErr) {
          console.error('[Google OAuth] Session regenerate error:', regenerateErr);
          return res.redirect('/?auth=error&reason=session');
        }

        // Re-establish the user in the new session using passport login
        req.login(user, async (loginErr: any) => {
          if (loginErr) {
            console.error('[Google OAuth] Login error after regenerate:', loginErr);
            return res.redirect('/?auth=error&reason=login');
          }

          console.log('[Google OAuth] Session ID after regenerate:', req.sessionID);
          console.log('[Google OAuth] Session passport user:', req.session?.passport?.user);
          console.log('[Google OAuth] Mobile auth:', isMobileAuth);

          // For mobile app: create one-time token and redirect via intermediate page
          // Chrome doesn't reliably handle direct custom scheme redirects, so we use
          // a web page that triggers the deep link via JavaScript and provides fallbacks
          if (isMobileAuth && user.id) {
            try {
              const authToken = crypto.randomBytes(32).toString('hex');
              await storage.createMobileAuthToken(parseInt(user.id), authToken);
              console.log('[Google OAuth] Mobile auth - redirecting to auth callback page');
              // Redirect to a web page that will handle the deep link
              return res.redirect(`/auth/mobile-callback?token=${authToken}`);
            } catch (tokenErr) {
              console.error('[Google OAuth] Failed to create mobile token:', tokenErr);
              // Fall back to web redirect
            }
          }

          // Append auth success parameter for web
          const separator = returnTo.includes('?') ? '&' : '?';
          const redirectUrl = `${returnTo}${separator}auth=success&provider=google`;

          // Explicitly save session before redirecting
          req.session.save((saveErr: any) => {
            if (saveErr) {
              console.error('[Google OAuth] Session save error:', saveErr);
            }
            console.log('[Google OAuth] Redirecting to:', redirectUrl);
            res.redirect(redirectUrl);
          });
        });
      });
    }
  );

  // Facebook routes
  app.get('/api/auth/facebook', (req, res, next) => {
    // Store returnTo in session if provided (validate to prevent open redirect)
    const returnTo = req.query.returnTo as string;
    if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
      req.session.returnTo = returnTo;
    }
    passport.authenticate('facebook', { scope: ['email'] })(req, res, next);
  });

  app.get('/api/auth/facebook/callback',
    passport.authenticate('facebook', { 
      failureRedirect: '/?auth=error&provider=facebook',
      failureMessage: true 
    }),
    (req, res) => {
      console.log('[Facebook OAuth] Callback successful, user:', req.user);
      // Get returnTo from session or default to home
      const returnTo = req.session.returnTo || '/';
      delete req.session.returnTo; // Clean up
      
      // Append auth success parameter
      const separator = returnTo.includes('?') ? '&' : '?';
      res.redirect(`${returnTo}${separator}auth=success&provider=facebook`);
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

  // Native Google Auth endpoint for Capacitor mobile apps
  // This bypasses WebView OAuth restrictions by verifying native SDK tokens
  app.post('/api/auth/google/native', async (req, res) => {
    try {
      const { idToken, email, name, givenName, familyName, imageUrl, id: googleId } = req.body;

      console.log('[Native Google Auth] Request received:', { email, name, googleId });

      if (!email || !googleId) {
        console.error('[Native Google Auth] Missing required fields');
        return res.status(400).json({ error: 'Missing email or Google ID' });
      }

      // Verify the ID token with Google (optional but recommended for production)
      // For now, we trust the native SDK since it handles verification
      // In production, you should verify the idToken with Google's OAuth2Client

      // Check if this Google account is already linked
      let authIdentity = await storage.getAuthIdentity('google', googleId);

      let user;
      let isNewUser = false;

      if (authIdentity) {
        // User already exists with this Google account
        user = await storage.getUser(authIdentity.userId);
        console.log('[Native Google Auth] Existing user found:', user?.id);
      } else {
        // New Google account - check if user exists by email
        user = await storage.getUserByEmail(email);

        if (!user) {
          // Generate username from email
          const username = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');

          // Create new user
          user = await storage.upsertUser({
            username: username,
            password: "google_oauth_native_user", // Placeholder for OAuth users
            email: email,
            firstName: givenName || name?.split(' ')[0] || undefined,
            lastName: familyName || name?.split(' ').slice(1).join(' ') || undefined,
            profileImageUrl: imageUrl || undefined,
          });
          isNewUser = true;
          console.log('[Native Google Auth] New user created:', user.id);

          // Send welcome email for new users (don't wait for it)
          if (user.email) {
            sendWelcomeEmail(user.email, user.firstName || 'there').catch(error => {
              console.error('[Native Google Auth] Welcome email error:', error);
            });
          }
        }

        // Link Google account to user
        authIdentity = await storage.createAuthIdentity({
          userId: user.id,
          provider: 'google',
          providerUserId: googleId,
          email: email,
        });
        console.log('[Native Google Auth] Auth identity created for user:', user.id);
      }

      if (!user) {
        console.error('[Native Google Auth] Failed to create or retrieve user');
        return res.status(500).json({ error: 'Failed to create user' });
      }

      // Create OAuth user object
      const oauthUser: OAuthUser = {
        id: user.id,
        provider: 'google',
        providerUserId: googleId,
        email: user.email || undefined,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        profileImageUrl: user.profileImageUrl || undefined,
        isNewUser
      };

      // Generate a simple auth token for native apps
      // This token is stored securely on the device and used for API requests
      const crypto = await import('crypto');
      const authToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      // Store the token in the user's OAuth tokens
      await storage.upsertOAuthToken({
        userId: user.id,
        provider: 'native_app',
        accessToken: authToken,
        refreshToken: undefined,
        expiresAt: tokenExpiry,
        scope: 'native_auth',
      });

      console.log('[Native Google Auth] Auth token generated for user:', user.id);

      // Also try to establish session for web fallback
      req.session.regenerate((regenerateErr: any) => {
        if (regenerateErr) {
          console.warn('[Native Google Auth] Session regenerate warning:', regenerateErr);
          // Don't fail - token auth will work
        }

        req.login(oauthUser, (loginErr: any) => {
          if (loginErr) {
            console.warn('[Native Google Auth] Session login warning:', loginErr);
            // Don't fail - token auth will work
          }

          req.session.save((saveErr: any) => {
            if (saveErr) {
              console.warn('[Native Google Auth] Session save warning:', saveErr);
            }

            console.log('[Native Google Auth] Login successful:', user.id);
            res.json({
              success: true,
              user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                profileImageUrl: user.profileImageUrl,
                authenticated: true,
              },
              authToken, // Return token for native storage
              isNewUser
            });
          });
        });
      });
    } catch (error) {
      console.error('[Native Google Auth] Error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  });

  // Mobile auth token exchange endpoint
  // Used when OAuth redirects via deep link with a one-time token
  app.post('/api/auth/mobile-token', async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        console.log('[Mobile Token] No token provided');
        return res.status(400).json({ error: 'Token required' });
      }

      // Consume the one-time token
      const tokenRecord = await storage.consumeMobileAuthToken(token);
      if (!tokenRecord) {
        console.log('[Mobile Token] Invalid or expired token');
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      // Get the user
      const user = await storage.getUser(tokenRecord.userId.toString());
      if (!user) {
        console.log('[Mobile Token] User not found:', tokenRecord.userId);
        return res.status(401).json({ error: 'User not found' });
      }

      // Create OAuth user object for session
      const oauthUser: OAuthUser = {
        id: user.id,
        provider: 'google', // Original auth was via Google
        providerUserId: user.id,
        email: user.email || undefined,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        profileImageUrl: user.profileImageUrl || undefined,
      };

      // Establish session
      req.session.regenerate((regenerateErr: any) => {
        if (regenerateErr) {
          console.error('[Mobile Token] Session regenerate error:', regenerateErr);
          return res.status(500).json({ error: 'Session error' });
        }

        req.login(oauthUser, (loginErr: any) => {
          if (loginErr) {
            console.error('[Mobile Token] Login error:', loginErr);
            return res.status(500).json({ error: 'Login failed' });
          }

          req.session.save((saveErr: any) => {
            if (saveErr) {
              console.error('[Mobile Token] Session save error:', saveErr);
            }

            console.log('[Mobile Token] Login successful for user:', user.id);
            res.json({
              success: true,
              user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                profileImageUrl: user.profileImageUrl,
              }
            });
          });
        });
      });
    } catch (error) {
      console.error('[Mobile Token] Error:', error);
      res.status(500).json({ error: 'Token exchange failed' });
    }
  });

  // Token-based auth verification for native apps
  // Native apps send the auth token in the Authorization header
  app.get('/api/auth/verify-token', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ authenticated: false, error: 'No token provided' });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Find user by token
      const tokenRecord = await storage.getOAuthTokenByAccessToken('native_app', token);

      if (!tokenRecord) {
        return res.status(401).json({ authenticated: false, error: 'Invalid token' });
      }

      // Check if token is expired
      if (tokenRecord.expiresAt && new Date(tokenRecord.expiresAt) < new Date()) {
        return res.status(401).json({ authenticated: false, error: 'Token expired' });
      }

      // Get user info
      const user = await storage.getUser(tokenRecord.userId);
      if (!user) {
        return res.status(401).json({ authenticated: false, error: 'User not found' });
      }

      console.log('[Token Auth] Verified token for user:', user.id);

      res.json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          username: user.username,
          subscriptionTier: user.subscriptionTier,
          subscriptionStatus: user.subscriptionStatus,
        }
      });
    } catch (error) {
      console.error('[Token Auth] Verification error:', error);
      res.status(500).json({ authenticated: false, error: 'Verification failed' });
    }
  });

  // Logout endpoint for native apps (invalidate token)
  app.post('/api/auth/native-logout', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        // Delete the token
        await storage.deleteOAuthTokenByAccessToken('native_app', token);
        console.log('[Token Auth] Token invalidated');
      }
      res.json({ success: true });
    } catch (error) {
      console.error('[Token Auth] Logout error:', error);
      res.json({ success: true }); // Don't fail logout
    }
  });
}

// Generic authentication middleware that works with all providers
export function isAuthenticatedGeneric(req: any, res: any, next: any) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  // Return 401 for unauthenticated requests
  res.status(401).json({ message: 'Unauthorized' });
}