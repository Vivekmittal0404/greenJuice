import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

export type CustomerReview = {
  id: string;
  name: string;
  location: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
};

export const INITIAL_REVIEWS: CustomerReview[] = [
  {
    id: "rev-muskan",
    name: "Muskan",
    location: "Dinod gate bhiwani",
    rating: 5,
    date: "November 2026",
    comment:
      "Impressed with the taste. Thanks JuiceWala for this revolution.",
    verified: true,
  },
  {
    id: "rev-1",
    name: "Amit Verma",
    location: "Circular Road, Bhiwani",
    rating: 5,
    date: "November 2026",
    comment:
      "Direct seller se delivery aati hai isliye juice bilkul fresh aur chilled rehta hai. Packaging bohot safe aur sealed thi, glass bottle na hone ki wajah se tootne ka koi darr nahi rehta. Best delivery service in Bhiwani!",
    verified: true,
  },
  {
    id: "rev-2",
    name: "Pooja Tanwar",
    location: "Sector 13, Bhiwani",
    rating: 5,
    date: "November 2026",
    comment:
      "Standard delivery is super fast and prompt! The safe packaging is 100% spill-proof and very convenient to hold. Pure Sweet Lime and Banana Shake arrived cold and delicious.",
    verified: true,
  },
  {
    id: "rev-3",
    name: "Rahul Sharma",
    location: "Halu Bazar, Bhiwani",
    rating: 5,
    date: "November 2026",
    comment:
      "Mujhe safe packaging ka concept bohot pasand aaya. Bottles me breakage ka risk rehta hai, lekin ye pack direct counter se fresh aur hygienic pack hokar aata hai. Zero leakage, completely intact.",
    verified: true,
  },
  {
    id: "rev-4",
    name: "Sneha Jindal",
    location: "Near Clock Tower, Bhiwani",
    rating: 5,
    date: "November 2026",
    comment:
      "Ordered the Mosambi-Pineapple mix and sugarcane juice. Both arrived cold, intact, and well-sealed. Truly direct from seller to customer without any transit delays. Loved it!",
    verified: true,
  },
  {
    id: "rev-5",
    name: "Vikram Singh",
    location: "Vikas Nagar, Bhiwani",
    rating: 5,
    date: "November 2026",
    comment:
      "Prompt doorstep delivery within the promised time. The packaging was neat, safe, and easy to handle. The juice tasted just like freshly squeezed at the counter.",
    verified: true,
  },
  {
    id: "rev-6",
    name: "Neha Aggarwal",
    location: "Rohtak Gate, Bhiwani",
    rating: 5,
    date: "November 2026",
    comment:
      "Super impressed by the safe delivery standards. Food-grade safe pack, properly sealed, and completely leak-proof. Highly recommended for daily fresh juices in Bhiwani!",
    verified: true,
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): value is string {
  return typeof value === "string";
}

function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  const legacyServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabaseKey = supabaseSecretKey || legacyServiceRoleKey;
  return { supabaseUrl, supabaseKey };
}

