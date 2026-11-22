import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

const AUTH_SECRET =
  process.env.AUTH_SECRET ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.RAZORPAY_KEY_SECRET ||
  "juicewala-auth-secret-key-salt-2026";

export const COOKIE_NAME = "juicewala_session";

interface OtpRecord {
  otp: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}

// In-memory OTP storage (survives requests in running Node process)
const otpStore = new Map<string, OtpRecord>();

// Clean expired OTPs every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [phone, record] of otpStore.entries()) {
    if (record.expiresAt < now) {
      otpStore.delete(phone);
    }
  }
}, 10 * 60 * 1000).unref();

export function getCookieFromRequest(
  request: Request,
  name: string,
): string | undefined {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function isValidIndianMobile(phone: string): boolean {
  return /^[6-9][0-9]{9}$/.test(phone.trim());
}

export function generateOtp(): string {
  return String(randomInt(100000, 999999));
}

export function createSessionToken(phone: string): string {
  const timestamp = Date.now().toString();
  const data = `${phone.trim()}:${timestamp}`;
  const signature = createHmac("sha256", AUTH_SECRET).update(data).digest("hex");
  return `${data}:${signature}`;
}

export function verifySessionToken(token: string): string | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(":");
  if (parts.length !== 3) return null;

  const [phone, timestampStr, signature] = parts;
  if (!signature || signature.length !== 64 || !/^[0-9a-f]{64}$/i.test(signature)) {
    return null;
  }

  const timestamp = parseInt(timestampStr, 10);
  if (Number.isNaN(timestamp)) return null;

  // Session valid for 30 days
  const MAX_SESSION_AGE = 30 * 24 * 60 * 60 * 1000;
  if (Date.now() - timestamp > MAX_SESSION_AGE) return null;

  const expectedData = `${phone}:${timestampStr}`;
  const expectedSignature = createHmac("sha256", AUTH_SECRET)
    .update(expectedData)
    .digest("hex");

  try {
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expectedSignature, "hex");
    if (sigBuf.length !== 32 || expBuf.length !== 32) return null;
    const isMatch = timingSafeEqual(sigBuf, expBuf);
    return isMatch ? phone : null;
  } catch {
    return null;
  }
}

export interface SendOtpResult {
  success: boolean;
  message: string;
  cooldownSeconds?: number;
  demoOtp?: string;
  provider: "fast2sms" | "twilio" | "2factor" | "demo";
}

