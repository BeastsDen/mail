import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
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
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { passwordHash, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/auth/change-password", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new passwords are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 12);
      await storage.updatePassword(userId, newPasswordHash);

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // User management routes (Admin only)
  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.id;
      const currentUser = await storage.getUser(currentUserId);
      
      if (currentUser?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(({ passwordHash, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.id;
      const currentUser = await storage.getUser(currentUserId);
      
      if (currentUser?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { email, password, firstName, lastName, role } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const newUser = await storage.createUser({
        email,
        firstName,
        lastName,
        passwordHash,
        role: role || "sales",
      });

      await storage.createActivityLog({
        userId: currentUserId,
        action: "user_created",
        entityType: "user",
        entityId: newUser.id,
        details: { email, role: newUser.role },
      });

      const { passwordHash: _, ...userWithoutPassword } = newUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/users/:userId/role", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.id;
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

      const { passwordHash, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.delete("/api/users/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.id;
      const currentUser = await storage.getUser(currentUserId);
      
      if (currentUser?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { userId } = req.params;

      if (userId === currentUserId) {
        return res.status(400).json({ message: "Cannot delete yourself" });
      }

      await storage.deleteUser(userId);
      
      await storage.createActivityLog({
        userId: currentUserId,
        action: "user_deleted",
        entityType: "user",
        entityId: userId,
      });

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.patch("/api/users/:userId/block", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.id;
      const currentUser = await storage.getUser(currentUserId);
      
      if (currentUser?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { userId } = req.params;
      const { blockedUntil } = req.body;

      if (userId === currentUserId) {
        return res.status(400).json({ message: "Cannot block yourself" });
      }

      const blockedUser = await storage.blockUser(
        userId, 
        blockedUntil ? new Date(blockedUntil) : undefined
      );
      
      await storage.createActivityLog({
        userId: currentUserId,
        action: "user_blocked",
        entityType: "user",
        entityId: userId,
        details: { blockedUntil },
      });

      const { passwordHash, ...userWithoutPassword } = blockedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error blocking user:", error);
      res.status(500).json({ message: "Failed to block user" });
    }
  });

  app.patch("/api/users/:userId/unblock", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.id;
      const currentUser = await storage.getUser(currentUserId);
      
      if (currentUser?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { userId } = req.params;

      const unblockedUser = await storage.unblockUser(userId);
      
      await storage.createActivityLog({
        userId: currentUserId,
        action: "user_unblocked",
        entityType: "user",
        entityId: userId,
      });

      const { passwordHash, ...userWithoutPassword } = unblockedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error unblocking user:", error);
      res.status(500).json({ message: "Failed to unblock user" });
    }
  });

  // Outlook connection test (Admin only)
  app.post("/api/outlook/test", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.id;
      const currentUser = await storage.getUser(currentUserId);
      
      if (currentUser?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const outlookClient = await getOutlookClient();
      
      // Try to get user profile to verify connection
      const profile = await outlookClient.api('/me').get();
      
      await storage.createActivityLog({
        userId: currentUserId,
        action: "outlook_connection_tested",
        entityType: "system",
        entityId: "outlook",
        details: { status: "success", email: profile.mail || profile.userPrincipalName },
      });
      
      res.json({ 
        connected: true, 
        email: profile.mail || profile.userPrincipalName,
        displayName: profile.displayName
      });
    } catch (error: any) {
      console.error("Outlook connection test failed:", error);
      
      const currentUserId = req.user.id;
      await storage.createActivityLog({
        userId: currentUserId,
        action: "outlook_connection_failed",
        entityType: "system",
        entityId: "outlook",
        details: { error: error.message },
      });
      
      res.status(500).json({ 
        connected: false, 
        message: error.message || "Failed to connect to Outlook",
        needsReconfiguration: true
      });
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
      const { name } = req.body;
      const file = req.file;

      if (!file || !name) {
        return res.status(400).json({ message: "Missing file or name" });
      }

      let data: any[] = [];

      // Detect file type from MIME type or extension
      const isCsv = file.mimetype === "text/csv" || file.originalname?.endsWith(".csv");
      
      // Parse file using XLSX (works for both CSV and XLSX)
      const workbook = XLSX.read(file.buffer, { 
        type: "buffer",
        // For CSV files, tell XLSX to treat it as CSV
        raw: false
      });
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        return res.status(400).json({ message: "File contains no sheets" });
      }
      
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      data = XLSX.utils.sheet_to_json(worksheet, { 
        defval: "" // Default value for empty cells
      });

      if (data.length === 0) {
        return res.status(400).json({ message: "File contains no data" });
      }

      // Create dataset
      const dataset = await storage.createDataset({
        name,
        uploadedBy: userId,
        recordsCount: data.length,
        status: "active",
      });

      // Create contacts from parsed data - normalize field names
      const contacts = data.map((row: any) => {
        // Normalize field names to lowercase for case-insensitive matching
        const normalizedRow: any = {};
        Object.keys(row).forEach((key) => {
          normalizedRow[key.toLowerCase()] = row[key];
        });

        return {
          datasetId: dataset.id,
          name: normalizedRow.name || null,
          email: normalizedRow.email || "",
          company: normalizedRow.company || normalizedRow.companyname || null,
          customFields: row,
        };
      });

      if (contacts.length > 0) {
        await storage.createDatasetContacts(contacts);
      }

      await storage.createActivityLog({
        userId,
        action: "dataset_uploaded",
        entityType: "dataset",
        entityId: dataset.id,
        details: { name, recordsCount: data.length, fileType: isCsv ? "csv" : "xlsx" },
      });

      res.json(dataset);
    } catch (error) {
      console.error("Error uploading dataset:", error);
      res.status(500).json({ message: "Failed to upload dataset" });
    }
  });

  app.get("/api/datasets/:id/contacts", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const dataset = await storage.getDataset(id);
      if (!dataset) {
        return res.status(404).json({ message: "Dataset not found" });
      }

      const contacts = await storage.getDatasetContacts(id);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching dataset contacts:", error);
      res.status(500).json({ message: "Failed to fetch dataset contacts" });
    }
  });

  app.delete("/api/datasets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      const userId = req.user.id;
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

  app.get("/api/emails/received", isAuthenticated, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      
      // Get received emails from shared mailbox with pagination
      const emails = await storage.getAllReceivedEmails(limit, offset);
      
      // Get total count
      const allEmails = await storage.getAllReceivedEmails(10000, 0);
      
      res.json({
        emails,
        total: allEmails.length,
        limit,
        offset
      });
    } catch (error) {
      console.error("Error fetching received emails:", error);
      res.status(500).json({ message: "Failed to fetch received emails" });
    }
  });

  app.post("/api/emails/send-bulk", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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

  app.post("/api/emails/send-single", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { to, subject, body, mode, originalEmailId } = req.body;

      if (!to || !subject || !body) {
        return res.status(400).json({ message: "Missing required fields: to, subject, body" });
      }

      const { sendEmail } = await import("./outlookClient");
      
      await sendEmail({
        to: [to],
        subject,
        body,
      });

      await storage.createSentEmail({
        sentBy: userId,
        recipientEmail: to,
        subject,
        body,
        status: "sent",
        leadStatus: "unassigned",
      });

      await storage.createActivityLog({
        userId,
        action: mode === "reply" ? "email_replied" : mode === "forward" ? "email_forwarded" : "email_sent",
        entityType: "email",
        details: {
          to,
          subject,
          mode,
          originalEmailId,
        },
      });

      res.json({ message: "Email sent successfully" });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  app.patch("/api/emails/:emailId/lead-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { emailId } = req.params;
      const { leadStatus } = req.body;

      if (!["hot", "cold", "dead", "unassigned"].includes(leadStatus)) {
        return res.status(400).json({ message: "Invalid lead status" });
      }

      // Try to update as sent email first
      const sentEmail = await storage.getSentEmail(emailId);
      if (sentEmail) {
        await storage.updateEmailLeadStatus(emailId, leadStatus);
      } else {
        // If not a sent email, try to update the thread associated with this received email
        const receivedEmail = await storage.getReceivedEmail(emailId);
        if (receivedEmail && receivedEmail.threadId) {
          await storage.updateThreadStatus(receivedEmail.threadId, leadStatus);
        }
      }
      
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
      const userId = req.user.id;

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
      const userId = req.user.id;
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
      const userId = req.user.id;
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

  // Get configured email to sync and send from
  const configEmail = process.env.CONFIG_EMAIL || 'sales@hackure.in';
  
  // Helper function to check if email involves the configured email
  function isConfiguredEmail(message: any): boolean {
    const senderEmail = message.from?.emailAddress?.address || '';
    const toEmails = message.toRecipients?.map((r: any) => r.emailAddress?.address) || [];
    const ccEmails = message.ccRecipients?.map((r: any) => r.emailAddress?.address) || [];
    const bccEmails = message.bccRecipients?.map((r: any) => r.emailAddress?.address) || [];
    
    const allRecipients = [...toEmails, ...ccEmails, ...bccEmails];
    
    return senderEmail === configEmail || allRecipients.includes(configEmail);
  }

  // Email sync and thread management routes
  app.post("/api/emails/sync", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Import Outlook functions
      const { fetchEmails } = await import("./outlookClient");
      
      // Fetch emails from admin mailbox and filter for configured email
      const [inboxMessages, sentMessages] = await Promise.all([
        fetchEmails('inbox', { top: 100 }),
        fetchEmails('sentitems', { top: 100 })
      ]);

      // Filter to only emails from/to configured email
      const filteredInboxMessages = inboxMessages.filter(isConfiguredEmail);
      const filteredSentMessages = sentMessages.filter(isConfiguredEmail);

      // Sync received emails
      for (const message of filteredInboxMessages) {
        await storage.syncReceivedEmail({
          messageId: message.id,
          conversationId: message.conversationId,
          senderEmail: message.from.emailAddress.address,
          senderName: message.from.emailAddress.name || message.from.emailAddress.address,
          subject: message.subject,
          body: message.body.content,
          bodyPreview: message.bodyPreview,
          receivedBy: userId,
          isReply: false,
          isRead: message.isRead,
          receivedAt: new Date(message.receivedDateTime),
        });
      }

      // Sync sent emails
      for (const message of filteredSentMessages) {
        if (message.toRecipients && message.toRecipients.length > 0) {
          await storage.syncSentEmail({
            messageId: message.id,
            conversationId: message.conversationId,
            sentBy: userId,
            recipientEmail: message.toRecipients[0].emailAddress.address,
            recipientName: message.toRecipients[0].emailAddress.name || message.toRecipients[0].emailAddress.address,
            subject: message.subject,
            body: message.body.content,
            status: 'sent',
            sentAt: new Date(message.receivedDateTime),
          });
        }
      }

      res.json({ 
        message: "Emails synced successfully",
        inboxCount: filteredInboxMessages.length,
        sentCount: filteredSentMessages.length
      });
    } catch (error) {
      console.error("Error syncing emails:", error);
      res.status(500).json({ message: "Failed to sync emails" });
    }
  });

  app.get("/api/email-threads", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { status } = req.query;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      
      // Get all threads from shared mailbox with pagination and filtering
      const threads = await storage.getEmailThreadsForUser(userId, status as string, limit, offset);
      
      // Get total count for this filter (without pagination)
      const allThreads = await storage.getEmailThreadsForUser(userId, status as string, 10000, 0);
      
      res.json({
        threads,
        total: allThreads.length,
        limit,
        offset
      });
    } catch (error) {
      console.error("Error fetching email threads:", error);
      res.status(500).json({ message: "Failed to fetch email threads" });
    }
  });

  app.get("/api/email-threads/:threadId", isAuthenticated, async (req: any, res) => {
    try {
      const { threadId } = req.params;
      
      const thread = await storage.getEmailThread(threadId);
      if (!thread) {
        return res.status(404).json({ message: "Thread not found" });
      }

      const messages = await storage.getThreadMessages(threadId);
      
      res.json({
        thread,
        messages
      });
    } catch (error) {
      console.error("Error fetching thread:", error);
      res.status(500).json({ message: "Failed to fetch thread" });
    }
  });

  app.patch("/api/email-threads/:threadId/status", isAuthenticated, async (req: any, res) => {
    try {
      const { threadId } = req.params;
      const { leadStatus } = req.body;

      if (!['hot', 'cold', 'dead', 'unassigned'].includes(leadStatus)) {
        return res.status(400).json({ message: "Invalid lead status" });
      }

      const updatedThread = await storage.updateThreadStatus(threadId, leadStatus);
      
      await storage.createActivityLog({
        userId: req.user.id,
        action: "thread_status_updated",
        entityType: "email_thread",
        entityId: threadId,
        details: { leadStatus },
      });

      res.json(updatedThread);
    } catch (error) {
      console.error("Error updating thread status:", error);
      res.status(500).json({ message: "Failed to update thread status" });
    }
  });

  const httpServer = createServer(app);

  // Auto-sync emails every 1 minute for sales@hackure.in mailbox
  setInterval(async () => {
    try {
      const { fetchEmails } = await import("./outlookClient");
      
      // Use CONFIG_EMAIL (sales@hackure.in) directly since we're using application permissions
      const configEmail = process.env.CONFIG_EMAIL || 'sales@hackure.in';
      
      // Get or create the user for this email
      let outlookUser = await storage.getUserByEmail(configEmail);
      if (!outlookUser) {
        console.log(`[Auto-sync] Creating user for ${configEmail}`);
        // Create a system user for syncing emails
        const tempPasswordHash = await import('bcryptjs').then(m => m.hash('system-user-' + Math.random(), 12));
        outlookUser = await storage.createUser({
          email: configEmail,
          passwordHash: tempPasswordHash,
          role: 'admin',
        });
      }

      console.log(`[Auto-sync] Starting sync for ${configEmail} (user ID: ${outlookUser.id})`);

      // Fetch emails from sales mailbox
      const [inboxMessages, sentMessages] = await Promise.all([
        fetchEmails('inbox', { top: 100 }),
        fetchEmails('sentitems', { top: 100 })
      ]);

      console.log(`[Auto-sync] Fetched ${inboxMessages.length} inbox messages and ${sentMessages.length} sent messages`);

      // Sync received emails
      for (const message of inboxMessages) {
        await storage.syncReceivedEmail({
          messageId: message.id,
          conversationId: message.conversationId,
          senderEmail: message.from.emailAddress.address,
          senderName: message.from.emailAddress.name || message.from.emailAddress.address,
          subject: message.subject,
          body: message.body.content,
          bodyPreview: message.bodyPreview,
          receivedBy: outlookUser.id,
          isReply: false,
          isRead: message.isRead,
          receivedAt: new Date(message.receivedDateTime),
        });
      }

      // Sync sent emails
      for (const message of sentMessages) {
        if (message.toRecipients && message.toRecipients.length > 0) {
          await storage.syncSentEmail({
            messageId: message.id,
            conversationId: message.conversationId,
            sentBy: outlookUser.id,
            recipientEmail: message.toRecipients[0].emailAddress.address,
            recipientName: message.toRecipients[0].emailAddress.name || message.toRecipients[0].emailAddress.address,
            subject: message.subject,
            body: message.body.content,
            status: 'sent',
            sentAt: new Date(message.receivedDateTime),
          });
        }
      }

      console.log(`[Auto-sync] Successfully synced ${inboxMessages.length + sentMessages.length} emails for ${configEmail}`);
    } catch (error) {
      console.error("[Auto-sync] Error:", error instanceof Error ? error.message : String(error));
      console.error("[Auto-sync] Full error:", error);
    }
  }, 60 * 1000); // Run every 1 minute

  return httpServer;
}
