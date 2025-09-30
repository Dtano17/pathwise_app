import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleAuthCallback = async () => {
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
          setStatus('error')
          setMessage(errorDescription || error || 'Authentication failed')
          return
        }

        // If we have a code parameter, exchange it for a session
        if (code) {
          console.log('AuthCallback: Found OAuth code, exchanging for session...')
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          
          if (exchangeError) {
            console.error('AuthCallback: Code exchange error:', exchangeError)
            setStatus('error')
            setMessage(exchangeError.message || 'Failed to complete authentication')
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
            const userName = data.session.user.email || 
                            data.session.user.user_metadata?.full_name ||
                            data.session.user.user_metadata?.name ||
                            'back'
            setMessage(`Welcome ${userName}!`)
            
            // Clean up URL parameters
            window.history.replaceState({}, document.title, window.location.pathname)
            
            // Redirect to the main app after a short delay
            setTimeout(() => {
              window.location.href = '/'
            }, 2000)
            return
          }
        }

        // Fallback: Try to get existing session
        console.log('AuthCallback: No code found, checking for existing session...')
        const { data, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('Auth callback session error:', sessionError)
          setStatus('error')
          setMessage(sessionError.message || 'Authentication failed')
          return
        }

        if (data.session && data.session.user) {
          console.log('AuthCallback: Found existing session')
          console.log('AuthCallback: User ID:', data.session.user.id)
          
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
          const userName = data.session.user.email || 
                          data.session.user.user_metadata?.full_name ||
                          data.session.user.user_metadata?.name ||
                          'back'
          setMessage(`Welcome ${userName}!`)
          
          // Clean up URL parameters
          window.history.replaceState({}, document.title, window.location.pathname)
          
          // Redirect to the main app after a short delay
          setTimeout(() => {
            window.location.href = '/'
          }, 2000)
        } else {
          console.log('AuthCallback: No session found after callback')
          setStatus('error')
          setMessage('Authentication was not completed. Please try again.')
          // Don't auto-redirect on failure, let user manually retry
        }
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
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-emerald-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {status === 'loading' && 'Completing Sign In...'}
            {status === 'success' && 'Welcome Back!'}
            {status === 'error' && 'Authentication Error'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Please wait while we complete your authentication'}
            {status === 'success' && 'You have been successfully signed in'}
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