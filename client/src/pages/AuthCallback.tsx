import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const hasProcessed = useRef(false)

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Prevent running multiple times
      if (hasProcessed.current) {
        console.log('AuthCallback: Already processed, skipping')
        return
      }
      hasProcessed.current = true
      try {
        console.log('AuthCallback: Starting auth callback handling')
        console.log('AuthCallback: Current URL:', window.location.href)
        
        // Check for URL parameters that might indicate an error
        const urlParams = new URLSearchParams(window.location.search)
        const error = urlParams.get('error')
        const errorDescription = urlParams.get('error_description')
        const code = urlParams.get('code')
        
        if (error) {
          console.error('OAuth error from URL:', error, errorDescription)
          console.error('Full URL:', window.location.href)
          setStatus('error')
          setMessage(errorDescription || `Authentication failed: ${error}`)
          return
        }

        // If we have a code parameter, exchange it for a session
        if (code) {
          console.log('AuthCallback: Found OAuth code, exchanging for session...')
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          
          if (exchangeError) {
            console.error('AuthCallback: Code exchange error:', exchangeError)
            console.error('Error details:', JSON.stringify(exchangeError, null, 2))
            setStatus('error')
            setMessage(exchangeError.message || `Failed to complete authentication: ${exchangeError.message || 'Unknown error'}`)
            return
          }

          if (data.session && data.session.user) {
            console.log('AuthCallback: Successfully exchanged code for session')
            console.log('AuthCallback: User ID:', data.session.user.id)
            console.log('AuthCallback: User email:', data.session.user.email)
            
            // Sync Supabase user to backend
            try {
              const syncResponse = await fetch('/api/auth/supabase-sync', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                  userId: data.session.user.id,
                  email: data.session.user.email,
                  fullName: data.session.user.user_metadata?.full_name || 
                           data.session.user.user_metadata?.name,
                  avatarUrl: data.session.user.user_metadata?.avatar_url,
                  provider: 'facebook'
                })
              });
              
              if (!syncResponse.ok) {
                console.error('Failed to sync user to backend');
                setStatus('error')
                setMessage('Failed to complete authentication. Please try again.')
                return
              }
              
              console.log('User synced to backend successfully')
            } catch (syncError) {
              console.error('Error syncing user:', syncError);
              setStatus('error')
              setMessage('Failed to complete authentication. Please try again.')
              return
            }
            
            setStatus('success')
            const userName = data.session.user.user_metadata?.full_name ||
                            data.session.user.user_metadata?.name ||
                            data.session.user.email?.split('@')[0] ||
                            'there'
            setMessage(`Welcome ${userName}!`)
            
            // Clean up URL parameters and redirect
            window.history.replaceState({}, document.title, window.location.pathname)
            
            // Redirect to the main app
            setTimeout(() => {
              window.location.href = '/'
            }, 1500)
            return
          }
        }

        // No code parameter - this shouldn't happen in normal OAuth flow
        console.log('AuthCallback: No OAuth code found')
        
        // Check if we already have a backend session (user might have clicked back button)
        try {
          const userCheck = await fetch('/api/auth/user', { credentials: 'include' })
          const userData = await userCheck.json()
          
          if (userData && userData.authenticated) {
            console.log('AuthCallback: User already authenticated, redirecting...')
            setStatus('success')
            setMessage('Welcome back!')
            setTimeout(() => {
              window.location.href = '/'
            }, 500)
            return
          }
        } catch (e) {
          // Ignore errors, will show error state below
        }
        
        console.log('AuthCallback: No session found')
        setStatus('error')
        setMessage('Authentication was not completed. Please try again.')
        // Don't auto-redirect on failure, let user manually retry
      } catch (error: any) {
        console.error('Unexpected auth callback error:', error)
        setStatus('error')
        setMessage('Something went wrong during authentication')
      }
    }

    handleAuthCallback()
  }, [])

  const handleReturnHome = () => {
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative w-16 h-16 bg-gradient-to-br from-purple-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">AI</span>
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-emerald-600 bg-clip-text text-transparent">
            {status === 'loading' && 'Completing Sign In...'}
            {status === 'success' && 'Welcome to IntentAI!'}
            {status === 'error' && 'Authentication Error'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Setting up your personalized experience'}
            {status === 'success' && 'Your profile is ready'}
            {status === 'error' && 'There was a problem with your authentication'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="flex flex-col items-center space-y-4">
            {status === 'loading' && (
              <div className="flex items-center space-x-2">
                <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                <span className="text-muted-foreground">Processing...</span>
              </div>
            )}
            
            {status === 'success' && (
              <>
                <CheckCircle className="w-12 h-12 text-green-600" />
                <p className="text-foreground">{message}</p>
                <p className="text-sm text-muted-foreground">
                  Redirecting you to the app...
                </p>
              </>
            )}
            
            {status === 'error' && (
              <>
                <XCircle className="w-12 h-12 text-red-600" />
                <p className="text-foreground">{message}</p>
                <Button 
                  onClick={handleReturnHome}
                  className="mt-4"
                  data-testid="button-return-home"
                >
                  Return to Home
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}