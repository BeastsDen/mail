import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles enum
export const UserRole = {
  ADMIN: 'admin',
  SALES: 'sales',
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

// Users table - required for Replit Auth with role extension
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 20 }).notNull().default('sales'), // 'admin' or 'sales'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Datasets table - stores uploaded contact lists
export const datasets = pgTable("datasets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
  recordsCount: integer("records_count").notNull().default(0),
  status: varchar("status", { length: 50 }).notNull().default('active'), // 'active', 'archived'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDatasetSchema = createInsertSchema(datasets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDataset = z.infer<typeof insertDatasetSchema>;
export type Dataset = typeof datasets.$inferSelect;

// Dataset contacts - individual records within datasets
export const datasetContacts = pgTable("dataset_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  datasetId: varchar("dataset_id").notNull().references(() => datasets.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }),
  customFields: jsonb("custom_fields"), // Store additional fields from CSV
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDatasetContactSchema = createInsertSchema(datasetContacts).omit({
  id: true,
  createdAt: true,
});

export type InsertDatasetContact = z.infer<typeof insertDatasetContactSchema>;
export type DatasetContact = typeof datasetContacts.$inferSelect;

// Email templates - reusable email templates with variables
export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(), // Supports {{variable}} placeholders
  variables: text("variables").array(), // List of variables used in template
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  lastUsed: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;

// Lead status enum
export const LeadStatus = {
  HOT: 'hot',
  COLD: 'cold',
  DEAD: 'dead',
  UNASSIGNED: 'unassigned',
} as const;

export type LeadStatusType = typeof LeadStatus[keyof typeof LeadStatus];

// Email status enum
export const EmailStatus = {
  PENDING: 'pending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  OPENED: 'opened',
  REPLIED: 'replied',
} as const;

export type EmailStatusType = typeof EmailStatus[keyof typeof EmailStatus];

// Sent emails tracking
export const sentEmails = pgTable("sent_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id", { length: 500 }).unique(), // Outlook message ID
  conversationId: varchar("conversation_id", { length: 500 }), // Thread ID
  sentBy: varchar("sent_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
  recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
  recipientName: varchar("recipient_name", { length: 255 }),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  templateId: varchar("template_id").references(() => emailTemplates.id, { onDelete: 'set null' }),
  datasetId: varchar("dataset_id").references(() => datasets.id, { onDelete: 'set null' }),
  contactId: varchar("contact_id").references(() => datasetContacts.id, { onDelete: 'set null' }),
  status: varchar("status", { length: 50 }).notNull().default('pending'),
  leadStatus: varchar("lead_status", { length: 50 }).notNull().default('unassigned'),
  opened: boolean("opened").notNull().default(false),
  openedAt: timestamp("opened_at"),
  replied: boolean("replied").notNull().default(false),
  repliedAt: timestamp("replied_at"),
  sentAt: timestamp("sent_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSentEmailSchema = createInsertSchema(sentEmails).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSentEmail = z.infer<typeof insertSentEmailSchema>;
export type SentEmail = typeof sentEmails.$inferSelect;

// Received emails tracking
export const receivedEmails = pgTable("received_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id", { length: 500 }).unique(), // Outlook message ID
  conversationId: varchar("conversation_id", { length: 500 }), // Thread ID
  senderEmail: varchar("sender_email", { length: 255 }).notNull(),
  senderName: varchar("sender_name", { length: 255 }),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  receivedBy: varchar("received_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
  isReply: boolean("is_reply").notNull().default(false),
  originalEmailId: varchar("original_email_id").references(() => sentEmails.id, { onDelete: 'set null' }),
  receivedAt: timestamp("received_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReceivedEmailSchema = createInsertSchema(receivedEmails).omit({
  id: true,
  createdAt: true,
});

export type InsertReceivedEmail = z.infer<typeof insertReceivedEmailSchema>;
export type ReceivedEmail = typeof receivedEmails.$inferSelect;

// Activity logs
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: varchar("action", { length: 100 }).notNull(), // e.g., 'email_sent', 'template_created', 'dataset_uploaded'
  entityType: varchar("entity_type", { length: 50 }), // e.g., 'email', 'template', 'dataset'
  entityId: varchar("entity_id"), // Reference to the affected entity
  details: jsonb("details"), // Additional context
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_activity_user_created").on(table.userId, table.createdAt)]);

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  datasets: many(datasets),
  emailTemplates: many(emailTemplates),
  sentEmails: many(sentEmails),
  receivedEmails: many(receivedEmails),
  activityLogs: many(activityLogs),
}));

export const datasetsRelations = relations(datasets, ({ one, many }) => ({
  uploadedByUser: one(users, {
    fields: [datasets.uploadedBy],
    references: [users.id],
  }),
  contacts: many(datasetContacts),
  sentEmails: many(sentEmails),
}));

export const datasetContactsRelations = relations(datasetContacts, ({ one, many }) => ({
  dataset: one(datasets, {
    fields: [datasetContacts.datasetId],
    references: [datasets.id],
  }),
  sentEmails: many(sentEmails),
}));

export const emailTemplatesRelations = relations(emailTemplates, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [emailTemplates.createdBy],
    references: [users.id],
  }),
  sentEmails: many(sentEmails),
}));

export const sentEmailsRelations = relations(sentEmails, ({ one, many }) => ({
  sentByUser: one(users, {
    fields: [sentEmails.sentBy],
    references: [users.id],
  }),
  template: one(emailTemplates, {
    fields: [sentEmails.templateId],
    references: [emailTemplates.id],
  }),
  dataset: one(datasets, {
    fields: [sentEmails.datasetId],
    references: [datasets.id],
  }),
  contact: one(datasetContacts, {
    fields: [sentEmails.contactId],
    references: [datasetContacts.id],
  }),
  replies: many(receivedEmails),
}));

export const receivedEmailsRelations = relations(receivedEmails, ({ one }) => ({
  receivedByUser: one(users, {
    fields: [receivedEmails.receivedBy],
    references: [users.id],
  }),
  originalEmail: one(sentEmails, {
    fields: [receivedEmails.originalEmailId],
    references: [sentEmails.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));
