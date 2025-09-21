import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import ThemeToggle from "@/components/ThemeToggle";
import MainApp from "@/pages/MainApp";

function App() {
  // Shared state for sidebar and main app communication
  const [selectedTheme, setSelectedTheme] = useState<string>('');
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showLocationDatePlanner, setShowLocationDatePlanner] = useState(false);

  // Custom sidebar width for better content display
  const style = {
    "--sidebar-width": "20rem",       // 320px for better content
    "--sidebar-width-icon": "4rem",   // default icon width
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar 
              selectedTheme={selectedTheme}
              onThemeSelect={setSelectedTheme}
              onShowThemeSelector={() => setShowThemeSelector(true)}
              onShowDatePlanner={() => setShowLocationDatePlanner(true)}
            />
            <div className="flex flex-col flex-1">
              <header className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <div className="flex items-center gap-4">
                  <h1 className="text-lg font-semibold">PathWise.ai</h1>
                  <ThemeToggle />
                </div>
              </header>
              <main className="flex-1 overflow-hidden">
                <MainApp 
                  selectedTheme={selectedTheme}
                  onThemeSelect={setSelectedTheme}
                  showThemeSelector={showThemeSelector}
                  onShowThemeSelector={setShowThemeSelector}
                  showLocationDatePlanner={showLocationDatePlanner}
                  onShowLocationDatePlanner={setShowLocationDatePlanner}
                />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;