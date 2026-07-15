import { pgTable, serial, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const registrationsTable = pgTable("registrations", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull().unique(),
  username: text("username"),
  firstName: text("first_name"),
  phone: text("phone"),
  botState: jsonb("bot_state").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Registration = typeof registrationsTable.$inferSelect;
export type InsertRegistration = typeof registrationsTable.$inferInsert;
