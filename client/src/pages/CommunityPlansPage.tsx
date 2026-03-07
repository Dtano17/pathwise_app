import { Button } from "@/components/ui/button";
import { ArrowLeft, Megaphone, Compass, Upload } from "lucide-react";
import { Link, useLocation } from "wouter";
import DiscoverPlansView from "@/components/discover/DiscoverPlansView";
import ThemeToggle from "@/components/ThemeToggle";

export default function CommunityPlansPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header - Matching Landing/Import pattern */}
      <header className="fixed top-0 sm:top-6 left-0 sm:left-1/2 sm:-translate-x-1/2 z-50 w-full sm:w-[95%] sm:max-w-4xl bg-background sm:bg-background/80 sm:backdrop-blur-md sm:rounded-full shadow-sm sm:shadow-lg border-b sm:border border-border/10 sm:border-border/50 transition-all duration-300 pt-[env(safe-area-inset-top)] sm:pt-0">
        <div className="flex flex-col sm:flex-row items-center justify-between w-full">
          {/* Top Row */}
          <div className="px-4 py-3 sm:px-6 sm:py-3 flex items-center justify-between w-full sm:h-16 relative">
            {/* Back + Logo */}
            <div className="flex items-center gap-1 z-10">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:hidden"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <img
                src="/icons/web/android-chrome-192x192.png"
                alt="JournalMate"
                className="h-7 w-7 sm:h-8 sm:w-8 object-contain shrink-0"
              />
              <span className="font-bold text-[19px] sm:text-xl tracking-tight text-foreground whitespace-nowrap pt-0.5">
                JournalMate
              </span>
            </div>

            {/* Desktop Center Nav */}
            <div className="hidden sm:flex items-center gap-1 absolute left-1/2 -translate-x-1/2 w-max">
              <Link href="/discover">
                <Button variant="ghost" size="sm" className="rounded-full bg-primary/10 text-primary font-medium text-sm px-4">
                  Discover
                </Button>
              </Link>
              <Link href="/import-plan">
                <Button variant="ghost" size="sm" className="rounded-full hover:bg-muted font-medium text-sm px-4">
                  Import
                </Button>
              </Link>
              <Link href="/updates">
                <Button variant="ghost" size="sm" className="rounded-full hover:bg-muted font-medium text-sm px-4">
                  Updates
                </Button>
              </Link>
            </div>

            {/* Theme toggle + Sign In */}
            <div className="flex items-center gap-3 sm:gap-2 z-10">
              <ThemeToggle />
              <Link href="/login" className="flex items-center">
                <Button size="sm" variant="outline" className="sm:hidden rounded-lg bg-transparent hover:bg-muted font-semibold px-4 h-8 text-[13px] border-border/50 text-foreground">
                  Sign In
                </Button>
                <Button size="sm" className="hidden sm:flex rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 h-9 text-sm shadow-sm hover:shadow-md transition-shadow">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>

          {/* Mobile Bottom Row (Nav Pills) */}
          <div className="sm:hidden w-full">
            <div className="mx-6 h-px bg-border/30" />
            <div className="flex items-center justify-center py-3 gap-2.5">
              <Button variant="default" size="sm" className="h-8 px-3.5 rounded-full bg-sky-500 dark:bg-sky-600 hover:bg-sky-600 dark:hover:bg-sky-500 text-white font-medium text-[13px] shadow-sm flex items-center border border-transparent transition-colors">
                <Compass className="h-3.5 w-3.5 mr-1.5" />
                Discover
              </Button>
              <Link href="/import-plan">
                <Button variant="outline" size="sm" className="h-8 px-3.5 rounded-full bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800/50 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40 font-medium text-[13px] shadow-sm flex items-center transition-colors">
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Import
                </Button>
              </Link>
              <Link href="/updates">
                <Button variant="outline" size="sm" className="h-8 px-3.5 rounded-full bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800/50 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/40 font-medium text-[13px] shadow-sm flex items-center transition-colors">
                  <Megaphone className="h-3.5 w-3.5 mr-1.5" />
                  Updates
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-[104px] sm:h-[88px] safe-top sm:!pt-0" />

      {/* Discover Plans View */}
      <div className="container mx-auto px-4 pb-24 max-w-7xl">
        <DiscoverPlansView />
      </div>
    </div>
  );
}
