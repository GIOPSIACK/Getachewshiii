import { Router, type IRouter } from "express";
import { eq, and, ne } from "drizzle-orm";
import { db, campaignsTable, ticketsTable } from "@workspace/db";
import { requireAdmin } from "../lib/adminAuth";

const router: IRouter = Router();

// Helper: compute all taken numbers for a campaign (admin pre-sold + real ticket purchases)
async function getTakenNumbersForCampaign(campaignId: number, paymentDetails: any): Promise<number[]> {
  const pDetails = typeof paymentDetails === "string"
    ? JSON.parse(paymentDetails || "{}")
    : (paymentDetails || {});
    
  const initialTaken: number[] = Array.isArray(pDetails?.takenNumbers) ? pDetails.takenNumbers : [];
  const takenSet = new Set<number>(initialTaken);

  try {
    const tickets = await db
      .select({ luckyNumbers: ticketsTable.luckyNumbers })
      .from(ticketsTable)
      .where(
        and(
          eq(ticketsTable.campaignId, campaignId),
          ne(ticketsTable.status, "rejected")
        )
      );

    for (const t of tickets) {
      try {
        const parsed = JSON.parse(t.luckyNumbers);
        if (Array.isArray(parsed)) {
          for (const n of parsed) {
            const num = Number(n);
            if (!Number.isNaN(num) && num > 0) takenSet.add(num);
          }
        }
      } catch {}
    }
  } catch (err) {
    console.error("Error fetching taken numbers for campaign:", err);
  }

  return Array.from(takenSet).sort((a, b) => a - b);
}

// GET /campaigns - List all active campaigns
router.get("/campaigns", async (_req, res): Promise<void> => {
  try {
    const campaigns = await db
      .select()
      .from(campaignsTable)
      .orderBy(campaignsTable.createdAt);

    const shaped = await Promise.all(
      campaigns.map(async (c) => {
        const pDetails = typeof c.paymentDetails === "string"
          ? JSON.parse(c.paymentDetails || "{}")
          : (c.paymentDetails || {});
          
        const takenNumbers = await getTakenNumbersForCampaign(c.id, pDetails);
        const effectiveSold = Math.max(c.soldSlots, takenNumbers.length);

        return {
          ...c,
          title: c.title || c.vehicleModel,
          description: c.description || `${c.vehicleModel} Ekub Lottery Draw`,
          ticketPrice: Number(c.ticketPrice),
          soldSlots: effectiveSold,
          takenNumbers,
          paymentDetails: {
            telebirrNumber: String(pDetails?.telebirrNumber || "0911223344"),
            cbeAccount: String(pDetails?.cbeAccount || pDetails?.cbeAccountNumber || "100012345678"),
            accountName: String(pDetails?.accountName || "Gech EV Ekub"),
          },
        };
      })
    );

    res.json(shaped);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to load campaigns" });
  }
});

// GET /campaigns/:id/taken-numbers - Specific endpoint for taken numbers grid
router.get("/campaigns/:id/taken-numbers", async (req, res): Promise<void> => {
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

    const takenNumbers = await getTakenNumbersForCampaign(campaign.id, campaign.paymentDetails);
    const effectiveSold = Math.max(campaign.soldSlots, takenNumbers.length);

    res.json({
      campaignId: campaign.id,
      totalSlots: campaign.totalSlots,
      soldSlots: effectiveSold,
      takenNumbers,
      availableCount: Math.max(0, campaign.totalSlots - takenNumbers.length),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch taken numbers" });
  }
});

// POST /admin/campaigns - Add active lottery with automatic pre-sold numbers
router.post("/admin/campaigns", requireAdmin, async (req, res): Promise<void> => {
  const {
    title,
    description,
    imageUrl,
    vehicleModel,
    vehicleYear,
    ticketPrice,
    totalSlots,
    initialSoldTickets,
    soldTickets,
    drawDate,
    status = "active",
    paymentDetails,
  } = req.body || {};

  if (!vehicleModel || !ticketPrice || !totalSlots || !drawDate) {
    res.status(400).json({ error: "Missing required fields: vehicleModel, ticketPrice, totalSlots, drawDate" });
    return;
  }

  const drawDateParsed = new Date(drawDate);
  if (Number.isNaN(drawDateParsed.getTime())) {
    res.status(400).json({ error: "Invalid drawDate format" });
    return;
  }

  const numPrice = Number(ticketPrice);
  const numSlots = parseInt(String(totalSlots), 10);
  const numYear = parseInt(String(vehicleYear), 10) || 2025;

  if (Number.isNaN(numPrice) || numPrice <= 0) {
    res.status(400).json({ error: "ticketPrice must be a positive number" });
    return;
  }

  if (Number.isNaN(numSlots) || numSlots <= 0) {
    res.status(400).json({ error: "totalSlots must be a positive integer" });
    return;
  }

  // Parse initial sold tickets and automatically select random numbers to lock as taken
  const targetSold = Math.min(
    numSlots,
    Math.max(0, parseInt(String(initialSoldTickets ?? soldTickets ?? 0), 10))
  );

  const takenSet = new Set<number>();
  while (takenSet.size < targetSold) {
    const rand = Math.floor(Math.random() * numSlots) + 1;
    takenSet.add(rand);
  }
  const initialTaken = Array.from(takenSet).sort((a, b) => a - b);

  const pDetails = {
    telebirrNumber: String(paymentDetails?.telebirrNumber || ""),
    cbeAccount: String(paymentDetails?.cbeAccount || ""),
    accountName: String(paymentDetails?.accountName || "Gech EV Ekub"),
    takenNumbers: initialTaken,
  };

  try {
    const [inserted] = await db
      .insert(campaignsTable)
      .values({
        title: title ? String(title).trim() : String(vehicleModel).trim(),
        description: description ? String(description).trim() : `${String(vehicleModel).trim()} Ekub Lottery Draw`,
        imageUrl: imageUrl ? String(imageUrl).trim() : null,
        vehicleModel: String(vehicleModel).trim(),
        vehicleYear: numYear,
        ticketPrice: numPrice.toFixed(2),
        totalSlots: numSlots,
        soldSlots: targetSold,
        drawDate: drawDateParsed,
        status: ["active", "completed", "cancelled"].includes(status) ? status : "active",
        paymentDetails: pDetails,
      })
      .returning();

    const shaped = {
      ...inserted,
      ticketPrice: Number(inserted.ticketPrice),
      soldSlots: targetSold,
      takenNumbers: initialTaken,
      paymentDetails: {
        telebirrNumber: pDetails.telebirrNumber,
        cbeAccount: pDetails.cbeAccount,
        accountName: pDetails.accountName,
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

// GET /campaigns/:id - Get single campaign details including taken numbers
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

    const takenNumbers = await getTakenNumbersForCampaign(campaign.id, pDetails);
    const effectiveSold = Math.max(campaign.soldSlots, takenNumbers.length);

    const shaped = {
      ...campaign,
      title: campaign.title || campaign.vehicleModel,
      description: campaign.description || `${campaign.vehicleModel} Ekub Lottery Draw`,
      ticketPrice: Number(campaign.ticketPrice),
      soldSlots: effectiveSold,
      takenNumbers,
      paymentDetails: {
        telebirrNumber: String(pDetails?.telebirrNumber || "0911223344"),
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
