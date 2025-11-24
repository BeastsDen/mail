import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Inbox as InboxIcon, ChevronLeft, ChevronRight, Flame, Snowflake, X as XIcon } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  const itemsPerPage = 20;

  const { data, isLoading } = useQuery<{ emails: ReceivedEmail[], total: number }>({
    queryKey: ["/api/emails/received"],
    enabled: isAuthenticated && !authLoading,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
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
  const emails = allEmails.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(totalEmails / itemsPerPage);

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

      <Card>
        <CardHeader>
          <CardTitle>Received Emails</CardTitle>
        </CardHeader>
        <CardContent>
          {emails && emails.length > 0 ? (
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
                  {emails.map((email) => (
                    <TableRow key={email.id} data-testid={`row-email-${email.id}`}>
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
                      <TableCell>
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
                  Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalEmails)} of {totalEmails} emails (Page {currentPage} of {totalPages || 1})
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
              <p className="mb-2 text-sm font-medium">No emails received</p>
              <p className="text-sm text-muted-foreground">
                Emails will appear here once they are synced from your mailbox
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
