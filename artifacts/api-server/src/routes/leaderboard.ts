import { Router, type IRouter } from "express";
import { sql, eq } from "drizzle-orm";
import { db, ticketsTable } from "@workspace/db";

const router: IRouter = Router();

// GET /leaderboard - top buyers ranked by number of active tickets
router.get("/leaderboard", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      buyerName: ticketsTable.buyerName,
      buyerPhone: ticketsTable.buyerPhone,
      ticketCount: sql<number>`count(*)`.as("ticket_count"),
    })
    .from(ticketsTable)
    .where(eq(ticketsTable.status, "active"))
    .groupBy(ticketsTable.buyerName, ticketsTable.buyerPhone)
    .orderBy(sql`count(*) desc`)
    .limit(20);

  const leaderboard = rows.map((r, i) => ({
    rank: i + 1,
    buyerName: r.buyerName,
    buyerPhone: `${r.buyerPhone.slice(0, 5)}***${r.buyerPhone.slice(-2)}`,
    ticketCount: Number(r.ticketCount),
  }));

  res.json({ leaderboard });
});

export default router;
