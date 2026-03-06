import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const heroVideoUrl = 'https://storage.googleapis.com/pathwise-media/public/hero_video.mp4';

export default function ForgotPassword() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        setSent(true);
        toast({
          title: "Check your email",
          description: "If an account exists with that email, we've sent a password reset link."
        });
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      <video autoPlay muted playsInline loop poster="/hero_poster.jpg" className="absolute inset-0 w-full h-full object-cover blur-sm scale-105">
        <source src={heroVideoUrl} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />

      <div className="sticky top-0 z-30 safe-top">
        <div className="px-4 py-3">
          <Link href="/email-auth">
            <button className="flex items-center gap-2 text-white/80 hover:text-white transition-colors group text-sm font-medium">
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              Back to Sign In
            </button>
          </Link>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <div className="bg-white/10 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl p-8 sm:p-10">
            {sent ? (
              <div className="text-center space-y-4">
                <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto" />
                <h1 className="text-2xl font-bold text-white">Check Your Email</h1>
                <p className="text-white/70 text-sm">
                  If an account exists with <strong className="text-white">{email}</strong>, you'll receive a password reset link shortly.
                </p>
                <p className="text-white/40 text-xs">Check your spam folder if you don't see it.</p>
                <Link href="/email-auth">
                  <Button className="mt-4 bg-white/20 hover:bg-white/30 text-white border border-white/20">
                    Back to Sign In
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold text-white">Reset Password</h1>
                  <p className="text-white/60 text-sm mt-2">
                    Enter your email and we'll send you a link to reset your password.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email" className="text-white/80">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/40"
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/20"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>
                    ) : (
                      'Send Reset Link'
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
