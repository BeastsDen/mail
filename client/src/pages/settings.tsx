import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Lock, Mail, CheckCircle, XCircle, RefreshCw } from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingOutlook, setIsTestingOutlook] = useState(false);
  const [outlookStatus, setOutlookStatus] = useState<{
    connected: boolean;
    email?: string;
    displayName?: string;
    message?: string;
  } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to change password");
      }

      toast({
        title: "Success",
        description: "Password changed successfully",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testOutlookConnection = async () => {
    setIsTestingOutlook(true);
    try {
      const response = await fetch("/api/outlook/test", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();
      
      if (response.ok && data.connected) {
        setOutlookStatus(data);
        toast({
          title: "Success",
          description: `Connected to Outlook as ${data.email}`,
        });
      } else {
        setOutlookStatus({ connected: false, message: data.message });
        toast({
          title: "Connection Failed",
          description: data.message || "Failed to connect to Outlook",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setOutlookStatus({ connected: false, message: error.message });
      toast({
        title: "Error",
        description: "Failed to test Outlook connection",
        variant: "destructive",
      });
    } finally {
      setIsTestingOutlook(false);
    }
  };

  const reconfigureOutlook = async () => {
    try {
      // Attempt to reconfigure by clearing the status and prompting a retest
      setOutlookStatus(null);
      toast({
        title: "Reconfiguration Started",
        description: "Please ensure Outlook connector is set up in Replit. Opening connections page...",
      });
      
      // Open Replit connections in new tab
      const connectionsUrl = window.location.hostname.includes('replit.dev') 
        ? `https://${window.location.hostname.split('.')[0]}.replit.dev/~/connections`
        : "https://replit.com/@replit/connections";
      
      window.open(connectionsUrl, "_blank");
      
      // Auto-retest after a delay to allow reconfiguration
      setTimeout(() => {
        testOutlookConnection();
      }, 3000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to initiate reconfiguration",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder="At least 8 characters"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Changing Password..." : "Change Password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Configuration
            </CardTitle>
            <CardDescription>
              Microsoft Outlook integration for sending emails using sales@hackure.in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {outlookStatus && (
              <div className={`flex items-center gap-2 p-3 rounded-md ${
                outlookStatus.connected 
                  ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" 
                  : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              }`}>
                {outlookStatus.connected ? (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    <div>
                      <p className="text-sm font-medium">Connected</p>
                      <p className="text-xs">
                        {outlookStatus.email} ({outlookStatus.displayName})
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5" />
                    <div>
                      <p className="text-sm font-medium">Not Connected</p>
                      <p className="text-xs">{outlookStatus.message}</p>
                    </div>
                  </>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                All emails are sent using the sales@hackure.in Outlook account.
              </p>
              {isAdmin && (
                <div className="flex gap-2">
                  <Button
                    onClick={testOutlookConnection}
                    disabled={isTestingOutlook}
                    variant="outline"
                  >
                    <RefreshCw className={`h-4 w-4 ${isTestingOutlook ? "animate-spin" : ""}`} />
                    {isTestingOutlook ? "Testing Connection..." : "Test Outlook Connection"}
                  </Button>
                  {outlookStatus && !outlookStatus.connected && (
                    <Button
                      onClick={reconfigureOutlook}
                      variant="default"
                    >
                      <Mail className="h-4 w-4" />
                      Reconfigure Outlook
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Version</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Database</span>
              <span className="font-medium">PostgreSQL</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Email Provider</span>
              <span className="font-medium">Microsoft Outlook</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
