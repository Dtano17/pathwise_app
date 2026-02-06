import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { User, Settings, LogOut, Shield } from 'lucide-react'
import AuthModal from './AuthModal'
import { signOut } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

interface AuthButtonProps {
  user?: {
    id: string
    email?: string
    user_metadata?: {
      display_name?: string
      first_name?: string
      last_name?: string
      avatar_url?: string
    }
  } | null
  onSignOut?: () => void
}

export default function AuthButton({ user, onSignOut }: AuthButtonProps) {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSignOut = async () => {
    setLoading(true)
    try {
      await signOut()
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account."
      })
      onSignOut?.()
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message || "Failed to sign out",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getDisplayName = () => {
    if (user?.user_metadata?.display_name) {
      return user.user_metadata.display_name
    }

    const firstName = user?.user_metadata?.first_name
    const lastName = user?.user_metadata?.last_name

    if (firstName && lastName) {
      return `${firstName} ${lastName}`
    }

    if (firstName) return firstName
    if (user?.email) return user.email.split('@')[0]

    return 'User'
  }

  const getInitials = () => {
    const displayName = getDisplayName()
    const names = displayName.split(' ')

    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase()
    }

    return displayName.slice(0, 2).toUpperCase()
  }

  // If user is not authenticated, show sign in button
  if (!user) {
    return (
      <>
        <Button
          onClick={() => setShowAuthModal(true)}
          variant="default"
          size="sm"
        >
          Sign In
        </Button>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            // The parent component should handle refetching user data
            setShowAuthModal(false)
          }}
        />
      </>
    )
  }

  // If user is authenticated, show user menu
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={user.user_metadata?.avatar_url}
              alt={getDisplayName()}
            />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {getDisplayName()}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => {/* TODO: Open profile settings */}}>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => {/* TODO: Open app settings */}}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => {/* TODO: Open account settings */}}>
          <Shield className="mr-2 h-4 w-4" />
          <span>Account</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={loading}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{loading ? 'Signing out...' : 'Sign out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}