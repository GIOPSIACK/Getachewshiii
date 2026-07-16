import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, campaignsTable, ticketsTable } from "@workspace/db";
import { requireAdmin } from "../lib/adminAuth";
import {
  ListTicketsQueryParams,
  ListTicketsResponse,
  CreateTicketBody,
  CreateTicketResponse,
  GetTicketStatsQueryParams,
  GetTicketStatsResponse,
  GetTicketParams,
  GetTicketResponse,
  UpdateTicketStatusParams,
  UpdateTicketStatusBody,
  UpdateTicketStatusResponse,
  UploadReceiptBody,
  UploadReceiptResponse,
  AdminListTicketsQueryParams,
  AdminListTicketsResponse,
} from "@workspace/api-zod";
import * as fs from "fs";
import * as path from "path";

const router: IRouter = Router();

// Helper to shape a ticket row with its campaign
async function shapeTicket(ticket: typeof ticketsTable.$inferSelect) {
  const [campaign] = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.id, ticket.campaignId));

  return {
    ...ticket,
    totalAmount: Number(ticket.totalAmount),
    luckyNumbers: JSON.parse(ticket.luckyNumbers) as number[],
    campaign: campaign
      ? {
          ...campaign,
          ticketPrice: Number(campaign.ticketPrice),
          paymentDetails: campaign.paymentDetails as {
            telebirrNumber: string;
            cbeAccount: string;
            accountName: string;
          },
        }
      : undefined,
  };
}

// GET /tickets?phone=xxx
router.get("/tickets", async (req, res): Promise<void> => {
  const parsed = ListTicketsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const tickets = await db
    .select()
    .from(ticketsTable)
    .where(eq(ticketsTable.buyerPhone, parsed.data.phone))
    .orderBy(ticketsTable.createdAt);

  const shaped = await Promise.all(tickets.map(shapeTicket));
  res.json(ListTicketsResponse.parse(shaped));
});

// GET /tickets/stats?phone=xxx
router.get("/tickets/stats", async (req, res): Promise<void> => {
  const parsed = GetTicketStatsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const tickets = await db
    .select()
    .from(ticketsTable)
    .where(eq(ticketsTable.buyerPhone, parsed.data.phone));

  const active = tickets.filter((t) => t.status === "active").length;
  const pending = tickets.filter((t) => t.status === "pending").length;
  const rejected = tickets.filter((t) => t.status === "rejected").length;
  const total = tickets.length;

  res.json(
    GetTicketStatsResponse.parse({
      phone: parsed.data.phone,
      active,
      pending,
      rejected,
      total,
    }),
  );
});

// GET /tickets/:id
router.get("/tickets/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetTicketParams.safeParse({ id: raw });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [ticket] = await db
    .select()
    .from(ticketsTable)
    .where(eq(ticketsTable.id, parsed.data.id));

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const shaped = await shapeTicket(ticket);
  res.json(GetTicketResponse.parse(shaped));
});

// POST /tickets
router.post("/tickets", async (req, res): Promise<void> => {
  const parsed = CreateTicketBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const body = parsed.data;

  // Verify campaign exists
  const [campaign] = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.id, body.campaignId));

  if (!campaign) {
    res.status(400).json({ error: "Campaign not found" });
    return;
  }

  // Generate a ticket number
  const ticketNumber = `#${Math.floor(1000 + Math.random() * 8999)}`;
  const totalAmount = Number(campaign.ticketPrice) * body.quantity;

  const [ticket] = await db
    .insert(ticketsTable)
    .values({
      campaignId: body.campaignId,
      ticketNumber,
      buyerName: body.buyerName,
      buyerPhone: body.buyerPhone,
      quantity: body.quantity,
      luckyNumbers: JSON.stringify(body.luckyNumbers),
      paymentMethod: body.paymentMethod,
      senderAccount: body.senderAccount,
      receiptImageUrl: body.receiptImageUrl ?? null,
      status: "pending",
      totalAmount: totalAmount.toFixed(2),
    })
    .returning();

  // Increment sold slots
  await db
    .update(campaignsTable)
    .set({ soldSlots: campaign.soldSlots + body.quantity })
    .where(eq(campaignsTable.id, body.campaignId));

  const shaped = await shapeTicket(ticket);
  res.status(201).json(CreateTicketResponse.parse(shaped));
});

// PATCH /tickets/:id/status
router.patch("/tickets/:id/status", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateTicketStatusParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateTicketStatusBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [ticket] = await db
    .update(ticketsTable)
    .set({ status: body.data.status })
    .where(eq(ticketsTable.id, params.data.id))
    .returning();

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const shaped = await shapeTicket(ticket);
  res.json(UpdateTicketStatusResponse.parse(shaped));
});

// POST /receipts/upload (base64 image stored as data URI)
router.post("/receipts/upload", async (req, res): Promise<void> => {
  const parsed = UploadReceiptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Store as data URI — simple approach without object storage
  const dataUri = `data:${parsed.data.mimeType};base64,${parsed.data.imageData}`;
  res.json(UploadReceiptResponse.parse({ url: dataUri }));
});

// GET /admin/tickets
router.get("/admin/tickets", requireAdmin, async (req, res): Promise<void> => {
  const parsed = AdminListTicketsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const baseQuery = db.select().from(ticketsTable);
  const tickets = parsed.data.status
    ? await baseQuery.where(eq(ticketsTable.status, parsed.data.status as "pending" | "active" | "rejected"))
    : await baseQuery;

  const shaped = await Promise.all(tickets.map(shapeTicket));
  res.json(AdminListTicketsResponse.parse(shaped));
});

export default router;
