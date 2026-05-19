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

app.post("/api/send-otp", async (req, res) => {
  let { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "Phone number required" });

  // Auto-format for Pakistan numbers if country code is missing
  // Convert 03xxxxxxxxx to +923xxxxxxxxx
  if (phone.startsWith("0")) {
    phone = "+92" + phone.substring(1);
  } else if (phone.startsWith("3")) {
    phone = "+92" + phone;
  } else if (!phone.startsWith("+")) {
    // Basic fallback for other international numbers if user forgot +
    phone = "+" + phone;
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(phone, { otp, expires: Date.now() + 2 * 60 * 1000 }); // 2 min expiry

  if (twilioClient && (process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER)) {
    try {
      const isWhatsApp = !!process.env.TWILIO_WHATSAPP_NUMBER;
      const from = isWhatsApp ? `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}` : process.env.TWILIO_PHONE_NUMBER!;
      const to = isWhatsApp ? `whatsapp:${phone}` : phone;

      await twilioClient.messages.create({
        body: `Your SafeBite OTP is ${otp}. Valid for 2 minutes.`,
        from,
        to,
      });
      res.json({ success: true, message: `OTP sent via ${isWhatsApp ? 'WhatsApp' : 'SMS'}` });
    } catch (err: any) {
      console.error("Twilio error:", err);
      res.status(500).json({ error: "Failed to send SMS", details: err.message });
    }
  } else {
    // Fallback for development if credentials are missing
    console.log(`[DEV] Sending OTP ${otp} to ${phone}`);
    res.json({ 
      success: true, 
      message: "OTP generated (Simulation Mode - Check server logs)", 
      demoCode: otp 
    });
  }
});

app.post("/api/verify-otp", async (req, res) => {
  const { phone, otp } = req.body;
  const stored = otpStore.get(phone);

  if (!stored) return res.status(400).json({ error: "No OTP found for this number" });
  if (Date.now() > stored.expires) {
    otpStore.delete(phone);
    return res.status(400).json({ error: "OTP expired" });
  }

  if (stored.otp === otp) {
    otpStore.delete(phone);
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
