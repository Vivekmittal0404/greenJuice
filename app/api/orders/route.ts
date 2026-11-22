import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

const catalog: Record<string, { name: string; price: number }> = {
  "green-juice": { name: "Herbal Green Vitality", price: 60 },
  "sweet-lime": { name: "Pure Sweet Lime (Mosambi)", price: 100 },
  "celery-detox": { name: "Celery Deep Cleanse", price: 110 },
  "ruby-roots": { name: "Ruby Roots (Beet & Carrot)", price: 90 },
  "valencia-orange": { name: "Valencia Sunshine Orange", price: 110 },
  "pomegranate-pure": { name: "Royal Pomegranate Elixir", price: 130 },
  "watermelon-mint": { name: "Crimson Watermelon & Mint", price: 80 },
  "golden-glow": { name: "Golden Carrot & Ginger", price: 90 },
  "coconut-aloe": { name: "Tender Coconut & Aloe Vera", price: 95 },
  "pineapple-digest": { name: "Pineapple Bromelain Digest", price: 100 },
  "ginger-immunity-shot": { name: "Fiery Ginger & Turmeric Tonic", price: 70 },
  "jamun-metabolic": { name: "Wild Jamun & Amla Balance", price: 110 },
  "sugarcane-pure": { name: "Pure Sugarcane (ताज़ा गन्ने का जूस)", price: 40 },
  "banana-shake": { name: "Fresh Banana Shake (ताज़ा केला शेक)", price: 50 },
  "papaya-shake": { name: "Fresh Papaya Shake (ताज़ा पपीता शेक)", price: 50 },
  "mosambi-pineapple-mix": {
    name: "Mosambi Pineapple Mix (ताज़ा मौसंबी-अनानास जूस)",
    price: 60,
  },
  "mosambi-pineapple-anar-mix": {
    name: "Mosambi Pineapple Anar (मौसंबी-अनानास-अनार जूस)",
    price: 100,
  },
  "banana-papaya-mix": {
    name: "Banana Papaya Mix Shake (केला-पपीता मिक्स शेक)",
    price: 60,
  },
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

  const paymentMethod = payload.paymentMethod ?? "razorpay";
  if (paymentMethod !== "razorpay" && paymentMethod !== "cod") {
    return NextResponse.json(
      { error: "Choose Razorpay or cash on delivery." },
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

  const addressLower = address.toLowerCase();
  const nonBhiwaniDistricts = [
    "hisar",
    "hissar",
    "delhi",
    "rohtak",
    "gurgaon",
    "gurugram",
    "faridabad",
    "panipat",
    "sonipat",
    "karnal",
    "ambala",
    "sirsa",
    "rewari",
    "narnaul",
    "jind",
    "fatehabad",
    "jhajjar",
    "chandigarh",
    "noida",
    "jaipur",
  ];
  const hasOtherDistrict = nonBhiwaniDistricts.some((d) =>
    addressLower.includes(d),
  );
  const pincodeMatch = address.match(/\b([0-9]{6})\b/);
  const hasNon127Pincode = pincodeMatch
    ? !pincodeMatch[1].startsWith("127")
    : false;

  if (hasOtherDistrict || (hasNon127Pincode && !addressLower.includes("bhiwani"))) {
    return NextResponse.json(
      {
        error:
          "Currently, JuiceWala delivers fresh juice in Bhiwani only (PIN codes starting with 127). We are expanding soon!",
      },
      { status: 400 },
    );
  }

  if (payload.items.length < 1 || payload.items.length > 25) {
    return NextResponse.json(
      { error: "Your bag must contain between 1 and 25 juice varieties." },
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
    if (!product || quantity < 1 || quantity > 24) {
      return NextResponse.json(
        { error: "One of the selected quantities is not available." },
        { status: 400 },
      );
    }
    bottleCount += quantity;
    if (bottleCount > 60) {
      return NextResponse.json(
        { error: "An order can contain up to 60 bottles." },
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
  const deliveryFee = subtotal >= 499 ? 0 : 40;
  const amount = subtotal + deliveryFee;
  const razorpayKeyId = process.env.RAZORPAY_KEY_ID?.trim();
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  const legacyServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabaseKey = supabaseSecretKey || legacyServiceRoleKey;
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const notificationEmail = process.env.ORDER_NOTIFICATION_EMAIL?.trim();
  const senderEmail = process.env.RESEND_FROM_EMAIL?.trim();

  if (paymentMethod === "razorpay" && (!razorpayKeyId || !razorpayKeySecret)) {
    return NextResponse.json(
      {
        error:
          "Razorpay is not set up yet. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the server environment.",
      },
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

  const orderId = randomUUID();
  let razorpayOrderId: string | undefined;
  if (paymentMethod === "razorpay") {
    let razorpayResponse: Response;
    try {
      razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${razorpayKeyId}:${razorpayKeySecret}`,
          ).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amount * 100,
          currency: "INR",
          receipt: orderId,
        }),
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });
    } catch (error) {
      console.error(
        "Razorpay order creation request failed",
        error instanceof Error ? error.name : "UnknownError",
      );
      return NextResponse.json(
        { error: "Could not connect to Razorpay. Please try again." },
        { status: 502 },
      );
    }

    const razorpayPayload: unknown = await razorpayResponse
      .json()
      .catch(() => null);
    if (
      !razorpayResponse.ok ||
      !isRecord(razorpayPayload) ||
      !text(razorpayPayload.id) ||
      razorpayPayload.amount !== amount * 100 ||
      razorpayPayload.currency !== "INR"
    ) {
      console.error("Razorpay order creation failed", razorpayResponse.status);
      return NextResponse.json(
        { error: "Razorpay could not prepare your payment. Please try again." },
        { status: 502 },
      );
    }
    razorpayOrderId = razorpayPayload.id;
  }

  let supabaseSaved = false;
  if (isSupabaseConfigured && supabaseUrl && supabaseKey) {
    try {
      const saveResponse = await fetch(`${supabaseUrl}/rest/v1/orders`, {
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
          razorpay_order_id: razorpayOrderId ?? null,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      });

      if (saveResponse.ok) {
        supabaseSaved = true;
      } else {
        const errorPayload: unknown = await saveResponse
          .clone()
          .json()
          .catch(() => null);
        console.warn(
          "Supabase order insert returned error status:",
          saveResponse.status,
          errorPayload,
        );
      }
    } catch (error) {
      console.warn(
        "Supabase order insert request failed (project may be paused or unreachable). Proceeding with order placement:",
        error instanceof Error ? error.message : "UnknownError",
      );
    }
  }

  // Backup order to local persistent file on the server
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const backupPath = path.join(process.cwd(), "orders_backup.json");
    let currentBackup: unknown[] = [];
    try {
      const existing = await fs.readFile(backupPath, "utf-8");
      currentBackup = JSON.parse(existing);
      if (!Array.isArray(currentBackup)) currentBackup = [];
    } catch {
      currentBackup = [];
    }
    currentBackup.unshift({
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
      razorpay_order_id: razorpayOrderId ?? null,
      created_at: new Date().toISOString(),
      supabaseSaved,
    });
    await fs.writeFile(
      backupPath,
      JSON.stringify(currentBackup.slice(0, 500), null, 2),
      "utf-8",
    );
  } catch (backupErr) {
    console.error("Local order backup write failed:", backupErr);
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
      `New JuiceWala order ${orderReference}`,
      `Payment method: ${paymentMethod === "razorpay" ? "Razorpay" : "Cash on delivery"}`,
      paymentMethod === "razorpay"
        ? "Payment status: PENDING (awaiting Razorpay payment confirmation)."
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
      "Packaging: Insulated Cold-Box with gel chill packs (Delivered Fresh).",
      "Delivery window: Express Morning Slot (6 AM - 9 AM) or Priority Daytime Delivery.",
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
          subject: `New order ${orderReference} (${paymentMethod === "razorpay" ? "Razorpay payment pending" : "cash on delivery"})`,
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

  if (!razorpayKeyId || !razorpayOrderId) {
    return NextResponse.json(
      { error: "Razorpay could not prepare your payment. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ...orderResponse,
    razorpayKeyId,
    razorpayOrderId,
  });
}
