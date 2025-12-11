import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { User, Session } from '@supabase/supabase-js'
import { useToast } from '@/hooks/use-toast'
import { Capacitor } from '@capacitor/core'

// Get the appropriate redirect URL based on the platform
function getRedirectUrl(): string {
  if (Capacitor.isNativePlatform()) {
    // For native mobile apps, use the custom scheme
    return 'ai.journalmate.app://auth/callback'
  }
  // For web, use the current origin
  return `${window.location.origin}/auth/callback`
}

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)

      if (event === 'SIGNED_IN' && session?.user) {
        toast({
          title: "Welcome!",
          description: `Successfully signed in as ${session.user.email || session.user.user_metadata?.full_name}`,
        })
      }

      if (event === 'SIGNED_OUT') {
        toast({
          title: "Signed out",
          description: "You have been successfully signed out",
        })
      }
    })

    return () => subscription.unsubscribe()
  }, [toast])

  const signInWithFacebook = async () => {
    try {
      setIsProcessing(true)

      const redirectUrl = getRedirectUrl()
      console.log('Facebook login - redirect URL:', redirectUrl)
      console.log('Is native platform:', Capacitor.isNativePlatform())

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: redirectUrl,
          scopes: 'email public_profile'
        }
      })

      if (error) {
        throw error
      }

      // The user will be redirected to Facebook
      return data
    } catch (error: any) {
      console.error('Facebook sign-in error:', error)
      toast({
        title: "Facebook Sign-In Unavailable",
        description: "Facebook login is temporarily unavailable due to app configuration. Please try Google, Email, or another sign-in method.",
        variant: "destructive",
      })
      throw error
    } finally {
      setIsProcessing(false)
    }
  }

  const signInWithGoogle = async () => {
    try {
      setIsProcessing(true)

      const redirectUrl = getRedirectUrl()
      console.log('Google login - redirect URL:', redirectUrl)
      console.log('Is native platform:', Capacitor.isNativePlatform())

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          scopes: 'email profile'
        }
      })

      if (error) {
        throw error
      }

      return data
    } catch (error: any) {
      console.error('Google sign-in error:', error)
      toast({
        title: "Google Login Failed",
        description: error.message || "Failed to sign in with Google",
        variant: "destructive",
      })
      throw error
    } finally {
      setIsProcessing(false)
    }
  }

  const signOut = async () => {
    try {
      setIsProcessing(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error: any) {
      toast({
        title: "Sign Out Failed",
        description: error.message || "Failed to sign out",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setIsProcessing(true)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      return data
    } catch (error: any) {
      console.error('Email sign-in error:', error)
      toast({
        title: "Login Failed",
        description: error.message || "Failed to sign in",
        variant: "destructive",
      })
      throw error
    } finally {
      setIsProcessing(false)
    }
  }

  const signUpWithEmail = async (email: string, password: string, metadata?: any) => {
    try {
      setIsProcessing(true)

      const redirectUrl = getRedirectUrl()
      console.log('Email sign-up - redirect URL:', redirectUrl)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: redirectUrl
        }
      })

      if (error) {
        throw error
      }

      if (data.user && !data.session) {
        toast({
          title: "Check your email",
          description: "Please check your email for a confirmation link",
        })
      }

      return data
    } catch (error: any) {
      console.error('Email sign-up error:', error)
      toast({
        title: "Sign Up Failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      })
      throw error
    } finally {
      setIsProcessing(false)
    }
  }

  return {
    user,
    session,
    loading,
    isProcessing,
    signInWithFacebook,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    isAuthenticated: !!session && !!user
  }
}