import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

const catalog: Record<string, { name: string; price: number }> = {
  "green-juice": { name: "Green Juice", price: 60 },
  "sweet-lime": { name: "Sweet Lime Juice", price: 100 },
};

type OrderLine = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

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
      { error: "Invalid order details." },
      { status: 400 },
    );
  }

  if (
    !isRecord(payload) ||
    !isRecord(payload.customer) ||
    !Array.isArray(payload.items)
  ) {
    return NextResponse.json(
      { error: "Invalid order details." },
      { status: 400 },
    );
  }

  const paymentMethod = payload.paymentMethod ?? "upi";
  if (paymentMethod !== "upi" && paymentMethod !== "cod") {
    return NextResponse.json(
      { error: "Choose UPI or cash on delivery." },
      { status: 400 },
    );
  }

  const { name, phone, address } = payload.customer;
  if (
    !text(name) ||
    name.trim().length < 2 ||
    name.trim().length > 80 ||
    !text(phone) ||
    !/^[0-9]{10}$/.test(phone.trim()) ||
    !text(address) ||
    address.trim().length < 8 ||
    address.trim().length > 300
  ) {
    return NextResponse.json(
      { error: "Enter a valid name, mobile number and delivery address." },
      { status: 400 },
    );
  }

  if (payload.items.length < 1 || payload.items.length > 8) {
    return NextResponse.json(
      { error: "Your bag must contain between 1 and 8 juice varieties." },
      { status: 400 },
    );
  }

  const orderLines: OrderLine[] = [];
  let bottleCount = 0;
  for (const item of payload.items) {
    if (!isRecord(item) || !text(item.id) || !Number.isInteger(item.quantity)) {
      return NextResponse.json(
        { error: "Invalid item in your bag." },
        { status: 400 },
      );
    }
    const product = catalog[item.id];
    const quantity = item.quantity as number;
    if (!product || quantity < 1 || quantity > 12) {
      return NextResponse.json(
        { error: "One of the selected quantities is not available." },
        { status: 400 },
      );
    }
    bottleCount += quantity;
    if (bottleCount > 24) {
      return NextResponse.json(
        { error: "An order can contain up to 24 bottles." },
        { status: 400 },
      );
    }
    orderLines.push({
      id: item.id,
      name: product.name,
      quantity,
      unitPrice: product.price,
    });
  }

  const subtotal = orderLines.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const deliveryFee = 40;
  const amount = subtotal + deliveryFee;
  const upiId = process.env.UPI_ID?.trim();
  const upiName = process.env.UPI_NAME?.trim() || "Root and Ritual";
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  const legacyServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabaseKey = supabaseSecretKey || legacyServiceRoleKey;
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const notificationEmail = process.env.ORDER_NOTIFICATION_EMAIL?.trim();
  const senderEmail = process.env.RESEND_FROM_EMAIL?.trim();

  if (paymentMethod === "upi" && !upiId) {
    return NextResponse.json(
      {
        error:
          "UPI payments are not set up yet. Add the store's UPI ID as the server environment variable UPI_ID.",
      },
      { status: 503 },
    );
  }
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      {
        error:
          "Order storage is not set up yet. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server before accepting orders.",
      },
      { status: 503 },
    );
  }

  let databaseUrl: URL;
  try {
    databaseUrl = new URL(supabaseUrl);
  } catch {
    return NextResponse.json(
      { error: "The store order service is not configured correctly." },
      { status: 503 },
    );
  }
  if (
    databaseUrl.protocol !== "https:" &&
    databaseUrl.hostname !== "localhost"
  ) {
    return NextResponse.json(
      { error: "The store order service is not configured correctly." },
      { status: 503 },
    );
  }

  const orderId = randomUUID();
  let saveResponse: Response;
  try {
    saveResponse = await fetch(`${supabaseUrl}/rest/v1/orders`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        ...(supabaseSecretKey
          ? {}
          : { Authorization: `Bearer ${supabaseKey}` }),
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        id: orderId,
        customer_name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        items: orderLines,
        subtotal_inr: subtotal,
        delivery_fee_inr: deliveryFee,
        amount_inr: amount,
        payment_method: paymentMethod,
        payment_status: "pending",
      }),
      cache: "no-store",
    });
  } catch (error) {
    const causeCode =
      error instanceof Error &&
      "cause" in error &&
      isRecord(error.cause) &&
      text(error.cause.code)
        ? error.cause.code
        : "unknown";
    console.error(
      "Supabase order insert request failed",
      error instanceof Error ? error.name : "UnknownError",
      causeCode,
    );
    return NextResponse.json(
      {
        error:
          "Could not connect to Supabase. Check the SUPABASE_URL and confirm the project is available.",
      },
      { status: 502 },
    );
  }

  if (!saveResponse.ok) {
    const errorPayload: unknown = await saveResponse
      .clone()
      .json()
      .catch(() => null);
    const errorCode =
      isRecord(errorPayload) && text(errorPayload.code)
        ? errorPayload.code
        : undefined;
    console.error("Order insert failed", saveResponse.status, errorCode);
    if (errorCode === "42501") {
      return NextResponse.json(
        {
          error:
            "Supabase denied access to public.orders. Run the latest supabase/schema.sql in the Supabase SQL Editor to grant the order API access.",
        },
        { status: 503 },
      );
    }
    if (errorCode === "42P01" || errorCode === "42703") {
      return NextResponse.json(
        {
          error:
            "The Supabase orders table is missing or out of date. Run the latest supabase/schema.sql in the Supabase SQL Editor.",
        },
        { status: 503 },
      );
    }
    if (errorCode === "PGRST204") {
      return NextResponse.json(
        {
          error:
            "Supabase is missing the payment_method column. Run the latest supabase/schema.sql in the Supabase SQL Editor, then try again.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Could not save your order. Please try again." },
      { status: 502 },
    );
  }

  let emailSent = false;
  if (resendApiKey && notificationEmail && senderEmail) {
    const itemDetails = orderLines
      .map(
        (item) =>
          `- ${item.name} x${item.quantity}: Rs ${item.unitPrice * item.quantity}`,
      )
      .join("\n");
    const orderReference = orderId.slice(0, 8).toUpperCase();
    const emailText = [
      `New Root & Ritual order ${orderReference}`,
      `Payment method: ${paymentMethod === "upi" ? "UPI" : "Cash on delivery"}`,
      paymentMethod === "upi"
        ? "Payment status: PENDING (UPI payment is not automatically verified)."
        : "Payment status: DUE ON DELIVERY (cash on delivery).",
      "",
      `Customer: ${name.trim().replace(/[\r\n]+/g, " ")}`,
      `Phone: ${phone.trim()}`,
      `Delivery address: ${address.trim().replace(/[\r\n]+/g, ", ")}`,
      "",
      "Items:",
      itemDetails,
      "",
      `Subtotal: Rs ${subtotal}`,
      `Delivery: Rs ${deliveryFee}`,
      `Total: Rs ${amount}`,
      "Delivery attempts are between 6 AM and 8 AM.",
    ].join("\n");
    try {
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: senderEmail,
          to: [notificationEmail],
          subject: `New order ${orderReference} (${paymentMethod === "upi" ? "UPI payment pending" : "cash on delivery"})`,
          text: emailText,
        }),
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });
      const emailPayload: unknown = await emailResponse
        .json()
        .catch(() => null);
      emailSent =
        emailResponse.ok && isRecord(emailPayload) && text(emailPayload.id);
      if (!emailSent) {
        console.error(
          "Store order email was not accepted",
          emailResponse.status,
        );
      }
    } catch {
      console.error("Store order email could not reach Resend.");
    }
  }

  const orderResponse = {
    orderId,
    amount,
    paymentMethod,
    notificationWarning: emailSent
      ? undefined
      : "Order saved, but the store email is not configured or was not accepted by Resend.",
  };

  if (paymentMethod === "cod") {
    return NextResponse.json(orderResponse);
  }

  if (!upiId) {
    return NextResponse.json(
      {
        error:
          "UPI payments are not set up yet. Add the store's UPI ID as the server environment variable UPI_ID.",
      },
      { status: 503 },
    );
  }

  const paymentLink = new URL("upi://pay");
  paymentLink.searchParams.set("pa", upiId);
  paymentLink.searchParams.set("pn", upiName);
  paymentLink.searchParams.set("am", amount.toFixed(2));
  paymentLink.searchParams.set("cu", "INR");
  paymentLink.searchParams.set("tn", `Root & Ritual ${orderId.slice(0, 8)}`);

  return NextResponse.json({
    ...orderResponse,
    paymentLink: paymentLink.toString(),
    upiId,
  });
}
