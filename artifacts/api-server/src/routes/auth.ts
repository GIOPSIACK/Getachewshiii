import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { db, registrationsTable } from "@workspace/db";

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

function buildDataCheckString(params: Map<string, string>): string {
  const sortedEntries = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));
  return sortedEntries.map(([k, v]) => `${k}=${v}`).join("\n");
}

function validateHash(initData: string, hash: string): boolean {
  const params = parseInitData(initData);
  params.delete("hash");

  const dataCheckString = buildDataCheckString(params);

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(TOKEN!).digest();
  const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  return calculatedHash === hash;
}

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
    const params = parseInitData(initData);
    const hash = params.get("hash");

    if (!hash) {
      res.status(400).json({ error: "Missing hash in initData", debug: { initDataLength: initData.length, initDataPreview: initData.slice(0, 100) } });
      return;
    }

    const isValid = validateHash(initData, hash);
    if (!isValid) {
      res.status(401).json({ error: "Invalid initData signature", debug: { hash, initDataLength: initData.length } });
      return;
    }

    const userParam = params.get("user");
    if (!userParam) {
      res.status(400).json({ error: "Missing user in initData", debug: { keys: Array.from(params.keys()) } });
      return;
    }

    const user = JSON.parse(decodeURIComponent(userParam));
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
    res.status(500).json({ error: "Internal server error", details: String(e) });
  }
});

export default router;
