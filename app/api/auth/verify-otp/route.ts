import { NextResponse } from "next/server";
import { COOKIE_NAME, verifyOtp } from "../../../lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { phone?: unknown; otp?: unknown };
    if (
      !body ||
      typeof body.phone !== "string" ||
      typeof body.otp !== "string"
    ) {
      return NextResponse.json(
        { error: "Phone number and 6-digit OTP are required." },
        { status: 400 },
      );
    }

    const result = verifyOtp(body.phone, body.otp);
    if (!result.success || !result.token) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 },
      );
    }

    const response = NextResponse.json({
      success: true,
      message: result.message,
      phone: result.phone,
      token: result.token,
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: result.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err) {
    console.error("[Verify OTP API Error]", err);
    return NextResponse.json(
      { error: "Could not verify OTP. Please try again." },
      { status: 500 },
    );
  }
}
