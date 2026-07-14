import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, campaignsTable } from "@workspace/db";
import {
  ListCampaignsResponse,
  GetCampaignParams,
  GetCampaignResponse,
} from "@workspace/api-zod";

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

router.get("/campaigns/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetCampaignParams.safeParse({ id: raw });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [campaign] = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.id, parsed.data.id));

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  const shaped = {
    ...campaign,
    ticketPrice: Number(campaign.ticketPrice),
    paymentDetails: campaign.paymentDetails as {
      telebirrNumber: string;
      cbeAccount: string;
      accountName: string;
    },
  };

  res.json(GetCampaignResponse.parse(shaped));
});

export default router;
