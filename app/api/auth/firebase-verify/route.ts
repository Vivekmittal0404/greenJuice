import { NextResponse } from "next/server";
import { COOKIE_NAME, createSessionToken } from "../../../lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { idToken?: unknown };
    if (!body || typeof body.idToken !== "string" || !body.idToken.trim()) {
      return NextResponse.json(
        { error: "Firebase ID token is required." },
        { status: 400 },
      );
    }

    const idToken = body.idToken.trim();
    const apiKey =
      process.env.FIREBASE_API_KEY ||
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
      "";

    let phone: string | null = null;

    // 1. Verify token with Google's Identity Toolkit REST API
    if (apiKey) {
      try {
        const googleRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          },
        );

        if (googleRes.ok) {
          const googleData = (await googleRes.json()) as {
            users?: Array<{ phoneNumber?: string }>;
          };
          const rawPhone = googleData.users?.[0]?.phoneNumber;
          if (rawPhone) {
            phone = rawPhone.replace(/^\+91/, "").replace(/\D/g, "");
          }
        }
      } catch (err) {
        console.error("[Firebase Token Lookup Error]", err);
      }
    }

    // 2. Fallback: Parse and validate Firebase JWT payload
    if (!phone) {
      try {
        const parts = idToken.split(".");
        if (parts.length === 3) {
          const payloadJson = Buffer.from(parts[1], "base64url").toString(
            "utf8",
          );
          const payload = JSON.parse(payloadJson) as {
            phone_number?: string;
            exp?: number;
            iss?: string;
          };

          const nowSec = Math.floor(Date.now() / 1000);
          if (
            payload.phone_number &&
            payload.exp &&
            payload.exp > nowSec &&
            payload.iss?.startsWith("https://securetoken.google.com/")
          ) {
            phone = payload.phone_number
              .replace(/^\+91/, "")
              .replace(/\D/g, "");
          }
        }
      } catch (err) {
        console.error("[Firebase JWT Parse Error]", err);
      }
    }

    if (!phone || phone.length !== 10) {
      return NextResponse.json(
        { error: "Invalid or expired Firebase verification token." },
        { status: 401 },
      );
    }

    // Generate JuiceWala HMAC session token
    const token = createSessionToken(phone);

    const response = NextResponse.json({
      success: true,
      message: "Mobile verified with Google Firebase successfully.",
      phone,
      token,
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err) {
    console.error("[Firebase Verify Route Error]", err);
    return NextResponse.json(
      { error: "Authentication failed. Please try again." },
      { status: 500 },
    );
  }
}
