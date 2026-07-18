import { Router, type IRouter } from "express";
import { db, registrationsTable, campaignsTable, ticketsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.warn("TELEGRAM_BOT_TOKEN not set — /telegram webhook disabled");
}

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const TG_API = TOKEN ? `https://api.telegram.org/bot${TOKEN}` : "";
const WEBAPP_URL = process.env.TELEGRAM_WEBAPP_URL || "https://gech-ev-ekub-phi.vercel.app";

type Step = "idle" | "await_lucky" | "await_qty" | "await_method" | "await_sender" | "confirm";
interface BotState {
  step: Step;
  campaignId?: number;
  luckyNumbers?: number[];
  quantity?: number;
  paymentMethod?: "telebirr" | "cbe";
  senderAccount?: string;
}

async function tg(method: string, body: Record<string, unknown>) {
  const res = await fetch(`${TG_API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

const router: IRouter = Router();

router.get("/", (_req, res) => {
  res.json({ ok: true, bot: TOKEN ? "configured" : "token missing" });
});

router.post("/", async (req, res): Promise<void> => {
  if (WEBHOOK_SECRET && req.headers["x-telegram-bot-api-secret-token"] !== WEBHOOK_SECRET) {
    res.status(401).end();
    return;
  }
  try {
    await handleUpdate(req.body ?? {});
  } catch (e) {
    console.error("telegram webhook error:", e);
  }
  res.status(200).json({ ok: true });
});

export default router;

async function getReg(telegramId: string) {
  const [row] = await db
    .select()
    .from(registrationsTable)
    .where(eq(registrationsTable.telegramId, telegramId));
  return row;
}

async function setState(telegramId: string, state: BotState) {
  await db
    .update(registrationsTable)
    .set({ botState: state as never, updatedAt: new Date() })
    .where(eq(registrationsTable.telegramId, telegramId));
}

async function ensureReg(u: { message?: any; callback_query?: any }) {
  const from = u.message?.from ?? u.callback_query?.from;
  const telegramId = String(from.id);
  await db
    .insert(registrationsTable)
    .values({
      telegramId,
      firstName: from.first_name,
      username: from.username,
      botState: { step: "idle" },
    })
    .onConflictDoUpdate({
      target: registrationsTable.telegramId,
      set: { firstName: from.first_name, username: from.username, updatedAt: new Date() },
    });
  return telegramId;
}

const CONTACT_KEYBOARD = {
  keyboard: [[{ text: "📱 Share Phone Number", request_contact: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
};

const WEBAPP_INLINE_KEYBOARD = {
  inline_keyboard: [
    [{ text: "🎯 Open Lottery App", web_app: { url: WEBAPP_URL } }],
  ],
};

async function askContact(chatId: number) {
  await tg("sendMessage", {
    chat_id: chatId,
    text: "📱 Please share your phone number to continue:",
    reply_markup: CONTACT_KEYBOARD,
  });
}

async function sendWebAppButton(chatId: number) {
  await tg("sendMessage", {
    chat_id: chatId,
    text: "✅ Number saved! Tap the button below to open the lottery app.",
    reply_markup: WEBAPP_INLINE_KEYBOARD,
  });
}

async function listCampaigns(chatId: number) {
  const campaigns = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.status, "active"));
  if (campaigns.length === 0) {
    await tg("sendMessage", { chat_id: chatId, text: "No active lotteries right now." });
    return;
  }
  const lines = campaigns
    .map(
      (c: any) =>
        `• #${c.id} ${c.title} — ${c.vehicleModel} (${c.vehicleYear})\n  ${Number(
          c.ticketPrice,
        )} ETB/ticket, ${c.soldSlots}/${c.totalSlots} sold`,
    )
    .join("\n\n");
  await tg("sendMessage", {
    chat_id: chatId,
    text: `Active lotteries:\n\n${lines}\n\nUse /buy to purchase.`,
  });
}

async function startBuy(chatId: number, telegramId: string) {
  const reg = await getReg(telegramId);
  if (!reg?.phone) {
    await askContact(chatId);
    return;
  }
  const campaigns = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.status, "active"));
  if (campaigns.length === 0) {
    await tg("sendMessage", { chat_id: chatId, text: "No active lotteries." });
    return;
  }
  const keyboard = {
    inline_keyboard: campaigns.map((c: any) => [
      { text: `#${c.id} ${c.title}`, callback_data: `buy:${c.id}` },
    ]),
  };
  await tg("sendMessage", { chat_id: chatId, text: "Choose a lottery:", reply_markup: keyboard });
}

async function confirmPurchase(chatId: number, telegramId: string) {
  const reg = await getReg(telegramId);
  const st = reg?.botState as BotState | undefined;
  if (!st || st.step !== "confirm" || !st.campaignId) {
    await sendWebAppButton(chatId);
    return;
  }
  const [campaign] = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.id, st.campaignId));
  if (!campaign) {
    await tg("sendMessage", { chat_id: chatId, text: "Campaign not found." });
    await setState(telegramId, { step: "idle" });
    return;
  }
  const ticketNumber = `#${Math.floor(1000 + Math.random() * 8999)}`;
  const totalAmount = (Number(campaign.ticketPrice) * (st.quantity ?? 1)).toFixed(2);
  await db.insert(ticketsTable).values({
    campaignId: st.campaignId,
    ticketNumber,
    buyerName: reg.firstName ?? reg.username ?? "Telegram User",
    buyerPhone: reg.phone!,
    quantity: st.quantity ?? 1,
    luckyNumbers: JSON.stringify(st.luckyNumbers ?? []),
    paymentMethod: st.paymentMethod!,
    senderAccount: st.senderAccount!,
    status: "pending",
    totalAmount,
  });
  await db
    .update(campaignsTable)
    .set({ soldSlots: campaign.soldSlots + (st.quantity ?? 1) })
    .where(eq(campaignsTable.id, st.campaignId));
  await setState(telegramId, { step: "idle" });
  await tg("sendMessage", {
    chat_id: chatId,
    text: `🎉 Ticket reserved! Number ${ticketNumber}. An admin will verify your payment. Track it with /campaigns.`,
    reply_markup: { remove_keyboard: true },
  });
}