// GET /api/reviews: Return all reviews (Supabase + Local backup + Initial)
export async function GET() {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();
  const remoteReviews: CustomerReview[] = [];

  // Try fetching reviews from Supabase
  if (supabaseUrl && supabaseKey) {
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/reviews?select=*&order=created_at.desc`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
          cache: "no-store",
          signal: AbortSignal.timeout(4000),
        },
      );

      if (response.ok) {
        const rows = (await response.json()) as Array<{
          id: string;
          name: string;
          location?: string;
          rating: number;
          comment: string;
          verified?: boolean;
          created_at?: string;
        }>;

        if (Array.isArray(rows)) {
          for (const r of rows) {
            let formattedDate = "Recently";
            if (r.created_at) {
              try {
                const d = new Date(r.created_at);
                formattedDate = d.toLocaleDateString("en-IN", {
                  month: "short",
                  year: "numeric",
                });
              } catch {}
            }

            remoteReviews.push({
              id: r.id,
              name: r.name,
              location: r.location || "Bhiwani",
              rating: Number(r.rating) || 5,
              date: formattedDate,
              comment: r.comment,
              verified: r.verified ?? true,
            });
          }
        }
      }
    } catch (err) {
      console.warn("Could not fetch reviews from Supabase:", err);
    }
  }

  // Read local file backup if available
  const backupReviews: CustomerReview[] = [];
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const backupPath = path.join(process.cwd(), "reviews_backup.json");
    const existing = await fs.readFile(backupPath, "utf-8");
    const parsed = JSON.parse(existing) as CustomerReview[];
    if (Array.isArray(parsed)) {
      backupReviews.push(...parsed);
    }
  } catch {}

  // Merge unique reviews: Remote -> Backup -> Initial
  const seenComments = new Set<string>();
  const combined: CustomerReview[] = [];

  for (const rev of [...remoteReviews, ...backupReviews, ...INITIAL_REVIEWS]) {
    const key = `${rev.name.toLowerCase().trim()}_${rev.comment.toLowerCase().trim()}`;
    if (!seenComments.has(key)) {
      seenComments.add(key);
      combined.push(rev);
    }
  }

  return NextResponse.json({ reviews: combined });
}

// POST /api/reviews: Save a new user review permanently
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON format." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Invalid review data." }, { status: 400 });
  }

  const { name, location, rating, comment } = body;

  if (!text(name) || name.trim().length < 2 || name.trim().length > 80) {
    return NextResponse.json(
      { error: "Please enter your valid name (at least 2 letters)." },
      { status: 400 },
    );
  }

  if (!text(comment) || comment.trim().length < 5 || comment.trim().length > 600) {
    return NextResponse.json(
      { error: "Please enter your review (between 5 and 600 characters)." },
      { status: 400 },
    );
  }

  const numericRating = Math.min(5, Math.max(1, Math.round(Number(rating) || 5)));
  const cleanName = name.trim();
  const cleanLocation = text(location) && location.trim().length > 0 ? location.trim() : "Bhiwani";
  const cleanComment = comment.trim();
  const reviewId = randomUUID();

  const newReview: CustomerReview = {
    id: reviewId,
    name: cleanName,
    location: cleanLocation,
    rating: numericRating,
    date: "Just now",
    comment: cleanComment,
    verified: true,
  };

  // 1. Save to Supabase DB if configured
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();
  let supabaseSaved = false;
  if (supabaseUrl && supabaseKey) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/reviews`, {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          id: reviewId,
          name: cleanName,
          location: cleanLocation,
          rating: numericRating,
          comment: cleanComment,
          verified: true,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        supabaseSaved = true;
      } else {
        const errPayload = await response.json().catch(() => null);
        console.warn("Supabase insert review returned:", response.status, errPayload);
      }
    } catch (err) {
      console.warn("Supabase insert review error:", err);
    }
  }

  // 2. Backup to local reviews_backup.json
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const backupPath = path.join(process.cwd(), "reviews_backup.json");
    let currentBackup: CustomerReview[] = [];
    try {
      const existing = await fs.readFile(backupPath, "utf-8");
      currentBackup = JSON.parse(existing);
      if (!Array.isArray(currentBackup)) currentBackup = [];
    } catch {
      currentBackup = [];
    }

    currentBackup.unshift(newReview);
    await fs.writeFile(
      backupPath,
      JSON.stringify(currentBackup.slice(0, 500), null, 2),
      "utf-8",
    );
  } catch (backupErr) {
    console.error("Local reviews backup error:", backupErr);
  }

  // 3. Send Notification Email via Resend to the Store Owner
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const notificationEmail = process.env.ORDER_NOTIFICATION_EMAIL?.trim();
  const senderEmail = process.env.RESEND_FROM_EMAIL?.trim();

  if (resendApiKey && notificationEmail && senderEmail) {
    try {
      const emailText = [
        `⭐ New Customer Review on JuiceWala!`,
        ``,
        `Customer: ${cleanName}`,
        `Location: ${cleanLocation}`,
        `Rating: ${numericRating} / 5 Stars`,
        `Date: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
        ``,
        `Review:`,
        `"${cleanComment}"`,
        ``,
        `Page: https://www.juicewala.shop/standard-delivery`,
      ].join("\n");

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: senderEmail,
          to: [notificationEmail],
          subject: `New Review from ${cleanName} (${numericRating}⭐) | JuiceWala`,
          text: emailText,
        }),
        signal: AbortSignal.timeout(6000),
      });
    } catch (mailErr) {
      console.error("Could not send review notification email:", mailErr);
    }
  }

  return NextResponse.json({
    success: true,
    supabaseSaved,
    review: newReview,
  });
}
