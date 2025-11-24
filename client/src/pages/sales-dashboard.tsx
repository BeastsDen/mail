import { useQuery } from "@tanstack/react-query";
import { Mail, Send, TrendingUp, Flame, Snowflake, X } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface SalesStats {
  emailsSentToday: number;
  emailsSentThisWeek: number;
  emailsSentThisMonth: number;
  emailsSentThisYear: number;
  totalReplies: number;
  hotLeads: number;
  coldLeads: number;
  deadLeads: number;
  openRate: number;
  replyRate: number;
  emailTrends: Array<{ date: string; count: number }>;
  leadBreakdown: Array<{ status: string; count: number }>;
}

export default function SalesDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: stats, isLoading } = useQuery<SalesStats>({
    queryKey: ["/api/sales/stats"],
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
        <h1 className="text-3xl font-bold tracking-tight">Sales Dashboard</h1>
        <p className="text-muted-foreground">
          Your email campaign performance at a glance
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Emails Today"
          value={stats?.emailsSentToday || 0}
          icon={Send}
          testId="stat-emails-today"
        />
        <StatCard
          title="Emails This Week"
          value={stats?.emailsSentThisWeek || 0}
          icon={Mail}
          testId="stat-emails-week"
        />
        <StatCard
          title="Emails This Month"
          value={stats?.emailsSentThisMonth || 0}
          icon={TrendingUp}
          testId="stat-emails-month"
        />
        <StatCard
          title="Emails This Year"
          value={stats?.emailsSentThisYear || 0}
          icon={TrendingUp}
          testId="stat-emails-year"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Replies"
          value={stats?.totalReplies || 0}
          icon={Mail}
          testId="stat-total-replies"
        />
        <StatCard
          title="Hot Leads"
          value={stats?.hotLeads || 0}
          icon={Flame}
          className="border-destructive/50 bg-destructive/5"
          testId="stat-hot-leads"
        />
        <StatCard
          title="Cold Leads"
          value={stats?.coldLeads || 0}
          icon={Snowflake}
          testId="stat-cold-leads"
        />
        <StatCard
          title="Dead Leads"
          value={stats?.deadLeads || 0}
          icon={X}
          testId="stat-dead-leads"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Email Sending Trends</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.emailTrends && stats.emailTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.emailTrends}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Categorization</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.leadBreakdown && stats.leadBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.leadBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="status"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
