import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import AdminDashboard from "@/pages/admin-dashboard";
import SalesDashboard from "@/pages/sales-dashboard";
import Templates from "@/pages/templates";
import Datasets from "@/pages/datasets";
import SendEmail from "@/pages/send-email";
import EmailThreads from "@/pages/email-threads";
import Users from "@/pages/emails";
import Logs from "@/pages/logs";
import Settings from "@/pages/settings";

function Router() {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Login} />
        <Route component={Login} />
      </Switch>
    );
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-16 items-center border-b px-6">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-y-auto">
            <Switch>
              {isAdmin ? (
                <>
                  <Route path="/" component={AdminDashboard} />
                  <Route path="/send" component={SendEmail} />
                  <Route path="/templates" component={Templates} />
                  <Route path="/datasets" component={Datasets} />
                  <Route path="/emails" component={EmailThreads} />
                  <Route path="/users" component={Users} />
                  <Route path="/logs" component={Logs} />
                  <Route path="/settings" component={Settings} />
                </>
              ) : (
                <>
                  <Route path="/" component={SalesDashboard} />
                  <Route path="/send" component={SendEmail} />
                  <Route path="/emails" component={EmailThreads} />
                  <Route path="/datasets" component={Datasets} />
                  <Route path="/settings" component={Settings} />
                </>
              )}
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
