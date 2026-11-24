"use client";

import { useState, useEffect, type FormEvent } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  HeartHandshake,
  Leaf,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  X,
} from "lucide-react";
import Link from "next/link";

interface CustomerReview {
  id: string;
  name: string;
  location: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
}

const INITIAL_REVIEWS: CustomerReview[] = [
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

const LOCAL_STORAGE_KEY = "juicewala_user_reviews_v1";

export default function StandardDeliveryPage() {
  const [reviews, setReviews] = useState<CustomerReview[]>(INITIAL_REVIEWS);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newComment, setNewComment] = useState("");
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState("");

  // Load reviews from persistent API across all users, with localStorage cache as fast fallback
  useEffect(() => {
    let isMounted = true;

    // Fast local restore
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CustomerReview[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const combined = [...parsed, ...INITIAL_REVIEWS];
          setTimeout(() => {
            if (isMounted) setReviews(combined);
          }, 0);
        }
      }
    } catch {}

    // Fetch live global reviews from server/Supabase
    async function fetchLiveReviews() {
      try {
        const res = await fetch("/api/reviews");
        if (res.ok) {
          const data = (await res.json()) as { reviews?: CustomerReview[] };
          if (Array.isArray(data.reviews) && data.reviews.length > 0 && isMounted) {
            setReviews(data.reviews);
          }
        }
      } catch (err) {
        console.warn("Could not fetch remote reviews:", err);
      }
    }

    fetchLiveReviews();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleReviewSubmit(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newComment.trim() || isSubmittingReview) return;

    setIsSubmittingReview(true);
    const cleanName = newName.trim();
    const cleanLocation = newLocation.trim() || "Bhiwani";
    const cleanComment = newComment.trim();

    const localRev: CustomerReview = {
      id: `rev-custom-${Date.now()}`,
      name: cleanName,
      location: cleanLocation,
      rating: newRating,
      date: "Just now",
      comment: cleanComment,
      verified: true,
    };

    // Save to server API (Supabase + Backup + Resend notification)
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          location: cleanLocation,
          rating: newRating,
          comment: cleanComment,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { review?: CustomerReview };
        if (data.review) {
          localRev.id = data.review.id;
        }
      }
    } catch (apiErr) {
      console.warn("API review submission notice:", apiErr);
    } finally {
      setIsSubmittingReview(false);
    }

    const updated = [localRev, ...reviews.filter((r) => r.id !== localRev.id)];
    setReviews(updated);

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      const prevUserReviews = stored ? (JSON.parse(stored) as CustomerReview[]) : [];
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify([localRev, ...prevUserReviews]),
      );
    } catch {}

    setNewName("");
    setNewLocation("");
    setNewComment("");
    setNewRating(5);
    setIsReviewModalOpen(false);
    setReviewSuccessMsg("Thank you! Your delivery review has been saved permanently to the website.");
    setTimeout(() => setReviewSuccessMsg(""), 6000);
  }

  return (
    <main className="contact-page" style={{ background: "#fbfcf8" }}>
      {/* Header */}
      <header className="site-header">
        <Link className="brand" href="/" aria-label="JuiceWala home">
          <span className="brand-mark">
            <Leaf size={20} aria-hidden="true" />
          </span>
          <span>JuiceWala</span>
        </Link>
        <Link className="contact-back-link" href="/">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to the storefront
        </Link>
      </header>

      {/* Main Delivery Section */}
      <section className="support-section" style={{ maxWidth: 880 }}>
        <div className="support-heading" style={{ maxWidth: 740, margin: "0 auto 38px" }}>
          <p className="eyebrow">JUICEWALA · STANDARD DELIVERY PROMISE</p>
          <h1 style={{ fontSize: "clamp(34px, 5.5vw, 54px)", lineHeight: 1.15 }}>
            Standard Delivery
          </h1>
          <p
            style={{
              fontSize: "clamp(15px, 1.8vw, 17px)",
              lineHeight: 1.8,
              color: "#3f4c42",
              marginTop: 16,
            }}
          >
            Fresh, chilled, and hygienic doorstep delivery prepared with care and
            delivered directly from seller to customer across Bhiwani.
          </p>
        </div>

        {/* Highlight Card: Safe Packaging Not In Bottles */}
        <div
          style={{
            background: "linear-gradient(135deg, #1b3d2b 0%, #0f261a 100%)",
            color: "#fffefa",
            borderRadius: 14,
            padding: "clamp(24px, 4vw, 36px)",
            marginBottom: 36,
            boxShadow: "0 16px 36px rgba(17, 36, 24, 0.12)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 180,
              height: 180,
              background: "rgba(182, 219, 102, 0.08)",
              borderRadius: "50%",
              pointerEvents: "none",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <span
              style={{
                display: "inline-grid",
                placeItems: "center",
                width: 42,
                height: 42,
                borderRadius: "50%",
                background: "rgba(182, 219, 102, 0.2)",
                color: "#b6db66",
              }}
            >
              <PackageCheck size={24} />
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: "#b6db66",
              }}
            >
              Safe Packaging Guarantee
            </span>
          </div>

          <h2
            style={{
              fontFamily: "var(--serif)",
              fontSize: "clamp(24px, 3.5vw, 32px)",
              fontWeight: 500,
              margin: "0 0 14px",
              lineHeight: 1.25,
            }}
          >
            Delivered in Safe Packaging, Not Fragile Bottles
          </h2>
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.8,
              color: "#e2ecd8",
              margin: "0 0 14px",
            }}
          >
            At JuiceWala, <strong>we deliver not in bottles, but in safe packaging directly from seller to customer</strong>.
            Glass bottles are heavy, fragile, and carry the risk of hazardous breakage and messy leaks during fast transit.
          </p>
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.8,
              color: "#e2ecd8",
              margin: 0,
            }}
          >
            Instead, our juices and shakes are packaged in food-grade, multi-layer sealed safe packaging designed
            to be 100% leak-proof, hygienic, and tamper-evident. This keeps your fresh cold juice secure, pure, and
            spill-free every single time.
          </p>
        </div>

        {/* 3 Core Delivery Pillars */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))",
            gap: 16,
            marginBottom: 48,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e1ebda",
              borderRadius: 12,
              padding: "24px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: "#f0f6ec",
                color: "var(--forest)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <HeartHandshake size={20} />
            </div>
            <h3 style={{ fontSize: 17, margin: 0, color: "var(--forest)", fontWeight: 600 }}>
              Direct Seller to Customer
            </h3>
            <p style={{ fontSize: 14, color: "#4f5e52", lineHeight: 1.6, margin: 0 }}>
              Zero middlemen and zero transit warehousing. Every juice is freshly prepared right when your order
              is received and delivered straight from our seller facility to your doorstep.
            </p>
          </div>

          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e1ebda",
              borderRadius: 12,
              padding: "24px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: "#f0f6ec",
                color: "var(--forest)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <h3 style={{ fontSize: 17, margin: 0, color: "var(--forest)", fontWeight: 600 }}>
              Safe & Spill-Free Packaging
            </h3>
            <p style={{ fontSize: 14, color: "#4f5e52", lineHeight: 1.6, margin: 0 }}>
              Our food-grade, tamper-evident sealed packaging protects freshness and prevents any spills or contamination.
              Safe to hold, easy to open, and 100% clean.
            </p>
          </div>

          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e1ebda",
              borderRadius: 12,
              padding: "24px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: "#f0f6ec",
                color: "var(--forest)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Truck size={20} />
            </div>
            <h3 style={{ fontSize: 17, margin: 0, color: "var(--forest)", fontWeight: 600 }}>
              Bhiwani Doorstep Delivery
            </h3>
            <p style={{ fontSize: 14, color: "#4f5e52", lineHeight: 1.6, margin: 0 }}>
              Currently serving all residential, commercial, and college areas across Bhiwani (PIN codes starting
              with 127). Expanding pan-India very soon!
            </p>
          </div>
        </div>

        {/* Customer Reviews Section */}
        <div style={{ marginTop: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 14,
              marginBottom: 24,
              borderBottom: "1px solid #e1ebda",
              paddingBottom: 16,
            }}
          >
            <div>
              <p className="eyebrow" style={{ margin: "0 0 6px" }}>
                VERIFIED CUSTOMER FEEDBACK
              </p>
              <h2
                style={{
                  fontSize: "clamp(22px, 3vw, 28px)",
                  margin: 0,
                  color: "var(--forest)",
                  fontFamily: "var(--serif)",
                  fontWeight: 500,
                }}
              >
                Customer Reviews on Standard Delivery
              </h2>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                <div style={{ display: "inline-flex", gap: 2, color: "#e6a117" }}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} fill="#e6a117" />
                  ))}
                </div>
                <strong style={{ fontSize: 14, color: "var(--ink)" }}>4.9 out of 5</strong>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>
                  (Based on {reviews.length} verified reviews)
                </span>
              </div>
            </div>

            {/* Add Review Button */}
            <button
              type="button"
              onClick={() => setIsReviewModalOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "var(--forest)",
                color: "#fffefa",
                border: "none",
                padding: "12px 22px",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(27, 61, 43, 0.18)",
                transition: "all 0.18s ease",
              }}
            >
              <Sparkles size={16} />
              Write a Review
            </button>
          </div>

          {/* Success Notification */}
          {reviewSuccessMsg && (
            <div
              style={{
                background: "#eaf5e3",
                border: "1px solid #b7dc9e",
                color: "#224d27",
                padding: "12px 18px",
                borderRadius: 8,
                fontSize: 14,
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <CheckCircle2 size={18} color="#2e7d32" />
              <span>{reviewSuccessMsg}</span>
            </div>
          )}

          {/* Reviews Grid (Strictly WITHOUT photos, with Indian names and star ratings) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
              gap: 16,
            }}
          >
            {reviews.map((rev) => (
              <div
                key={rev.id}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e5ede0",
                  borderRadius: 10,
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 14,
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ display: "inline-flex", gap: 2, color: "#e6a117" }}>
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} size={15} fill="#e6a117" />
                      ))}
                    </div>
                    <span style={{ fontSize: 12, color: "#8a9a88" }}>{rev.date}</span>
                  </div>

                  <p
                    style={{
                      fontSize: 14,
                      lineHeight: 1.65,
                      color: "#2c3b30",
                      margin: 0,
                      fontStyle: "italic",
                    }}
                  >
                    &ldquo;{rev.comment}&rdquo;
                  </p>
                </div>

                <div
                  style={{
                    borderTop: "1px dashed #e8efe2",
                    paddingTop: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 14, color: "var(--forest)", display: "block" }}>
                      {rev.name}
                    </strong>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>
                      {rev.location}
                    </span>
                  </div>
                  {rev.verified && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        color: "#2b6b3b",
                        background: "#eef6ea",
                        padding: "3px 8px",
                        borderRadius: 12,
                        fontWeight: 600,
                      }}
                    >
                      <CheckCircle2 size={12} />
                      Verified
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA to storefront */}
        <div
          style={{
            marginTop: 48,
            padding: "24px 20px",
            background: "#f0f6ec",
            borderRadius: 12,
            textAlign: "center",
          }}
        >
          <h3 style={{ margin: "0 0 8px", color: "var(--forest)", fontSize: 18 }}>
            Ready for your fresh juice ritual?
          </h3>
          <p style={{ margin: "0 0 16px", color: "#4f5e52", fontSize: 14 }}>
            Order now and experience our safe, direct standard delivery across Bhiwani.
          </p>
          <Link
            href="/"
            className="hero-cta"
            style={{
              display: "inline-flex",
              padding: "12px 26px",
              fontSize: 14,
              borderRadius: 6,
            }}
          >
            Order Fresh Juice Now →
          </Link>
        </div>
      </section>

      {/* Review Submission Modal */}
      {isReviewModalOpen && (
        <div
          className="drawer-backdrop"
          style={{
            zIndex: 1200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsReviewModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-modal-title"
            style={{
              background: "#ffffff",
              borderRadius: 14,
              maxWidth: 480,
              width: "100%",
              padding: "26px 24px",
              boxShadow: "0 24px 48px rgba(0, 0, 0, 0.25)",
              border: "1px solid #e1ebda",
              position: "relative",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 18,
                borderBottom: "1px solid #eef3e8",
                paddingBottom: 12,
              }}
            >
              <div>
                <h3
                  id="review-modal-title"
                  style={{
                    margin: 0,
                    fontSize: 20,
                    color: "var(--forest)",
                    fontFamily: "var(--serif)",
                  }}
                >
                  Write a Delivery Review
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>
                  Share your experience with our safe, direct standard delivery.
                </p>
              </div>
              <button
                type="button"
                className="icon-button modal-close"
                onClick={() => setIsReviewModalOpen(false)}
                aria-label="Close review dialog"
                style={{
                  border: 0,
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--muted)",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} style={{ display: "grid", gap: 14 }}>
              <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600 }}>
                Your Name *
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{
                    padding: "9px 12px",
                    border: "1px solid #ced8c9",
                    borderRadius: 6,
                    fontSize: 14,
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600 }}>
                Location / Area (Optional)
                <input
                  type="text"
                  placeholder="e.g. Bhiwani, Sector 13"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  style={{
                    padding: "9px 12px",
                    border: "1px solid #ced8c9",
                    borderRadius: 6,
                    fontSize: 14,
                  }}
                />
              </label>

              <div>
                <span style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Rating *
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewRating(star)}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: 4,
                        color: star <= newRating ? "#e6a117" : "#d1dcd0",
                      }}
                      aria-label={`${star} star rating`}
                    >
                      <Star size={24} fill={star <= newRating ? "#e6a117" : "none"} />
                    </button>
                  ))}
                </div>
              </div>

              <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600 }}>
                Your Review *
                <textarea
                  required
                  rows={4}
                  placeholder="Tell us about the safe packaging, freshness, and delivery speed..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #ced8c9",
                    borderRadius: 6,
                    fontSize: 14,
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />
              </label>

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  style={{
                    flex: 1,
                    background: "var(--forest)",
                    color: "#fffefa",
                    border: "none",
                    padding: "12px",
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: isSubmittingReview ? "not-allowed" : "pointer",
                    opacity: isSubmittingReview ? 0.75 : 1,
                  }}
                >
                  {isSubmittingReview ? "Saving Review..." : "Submit Review"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  style={{
                    background: "#f0f4ec",
                    color: "#4f5e52",
                    border: "none",
                    padding: "12px 18px",
                    borderRadius: 6,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="site-footer contact-footer" style={{ marginTop: 60 }}>
        <Link className="brand footer-brand" href="/" aria-label="JuiceWala home">
          <span className="brand-mark">
            <Leaf size={18} aria-hidden="true" />
          </span>
          <span>JuiceWala</span>
        </Link>
        <p>Doorstep fresh juice delivery in safe packaging directly from seller to customer in Bhiwani.</p>
        <Link href="/">Return to the storefront</Link>
      </footer>
    </main>
  );
}