export async function requestOtp(rawPhone: string): Promise<SendOtpResult> {
  const phone = rawPhone.trim();
  if (!isValidIndianMobile(phone)) {
    return {
      success: false,
      message: "Please enter a valid 10-digit mobile number.",
      provider: "demo",
    };
  }

  const now = Date.now();
  const existing = otpStore.get(phone);

  // Rate limit: 30-second cooldown between OTP requests
  const COOLDOWN_MS = 30 * 1000;
  if (existing && now - existing.lastSentAt < COOLDOWN_MS) {
    const remainingSecs = Math.ceil((COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
    return {
      success: false,
      message: `Please wait ${remainingSecs} seconds before requesting a new OTP.`,
      cooldownSeconds: remainingSecs,
      provider: "demo",
    };
  }

  const otp = generateOtp();
  const expiresAt = now + 5 * 60 * 1000; // 5 minutes validity

  otpStore.set(phone, {
    otp,
    expiresAt,
    attempts: 0,
    lastSentAt: now,
  });

  // Try configured SMS gateways
  const fast2SmsKey = process.env.FAST2SMS_API_KEY;
  const fast2SmsSenderId = process.env.FAST2SMS_SENDER_ID;
  const fast2SmsTemplateId = process.env.FAST2SMS_DLT_TEMPLATE_ID;
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
  const twoFactorKey = process.env.TWO_FACTOR_API_KEY;

  if (fast2SmsKey) {
    try {
      // If custom DLT Sender ID and Template ID are provided, use "dlt" route.
      // Otherwise, use Fast2SMS pre-approved instant "otp" route (zero DLT setup required).
      const payload =
        fast2SmsSenderId && fast2SmsTemplateId
          ? {
              route: "dlt",
              sender_id: fast2SmsSenderId.trim(),
              message: fast2SmsTemplateId.trim(),
              variables_values: otp,
              numbers: phone,
            }
          : {
              route: "otp",
              variables_values: otp,
              numbers: phone,
            };

      const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: fast2SmsKey.trim(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as {
        return?: boolean;
        message?: string | string[];
        status_code?: number;
      };

      if (res.ok && data.return) {
        return {
          success: true,
          message: `OTP sent to +91 ${phone}`,
          provider: "fast2sms",
        };
      } else {
        const errMsg = Array.isArray(data.message)
          ? data.message.join(", ")
          : data.message || "Fast2SMS error";
        console.error("[Fast2SMS Error Response]", errMsg);
        return {
          success: false,
          message: `SMS gateway error: ${errMsg}`,
          provider: "fast2sms",
        };
      }
    } catch (err) {
      console.error("[Fast2SMS Error]", err);
    }
  }

  if (twoFactorKey) {
    try {
      const res = await fetch(
        `https://2factor.in/API/V1/${encodeURIComponent(twoFactorKey)}/SMS/+91${phone}/${otp}/AUTOGEN`,
      );
      if (res.ok) {
        return {
          success: true,
          message: `OTP sent to +91 ${phone}`,
          provider: "2factor",
        };
      }
    } catch (err) {
      console.error("[2Factor Error]", err);
    }
  }

  if (twilioSid && twilioAuth && twilioPhone) {
    try {
      const auth = Buffer.from(`${twilioSid}:${twilioAuth}`).toString("base64");
      const body = new URLSearchParams({
        To: `+91${phone}`,
        From: twilioPhone,
        Body: `Your JuiceWala code is ${otp}. Valid for 5 minutes.`,
      });
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        },
      );
      if (res.ok) {
        return {
          success: true,
          message: `OTP sent to +91 ${phone}`,
          provider: "twilio",
        };
      }
    } catch (err) {
      console.error("[Twilio Error]", err);
    }
  }

  // Fallback / Demo Mode when no SMS provider is configured
  console.log(`\n========================================`);
  console.log(`[JuiceWala OTP Demo Mode]`);
  console.log(`Recipient: +91 ${phone}`);
  console.log(`Your OTP: ${otp}`);
  console.log(`Valid for 5 minutes`);
  console.log(`========================================\n`);

  return {
    success: true,
    message: `OTP generated for +91 ${phone}`,
    demoOtp: otp,
    provider: "demo",
  };
}

export interface VerifyOtpResult {
  success: boolean;
  message: string;
  token?: string;
  phone?: string;
}

export function verifyOtp(rawPhone: string, rawOtp: string): VerifyOtpResult {
  const phone = rawPhone.trim();
  const enteredOtp = rawOtp.trim();

  if (!isValidIndianMobile(phone)) {
    return {
      success: false,
      message: "Invalid mobile number.",
    };
  }

  if (!/^[0-9]{6}$/.test(enteredOtp)) {
    return {
      success: false,
      message: "Please enter a 6-digit OTP code.",
    };
  }

  const record = otpStore.get(phone);
  if (!record) {
    return {
      success: false,
      message: "No active OTP request found. Please request a new OTP.",
    };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(phone);
    return {
      success: false,
      message: "OTP has expired. Please request a new OTP.",
    };
  }

  if (record.attempts >= 5) {
    otpStore.delete(phone);
    return {
      success: false,
      message: "Too many failed attempts. Please request a new OTP.",
    };
  }

  if (record.otp !== enteredOtp) {
    record.attempts += 1;
    return {
      success: false,
      message: `Incorrect OTP. ${5 - record.attempts} attempts remaining.`,
    };
  }

  // OTP verified successfully!
  otpStore.delete(phone);
  const token = createSessionToken(phone);

  return {
    success: true,
    message: "Mobile number verified successfully.",
    phone,
    token,
  };
}
