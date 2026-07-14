import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ticketsTable = pgTable("tickets", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  ticketNumber: text("ticket_number").notNull().unique(),
  buyerName: text("buyer_name").notNull(),
  buyerPhone: text("buyer_phone").notNull(),
  quantity: integer("quantity").notNull().default(1),
  luckyNumbers: text("lucky_numbers").notNull(), // JSON array stored as text
  paymentMethod: text("payment_method", { enum: ["telebirr", "cbe"] }).notNull(),
  senderAccount: text("sender_account").notNull(),
  receiptImageUrl: text("receipt_image_url"),
  status: text("status", { enum: ["pending", "active", "rejected"] }).notNull().default("pending"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTicketSchema = createInsertSchema(ticketsTable).omit({ id: true, createdAt: true });
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof ticketsTable.$inferSelect;
