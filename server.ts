import express from "express";
import path from "path";
import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory OTP store (phone -> {otp, expires})
const otpStore = new Map<string, { otp: string; expires: number }>();

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

const normalizePhone = (phone: string) => {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "92" + cleaned.substring(1);
  } else if (cleaned.startsWith("3")) {
    cleaned = "92" + cleaned;
  }
  if (!cleaned.startsWith("+") && cleaned.length > 0) {
    cleaned = "+" + cleaned;
  }
  return cleaned;
};

app.post("/api/send-otp", async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "Phone number required" });

  const normalizedPhone = normalizePhone(phone);
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(normalizedPhone, { otp, expires: Date.now() + 2 * 60 * 1000 }); // 2 min expiry

  if (twilioClient && (process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER)) {
    try {
      const isWhatsApp = !!process.env.TWILIO_WHATSAPP_NUMBER;
      const from = isWhatsApp ? `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}` : process.env.TWILIO_PHONE_NUMBER!;
      const to = isWhatsApp ? `whatsapp:${normalizedPhone}` : normalizedPhone;

      await twilioClient.messages.create({
        body: `Your SafeBite OTP is ${otp}. Valid for 2 minutes.`,
        from,
        to,
      });
      res.json({ success: true, message: `OTP sent via ${isWhatsApp ? 'WhatsApp' : 'SMS'}` });
    } catch (err: any) {
      console.error("Twilio error:", err);
      // Handle common Twilio trial/limit restrictions
      const isLimitError = err.message?.includes("limit") || err.code === 63038 || err.status === 429;
      const isUnverifiedError = err.code === 21608;

      if (isLimitError || isUnverifiedError) {
        console.log(`[FALLBACK] Twilio restriction (${err.code}): ${err.message}. Falling back to Simulation Mode for OTP: ${otp}`);
        return res.json({ 
          success: true, 
          message: isUnverifiedError ? "Twilio trial restriction: Unverified number." : "Twilio account limit reached.", 
          demoCode: otp 
        });
      }
      res.status(500).json({ error: "Failed to send SMS", details: err.message });
    }
  } else {
    // Fallback for development if credentials are missing
    console.log(`[DEV] Sending OTP ${otp} to ${normalizedPhone}`);
    res.json({ 
      success: true, 
      message: "OTP generated (Simulation Mode - Check server logs)", 
      demoCode: otp 
    });
  }
});

app.post("/api/verify-otp", async (req, res) => {
  const { phone, otp } = req.body;
  const normalizedPhone = normalizePhone(phone);
  const stored = otpStore.get(normalizedPhone);

  if (!stored) return res.status(400).json({ error: "No OTP found for this number" });
  if (Date.now() > stored.expires) {
    otpStore.delete(normalizedPhone);
    return res.status(400).json({ error: "OTP expired" });
  }

  if (stored.otp === otp) {
    otpStore.delete(normalizedPhone);
    res.json({ success: true });
  } else {
    res.status(400).json({ error: "Invalid OTP" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
