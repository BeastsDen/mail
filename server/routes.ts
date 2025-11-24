import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import * as XLSX from "xlsx";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { getOutlookClient } from "./outlookClient";
import {
  insertDatasetSchema,
  insertEmailTemplateSchema,
  insertSentEmailSchema,
  insertDatasetContactSchema,
} from "@shared/schema";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User management routes (Admin only)
  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(currentUserId);
      
      if (currentUser?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/users/:userId/role", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(currentUserId);
      
      if (currentUser?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { userId } = req.params;
      const { role } = req.body;

      if (!["admin", "sales"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const updatedUser = await storage.updateUserRole(userId, role);
      
      await storage.createActivityLog({
        userId: currentUserId,
        action: "user_role_updated",
        entityType: "user",
        entityId: userId,
        details: { role },
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Template routes
  app.get("/api/templates", isAuthenticated, async (req: any, res) => {
    try {
      const templates = await storage.getAllEmailTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.post("/api/templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templateData = insertEmailTemplateSchema.parse({
        ...req.body,
        createdBy: userId,
      });

      const template = await storage.createEmailTemplate(templateData);
      
      await storage.createActivityLog({
        userId,
        action: "template_created",
        entityType: "template",
        entityId: template.id,
        details: { name: template.name },
      });

      res.json(template);
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(400).json({ message: "Failed to create template" });
    }
  });

  app.delete("/api/templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;

      const template = await storage.getEmailTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      await storage.deleteEmailTemplate(id);
      
      await storage.createActivityLog({
        userId,
        action: "template_deleted",
        entityType: "template",
        entityId: id,
        details: { name: template.name },
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  // Dataset routes
  app.get("/api/datasets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (user?.role === "admin") {
        const datasets = await storage.getAllDatasets();
        res.json(datasets);
      } else {
        const datasets = await storage.getDatasetsByUser(userId);
        res.json(datasets);
      }
    } catch (error) {
      console.error("Error fetching datasets:", error);
      res.status(500).json({ message: "Failed to fetch datasets" });
    }
  });

  app.post("/api/datasets/upload", isAuthenticated, upload.single("file"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name } = req.body;
      const file = req.file;

      if (!file || !name) {
        return res.status(400).json({ message: "Missing file or name" });
      }

      // Parse Excel/CSV file
      const workbook = XLSX.read(file.buffer, { type: "buffer" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      // Create dataset
      const dataset = await storage.createDataset({
        name,
        uploadedBy: userId,
        recordsCount: data.length,
        status: "active",
      });

      // Create contacts from parsed data
      const contacts = data.map((row: any) => ({
        datasetId: dataset.id,
        name: row.name || row.Name || null,
        email: row.email || row.Email || "",
        company: row.company || row.Company || null,
        customFields: row,
      }));

      if (contacts.length > 0) {
        await storage.createDatasetContacts(contacts);
      }

      await storage.createActivityLog({
        userId,
        action: "dataset_uploaded",
        entityType: "dataset",
        entityId: dataset.id,
        details: { name, recordsCount: data.length },
      });

      res.json(dataset);
    } catch (error) {
      console.error("Error uploading dataset:", error);
      res.status(500).json({ message: "Failed to upload dataset" });
    }
  });

  app.delete("/api/datasets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;

      const dataset = await storage.getDataset(id);
      if (!dataset) {
        return res.status(404).json({ message: "Dataset not found" });
      }

      await storage.deleteDataset(id);
      
      await storage.createActivityLog({
        userId,
        action: "dataset_deleted",
        entityType: "dataset",
        entityId: id,
        details: { name: dataset.name },
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting dataset:", error);
      res.status(500).json({ message: "Failed to delete dataset" });
    }
  });

  // Email routes
  app.get("/api/emails", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (user?.role === "admin") {
        const emails = await storage.getAllSentEmails();
        res.json(emails);
      } else {
        const emails = await storage.getSentEmailsByUser(userId);
        res.json(emails);
      }
    } catch (error) {
      console.error("Error fetching emails:", error);
      res.status(500).json({ message: "Failed to fetch emails" });
    }
  });

  app.post("/api/emails/send-bulk", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { datasetId, templateId } = req.body;

      if (!datasetId || !templateId) {
        return res.status(400).json({ message: "Missing datasetId or templateId" });
      }

      const template = await storage.getEmailTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      const contacts = await storage.getDatasetContacts(datasetId);
      if (contacts.length === 0) {
        return res.status(400).json({ message: "No contacts in dataset" });
      }

      // Get Outlook client
      const outlookClient = await getOutlookClient();

      let sentCount = 0;
      const errors: any[] = [];

      // Send emails to each contact
      for (const contact of contacts) {
        try {
          // Replace variables in template
          let subject = template.subject;
          let body = template.body;

          const replacements: Record<string, string> = {
            name: contact.name || "",
            email: contact.email,
            company: contact.company || "",
            firstName: contact.name?.split(" ")[0] || "",
            lastName: contact.name?.split(" ").slice(1).join(" ") || "",
            ...(typeof contact.customFields === "object" ? contact.customFields : {}),
          };

          Object.entries(replacements).forEach(([key, value]) => {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
            subject = subject.replace(regex, String(value));
            body = body.replace(regex, String(value));
          });

          // Send email via Outlook
          const message = {
            subject,
            body: {
              contentType: "Text",
              content: body,
            },
            toRecipients: [
              {
                emailAddress: {
                  address: contact.email,
                },
              },
            ],
          };

          const sentMessage = await outlookClient
            .api("/me/sendMail")
            .post({
              message,
              saveToSentItems: true,
            });

          // Store sent email in database
          await storage.createSentEmail({
            sentBy: userId,
            recipientEmail: contact.email,
            recipientName: contact.name || undefined,
            subject,
            body,
            templateId,
            datasetId,
            contactId: contact.id,
            status: "sent",
            leadStatus: "unassigned",
          });

          sentCount++;
        } catch (emailError) {
          console.error(`Error sending to ${contact.email}:`, emailError);
          errors.push({ email: contact.email, error: String(emailError) });
        }
      }

      // Update template last used
      await storage.updateTemplateLastUsed(templateId);

      await storage.createActivityLog({
        userId,
        action: "bulk_email_sent",
        entityType: "email",
        details: {
          datasetId,
          templateId,
          sentCount,
          errorCount: errors.length,
        },
      });

      res.json({ sent: sentCount, errors });
    } catch (error) {
      console.error("Error sending bulk emails:", error);
      res.status(500).json({ message: "Failed to send emails" });
    }
  });

  app.patch("/api/emails/:emailId/lead-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { emailId } = req.params;
      const { leadStatus } = req.body;

      if (!["hot", "cold", "dead", "unassigned"].includes(leadStatus)) {
        return res.status(400).json({ message: "Invalid lead status" });
      }

      await storage.updateEmailLeadStatus(emailId, leadStatus);
      
      await storage.createActivityLog({
        userId,
        action: "lead_status_updated",
        entityType: "email",
        entityId: emailId,
        details: { leadStatus },
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating lead status:", error);
      res.status(500).json({ message: "Failed to update lead status" });
    }
  });

  // Analytics routes
  app.get("/api/sales/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      const [
        emailsSentToday,
        emailsSentThisWeek,
        emailsSentThisMonth,
        emailsSentThisYear,
        leadCounts,
        totalReplies,
        emailTrends,
      ] = await Promise.all([
        storage.getEmailCountByDateRange(userId, startOfToday, now),
        storage.getEmailCountByDateRange(userId, startOfWeek, now),
        storage.getEmailCountByDateRange(userId, startOfMonth, now),
        storage.getEmailCountByDateRange(userId, startOfYear, now),
        storage.getLeadCountsByStatus(userId),
        storage.getTotalReplies(userId),
        storage.getEmailTrends(userId, 7),
      ]);

      const leadBreakdown = [
        { status: "Hot", count: leadCounts.hot },
        { status: "Cold", count: leadCounts.cold },
        { status: "Dead", count: leadCounts.dead },
      ];

      res.json({
        emailsSentToday,
        emailsSentThisWeek,
        emailsSentThisMonth,
        emailsSentThisYear,
        totalReplies,
        hotLeads: leadCounts.hot,
        coldLeads: leadCounts.cold,
        deadLeads: leadCounts.dead,
        openRate: 0, // TODO: implement tracking
        replyRate: 0, // TODO: implement tracking
        emailTrends,
        leadBreakdown,
      });
    } catch (error) {
      console.error("Error fetching sales stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/admin/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const [users, templates, datasets, allEmails, logs] = await Promise.all([
        storage.getAllUsers(),
        storage.getAllEmailTemplates(),
        storage.getAllDatasets(),
        storage.getAllSentEmails(),
        storage.getActivityLogs(10),
      ]);

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const emailsSentToday = allEmails.filter(
        (e) => e.sentAt && new Date(e.sentAt) >= startOfToday
      ).length;
      const emailsSentThisWeek = allEmails.filter(
        (e) => e.sentAt && new Date(e.sentAt) >= startOfWeek
      ).length;
      const emailsSentThisMonth = allEmails.filter(
        (e) => e.sentAt && new Date(e.sentAt) >= startOfMonth
      ).length;

      const leadCounts = {
        hot: allEmails.filter((e) => e.leadStatus === "hot").length,
        cold: allEmails.filter((e) => e.leadStatus === "cold").length,
        dead: allEmails.filter((e) => e.leadStatus === "dead").length,
      };

      const totalReplies = allEmails.filter((e) => e.replied).length;

      const recentActivity = logs.map((log) => ({
        id: log.id,
        action: log.action,
        userName: "User",
        timestamp: log.createdAt
          ? new Date(log.createdAt).toLocaleString()
          : "Unknown",
        details: JSON.stringify(log.details),
      }));

      res.json({
        totalUsers: users.length,
        totalTemplates: templates.length,
        totalDatasets: datasets.length,
        totalEmailsSent: allEmails.length,
        emailsSentToday,
        emailsSentThisWeek,
        emailsSentThisMonth,
        totalReplies,
        hotLeads: leadCounts.hot,
        coldLeads: leadCounts.cold,
        deadLeads: leadCounts.dead,
        recentActivity,
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Activity logs route
  app.get("/api/logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const logs = await storage.getActivityLogs(100);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching logs:", error);
      res.status(500).json({ message: "Failed to fetch logs" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
