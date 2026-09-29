"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowDown,
  Check,
  ChevronRight,
  Clock3,
  Leaf,
  Minus,
  Plus,
  ShoppingBag,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

type Product = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  ingredients: string[];
  price: number;
  image: string;
  color: string;
  hoverNote: string;
  tag?: string;
};

type CreatedOrder = {
  orderId: string;
  paymentLink: string;
  upiId: string;
  amount: number;
  notificationWarning?: string;
};

const products: Product[] = [
  {
    id: "green-juice",
    name: "Green Juice",
    subtitle: "Herbal blend",
    description: "A fresh green blend made with selected herbs.",
    ingredients: ["Herbal blend"],
    price: 60,
    image:
      "https://images.unsplash.com/photo-1788512582920-4ad3a4a5ce1f?auto=format&fit=crop&w=900&q=85",
    color: "#98ae58",
    hoverNote:
      "No water added. Fresh green juice with herbs.",
  },
  {
    id: "sweet-lime",
    name: "Sweet Lime Juice",
    subtitle: "Fresh sweet lime",
    description: "Bright citrus, freshly pressed.",
    ingredients: ["Sweet lime"],
    price: 100,
    image:
      "https://images.unsplash.com/photo-1607690506833-498e04ab3ffa?auto=format&fit=crop&w=900&q=85",
    color: "#e6b333",
    hoverNote:
      "No water added. Fresh sweet lime, prepared for a clean, pure citrus taste.",
  },
];

const formatPrice = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

