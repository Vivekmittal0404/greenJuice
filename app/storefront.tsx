"use client";

import {
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import {
  ArrowDown,
  Check,
  ChevronRight,
  Clock3,
  ClipboardList,
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
  amount: number;
  notificationWarning?: string;
} & (
  | { paymentMethod: "upi"; paymentLink: string; upiId: string }
  | { paymentMethod: "cod" }
);

type SavedOrder = {
  orderId: string;
  amount: number;
  paymentMethod: "upi" | "cod";
  items: Array<{ id: string; quantity: number }>;
  createdAt: string;
};

const CART_STORAGE_KEY = "root-ritual-cart-v1";
const ORDERS_STORAGE_KEY = "root-ritual-orders-v1";
const STORAGE_UNAVAILABLE = "__root_ritual_storage_unavailable__";

function subscribeToStorage(key: string, callback: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) callback();
  };
  const changeEvent = `${key}-changed`;
  window.addEventListener("storage", handleStorage);
  window.addEventListener(changeEvent, callback);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(changeEvent, callback);
  };
}

function getStorageSnapshot(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return STORAGE_UNAVAILABLE;
  }
}

function writeStorageValue(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    window.dispatchEvent(new Event(`${key}-changed`));
    return true;
  } catch {
    return false;
  }
}

const subscribeToCart = (callback: () => void) =>
  subscribeToStorage(CART_STORAGE_KEY, callback);
const subscribeToOrders = (callback: () => void) =>
  subscribeToStorage(ORDERS_STORAGE_KEY, callback);
const getCartSnapshot = () => getStorageSnapshot(CART_STORAGE_KEY);
const getOrdersSnapshot = () => getStorageSnapshot(ORDERS_STORAGE_KEY);
const getServerSnapshot = () => null;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readSavedCart(snapshot: string | null): {
  value: Record<string, number>;
  warning: string;
} {
  if (snapshot === null) return { value: {}, warning: "" };
  if (snapshot === STORAGE_UNAVAILABLE) {
    return {
      value: {},
      warning: "Browser storage is unavailable; your bag cannot be saved.",
    };
  }

  try {
    const parsed: unknown = JSON.parse(snapshot);
    if (!isRecord(parsed)) throw new Error("Invalid saved bag.");

    const restored: Record<string, number> = {};
    for (const [id, quantity] of Object.entries(parsed)) {
      if (
        !products.some((product) => product.id === id) ||
        typeof quantity !== "number" ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 12
      ) {
        throw new Error("Invalid saved bag.");
      }
      restored[id] = quantity;
    }
    return { value: restored, warning: "" };
  } catch {
    return {
      value: {},
      warning: "Your saved bag could not be restored from this browser.",
    };
  }
}

function isSavedOrder(value: unknown): value is SavedOrder {
  return (
    isRecord(value) &&
    typeof value.orderId === "string" &&
    typeof value.amount === "number" &&
    Number.isInteger(value.amount) &&
    value.amount > 0 &&
    (value.paymentMethod === "upi" || value.paymentMethod === "cod") &&
    typeof value.createdAt === "string" &&
    Number.isFinite(Date.parse(value.createdAt)) &&
    Array.isArray(value.items) &&
    value.items.length > 0 &&
    value.items.length <= 8 &&
    value.items.every(
      (item: unknown) =>
        isRecord(item) &&
        typeof item.id === "string" &&
        products.some((product) => product.id === item.id) &&
        typeof item.quantity === "number" &&
        Number.isInteger(item.quantity) &&
        item.quantity >= 1 &&
        item.quantity <= 12,
    )
  );
}

function readSavedOrders(snapshot: string | null): {
  value: SavedOrder[];
  warning: string;
} {
  if (snapshot === null) return { value: [], warning: "" };
  if (snapshot === STORAGE_UNAVAILABLE) {
    return {
      value: [],
      warning: "Browser storage is unavailable; order history cannot be saved.",
    };
  }

  try {
    const parsed: unknown = JSON.parse(snapshot);
    if (!Array.isArray(parsed) || !parsed.every(isSavedOrder)) {
      throw new Error("Invalid saved order history.");
    }
    return { value: parsed.slice(0, 50), warning: "" };
  } catch {
    return {
      value: [],
      warning: "Saved order history could not be restored from this browser.",
    };
  }
}

