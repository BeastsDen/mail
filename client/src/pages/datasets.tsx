import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Upload, Trash2, Download, Eye, Database, X, Search } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Dataset } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Datasets() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [datasetName, setDatasetName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewDatasetId, setViewDatasetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: datasets, isLoading } = useQuery<Dataset[]>({
    queryKey: ["/api/datasets"],
    enabled: isAuthenticated && !authLoading,
  });

  const { data: datasetContacts = [], isLoading: contactsLoading } = useQuery<any[]>({
    queryKey: ["/api/datasets", viewDatasetId, "contacts"],
    queryFn: async () => {
      const response = await fetch(`/api/datasets/${viewDatasetId}/contacts`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch dataset contacts");
      }
      return response.json();
    },
    enabled: !!viewDatasetId,
  });

  // Filter contacts based on search query
  const filteredContacts = datasetContacts.filter((contact) => {
    const query = searchQuery.toLowerCase();
    return (
      (contact.name && contact.name.toLowerCase().includes(query)) ||
      (contact.email && contact.email.toLowerCase().includes(query)) ||
      (contact.company && contact.company.toLowerCase().includes(query))
    );
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

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/datasets/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Upload failed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
      toast({
        title: "Success",
        description: "Dataset uploaded successfully",
      });
      setIsUploadDialogOpen(false);
      setDatasetName("");
      setSelectedFile(null);
    },
    onError: (error: Error) => {
      if (error.message.includes("401") || error.message.includes("Unauthorized")) {
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
        description: error.message || "Failed to upload dataset",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/datasets/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
      toast({
        title: "Success",
        description: "Dataset deleted successfully",
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
        description: "Failed to delete dataset",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (
        file.type === "text/csv" ||
        file.type === "application/vnd.ms-excel" ||
        file.type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ) {
        setSelectedFile(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV or Excel file",
          variant: "destructive",
        });
      }
    }
  };

  const handleUpload = () => {
    if (!selectedFile || !datasetName) return;

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("name", datasetName);

    uploadMutation.mutate(formData);
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
          <h1 className="text-3xl font-bold tracking-tight">Datasets</h1>
          <p className="text-muted-foreground">
            Upload and manage contact datasets for email campaigns
          </p>
        </div>
        <Button onClick={() => setIsUploadDialogOpen(true)} data-testid="button-upload-dataset">
          <Upload className="h-4 w-4" />
          Upload Dataset
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Datasets</CardTitle>
        </CardHeader>
        <CardContent>
          {datasets && datasets.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datasets.map((dataset) => (
                  <TableRow key={dataset.id} data-testid={`row-dataset-${dataset.id}`}>
                    <TableCell className="font-medium">{dataset.name}</TableCell>
                    <TableCell>{dataset.recordsCount}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          dataset.status === "active"
                            ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400"
                        }`}
                      >
                        {dataset.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {dataset.createdAt
                        ? new Date(dataset.createdAt).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewDatasetId(dataset.id)}
                          data-testid={`button-view-${dataset.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(dataset.id)}
                          data-testid={`button-delete-${dataset.id}`}
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
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Database className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mb-2 text-sm font-medium">No datasets yet</p>
              <p className="mb-4 text-sm text-muted-foreground">
                Upload your first dataset to start sending emails
              </p>
              <Button onClick={() => setIsUploadDialogOpen(true)} data-testid="button-upload-first-dataset">
                <Upload className="h-4 w-4" />
                Upload Dataset
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewDatasetId} onOpenChange={(open) => {
        if (!open) {
          setViewDatasetId(null);
          setSearchQuery("");
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Dataset Details</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setViewDatasetId(null);
                  setSearchQuery("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by email, name, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-contacts"
              />
            </div>

            {/* Results Count */}
            {!contactsLoading && datasetContacts.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Showing {filteredContacts.length} of {datasetContacts.length} contacts
              </p>
            )}

            {/* Table */}
            {contactsLoading ? (
              <div className="flex justify-center py-8">
                <Skeleton className="h-8 w-full" />
              </div>
            ) : datasetContacts && datasetContacts.length > 0 ? (
              <div className="overflow-x-auto">
                {filteredContacts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Company</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredContacts.map((contact: any, index: number) => (
                        <TableRow key={index} data-testid={`row-contact-${index}`}>
                          <TableCell>{contact.name || "-"}</TableCell>
                          <TableCell>{contact.email}</TableCell>
                          <TableCell>{contact.company || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No contacts match your search</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No contacts found</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Dataset</DialogTitle>
            <DialogDescription>
              Upload a CSV or Excel file with contact information (name, email, company, etc.)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="datasetName">Dataset Name</Label>
              <Input
                id="datasetName"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                placeholder="Q4 Leads 2024"
                data-testid="input-dataset-name"
              />
            </div>
            <div>
              <Label htmlFor="file">File</Label>
              <input
                ref={fileInputRef}
                id="file"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-file"
              />
              <div className="mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                  data-testid="button-select-file"
                >
                  <Upload className="h-4 w-4" />
                  {selectedFile ? selectedFile.name : "Choose File"}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsUploadDialogOpen(false);
                setDatasetName("");
                setSelectedFile(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!datasetName || !selectedFile || uploadMutation.isPending}
              data-testid="button-upload-confirm"
            >
              {uploadMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
