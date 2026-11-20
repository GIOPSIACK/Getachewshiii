import { pgTable, serial, text, integer, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const campaignsTable = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  vehicleModel: text("vehicle_model").notNull(),
  vehicleYear: integer("vehicle_year").notNull(),
  ticketPrice: numeric("ticket_price", { precision: 10, scale: 2 }).notNull(),
  totalSlots: integer("total_slots").notNull(),
  soldSlots: integer("sold_slots").notNull().default(0),
  drawDate: timestamp("draw_date").notNull(),
  status: text("status", { enum: ["active", "completed", "cancelled"] }).notNull().default("active"),
  paymentDetails: jsonb("payment_details").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCampaignSchema = createInsertSchema(campaignsTable).omit({ id: true, createdAt: true });
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaignsTable.$inferSelect;