export default function Storefront() {
  const cartSnapshot = useSyncExternalStore(
    subscribeToCart,
    getCartSnapshot,
    getServerSnapshot,
  );
  const ordersSnapshot = useSyncExternalStore(
    subscribeToOrders,
    getOrdersSnapshot,
    getServerSnapshot,
  );
  const savedCart = readSavedCart(cartSnapshot);
  const savedOrders = readSavedOrders(ordersSnapshot);
  const cart = savedCart.value;
  const orders = savedOrders.value;
  const [storageWarning, setStorageWarning] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<CreatedOrder | null>(null);
  const [copied, setCopied] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "cod">("upi");

  const storageMessage =
    [savedCart.warning, savedOrders.warning, storageWarning]
      .filter(Boolean)
      .join(" ") || "";
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
    const quantity = (cart[productId] ?? 0) + change;
    const next = { ...cart };
    if (quantity <= 0) delete next[productId];
    else next[productId] = quantity;
    if (!writeStorageValue(CART_STORAGE_KEY, JSON.stringify(next))) {
      setStorageWarning("This browser could not save your bag.");
    } else {
      setStorageWarning("");
    }
    setOrder(null);
    setError("");
  }

  function openCart() {
    setIsOrdersOpen(false);
    setOrder(null);
    setError("");
    setIsCartOpen(true);
  }

  function openOrders() {
    setIsCartOpen(false);
    setIsOrdersOpen(true);
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const orderedItems = cartItems.map(({ id, quantity }) => ({
      id,
      quantity,
    }));

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
          items: orderedItems,
          paymentMethod: formData.get("paymentMethod"),
        }),
      });
      const result = (await response.json()) as
        | CreatedOrder
        | { error: string };
      if (
        !response.ok ||
        !("paymentMethod" in result) ||
        (result.paymentMethod === "upi" &&
          (!("paymentLink" in result) || !("upiId" in result)))
      ) {
        throw new Error(
          "error" in result ? result.error : "Could not create order.",
        );
      }
      setOrder(result);
      const savedOrder: SavedOrder = {
        orderId: result.orderId,
        amount: result.amount,
        paymentMethod: result.paymentMethod,
        items: orderedItems,
        createdAt: new Date().toISOString(),
      };
      const nextOrders = [
        savedOrder,
        ...orders.filter((saved) => saved.orderId !== result.orderId),
      ].slice(0, 50);
      const historySaved = writeStorageValue(
        ORDERS_STORAGE_KEY,
        JSON.stringify(nextOrders),
      );
      const cartCleared = writeStorageValue(CART_STORAGE_KEY, "{}");
      if (!historySaved || !cartCleared) {
        setStorageWarning(
          "Order was placed, but this browser could not save your order history or clear the bag.",
        );
      } else {
        setStorageWarning("");
      }
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
    if (!order || order.paymentMethod !== "upi") return;
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
        <div className="header-actions">
          <button className="orders-button" onClick={openOrders}>
            <ClipboardList size={18} aria-hidden="true" />
            <span>My orders</span>
            {orders.length > 0 && (
              <span className="orders-count">{orders.length}</span>
            )}
          </button>
          <button
            className="bag-button"
            onClick={openCart}
            aria-label={`Open bag, ${itemCount} items`}
          >
            <ShoppingBag size={19} aria-hidden="true" />
            <span>Bag</span>
            <span className="bag-count">{itemCount}</span>
          </button>
        </div>
      </header>

      {storageMessage && (
        <p className="storage-warning" role="status">
          {storageMessage}
        </p>
      )}

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
                {order.paymentMethod === "upi" ? (
                  <>
                    <h3>Order received!</h3>
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
                    <a
                      className="pay-button"
                      href={order.paymentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Pay with UPI <ChevronRight size={17} aria-hidden="true" />
                    </a>
                    <div className="upi-id-row">
                      <span>{order.upiId}</span>
                      <button onClick={copyUpiId} aria-label="Copy UPI ID">
                        {copied ? <Check size={16} /> : <span>Copy</span>}
                      </button>
                    </div>
                    <p className="payment-disclaimer">
                      If the UPI app does not open, scan the QR or copy the UPI
                      ID. Your order is saved; payment remains pending until
                      the store verifies it.
                    </p>
                  </>
                ) : (
                  <>
                    <h3>Order confirmed!</h3>
                    <p className="payment-lead">
                      Your order total is {formatPrice(order.amount)}. Pay cash
                      when it is delivered.
                    </p>
                    <p className="payment-disclaimer">
                      Payment is due on delivery. Delivery attempts are between
                      6 AM and 8 AM.
                    </p>
                  </>
                )}
                {order.notificationWarning && (
                  <p className="payment-disclaimer" role="status">
                    {order.notificationWarning}
                  </p>
                )}
                <button
                  className="done-button"
                  onClick={() => {
                    setIsCartOpen(false);
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
                  <fieldset className="payment-options">
                    <legend>Payment method</legend>
                    <label className="payment-option">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="upi"
                        checked={paymentMethod === "upi"}
                        onChange={() => setPaymentMethod("upi")}
                      />
                      <span>Pay with UPI</span>
                    </label>
                    <label className="payment-option">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cod"
                        checked={paymentMethod === "cod"}
                        onChange={() => setPaymentMethod("cod")}
                      />
                      <span>Cash on delivery</span>
                    </label>
                  </fieldset>
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
                        {paymentMethod === "upi"
                          ? "Continue to UPI"
                          : "Place COD order"}{" "}
                        <ChevronRight size={17} aria-hidden="true" />
                      </>
                    )}
                  </button>
                  <p className="secure-note">
                    {paymentMethod === "upi"
                      ? "UPI payment opens after your order is created."
                      : "Pay cash when your order is delivered."}
                  </p>
                </form>
              </>
            )}
          </aside>
        </div>
      )}
      {isOrdersOpen && (
        <div
          className="drawer-backdrop"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setIsOrdersOpen(false)
          }
        >
          <aside
            className="cart-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="orders-title"
          >
            <div className="drawer-header">
              <div>
                <p className="eyebrow">YOUR PAST ORDERS</p>
                <h2 id="orders-title">My orders</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setIsOrdersOpen(false)}
                aria-label="Close order history"
              >
                <X size={21} />
              </button>
            </div>
            <p className="orders-storage-note">
              Order history is saved on this browser and device only.
            </p>
            {orders.length === 0 ? (
              <div className="empty-bag">
                <span className="empty-bag-icon">
                  <ClipboardList size={25} />
                </span>
                <h3>No orders yet.</h3>
                <p>Your completed orders will appear here.</p>
              </div>
            ) : (
              <div className="orders-list">
                {orders.map((savedOrder) => (
                  <article className="saved-order" key={savedOrder.orderId}>
                    <div className="saved-order-heading">
                      <strong>
                        Order {savedOrder.orderId.slice(0, 8).toUpperCase()}
                      </strong>
                      <time dateTime={savedOrder.createdAt}>
                        {new Intl.DateTimeFormat("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(savedOrder.createdAt))}
                      </time>
                    </div>
                    <p className="saved-order-status">
                      {savedOrder.paymentMethod === "upi"
                        ? "UPI · Payment pending verification"
                        : "Cash on delivery · Confirmed"}
                    </p>
                    <ul>
                      {savedOrder.items.map((item) => {
                        const product = products.find(
                          ({ id }) => id === item.id,
                        );
                        return (
                          <li key={item.id}>
                            {product?.name ?? "Juice"} × {item.quantity}
                          </li>
                        );
                      })}
                    </ul>
                    <div className="saved-order-total">
                      <span>Total</span>
                      <strong>{formatPrice(savedOrder.amount)}</strong>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
