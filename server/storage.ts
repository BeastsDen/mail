// Database storage implementation using Drizzle ORM
import {
  users,
  datasets,
  datasetContacts,
  emailTemplates,
  sentEmails,
  receivedEmails,
  emailThreads,
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
  type EmailThread,
  type InsertEmailThread,
  type ActivityLog,
  type InsertActivityLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql, or, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(userId: string, role: string): Promise<User>;
  deleteUser(userId: string): Promise<void>;
  blockUser(userId: string, blockedUntil?: Date): Promise<User>;
  unblockUser(userId: string): Promise<User>;
  updatePassword(userId: string, passwordHash: string): Promise<User>;

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
  syncReceivedEmail(email: Omit<InsertReceivedEmail, 'id'>): Promise<ReceivedEmail>;
  syncSentEmail(email: Omit<InsertSentEmail, 'id'>): Promise<SentEmail>;

  // Email thread operations
  getEmailThreads(leadStatus?: string): Promise<EmailThread[]>;
  getEmailThread(threadId: string): Promise<EmailThread | undefined>;
  getThreadMessages(threadId: string): Promise<Array<SentEmail | ReceivedEmail>>;
  updateThreadStatus(threadId: string, leadStatus: string): Promise<EmailThread>;
  createOrUpdateThread(thread: Omit<InsertEmailThread, 'id'>): Promise<EmailThread>;

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

  async getAllUsers(limit: number = 10000): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt)).limit(limit);
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async deleteUser(userId: string): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }

  async blockUser(userId: string, blockedUntil?: Date): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        isBlocked: true, 
        blockedUntil: blockedUntil || null,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async unblockUser(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        isBlocked: false, 
        blockedUntil: null,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updatePassword(userId: string, passwordHash: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        passwordHash, 
        passwordChangedAt: new Date(),
        updatedAt: new Date() 
      })
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

  async getAllDatasets(limit: number = 5000): Promise<Dataset[]> {
    return await db.select().from(datasets).orderBy(desc(datasets.createdAt)).limit(limit);
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

  async getAllEmailTemplates(limit: number = 5000): Promise<EmailTemplate[]> {
    return await db.select().from(emailTemplates).orderBy(desc(emailTemplates.createdAt)).limit(limit);
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

  async getAllSentEmails(limit: number = 1000): Promise<SentEmail[]> {
    return await db.select().from(sentEmails).orderBy(desc(sentEmails.sentAt)).limit(limit);
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

  // Email sync operations
  async syncReceivedEmail(email: Omit<InsertReceivedEmail, 'id'>): Promise<ReceivedEmail> {
    // Check if message already exists first
    const [existing] = await db
      .select()
      .from(receivedEmails)
      .where(eq(receivedEmails.messageId, email.messageId || ''));

    if (existing) {
      // Message exists, just ensure thread exists and update threadId if needed
      const thread = await this.createOrUpdateThread({
        conversationId: email.conversationId || '',
        subject: email.subject,
        participantEmails: [email.senderEmail],
        leadStatus: 'unassigned',
        lastMessageAt: email.receivedAt,
        unreadCount: 0, // Don't increment for existing messages
      });

      const [updated] = await db
        .update(receivedEmails)
        .set({ ...email, threadId: thread.id })
        .where(eq(receivedEmails.id, existing.id))
        .returning();

      return updated;
    }

    // New message - create thread and add the message
    const thread = await this.createOrUpdateThread({
      conversationId: email.conversationId || '',
      subject: email.subject,
      participantEmails: [email.senderEmail],
      leadStatus: 'unassigned',
      lastMessageAt: email.receivedAt,
      unreadCount: 0, // Will be updated after insert
    });

    const [created] = await db
      .insert(receivedEmails)
      .values({ ...email, threadId: thread.id })
      .returning();

    // Refresh counts after inserting new message
    await this.refreshThreadMessageCount(thread.id);
    await this.refreshThreadUnreadCount(thread.id);

    return created;
  }

  async syncSentEmail(email: Omit<InsertSentEmail, 'id'>): Promise<SentEmail> {
    // Check if message already exists first
    const [existing] = await db
      .select()
      .from(sentEmails)
      .where(eq(sentEmails.messageId, email.messageId || ''));

    if (existing) {
      // Message exists, just ensure thread exists and update threadId if needed
      const thread = await this.createOrUpdateThread({
        conversationId: email.conversationId || '',
        subject: email.subject,
        participantEmails: [email.recipientEmail],
        leadStatus: email.leadStatus || 'unassigned',
        lastMessageAt: email.sentAt || new Date(),
        unreadCount: 0, // Don't increment for existing messages
      });

      const [updated] = await db
        .update(sentEmails)
        .set({ ...email, threadId: thread.id, updatedAt: new Date() })
        .where(eq(sentEmails.id, existing.id))
        .returning();

      return updated;
    }

    // New message - create thread and add the message
    const thread = await this.createOrUpdateThread({
      conversationId: email.conversationId || '',
      subject: email.subject,
      participantEmails: [email.recipientEmail],
      leadStatus: email.leadStatus || 'unassigned',
      lastMessageAt: email.sentAt || new Date(),
      unreadCount: 0, // Will be updated after insert
    });

    const [created] = await db
      .insert(sentEmails)
      .values({ ...email, threadId: thread.id })
      .returning();

    // Refresh counts after inserting new message
    await this.refreshThreadMessageCount(thread.id);
    await this.refreshThreadUnreadCount(thread.id);

    return created;
  }

  // Email thread operations
  async getEmailThreads(leadStatus?: string): Promise<EmailThread[]> {
    if (leadStatus && leadStatus !== 'all') {
      return await db
        .select()
        .from(emailThreads)
        .where(eq(emailThreads.leadStatus, leadStatus))
        .orderBy(desc(emailThreads.lastMessageAt));
    }
    
    return await db
      .select()
      .from(emailThreads)
      .orderBy(desc(emailThreads.lastMessageAt));
  }

  async getEmailThread(threadId: string): Promise<EmailThread | undefined> {
    const [thread] = await db
      .select()
      .from(emailThreads)
      .where(eq(emailThreads.id, threadId));
    return thread || undefined;
  }

  async getThreadMessages(threadId: string): Promise<Array<SentEmail | ReceivedEmail>> {
    // Get the thread first to get conversationId as fallback
    const thread = await this.getEmailThread(threadId);
    
    // Try by threadId first, fallback to conversationId
    const [sent, received] = await Promise.all([
      db.select().from(sentEmails).where(
        thread?.conversationId 
          ? or(
              eq(sentEmails.threadId, threadId),
              eq(sentEmails.conversationId, thread.conversationId)
            )!
          : eq(sentEmails.threadId, threadId)
      ),
      db.select().from(receivedEmails).where(
        thread?.conversationId
          ? or(
              eq(receivedEmails.threadId, threadId),
              eq(receivedEmails.conversationId, thread.conversationId)
            )!
          : eq(receivedEmails.threadId, threadId)
      )
    ]);

    const allMessages = [
      ...sent.map(m => ({ ...m, type: 'sent' as const })),
      ...received.map(m => ({ ...m, type: 'received' as const }))
    ].sort((a, b) => {
      const dateA = 'sentAt' in a ? a.sentAt : a.receivedAt;
      const dateB = 'sentAt' in b ? b.sentAt : b.receivedAt;
      return new Date(dateA || 0).getTime() - new Date(dateB || 0).getTime();
    });

    return allMessages;
  }

  async updateThreadStatus(threadId: string, leadStatus: string): Promise<EmailThread> {
    const [updated] = await db
      .update(emailThreads)
      .set({ leadStatus, updatedAt: new Date() })
      .where(eq(emailThreads.id, threadId))
      .returning();
    return updated;
  }

  async createOrUpdateThread(thread: Omit<InsertEmailThread, 'id' | 'messageCount'>): Promise<EmailThread> {
    const [existing] = await db
      .select()
      .from(emailThreads)
      .where(eq(emailThreads.conversationId, thread.conversationId));

    if (existing) {
      // Only update lastMessageAt if the new message is newer
      const shouldUpdateTime = new Date(thread.lastMessageAt).getTime() > new Date(existing.lastMessageAt).getTime();
      
      // Deduplicate participant emails
      const currentParticipants = existing.participantEmails || [];
      const newParticipants = thread.participantEmails || [];
      const allParticipants = Array.from(new Set([...currentParticipants, ...newParticipants]));

      const [updated] = await db
        .update(emailThreads)
        .set({
          subject: thread.subject,
          lastMessageAt: shouldUpdateTime ? thread.lastMessageAt : existing.lastMessageAt,
          unreadCount: (thread.unreadCount || 0) > 0 
            ? existing.unreadCount + (thread.unreadCount || 0)
            : existing.unreadCount,
          participantEmails: allParticipants,
          updatedAt: new Date(),
        })
        .where(eq(emailThreads.id, existing.id))
        .returning();

      // Don't need to refresh counts here - only when new messages are added

      return updated;
    }

    // For new threads, start with messageCount of 0, it will be updated after email is inserted
    const [created] = await db
      .insert(emailThreads)
      .values({ ...thread, messageCount: 0 })
      .returning();

    return created;
  }

  private async refreshThreadMessageCount(threadId: string): Promise<void> {
    const [sentCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sentEmails)
      .where(eq(sentEmails.threadId, threadId));

    const [receivedCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(receivedEmails)
      .where(eq(receivedEmails.threadId, threadId));

    const totalCount = (sentCount?.count || 0) + (receivedCount?.count || 0);

    await db
      .update(emailThreads)
      .set({ messageCount: totalCount })
      .where(eq(emailThreads.id, threadId));
  }

  private async refreshThreadUnreadCount(threadId: string): Promise<void> {
    const [unreadCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(receivedEmails)
      .where(and(
        eq(receivedEmails.threadId, threadId),
        eq(receivedEmails.isRead, false)
      ));

    await db
      .update(emailThreads)
      .set({ unreadCount: unreadCount?.count || 0 })
      .where(eq(emailThreads.id, threadId));
  }
}

export const storage = new DatabaseStorage();
