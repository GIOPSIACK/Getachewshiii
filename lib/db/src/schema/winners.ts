import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { ticketsTable } from "./tickets";
import { campaignsTable } from "./campaigns";

export const winnersTable = pgTable("winners", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => ticketsTable.id).unique(),
  campaignId: integer("campaign_id").notNull().references(() => campaignsTable.id),
  position: integer("position").notNull().default(1),
  prize: text("prize").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Winner = typeof winnersTable.$inferSelect;
export type InsertWinner = typeof winnersTable.$inferInsert;