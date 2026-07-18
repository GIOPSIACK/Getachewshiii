import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { db, registrationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

function parseInitData(initData: string): Map<string, string> {
  const params = new Map<string, string>();
  const pairs = initData.split("&");
  for (const pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const key = pair.slice(0, idx);
    const value = pair.slice(idx + 1);
    params.set(key, value);
  }
  return params;
}

router.post("/telegram", async (req, res): Promise<void> => {
  const { initData, fallbackUser } = req.body || {};
  if (!TOKEN) {
    res.status(500).json({ error: "Bot token not configured" });
    return;
  }

  try {
    let telegramId: string | null = null;
    let firstName: string | null = null;
    let username: string | null = null;

    if (typeof initData === "string" && initData.length > 0) {
      const params = parseInitData(initData);
      const hash = params.get("hash");

      if (hash) {
        params.delete("hash");
        const sortedEntries = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));
        const dataCheckString = sortedEntries.map(([k, v]) => `${k}=${v}`).join("\n");
        const secretKey = crypto.createHmac("sha256", "WebAppData").update(TOKEN).digest();
        const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

        if (calculatedHash === hash) {
          const userParam = params.get("user");
          if (userParam) {
            const user = JSON.parse(decodeURIComponent(userParam));
            telegramId = String(user.id);
            firstName = user.first_name;
            username = user.username || null;
          }
        }
      }
    }

    if (!telegramId && fallbackUser) {
      telegramId = String(fallbackUser.id);
      firstName = fallbackUser.first_name;
      username = fallbackUser.username || null;
    }

    if (!telegramId) {
      res.status(400).json({ error: "Cannot determine telegram user" });
      return;
    }

    const existing = await db
      .select()
      .from(registrationsTable)
      .where(eq(registrationsTable.telegramId, telegramId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(registrationsTable)
        .set({ firstName, username, updatedAt: new Date() })
        .where(eq(registrationsTable.telegramId, telegramId));
    } else {
      await db
        .insert(registrationsTable)
        .values({
          telegramId,
          firstName,
          username,
          botState: { step: "idle" },
        });
    }

    const [userRow] = await db
      .select()
      .from(registrationsTable)
      .where(eq(registrationsTable.telegramId, telegramId))
      .limit(1);

    res.json({
      ok: true,
      user: {
        id: userRow.telegramId,
        firstName: userRow.firstName,
        phone: userRow.phone,
      },
    });
  } catch (e) {
    console.error("auth/telegram error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
