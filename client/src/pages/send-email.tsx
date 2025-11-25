import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Dataset, EmailTemplate } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function SendEmail() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [preview, setPreview] = useState({ subject: "", body: "" });

  const { data: datasets, isLoading: datasetsLoading } = useQuery<Dataset[]>({
    queryKey: ["/api/datasets"],
    enabled: isAuthenticated && !authLoading,
  });

  const { data: templates, isLoading: templatesLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/templates"],
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
    // Generate preview when template is selected
    if (selectedTemplateId && templates) {
      const template = templates.find((t) => t.id === selectedTemplateId);
      if (template) {
        // Replace variables with example values for preview
        let previewSubject = template.subject;
        let previewBody = template.body;

        const exampleData: Record<string, string> = {
          name: "John Doe",
          email: "john@example.com",
          company: "Acme Corp",
          firstName: "John",
          lastName: "Doe",
        };

        Object.entries(exampleData).forEach(([key, value]) => {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
          previewSubject = previewSubject.replace(regex, value);
          previewBody = previewBody.replace(regex, value);
        });

        setPreview({ subject: previewSubject, body: previewBody });
      }
    }
  }, [selectedTemplateId, templates]);

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/emails/send-bulk", {
        datasetId: selectedDatasetId,
        templateId: selectedTemplateId,
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales/stats"] });
      toast({
        title: "Success",
        description: `Sent ${data.sent || 0} emails successfully`,
      });
      setSelectedDatasetId("");
      setSelectedTemplateId("");
      setPreview({ subject: "", body: "" });
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
        description: "Failed to send emails",
        variant: "destructive",
      });
    },
  });

  if (datasetsLoading || templatesLoading || authLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Send Email Campaign</h1>
        <p className="text-muted-foreground">
          Select a dataset and template to send bulk emails
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="dataset">Select Dataset</Label>
              <Select
                value={selectedDatasetId}
                onValueChange={setSelectedDatasetId}
              >
                <SelectTrigger id="dataset" data-testid="select-dataset">
                  <SelectValue placeholder="Choose a dataset" />
                </SelectTrigger>
                <SelectContent>
                  {datasets && datasets.length > 0 ? (
                    datasets
                      .filter((d) => d.status === "active")
                      .map((dataset) => (
                        <SelectItem key={dataset.id} value={dataset.id}>
                          {dataset.name} ({dataset.recordsCount} contacts)
                        </SelectItem>
                      ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No datasets available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="template">Select Template</Label>
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
              >
                <SelectTrigger id="template" data-testid="select-template">
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates && templates.length > 0 ? (
                    templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No templates available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border bg-muted/50 p-4">
              <h4 className="mb-2 text-sm font-medium">Campaign Summary</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium">Recipients:</span>{" "}
                  {selectedDatasetId
                    ? datasets?.find((d) => d.id === selectedDatasetId)
                        ?.recordsCount || 0
                    : 0}
                </p>
                <p>
                  <span className="font-medium">Template:</span>{" "}
                  {selectedTemplateId
                    ? templates?.find((t) => t.id === selectedTemplateId)?.name ||
                      "None"
                    : "None"}
                </p>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => sendEmailMutation.mutate()}
              disabled={
                !selectedDatasetId ||
                !selectedTemplateId ||
                sendEmailMutation.isPending
              }
              data-testid="button-send-campaign"
            >
              <Send className="h-4 w-4" />
              {sendEmailMutation.isPending ? "Sending..." : "Send Email Campaign"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedTemplateId ? (
              <>
                <div>
                  <Label>Subject</Label>
                  <div className="mt-1 rounded-md border bg-muted/30 p-3 text-sm">
                    {preview.subject || "Subject will appear here"}
                  </div>
                </div>
                <div>
                  <Label>Body</Label>
                  <div className="mt-1 max-h-[300px] overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm font-mono">
                    {preview.body || "Email body will appear here"}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  This preview uses sample data. Actual emails will use data from the
                  selected dataset.
                </p>
              </>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-center text-muted-foreground">
                <p>Select a template to see preview</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
