import { Router, type IRouter } from "express";
import { db, registrationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.post("/phone", async (req, res): Promise<void> => {
  const { telegramId, phone } = req.body || {};
  if (!telegramId || !phone) {
    res.status(400).json({ error: "telegramId and phone are required" });
    return;
  }

  try {
    await db
      .insert(registrationsTable)
      .values({
        telegramId: String(telegramId),
        phone: String(phone),
        botState: { step: "idle" },
      })
      .onConflictDoUpdate({
        target: registrationsTable.telegramId,
        set: { phone: String(phone), updatedAt: new Date() },
      });

    res.json({ ok: true });
  } catch (e) {
    console.error("auth/phone error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
