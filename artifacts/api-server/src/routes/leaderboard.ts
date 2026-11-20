import { Router, type IRouter } from "express";
import { sql, eq } from "drizzle-orm";
import { db, ticketsTable } from "@workspace/db";

const router: IRouter = Router();

// 70 realistic simulated participant accounts used when real customer count < 200
const SIMULATED_ACCOUNTS = [
  { name: "Dawit Mekonnen", phone: "+251 91 1***82", baseTickets: 58 },
  { name: "Bethlehem Tadesse", phone: "+251 92 3***41", baseTickets: 52 },
  { name: "Samuel Kebede", phone: "+251 91 0***19", baseTickets: 47 },
  { name: "Yohannes Berhanu", phone: "+251 93 4***90", baseTickets: 44 },
  { name: "Almaz Gebre", phone: "+251 91 2***56", baseTickets: 41 },
  { name: "Henok Alemu", phone: "+251 97 8***33", baseTickets: 39 },
  { name: "Meron Worku", phone: "+251 92 1***77", baseTickets: 36 },
  { name: "Natnael Solomon", phone: "+251 91 4***65", baseTickets: 34 },
  { name: "Selamawit Assefa", phone: "+251 94 0***12", baseTickets: 33 },
  { name: "Biruk Desta", phone: "+251 92 9***88", baseTickets: 31 },
  { name: "Kidist Haile", phone: "+251 91 3***04", baseTickets: 29 },
  { name: "Ermias Tesfaye", phone: "+251 96 6***21", baseTickets: 28 },
  { name: "Tigist Bekele", phone: "+251 91 5***79", baseTickets: 27 },
  { name: "Abel Girma", phone: "+251 93 1***45", baseTickets: 26 },
  { name: "Rahel Mengistu", phone: "+251 92 0***63", baseTickets: 25 },
  { name: "Yonas Fikre", phone: "+251 91 7***98", baseTickets: 24 },
  { name: "Hana Zerihun", phone: "+251 97 2***15", baseTickets: 23 },
  { name: "Biniyam Kassahun", phone: "+251 91 6***37", baseTickets: 22 },
  { name: "Hiwot Demissie", phone: "+251 92 5***80", baseTickets: 21 },
  { name: "Robel Negash", phone: "+251 93 8***29", baseTickets: 20 },
  { name: "Tsion Ayele", phone: "+251 91 8***71", baseTickets: 19 },
  { name: "Tewodros Melaku", phone: "+251 94 7***52", baseTickets: 18 },
  { name: "Sara Kifle", phone: "+251 92 2***03", baseTickets: 18 },
  { name: "Fikadu Wolde", phone: "+251 91 9***44", baseTickets: 17 },
  { name: "Eden Getachew", phone: "+251 97 5***66", baseTickets: 16 },
  { name: "Amanuel Eshetu", phone: "+251 93 0***89", baseTickets: 16 },
  { name: "Martha Belay", phone: "+251 91 0***32", baseTickets: 15 },
  { name: "Surafel Tekle", phone: "+251 92 8***11", baseTickets: 15 },
  { name: "Bezawit Abera", phone: "+251 94 3***94", baseTickets: 14 },
  { name: "Dagnachew Shiferaw", phone: "+251 91 2***70", baseTickets: 14 },
  { name: "Helina Mulugeta", phone: "+251 96 1***58", baseTickets: 13 },
  { name: "Daniel Hailu", phone: "+251 93 2***47", baseTickets: 13 },
  { name: "Kalkidan Zeleke", phone: "+251 91 4***25", baseTickets: 12 },
  { name: "Nahom Tefera", phone: "+251 92 4***69", baseTickets: 12 },
  { name: "Frehiwot Bogale", phone: "+251 97 1***83", baseTickets: 11 },
  { name: "Kirubel Tamirat", phone: "+251 91 5***06", baseTickets: 11 },
  { name: "Mahlet Kassa", phone: "+251 94 9***38", baseTickets: 10 },
  { name: "Fitsum Lemma", phone: "+251 93 5***92", baseTickets: 10 },
  { name: "Eyerusalem Seyoum", phone: "+251 92 7***17", baseTickets: 9 },
  { name: "Eyob Gashaw", phone: "+251 91 8***50", baseTickets: 9 },
  { name: "Liya Dagne", phone: "+251 96 4***73", baseTickets: 8 },
  { name: "Mikiyas Endale", phone: "+251 93 9***01", baseTickets: 8 },
  { name: "Senait Molla", phone: "+251 91 3***64", baseTickets: 8 },
  { name: "Bereket Wondimu", phone: "+251 92 6***28", baseTickets: 7 },
  { name: "Rediet Sintayehu", phone: "+251 97 7***40", baseTickets: 7 },
  { name: "Leul Workineh", phone: "+251 94 2***85", baseTickets: 6 },
  { name: "Sosina Fantahun", phone: "+251 91 9***13", baseTickets: 6 },
  { name: "Nebiyu Mesfin", phone: "+251 93 3***57", baseTickets: 6 },
  { name: "Gelila Anteneh", phone: "+251 92 0***96", baseTickets: 5 },
  { name: "Temesgen Adugna", phone: "+251 96 8***30", baseTickets: 5 },
  { name: "Bitaniya Derese", phone: "+251 91 1***74", baseTickets: 5 },
  { name: "Yonatan Gebremariam", phone: "+251 94 8***08", baseTickets: 4 },
  { name: "Hawi Tolessa", phone: "+251 93 7***42", baseTickets: 4 },
  { name: "Abenet Belete", phone: "+251 92 9***61", baseTickets: 4 },
  { name: "Ruth Amare", phone: "+251 97 4***95", baseTickets: 4 },
  { name: "Nardos Yohannes", phone: "+251 91 7***29", baseTickets: 3 },
  { name: "Kaleab Aklilu", phone: "+251 94 5***83", baseTickets: 3 },
  { name: "Genet Tsegaye", phone: "+251 93 6***17", baseTickets: 3 },
  { name: "Ephrem Legesse", phone: "+251 92 3***51", baseTickets: 3 },
  { name: "Melat Getnet", phone: "+251 96 0***75", baseTickets: 3 },
  { name: "Elias Asrat", phone: "+251 91 4***09", baseTickets: 2 },
  { name: "Saron Wondwossen", phone: "+251 97 9***43", baseTickets: 2 },
  { name: "Brook Taye", phone: "+251 94 1***67", baseTickets: 2 },
  { name: "Mihret Sisay", phone: "+251 93 8***91", baseTickets: 2 },
  { name: "Fasil Kassa", phone: "+251 92 5***24", baseTickets: 2 },
  { name: "Betty Shibeshi", phone: "+251 91 0***58", baseTickets: 1 },
  { name: "Getnet Wubet", phone: "+251 96 7***82", baseTickets: 1 },
  { name: "Hermela Tarekegn", phone: "+251 94 4***16", baseTickets: 1 },
  { name: "Dagim Fanta", phone: "+251 93 1***30", baseTickets: 1 },
  { name: "Metasebia Kidanemariam", phone: "+251 92 8***64", baseTickets: 1 },
];

