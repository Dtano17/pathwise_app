import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import MainApp from "@/pages/MainApp";
import NotificationService from "@/components/NotificationService";

function App() {
  // Shared state for sidebar and main app communication
  const [selectedTheme, setSelectedTheme] = useState<string>('');
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showLocationDatePlanner, setShowLocationDatePlanner] = useState(false);
  const [showContacts, setShowContacts] = useState(false);

  // Custom sidebar width for better content display
  const style = {
    "--sidebar-width": "20rem",       // 320px for better content
    "--sidebar-width-icon": "4rem",   // default icon width
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider defaultOpen={false} style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar 
              selectedTheme={selectedTheme}
              onThemeSelect={setSelectedTheme}
              onShowThemeSelector={() => setShowThemeSelector(true)}
              onShowDatePlanner={() => setShowLocationDatePlanner(true)}
              onShowContacts={() => setShowContacts(true)}
            />
            <div className="flex flex-col flex-1">
              <MainApp 
                selectedTheme={selectedTheme}
                onThemeSelect={setSelectedTheme}
                showThemeSelector={showThemeSelector}
                onShowThemeSelector={setShowThemeSelector}
                showLocationDatePlanner={showLocationDatePlanner}
                onShowLocationDatePlanner={setShowLocationDatePlanner}
                showContacts={showContacts}
                onShowContacts={setShowContacts}
              />
            </div>
          </div>
        </SidebarProvider>
        <NotificationService userId="demo-user" />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;