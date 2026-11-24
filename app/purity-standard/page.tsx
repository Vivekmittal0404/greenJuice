import type { Metadata } from "next";
import {
  ArrowLeft,
  Droplets,
  Flame,
  Leaf,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Our Purity Standard | JuiceWala (juicewala)",
  description:
    "Learn about JuiceWala's (juicewala / juice wala / जूसवाला) 100% pure fresh fruit promise. Zero added water, zero refined sugar, no preservatives, and never heat-treated.",
  keywords: [
    "juicewala purity",
    "juice wala standards",
    "juicewala raw juice",
    "pure juice delivery bhiwani",
  ],
};

export default function PurityStandardPage() {
  return (
    <main className="contact-page">
      {/* Site Header */}
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

      {/* Main Purity Content */}
      <section className="support-section" style={{ maxWidth: 860 }}>
        <div className="support-heading" style={{ maxWidth: 700, margin: "0 auto 42px" }}>
          <p className="eyebrow">JUICEWALA · PURITY GUARANTEE</p>
          <h1 style={{ fontSize: "clamp(34px, 5.5vw, 52px)", lineHeight: 1.15 }}>
            100% Pure Fresh Fruits.
            <br />
            Nothing Else.
          </h1>
          <p
            style={{
              fontSize: "clamp(14px, 1.8vw, 16px)",
              lineHeight: 1.8,
              color: "#3f4c42",
              marginTop: 18,
            }}
          >
            At JuiceWala, our promise is simple: we provide <strong>100% pure, unadulterated fresh fruits</strong> in
            every single bottle. We hand-pick only the finest, ripe seasonal fruits and crisp vegetables every morning
            directly from trusted local farms and growers. We never add a single drop of water, never use refined
            sugars or artificial syrups, and never introduce chemical preservatives or synthetic colors. Our juices are
            cold-extracted without boiling or heat pasteurization, keeping living enzymes, active antioxidants, and
            vital vitamins completely intact. What you drink is pure, honest nature—fresh, vibrant, and wholesome.
          </p>
        </div>

        {/* Highlight Callout Box */}
        <div
          style={{
            background: "#e8eddf",
            border: "1px solid #c9d6be",
            borderRadius: 8,
            padding: "24px 28px",
            marginBottom: 44,
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "var(--forest)",
              color: "var(--white)",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={24} />
          </div>
          <div>
            <strong style={{ display: "block", color: "var(--forest)", fontSize: 16, marginBottom: 4 }}>
              The JuiceWala Purity Oath
            </strong>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "#455448" }}>
              If it did not grow naturally on a tree, plant, or vine, it does not go into our juice. 100% Raw produce.
              Zero water. Zero preservatives. Zero compromises.
            </p>
          </div>
        </div>

        {/* 6 Core Pillars Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: 16,
            marginBottom: 52,
          }}
        >
          {/* Pillar 1 */}
          <div
            style={{
              background: "var(--white)",
              border: "1px solid var(--line)",
              borderRadius: 6,
              padding: 22,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--lime)",
                color: "var(--forest)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Leaf size={18} />
            </div>
            <strong style={{ fontSize: 15, color: "var(--forest)" }}>Grade-A Farm Fresh Fruits</strong>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.65, color: "var(--muted)" }}>
              We hand-select premium, naturally ripened fruits and vegetables daily. Overripe, bruised, or stored produce
              is strictly rejected to ensure every bottle has authentic flavor and maximum nutrient density.
            </p>
          </div>

          {/* Pillar 2 */}
          <div
            style={{
              background: "var(--white)",
              border: "1px solid var(--line)",
              borderRadius: 6,
              padding: 22,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--lime)",
                color: "var(--forest)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Droplets size={18} />
            </div>
            <strong style={{ fontSize: 15, color: "var(--forest)" }}>0% Added Water (Zero Dilution)</strong>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.65, color: "var(--muted)" }}>
              Most commercial packaged juices are diluted with water or reconstituted from concentrated syrup. At
              JuiceWala, every drop is 100% pure juice pressed directly from real fruits and vegetables.
            </p>
          </div>

          {/* Pillar 3 */}
          <div
            style={{
              background: "var(--white)",
              border: "1px solid var(--line)",
              borderRadius: 6,
              padding: 22,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--lime)",
                color: "var(--forest)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Sparkles size={18} />
            </div>
            <strong style={{ fontSize: 15, color: "var(--forest)" }}>No Added Sugar or Sweeteners</strong>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.65, color: "var(--muted)" }}>
              The rich sweetness you taste comes 100% from nature. We never add refined white sugar, high-fructose corn
              syrup, or artificial sweeteners. Pure wholesome sweetness you can feel good about.
            </p>
          </div>

          {/* Pillar 4 */}
          <div
            style={{
              background: "var(--white)",
              border: "1px solid var(--line)",
              borderRadius: 6,
              padding: 22,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--lime)",
                color: "var(--forest)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <ShieldCheck size={18} />
            </div>
            <strong style={{ fontSize: 15, color: "var(--forest)" }}>Zero Preservatives & Chemicals</strong>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.65, color: "var(--muted)" }}>
              We never use sodium benzoate, potassium sorbate, artificial food coloring, or synthetic stabilizers. No
              hidden chemicals or artificial shelf-life extenders—just fresh, honest produce.
            </p>
          </div>

          {/* Pillar 5 */}
          <div
            style={{
              background: "var(--white)",
              border: "1px solid var(--line)",
              borderRadius: 6,
              padding: 22,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--lime)",
                color: "var(--forest)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Flame size={18} />
            </div>
            <strong style={{ fontSize: 15, color: "var(--forest)" }}>Never Heated / Living Nutrients</strong>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.65, color: "var(--muted)" }}>
              Traditional juices are boiled or heat-pasteurized to sit on supermarket shelves for months, killing live
              enzymes and vitamins. We extract cold so every vitamin, polyphenol, and antioxidant stays alive.
            </p>
          </div>

          {/* Pillar 6 */}
          <div
            style={{
              background: "var(--white)",
              border: "1px solid var(--line)",
              borderRadius: 6,
              padding: 22,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--lime)",
                color: "var(--forest)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Truck size={18} />
            </div>
            <strong style={{ fontSize: 15, color: "var(--forest)" }}>Chilled Doorstep Delivery</strong>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.65, color: "var(--muted)" }}>
              Because our raw juices contain no preservatives, they are freshly packed in food-grade bottles and kept
              cold under 4°C, delivered fresh to your doorstep in Bhiwani so you enjoy peak freshness every time.
            </p>
          </div>
        </div>

        {/* Comparison Table: JuiceWala vs Packaged Juices */}
        <div style={{ marginBottom: 48 }}>
          <h2
            style={{
              fontFamily: "var(--serif)",
              fontSize: 26,
              color: "var(--forest)",
              textAlign: "center",
              marginBottom: 20,
            }}
          >
            The JuiceWala Difference
          </h2>

          <div
            style={{
              background: "var(--white)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              maxWidth: "100%",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--forest)", color: "var(--white)" }}>
                  <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: 600 }}>Standard</th>
                  <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: 600 }}>JuiceWala Juices</th>
                  <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: 600, color: "#cbd5cc" }}>
                    Store-Bought Packaged Juices
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "14px 16px", fontWeight: 600 }}>Ingredients</td>
                  <td style={{ padding: "14px 16px", color: "#235c2e", fontWeight: 600 }}>
                    100% Whole Fresh Fruits
                  </td>
                  <td style={{ padding: "14px 16px", color: "var(--muted)" }}>Frozen concentrate & pulp paste</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--line)", background: "#fafbf7" }}>
                  <td style={{ padding: "14px 16px", fontWeight: 600 }}>Added Water</td>
                  <td style={{ padding: "14px 16px", color: "#235c2e", fontWeight: 600 }}>Zero (0%)</td>
                  <td style={{ padding: "14px 16px", color: "var(--muted)" }}>40% to 80% water filler</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "14px 16px", fontWeight: 600 }}>Added Sugar</td>
                  <td style={{ padding: "14px 16px", color: "#235c2e", fontWeight: 600 }}>
                    Zero (Naturally sweet)
                  </td>
                  <td style={{ padding: "14px 16px", color: "var(--muted)" }}>Refined sugar & corn syrup</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--line)", background: "#fafbf7" }}>
                  <td style={{ padding: "14px 16px", fontWeight: 600 }}>Preservatives</td>
                  <td style={{ padding: "14px 16px", color: "#235c2e", fontWeight: 600 }}>Zero Preservatives</td>
                  <td style={{ padding: "14px 16px", color: "var(--muted)" }}>Benzoates, sorbates & additives</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "14px 16px", fontWeight: 600 }}>Processing</td>
                  <td style={{ padding: "14px 16px", color: "#235c2e", fontWeight: 600 }}>
                    Cold extraction (Live enzymes)
                  </td>
                  <td style={{ padding: "14px 16px", color: "var(--muted)" }}>Boiled & heat-pasteurized</td>
                </tr>
                <tr style={{ background: "#fafbf7" }}>
                  <td style={{ padding: "14px 16px", fontWeight: 600 }}>Freshness</td>
                  <td style={{ padding: "14px 16px", color: "#235c2e", fontWeight: 600 }}>Fresh daily batch</td>
                  <td style={{ padding: "14px 16px", color: "var(--muted)" }}>Sits on shelf for 6–12 months</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA section */}
        <div
          style={{
            textAlign: "center",
            padding: "36px 20px",
            background: "#e8eddf",
            borderRadius: 8,
            border: "1px solid #c9d6be",
          }}
        >
          <h3
            style={{
              fontFamily: "var(--serif)",
              fontSize: 24,
              color: "var(--forest)",
              margin: "0 0 10px",
            }}
          >
            Taste the Pure Difference Today
          </h3>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: "#455448" }}>
            Experience 100% raw, cold-pressed juices delivered chilled directly to your home.
          </p>
          <Link
            href="/#juices"
            className="hero-cta"
            style={{ display: "inline-flex", textDecoration: "none" }}
          >
            See All Juices →
          </Link>
        </div>
      </section>

      {/* Site Footer */}
      <footer className="site-footer contact-footer">
        <Link className="brand footer-brand" href="/" aria-label="JuiceWala home">
          <span className="brand-mark">
            <Leaf size={18} aria-hidden="true" />
          </span>
          <span>JuiceWala</span>
        </Link>
        <p>Doorstep fresh juice delivery in Bhiwani (expanding across India soon).</p>
        <Link href="/">Return to the storefront</Link>
      </footer>
    </main>
  );
}
