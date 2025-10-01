// Supabase authentication middleware for Express
import type { Request, Response, NextFunction } from 'express'
import { getUserFromToken, supabaseAdmin } from './supabaseClient'

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email?: string
        user_metadata?: any
        app_metadata?: any
      }
    }
  }
}

// Middleware to authenticate requests using Supabase JWT tokens
export const authenticateSupabaseUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the Authorization header
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authorization header missing or invalid',
        message: 'Please provide a valid Bearer token'
      })
    }

    // Extract the token
    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Verify the token with Supabase
    const user = await getUserFromToken(token)

    if (!user) {
      return res.status(401).json({
        error: 'Invalid or expired token',
        message: 'Please sign in again'
      })
    }

    // Add user to request object
    req.user = {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata
    }

    next()
  } catch (error) {
    console.error('Authentication error:', error)
    return res.status(500).json({
      error: 'Authentication failed',
      message: 'Internal server error during authentication'
    })
  }
}

// Optional middleware that adds user info if token is present, but doesn't require it
export const optionalSupabaseAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const user = await getUserFromToken(token)

      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata,
          app_metadata: user.app_metadata
        }
      }
    }

    next()
  } catch (error) {
    // For optional auth, we continue even if there's an error
    console.warn('Optional authentication failed:', error)
    next()
  }
}

// Helper function to extract user ID from request
export const getUserId = (req: Request): string | null => {
  return req.user?.id || null
}

// Helper function to check if user is authenticated
export const isAuthenticated = (req: Request): boolean => {
  return !!req.user?.id
}

// Helper function to get user session info
export const getUserSession = (req: Request) => {
  return req.user || null
}

export default {
  authenticateSupabaseUser,
  optionalSupabaseAuth,
  getUserId,
  isAuthenticated,
  getUserSession
}