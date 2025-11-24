import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Inbox as InboxIcon, ChevronLeft, ChevronRight, Flame, Snowflake, X as XIcon, Mail as MailIcon, X } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ReceivedEmail } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

const LeadStatusSelector = ({ email, onStatusChange }: { email: ReceivedEmail; onStatusChange: (status: string) => void }) => {
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

  return (
    <Select
      defaultValue="unassigned"
      onValueChange={onStatusChange}
    >
      <SelectTrigger
        className="w-32"
        data-testid={`select-lead-${email.id}`}
      >
        <div className="flex items-center gap-2">
          {getLeadIcon("unassigned")}
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
  );
};

export default function Inbox() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEmail, setSelectedEmail] = useState<ReceivedEmail | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const itemsPerPage = 20;

  const { data, isLoading } = useQuery<{ emails: ReceivedEmail[], total: number }>({
    queryKey: ["/api/emails/received"],
    enabled: isAuthenticated && !authLoading,
    refetchInterval: 10000,
  });

  const updateEmailLeadStatusMutation = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ["/api/emails/received"] });
      toast({
        title: "Success",
        description: "Lead status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update lead status",
        variant: "destructive",
      });
    },
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

  const allEmails = data?.emails || [];
  const totalEmails = data?.total || 0;

  const getFilteredEmails = () => {
    if (filterStatus === "all") return allEmails;
    return allEmails.filter((e) => e.leadStatus === filterStatus);
  };

  const filteredEmails = getFilteredEmails();
  const paginatedEmails = filteredEmails.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredEmails.length / itemsPerPage);

  if (isLoading || authLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  const getReadBadge = (isRead: boolean) => {
    return isRead ? (
      <Badge variant="secondary" data-testid="badge-read">
        Read
      </Badge>
    ) : (
      <Badge variant="default" className="bg-blue-600 hover:bg-blue-700" data-testid="badge-unread">
        Unread
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-inbox">Inbox</h1>
        <p className="text-muted-foreground">
          View received emails and replies (auto-refreshes every 10 seconds)
        </p>
      </div>

      <Tabs value={filterStatus} onValueChange={(status) => {
        setFilterStatus(status);
        setCurrentPage(1);
      }} className="space-y-4">
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
          <TabsTrigger value="unassigned" data-testid="tab-unassigned">
            Unassigned
          </TabsTrigger>
        </TabsList>

        {["all", "hot", "cold", "dead", "unassigned"].map((status) => (
          <TabsContent key={status} value={status}>
            <Card>
              <CardHeader>
                <CardTitle>
                  {status === "all" ? "All Emails" : `${status.charAt(0).toUpperCase() + status.slice(1)} Leads`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paginatedEmails && paginatedEmails.length > 0 ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>From</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Preview</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Lead</TableHead>
                          <TableHead>Received</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedEmails.map((email) => (
                          <TableRow 
                            key={email.id} 
                            data-testid={`row-email-${email.id}`}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setSelectedEmail(email)}
                          >
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {email.senderName || "Unknown"}
                                </p>
                                <p className="text-xs font-mono text-muted-foreground">
                                  {email.senderEmail}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-md truncate font-medium">
                              {email.subject}
                            </TableCell>
                            <TableCell className="max-w-sm truncate text-sm text-muted-foreground">
                              {email.bodyPreview || "No preview"}
                            </TableCell>
                            <TableCell>{getReadBadge(email.isRead)}</TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <LeadStatusSelector
                                email={email}
                                onStatusChange={(leadStatus) =>
                                  updateEmailLeadStatusMutation.mutate({
                                    emailId: email.id,
                                    leadStatus,
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell className="text-sm">
                              {email.receivedAt
                                ? new Date(email.receivedAt).toLocaleString()
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredEmails.length)} of {filteredEmails.length} emails
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
                      <InboxIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="mb-2 text-sm font-medium">No emails found</p>
                    <p className="text-sm text-muted-foreground">
                      {status === "all"
                        ? "Emails will appear here once they are synced from your mailbox"
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0">
            <DialogTitle>Email Details</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-4">
              <div className="border-b pb-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm text-muted-foreground">From</p>
                    <p className="font-medium">{selectedEmail.senderName || selectedEmail.senderEmail}</p>
                    <p className="text-sm text-muted-foreground font-mono">{selectedEmail.senderEmail}</p>
                  </div>
                  {getReadBadge(selectedEmail.isRead)}
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
                    updateEmailLeadStatusMutation.mutate({
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
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-2">Message</p>
                <div className="bg-muted p-4 rounded-md max-h-[400px] overflow-y-auto prose prose-sm dark:prose-invert max-w-none">
                  {selectedEmail.body ? (
                    selectedEmail.body.startsWith("<") ? (
                      <div 
                        dangerouslySetInnerHTML={{ 
                          __html: selectedEmail.body.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") 
                        }} 
                        className="[&_img]:max-w-full [&_img]:h-auto [&_a]:text-blue-600 [&_a]:underline dark:[&_a]:text-blue-400 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2 [&_th]:bg-muted"
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
                Received: {selectedEmail.receivedAt ? new Date(selectedEmail.receivedAt).toLocaleString() : "-"}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
