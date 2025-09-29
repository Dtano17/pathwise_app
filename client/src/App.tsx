import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import MainApp from "@/pages/MainApp";
import SharedActivity from "@/pages/SharedActivity";
import NotificationService from "@/components/NotificationService";

function App() {
  // Shared state for sidebar and main app communication
  const [selectedTheme, setSelectedTheme] = useState<string>('');
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showLocationDatePlanner, setShowLocationDatePlanner] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [showLifestylePlanner, setShowLifestylePlanner] = useState(false);

  // Custom sidebar width for better content display
  const style = {
    "--sidebar-width": "20rem",       // 320px for better content
    "--sidebar-width-icon": "4rem",   // default icon width
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Switch>
          {/* Shared Activity Page (no sidebar) */}
          <Route path="/share/activity/:token" component={SharedActivity} />
          
          {/* Main App with Sidebar */}
          <Route>
            <SidebarProvider defaultOpen={window.innerWidth >= 1024} style={style as React.CSSProperties}>
              <div className="flex h-screen w-full overflow-auto">
                <AppSidebar 
                  selectedTheme={selectedTheme}
                  onThemeSelect={setSelectedTheme}
                  onShowThemeSelector={() => setShowThemeSelector(true)}
                  onShowDatePlanner={() => setShowLocationDatePlanner(true)}
                  onShowContacts={() => setShowContacts(true)}
                  onShowChatHistory={() => setShowChatHistory(true)}
                  onShowLifestylePlanner={() => setShowLifestylePlanner(true)}
                />
                <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                  <MainApp 
                    selectedTheme={selectedTheme}
                    onThemeSelect={setSelectedTheme}
                    showThemeSelector={showThemeSelector}
                    onShowThemeSelector={setShowThemeSelector}
                    showLocationDatePlanner={showLocationDatePlanner}
                    onShowLocationDatePlanner={setShowLocationDatePlanner}
                    showContacts={showContacts}
                    onShowContacts={setShowContacts}
                    showChatHistory={showChatHistory}
                    onShowChatHistory={setShowChatHistory}
                    showLifestylePlanner={showLifestylePlanner}
                    onShowLifestylePlanner={setShowLifestylePlanner}
                  />
                </div>
              </div>
            </SidebarProvider>
          </Route>
        </Switch>
        <NotificationService userId="demo-user" />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;