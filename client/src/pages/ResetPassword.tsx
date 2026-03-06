import { useState } from 'react';
import { useLocation, useSearch, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, Loader2, Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const heroVideoUrl = 'https://storage.googleapis.com/pathwise-media/public/hero_video.mp4';

export default function ResetPassword() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const token = new URLSearchParams(search).get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const passwordValid = hasMinLength && hasLetter && hasNumber && hasSpecial;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordValid || !passwordsMatch || !token) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: 'Reset Failed',
          description: data.error || 'Failed to reset password',
          variant: 'destructive',
        });
        return;
      }

      setSuccess(true);
      toast({
        title: 'Password Reset!',
        description: 'Your password has been updated successfully.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (!token) {
      return (
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Invalid Reset Link</h1>
          <p className="text-white/60">This password reset link is missing its security token.</p>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => setLocation('/login')}
              className="bg-white/20 hover:bg-white/30 text-white border border-white/20"
            >
              Go to Login
            </Button>
          </div>
        </div>
      );
    }

    if (success) {
      return (
        <div className="text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Password Updated!</h1>
          <p className="text-white/60">Your password has been reset successfully. You can now sign in with your new password.</p>
          <Button
            onClick={() => setLocation('/login')}
            className="bg-white/20 hover:bg-white/30 text-white border border-white/20"
          >
            Go to Login
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Reset Your Password</h1>
          <p className="text-white/60 mt-2">Enter your new password below.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-white/80">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-9 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/40"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="text-xs text-white/40 space-y-0.5">
              <ul className="list-disc list-inside ml-1">
                <li className={hasMinLength ? 'text-green-400' : ''}>At least 8 characters</li>
                <li className={hasLetter ? 'text-green-400' : ''}>At least one letter</li>
                <li className={hasNumber ? 'text-green-400' : ''}>At least one number</li>
                <li className={hasSpecial ? 'text-green-400' : ''}>At least one special character</li>
              </ul>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-white/80">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/40"
                required
              />
            </div>
            {confirmPassword && !passwordsMatch && (
              <p className="text-xs text-red-400">Passwords do not match</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/20"
            disabled={isLoading || !passwordValid || !passwordsMatch}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              'Reset Password'
            )}
          </Button>
        </form>
      </div>
    );
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Blurred Video Background */}
      <video
        autoPlay
        muted
        playsInline
        loop
        poster="/hero_poster.jpg"
        className="absolute inset-0 w-full h-full object-cover blur-sm scale-105"
      >
        <source src={heroVideoUrl} type="video/mp4" />
      </video>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />

      {/* Back to Login */}
      <div className="sticky top-0 z-30 safe-top">
        <div className="px-4 py-3">
          <Link href="/login">
            <button className="flex items-center gap-2 text-white/80 hover:text-white transition-colors group text-sm font-medium">
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              Back to Login
            </button>
          </Link>
        </div>
      </div>

      {/* Glass card */}
      <div className="flex-1 flex items-center justify-center px-4 pb-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <div className="bg-white/10 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl p-8 sm:p-10">
            {renderContent()}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
