import { useQuery } from "@tanstack/react-query";
import { Mail, Send, Users, Database, TrendingUp, Activity } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface AdminStats {
  totalUsers: number;
  totalTemplates: number;
  totalDatasets: number;
  totalEmailsSent: number;
  emailsSentToday: number;
  emailsSentThisWeek: number;
  emailsSentThisMonth: number;
  totalReplies: number;
  hotLeads: number;
  coldLeads: number;
  deadLeads: number;
  recentActivity: Array<{
    id: string;
    action: string;
    userName: string;
    timestamp: string;
    details: string;
  }>;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: stats, isLoading, error } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated && !authLoading,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  useEffect(() => {
    if (error) {
      console.error("Admin stats error:", error);
      toast({
        title: "Error loading dashboard",
        description: error instanceof Error ? error.message : "Failed to load admin statistics",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  if (isLoading || authLoading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <Skeleton className="mb-2 h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          System-wide overview and analytics
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          icon={Users}
          testId="stat-total-users"
        />
        <StatCard
          title="Email Templates"
          value={stats?.totalTemplates || 0}
          icon={Mail}
          testId="stat-total-templates"
        />
        <StatCard
          title="Datasets"
          value={stats?.totalDatasets || 0}
          icon={Database}
          testId="stat-total-datasets"
        />
        <StatCard
          title="Total Emails Sent"
          value={stats?.totalEmailsSent || 0}
          icon={Send}
          testId="stat-total-emails"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Emails Today"
          value={stats?.emailsSentToday || 0}
          icon={TrendingUp}
          testId="stat-emails-today"
        />
        <StatCard
          title="Emails This Week"
          value={stats?.emailsSentThisWeek || 0}
          icon={TrendingUp}
          testId="stat-emails-week"
        />
        <StatCard
          title="Emails This Month"
          value={stats?.emailsSentThisMonth || 0}
          icon={TrendingUp}
          testId="stat-emails-month"
        />
        <StatCard
          title="Total Replies"
          value={stats?.totalReplies || 0}
          icon={Mail}
          testId="stat-total-replies"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <StatCard
          title="Hot Leads"
          value={stats?.hotLeads || 0}
          icon={TrendingUp}
          className="border-destructive/50"
          testId="stat-hot-leads"
        />
        <StatCard
          title="Cold Leads"
          value={stats?.coldLeads || 0}
          icon={Activity}
          testId="stat-cold-leads"
        />
        <StatCard
          title="Dead Leads"
          value={stats?.deadLeads || 0}
          icon={Activity}
          testId="stat-dead-leads"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {stats.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 border-b pb-4 last:border-0 last:pb-0"
                  data-testid={`activity-${activity.id}`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">
                      by {activity.userName} • {activity.timestamp}
                    </p>
                    {activity.details && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {activity.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              No recent activity
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
