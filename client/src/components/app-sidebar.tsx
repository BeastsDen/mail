import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Mail,
  Send,
  Database,
  FileText,
  Settings,
  Activity,
  Users,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const [location] = useLocation();
  const { user, isAdmin } = useAuth();

  const adminItems = [
    {
      title: "Dashboard",
      url: "/",
      icon: LayoutDashboard,
    },
    {
      title: "Email Templates",
      url: "/templates",
      icon: FileText,
    },
    {
      title: "Datasets",
      url: "/datasets",
      icon: Database,
    },
    {
      title: "All Emails",
      url: "/emails",
      icon: Mail,
    },
    {
      title: "Users",
      url: "/users",
      icon: Users,
    },
    {
      title: "Activity Logs",
      url: "/logs",
      icon: Activity,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
    },
  ];

  const salesItems = [
    {
      title: "Dashboard",
      url: "/",
      icon: LayoutDashboard,
    },
    {
      title: "Send Email",
      url: "/send",
      icon: Send,
    },
    {
      title: "My Emails",
      url: "/emails",
      icon: Mail,
    },
    {
      title: "Datasets",
      url: "/datasets",
      icon: Database,
    },
  ];

  const items = isAdmin ? adminItems : salesItems;

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Mail className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Email Manager</span>
            <Badge
              variant={isAdmin ? "default" : "secondary"}
              className="w-fit text-xs"
              data-testid={`badge-role-${user?.role}`}
            >
              {user?.role?.toUpperCase()}
            </Badge>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3 rounded-md border border-sidebar-border bg-sidebar-accent p-3">
          <Avatar className="h-9 w-9" data-testid="avatar-user">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-sm font-medium" data-testid="text-user-name">
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.email || "User"}
            </span>
            <span className="truncate text-xs text-muted-foreground" data-testid="text-user-email">
              {user?.email}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          className="mt-2 w-full justify-start"
          onClick={() => window.location.href = "/api/logout"}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4" />
          <span>Log Out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
