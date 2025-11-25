import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Send } from "lucide-react";

interface ComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "compose" | "reply" | "forward";
  originalEmail?: {
    id: string;
    senderEmail?: string;
    recipientEmail?: string;
    subject: string;
    body: string;
    senderName?: string;
    recipientName?: string;
  };
}

export function ComposeDialog({ open, onOpenChange, mode, originalEmail }: ComposeDialogProps) {
  const { toast } = useToast();
  
  const getDefaultRecipient = () => {
    if (mode === "reply") {
      return originalEmail?.senderEmail || originalEmail?.recipientEmail || "";
    }
    return "";
  };

  const getDefaultSubject = () => {
    if (!originalEmail) return "";
    
    if (mode === "reply") {
      return originalEmail.subject.startsWith("Re: ") 
        ? originalEmail.subject 
        : `Re: ${originalEmail.subject}`;
    }
    
    if (mode === "forward") {
      return originalEmail.subject.startsWith("Fwd: ") 
        ? originalEmail.subject 
        : `Fwd: ${originalEmail.subject}`;
    }
    
    return "";
  };

  const stripHtml = (html: string): string => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  const getDefaultBody = () => {
    if (!originalEmail) return "";
    
    const plainTextBody = originalEmail.body?.startsWith("<") 
      ? stripHtml(originalEmail.body) 
      : originalEmail.body;
    
    const separator = "\n\n------- Original Message -------\n";
    const originalContent = `From: ${originalEmail.senderName || originalEmail.senderEmail || originalEmail.recipientName || originalEmail.recipientEmail || "Unknown"}\nSubject: ${originalEmail.subject}\n\n${plainTextBody}`;
    
    if (mode === "reply") {
      return `\n\n${separator}${originalContent}`;
    }
    
    if (mode === "forward") {
      return `\n\n${separator}${originalContent}`;
    }
    
    return "";
  };

  const [recipient, setRecipient] = useState(getDefaultRecipient());
  const [subject, setSubject] = useState(getDefaultSubject());
  const [body, setBody] = useState(getDefaultBody());

  useEffect(() => {
    if (open) {
      setRecipient(getDefaultRecipient());
      setSubject(getDefaultSubject());
      setBody(getDefaultBody());
    }
  }, [open, mode, originalEmail?.id]);

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/emails/send-single", {
        to: recipient,
        subject,
        body,
        mode,
        originalEmailId: originalEmail?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emails/received"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email-threads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales/stats"] });
      toast({
        title: "Success",
        description: `Email ${mode === "compose" ? "sent" : mode === "reply" ? "replied" : "forwarded"} successfully`,
      });
      onOpenChange(false);
      setRecipient("");
      setSubject("");
      setBody("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${mode} email`,
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (!recipient || !subject || !body) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    sendEmailMutation.mutate();
  };

  const getDialogTitle = () => {
    if (mode === "reply") return "Reply to Email";
    if (mode === "forward") return "Forward Email";
    return "Compose Email";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 flex-1 overflow-y-auto">
          <div>
            <Label htmlFor="recipient">To</Label>
            <Input
              id="recipient"
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="recipient@example.com"
              disabled={mode === "reply" && !!recipient}
              data-testid="input-recipient"
            />
          </div>
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              data-testid="input-subject"
            />
          </div>
          <div>
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message here..."
              className="min-h-[300px] font-mono text-sm"
              data-testid="input-body"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!recipient || !subject || !body || sendEmailMutation.isPending}
            data-testid="button-send-email"
          >
            {sendEmailMutation.isPending ? (
              "Sending..."
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
