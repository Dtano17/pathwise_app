// Server-side Supabase client configuration
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables for server-side client')
}

// Create Supabase client with service role key for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Helper function to verify and get user from JWT token
export const getUserFromToken = async (token: string) => {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      return null
    }

    return user
  } catch (error) {
    console.error('Error verifying token:', error)
    return null
  }
}

// Helper function to get user by ID (admin operation)
export const getUserById = async (userId: string) => {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (error || !user) {
      return null
    }

    return user
  } catch (error) {
    console.error('Error getting user by ID:', error)
    return null
  }
}

// Helper function to update user metadata (admin operation)
export const updateUserMetadata = async (userId: string, metadata: object) => {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: metadata
    })

    if (error) {
      console.error('Error updating user metadata:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error updating user metadata:', error)
    throw error
  }
}

// Helper function to delete user (admin operation)
export const deleteUser = async (userId: string) => {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) {
      console.error('Error deleting user:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error deleting user:', error)
    throw error
  }
}

export default supabaseAdmin