// GET /leaderboard - top buyers ranked by number of active tickets
router.get("/leaderboard", async (_req, res): Promise<void> => {
  try {
    const countRes = await db
      .select({ count: sql<number>`count(distinct ${ticketsTable.buyerPhone})` })
      .from(ticketsTable)
      .where(eq(ticketsTable.status, "active"));
      
    const totalCustomers = Number(countRes[0]?.count || 0);

    // If real customers reaches 200+, switch to real database leaderboard
    if (totalCustomers >= 200) {
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
        .limit(100);

      const leaderboard = rows.map((r, i) => ({
        rank: i + 1,
        buyerName: r.buyerName,
        buyerPhone:
          r.buyerPhone && r.buyerPhone.length >= 7
            ? `${r.buyerPhone.slice(0, 5)}***${r.buyerPhone.slice(-2)}`
            : r.buyerPhone || "Anonymous",
        ticketCount: Number(r.ticketCount),
      }));

      res.json({ leaderboard, isSimulated: false, totalCustomers });
      return;
    }
  } catch (err) {
    // If DB is offline/empty, seamlessly fall through to simulated 70 accounts
  }

  // Return the 70 simulated accounts with base ticket counts
  const leaderboard = SIMULATED_ACCOUNTS.map((account, i) => ({
    rank: i + 1,
    buyerName: account.name,
    buyerPhone: account.phone,
    ticketCount: account.baseTickets,
  }));

  res.json({
    leaderboard,
    isSimulated: true,
    totalCustomers: 70,
    requiredRealCustomers: 200,
  });
});

export default router;
