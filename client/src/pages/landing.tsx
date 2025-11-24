import { Mail, BarChart3, Database, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold">Email Manager</span>
          </div>
          <Button asChild data-testid="button-login">
            <a href="/">Log In</a>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-6 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-6 text-5xl font-bold tracking-tight">
              Streamline Your Email Campaigns
            </h1>
            <p className="mb-8 text-xl text-muted-foreground">
              Manage email campaigns, track engagement, and convert leads with powerful
              analytics and role-based workflows.
            </p>
            <Button size="lg" asChild data-testid="button-get-started">
              <a href="/">Get Started</a>
            </Button>
          </div>
        </section>

        <section className="border-t bg-muted/30 py-24">
          <div className="container mx-auto px-6">
            <h2 className="mb-12 text-center text-3xl font-bold">Key Features</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="flex flex-col items-center p-6 text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold">Email Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Send bulk emails with custom templates and track every interaction
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex flex-col items-center p-6 text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
                    <Database className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold">Dataset Import</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload Excel/CSV files and automatically map contact fields
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex flex-col items-center p-6 text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold">Analytics Dashboard</h3>
                  <p className="text-sm text-muted-foreground">
                    Track emails sent, open rates, replies, and lead conversion
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex flex-col items-center p-6 text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold">Lead Categorization</h3>
                  <p className="text-sm text-muted-foreground">
                    Organize leads as Hot, Cold, or Dead for efficient follow-up
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          © 2024 Email Manager. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
