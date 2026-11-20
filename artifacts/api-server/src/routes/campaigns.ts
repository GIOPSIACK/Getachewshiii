import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, campaignsTable } from "@workspace/db";
import {
  ListCampaignsResponse,
  GetCampaignParams,
  GetCampaignResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../lib/adminAuth";

const router: IRouter = Router();

router.get("/campaigns", async (_req, res): Promise<void> => {
  const campaigns = await db
    .select()
    .from(campaignsTable)
    .orderBy(campaignsTable.createdAt);

  const shaped = campaigns.map((c) => ({
    ...c,
    ticketPrice: Number(c.ticketPrice),
    paymentDetails: c.paymentDetails as {
      telebirrNumber: string;
      cbeAccount: string;
      accountName: string;
    },
  }));

  res.json(ListCampaignsResponse.parse(shaped));
});

// POST /admin/campaigns - Add active lottery
router.post("/admin/campaigns", requireAdmin, async (req, res): Promise<void> => {
  const {
    title,
    description,
    imageUrl,
    vehicleModel,
    vehicleYear,
    ticketPrice,
    totalSlots,
    drawDate,
    status = "active",
    paymentDetails,
  } = req.body || {};

  if (!title || !description || !vehicleModel || !vehicleYear || !ticketPrice || !totalSlots || !drawDate) {
    res.status(400).json({ error: "Missing required fields: title, description, vehicleModel, vehicleYear, ticketPrice, totalSlots, drawDate" });
    return;
  }

  const drawDateParsed = new Date(drawDate);
  if (Number.isNaN(drawDateParsed.getTime())) {
    res.status(400).json({ error: "Invalid drawDate format" });
    return;
  }

  const numPrice = Number(ticketPrice);
  const numSlots = parseInt(String(totalSlots), 10);
  const numYear = parseInt(String(vehicleYear), 10);

  if (Number.isNaN(numPrice) || numPrice <= 0) {
    res.status(400).json({ error: "ticketPrice must be a positive number" });
    return;
  }

  if (Number.isNaN(numSlots) || numSlots <= 0) {
    res.status(400).json({ error: "totalSlots must be a positive integer" });
    return;
  }

  const pDetails = {
    telebirrNumber: String(paymentDetails?.telebirrNumber || ""),
    cbeAccount: String(paymentDetails?.cbeAccount || ""),
    accountName: String(paymentDetails?.accountName || ""),
  };

  try {
    const [inserted] = await db
      .insert(campaignsTable)
      .values({
        title: title ? String(title).trim() : String(vehicleModel).trim(),
        description: description ? String(description).trim() : `${String(vehicleModel).trim()} Ekub Lottery Draw`,
        imageUrl: imageUrl ? String(imageUrl).trim() : null,
        vehicleModel: String(vehicleModel).trim(),
        vehicleYear: numYear || 2025,
        ticketPrice: numPrice.toFixed(2),
        totalSlots: numSlots,
        soldSlots: 0,
        drawDate: drawDateParsed,
        status: ["active", "completed", "cancelled"].includes(status) ? status : "active",
        paymentDetails: pDetails,
      })
      .returning();

    const shaped = {
      ...inserted,
      ticketPrice: Number(inserted.ticketPrice),
      paymentDetails: inserted.paymentDetails as {
        telebirrNumber: string;
        cbeAccount: string;
        accountName: string;
      },
    };

    res.status(201).json(shaped);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to create lottery" });
  }
});

// DELETE /admin/campaigns/:id - Delete or archive lottery
router.delete("/admin/campaigns/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = Number(rawId);
  if (!id || Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid campaign id" });
    return;
  }

  try {
    // Attempt delete; if foreign key restricts (tickets attached), soft-delete as cancelled
    try {
      await db.delete(campaignsTable).where(eq(campaignsTable.id, id));
    } catch {
      await db
        .update(campaignsTable)
        .set({ status: "cancelled" })
        .where(eq(campaignsTable.id, id));
    }
    res.json({ ok: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to remove lottery" });
  }
});

// PATCH /admin/campaigns/:id/status - Toggle lottery status
router.patch("/admin/campaigns/:id/status", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = Number(rawId);
  const status = req.body?.status;
  if (!id || !["active", "completed", "cancelled"].includes(status)) {
    res.status(400).json({ error: "Invalid request parameters" });
    return;
  }

  try {
    await db
      .update(campaignsTable)
      .set({ status })
      .where(eq(campaignsTable.id, id));
    res.json({ ok: true, id, status });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to update status" });
  }
});

router.get("/campaigns/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = Number(raw);
  if (!id || Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid campaign id" });
    return;
  }

  try {
    const [campaign] = await db
      .select()
      .from(campaignsTable)
      .where(eq(campaignsTable.id, id));

    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }

    const pDetails = typeof campaign.paymentDetails === "string"
      ? JSON.parse(campaign.paymentDetails || "{}")
      : (campaign.paymentDetails || {});

    const shaped = {
      ...campaign,
      title: campaign.title || campaign.vehicleModel,
      description: campaign.description || `${campaign.vehicleModel} Ekub Lottery Draw`,
      ticketPrice: Number(campaign.ticketPrice),
      paymentDetails: {
        telebirrNumber: String(pDetails?.telebirrNumber || pDetails?.telebirr || "0911223344"),
        cbeAccount: String(pDetails?.cbeAccount || pDetails?.cbeAccountNumber || "100012345678"),
        accountName: String(pDetails?.accountName || "Gech EV Ekub"),
      },
    };

    res.json(shaped);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch campaign" });
  }
});

export default router;
