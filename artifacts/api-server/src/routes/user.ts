import { Router, type IRouter } from "express";
import { db, registrationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/user", async (req, res): Promise<void> => {
  const telegramId = String(req.query.id || "");
  if (!telegramId) {
    res.status(400).json({ error: "Missing id parameter" });
    return;
  }
  const [reg] = await db
    .select()
    .from(registrationsTable)
    .where(eq(registrationsTable.telegramId, telegramId))
    .limit(1);

  if (!reg) {
    res.json({ ok: false, telegramId, firstName: null, lastName: null, phone: null });
    return;
  }

  res.json({
    ok: true,
    telegramId: reg.telegramId,
    firstName: reg.firstName,
    lastName: null,
    phone: reg.phone,
  });
});

export default router;