async function handleUpdate(u: any) {
  if (u.callback_query) {
    const cb = u.callback_query;
    const chatId = cb.message.chat.id;
    const telegramId = String(cb.from.id);
    await tg("answerCallbackQuery", { callback_query_id: cb.id });
    const data = cb.data as string;
    if (data.startsWith("buy:")) {
      const campaignId = Number(data.split(":")[1]);
      await setState(telegramId, { step: "await_lucky", campaignId });
      await tg("sendMessage", {
        chat_id: chatId,
        text: "Send your lucky numbers (comma separated, e.g. 3,7,12):",
        reply_markup: { force_reply: true },
      });
    } else if (data === "confirm") {
      await confirmPurchase(chatId, telegramId);
    } else if (data === "cancel") {
      await setState(telegramId, { step: "idle" });
      await sendWebAppButton(chatId);
    }
    return;
  }

  if (u.message?.contact) {
    const chatId = u.message.chat.id;
    const telegramId = String(u.message.from.id);
    const phone = u.message.contact.phone_number;
    await db
      .insert(registrationsTable)
      .values({
        telegramId,
        firstName: u.message.from.first_name,
        username: u.message.from.username,
        phone,
        botState: { step: "idle" },
      })
      .onConflictDoUpdate({
        target: registrationsTable.telegramId,
        set: { phone, updatedAt: new Date() },
      });
    await tg("sendMessage", {
      chat_id: chatId,
      text: `\u2705 Registered with phone ${phone}!`,
      reply_markup: { remove_keyboard: true },
    });
    await sendWebAppButton(chatId);
    return;
  }

  const text = (u.message?.text ?? "").trim();
  const chatId = u.message?.chat?.id;
  const telegramId = String(u.message?.from?.id ?? u.callback_query?.from?.id);
  if (!text || !chatId) return;

  if (text === "/start") {
    await ensureReg(u);
    const reg = await getReg(telegramId);
    if (!reg?.phone) {
      await askContact(chatId);
    } else {
      await sendWebAppButton(chatId);
    }
    return;
  }
  if (text === "/campaigns") {
    await listCampaigns(chatId);
    return;
  }
  if (text === "/buy") {
    await ensureReg(u);
    await startBuy(chatId, telegramId);
    return;
  }

  const reg = await getReg(telegramId);
  const step = (reg?.botState as BotState | undefined)?.step ?? "idle";

  if (step === "await_lucky") {
    const nums = text
      .split(",")
      .map((s: string) => parseInt(s.trim(), 10))
      .filter((n: number) => !isNaN(n));
    if (nums.length === 0) {
      await tg("sendMessage", { chat_id: chatId, text: "Please send numbers like 3,7,12" });
      return;
    }
    const state = reg!.botState as BotState;
    await setState(telegramId, { ...state, step: "await_qty", luckyNumbers: nums });
    await tg("sendMessage", {
      chat_id: chatId,
      text: "How many tickets (quantity)?",
      reply_markup: { force_reply: true },
    });
    return;
  }
  if (step === "await_qty") {
    const qty = parseInt(text, 10);
    if (isNaN(qty) || qty < 1) {
      await tg("sendMessage", { chat_id: chatId, text: "Send a positive number." });
      return;
    }
    const state = reg!.botState as BotState;
    await setState(telegramId, { ...state, step: "await_method", quantity: qty });
    await tg("sendMessage", {
      chat_id: chatId,
      text: "Payment method?",
      reply_markup: { keyboard: [["telebirr", "cbe"]], one_time_keyboard: true, resize_keyboard: true },
    });
    return;
  }
  if (step === "await_method") {
    const method = text.toLowerCase();
    if (method !== "telebirr" && method !== "cbe") {
      await tg("sendMessage", { chat_id: chatId, text: "Choose telebirr or cbe." });
      return;
    }
    const state = reg!.botState as BotState;
    await setState(telegramId, { ...state, step: "await_sender", paymentMethod: method as "telebirr" | "cbe" });
    await tg("sendMessage", {
      chat_id: chatId,
      text: "Send your payment sender account number:",
      reply_markup: { force_reply: true, remove_keyboard: true },
    });
    return;
  }
  if (step === "await_sender") {
    const state = reg!.botState as BotState;
    const s: BotState = { ...state, step: "confirm", senderAccount: text };
    await setState(telegramId, s);
    const [campaign] = await db
      .select()
      .from(campaignsTable)
      .where(eq(campaignsTable.id, s.campaignId!));
    const total = Number(campaign.ticketPrice) * (s.quantity ?? 1);
    const summary =
      `Please confirm your purchase:\n\n` +
      `Lottery: #${campaign.id} ${campaign.title}\n` +
      `Lucky numbers: ${(s.luckyNumbers ?? []).join(", ")}\n` +
      `Quantity: ${s.quantity}\n` +
      `Payment: ${s.paymentMethod}\n` +
      `Sender account: ${s.senderAccount}\n` +
      `Total: ${total} ETB`;
    await tg("sendMessage", {
      chat_id: chatId,
      text: summary,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Confirm", callback_data: "confirm" },
            { text: "❌ Cancel", callback_data: "cancel" },
          ],
        ],
      },
    });
    return;
  }

  await tg("sendMessage", {
    chat_id: chatId,
    text: "Use /campaigns or /buy. Share your phone first if you haven't.",
  });
}
