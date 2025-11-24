import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mail, Inbox as InboxIcon } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { ReceivedEmail } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Inbox() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: emails, isLoading, refetch } = useQuery<ReceivedEmail[]>({
    queryKey: ["/api/emails/received"],
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-inbox">Inbox</h1>
          <p className="text-muted-foreground">
            View received emails and replies
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" data-testid="button-refresh">
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Received Emails ({emails?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {emails && emails.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead>Status</TableHead>
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
                    <TableCell className="text-sm">
                      {email.receivedAt
                        ? new Date(email.receivedAt).toLocaleString()
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
