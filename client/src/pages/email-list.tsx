import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Mail, Flame, Snowflake, X as XIcon, X, Reply, Forward, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SentEmail } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { ComposeDialog } from "@/components/compose-dialog";

export default function EmailList() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [selectedEmail, setSelectedEmail] = useState<SentEmail | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [composeDialogOpen, setComposeDialogOpen] = useState(false);
  const [composeMode, setComposeMode] = useState<"compose" | "reply" | "forward">("compose");
  const [composeEmail, setComposeEmail] = useState<SentEmail | null>(null);

  const { data: emails, isLoading } = useQuery<SentEmail[]>({
    queryKey: ["/api/emails"],
    enabled: isAuthenticated && !authLoading,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
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

  const updateLeadStatusMutation = useMutation({
    mutationFn: async ({
      emailId,
      leadStatus,
    }: {
      emailId: string;
      leadStatus: string;
    }) => {
      return await apiRequest("PATCH", `/api/emails/${emailId}/lead-status`, {
        leadStatus,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Success",
        description: "Lead status updated successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to update lead status",
        variant: "destructive",
      });
    },
  });

  if (isLoading || authLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      { variant: "default" | "secondary" | "destructive"; className?: string }
    > = {
      sent: { variant: "secondary" },
      delivered: { variant: "default", className: "bg-green-600 hover:bg-green-700" },
      failed: { variant: "destructive" },
      pending: { variant: "secondary", className: "bg-yellow-600 hover:bg-yellow-700" },
      opened: { variant: "default", className: "bg-blue-600 hover:bg-blue-700" },
      replied: { variant: "default", className: "bg-purple-600 hover:bg-purple-700" },
    };

    const config = variants[status] || { variant: "secondary" as const };

    return (
      <Badge variant={config.variant} className={config.className}>
        {status?.toUpperCase()}
      </Badge>
    );
  };

  const getLeadIcon = (leadStatus: string) => {
    switch (leadStatus) {
      case "hot":
        return <Flame className="h-4 w-4 text-destructive" />;
      case "cold":
        return <Snowflake className="h-4 w-4 text-blue-500" />;
      case "dead":
        return <XIcon className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const filterByLeadStatus = (status: string) => {
    if (!emails) return [];
    let filtered = emails;
    
    if (status !== "all") {
      filtered = filtered.filter((email) => email.leadStatus === status);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((email) => {
        const recipientMatch = email.recipientEmail?.toLowerCase().includes(query);
        const subjectMatch = email.subject?.toLowerCase().includes(query);
        const bodyMatch = email.body?.toLowerCase().includes(query);
        return recipientMatch || subjectMatch || bodyMatch;
      });
    }
    
    return filtered;
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Emails</h1>
        <p className="text-muted-foreground">
          View and manage sent emails and lead categorization
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by email, subject, or content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-emails"
        />
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">
            All Emails
          </TabsTrigger>
          <TabsTrigger value="hot" data-testid="tab-hot">
            <Flame className="mr-1 h-4 w-4" />
            Hot Leads
          </TabsTrigger>
          <TabsTrigger value="cold" data-testid="tab-cold">
            <Snowflake className="mr-1 h-4 w-4" />
            Cold Leads
          </TabsTrigger>
          <TabsTrigger value="dead" data-testid="tab-dead">
            <XIcon className="mr-1 h-4 w-4" />
            Dead Leads
          </TabsTrigger>
        </TabsList>

        {["all", "hot", "cold", "dead"].map((status) => (
          <TabsContent key={status} value={status}>
            <Card>
              <CardHeader>
                <CardTitle>
                  {status === "all" ? "All Emails" : `${status.charAt(0).toUpperCase() + status.slice(1)} Leads`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {emails && filterByLeadStatus(status).length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Lead Status</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterByLeadStatus(status).map((email) => (
                        <TableRow 
                          key={email.id} 
                          data-testid={`row-email-${email.id}`}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedEmail(email)}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {email.recipientName || "Unknown"}
                              </p>
                              <p className="text-xs font-mono text-muted-foreground">
                                {email.recipientEmail}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-md truncate">
                            {email.subject}
                          </TableCell>
                          <TableCell>{getStatusBadge(email.status || "sent")}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getLeadIcon(email.leadStatus || "unassigned")}
                              <span className="text-sm capitalize">
                                {email.leadStatus || "unassigned"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {email.sentAt
                              ? new Date(email.sentAt).toLocaleString()
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={email.leadStatus || "unassigned"}
                              onValueChange={(leadStatus) =>
                                updateLeadStatusMutation.mutate({
                                  emailId: email.id,
                                  leadStatus,
                                })
                              }
                            >
                              <SelectTrigger
                                className="w-32"
                                data-testid={`select-lead-${email.id}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="hot">🔥 Hot</SelectItem>
                                <SelectItem value="cold">❄️ Cold</SelectItem>
                                <SelectItem value="dead">✕ Dead</SelectItem>
                                <SelectItem value="unassigned">— Unassigned</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                      <Mail className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="mb-2 text-sm font-medium">No emails found</p>
                    <p className="text-sm text-muted-foreground">
                      {status === "all"
                        ? "Start by sending your first email campaign"
                        : `No ${status} leads at the moment`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
            <DialogTitle>Email Details</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-4 overflow-y-auto flex-1">
              <div className="border-b pb-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm text-muted-foreground">To</p>
                    <p className="font-medium">{selectedEmail.recipientName || selectedEmail.recipientEmail}</p>
                    <p className="text-sm text-muted-foreground font-mono">{selectedEmail.recipientEmail}</p>
                  </div>
                  {getStatusBadge(selectedEmail.status || "sent")}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Subject</p>
                <p className="font-semibold">{selectedEmail.subject}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Lead Status</p>
                <Select
                  defaultValue={selectedEmail.leadStatus || "unassigned"}
                  onValueChange={(leadStatus) =>
                    updateLeadStatusMutation.mutate({
                      emailId: selectedEmail.id,
                      leadStatus,
                    })
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hot">🔥 Hot</SelectItem>
                    <SelectItem value="cold">❄️ Cold</SelectItem>
                    <SelectItem value="dead">✕ Dead</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setComposeMode("reply");
                    setComposeEmail(selectedEmail);
                    setComposeDialogOpen(true);
                  }}
                  data-testid="button-reply"
                >
                  <Reply className="h-4 w-4 mr-2" />
                  Reply
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setComposeMode("forward");
                    setComposeEmail(selectedEmail);
                    setComposeDialogOpen(true);
                  }}
                  data-testid="button-forward"
                >
                  <Forward className="h-4 w-4 mr-2" />
                  Forward
                </Button>
              </div>
              <div className="border-t pt-4 flex-1 overflow-hidden flex flex-col">
                <p className="text-sm text-muted-foreground mb-2">Message</p>
                <div className="bg-muted p-4 rounded-md overflow-y-auto flex-1 prose prose-sm dark:prose-invert max-w-none">
                  {selectedEmail.body ? (
                    selectedEmail.body.startsWith("<") ? (
                      <div 
                        dangerouslySetInnerHTML={{ 
                          __html: selectedEmail.body.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") 
                        }} 
                        className="[&_img]:max-w-full [&_img]:h-auto [&_a]:text-blue-600 [&_a]:underline dark:[&_a]:text-blue-400 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2 [&_th]:bg-muted [&_p]:my-2 [&_div]:my-2"
                      />
                    ) : (
                      <div className="text-sm whitespace-pre-wrap">{selectedEmail.body}</div>
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No message body available</p>
                  )}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Sent: {selectedEmail.sentAt ? new Date(selectedEmail.sentAt).toLocaleString() : "-"}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ComposeDialog
        open={composeDialogOpen}
        onOpenChange={setComposeDialogOpen}
        mode={composeMode}
        originalEmail={composeEmail ? {
          id: composeEmail.id,
          recipientEmail: composeEmail.recipientEmail,
          subject: composeEmail.subject,
          body: composeEmail.body,
          recipientName: composeEmail.recipientName || undefined,
        } : undefined}
      />
    </div>
  );
}
