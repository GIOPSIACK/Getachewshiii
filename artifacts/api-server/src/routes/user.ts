import { Router, type IRouter } from "express";
import { db, registrationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/user", async (req, res): Promise<void> => {
  const telegramId = String(req.query.id || "");
  console.log("=== /api/user CALLED ===");
  console.log("Query telegramId:", telegramId);
  
  if (!telegramId) {
    console.log("ERROR: Missing id parameter");
    res.status(400).json({ error: "Missing id parameter" });
    return;
  }
  
  const [reg] = await db
    .select()
    .from(registrationsTable)
    .where(eq(registrationsTable.telegramId, telegramId))
    .limit(1);

  console.log("Database query result:", reg);

  if (!reg) {
    console.log("No registration found for telegramId:", telegramId);
    res.json({ ok: false, telegramId, firstName: null, lastName: null, phone: null });
    return;
  }

  console.log("Returning user data:", {
    ok: true,
    telegramId: reg.telegramId,
    firstName: reg.firstName,
    phone: reg.phone,
  });

  res.json({
    ok: true,
    telegramId: reg.telegramId,
    firstName: reg.firstName,
    lastName: null,
    phone: reg.phone,
  });
});

export default router;
