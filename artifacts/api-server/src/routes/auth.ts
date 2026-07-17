import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { db, registrationsTable } from "@workspace/db";

const router: IRouter = Router();
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

router.post("/telegram", async (req, res): Promise<void> => {
  const { initData } = req.body || {};
  if (!initData || typeof initData !== "string") {
    res.status(400).json({ error: "Missing initData" });
    return;
  }
  if (!TOKEN) {
    res.status(500).json({ error: "Bot token not configured" });
    return;
  }

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) {
      res.status(400).json({ error: "Missing hash in initData" });
      return;
    }

    params.delete("hash");

    const sortedEntries = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = sortedEntries.map(([k, v]) => `${k}=${v}`).join("\n");

    const secretKey = crypto.createHmac("sha256", "WebAppData").update(TOKEN).digest();
    const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    if (calculatedHash !== hash) {
      res.status(401).json({ error: "Invalid initData signature" });
      return;
    }

    const userParam = params.get("user");
    if (!userParam) {
      res.status(400).json({ error: "Missing user in initData" });
      return;
    }

    const user = JSON.parse(userParam);
    const telegramId = String(user.id);
    const firstName = user.first_name;

    await db
      .insert(registrationsTable)
      .values({
        telegramId,
        firstName,
        username: user.username,
        botState: { step: "idle" },
      })
      .onConflictDoUpdate({
        target: registrationsTable.telegramId,
        set: { firstName, username: user.username, updatedAt: new Date() },
      });

    res.json({ ok: true, user: { id: telegramId, firstName } });
  } catch (e) {
    console.error("auth/telegram error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
