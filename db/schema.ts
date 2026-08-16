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

export const fitnessProfiles = sqliteTable("fitness_profiles", {
  ownerId: text("owner_id").primaryKey(),
  goal: text("goal", { enum: ["muscle_gain", "fat_loss", "strength", "general_fitness"] }).notNull(),
  experience: text("experience", { enum: ["beginner", "intermediate", "advanced"] }).notNull(),
  daysPerWeek: integer("days_per_week").notNull(),
  sessionMinutes: integer("session_minutes").notNull(),
  equipment: text("equipment", { enum: ["full_gym", "home_dumbbells", "bodyweight"] }).notNull(),
  limitations: text("limitations").notNull(),
  preferredExercises: text("preferred_exercises").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [index("fitness_profiles_updated_idx").on(table.updatedAt)]);

export const usageEvents = sqliteTable("usage_events", {
  id: text("id").primaryKey(),
  eventName: text("event_name").notNull(),
  route: text("route").notNull(),
  authType: text("auth_type", { enum: ["account", "guest"] }).notNull(),
  statusCode: integer("status_code").notNull(),
  durationMs: integer("duration_ms").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index("usage_events_created_idx").on(table.createdAt),
  index("usage_events_name_created_idx").on(table.eventName, table.createdAt),
]);

export const errorEvents = sqliteTable("error_events", {
  id: text("id").primaryKey(),
  area: text("area").notNull(),
  code: text("code").notNull(),
  route: text("route").notNull(),
  authType: text("auth_type", { enum: ["account", "guest"] }).notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index("error_events_created_idx").on(table.createdAt),
  index("error_events_code_created_idx").on(table.code, table.createdAt),
]);