export default function Storefront() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<CreatedOrder | null>(null);
  const [copied, setCopied] = useState(false);

  const cartItems = products
    .filter((product) => cart[product.id])
    .map((product) => ({ ...product, quantity: cart[product.id] }));
  const itemCount = cartItems.reduce((count, item) => count + item.quantity, 0);
  const subtotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );
  const deliveryFee = subtotal === 0 ? 0 : 40;
  const total = subtotal + deliveryFee;

  function changeQuantity(productId: string, change: number) {
    setCart((current) => {
      const quantity = (current[productId] ?? 0) + change;
      const next = { ...current };
      if (quantity <= 0) delete next[productId];
      else next[productId] = quantity;
      return next;
    });
    setOrder(null);
    setError("");
  }

  function openCart() {
    setOrder(null);
    setError("");
    setIsCartOpen(true);
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: formData.get("name"),
            phone: formData.get("phone"),
            address: formData.get("address"),
          },
          items: cartItems.map(({ id, quantity }) => ({ id, quantity })),
        }),
      });
      const result = (await response.json()) as
        | CreatedOrder
        | { error: string };
      if (!response.ok || !("paymentLink" in result)) {
        throw new Error(
          "error" in result ? result.error : "Could not create order.",
        );
      }
      setOrder(result);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not create order. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyUpiId() {
    if (!order) return;
    try {
      await navigator.clipboard.writeText(order.upiId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Copy is unavailable in this browser. Use the UPI QR instead.");
    }
  }

  return (
    <main>
      <div className="delivery-ribbon">
        <Clock3 aria-hidden="true" size={17} />
        <span>
          <strong>DELIVERY WINDOW: 6 AM - 8 AM</strong>
          <span className="ribbon-note">You can place an order any time</span>
        </span>
      </div>
      <div className="service-area-ribbon">
        <span>NOW SERVING BHIWANI ONLY</span>
        <span>More areas coming soon</span>
      </div>

      <header className="site-header">
        <a className="brand" href="#home" aria-label="Root & Ritual home">
          <span className="brand-mark">
            <Leaf size={20} aria-hidden="true" />
          </span>
          <span>
            root <i>&</i> ritual<span className="brand-dot">.</span>
          </span>
        </a>
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#juices">The juices</a>
          <a href="#ingredients">Our ingredients</a>
          <a href="#delivery">Delivery</a>
        </nav>
        <button
          className="bag-button"
          onClick={openCart}
          aria-label={`Open bag, ${itemCount} items`}
        >
          <ShoppingBag size={19} aria-hidden="true" />
          <span>Bag</span>
          <span className="bag-count">{itemCount}</span>
        </button>
      </header>

      <section className="hero" id="home">
        <div
          className="hero-photo"
          role="img"
          aria-label="Freshly prepared juice with citrus and herbs"
        />
        <div className="hero-wash" />
        <div className="hero-content">
          <p className="eyebrow hero-eyebrow">
            <span /> FRESH-PRESSED IN BHIWANI
          </p>
          <h1>
            A little good
            <br />
            for your every day.
          </h1>
          <p className="hero-copy">
            Fresh herbal and sweet lime juice, prepared with care and available
            for delivery in Bhiwani.
          </p>
          <a className="hero-cta" href="#juices">
            Find your blend <ChevronRight size={17} aria-hidden="true" />
          </a>
          <div className="hero-footnote">
            <span>01 / 02</span>
            <span className="hero-rule" />
            <span>Made fresh each morning</span>
          </div>
        </div>
        <div className="hero-stamp">
          <span>
            GOOD
            <br />
            ROOTS
          </span>
          <Leaf size={21} aria-hidden="true" />
        </div>
      </section>

      <section className="delivery-callout" id="delivery">
        <div className="delivery-icon">
          <Clock3 size={23} aria-hidden="true" />
        </div>
        <div>
          <p className="eyebrow">PLAN YOUR MORNING</p>
          <h2>
            Delivery can be attempted from <span>6 AM to 8 AM.</span>
          </h2>
          <p>
            Order whenever it suits you. Delivery attempts are made in the
            morning window. Service is currently limited to Bhiwani; more areas
            are coming soon.
          </p>
        </div>
        <a href="#juices" className="text-link">
          Browse juices <ArrowDown size={16} aria-hidden="true" />
        </a>
      </section>

      <section className="products-section" id="juices">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FRESH JUICES · BHIWANI</p>
            <h2>
              Pick your pour<span className="brand-dot">.</span>
            </h2>
          </div>
          <p className="section-side-note">
            Medium glass. Made fresh.
            <br />
            Nothing you need to pronounce twice.
          </p>
        </div>

        <div className="product-grid">
          {products.map((product, index) => (
            <article className="product-card" key={product.id}>
              <div
                className="product-photo"
                style={{ backgroundImage: `url("${product.image}")` }}
                role="img"
                aria-label={`${product.name} photo. ${product.hoverNote}`}
                title={product.hoverNote}
              >
                <span className="product-number">0{index + 1}</span>
                <span className="juice-hover-note">{product.hoverNote}</span>
                <span
                  className="photo-color"
                  style={{ backgroundColor: product.color }}
                />
              </div>
              <div className="product-details">
                <div className="product-title-row">
                  <div>
                    <p className="product-subtitle">{product.subtitle}</p>
                    <h3>{product.name}</h3>
                  </div>
                  <strong className="product-price">
                    {formatPrice(product.price)}
                  </strong>
                </div>
                <p className="product-description">{product.description}</p>
                <p className="ingredient-line">
                  <Leaf size={13} aria-hidden="true" />{" "}
                  {product.ingredients.join(" · ")}
                </p>
                <div className="product-actions">
                  <span className="bottle-size">Medium glass</span>
                  {cart[product.id] ? (
                    <div
                      className="quantity-control"
                      aria-label={`${product.name} quantity`}
                    >
                      <button
                        onClick={() => changeQuantity(product.id, -1)}
                        aria-label={`Remove one ${product.name}`}
                      >
                        <Minus size={15} />
                      </button>
                      <span>{cart[product.id]}</span>
                      <button
                        onClick={() => changeQuantity(product.id, 1)}
                        aria-label={`Add one ${product.name}`}
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="add-button"
                      onClick={() => changeQuantity(product.id, 1)}
                      aria-label={`Add ${product.name} to bag`}
                    >
                      <Plus size={16} aria-hidden="true" /> Add
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
          <article className="coming-soon-tile">
            <span className="coming-soon-mark">
              <Leaf size={21} aria-hidden="true" />
            </span>
            <p className="eyebrow">MORE TO POUR</p>
            <h3>
              Other juices
              <br />
              coming soon.
            </h3>
            <p>We&apos;re working on the next fresh blends.</p>
          </article>
        </div>
      </section>
      <section className="ingredients-section" id="ingredients">
        <p className="eyebrow">SIMPLE INGREDIENTS. CLEAR LABELS.</p>
        <h2>Fresh juice, without added water.</h2>
        <p>
          Herbal blend and sweet lime juice are prepared fresh. Juice is not a
          treatment for illness.
        </p>
      </section>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#home">
          <span className="brand-mark">
            <Leaf size={18} aria-hidden="true" />
          </span>
          <span>
            root <i>&</i> ritual<span className="brand-dot">.</span>
          </span>
        </a>
        <p>Serving Bhiwani only. More areas coming soon.</p>
        <a href="#delivery">
          Delivery hours <span>06:00 - 08:00</span>
        </a>
      </footer>

      {isCartOpen && (
        <div
          className="drawer-backdrop"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setIsCartOpen(false)
          }
        >
          <aside
            className="cart-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
          >
            <div className="drawer-header">
              <div>
                <p className="eyebrow">YOUR MORNING, SORTED</p>
                <h2 id="cart-title">
                  Your bag <span>({itemCount})</span>
                </h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setIsCartOpen(false)}
                aria-label="Close bag"
              >
                <X size={21} />
              </button>
            </div>

            {order ? (
              <div className="payment-state">
                <div className="success-mark">
                  <Check size={23} aria-hidden="true" />
                </div>
                <p className="eyebrow">
                  ORDER {order.orderId.slice(0, 8).toUpperCase()}
                </p>
                <h3>One last step.</h3>
                <p className="payment-lead">
                  Pay {formatPrice(order.amount)} using any UPI app.
                </p>
                <div className="qr-frame">
                  <QRCodeSVG
                    value={order.paymentLink}
                    size={176}
                    level="M"
                    includeMargin
                  />
                </div>
                <a className="pay-button" href={order.paymentLink}>
                  Pay with UPI <ChevronRight size={17} aria-hidden="true" />
                </a>
                <div className="upi-id-row">
                  <span>{order.upiId}</span>
                  <button onClick={copyUpiId} aria-label="Copy UPI ID">
                    {copied ? <Check size={16} /> : <span>Copy</span>}
                  </button>
                </div>
                <p className="payment-disclaimer">
                  The order is saved as payment pending. Payment is not
                  confirmed automatically; the store must verify your transfer.
                </p>
                {order.notificationWarning && (
                  <p className="payment-disclaimer" role="status">
                    {order.notificationWarning}
                  </p>
                )}
                <button
                  className="done-button"
                  onClick={() => {
                    setIsCartOpen(false);
                    setCart({});
                    setOrder(null);
                  }}
                >
                  Done
                </button>
              </div>
            ) : itemCount === 0 ? (
              <div className="empty-bag">
                <span className="empty-bag-icon">
                  <ShoppingBag size={25} />
                </span>
                <h3>Your bag is taking it slow.</h3>
                <p>
                  Add a fresh blend and we&apos;ll get your morning order
                  started.
                </p>
                <button
                  className="pay-button"
                  onClick={() => setIsCartOpen(false)}
                >
                  Browse juices <ChevronRight size={17} />
                </button>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cartItems.map((item) => (
                    <div className="cart-item" key={item.id}>
                      <div
                        className="cart-thumb"
                        style={{ backgroundImage: `url("${item.image}")` }}
                      />
                      <div className="cart-item-info">
                        <strong>{item.name}</strong>
                        <span>{formatPrice(item.price)} / medium glass</span>
                        <div className="quantity-control compact">
                          <button
                            onClick={() => changeQuantity(item.id, -1)}
                            aria-label={`Remove one ${item.name}`}
                          >
                            <Minus size={13} />
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            onClick={() => changeQuantity(item.id, 1)}
                            aria-label={`Add one ${item.name}`}
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>
                      <strong className="cart-item-total">
                        {formatPrice(item.price * item.quantity)}
                      </strong>
                    </div>
                  ))}
                </div>
                <div className="cart-totals">
                  <div>
                    <span>Subtotal</span>
                    <strong>{formatPrice(subtotal)}</strong>
                  </div>
                  <div>
                    <span>Morning delivery</span>
                    <strong>{formatPrice(deliveryFee)}</strong>
                  </div>
                  <div className="cart-grand-total">
                    <span>Total</span>
                    <strong>{formatPrice(total)}</strong>
                  </div>
                </div>
                <p className="cart-delivery-note">
                  <Clock3 size={15} aria-hidden="true" /> Order any time.
                  Delivery can be attempted 6 AM - 8 AM.
                </p>
                <form className="checkout-form" onSubmit={submitOrder}>
                  <p className="eyebrow">WHERE SHOULD WE BRING IT?</p>
                  <label>
                    Your name
                    <input
                      autoComplete="name"
                      name="name"
                      required
                      maxLength={80}
                      placeholder="Name"
                    />
                  </label>
                  <label>
                    Mobile number
                    <input
                      autoComplete="tel"
                      inputMode="numeric"
                      name="phone"
                      type="tel"
                      required
                      pattern="[0-9]{10}"
                      maxLength={10}
                      placeholder="10-digit mobile number"
                    />
                  </label>
                  <label>
                    Delivery address
                    <textarea
                      autoComplete="street-address"
                      name="address"
                      required
                      minLength={8}
                      maxLength={300}
                      rows={2}
                      placeholder="House, street, area and PIN code"
                    />
                  </label>
                  {error && (
                    <p className="form-error" role="alert">
                      {error}
                    </p>
                  )}
                  <button
                    className="pay-button checkout-button"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      "Preparing your order..."
                    ) : (
                      <>
                        Continue to UPI{" "}
                        <ChevronRight size={17} aria-hidden="true" />
                      </>
                    )}
                  </button>
                  <p className="secure-note">
                    UPI payment opens after your order is created.
                  </p>
                </form>
              </>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
