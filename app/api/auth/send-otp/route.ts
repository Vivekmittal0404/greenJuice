import { NextResponse } from "next/server";
import { requestOtp } from "../../../lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { phone?: unknown };
    if (!body || typeof body.phone !== "string") {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit mobile number." },
        { status: 400 },
      );
    }

    const result = await requestOtp(body.phone);
    if (!result.success) {
      return NextResponse.json(
        {
          error: result.message,
          cooldownSeconds: result.cooldownSeconds,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      provider: result.provider,
      demoOtp: result.demoOtp,
    });
  } catch (err) {
    console.error("[Send OTP API Error]", err);
    return NextResponse.json(
      { error: "Could not send OTP. Please try again." },
      { status: 500 },
    );
  }
}
