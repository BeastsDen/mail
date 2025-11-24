// Database storage implementation using Drizzle ORM
import {
  users,
  datasets,
  datasetContacts,
  emailTemplates,
  sentEmails,
  receivedEmails,
  activityLogs,
  type User,
  type UpsertUser,
  type Dataset,
  type InsertDataset,
  type DatasetContact,
  type InsertDatasetContact,
  type EmailTemplate,
  type InsertEmailTemplate,
  type SentEmail,
  type InsertSentEmail,
  type ReceivedEmail,
  type InsertReceivedEmail,
  type ActivityLog,
  type InsertActivityLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(userId: string, role: string): Promise<User>;

  // Dataset operations
  createDataset(dataset: InsertDataset): Promise<Dataset>;
  getDataset(id: string): Promise<Dataset | undefined>;
  getDatasetsByUser(userId: string): Promise<Dataset[]>;
  getAllDatasets(): Promise<Dataset[]>;
  deleteDataset(id: string): Promise<void>;
  updateDatasetRecordCount(id: string, count: number): Promise<void>;

  // Dataset contacts operations
  createDatasetContact(contact: InsertDatasetContact): Promise<DatasetContact>;
  createDatasetContacts(contacts: InsertDatasetContact[]): Promise<DatasetContact[]>;
  getDatasetContacts(datasetId: string): Promise<DatasetContact[]>;

  // Email template operations
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  getEmailTemplate(id: string): Promise<EmailTemplate | undefined>;
  getAllEmailTemplates(): Promise<EmailTemplate[]>;
  getEmailTemplatesByUser(userId: string): Promise<EmailTemplate[]>;
  deleteEmailTemplate(id: string): Promise<void>;
  updateTemplateLastUsed(id: string): Promise<void>;

  // Sent email operations
  createSentEmail(email: InsertSentEmail): Promise<SentEmail>;
  getSentEmail(id: string): Promise<SentEmail | undefined>;
  getSentEmailsByUser(userId: string): Promise<SentEmail[]>;
  getAllSentEmails(): Promise<SentEmail[]>;
  updateEmailLeadStatus(emailId: string, leadStatus: string): Promise<void>;
  updateEmailStatus(emailId: string, status: string): Promise<void>;

  // Received email operations
  createReceivedEmail(email: InsertReceivedEmail): Promise<ReceivedEmail>;
  getReceivedEmailsByUser(userId: string): Promise<ReceivedEmail[]>;

  // Activity log operations
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  getActivityLogsByUser(userId: string, limit?: number): Promise<ActivityLog[]>;

  // Analytics operations
  getEmailCountByDateRange(userId: string, startDate: Date, endDate: Date): Promise<number>;
  getLeadCountsByStatus(userId: string): Promise<{ hot: number; cold: number; dead: number }>;
  getTotalReplies(userId: string): Promise<number>;
  getEmailTrends(userId: string, days: number): Promise<Array<{ date: string; count: number }>>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Dataset operations
  async createDataset(datasetData: InsertDataset): Promise<Dataset> {
    const [dataset] = await db.insert(datasets).values(datasetData).returning();
    return dataset;
  }

  async getDataset(id: string): Promise<Dataset | undefined> {
    const [dataset] = await db.select().from(datasets).where(eq(datasets.id, id));
    return dataset || undefined;
  }

  async getDatasetsByUser(userId: string): Promise<Dataset[]> {
    return await db
      .select()
      .from(datasets)
      .where(eq(datasets.uploadedBy, userId))
      .orderBy(desc(datasets.createdAt));
  }

  async getAllDatasets(): Promise<Dataset[]> {
    return await db.select().from(datasets).orderBy(desc(datasets.createdAt));
  }

  async deleteDataset(id: string): Promise<void> {
    await db.delete(datasets).where(eq(datasets.id, id));
  }

  async updateDatasetRecordCount(id: string, count: number): Promise<void> {
    await db.update(datasets).set({ recordsCount: count }).where(eq(datasets.id, id));
  }

  // Dataset contacts operations
  async createDatasetContact(contactData: InsertDatasetContact): Promise<DatasetContact> {
    const [contact] = await db.insert(datasetContacts).values(contactData).returning();
    return contact;
  }

  async createDatasetContacts(contactsData: InsertDatasetContact[]): Promise<DatasetContact[]> {
    if (contactsData.length === 0) return [];
    return await db.insert(datasetContacts).values(contactsData).returning();
  }

  async getDatasetContacts(datasetId: string): Promise<DatasetContact[]> {
    return await db
      .select()
      .from(datasetContacts)
      .where(eq(datasetContacts.datasetId, datasetId));
  }

  // Email template operations
  async createEmailTemplate(templateData: InsertEmailTemplate): Promise<EmailTemplate> {
    const [template] = await db.insert(emailTemplates).values(templateData).returning();
    return template;
  }

  async getEmailTemplate(id: string): Promise<EmailTemplate | undefined> {
    const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
    return template || undefined;
  }

  async getAllEmailTemplates(): Promise<EmailTemplate[]> {
    return await db.select().from(emailTemplates).orderBy(desc(emailTemplates.createdAt));
  }

  async getEmailTemplatesByUser(userId: string): Promise<EmailTemplate[]> {
    return await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.createdBy, userId))
      .orderBy(desc(emailTemplates.createdAt));
  }

  async deleteEmailTemplate(id: string): Promise<void> {
    await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
  }

  async updateTemplateLastUsed(id: string): Promise<void> {
    await db
      .update(emailTemplates)
      .set({ lastUsed: new Date() })
      .where(eq(emailTemplates.id, id));
  }

  // Sent email operations
  async createSentEmail(emailData: InsertSentEmail): Promise<SentEmail> {
    const [email] = await db.insert(sentEmails).values(emailData).returning();
    return email;
  }

  async getSentEmail(id: string): Promise<SentEmail | undefined> {
    const [email] = await db.select().from(sentEmails).where(eq(sentEmails.id, id));
    return email || undefined;
  }

  async getSentEmailsByUser(userId: string): Promise<SentEmail[]> {
    return await db
      .select()
      .from(sentEmails)
      .where(eq(sentEmails.sentBy, userId))
      .orderBy(desc(sentEmails.sentAt));
  }

  async getAllSentEmails(): Promise<SentEmail[]> {
    return await db.select().from(sentEmails).orderBy(desc(sentEmails.sentAt));
  }

  async updateEmailLeadStatus(emailId: string, leadStatus: string): Promise<void> {
    await db
      .update(sentEmails)
      .set({ leadStatus, updatedAt: new Date() })
      .where(eq(sentEmails.id, emailId));
  }

  async updateEmailStatus(emailId: string, status: string): Promise<void> {
    await db
      .update(sentEmails)
      .set({ status, updatedAt: new Date() })
      .where(eq(sentEmails.id, emailId));
  }

  // Received email operations
  async createReceivedEmail(emailData: InsertReceivedEmail): Promise<ReceivedEmail> {
    const [email] = await db.insert(receivedEmails).values(emailData).returning();
    return email;
  }

  async getReceivedEmailsByUser(userId: string): Promise<ReceivedEmail[]> {
    return await db
      .select()
      .from(receivedEmails)
      .where(eq(receivedEmails.receivedBy, userId))
      .orderBy(desc(receivedEmails.receivedAt));
  }

  // Activity log operations
  async createActivityLog(logData: InsertActivityLog): Promise<ActivityLog> {
    const [log] = await db.insert(activityLogs).values(logData).returning();
    return log;
  }

  async getActivityLogs(limit: number = 50): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  async getActivityLogsByUser(userId: string, limit: number = 50): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.userId, userId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  // Analytics operations
  async getEmailCountByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sentEmails)
      .where(
        and(
          eq(sentEmails.sentBy, userId),
          gte(sentEmails.sentAt, startDate),
          lte(sentEmails.sentAt, endDate)
        )
      );
    return result?.count || 0;
  }

  async getLeadCountsByStatus(
    userId: string
  ): Promise<{ hot: number; cold: number; dead: number }> {
    const results = await db
      .select({
        leadStatus: sentEmails.leadStatus,
        count: sql<number>`count(*)::int`,
      })
      .from(sentEmails)
      .where(eq(sentEmails.sentBy, userId))
      .groupBy(sentEmails.leadStatus);

    const counts = { hot: 0, cold: 0, dead: 0 };
    results.forEach((r) => {
      if (r.leadStatus === "hot") counts.hot = r.count;
      if (r.leadStatus === "cold") counts.cold = r.count;
      if (r.leadStatus === "dead") counts.dead = r.count;
    });

    return counts;
  }

  async getTotalReplies(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sentEmails)
      .where(and(eq(sentEmails.sentBy, userId), eq(sentEmails.replied, true)));
    return result?.count || 0;
  }

  async getEmailTrends(
    userId: string,
    days: number
  ): Promise<Array<{ date: string; count: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await db
      .select({
        date: sql<string>`DATE(${sentEmails.sentAt})`,
        count: sql<number>`count(*)::int`,
      })
      .from(sentEmails)
      .where(and(eq(sentEmails.sentBy, userId), gte(sentEmails.sentAt, startDate)))
      .groupBy(sql`DATE(${sentEmails.sentAt})`)
      .orderBy(sql`DATE(${sentEmails.sentAt})`);

    return results;
  }
}

export const storage = new DatabaseStorage();
