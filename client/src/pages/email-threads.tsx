import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Mail, Flame, Snowflake, X as XIcon, ChevronRight, ChevronLeft, Reply, Forward } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { EmailThread } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ComposeDialog } from "@/components/compose-dialog";

export default function EmailThreads() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [threadMessages, setThreadMessages] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentTab, setCurrentTab] = useState("all");
  const itemsPerPage = 20;
  const [composeDialogOpen, setComposeDialogOpen] = useState(false);
  const [composeMode, setComposeMode] = useState<"compose" | "reply" | "forward">("compose");
  const [composeEmail, setComposeEmail] = useState<any>(null);

  // Reset to page 1 when changing tabs
  useEffect(() => {
    setCurrentPage(1);
  }, [currentTab]);

  const { data: threads, isLoading } = useQuery<EmailThread[]>({
    queryKey: ["/api/email-threads", currentTab],
    enabled: isAuthenticated && !authLoading,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  const updateThreadStatusMutation = useMutation({
    mutationFn: async ({
      threadId,
      leadStatus,
    }: {
      threadId: string;
      leadStatus: string;
    }) => {
      return await apiRequest("PATCH", `/api/email-threads/${threadId}/status`, {
        leadStatus,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-threads"] });
      toast({
        title: "Success",
        description: "Thread status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update thread status",
        variant: "destructive",
      });
    },
  });

  const handleOpenThread = async (thread: EmailThread) => {
    try {
      const response = await fetch(`/api/email-threads/${thread.id}`);
      const data = await response.json();
      setThreadMessages(data.messages || []);
      setSelectedThread(thread);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load thread messages",
        variant: "destructive",
      });
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

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

  const getFilteredThreads = (status: string) => {
    if (!threads) return [];
    
    // Filter to only show threads with multiple messages (actual conversations)
    const multiMessageThreads = threads.filter((thread) => thread.messageCount > 1);
    
    // Apply pagination on client-side for now
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedThreads = multiMessageThreads.slice(start, end);
    
    if (status === "all") return paginatedThreads;
    if (status === "unassigned") {
      return paginatedThreads.filter((thread) => !thread.leadStatus || thread.leadStatus === "");
    }
    return paginatedThreads.filter((thread) => thread.leadStatus === status);
  };

  const getTotalForStatus = (status: string) => {
    if (!threads) return 0;
    const multiMessageThreads = threads.filter((thread) => thread.messageCount > 1);
    
    if (status === "all") return multiMessageThreads.length;
    if (status === "unassigned") {
      return multiMessageThreads.filter((thread) => !thread.leadStatus || thread.leadStatus === "").length;
    }
    return multiMessageThreads.filter((thread) => thread.leadStatus === status).length;
  };

  const totalForStatus = getTotalForStatus(currentTab);
  const totalPages = Math.ceil(totalForStatus / itemsPerPage);

  return (
    <>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Threads</h1>
          <p className="text-muted-foreground">
            View and manage email conversations from sales@hackure.in (auto-syncs every minute)
          </p>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all">
              All Threads
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
            <TabsTrigger value="unassigned" data-testid="tab-unassigned">
              Unassigned
            </TabsTrigger>
          </TabsList>

          {["all", "hot", "cold", "dead", "unassigned"].map((status) => (
            <TabsContent key={status} value={status}>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {status === "all" ? "All Email Threads" : `${status.charAt(0).toUpperCase() + status.slice(1)} Leads`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {threads && getFilteredThreads(status).length > 0 ? (
                    <>
                      <div className="space-y-2">
                        {getFilteredThreads(status).map((thread) => (
                          <Card 
                            key={thread.id} 
                            className="hover-elevate cursor-pointer"
                            onClick={() => handleOpenThread(thread)}
                            data-testid={`card-thread-${thread.id}`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold truncate">{thread.subject}</h3>
                                    {thread.unreadCount > 0 && (
                                      <Badge variant="default" className="text-xs">
                                        {thread.unreadCount} new
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span className="truncate font-mono">
                                      {thread.participantEmails.join(", ")}
                                    </span>
                                    <span>•</span>
                                    <span>{thread.messageCount} messages</span>
                                    <span>•</span>
                                    <span>
                                      {thread.lastMessageAt
                                        ? formatDistanceToNow(new Date(thread.lastMessageAt), { addSuffix: true })
                                        : "Unknown"}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                  <Select
                                    value={thread.leadStatus || "unassigned"}
                                    onValueChange={(leadStatus) =>
                                      updateThreadStatusMutation.mutate({
                                        threadId: thread.id,
                                        leadStatus,
                                      })
                                    }
                                  >
                                    <SelectTrigger
                                      className="w-36"
                                      data-testid={`select-lead-${thread.id}`}
                                    >
                                      <div className="flex items-center gap-2">
                                        {getLeadIcon(thread.leadStatus || "unassigned")}
                                        <SelectValue />
                                      </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="hot">
                                        <div className="flex items-center gap-2">
                                          <Flame className="h-4 w-4" />
                                          Hot
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="cold">
                                        <div className="flex items-center gap-2">
                                          <Snowflake className="h-4 w-4" />
                                          Cold
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="dead">
                                        <div className="flex items-center gap-2">
                                          <XIcon className="h-4 w-4" />
                                          Dead
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="unassigned">Unassigned</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalForStatus)} of {totalForStatus} threads (Page {currentPage} of {totalPages || 1})
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            data-testid="button-previous-page"
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => p + 1)}
                            disabled={currentPage >= totalPages}
                            data-testid="button-next-page"
                          >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <Mail className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="mb-2 text-sm font-medium">No email threads found</p>
                      <p className="text-sm text-muted-foreground">
                        {status === "all"
                          ? "Emails are automatically synced every minute. Threads will appear here once you have conversations with multiple messages."
                          : `No ${status} leads at the moment`}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <Dialog open={!!selectedThread} onOpenChange={() => setSelectedThread(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedThread?.subject}</DialogTitle>
            <DialogDescription>
              Email thread with {selectedThread?.messageCount} messages
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {threadMessages.map((message: any, index) => (
                <Card key={message.id || index}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">
                          {'senderEmail' in message ? message.senderName || message.senderEmail : 'You'}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {'senderEmail' in message ? message.senderEmail : message.recipientEmail}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {message.sentAt 
                          ? new Date(message.sentAt).toLocaleString()
                          : message.receivedAt 
                          ? new Date(message.receivedAt).toLocaleString()
                          : "Unknown"}
                      </div>
                    </div>
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: message.body || message.bodyPreview || '' }}
                    />
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setComposeMode("reply");
                          setComposeEmail(message);
                          setComposeDialogOpen(true);
                        }}
                        data-testid="button-reply"
                      >
                        <Reply className="h-3 w-3 mr-1" />
                        Reply
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setComposeMode("forward");
                          setComposeEmail(message);
                          setComposeDialogOpen(true);
                        }}
                        data-testid="button-forward"
                      >
                        <Forward className="h-3 w-3 mr-1" />
                        Forward
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <ComposeDialog
        open={composeDialogOpen}
        onOpenChange={setComposeDialogOpen}
        mode={composeMode}
        originalEmail={composeEmail ? {
          id: composeEmail.id,
          senderEmail: composeEmail.senderEmail || composeEmail.recipientEmail,
          recipientEmail: composeEmail.recipientEmail,
          subject: composeEmail.subject || selectedThread?.subject || "",
          body: composeEmail.body || composeEmail.bodyPreview || "",
          senderName: composeEmail.senderName,
          recipientName: composeEmail.recipientName,
        } : undefined}
      />
    </>
  );
}
