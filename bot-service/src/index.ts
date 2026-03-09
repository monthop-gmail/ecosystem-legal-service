import { Hono } from "hono";
import { Client, validateSignature, WebhookEvent, TextMessage } from "@line/bot-sdk";

const app = new Hono();

const lineConfig = {
  channelSecret: process.env.LINE_CHANNEL_SECRET || "",
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
};

const lineClient = new Client(lineConfig);
const AI_SERVER_URL = process.env.AI_SERVER_URL || "http://legal-mcp:4100";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514";

// Session storage (PoC - use Redis in production)
const sessions = new Map<string, { messages: Array<{ role: string; content: string }> }>();

app.get("/health", (c) => c.json({ status: "ok", service: "legal-bot" }));

// LINE Webhook
app.post("/webhook", async (c) => {
  const body = await c.req.text();
  const signature = c.req.header("x-line-signature") || "";

  if (!validateSignature(body, lineConfig.channelSecret, signature)) {
    return c.text("Invalid signature", 401);
  }

  const events: WebhookEvent[] = JSON.parse(body).events;

  for (const event of events) {
    if (event.type === "message" && event.message.type === "text") {
      await handleTextMessage(event);
    }
  }

  return c.json({ status: "ok" });
});

async function handleTextMessage(event: WebhookEvent & { message: { text: string } }) {
  const userId = event.source.userId || "unknown";
  const userMessage = event.message.text;

  // Get or create session
  if (!sessions.has(userId)) {
    sessions.set(userId, { messages: [] });
  }
  const session = sessions.get(userId)!;
  session.messages.push({ role: "user", content: userMessage });

  // Keep only last 20 messages
  if (session.messages.length > 20) {
    session.messages = session.messages.slice(-20);
  }

  try {
    // Call Claude API with MCP tools
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 2048,
        system: `คุณเป็น AI ที่ปรึกษากฎหมายไทย ให้คำปรึกษาเบื้องต้นเป็นภาษาไทย
อ้างอิงมาตรากฎหมายเสมอ แจ้งว่าเป็นคำปรึกษาเบื้องต้น
LINE User ID ของลูกค้า: ${userId}`,
        messages: session.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    const data = await response.json() as {
      content: Array<{ type: string; text?: string }>;
    };
    const aiReply =
      data.content?.find((c: { type: string }) => c.type === "text")?.text ||
      "ขออภัย ไม่สามารถประมวลผลได้ในขณะนี้";

    session.messages.push({ role: "assistant", content: aiReply });

    // Reply via LINE
    const replyMessage: TextMessage = { type: "text", text: aiReply };
    await lineClient.replyMessage(
      (event as unknown as { replyToken: string }).replyToken,
      replyMessage
    );
  } catch (error) {
    console.error("Error:", error);
    await lineClient.replyMessage(
      (event as unknown as { replyToken: string }).replyToken,
      { type: "text", text: "ขออภัย ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง" }
    );
  }
}

const PORT = Number(process.env.PORT) || 3000;
console.log(`🤖 Legal Bot running on port ${PORT}`);
export default { port: PORT, fetch: app.fetch };
