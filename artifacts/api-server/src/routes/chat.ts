import { Router, type IRouter } from "express";
import OpenAI from "openai";

const router: IRouter = Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are the friendly support assistant for "Gech EV Makina Ekub", an Ethiopian EV lottery (ekub) app.
Explain how the app works when asked:
- Users browse active lotteries ("Ekub" draws) for electric vehicles (e.g. BYD Yuan Up, BYD Dolphin, BYD Seagull).
- They buy a ticket for a campaign by tapping "Buy Ticket", choosing lucky numbers, and paying via Telebirr or CBE.
- After payment, an admin verifies the receipt and the ticket status moves from "pending" to "active" (or "rejected" if payment fails).
- Users track their tickets on the "Tickets" page by entering their phone number, which shows Active/Pending/Total ticket counts.
- Winners are drawn on the campaign's draw date shown on the countdown on the Home page.
Keep answers short, friendly, and specific to this app. If asked something unrelated to the app, politely redirect back to how you can help with Gech EV Makina Ekub.`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// POST /chat/messages - stateless streaming chat with the site assistant
router.post("/chat/messages", async (req, res): Promise<void> => {
  const body = req.body as { messages?: ChatMessage[] };
  const messages = Array.isArray(body.messages) ? body.messages : [];

  if (messages.length === 0) {
    res.status(400).json({ error: "messages is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error("chat/messages error:", err);
    res.write(`data: ${JSON.stringify({ error: "Something went wrong. Please try again." })}\n\n`);
    res.end();
  }
});

export default router;
