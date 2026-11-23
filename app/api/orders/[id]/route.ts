import { NextResponse } from "next/server";
import { JUICE_CATALOG } from "@/app/lib/catalog";

const catalog = JUICE_CATALOG;

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): value is string {
  return typeof value === "string";
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  const legacyServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabaseKey = supabaseSecretKey || legacyServiceRoleKey;

  return { supabaseUrl, supabaseKey };
}

// GET single order details
export async function GET(request: Request, context: RouteContext) {
  const { id } = await Promise.resolve(context.params);
  if (!text(id) || !UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid order ID." }, { status: 400 });
  }

  const { supabaseUrl, supabaseKey } = getSupabaseConfig();
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { orderId: id, message: "Order stored on local device." },
      { status: 200 },
    );
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/orders?id=eq.${id}&select=*`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Could not fetch order." },
        { status: response.status },
      );
    }

    const data: unknown = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    return NextResponse.json({ order: data[0] });
  } catch (error) {
    console.error("Fetch order error:", error);
    return NextResponse.json(
      { error: "Order lookup failed." },
      { status: 500 },
    );
  }
}

// PATCH: Cancel or Update order
export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await Promise.resolve(context.params);
  if (!text(id) || !UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid order ID." }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  if (!isRecord(payload) || !text(payload.action)) {
    return NextResponse.json(
      { error: "Action is required ('cancel' or 'update')." },
      { status: 400 },
    );
  }

  const { supabaseUrl, supabaseKey } = getSupabaseConfig();

  // ACTION: CANCEL ORDER
  if (payload.action === "cancel") {
    if (supabaseUrl && supabaseKey) {
      try {
        const updateResponse = await fetch(
          `${supabaseUrl}/rest/v1/orders?id=eq.${id}`,
          {
            method: "PATCH",
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
              Prefer: "return=representation",
            },
            body: JSON.stringify({
              payment_status: "cancelled",
            }),
            cache: "no-store",
          },
        );

        if (!updateResponse.ok) {
          console.error("Failed to cancel order in DB:", updateResponse.status);
        }
      } catch (err) {
        console.error("Supabase cancel order error:", err);
      }
    }

    return NextResponse.json({
      success: true,
      action: "cancel",
      orderId: id,
      paymentStatus: "cancelled",
      message: "Order has been cancelled successfully.",
    });
  }

  // ACTION: UPDATE ORDER
  if (payload.action === "update") {
    const updateBody: Record<string, unknown> = {};

    // Customer details update
    if (isRecord(payload.customer)) {
      const { name, phone, address } = payload.customer;
      if (text(name) && name.trim().length >= 2) {
        updateBody.customer_name = name.trim();
      }
      if (text(phone) && /^[0-9]{10}$/.test(phone.trim())) {
        updateBody.phone = phone.trim();
      }
      if (text(address) && address.trim().length >= 6) {
        updateBody.address = address.trim();
      }
    }

    // Items update (if provided)
    let newSubtotal: number | undefined;
    let newDeliveryFee: number | undefined;
    let newAmount: number | undefined;
    let updatedOrderLines: Array<{
      id: string;
      name: string;
      quantity: number;
      unitPrice: number;
    }> | undefined;

    if (Array.isArray(payload.items) && payload.items.length > 0) {
      updatedOrderLines = [];
      let totalBottles = 0;

      for (const item of payload.items) {
        if (
          !isRecord(item) ||
          !text(item.id) ||
          !Number.isInteger(item.quantity)
        ) {
          return NextResponse.json(
            { error: "Invalid item format." },
            { status: 400 },
          );
        }

        const product = catalog[item.id];
        const quantity = item.quantity as number;
        if ((!product && !text(item.name)) || quantity < 1 || quantity > 24) {
          return NextResponse.json(
            { error: `Invalid quantity for item ${item.id}.` },
            { status: 400 },
          );
        }

        const unitPrice =
          typeof item.price === "number" && item.price > 0
            ? item.price
            : typeof item.unitPrice === "number" && item.unitPrice > 0
              ? item.unitPrice
              : product
                ? product.price
                : 0;

        const itemName =
          text(item.name) && item.name.trim().length > 0
            ? item.name.trim()
            : product
              ? product.name
              : item.id;

        totalBottles += quantity;
        updatedOrderLines.push({
          id: item.id,
          name: itemName,
          quantity,
          unitPrice,
        });
      }

      if (totalBottles > 60) {
        return NextResponse.json(
          { error: "Total bottles cannot exceed 60." },
          { status: 400 },
        );
      }

      newSubtotal = updatedOrderLines.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      );
      newDeliveryFee = newSubtotal >= 199 ? 0 : 20;
      newAmount = newSubtotal + newDeliveryFee;

      updateBody.items = updatedOrderLines;
      updateBody.subtotal_inr = newSubtotal;
      updateBody.delivery_fee_inr = newDeliveryFee;
      updateBody.amount_inr = newAmount;
    }

    if (Object.keys(updateBody).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update." },
        { status: 400 },
      );
    }

    // If Supabase is configured, update the DB record
    if (supabaseUrl && supabaseKey) {
      try {
        const updateResponse = await fetch(
          `${supabaseUrl}/rest/v1/orders?id=eq.${id}`,
          {
            method: "PATCH",
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
              Prefer: "return=representation",
            },
            body: JSON.stringify(updateBody),
            cache: "no-store",
          },
        );

        if (!updateResponse.ok) {
          console.error("DB order update response error:", updateResponse.status);
        }
      } catch (err) {
        console.error("Supabase update order error:", err);
      }
    }

    return NextResponse.json({
      success: true,
      action: "update",
      orderId: id,
      updatedFields: updateBody,
      subtotal: newSubtotal,
      deliveryFee: newDeliveryFee,
      amount: newAmount,
      items: updatedOrderLines,
      message: "Order updated successfully.",
    });
  }

  return NextResponse.json(
    { error: "Unsupported action. Use 'cancel' or 'update'." },
    { status: 400 },
  );
}

// DELETE: Remove order completely
export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await Promise.resolve(context.params);
  if (!text(id) || !UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid order ID." }, { status: 400 });
  }

  const { supabaseUrl, supabaseKey } = getSupabaseConfig();
  if (supabaseUrl && supabaseKey) {
    try {
      const deleteResponse = await fetch(
        `${supabaseUrl}/rest/v1/orders?id=eq.${id}`,
        {
          method: "DELETE",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
          cache: "no-store",
        },
      );

      if (!deleteResponse.ok) {
        console.error("Failed to delete from DB:", deleteResponse.status);
      }
    } catch (err) {
      console.error("Supabase delete order error:", err);
    }
  }

  return NextResponse.json({
    success: true,
    action: "delete",
    deletedId: id,
    message: "Order deleted successfully.",
  });
}
