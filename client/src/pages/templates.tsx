import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { EmailTemplate } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Templates() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    body: "",
  });

  const { data: templates, isLoading } = useQuery<EmailTemplate[]>({
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
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Extract variables from template body
      const variableRegex = /\{\{(\w+)\}\}/g;
      const variables = Array.from(new Set(
        [...data.body.matchAll(variableRegex)].map(match => match[1])
      ));

      return await apiRequest("POST", "/api/templates", {
        ...data,
        variables,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Success",
        description: "Template created successfully",
      });
      setIsCreateDialogOpen(false);
      setFormData({ name: "", subject: "", body: "" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/templates/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Success",
        description: "Template deleted successfully",
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
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    },
  });

  const handlePreview = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewDialogOpen(true);
  };

  if (isLoading || authLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Templates</h1>
          <p className="text-muted-foreground">
            Create and manage reusable email templates with dynamic variables
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-template">
          <Plus className="h-4 w-4" />
          Create Template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Templates</CardTitle>
        </CardHeader>
        <CardContent>
          {templates && templates.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Variables</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id} data-testid={`row-template-${template.id}`}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell className="max-w-md truncate">{template.subject}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {template.variables && template.variables.length > 0 ? (
                          template.variables.map((variable) => (
                            <Badge key={variable} variant="secondary" className="text-xs">
                              {`{{${variable}}}`}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">None</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {template.createdAt
                        ? new Date(template.createdAt).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {template.lastUsed
                        ? new Date(template.lastUsed).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePreview(template)}
                          data-testid={`button-preview-${template.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(template.id)}
                          data-testid={`button-delete-${template.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="mb-2 text-sm font-medium">No templates yet</p>
              <p className="mb-4 text-sm text-muted-foreground">
                Create your first template to get started
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-template">
                <Plus className="h-4 w-4" />
                Create Template
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Email Template</DialogTitle>
            <DialogDescription>
              Use {`{{variable}}`} syntax for dynamic content (e.g., {`{{name}}, {{company}}`})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Welcome Email"
                data-testid="input-template-name"
              />
            </div>
            <div>
              <Label htmlFor="subject">Email Subject</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Welcome to {{company}}"
                data-testid="input-template-subject"
              />
            </div>
            <div>
              <Label htmlFor="body">Email Body</Label>
              <Textarea
                id="body"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                placeholder="Hi {{name}},&#10;&#10;Welcome to {{company}}!"
                className="min-h-[200px] font-mono text-sm"
                data-testid="input-template-body"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.name || !formData.subject || !formData.body || createMutation.isPending}
              data-testid="button-save-template"
            >
              {createMutation.isPending ? "Creating..." : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Subject</Label>
              <p className="mt-1 text-sm">{selectedTemplate?.subject}</p>
            </div>
            <div>
              <Label>Body</Label>
              <div className="mt-1 whitespace-pre-wrap rounded-md border bg-muted/50 p-4 text-sm font-mono">
                {selectedTemplate?.body}
              </div>
            </div>
            {selectedTemplate?.variables && selectedTemplate.variables.length > 0 && (
              <div>
                <Label>Variables Used</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedTemplate.variables.map((variable) => (
                    <Badge key={variable} variant="secondary">
                      {`{{${variable}}}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
