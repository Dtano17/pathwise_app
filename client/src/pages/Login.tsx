import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { SocialLogin } from '@/components/SocialLogin';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const journalMateLogo = '/journalmate-logo-transparent.png';
const heroVideoUrl = 'https://storage.googleapis.com/pathwise-media/public/hero_video.mp4';

export default function Login() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [copyingActivity, setCopyingActivity] = useState(false);

  useEffect(() => {
    // If already authenticated, check for share token to copy activity
    if (isAuthenticated && !copyingActivity) {
      const params = new URLSearchParams(window.location.search);
      const shareToken = params.get('shareToken');
      const returnTo = params.get('returnTo');

      // If there's a share token, copy the activity first with retry logic
      if (shareToken) {
        setCopyingActivity(true);

        // Add a small delay to allow session to fully establish
        const attemptCopy = (retries = 3, delay = 500) => {
          const nextDelay = delay * 1.5; // Calculate next delay before setTimeout

          setTimeout(() => {
            fetch(`/api/activities/copy/${shareToken}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            })
              .then(res => res.json())
              .then(data => {
                if (data.activity?.id) {
                  // Success - redirect to the copied activity
                  window.location.href = `/?activity=${data.activity.id}`;
                } else if (data.requiresAuth && retries > 0) {
                  // Session not ready yet, retry with exponential backoff
                  console.log(`Session not ready, retrying in ${Math.round(nextDelay)}ms... (${retries} attempts left)`);
                  attemptCopy(retries - 1, nextDelay);
                } else {
                  // Copy failed, redirect to returnTo or home
                  console.error('Failed to copy activity:', data.error || 'Unknown error');
                  if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
                    window.location.href = returnTo;
                  } else {
                    setLocation('/');
                  }
                }
              })
              .catch(error => {
                console.error('Failed to copy activity:', error);
                if (retries > 0) {
                  // Network error, retry with exponential backoff
                  console.log(`Network error, retrying in ${Math.round(nextDelay)}ms... (${retries} attempts left)`);
                  attemptCopy(retries - 1, nextDelay);
                } else {
                  // Max retries reached, redirect to returnTo or home
                  if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
                    window.location.href = returnTo;
                  } else {
                    setLocation('/');
                  }
                }
              });
          }, delay);
        };

        // Start the copy attempt with retry logic
        attemptCopy();
        return;
      }

      // No share token, just redirect normally
      if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
        window.location.href = returnTo;
      } else {
        setLocation('/');
      }
    }
  }, [isAuthenticated, setLocation, copyingActivity]);

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

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />

      {/* Fixed Top Header */}
      <div className="sticky top-0 z-30 safe-top">
        <div className="px-4 py-3">
          <Link href="/">
            <button className="flex items-center gap-2 text-white/80 hover:text-white transition-colors group text-sm font-medium">
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              Back to Home
            </button>
          </Link>
        </div>
      </div>

      {/* Centered Card */}
      <div className="flex-1 flex items-center justify-center px-4 pb-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <div className="bg-white/10 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl p-8 sm:p-10">
            {/* Logo and Branding */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-purple-500/30 blur-2xl rounded-full scale-150" />
                  <img
                    src={journalMateLogo}
                    alt="JournalMate"
                    className="w-24 h-24 sm:w-28 sm:h-28 relative z-10 drop-shadow-lg"
                  />
                </div>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
                JournalMate
              </h1>
              <p className="text-white/60 text-sm font-medium">
                Your AI-powered life planning companion
              </p>
            </div>

            {/* Social Login Component */}
            <div className="space-y-6">
              <SocialLogin
                title="Welcome back"
                description="Sign in to continue your journey"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
