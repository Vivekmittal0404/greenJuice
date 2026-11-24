import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
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
    const orderDetails: {
      customer_name?: string;
      phone?: string;
      address?: string;
      items?: Array<{ name: string; quantity: number; unitPrice?: number }>;
      amount_inr?: number;
      subtotal_inr?: number;
      delivery_fee_inr?: number;
      payment_method?: string;
    } = {};

    // 1. Extract from client payload if provided
    if (isRecord(payload.order)) {
      const clientOrder = payload.order;
      if (isRecord(clientOrder.customer)) {
        orderDetails.customer_name = text(clientOrder.customer.name)
          ? clientOrder.customer.name
          : undefined;
        orderDetails.phone = text(clientOrder.customer.phone)
          ? clientOrder.customer.phone
          : undefined;
        orderDetails.address = text(clientOrder.customer.address)
          ? clientOrder.customer.address
          : undefined;
      }
      if (typeof clientOrder.amount === "number") {
        orderDetails.amount_inr = clientOrder.amount;
      }
      if (text(clientOrder.paymentMethod)) {
        orderDetails.payment_method = clientOrder.paymentMethod;
      }
      if (Array.isArray(clientOrder.items)) {
        orderDetails.items = clientOrder.items.map((it) => {
          if (isRecord(it)) {
            const itemName = text(it.name)
              ? it.name
              : text(it.id)
                ? (catalog[it.id]?.name || it.id)
                : "Fresh Juice";
            const qty = typeof it.quantity === "number" ? it.quantity : 1;
            const price =
              typeof it.price === "number"
                ? it.price
                : typeof it.unitPrice === "number"
                  ? it.unitPrice
                  : 0;
            return { name: itemName, quantity: qty, unitPrice: price };
          }
          return { name: "Fresh Juice", quantity: 1, unitPrice: 0 };
        });
      }
    }

    // 2. Update Supabase and fetch order details if available
    if (supabaseUrl && supabaseKey) {
      try {
        const updateResponse = await fetch(
          `${supabaseUrl}/rest/v1/orders?id=eq.${id}&select=*`,
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

        if (updateResponse.ok) {
          const updatedRows: unknown = await updateResponse
            .json()
            .catch(() => null);
          if (
            Array.isArray(updatedRows) &&
            updatedRows.length > 0 &&
            isRecord(updatedRows[0])
          ) {
            const row = updatedRows[0];
            if (text(row.customer_name)) orderDetails.customer_name = row.customer_name;
            if (text(row.phone)) orderDetails.phone = row.phone;
            if (text(row.address)) orderDetails.address = row.address;
            if (typeof row.amount_inr === "number")
              orderDetails.amount_inr = row.amount_inr;
            if (text(row.payment_method))
              orderDetails.payment_method = row.payment_method;
            if (
              Array.isArray(row.items) &&
              (!orderDetails.items || orderDetails.items.length === 0)
            ) {
              orderDetails.items = row.items.map((it: unknown) => {
                if (isRecord(it)) {
                  const itName = text(it.name)
                    ? it.name
                    : text(it.id)
                      ? (catalog[it.id]?.name || it.id)
                      : "Fresh Juice";
                  const itQty =
                    typeof it.quantity === "number" ? it.quantity : 1;
                  const itPrice =
                    typeof it.unitPrice === "number" ? it.unitPrice : 0;
                  return {
                    name: itName,
                    quantity: itQty,
                    unitPrice: itPrice,
                  };
                }
                return { name: "Fresh Juice", quantity: 1, unitPrice: 0 };
              });
            }
          }
        } else {
          console.error("Failed to cancel order in DB:", updateResponse.status);
        }
      } catch (err) {
        console.error("Supabase cancel order error:", err);
      }
    }

    // 3. Update local orders_backup.json
    try {
      const backupPath = path.join(process.cwd(), "orders_backup.json");
      const existing = await fs.readFile(backupPath, "utf-8").catch(() => null);
      if (existing) {
        const backupList: unknown = JSON.parse(existing);
        if (Array.isArray(backupList)) {
          let found = false;
          const updatedList = backupList.map((entry) => {
            if (isRecord(entry) && entry.id === id) {
              found = true;
              if (!orderDetails.customer_name && text(entry.customer_name))
                orderDetails.customer_name = entry.customer_name;
              if (!orderDetails.phone && text(entry.phone))
                orderDetails.phone = entry.phone;
              if (!orderDetails.address && text(entry.address))
                orderDetails.address = entry.address;
              if (
                !orderDetails.amount_inr &&
                typeof entry.amount_inr === "number"
              )
                orderDetails.amount_inr = entry.amount_inr;
              if (!orderDetails.payment_method && text(entry.payment_method))
                orderDetails.payment_method = entry.payment_method;
              if (
                (!orderDetails.items || orderDetails.items.length === 0) &&
                Array.isArray(entry.items)
              ) {
                orderDetails.items = entry.items.map((it) => {
                  if (isRecord(it)) {
                    return {
                      name: text(it.name) ? it.name : "Fresh Juice",
                      quantity:
                        typeof it.quantity === "number" ? it.quantity : 1,
                      unitPrice:
                        typeof it.unitPrice === "number" ? it.unitPrice : 0,
                    };
                  }
                  return { name: "Fresh Juice", quantity: 1, unitPrice: 0 };
                });
              }
              return {
                ...entry,
                payment_status: "cancelled",
                cancelled_at: new Date().toISOString(),
              };
            }
            return entry;
          });
          if (found) {
            await fs.writeFile(
              backupPath,
              JSON.stringify(updatedList, null, 2),
              "utf-8",
            );
          }
        }
      }
    } catch (backupErr) {
      console.error("Local backup cancel update error:", backupErr);
    }

    // 4. Send Order Cancellation Notification Email via Resend to Store Owner
    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    const notificationEmail = process.env.ORDER_NOTIFICATION_EMAIL?.trim();
    const senderEmail = process.env.RESEND_FROM_EMAIL?.trim();

    let emailSent = false;
    if (resendApiKey && notificationEmail && senderEmail) {
      const orderRef = id.slice(0, 8).toUpperCase();
      const customerName = orderDetails.customer_name || "Customer";
      const customerPhone = orderDetails.phone || "Not specified";
      const customerAddress = orderDetails.address || "Not specified";
      const totalAmount =
        typeof orderDetails.amount_inr === "number"
          ? `Rs ${orderDetails.amount_inr}`
          : "N/A";
      const paymentMethodStr =
        orderDetails.payment_method === "razorpay"
          ? "Razorpay (Online Payment)"
          : "Cash on delivery (COD)";

      const itemsText =
        orderDetails.items && orderDetails.items.length > 0
          ? orderDetails.items
              .map(
                (item) =>
                  `- ${item.name} x${item.quantity}${
                    item.unitPrice
                      ? ` (Rs ${item.unitPrice * item.quantity})`
                      : ""
                  }`,
              )
              .join("\n")
          : "- Items not specified";

      const cancelEmailText = [
        `❌ ORDER CANCELLED: #${orderRef}`,
        `Status: CANCELLED BY CUSTOMER`,
        `Cancellation Time: ${new Date().toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })}`,
        "",
        `Customer: ${customerName}`,
        `Phone: ${customerPhone}`,
        `Delivery address: ${customerAddress}`,
        "",
        "Cancelled Items:",
        itemsText,
        "",
        `Total Order Amount: ${totalAmount}`,
        `Payment Method: ${paymentMethodStr}`,
        "",
        "⚠️ PLEASE NOTE: Do NOT prepare, pack, or dispatch this order.",
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
            subject: `❌ Order CANCELLED: #${orderRef} - ${totalAmount} (${customerName})`,
            text: cancelEmailText,
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
            "Cancellation email was not accepted by Resend:",
            emailResponse.status,
          );
        }
      } catch (mailErr) {
        console.error("Cancellation email failed to reach Resend:", mailErr);
      }
    }

    return NextResponse.json({
      success: true,
      action: "cancel",
      orderId: id,
      paymentStatus: "cancelled",
      cancellationEmailSent: emailSent,
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
    let existingDbOrder: Record<string, unknown> | null = null;
    if (supabaseUrl && supabaseKey) {
      try {
        const updateResponse = await fetch(
          `${supabaseUrl}/rest/v1/orders?id=eq.${id}&select=*`,
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

        if (updateResponse.ok) {
          const rows: unknown = await updateResponse
            .json()
            .catch(() => null);
          if (Array.isArray(rows) && rows.length > 0 && isRecord(rows[0])) {
            existingDbOrder = rows[0];
          }
        } else {
          console.error(
            "DB order update response error:",
            updateResponse.status,
          );
        }
      } catch (err) {
        console.error("Supabase update order error:", err);
      }
    }

    // Update local orders_backup.json
    try {
      const backupPath = path.join(process.cwd(), "orders_backup.json");
      const existing = await fs.readFile(backupPath, "utf-8").catch(() => null);
      if (existing) {
        const backupList: unknown = JSON.parse(existing);
        if (Array.isArray(backupList)) {
          const updatedList = backupList.map((entry) => {
            if (isRecord(entry) && entry.id === id) {
              return {
                ...entry,
                ...updateBody,
                updated_at: new Date().toISOString(),
              };
            }
            return entry;
          });
          await fs.writeFile(
            backupPath,
            JSON.stringify(updatedList, null, 2),
            "utf-8",
          );
        }
      }
    } catch (backupErr) {
      console.error("Local backup update error:", backupErr);
    }

    // Send Order Update Notification Email via Resend to Store Owner
    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    const notificationEmail = process.env.ORDER_NOTIFICATION_EMAIL?.trim();
    const senderEmail = process.env.RESEND_FROM_EMAIL?.trim();

    let emailSent = false;
    if (resendApiKey && notificationEmail && senderEmail) {
      const orderRef = id.slice(0, 8).toUpperCase();
      const custName =
        (text(updateBody.customer_name) ? updateBody.customer_name : undefined) ||
        (existingDbOrder && text(existingDbOrder.customer_name)
          ? existingDbOrder.customer_name
          : undefined) ||
        "Customer";
      const custPhone =
        (text(updateBody.phone) ? updateBody.phone : undefined) ||
        (existingDbOrder && text(existingDbOrder.phone)
          ? existingDbOrder.phone
          : undefined) ||
        "Not specified";
      const custAddress =
        (text(updateBody.address) ? updateBody.address : undefined) ||
        (existingDbOrder && text(existingDbOrder.address)
          ? existingDbOrder.address
          : undefined) ||
        "Not specified";

      const finalAmount =
        typeof newAmount === "number"
          ? newAmount
          : existingDbOrder && typeof existingDbOrder.amount_inr === "number"
            ? existingDbOrder.amount_inr
            : undefined;
      const totalAmountStr =
        typeof finalAmount === "number" ? `Rs ${finalAmount}` : "N/A";

      const payMethod =
        (text(payload.paymentMethod) ? payload.paymentMethod : undefined) ||
        (existingDbOrder && text(existingDbOrder.payment_method)
          ? existingDbOrder.payment_method
          : undefined) ||
        "cod";
      const payMethodStr =
        payMethod === "razorpay"
          ? "Razorpay (Online Payment)"
          : "Cash on delivery (COD)";

      const itemsToReport =
        updatedOrderLines ||
        (existingDbOrder && Array.isArray(existingDbOrder.items)
          ? (existingDbOrder.items as Array<Record<string, unknown>>)
          : []);

      const itemsText =
        itemsToReport.length > 0
          ? itemsToReport
              .map((item) => {
                if (isRecord(item)) {
                  const name = text(item.name) ? item.name : "Juice";
                  const qty =
                    typeof item.quantity === "number" ? item.quantity : 1;
                  const unitPrice =
                    typeof item.unitPrice === "number" ? item.unitPrice : 0;
                  return `- ${name} x${qty}${
                    unitPrice ? ` (Rs ${unitPrice * qty})` : ""
                  }`;
                }
                return "- Juice";
              })
              .join("\n")
          : "- No items specified";

      const updateEmailLines = [
        `✏️ ORDER UPDATED: #${orderRef}`,
        `Status: UPDATED BY CUSTOMER`,
        `Update Time: ${new Date().toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })}`,
        "",
        `Customer: ${custName}`,
        `Phone: ${custPhone}`,
        `Delivery Address: ${custAddress}`,
        "",
        "Updated Order Items:",
        itemsText,
        "",
      ];

      if (typeof newSubtotal === "number") {
        updateEmailLines.push(`Subtotal: Rs ${newSubtotal}`);
      }
      if (typeof newDeliveryFee === "number") {
        updateEmailLines.push(`Delivery Fee: Rs ${newDeliveryFee}`);
      }
      updateEmailLines.push(
        `Total Order Amount: ${totalAmountStr}`,
        `Payment Method: ${payMethodStr}`,
        "",
        "ℹ️ PLEASE NOTE: Customer has modified this order. Please prepare and dispatch the UPDATED items and address above.",
      );

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
            subject: `✏️ Order UPDATED: #${orderRef} - ${totalAmountStr} (${custName})`,
            text: updateEmailLines.join("\n"),
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
            "Order update email was not accepted by Resend:",
            emailResponse.status,
          );
        }
      } catch (mailErr) {
        console.error("Order update email failed to reach Resend:", mailErr);
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
      updateEmailSent: emailSent,
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
