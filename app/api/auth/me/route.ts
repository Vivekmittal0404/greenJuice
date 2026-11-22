import { NextResponse } from "next/server";
import {
  COOKIE_NAME,
  getCookieFromRequest,
  verifySessionToken,
} from "../../../lib/auth";

export async function GET(request: Request) {
  try {
    let token: string | undefined;

    // Check authorization header first
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }

    // Check cookie
    if (!token) {
      token = getCookieFromRequest(request, COOKIE_NAME);
    }

    if (!token) {
      return NextResponse.json({ loggedIn: false });
    }

    const phone = verifySessionToken(token);
    if (!phone) {
      return NextResponse.json({ loggedIn: false });
    }

    return NextResponse.json({
      loggedIn: true,
      phone,
    });
  } catch (err) {
    console.error("[Auth Me API Error]", err);
    return NextResponse.json({ loggedIn: false });
  }
}
