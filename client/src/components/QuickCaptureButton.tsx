import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen, Pencil } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface QuickCaptureButtonProps {
  onClick: () => void;
  className?: string;
}

export default function QuickCaptureButton({ onClick, className = '' }: QuickCaptureButtonProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [dailyCaptureCount, setDailyCaptureCount] = useState(0);

  // Fetch today's journal entries to show badge count
  const { data: journalEntries } = useQuery<{ entries: any[] }>({
    queryKey: ['/api/journal/entries'],
  });

  // Count entries from today
  useEffect(() => {
    if (journalEntries?.entries) {
      const today = new Date().toISOString().split('T')[0];
      const todayCount = journalEntries.entries.filter((entry: any) => {
        return entry.timestamp?.startsWith(today);
      }).length;
      setDailyCaptureCount(todayCount);
    }
  }, [journalEntries]);

  // Hide on scroll down, show on scroll up (mobile UX)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Only hide/show on mobile
      if (window.innerWidth < 768) {
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          setIsVisible(false); // Scrolling down
        } else {
          setIsVisible(true); // Scrolling up
        }
      } else {
        setIsVisible(true); // Always visible on desktop
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Keyboard shortcut: Ctrl/Cmd + J
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
        e.preventDefault();
        onClick();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onClick]);

  return (
    <>
      {/* Mobile: Floating Action Button (Bottom Right) */}
      <div
        className={`md:hidden fixed bottom-6 right-6 z-50 transition-all duration-300 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'
        } ${className}`}
      >
        <Button
          onClick={onClick}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-br from-purple-500 to-emerald-500 hover:from-purple-600 hover:to-emerald-600 text-white relative group"
          aria-label="Quick Capture Journal"
        >
          <Pencil className="h-6 w-6" />

          {/* Badge for daily count */}
          {dailyCaptureCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-semibold animate-pulse">
              {dailyCaptureCount}
            </span>
          )}

          {/* Ripple effect on hover */}
          <span className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
        </Button>

        {/* Tooltip hint */}
        <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
            Quick Capture
            <div className="text-[10px] text-slate-300 mt-0.5">Tap to journal</div>
          </div>
        </div>
      </div>

      {/* Desktop: Sidebar Button (for when integrated) */}
      <Button
        onClick={onClick}
        variant="ghost"
        className="hidden md:flex items-center gap-2 w-full justify-start hover:bg-purple-50 dark:hover:bg-purple-900/20"
      >
        <BookOpen className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        <span className="text-sm font-medium">Quick Capture</span>
        {dailyCaptureCount > 0 && (
          <span className="ml-auto bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs px-2 py-0.5 rounded-full">
            {dailyCaptureCount}
          </span>
        )}
        <span className="ml-auto text-xs text-slate-400 hidden lg:inline">⌘J</span>
      </Button>
    </>
  );
}
