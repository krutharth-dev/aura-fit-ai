import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  ownerId: text("device_id").notNull(),
  title: text("title").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [index("conversations_device_updated_idx").on(table.ownerId, table.updatedAt)]);

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  route: text("route"),
  source: text("source"),
  traceJson: text("trace_json"),
  createdAt: integer("created_at").notNull(),
  sequence: integer("sequence").notNull(),
}, (table) => [
  index("messages_conversation_sequence_idx").on(table.conversationId, table.sequence),
  uniqueIndex("messages_conversation_sequence_unique").on(table.conversationId, table.sequence),
]);

export const rateLimits = sqliteTable("rate_limits", {
  bucketKey: text("bucket_key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: integer("reset_at").notNull(),
}, (table) => [index("rate_limits_reset_idx").on(table.resetAt)]);
