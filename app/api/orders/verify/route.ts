import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): value is string {
  return typeof value === "string";
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid payment verification details." },
      { status: 400 },
    );
  }

  if (
    !isRecord(payload) ||
    !text(payload.orderId) ||
    !text(payload.razorpay_order_id) ||
    !text(payload.razorpay_payment_id) ||
    !text(payload.razorpay_signature) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      payload.orderId,
    ) ||
    !/^[a-f0-9]{64}$/i.test(payload.razorpay_signature)
  ) {
    return NextResponse.json(
      { error: "Invalid payment verification details." },
      { status: 400 },
    );
  }

  const razorpayKeyId = process.env.RAZORPAY_KEY_ID?.trim();
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  const legacyServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabaseKey = supabaseSecretKey || legacyServiceRoleKey;

  if (!razorpayKeyId || !razorpayKeySecret) {
    return NextResponse.json(
      { error: "Payment verification is not configured on the server." },
      { status: 503 },
    );
  }

  let isSupabaseConfigured = false;
  if (supabaseUrl && supabaseKey) {
    try {
      const databaseUrl = new URL(supabaseUrl);
      if (
        databaseUrl.protocol === "https:" ||
        databaseUrl.hostname === "localhost"
      ) {
        isSupabaseConfigured = true;
      }
    } catch {
      isSupabaseConfigured = false;
    }
  }

  const expectedSignature = createHmac("sha256", razorpayKeySecret)
    .update(`${payload.razorpay_order_id}|${payload.razorpay_payment_id}`)
    .digest();
  const providedSignature = Buffer.from(payload.razorpay_signature, "hex");
  if (
    expectedSignature.length !== providedSignature.length ||
    !timingSafeEqual(expectedSignature, providedSignature)
  ) {
    return NextResponse.json(
      { error: "Razorpay payment signature could not be verified." },
      { status: 400 },
    );
  }

  const orderQuery = new URLSearchParams({
    select:
      "id,amount_inr,payment_status,razorpay_order_id,razorpay_payment_id",
    id: `eq.${payload.orderId}`,
    razorpay_order_id: `eq.${payload.razorpay_order_id}`,
    payment_method: "eq.razorpay",
  });

  let order: Record<string, unknown> | null = null;
  if (isSupabaseConfigured && supabaseUrl && supabaseKey) {
    const supabaseHeaders: Record<string, string> = {
      apikey: supabaseKey,
      ...(supabaseSecretKey
        ? {}
        : { Authorization: `Bearer ${supabaseKey}` }),
    };
    try {
      const databaseOrderResponse = await fetch(
        `${supabaseUrl}/rest/v1/orders?${orderQuery.toString()}`,
        {
          headers: supabaseHeaders,
          cache: "no-store",
          signal: AbortSignal.timeout(6000),
        },
      );
      if (databaseOrderResponse.ok) {
        const orderPayload: unknown = await databaseOrderResponse
          .json()
          .catch(() => null);
        if (Array.isArray(orderPayload) && isRecord(orderPayload[0])) {
          order = orderPayload[0];
        }
      }
    } catch (error) {
      console.warn("Supabase lookup failed during payment verification:", error);
    }
  }

  if (order) {
    if (
      typeof order.amount_inr !== "number" ||
      !Number.isInteger(order.amount_inr) ||
      order.amount_inr < 1 ||
      order.razorpay_order_id !== payload.razorpay_order_id
    ) {
      return NextResponse.json(
        { error: "The payment does not match this order." },
        { status: 400 },
      );
    }

    if (
      order.payment_status === "paid" &&
      order.razorpay_payment_id === payload.razorpay_payment_id
    ) {
      return NextResponse.json({ paymentStatus: "paid" });
    }
  }

  let paymentResponse: Response;
  try {
    paymentResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(payload.razorpay_payment_id)}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${razorpayKeyId}:${razorpayKeySecret}`,
          ).toString("base64")}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
  } catch (error) {
    console.error(
      "Razorpay payment lookup failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      { error: "Could not confirm payment with Razorpay. Please try again." },
      { status: 502 },
    );
  }

  const paymentPayload: unknown = await paymentResponse
    .json()
    .catch(() => null);
  if (
    !paymentResponse.ok ||
    !isRecord(paymentPayload) ||
    paymentPayload.order_id !== payload.razorpay_order_id ||
    (order && paymentPayload.amount !== (order.amount_inr as number) * 100) ||
    paymentPayload.currency !== "INR" ||
    paymentPayload.status !== "captured"
  ) {
    console.error("Razorpay payment is not captured", paymentResponse.status);
    return NextResponse.json(
      {
        error:
          "Razorpay has not confirmed a captured payment for this order yet.",
      },
      { status: 409 },
    );
  }

  if (isSupabaseConfigured && supabaseUrl && supabaseKey) {
    try {
      const supabaseHeaders: Record<string, string> = {
        apikey: supabaseKey,
        ...(supabaseSecretKey
          ? {}
          : { Authorization: `Bearer ${supabaseKey}` }),
      };
      const updateQuery = new URLSearchParams({
        id: `eq.${payload.orderId}`,
        razorpay_order_id: `eq.${payload.razorpay_order_id}`,
        payment_method: "eq.razorpay",
      });
      await fetch(
        `${supabaseUrl}/rest/v1/orders?${updateQuery.toString()}`,
        {
          method: "PATCH",
          headers: {
            ...supabaseHeaders,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            payment_status: "paid",
            razorpay_payment_id: payload.razorpay_payment_id,
          }),
          cache: "no-store",
          signal: AbortSignal.timeout(6000),
        },
      );
    } catch (error) {
      console.warn("Supabase update failed during payment verification:", error);
    }
  }

  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const backupPath = path.join(process.cwd(), "orders_backup.json");
    const existing = await fs.readFile(backupPath, "utf-8");
    const orders = JSON.parse(existing);
    if (Array.isArray(orders)) {
      const target = orders.find(
        (o: unknown) => isRecord(o) && o.id === payload.orderId,
      );
      if (target && isRecord(target)) {
        target.payment_status = "paid";
        target.razorpay_payment_id = payload.razorpay_payment_id;
        await fs.writeFile(backupPath, JSON.stringify(orders, null, 2), "utf-8");
      }
    }
  } catch (backupErr) {
    console.warn("Could not update local backup with paid status:", backupErr);
  }

  return NextResponse.json({ paymentStatus: "paid" });
}
