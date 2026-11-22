"use client";

import {
  useState,
  useEffect,
  useRef,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "./lib/firebase";
import {
  AlertTriangle,
  ArrowDown,
  Ban,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Droplets,
  Info,
  Leaf,
  LogOut,
  MapPin,
  Minus,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Snowflake,
  Sparkles,
  Trash2,
  Truck,
  User,
  X,
} from "lucide-react";
import Script from "next/script";
import Link from "next/link";

export type JuiceCategory =
  | "all"
  | "green"
  | "citrus"
  | "roots"
  | "hydration"
  | "wellness";

export type Product = {
  id: string;
  name: string;
  subtitle: string;
  category: "green" | "citrus" | "roots" | "hydration" | "wellness";
  categoryLabel: string;
  description: string;
  fullStory: string;
  ingredients: string[];
  benefits: string[];
  tasteProfile: string;
  bestTime: string;
  nutrition: {
    calories: string;
    vitaminC: string;
    sugar: string;
  };
  price: number;
  image: string;
  color: string;
  hoverNote: string;
  tag: string;
  volume: string;
};

type CreatedOrder = {
  orderId: string;
  amount: number;
  notificationWarning?: string;
} & (
  | {
      paymentMethod: "razorpay";
      razorpayKeyId: string;
      razorpayOrderId: string;
      paymentStatus?: "pending" | "paid";
    }
  | { paymentMethod: "cod" }
);

type SavedOrder = {
  orderId: string;
  amount: number;
  subtotal?: number;
  deliveryFee?: number;
  paymentMethod: "razorpay" | "upi" | "cod";
  paymentStatus?: "pending" | "paid" | "cancelled";
  items: Array<{ id: string; quantity: number }>;
  customer?: {
    name: string;
    phone: string;
    address: string;
  };
  createdAt: string;
  updatedAt?: string;
  cancelledAt?: string;
};

type RazorpayPaymentResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; contact: string };
  theme: { color: string };
  config: {
    display: {
      hide: Array<{ method: "upi"; flows: ["collect"] }>;
    };
  };
  handler: (response: RazorpayPaymentResponse) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void };
  }
}

const CART_STORAGE_KEY = "root-ritual-cart-v1";
const ORDERS_STORAGE_KEY = "root-ritual-orders-v1";
const STORAGE_UNAVAILABLE = "__root_ritual_storage_unavailable__";
const FREE_SHIPPING_THRESHOLD = 499;
const STANDARD_SHIPPING_FEE = 40;

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

export const products: Product[] = [
  // {
  //   id: "green-juice",
  //   name: "Herbal Green Vitality",
  //   subtitle: "Ayurvedic Greens & Amla Cleanse",
  //   category: "green",
  //   categoryLabel: "Green & Detox",
  //   description:
  //     "An alkalizing daily elixir of fresh spinach, crisp cucumber, wild amla, tulsi, mint, and cold-pressed ginger. Designed to gently detoxify the liver, balance internal pH, and provide sustained natural energy.",
  //   fullStory:
  //     "Crafted specifically for daily morning revitalization. Cold-pressed at low temperatures without heat pasteurization, protecting delicate chlorophyll, living enzymes, and polyphenols. Pure greens with zero bitter aftertaste and zero added water.",
  //   ingredients: [
  //     "Baby Spinach",
  //     "Crisp Cucumber",
  //     "Wild Amla",
  //     "Fresh Mint",
  //     "Holy Tulsi",
  //     "Coriander Leaf",
  //     "Ginger Root",
  //     "Meyer Lemon",
  //   ],
  //   benefits: ["Liver Detox", "Alkalizing", "Gut Health", "Clear Skin"],
  //   tasteProfile: "Crisp, botanical, refreshing with a citrus-ginger spark",
  //   bestTime: "First thing in the morning on an empty stomach",
  //   nutrition: {
  //     calories: "68 kcal",
  //     vitaminC: "140% RDA",
  //     sugar: "0g Added Sugar",
  //   },
  //   price: 60,
  //   image:
  //     "https://images.unsplash.com/photo-1788512582920-4ad3a4a5ce1f?auto=format&fit=crop&w=900&q=85",
  //   color: "#769c3a",
  //   hoverNote:
  //     "No water added. 100% pure cold-pressed herbs, amla, and greens.",
  //   tag: "Flagship Favorite",
  //   volume: "300 ml",
  // },
  {
    id: "sweet-lime",
    name: "Pure Sweet Lime (ताज़ा मौसंबी जूस)",
    subtitle: "Freshly Made Mosambi Juice",
    category: "citrus",
    categoryLabel: "Citrus & Immunity Juice",
    description:
      "Fresh and naturally sweet mosambi juice, made from hand-picked sweet limes. Light, refreshing and full of natural citrus flavour. A perfect drink to enjoy anytime!",
    fullStory:
      "Hand-peeled and slow-pressed so the bitter white pith oils never enter the juice. Seasoned only with a touch of Himalayan pink mineral salt. The purest, most refreshing sweet lime you have ever tasted.",
    ingredients: [
      "Fresh Mosambi (Sweet Lime)",
      "A Pinch of Rock Salt",
      "Roasted Cumin Powder",
    ],
    benefits: [
      "Instant Hydration",
      "High Vitamin C",
      "Immune Defense",
      "Gentle on Stomach",
    ],
    tasteProfile:
      "Naturally sweet, bright citrus, soothing and thirst-quenching",
    bestTime: "Mid-morning or post-workout hydration",
    nutrition: {
      calories: "92 kcal",
      vitaminC: "120% RDA",
      sugar: "0g Added Sugar",
    },
    price: 100,
    image:
      "https://images.unsplash.com/photo-1607690506833-498e04ab3ffa?auto=format&fit=crop&w=900&q=85",
    color: "#e6b333",
    hoverNote:
      "Zero Water. Freshly prepared with juicy sweet limes for a naturally sweet and refreshing taste.",
    tag: "Crowd Favorite",
    volume: "300 ml",
  },
  // {
  //   id: "celery-detox",
  //   name: "Celery Deep Cleanse",
  //   subtitle: "Organic Celery & Green Apple",
  //   category: "green",
  //   categoryLabel: "Green & Detox",
  //   description:
  //     "Crisp cold-pressed celery stalks balanced with crisp granny smith green apples, cucumber, and fresh lime. Rich in bio-active sodium clusters that flush out toxins, heal the stomach lining, and reduce morning bloating.",
  //   fullStory:
  //     "Renowned worldwide by wellness practitioners, cold-pressed pure celery juice acts as a powerful gut-healer and lymphatic cleanser. Combined with green apple to round out the flavor into a deliciously crisp and drinkable morning ritual.",
  //   ingredients: [
  //     "Crisp Celery Stalks",
  //     "Granny Smith Green Apple",
  //     "Persian Cucumber",
  //     "Key Lime",
  //     "Garden Mint",
  //   ],
  //   benefits: [
  //     "Debloating",
  //     "Gut Lining Support",
  //     "Lymphatic Flush",
  //     "Natural Electrolytes",
  //   ],
  //   tasteProfile: "Crisp, clean, herbaceous with a light green-apple tartness",
  //   bestTime: "Empty stomach 20 minutes before breakfast",
  //   nutrition: {
  //     calories: "55 kcal",
  //     vitaminC: "85% RDA",
  //     sugar: "0g Added Sugar",
  //   },
  //   price: 110,
  //   image:
  //     "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=85",
  //   color: "#5a8c3d",
  //   hoverNote:
  //     "Pure organic celery & green apple. Zero pasteurization, living enzymes.",
  //   tag: "Detox Ritual",
  //   volume: "300 ml Glass Bottle",
  // },
  {
    id: "ruby-roots",
    name: "Beet & Carrot (चुकंदर-गाजर जूस)",
    subtitle: "Freshly Made Carrot Juice with Beetroot",
    category: "roots",
    categoryLabel: "Roots & Energy",
    description:
      "A fresh mix of pure beetroot, sweet carrots, and lemon. Naturally packed with nutrients that improve blood flow, keep your energy steady, and help your muscles bounce back faster after a workout. It helps boost your blood circulation, gives you lasting stamina, and speeds up your body recovery.",
    fullStory:
      "Red beetroot naturally improves blood flow, carrying more oxygen to your brain and active muscles. Blended with sweet carrots, it delivers peak energy with a smooth, refreshing taste.",
    ingredients: ["Red Beetroot", "Sweet Carrot", "Meyer Lemon"],
    benefits: [
      "Endurance Boost",
      "Blood Flow & Nitric Oxide",
      "Stamina",
      "Liver Cleansing",
    ],
    tasteProfile: "Earthy-sweet, deep root richness with rock salt",
    bestTime: "45 minutes pre-workout or during afternoon slumps",
    nutrition: {
      calories: "110 kcal",
      vitaminC: "95% RDA",
      sugar: "0g Added Sugar",
    },
    price: 90,
    image:
      "https://images.unsplash.com/photo-1597748770074-fe9655bb0522?auto=format&fit=crop&w=900&q=85",
    color: "#8c1b33",
    hoverNote: "100% raw roots to boost your blood flow and stamina.",
    tag: "Workout Fuel",
    volume: "300 ml",
  },
  // {
  //   id: "valencia-orange",
  //   name: "Valencia Sunshine Orange",
  //   subtitle: "Sun-Ripened Orange & Turmeric",
  //   category: "citrus",
  //   categoryLabel: "Citrus & Immunity",
  //   description:
  //     "Cold-pressed Valencia oranges infused with a subtle hint of raw Lakadong turmeric and cracked black pepper. A glowing morning tonic that revitalizes skin collagen, uplifts mood, and strengthens seasonal immunity.",
  //   fullStory:
  //     "Unlike store-bought pasteurized orange juice that loses all nutritional integrity, our Valencia oranges are cold-pressed whole arils. Paired with Meghalaya's high-curcumin Lakadong turmeric and piperine for 2000% higher bioavailability.",
  //   ingredients: [
  //     "Valencia Oranges",
  //     "Mandarin Citrus",
  //     "Fresh Lakadong Turmeric",
  //     "Tellicherry Black Pepper",
  //   ],
  //   benefits: [
  //     "Collagen Support",
  //     "Maximum Immunity",
  //     "Anti-Inflammatory",
  //     "Radiant Skin",
  //   ],
  //   tasteProfile:
  //     "Sun-drenched sweet citrus with a delicate warm golden undertone",
  //   bestTime: "Breakfast or mid-day refreshment",
  //   nutrition: {
  //     calories: "115 kcal",
  //     vitaminC: "180% RDA",
  //     sugar: "0g Added Sugar",
  //   },
  //   price: 110,
  //   image:
  //     "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=900&q=85",
  //   color: "#ea7a1e",
  //   hoverNote:
  //     "Raw Valencia oranges with high-potency turmeric. 100% pure citrus.",
  //   tag: "Immunity Shield",
  //   volume: "300 ml Glass Bottle",
  // },
  {
    id: "pomegranate-pure",
    name: "Royal Pomegranate Elixir (अनार का जूस)",
    subtitle: "100% Whole-Aril Antioxidant Power",
    category: "citrus",
    categoryLabel: "Citrus & Immunity",
    description:
      "Extracted from ruby-red hand-harvested pomegranates. Loaded with punicalagins and polyphenol antioxidants that protect heart health, enhance memory retention, and support cellular anti-aging.",
    fullStory:
      "It takes over 1.2 kg of luscious ruby pomegranates to produce each cold-pressed bottle. Punicalagins found in pomegranate arils have 3x the antioxidant activity of red wine or green tea, actively shielding your cells from oxidative stress.",
    ingredients: [
      "100% Kashmiri Pomegranate Arils",
      "Red Delicious Apple",
      "Squeeze of Fresh Lemon",
    ],
    benefits: [
      "Heart Health",
      "Anti-Aging Polyphenols",
      "Memory & Focus",
      "Cellular Protection",
    ],
    tasteProfile: "Deeply tart-sweet, rich, velvety, and intensely aromatic",
    bestTime: "Afternoon vitality booster or with lunch",
    nutrition: {
      calories: "135 kcal",
      vitaminC: "110% RDA",
      sugar: "0g Added Sugar",
    },
    price: 130,
    image: "/images/pomegranate.webp",
    color: "#7d1629",
    hoverNote:
      "Over 1.2 kg of ruby pomegranates per bottle. Rich in punicalagins.",
    tag: "Antioxidant King",
    volume: "300 ml",
  },
  {
    id: "sugarcane-pure",
    name: "Pure Sugarcane (ताज़ा गन्ने का जूस)",
    subtitle: "Freshly Pressed Sugarcane Juice",
    category: "hydration",
    categoryLabel: "Hydration & Energy",
    description:
      "Fresh and naturally sweet sugarcane juice, freshly pressed from tender sugarcane with lemon, mint, and ginger. A refreshing natural energy booster loaded with electrolytes.",
    fullStory:
      "Extracted cold from fresh peeled sugarcane stalks with zero added water and zero refined sugar. Blended with a squeeze of fresh lemon, ginger, and a pinch of black salt for an authentic, cooling refreshment.",
    ingredients: [
      "Fresh Sugarcane",
      "Fresh Ginger",
      "Lemon Juice",
      "Mint Leaves",
      "A Pinch of Rock Salt",
    ],
    benefits: [
      "Instant Energy",
      "Rich in Electrolytes",
      "Liver Cleansing",
      "Kidney Support",
    ],
    tasteProfile:
      "Naturally sweet, crisp, zesty with fresh ginger and lemon notes",
    bestTime: "Afternoons, post-workout, or anytime for natural hydration",
    nutrition: {
      calories: "120 kcal",
      vitaminC: "45% RDA",
      sugar: "0g Added Sugar",
    },
    price: 60,
    image: "/images/sugarcane.webp",
    color: "#a4b954",
    hoverNote:
      "100% natural fresh sugarcane juice with ginger, mint, and lemon. No water added.",
    tag: "Natural Energy",
    volume: "300 ml",
  },
  // {
  //   id: "watermelon-mint",
  //   name: "Crimson Watermelon & Mint",
  //   subtitle: "Ultra-Hydrating Summer Tonic",
  //   category: "hydration",
  //   categoryLabel: "Hydration & Coolers",
  //   description:
  //     "Crisp crimson watermelon cold-pressed with sweet garden mint and tangy lime juice, accented with soaked chia seeds. An intensely hydrating cooler packed with lycopene and essential electrolytes to beat midday fatigue.",
  //   fullStory:
  //     "92% pure fruit water infused with natural electrolytes, potassium, and amino acid L-citrulline which relieves muscle soreness. Paired with aromatic mint leaves for an ultra-cooling restorative sensation.",
  //   ingredients: [
  //     "Crimson Seedless Watermelon",
  //     "Fresh Garden Mint",
  //     "Persian Lime",
  //     "Hydrated Chia Seeds",
  //   ],
  //   benefits: [
  //     "Deep Cellular Hydration",
  //     "Lycopene Rich",
  //     "Cooling & Calming",
  //     "Muscle Recovery",
  //   ],
  //   tasteProfile: "Sweet, crisp, botanical cooling with gentle chia texture",
  //   bestTime: "Post-workout, warm afternoons, or anytime thirst strikes",
  //   nutrition: {
  //     calories: "78 kcal",
  //     vitaminC: "70% RDA",
  //     sugar: "0g Added Sugar",
  //   },
  //   price: 80,
  //   image:
  //     "https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?auto=format&fit=crop&w=900&q=85",
  //   color: "#d94b4b",
  //   hoverNote:
  //     "Pure watermelon, mint and chia. Ultimate natural thirst quencher.",
  //   tag: "Ultimate Hydration",
  //   volume: "300 ml Glass Bottle",
  // },
  // {
  //   id: "golden-glow",
  //   name: "Golden Carrot & Ginger",
  //   subtitle: "Beta-Carotene & Vision Fuel",
  //   category: "roots",
  //   categoryLabel: "Roots & Energy",
  //   description:
  //     "Farm-sweet red and orange carrots cold-pressed with Golden Delicious apples, fiery ginger, and a dash of turmeric. High in bio-active beta-carotene and lutein for vision support, healthy complexion, and vibrant immune balance.",
  //   fullStory:
  //     "Carrots are one of the richest dietary sources of pro-vitamin A carotenoids. By pairing cold-pressed carrot nectar with ginger root and lemon, this golden elixir absorbs rapidly, promoting supple skin and combating digital screen eye fatigue.",
  //   ingredients: [
  //     "Orange & Red Carrots",
  //     "Golden Delicious Apple",
  //     "Fiery Ginger",
  //     "Lemon",
  //     "Raw Turmeric",
  //   ],
  //   benefits: [
  //     "Eye & Vision Health",
  //     "Glowing Complexion",
  //     "Digestive Warmth",
  //     "Cell Renewal",
  //   ],
  //   tasteProfile:
  //     "Smooth earthy sweetness brightened by zesty ginger and apple",
  //   bestTime: "Morning with breakfast or mid-afternoon",
  //   nutrition: {
  //     calories: "98 kcal",
  //     vitaminC: "90% RDA",
  //     sugar: "0g Added Sugar",
  //   },
  //   price: 90,
  //   image:
  //     "https://images.unsplash.com/photo-1622597467836-f3285f2131b8?auto=format&fit=crop&w=900&q=85",
  //   color: "#df8018",
  //   hoverNote: "Packed with beta-carotene, lutein and fiery ginger. 100% raw.",
  //   tag: "Skin & Eyes",
  //   volume: "300 ml Glass Bottle",
  // },
  // {
  //   id: "coconut-aloe",
  //   name: "Tender Coconut & Aloe Vera",
  //   subtitle: "Natural Isotonic Electrolytes",
  //   category: "hydration",
  //   categoryLabel: "Hydration & Coolers",
  //   description:
  //     "Freshly tapped tender coconut water harmonized with soothing hand-scooped aloe vera gel, cucumber ribbons, and fresh mint. Rehydrates faster than water, restores gut micro-flora, and calms internal heat.",
  //   fullStory:
  //     "Nature's premier isotonic hydration fluid with identical electrolyte osmolarity to human blood plasma. Soothes acidic stomachs, coats the intestinal lining, and delivers essential bio-available potassium, magnesium, and calcium.",
  //   ingredients: [
  //     "100% Tender Coconut Water",
  //     "Cold-Extracted Aloe Vera Pulp",
  //     "Cucumber Juice",
  //     "Crushed Mint Leaves",
  //   ],
  //   benefits: [
  //     "Zero Acidity",
  //     "Gut Microbiome Soothing",
  //     "Isotonic Electrolytes",
  //     "Internal Cooling",
  //   ],
  //   tasteProfile:
  //     "Subtly sweet, silky, mild coconut with cooling cucumber and mint",
  //   bestTime: "After physical exertion or to soothe an upset stomach",
  //   nutrition: {
  //     calories: "48 kcal",
  //     vitaminC: "50% RDA",
  //     sugar: "0g Added Sugar",
  //   },
  //   price: 95,
  //   image:
  //     "https://images.unsplash.com/photo-1525385133512-2f3bdd039054?auto=format&fit=crop&w=900&q=85",
  //   color: "#6ea175",
  //   hoverNote:
  //     "Raw tender coconut water & aloe vera. Natural isotonic balance.",
  //   tag: "Gut Soother",
  //   volume: "300 ml Glass Bottle",
  // },
  // {
  //   id: "pineapple-digest",
  //   name: "Pineapple Bromelain Digest",
  //   subtitle: "Tropical Digestive Enzyme Blend",
  //   category: "hydration",
  //   categoryLabel: "Hydration & Coolers",
  //   description:
  //     "Golden sweet tropical pineapples combined with green apples, garden mint, and mineral-rich black salt. Abundant in bromelain, a natural proteolytic enzyme that aids protein digestion and combats tissue inflammation.",
  //   fullStory:
  //     "Cold-pressing pineapples without heat preserves sensitive bromelain enzymes that are destroyed in conventional packaged juices. Excellent for breaking down heavy meals, easing bloating, and speeding up muscle recovery.",
  //   ingredients: [
  //     "Queen Victoria Pineapple",
  //     "Crisp Green Apple",
  //     "Fresh Garden Mint",
  //     "Kala Namak (Black Salt)",
  //   ],
  //   benefits: [
  //     "Bromelain Enzymes",
  //     "Protein Digestion",
  //     "Anti-Bloat",
  //     "Joint Ease",
  //   ],
  //   tasteProfile:
  //     "Tropical punch sweetness balanced with aromatic mint and savory salt",
  //   bestTime: "30 minutes after heavy meals or post-workout",
  //   nutrition: {
  //     calories: "118 kcal",
  //     vitaminC: "150% RDA",
  //     sugar: "0g Added Sugar",
  //   },
  //   price: 100,
  //   image:
  //     "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=900&q=85",
  //   color: "#d69f16",
  //   hoverNote: "High in live bromelain enzymes for optimal gut digestion.",
  //   tag: "Digestive Hero",
  //   volume: "300 ml Glass Bottle",
  // },
  // {
  //   id: "ginger-immunity-shot",
  //   name: "Fiery Ginger & Turmeric Tonic",
  //   subtitle: "High-Potency Immunity Power Shot",
  //   category: "wellness",
  //   categoryLabel: "Botanical & Shots",
  //   description:
  //     "A concentrated elixir crafted from raw aged ginger root, fresh wild turmeric, Meyer lemon, and a kick of cayenne pepper. Built to stimulate circulation, clear sinuses, and ignite the immune shield.",
  //   fullStory:
  //     "A rapid-acting wellness tonic packed with gingerols and curcuminoids. Delivers an immediate warm surge throughout the body that opens nasal airways, fires up sluggish digestion, and protects against seasonal bugs.",
  //   ingredients: [
  //     "Raw Mountain Ginger",
  //     "Fresh Wild Turmeric Root",
  //     "Fresh Lemon Juice",
  //     "Organic Raw Honey",
  //     "Cayenne Pepper",
  //   ],
  //   benefits: [
  //     "Sinus Clearance",
  //     "Immune Defense",
  //     "Metabolic Spark",
  //     "Circulation",
  //   ],
  //   tasteProfile: "Intensely spicy, fiery, citrusy with a smooth honey finish",
  //   bestTime: "Morning wakeup shot or at the first sign of sniffles",
  //   nutrition: {
  //     calories: "45 kcal",
  //     vitaminC: "160% RDA",
  //     sugar: "Raw honey only",
  //   },
  //   price: 70,
  //   image:
  //     "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&w=900&q=85",
  //   color: "#c26514",
  //   hoverNote:
  //     "Concentrated ginger, wild turmeric & cayenne. High-potency vitality.",
  //   tag: "Power Shot",
  //   volume: "150 ml Glass Bottle",
  // },
  // {
  //   id: "jamun-metabolic",
  //   name: "Wild Jamun & Amla Balance",
  //   subtitle: "Low-GI Ayurvedic Botanical",
  //   category: "wellness",
  //   categoryLabel: "Botanical & Shots",
  //   description:
  //     "Wild forest Jamun (Indian Blackberry) cold-pressed with wild amla, bitter gourd extract, and cumin seeds. Formulated for steady blood glucose regulation, metabolism balance, and deep antioxidant protection.",
  //   fullStory:
  //     "Rooted in classical Ayurvedic pharmacology, Jamun seeds and pulp contain jamboline and ellagic acid that naturally moderate glucose metabolism. Combined with astringent amla for a powerful metabolic and liver-supportive blend.",
  //   ingredients: [
  //     "Wild Forest Jamun",
  //     "Fresh Amla",
  //     "Bitter Gourd (Karela) Extract",
  //     "Roasted Cumin",
  //     "Pink Salt",
  //   ],
  //   benefits: [
  //     "Blood Sugar Balance",
  //     "Low Glycemic",
  //     "Liver Support",
  //     "Anthocyanin Rich",
  //   ],
  //   tasteProfile: "Astringent, deep berry tartness with subtle herbal notes",
  //   bestTime: "Morning on an empty stomach or 20 minutes before meals",
  //   nutrition: {
  //     calories: "52 kcal",
  //     vitaminC: "130% RDA",
  //     sugar: "0g Added Sugar (Low GI)",
  //   },
  //   price: 110,
  //   image:
  //     "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?auto=format&fit=crop&w=900&q=85",
  //   color: "#4f2247",
  //   hoverNote: "Low glycemic botanical blend. Wild forest jamun and amla.",
  //   tag: "Metabolic Care",
  //   volume: "300 ml Glass Bottle",
  // },
];

const categories: Array<{ id: JuiceCategory; label: string; count: number }> = [
  { id: "all", label: "All Juices", count: products.length },
  // {
  //   id: "green",
  //   label: "Green & Detox",
  //   count: products.filter((p) => p.category === "green").length,
  // },
  // {
  //   id: "citrus",
  //   label: "Citrus & Immunity",
  //   count: products.filter((p) => p.category === "citrus").length,
  // },
  // {
  //   id: "roots",
  //   label: "Roots & Energy",
  //   count: products.filter((p) => p.category === "roots").length,
  // },
  // {
  //   id: "hydration",
  //   label: "Hydration & Coolers",
  //   count: products.filter((p) => p.category === "hydration").length,
  // },
  // {
  //   id: "wellness",
  //   label: "Botanical & Shots",
  //   count: products.filter((p) => p.category === "wellness").length,
  // },
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
        quantity > 24
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
    (value.paymentMethod === "razorpay" ||
      value.paymentMethod === "upi" ||
      value.paymentMethod === "cod") &&
    (value.paymentStatus === undefined ||
      value.paymentStatus === "pending" ||
      value.paymentStatus === "paid" ||
      value.paymentStatus === "cancelled") &&
    typeof value.createdAt === "string" &&
    Number.isFinite(Date.parse(value.createdAt)) &&
    Array.isArray(value.items) &&
    value.items.length > 0 &&
    value.items.length <= 25 &&
    value.items.every(
      (item: unknown) =>
        isRecord(item) &&
        typeof item.id === "string" &&
        products.some((product) => product.id === item.id) &&
        typeof item.quantity === "number" &&
        Number.isInteger(item.quantity) &&
        item.quantity >= 1 &&
        item.quantity <= 24,
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
      warning: "", //identify purpose of this warning message
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

  const [activeCategory, setActiveCategory] = useState<JuiceCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDetailProduct, setActiveDetailProduct] =
    useState<Product | null>(null);

  const [storageWarning, setStorageWarning] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<CreatedOrder | null>(null);
  const [paymentCustomer, setPaymentCustomer] = useState({
    name: "",
    phone: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "cod">(
    "razorpay",
  );
  const [cityInput, setCityInput] = useState("Bhiwani");
  const [pincodeInput, setPincodeInput] = useState("");
  const [showLocationRestrictionModal, setShowLocationRestrictionModal] =
    useState(false);
  const [restrictedCityEntered, setRestrictedCityEntered] = useState("");

  // Mobile Number & OTP Authentication State
  const [currentUser, setCurrentUser] = useState<{ phone: string } | null>(
    null,
  );
  const [authToken, setAuthToken] = useState("");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authPhone, setAuthPhone] = useState("");
  const [authOtp, setAuthOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccessMsg, setAuthSuccessMsg] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [demoOtpNotice, setDemoOtpNotice] = useState<string | null>(null);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);

  // Check user session on initial mount
  useEffect(() => {
    let isMounted = true;
    async function checkAuthSession() {
      try {
        const cachedToken = localStorage.getItem("juicewala_token") || "";
        const cachedPhone = localStorage.getItem("juicewala_phone") || "";

        const res = await fetch("/api/auth/me", {
          headers: cachedToken ? { Authorization: `Bearer ${cachedToken}` } : {},
        });
        const data = (await res.json()) as {
          loggedIn?: boolean;
          phone?: string;
        };

        if (!isMounted) return;

        if (data.loggedIn && data.phone) {
          setCurrentUser({ phone: data.phone });
          setAuthToken(cachedToken);
        } else if (cachedToken && cachedPhone) {
          setCurrentUser({ phone: cachedPhone });
          setAuthToken(cachedToken);
        } else {
          setCurrentUser(null);
        }
      } catch {
        if (isMounted) {
          try {
            const cachedPhone = localStorage.getItem("juicewala_phone") || "";
            const cachedToken = localStorage.getItem("juicewala_token") || "";
            if (cachedPhone && cachedToken) {
              setCurrentUser({ phone: cachedPhone });
              setAuthToken(cachedToken);
            }
          } catch {}
        }
      }
    }

    void checkAuthSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Cooldown countdown timer for Resend OTP
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const interval = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [otpCooldown]);

  async function handleSendOtp(targetPhone?: string) {
    const phoneToSend = (targetPhone || authPhone).trim();
    if (!/^[6-9][0-9]{9}$/.test(phoneToSend)) {
      setAuthError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setAuthError("");
    setAuthSuccessMsg("");
    setDemoOtpNotice(null);
    setIsSendingOtp(true);

    // 1. Google Firebase Phone Authentication
    if (isFirebaseConfigured()) {
      try {
        const auth = getFirebaseAuth();
        if (!auth) throw new Error("Firebase auth is not initialized.");

        if (!recaptchaVerifierRef.current) {
          recaptchaVerifierRef.current = new RecaptchaVerifier(
            auth,
            "recaptcha-container",
            {
              size: "invisible",
            },
          );
        }

        const confirmation = await signInWithPhoneNumber(
          auth,
          `+91${phoneToSend}`,
          recaptchaVerifierRef.current,
        );
        confirmationResultRef.current = confirmation;
        setOtpSent(true);
        setOtpCooldown(30);
        setAuthSuccessMsg(`Firebase OTP sent to +91 ${phoneToSend}`);
        setIsSendingOtp(false);
        return;
      } catch (err: unknown) {
        console.error("[Firebase Phone Auth Error]", err);
        try {
          recaptchaVerifierRef.current?.clear();
          recaptchaVerifierRef.current = null;
        } catch {}

        const errCode =
          typeof err === "object" && err !== null && "code" in err
            ? (err as { code: string }).code
            : "";

        if (errCode === "auth/invalid-phone-number") {
          setAuthError("Invalid phone number format.");
          setIsSendingOtp(false);
          return;
        }
        if (errCode === "auth/too-many-requests") {
          setAuthError("Too many OTP requests. Please wait a few minutes.");
          setIsSendingOtp(false);
          return;
        }

        const errMsg =
          err instanceof Error
            ? err.message
            : "Could not send Firebase OTP.";
        setAuthError(errMsg);
        setIsSendingOtp(false);
        return;
      }
    }

    // 2. Fallback mode (when Firebase env variables are not yet entered)
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneToSend }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAuthError(data.error || "Could not send OTP. Please try again.");
        if (data.cooldownSeconds) {
          setOtpCooldown(data.cooldownSeconds);
        }
      } else {
        setOtpSent(true);
        setOtpCooldown(30);
        setAuthSuccessMsg(data.message || `OTP sent to +91 ${phoneToSend}`);
        if (data.demoOtp) {
          setDemoOtpNotice(data.demoOtp);
        }
      }
    } catch {
      setAuthError("Network error. Please check your connection.");
    } finally {
      setIsSendingOtp(false);
    }
  }

  async function handleVerifyOtp(targetPhone?: string, targetOtp?: string) {
    const phoneToVerify = (targetPhone || authPhone).trim();
    const otpToVerify = (targetOtp || authOtp).trim();

    if (!/^[6-9][0-9]{9}$/.test(phoneToVerify)) {
      setAuthError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!/^[0-9]{6}$/.test(otpToVerify)) {
      setAuthError("Please enter the 6-digit OTP received.");
      return;
    }

    setAuthError("");
    setAuthSuccessMsg("");
    setIsVerifyingOtp(true);

    // If active Firebase confirmation result
    if (confirmationResultRef.current) {
      try {
        const userCredential = await confirmationResultRef.current.confirm(
          otpToVerify,
        );
        const idToken = await userCredential.user.getIdToken();

        const res = await fetch("/api/auth/firebase-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setAuthError(data.error || "Failed to verify Firebase session.");
          setIsVerifyingOtp(false);
          return;
        }

        const user = { phone: data.phone || phoneToVerify };
        setCurrentUser(user);
        setAuthToken(data.token || "");
        try {
          localStorage.setItem("juicewala_token", data.token || "");
          localStorage.setItem("juicewala_phone", user.phone);
        } catch {}
        setIsAuthModalOpen(false);
        setOtpSent(false);
        setAuthOtp("");
        setDemoOtpNotice(null);
        confirmationResultRef.current = null;
        setIsVerifyingOtp(false);
        return;
      } catch (err: unknown) {
        console.error("[Firebase Verify Error]", err);
        const errCode =
          typeof err === "object" && err !== null && "code" in err
            ? (err as { code: string }).code
            : "";
        const errMsg =
          errCode === "auth/invalid-verification-code"
            ? "Incorrect OTP. Please check the code received on your phone."
            : errCode === "auth/code-expired"
              ? "OTP has expired. Please request a new code."
              : "Verification failed. Please try again.";
        setAuthError(errMsg);
        setIsVerifyingOtp(false);
        return;
      }
    }

    // Fallback API verification
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneToVerify, otp: otpToVerify }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAuthError(data.error || "Incorrect OTP. Please try again.");
      } else {
        const user = { phone: data.phone || phoneToVerify };
        setCurrentUser(user);
        setAuthToken(data.token || "");
        try {
          localStorage.setItem("juicewala_token", data.token || "");
          localStorage.setItem("juicewala_phone", user.phone);
        } catch {}
        setIsAuthModalOpen(false);
        setOtpSent(false);
        setAuthOtp("");
        setDemoOtpNotice(null);
      }
    } catch {
      setAuthError("Network error. Please try again.");
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      const auth = getFirebaseAuth();
      if (auth) {
        await auth.signOut();
      }
    } catch {}
    setCurrentUser(null);
    setAuthToken("");
    try {
      localStorage.removeItem("juicewala_token");
      localStorage.removeItem("juicewala_phone");
    } catch {}
    setOtpSent(false);
    setAuthOtp("");
    setDemoOtpNotice(null);
    confirmationResultRef.current = null;
  }

  function isBhiwaniLocation(city: string, pin: string): boolean {
    const cleanCity = city.trim().toLowerCase();
    const cleanPin = pin.trim();

    if (cleanPin.length === 6 && !cleanPin.startsWith("127")) {
      return false;
    }

    if (cleanCity && !cleanCity.includes("bhiwani")) {
      const otherDistricts = [
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
      if (otherDistricts.some((d) => cleanCity.includes(d))) {
        return false;
      }
      if (!cleanPin.startsWith("127")) {
        return false;
      }
    }

    return true;
  }
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [razorpayLoadError, setRazorpayLoadError] = useState("");

  const [orderNotice, setOrderNotice] = useState("");
  const [orderActionLoading, setOrderActionLoading] = useState<string | null>(
    null,
  );
  const [editingOrder, setEditingOrder] = useState<SavedOrder | null>(null);
  const [editCustomer, setEditCustomer] = useState({
    name: "",
    phone: "",
    address: "",
  });
  const [editItems, setEditItems] = useState<
    Array<{ id: string; quantity: number }>
  >([]);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState("");

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
  const deliveryFee =
    subtotal === 0
      ? 0
      : subtotal >= FREE_SHIPPING_THRESHOLD
        ? 0
        : STANDARD_SHIPPING_FEE;
  const total = subtotal + deliveryFee;

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      activeCategory === "all" || product.category === activeCategory;
    if (!matchesCategory) return false;

    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return (
      product.name.toLowerCase().includes(query) ||
      product.subtitle.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query) ||
      product.benefits.some((b) => b.toLowerCase().includes(query)) ||
      product.ingredients.some((i) => i.toLowerCase().includes(query))
    );
  });

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

    setCartToast((curr) => {
      if (!curr || curr.product.id !== productId) return curr;
      if (quantity <= 0) return null;
      return { ...curr, quantity };
    });
  }

  const [animatingButtonId, setAnimatingButtonId] = useState<string | null>(
    null,
  );
  const [animatingQtyId, setAnimatingQtyId] = useState<string | null>(null);
  const [animatingHeaderQty, setAnimatingHeaderQty] = useState(false);
  const [cartToast, setCartToast] = useState<{
    product: Product;
    quantity: number;
  } | null>(null);

  function handleAddToCartWithAnimation(product: Product) {
    setAnimatingButtonId(product.id);
    setAnimatingQtyId(product.id);
    setAnimatingHeaderQty(true);
    setTimeout(() => {
      setAnimatingButtonId((curr) => (curr === product.id ? null : curr));
      setAnimatingQtyId((curr) => (curr === product.id ? null : curr));
      setAnimatingHeaderQty(false);
    }, 850);

    const nextQty = (cart[product.id] ?? 0) + 1;
    changeQuantity(product.id, 1);
    setCartToast({ product, quantity: nextQty });
  }

  function handleUpdateBagQuantity(item: Product, delta: number) {
    const nextQty = (cart[item.id] ?? 0) + delta;
    if (delta > 0) {
      const buttonKey = `bag-${item.id}`;
      setAnimatingButtonId(buttonKey);
      setAnimatingQtyId(item.id);
      setAnimatingHeaderQty(true);
      setTimeout(() => {
        setAnimatingButtonId((curr) => (curr === buttonKey ? null : curr));
        setAnimatingQtyId((curr) => (curr === item.id ? null : curr));
        setAnimatingHeaderQty(false);
      }, 850);
    } else {
      setAnimatingQtyId(item.id);
      setAnimatingHeaderQty(true);
      setTimeout(() => {
        setAnimatingQtyId((curr) => (curr === item.id ? null : curr));
        setAnimatingHeaderQty(false);
      }, 450);
    }

    changeQuantity(item.id, delta);

    if (nextQty > 0) {
      setCartToast({ product: item, quantity: nextQty });
    } else {
      setCartToast((curr) => (curr?.product.id === item.id ? null : curr));
    }
  }

  function openCart() {
    setIsOrdersOpen(false);
    setOrder(null);
    setError("");
    setIsCartOpen(true);
  }

  function handleBrowseJuices() {
    setIsCartOpen(false);
    setActiveCategory("all");
    setSearchQuery("");
    setTimeout(() => {
      const juicesSection = document.getElementById("juices");
      if (juicesSection) {
        juicesSection.scrollIntoView({ behavior: "smooth" });
      } else {
        window.location.hash = "juices";
      }
    }, 80);
  }

  function openOrders() {
    setIsCartOpen(false);
    setIsOrdersOpen(true);
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!currentUser) {
      setAuthError(
        "Please login with your mobile number and verify OTP to confirm your order.",
      );
      setError(
        "Please login with your mobile number and verify OTP to confirm your order.",
      );
      setIsAuthModalOpen(true);
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const orderedItems = cartItems.map(({ id, quantity }) => ({
      id,
      quantity,
    }));

    const name = (formData.get("name") as string) || "";
    const phone = currentUser.phone;
    const city = (formData.get("city") as string) || "";
    const pincode = (formData.get("pincode") as string) || "";
    const streetAddress = (formData.get("address") as string) || "";

    if (!isBhiwaniLocation(city, pincode)) {
      setIsSubmitting(false);
      setRestrictedCityEntered(
        city.trim() !== "Bhiwani" && city.trim()
          ? city.trim()
          : `PIN ${pincode.trim()}`,
      );
      setShowLocationRestrictionModal(true);
      setError(
        "Currently, JuiceWala delivers fresh juice in Bhiwani only (PIN codes starting with 127). We are expanding soon!",
      );
      return;
    }

    const fullAddress = `${streetAddress.trim()}, ${city.trim()} - ${pincode.trim()}`;

    const orderHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authToken) {
      orderHeaders["Authorization"] = `Bearer ${authToken}`;
    }

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: orderHeaders,
        body: JSON.stringify({
          customer: {
            name: name.trim(),
            phone: phone.trim(),
            address: fullAddress,
          },
          items: orderedItems,
          paymentMethod,
        }),
      });

      const result = (await response.json()) as
        | CreatedOrder
        | { error: string };

      if (response.status === 401) {
        setCurrentUser(null);
        setIsAuthModalOpen(true);
        throw new Error(
          "error" in result
            ? result.error
            : "Please verify your mobile number with OTP before placing an order.",
        );
      }

      if (!response.ok || !("orderId" in result)) {
        throw new Error(
          "error" in result ? result.error : "Could not prepare your order.",
        );
      }

      setOrder(result);
      setPaymentCustomer({
        name: name.trim(),
        phone: phone.trim(),
      });

      const currentSavedOrders = readSavedOrders(getOrdersSnapshot()).value;
      const nextSavedOrders: SavedOrder[] = [
        {
          orderId: result.orderId,
          amount: result.amount,
          subtotal,
          deliveryFee,
          paymentMethod: result.paymentMethod,
          paymentStatus:
            result.paymentMethod === "razorpay"
              ? ("pending" as const)
              : undefined,
          items: orderedItems,
          customer: {
            name: name.trim(),
            phone: phone.trim(),
            address: fullAddress,
          },
          createdAt: new Date().toISOString(),
        },
        ...currentSavedOrders.filter(
          (existing) => existing.orderId !== result.orderId,
        ),
      ].slice(0, 50);

      if (
        !writeStorageValue(ORDERS_STORAGE_KEY, JSON.stringify(nextSavedOrders))
      ) {
        setStorageWarning(
          "Your order was placed, but this browser could not save your order history.",
        );
      }

      writeStorageValue(CART_STORAGE_KEY, JSON.stringify({}));

      if (result.paymentMethod === "razorpay") {
        openRazorpayCheckout(result, {
          name: name.trim(),
          phone: phone.trim(),
        });
      }
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Could not create your order. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function openRazorpayCheckout(
    razorpayOrder: Extract<CreatedOrder, { paymentMethod: "razorpay" }>,
    customer: { name: string; phone: string },
  ) {
    if (!window.Razorpay) {
      setError("Razorpay checkout is still loading. Please wait a moment.");
      return;
    }

    try {
      const checkout = new window.Razorpay({
        key: razorpayOrder.razorpayKeyId,
        amount: razorpayOrder.amount * 100,
        currency: "INR",
        name: "JuiceWala",
        description: `Juice Order ${razorpayOrder.orderId.slice(0, 8).toUpperCase()}`,
        order_id: razorpayOrder.razorpayOrderId,
        prefill: {
          name: customer.name,
          contact: customer.phone,
        },
        theme: {
          color: "#183b2b",
        },
        config: {
          display: {
            hide: [{ method: "upi", flows: ["collect"] }],
          },
        },
        handler: async (payment) => {
          setError("");
          setIsSubmitting(true);
          try {
            const response = await fetch("/api/orders/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: razorpayOrder.orderId,
                ...payment,
              }),
            });
            const result = (await response.json()) as
              | { paymentStatus: "paid" }
              | { error: string };
            if (
              !response.ok ||
              !("paymentStatus" in result) ||
              result.paymentStatus !== "paid"
            ) {
              throw new Error(
                "error" in result
                  ? result.error
                  : "Could not confirm payment. Please contact support.",
              );
            }

            setOrder((current) =>
              current?.orderId === razorpayOrder.orderId
                ? { ...current, paymentStatus: "paid" }
                : current,
            );
            const savedOrdersNow = readSavedOrders(getOrdersSnapshot()).value;
            const updatedOrders = savedOrdersNow.map((savedOrder) =>
              savedOrder.orderId === razorpayOrder.orderId
                ? { ...savedOrder, paymentStatus: "paid" as const }
                : savedOrder,
            );
            if (
              !writeStorageValue(
                ORDERS_STORAGE_KEY,
                JSON.stringify(updatedOrders),
              )
            ) {
              setStorageWarning(
                "Payment was confirmed, but this browser could not update your order history.",
              );
            }
          } catch (verificationError) {
            setError(
              verificationError instanceof Error
                ? verificationError.message
                : "Could not confirm payment. Please contact support.",
            );
          } finally {
            setIsSubmitting(false);
          }
        },
      });
      checkout.open();
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Secure payment could not be opened. Please try again.",
      );
    }
  }

  async function handleCancelOrder(orderId: string) {
    if (
      !window.confirm(
        "Are you sure you want to cancel this order? / क्या आप वाकई यह ऑर्डर रद्द करना चाहते हैं?",
      )
    ) {
      return;
    }

    setOrderActionLoading(orderId);
    setOrderNotice("");

    try {
      await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
    } catch (err) {
      console.warn("Cancel order API notice:", err);
    }

    const currentOrders = readSavedOrders(getOrdersSnapshot()).value;
    const updatedOrders = currentOrders.map((o) =>
      o.orderId === orderId
        ? {
            ...o,
            paymentStatus: "cancelled" as const,
            cancelledAt: new Date().toISOString(),
          }
        : o,
    );

    writeStorageValue(ORDERS_STORAGE_KEY, JSON.stringify(updatedOrders));
    setOrderNotice(
      `Order ${orderId.slice(0, 8).toUpperCase()} has been cancelled / ऑर्डर रद्द कर दिया गया है।`,
    );
    setOrderActionLoading(null);
  }

  async function handleDeleteOrder(orderId: string) {
    if (
      !window.confirm(
        "Are you sure you want to delete this order from history? / क्या आप इस ऑर्डर को हिस्ट्री से हटाना चाहते हैं?",
      )
    ) {
      return;
    }

    setOrderActionLoading(orderId);
    setOrderNotice("");

    try {
      await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("Delete order API notice:", err);
    }

    const currentOrders = readSavedOrders(getOrdersSnapshot()).value;
    const updatedOrders = currentOrders.filter((o) => o.orderId !== orderId);

    writeStorageValue(ORDERS_STORAGE_KEY, JSON.stringify(updatedOrders));
    setOrderNotice(
      `Order ${orderId.slice(0, 8).toUpperCase()} removed from history / ऑर्डर हटा दिया गया है।`,
    );
    setOrderActionLoading(null);
  }

  function openEditOrderModal(targetOrder: SavedOrder) {
    setEditingOrder(targetOrder);
    setEditCustomer({
      name: targetOrder.customer?.name || "",
      phone: targetOrder.customer?.phone || "",
      address: targetOrder.customer?.address || "",
    });
    setEditItems(targetOrder.items.map((it) => ({ ...it })));
    setEditError("");
  }

  function changeEditItemQuantity(productId: string, delta: number) {
    setEditItems((current) => {
      const existing = current.find((it) => it.id === productId);
      if (!existing && delta > 0) {
        return [...current, { id: productId, quantity: 1 }];
      }
      return current
        .map((it) =>
          it.id === productId ? { ...it, quantity: it.quantity + delta } : it,
        )
        .filter((it) => it.quantity > 0);
    });
  }

  async function handleSaveOrderUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingOrder) return;
    if (editItems.length === 0) {
      setEditError(
        "Order must have at least one juice item / कम से कम एक जूस होना चाहिए।",
      );
      return;
    }

    setIsSubmittingEdit(true);
    setEditError("");

    const newSubtotal = editItems.reduce((sum, item) => {
      const prod = products.find((p) => p.id === item.id);
      return sum + (prod?.price || 0) * item.quantity;
    }, 0);
    const newDeliveryFee =
      newSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
    const newAmount = newSubtotal + newDeliveryFee;

    try {
      const res = await fetch(`/api/orders/${editingOrder.orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          customer: editCustomer,
          items: editItems,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Could not update order on server.");
      }
    } catch (err) {
      console.warn("Update order API notice:", err);
    }

    const currentOrders = readSavedOrders(getOrdersSnapshot()).value;
    const updatedOrders = currentOrders.map((o) =>
      o.orderId === editingOrder.orderId
        ? {
            ...o,
            customer: {
              name: editCustomer.name.trim(),
              phone: editCustomer.phone.trim(),
              address: editCustomer.address.trim(),
            },
            items: editItems,
            subtotal: newSubtotal,
            deliveryFee: newDeliveryFee,
            amount: newAmount,
            updatedAt: new Date().toISOString(),
          }
        : o,
    );

    writeStorageValue(ORDERS_STORAGE_KEY, JSON.stringify(updatedOrders));
    setOrderNotice(
      `Order ${editingOrder.orderId.slice(0, 8).toUpperCase()} updated successfully / ऑर्डर अपडेट हो गया है।`,
    );
    setIsSubmittingEdit(false);
    setEditingOrder(null);
  }

  return (
    <main>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onReady={() => {
          setRazorpayReady(true);
          setRazorpayLoadError("");
        }}
        onError={() =>
          setRazorpayLoadError(
            "Secure checkout did not load. Check your connection and refresh.",
          )
        }
      />

      {/* Top Announcements */}
      <div className="delivery-ribbon">
        <Truck aria-hidden="true" size={17} />
        <span>
          <strong>
            DELIVERING BHIWANI ONLY · WE WILL EXPAND OUR SERVICES SOON IN ALL
            INDIA
          </strong>
          <span className="ribbon-note">Free delivery on orders over ₹499</span>
        </span>
      </div>

      <div className="service-area-ribbon">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Snowflake size={14} aria-hidden="true" />
          GUARANTEED FRESH JUICE DELIVERED AT YOUR PLACE
        </span>
        {/* <span>
          Guaranteed fresh & under 4°C · Morning (6 AM - 9 AM) & Express Slots
        </span> */}
      </div>

      {/* Site Header */}
      <header className="site-header">
        <a className="brand" href="#home" aria-label="JuiceWala home">
          <span className="brand-mark">
            <Leaf size={20} aria-hidden="true" />
          </span>
          <span>JuiceWala</span>
        </a>

        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#juices">The Juices</a>
          <a href="#cold-chain">Cold-Chain Delivery</a>
          <a href="#standards">Our Purity Standard</a>
          <Link href="/contact">Support</Link>
        </nav>

        <div className="header-actions">
          {currentUser ? (
            <div className="auth-header-pill">
              <span
                className="auth-user-tag"
                title={`Logged in: +91 ${currentUser.phone}`}
              >
                <User size={15} aria-hidden="true" />
                <span>+91 {currentUser.phone}</span>
              </span>
              <button
                className="auth-logout-icon-btn"
                onClick={handleLogout}
                title="Logout / Switch Account"
                aria-label="Logout"
              >
                <LogOut size={14} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              className="auth-nav-btn"
              onClick={() => {
                setAuthError("");
                setAuthSuccessMsg("");
                setIsAuthModalOpen(true);
              }}
              aria-label="Login with mobile number"
            >
              <User size={17} aria-hidden="true" />
              <span>Login</span>
            </button>
          )}

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

      {/* Hero Section */}
      <section className="hero" id="home">
        <div
          className="hero-photo"
          role="img"
          aria-label="Freshly pressed cold-pressed juices and botanicals"
        />
        <div className="hero-wash" />
        <div className="hero-content">
          <p className="eyebrow hero-eyebrow">
            <span /> 100% RAW PACKED JUICES · DELIVERING ON TIME
          </p>
          <h1>
            ताज़ा जूस।
            <br />
            सीधा आपके घर।
          </h1>
          <p>अब जूस मंगाना हुआ आसान।</p>
          <p className="hero-copy">
            ताज़े फल और सब्जियों से बना जूस। बिना मिलावट और बिना पानी मिलाए,
            सीधे आपके दरवाज़े तक।
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <a className="hero-cta" href="#juices">
              See all Juices → <ChevronRight size={17} aria-hidden="true" />
            </a>
            {/* <a
              href="#cold-chain"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "0 18px",
                minHeight: 47,
                fontSize: 13,
                fontWeight: 600,
                color: "#f5f7f0",
                border: "1px solid rgba(255,255,255,0.4)",
                borderRadius: 2,
              }}
            >
              How We Ship Cold <ArrowDown size={15} aria-hidden="true" />
            </a> */}
          </div>

          <div className="hero-footnote">
            <span>STARTUP MANIFESTO</span>
            <span className="hero-rule" />
            <span>हर दिन ताज़ा जूस · हर घूंट में स्वाद</span>
          </div>
        </div>
        <div className="hero-stamp">
          {/* <span>
            COLD
            <br />
            PRESSED
          </span> */}
          <Snowflake size={21} aria-hidden="true" />
        </div>
      </section>

      {/* Startup Value Pillars */}
      <section
        style={{
          background: "#183b2b",
          color: "#fffefa",
          padding: "42px 7.6%",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <div
          style={{
            maxWidth: 1320,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 28,
          }}
        >
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div
              style={{
                background: "#d9e68c",
                color: "#183b2b",
                padding: 10,
                borderRadius: "50%",
                flexShrink: 0,
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <strong
                style={{
                  display: "block",
                  fontSize: 14,
                  fontFamily: "var(--serif)",
                  marginBottom: 4,
                }}
              >
                Real Fruits. Real Freshness.
              </strong>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: "#d0d9cf",
                  lineHeight: 1.55,
                }}
              >
                Enjoy fresh fruit and vegetable juices, carefully prepared and
                delivered to your doorstep.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div
              style={{
                background: "#d9e68c",
                color: "#183b2b",
                padding: 10,
                borderRadius: "50%",
                flexShrink: 0,
              }}
            >
              <Droplets size={20} />
            </div>
            <div>
              <strong
                style={{
                  display: "block",
                  fontSize: 14,
                  fontFamily: "var(--serif)",
                  marginBottom: 4,
                }}
              >
                Zero Water & Color
              </strong>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: "#d0d9cf",
                  lineHeight: 1.55,
                }}
              >
                Made with fresh fruits and vegetables. No added water, sugar or
                artificial colours. Just the natural taste of fresh ingredients!
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div
              style={{
                background: "#d9e68c",
                color: "#183b2b",
                padding: 10,
                borderRadius: "50%",
                flexShrink: 0,
              }}
            >
              <Snowflake size={20} />
            </div>
            <div>
              <strong
                style={{
                  display: "block",
                  fontSize: 14,
                  fontFamily: "var(--serif)",
                  marginBottom: 4,
                }}
              >
                Packed Fresh. Delivered Safely.
              </strong>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: "#d0d9cf",
                  lineHeight: 1.55,
                }}
              >
                We pack your order freshly and ship it to you with extra care to
                keep your juice refreshing on its way.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div
              style={{
                background: "#d9e68c",
                color: "#183b2b",
                padding: 10,
                borderRadius: "50%",
                flexShrink: 0,
              }}
            >
              <Truck size={20} />
            </div>
            <div>
              <strong
                style={{
                  display: "block",
                  fontSize: 14,
                  fontFamily: "var(--serif)",
                  marginBottom: 4,
                }}
              >
                Doorstep Delivery
              </strong>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: "#d0d9cf",
                  lineHeight: 1.55,
                }}
              >
                Shipping across all areas in Bhiwani only. We will expand our
                services soon in all India.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Products Menu Section */}
      <section className="products-section" id="juices">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              FRESH JUICES · MADE WITH FRESH INGREDIENTS
            </p>
            <h2>
              Choose Your Favourite Juice<span className="brand-dot">.</span>
            </h2>
          </div>
          <p className="section-side-note">
            Freshly prepared with fruits and vegetables.
            <br />
            Fresh delivery right to your doorstep.
          </p>
        </div>

        {/* Search & Category Filter Controls */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            marginBottom: 32,
          }}
        >
          {/* Search Bar */}
          <div
            style={{
              position: "relative",
              maxWidth: 480,
              width: "100%",
            }}
          >
            <Search
              size={18}
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted)",
              }}
            />
            <input
              type="text"
              placeholder="Search by juice name, benefit, or ingredients (e.g. Amla, Detox, Ginger)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "11px 16px 11px 42px",
                border: "1px solid var(--line)",
                borderRadius: 4,
                fontSize: 13,
                background: "var(--white)",
                color: "var(--ink)",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: 0,
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--muted)",
                }}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              paddingBottom: 6,
              scrollbarWidth: "none",
            }}
          >
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  padding: "8px 16px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 24,
                  whiteSpace: "nowrap",
                  border:
                    activeCategory === cat.id
                      ? "1px solid var(--forest)"
                      : "1px solid var(--line)",
                  background:
                    activeCategory === cat.id
                      ? "var(--forest)"
                      : "var(--white)",
                  color: activeCategory === cat.id ? "#fffefa" : "var(--muted)",
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>{cat.label}</span>
                <span
                  style={{
                    fontSize: 10,
                    opacity: 0.8,
                    background:
                      activeCategory === cat.id
                        ? "rgba(255,255,255,0.2)"
                        : "#e8ede0",
                    padding: "1px 6px",
                    borderRadius: 10,
                  }}
                >
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div
            style={{
              padding: "60px 20px",
              textAlign: "center",
              background: "var(--white)",
              border: "1px solid var(--line)",
              borderRadius: 6,
            }}
          >
            <Leaf
              size={36}
              style={{ color: "var(--muted)", margin: "0 auto 12px" }}
            />
            <h3
              style={{
                fontFamily: "var(--serif)",
                fontSize: 22,
                margin: "0 0 8px",
              }}
            >
              No juices match your search
            </h3>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
              Try searching for &quot;Green&quot;, &quot;Amla&quot;,
              &quot;Orange&quot;, or click &quot;All Juices&quot;.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("all");
              }}
              style={{
                marginTop: 18,
                padding: "8px 18px",
                background: "var(--forest)",
                color: "#fff",
                border: 0,
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="product-grid">
            {filteredProducts.map((product, index) => (
              <article className="product-card" key={product.id}>
                {/* Photo & Top Badges */}
                <div
                  className="product-photo"
                  style={{ backgroundImage: `url("${product.image}")` }}
                  role="img"
                  aria-label={`${product.name} photo. ${product.hoverNote}`}
                  title={product.hoverNote}
                  onClick={() => setActiveDetailProduct(product)}
                >
                  <span className="product-number">
                    {index < 9 ? `0${index + 1}` : index + 1}
                  </span>

                  {product.tag && (
                    <span
                      style={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        zIndex: 2,
                        background: "rgba(24, 59, 43, 0.92)",
                        color: "#d9e68c",
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        padding: "4px 8px",
                        borderRadius: 3,
                        textTransform: "uppercase",
                      }}
                    >
                      {product.tag}
                    </span>
                  )}

                  <span className="juice-hover-note">{product.hoverNote}</span>
                  <span
                    className="photo-color"
                    style={{ backgroundColor: product.color }}
                  />
                </div>

                {/* Details */}
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

                  {/* Benefits Pills */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 4,
                      marginBottom: 8,
                    }}
                  >
                    {product.benefits.slice(0, 3).map((b) => (
                      <span
                        key={b}
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          padding: "2px 6px",
                          borderRadius: 3,
                          background: "#ecf2e4",
                          color: "#326344",
                        }}
                      >
                        {b}
                      </span>
                    ))}
                  </div>

                  {/* Ingredients */}
                  <p className="ingredient-line">
                    <Leaf size={12} aria-hidden="true" />{" "}
                    {product.ingredients.slice(0, 4).join(" · ")}
                    {product.ingredients.length > 4 && " + more"}
                  </p>

                  {/* Actions & More Info Button */}
                  <div className="product-actions">
                    <button
                      type="button"
                      onClick={() => setActiveDetailProduct(product)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        border: 0,
                        background: "transparent",
                        color: "var(--muted)",
                        fontSize: 10,
                        cursor: "pointer",
                        padding: 0,
                        fontWeight: 600,
                      }}
                    >
                      <Info size={13} /> {product.volume}
                    </button>

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
                        <span
                          className={
                            animatingQtyId === product.id
                              ? "qty-increase-animation"
                              : ""
                          }
                        >
                          {cart[product.id]}
                        </span>
                        <button
                          onClick={() => handleAddToCartWithAnimation(product)}
                          aria-label={`Add one ${product.name}`}
                          className={
                            animatingButtonId === product.id
                              ? "button-star-bounce"
                              : ""
                          }
                        >
                          <Plus size={15} />
                          {animatingButtonId === product.id && (
                            <span
                              className="star-burst-container"
                              aria-hidden="true"
                            >
                              <span className="star-particle star-p1">★</span>
                              <span className="star-particle star-p2">✦</span>
                              <span className="star-particle star-p3">★</span>
                              <span className="star-particle star-p4">✦</span>
                              <span className="star-particle star-p5">★</span>
                              <span className="star-particle star-p6">✨</span>
                              <span className="star-particle star-p7">★</span>
                              <span className="star-particle star-p8">✦</span>
                            </span>
                          )}
                        </button>
                      </div>
                    ) : (
                      <button
                        className={`add-button ${
                          animatingButtonId === product.id
                            ? "button-star-bounce"
                            : ""
                        }`}
                        onClick={() => handleAddToCartWithAnimation(product)}
                        aria-label={`Add ${product.name} to bag`}
                      >
                        <Plus size={16} aria-hidden="true" /> Add
                        {animatingButtonId === product.id && (
                          <span
                            className="star-burst-container"
                            aria-hidden="true"
                          >
                            <span className="star-particle star-p1">★</span>
                            <span className="star-particle star-p2">✦</span>
                            <span className="star-particle star-p3">★</span>
                            <span className="star-particle star-p4">✦</span>
                            <span className="star-particle star-p5">★</span>
                            <span className="star-particle star-p6">✨</span>
                            <span className="star-particle star-p7">★</span>
                            <span className="star-particle star-p8">✦</span>
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Product Detailed Modal / Drawer */}
      {activeDetailProduct && (
        <div
          className="drawer-backdrop"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setActiveDetailProduct(null)
          }
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-title"
            style={{
              width: "min(100%, 600px)",
              maxHeight: "92vh",
              overflowY: "auto",
              margin: "auto",
              background: "var(--paper)",
              borderRadius: 8,
              boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
              position: "relative",
            }}
          >
            {/* Header image with close button */}
            <div
              style={{
                height: 240,
                backgroundImage: `url("${activeDetailProduct.image}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                position: "relative",
              }}
            >
              <button
                onClick={() => setActiveDetailProduct(null)}
                style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.5)",
                  color: "#fff",
                  border: 0,
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                }}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>

              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 18,
                  background: "rgba(24, 59, 43, 0.94)",
                  color: "#d9e68c",
                  padding: "4px 10px",
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {activeDetailProduct.categoryLabel} ·{" "}
                {activeDetailProduct.volume}
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px 26px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <div>
                  <p
                    style={{
                      margin: "0 0 4px",
                      color: "var(--muted)",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {activeDetailProduct.subtitle}
                  </p>
                  <h2
                    id="detail-title"
                    style={{
                      margin: 0,
                      fontFamily: "var(--serif)",
                      fontSize: 28,
                    }}
                  >
                    {activeDetailProduct.name}
                  </h2>
                </div>
                <strong
                  style={{
                    fontSize: 22,
                    fontFamily: "var(--serif)",
                    color: "var(--forest)",
                  }}
                >
                  {formatPrice(activeDetailProduct.price)}
                </strong>
              </div>

              {/* Story & Description */}
              <p
                style={{
                  margin: "16px 0 12px",
                  fontSize: 13,
                  lineHeight: 1.65,
                  color: "var(--ink)",
                }}
              >
                {activeDetailProduct.description}
              </p>

              <div
                style={{
                  background: "var(--white)",
                  border: "1px solid var(--line)",
                  borderRadius: 6,
                  padding: "14px 16px",
                  margin: "16px 0",
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: "#4a594d",
                }}
              >
                <strong
                  style={{
                    display: "block",
                    color: "var(--forest)",
                    marginBottom: 4,
                  }}
                >
                  The Craft & Extraction:
                </strong>
                {activeDetailProduct.fullStory}
              </div>

              {/* Nutrition & Profile Badges */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 8,
                  margin: "16px 0",
                }}
              >
                <div
                  style={{
                    background: "#ecf2e4",
                    padding: "10px 12px",
                    borderRadius: 4,
                    textAlign: "center",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontSize: 10,
                      color: "var(--muted)",
                      fontWeight: 600,
                    }}
                  >
                    CALORIES
                  </span>
                  <strong style={{ fontSize: 13, color: "var(--forest)" }}>
                    {activeDetailProduct.nutrition.calories}
                  </strong>
                </div>
                <div
                  style={{
                    background: "#ecf2e4",
                    padding: "10px 12px",
                    borderRadius: 4,
                    textAlign: "center",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontSize: 10,
                      color: "var(--muted)",
                      fontWeight: 600,
                    }}
                  >
                    VITAMIN C
                  </span>
                  <strong style={{ fontSize: 13, color: "var(--forest)" }}>
                    {activeDetailProduct.nutrition.vitaminC}
                  </strong>
                </div>
                <div
                  style={{
                    background: "#ecf2e4",
                    padding: "10px 12px",
                    borderRadius: 4,
                    textAlign: "center",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontSize: 10,
                      color: "var(--muted)",
                      fontWeight: 600,
                    }}
                  >
                    SUGAR
                  </span>
                  <strong style={{ fontSize: 13, color: "var(--forest)" }}>
                    {activeDetailProduct.nutrition.sugar}
                  </strong>
                </div>
              </div>

              {/* Health Benefits */}
              <div style={{ margin: "16px 0" }}>
                <p className="eyebrow" style={{ marginBottom: 8 }}>
                  KEY HEALTH BENEFITS
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {activeDetailProduct.benefits.map((benefit) => (
                    <span
                      key={benefit}
                      style={{
                        padding: "5px 10px",
                        background: "#326344",
                        color: "#fff",
                        borderRadius: 3,
                        fontSize: 11,
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Check size={12} /> {benefit}
                    </span>
                  ))}
                </div>
              </div>

              {/* Ingredients list */}
              <div style={{ margin: "16px 0" }}>
                <p className="eyebrow" style={{ marginBottom: 8 }}>
                  100% REAL INGREDIENTS
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "#445247" }}>
                  {activeDetailProduct.ingredients.join(" · ")}
                </p>
              </div>

              {/* Best Time & Taste */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: "1px solid var(--line)",
                  fontSize: 11,
                }}
              >
                <div>
                  <strong style={{ display: "block", color: "var(--muted)" }}>
                    TASTE PROFILE
                  </strong>
                  <span>{activeDetailProduct.tasteProfile}</span>
                </div>
                <div>
                  <strong style={{ display: "block", color: "var(--muted)" }}>
                    RECOMMENDED TIME
                  </strong>
                  <span>{activeDetailProduct.bestTime}</span>
                </div>
              </div>

              {/* Modal Add to Bag Action */}
              <div
                style={{
                  marginTop: 22,
                  paddingTop: 16,
                  borderTop: "1px solid var(--line)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--muted)",
                      display: "block",
                    }}
                  >
                    Price
                  </span>
                  <strong style={{ fontSize: 18, color: "var(--forest)" }}>
                    {formatPrice(activeDetailProduct.price)}
                  </strong>
                </div>

                {cart[activeDetailProduct.id] ? (
                  <div className="quantity-control">
                    <button
                      onClick={() => changeQuantity(activeDetailProduct.id, -1)}
                      aria-label="Remove one"
                    >
                      <Minus size={15} />
                    </button>
                    <span
                      className={
                        animatingQtyId === activeDetailProduct.id
                          ? "qty-increase-animation"
                          : ""
                      }
                    >
                      {cart[activeDetailProduct.id]}
                    </span>
                    <button
                      onClick={() =>
                        handleAddToCartWithAnimation(activeDetailProduct)
                      }
                      aria-label="Add one"
                      className={
                        animatingButtonId === activeDetailProduct.id
                          ? "button-star-bounce"
                          : ""
                      }
                    >
                      <Plus size={15} />
                      {animatingButtonId === activeDetailProduct.id && (
                        <span
                          className="star-burst-container"
                          aria-hidden="true"
                        >
                          <span className="star-particle star-p1">★</span>
                          <span className="star-particle star-p2">✦</span>
                          <span className="star-particle star-p3">★</span>
                          <span className="star-particle star-p4">✦</span>
                          <span className="star-particle star-p5">★</span>
                          <span className="star-particle star-p6">✨</span>
                          <span className="star-particle star-p7">★</span>
                          <span className="star-particle star-p8">✦</span>
                        </span>
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    className={`add-button ${
                      animatingButtonId === activeDetailProduct.id
                        ? "button-star-bounce"
                        : ""
                    }`}
                    style={{ minWidth: 120, height: 40, fontSize: 13 }}
                    onClick={() => {
                      handleAddToCartWithAnimation(activeDetailProduct);
                    }}
                  >
                    <Plus size={16} /> Add to Bag
                    {animatingButtonId === activeDetailProduct.id && (
                      <span className="star-burst-container" aria-hidden="true">
                        <span className="star-particle star-p1">★</span>
                        <span className="star-particle star-p2">✦</span>
                        <span className="star-particle star-p3">★</span>
                        <span className="star-particle star-p4">✦</span>
                        <span className="star-particle star-p5">★</span>
                        <span className="star-particle star-p6">✨</span>
                        <span className="star-particle star-p7">★</span>
                        <span className="star-particle star-p8">✦</span>
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cold Chain Delivery Callout Section */}
      <section className="delivery-callout" id="cold-chain">
        <div className="delivery-icon">
          <Truck size={25} aria-hidden="true" />
        </div>
        <div>
          <p className="eyebrow">
            DOORSTEP FRESH DELIVERY · CURRENTLY IN BHIWANI (EXPANDING SOON
            PAN-INDIA)
          </p>
          <h2>
            Delivered cold to your doorstep, <span>anywhere you are.</span>
          </h2>
          <p>
            We deliver 100% raw packed juices to homes and offices across
            Bhiwani (expanding across India soon). Freshly prepared with zero
            added sugar and zero water, delivered fresh and cold to keep every
            sip pure.
          </p>
        </div>
        <a href="#juices" className="text-link">
          Browse all juices <ArrowDown size={16} aria-hidden="true" />
        </a>
      </section>

      {/* Purity & Craft Standards */}
      <section className="ingredients-section" id="standards">
        <p className="eyebrow">THE JUICEWALA PURITY GUARANTEE</p>
        <h2>Never heated. Never diluted. 100% Raw produce.</h2>
        <p>
          Conventional store juices are boiled or loaded with preservatives and
          added sugar to extend shelf-life. At JuiceWala, we extract and pack
          100% pure raw juice from fresh fruits and vegetables—zero water, zero
          preservatives, keeping pure taste and vital nutrients intact.
        </p>
      </section>

      {/* Site Footer */}
      <footer className="site-footer">
        <a
          className="brand footer-brand"
          href="#home"
          aria-label="JuiceWala home"
        >
          <span className="brand-mark">
            <Leaf size={18} aria-hidden="true" />
          </span>
          <span>JuiceWala</span>
        </a>
        <p>
          JuiceWala · 100% Raw Packed Juices Delivered Fresh in Bhiwani
          (Expanding Pan-India Soon).
        </p>
        <Link href="/contact">Support & Inquiries</Link>
        <a href="#cold-chain">
          Cold Delivery <span>Bhiwani & Expanding Soon</span>
        </a>
      </footer>

      {/* Shopping Bag Drawer */}
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
                <p className="eyebrow">COLD-CHAIN DOORSTEP DELIVERY</p>
                <h2 id="cart-title">
                  Your bag{" "}
                  <span
                    className={
                      animatingHeaderQty ? "drawer-header-qty-bounce" : ""
                    }
                  >
                    ({itemCount})
                  </span>
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

            {/* Free Shipping Progress Indicator */}
            {subtotal > 0 && (
              <div
                style={{
                  margin: "16px 0",
                  padding: "10px 14px",
                  background:
                    subtotal >= FREE_SHIPPING_THRESHOLD ? "#eaf4df" : "#fff6e5",
                  border:
                    subtotal >= FREE_SHIPPING_THRESHOLD
                      ? "1px solid #c2e0a3"
                      : "1px solid #f2ddbe",
                  borderRadius: 4,
                  fontSize: 12,
                }}
              >
                {subtotal >= FREE_SHIPPING_THRESHOLD ? (
                  <span
                    style={{
                      color: "#275e33",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Check size={16} /> You have unlocked FREE Chilled Doorstep
                    Delivery!
                  </span>
                ) : (
                  <span style={{ color: "#7a4e1d" }}>
                    Add{" "}
                    <strong>
                      {formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)}
                    </strong>{" "}
                    more for <strong>FREE Cold-Chain Delivery</strong>
                  </span>
                )}
              </div>
            )}

            {order ? (
              <div className="payment-state">
                <div className="success-mark">
                  <Check size={23} aria-hidden="true" />
                </div>
                <p className="eyebrow">
                  ORDER {order.orderId.slice(0, 8).toUpperCase()}
                </p>
                {order.paymentMethod === "razorpay" ? (
                  <>
                    <h3>
                      {order.paymentStatus === "paid"
                        ? "Payment confirmed!"
                        : "Order received!"}
                    </h3>
                    <p className="payment-disclaimer">
                      {order.paymentStatus === "paid"
                        ? `Your payment of ${formatPrice(order.amount)} is confirmed. Your fresh cold-pack will be prepared and dispatched.`
                        : `Your order is recorded. Complete your ${formatPrice(order.amount)} payment securely with Razorpay; your order will be prepared as soon as payment is confirmed.`}
                    </p>
                    {order.paymentStatus !== "paid" && (
                      <button
                        className="pay-button"
                        type="button"
                        disabled={!razorpayReady || isSubmitting}
                        onClick={() =>
                          openRazorpayCheckout(order, paymentCustomer)
                        }
                      >
                        Pay with Razorpay{" "}
                        <ChevronRight size={17} aria-hidden="true" />
                      </button>
                    )}
                    {error && (
                      <p className="form-error" role="alert">
                        {error}
                      </p>
                    )}
                    {!razorpayReady && razorpayLoadError && (
                      <p className="form-error" role="alert">
                        {razorpayLoadError}
                      </p>
                    )}
                    <p className="payment-disclaimer">
                      Need help? <Link href="/contact">Contact support</Link>.
                    </p>
                  </>
                ) : (
                  <>
                    <h3>Order confirmed!</h3>
                    <p className="payment-lead">
                      Your order total is {formatPrice(order.amount)}. Pay cash
                      upon doorstep delivery.
                    </p>
                    <p className="payment-disclaimer">
                      Payment is due on delivery. Juices are delivered in
                      safe packaging.
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
                <h3>Your bag is empty.</h3>
                <p>
                  Explore our 12 fresh-pressed botanical recipes and start your
                  daily wellness ritual.
                </p>
                <button className="pay-button" onClick={handleBrowseJuices}>
                  Browse Juices <ChevronRight size={17} />
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
                        <span>{formatPrice(item.price)}</span>
                        <div className="quantity-control compact">
                          <button
                            onClick={() => handleUpdateBagQuantity(item, -1)}
                            aria-label={`Remove one ${item.name}`}
                          >
                            <Minus size={13} />
                          </button>
                          <span
                            className={
                              animatingQtyId === item.id
                                ? "qty-increase-animation"
                                : ""
                            }
                          >
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateBagQuantity(item, 1)}
                            aria-label={`Add one ${item.name}`}
                            className={
                              animatingButtonId === `bag-${item.id}`
                                ? "button-star-bounce"
                                : ""
                            }
                          >
                            <Plus size={13} />
                            {animatingButtonId === `bag-${item.id}` && (
                              <span
                                className="star-burst-container"
                                aria-hidden="true"
                              >
                                <span className="star-particle star-p1">★</span>
                                <span className="star-particle star-p2">✦</span>
                                <span className="star-particle star-p3">★</span>
                                <span className="star-particle star-p4">✦</span>
                                <span className="star-particle star-p5">★</span>
                                <span className="star-particle star-p6">✨</span>
                                <span className="star-particle star-p7">★</span>
                                <span className="star-particle star-p8">✦</span>
                              </span>
                            )}
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
                    <span>
                      Chilled Cold-Chain Shipping{" "}
                      {deliveryFee === 0 && "(Free above ₹499)"}
                    </span>
                    <strong>
                      {deliveryFee === 0 ? "FREE" : formatPrice(deliveryFee)}
                    </strong>
                  </div>
                  <div className="cart-grand-total">
                    <span>Total</span>
                    <strong>{formatPrice(total)}</strong>
                  </div>
                </div>

                <p className="cart-delivery-note">
                  <Snowflake size={15} aria-hidden="true" /> Guaranteed fresh
                  cold delivery across all areas in Bhiwani only.
                </p>

                {!currentUser ? (
                  <div className="checkout-auth-card">
                    <div className="checkout-auth-header">
                      <div className="checkout-auth-icon-wrap">
                        <ShieldCheck size={22} aria-hidden="true" />
                      </div>
                      <div>
                        <h3>Login to Confirm Order</h3>
                        <p>
                          Verify your 10-digit mobile number with OTP before placing your cold juice order.
                        </p>
                      </div>
                    </div>

                    {!otpSent ? (
                      <div className="checkout-auth-body">
                        <label className="checkout-auth-label">
                          10-digit Mobile number
                          <div className="phone-prefix-group">
                            <span className="phone-prefix">+91</span>
                            <input
                              type="tel"
                              inputMode="numeric"
                              maxLength={10}
                              value={authPhone}
                              onChange={(e) =>
                                setAuthPhone(e.target.value.replace(/\D/g, ""))
                              }
                              placeholder="Enter 10-digit mobile number"
                              className="auth-input-phone"
                            />
                          </div>
                        </label>

                        {authError && (
                          <p className="auth-error-msg">{authError}</p>
                        )}
                        {authSuccessMsg && (
                          <p className="auth-success-msg">{authSuccessMsg}</p>
                        )}

                        <button
                          type="button"
                          className="auth-primary-btn"
                          disabled={isSendingOtp || authPhone.length !== 10}
                          onClick={() => handleSendOtp()}
                        >
                          {isSendingOtp
                            ? "Sending OTP..."
                            : "Send OTP to Mobile"}
                        </button>
                      </div>
                    ) : (
                      <div className="checkout-auth-body">
                        <div className="auth-phone-tag">
                          <span>
                            OTP sent to <strong>+91 {authPhone}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setOtpSent(false);
                              setAuthOtp("");
                              setAuthError("");
                              setDemoOtpNotice(null);
                            }}
                            className="auth-change-link"
                          >
                            Change Number
                          </button>
                        </div>

                        {demoOtpNotice && (
                          <div className="demo-otp-banner">
                            <span>
                              Demo Mode OTP: <strong>{demoOtpNotice}</strong>
                            </span>
                            <button
                              type="button"
                              className="demo-autofill-btn"
                              onClick={() => setAuthOtp(demoOtpNotice)}
                            >
                              Auto-fill OTP
                            </button>
                          </div>
                        )}

                        <label className="checkout-auth-label">
                          Enter 6-digit OTP
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={authOtp}
                            onChange={(e) =>
                              setAuthOtp(e.target.value.replace(/\D/g, ""))
                            }
                            placeholder="Enter 6-digit code"
                            className="auth-input-otp"
                            autoFocus
                          />
                        </label>

                        {authError && (
                          <p className="auth-error-msg">{authError}</p>
                        )}
                        {authSuccessMsg && (
                          <p className="auth-success-msg">{authSuccessMsg}</p>
                        )}

                        <div className="auth-actions-row">
                          <button
                            type="button"
                            className="auth-primary-btn"
                            disabled={isVerifyingOtp || authOtp.length !== 6}
                            onClick={() => handleVerifyOtp()}
                          >
                            {isVerifyingOtp
                              ? "Verifying..."
                              : "Verify OTP & Continue"}
                          </button>

                          <button
                            type="button"
                            className="auth-resend-btn"
                            disabled={otpCooldown > 0 || isSendingOtp}
                            onClick={() => handleSendOtp()}
                          >
                            {otpCooldown > 0
                              ? `Resend in ${otpCooldown}s`
                              : "Resend OTP"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="checkout-logged-in-bar">
                      <div className="logged-in-info">
                        <CheckCircle2
                          size={16}
                          className="logged-in-check"
                          aria-hidden="true"
                        />
                        <span>
                          Verified Mobile:{" "}
                          <strong>+91 {currentUser.phone}</strong>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="logged-in-logout-link"
                        title="Logout / Change number"
                      >
                        Change
                      </button>
                    </div>

                    <form className="checkout-form" onSubmit={submitOrder}>
                      <p className="eyebrow">
                        WHERE SHOULD WE DELIVER YOUR JUICE?
                      </p>

                      <label>
                        Full name
                        <input
                          autoComplete="name"
                          name="name"
                          required
                          maxLength={80}
                          placeholder="Receiver's name"
                        />
                      </label>

                      <label>
                        10-digit Mobile number (Verified)
                        <input
                          autoComplete="tel"
                          name="phone"
                          type="tel"
                          required
                          readOnly
                          value={currentUser.phone}
                          className="input-verified-locked"
                        />
                      </label>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                    }}
                  >
                    <label>
                      City / District
                      <input
                        name="city"
                        required
                        maxLength={50}
                        value={cityInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCityInput(val);
                          if (
                            val.trim() &&
                            !isBhiwaniLocation(val, pincodeInput)
                          ) {
                            setRestrictedCityEntered(val.trim());
                            setShowLocationRestrictionModal(true);
                          }
                        }}
                        placeholder="Bhiwani"
                      />
                    </label>

                    <label>
                      PIN code
                      <input
                        inputMode="numeric"
                        name="pincode"
                        required
                        pattern="[0-9]{6}"
                        maxLength={6}
                        value={pincodeInput}
                        onChange={(e) => {
                          const val = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 6);
                          setPincodeInput(val);
                          if (val.length === 6 && !val.startsWith("127")) {
                            setRestrictedCityEntered(
                              cityInput.trim().toLowerCase() !== "bhiwani" &&
                                cityInput.trim()
                                ? cityInput.trim()
                                : `PIN ${val}`,
                            );
                            setShowLocationRestrictionModal(true);
                          }
                        }}
                        placeholder="e.g. 127021"
                      />
                    </label>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 11,
                      color: "#275e33",
                      background: "#f4f8ed",
                      border: "1px solid #d9e7cb",
                      borderRadius: 4,
                      padding: "6px 10px",
                      marginTop: -4,
                      marginBottom: 12,
                    }}
                  >
                    <MapPin size={13} aria-hidden="true" />
                    <span>
                      Service currently available in{" "}
                      <strong>Bhiwani only</strong> (PIN codes starting with
                      127)
                    </span>
                  </div>

                  <label>
                    Complete Delivery address
                    <textarea
                      autoComplete="street-address"
                      name="address"
                      required
                      minLength={8}
                      maxLength={250}
                      rows={2}
                      placeholder="House / Flat No., Street, Landmark, Area"
                    />
                  </label>

                  {/* Payment Options */}
                  <fieldset className="payment-options">
                    <legend>Payment Method</legend>
                    <label className="payment-option">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="razorpay"
                        checked={paymentMethod === "razorpay"}
                        onChange={() => setPaymentMethod("razorpay")}
                      />
                      <span>
                        Pay Online with Razorpay (UPI, Cards, Netbanking)
                      </span>
                    </label>
                    <label className="payment-option">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cod"
                        checked={paymentMethod === "cod"}
                        onChange={() => setPaymentMethod("cod")}
                      />
                      <span>Cash on Delivery (COD)</span>
                    </label>
                  </fieldset>

                  {(error ||
                    (paymentMethod === "razorpay" && razorpayLoadError)) && (
                    <p className="form-error" role="alert">
                      {error || razorpayLoadError}
                    </p>
                  )}

                  <button
                    className="pay-button checkout-button"
                    type="submit"
                    disabled={
                      isSubmitting ||
                      (paymentMethod === "razorpay" && !razorpayReady)
                    }
                  >
                    {isSubmitting ? (
                      "Preparing your cold order..."
                    ) : (
                      <>
                        {paymentMethod === "razorpay"
                          ? "Continue to Secure Payment"
                          : "Place Cash on Delivery Order"}{" "}
                        <ChevronRight size={17} aria-hidden="true" />
                      </>
                    )}
                  </button>
                  <p className="secure-note">
                    {paymentMethod === "razorpay"
                      ? razorpayReady
                        ? "Encrypted Razorpay checkout opens after your order is created."
                        : "Loading secure payment gateway..."
                      : "Pay cash upon cold doorstep delivery."}
                  </p>
                </form>
              </>
            )}
          </>
        )}
          </aside>
        </div>
      )}

      {/* Customer-Friendly Location Restriction Modal */}
      {showLocationRestrictionModal && (
        <div
          className="drawer-backdrop"
          style={{
            zIndex: 1200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setShowLocationRestrictionModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-restriction-title"
            style={{
              background: "#ffffff",
              borderRadius: 14,
              maxWidth: 420,
              width: "100%",
              padding: "28px 24px 22px",
              textAlign: "center",
              boxShadow: "0 24px 48px rgba(0,0,0,0.3)",
              border: "1px solid #e1ebda",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowLocationRestrictionModal(false)}
              aria-label="Close"
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#6b7d6e",
                padding: 4,
              }}
            >
              <X size={20} />
            </button>

            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: "50%",
                background: "#f1f7e9",
                color: "#183b2b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <MapPin size={30} />
            </div>

            <h3
              id="location-restriction-title"
              style={{
                margin: "0 0 10px",
                fontSize: 21,
                fontWeight: 700,
                color: "#183b2b",
              }}
            >
              Available in Bhiwani Only
            </h3>

            <p
              style={{
                margin: "0 0 10px",
                fontSize: 14,
                lineHeight: 1.55,
                color: "#2f3d32",
                fontWeight: 500,
              }}
            >
              We are currently delivering our 100% fresh, raw packed juices
              exclusively within <strong>Bhiwani</strong> (PIN codes starting
              with <strong>127</strong>).
            </p>

            <p
              style={{
                margin: "0 0 22px",
                fontSize: 13,
                lineHeight: 1.5,
                color: "#6b7d6e",
              }}
            >
              {restrictedCityEntered
                ? `Thank you for your interest from ${restrictedCityEntered}! We are rapidly expanding our delivery network and will start serving your area very soon.`
                : "Thank you for your interest! We will expand our doorstep cold delivery services to other cities across India soon."}
            </p>

            <button
              type="button"
              onClick={() => {
                setCityInput("Bhiwani");
                if (pincodeInput && !pincodeInput.startsWith("127")) {
                  setPincodeInput("");
                }
                setShowLocationRestrictionModal(false);
              }}
              style={{
                width: "100%",
                padding: "13px 20px",
                background: "#183b2b",
                color: "#f8fbf4",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Deliver to Bhiwani
            </button>
          </div>
        </div>
      )}

      {/* Order History Drawer */}
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
                <p className="eyebrow">YOUR PAST JUICE ORDERS</p>
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
              Order history is stored locally on this browser. You can update,
              cancel, or delete past orders below.
            </p>

            {orderNotice && (
              <div
                style={{
                  margin: "8px 0 14px",
                  padding: "8px 12px",
                  background: "#eaf4df",
                  border: "1px solid #c2e0a3",
                  borderRadius: 4,
                  fontSize: 11,
                  color: "#235c2e",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>{orderNotice}</span>
                <button
                  onClick={() => setOrderNotice("")}
                  style={{
                    border: 0,
                    background: "transparent",
                    color: "inherit",
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  ×
                </button>
              </div>
            )}

            {orders.length === 0 ? (
              <div className="empty-bag">
                <span className="empty-bag-icon">
                  <ClipboardList size={25} />
                </span>
                <h3>No past orders yet.</h3>
                <p>Your confirmed orders will appear here.</p>
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

                    {/* Status Badge */}
                    <div>
                      {savedOrder.paymentStatus === "cancelled" ? (
                        <span className="order-status-badge cancelled">
                          <Ban size={12} /> Cancelled / रद्द किया गया
                        </span>
                      ) : savedOrder.paymentMethod === "razorpay" ? (
                        savedOrder.paymentStatus === "paid" ? (
                          <span className="order-status-badge paid">
                            <Check size={12} /> Razorpay · Paid & Confirmed
                          </span>
                        ) : (
                          <span className="order-status-badge pending">
                            <AlertTriangle size={12} /> Razorpay · Payment
                            Pending
                          </span>
                        )
                      ) : savedOrder.paymentMethod === "upi" ? (
                        <span className="order-status-badge pending">
                          <AlertTriangle size={12} /> UPI · Verification Pending
                        </span>
                      ) : (
                        <span className="order-status-badge cod">
                          <Truck size={12} /> Cash on delivery · Confirmed
                        </span>
                      )}
                    </div>

                    {/* Customer Details (if present) */}
                    {savedOrder.customer && (
                      <div className="saved-order-customer">
                        <strong>Deliver to: </strong>
                        {savedOrder.customer.name} ({savedOrder.customer.phone})
                        <br />
                        <span style={{ color: "var(--muted)" }}>
                          {savedOrder.customer.address}
                        </span>
                      </div>
                    )}

                    {/* Items List */}
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

                    {/* Total & Timestamps */}
                    <div className="saved-order-total">
                      <span>Total</span>
                      <strong>{formatPrice(savedOrder.amount)}</strong>
                    </div>

                    {savedOrder.updatedAt && (
                      <div
                        style={{
                          fontSize: 9,
                          color: "var(--muted)",
                          marginTop: 4,
                          textAlign: "right",
                        }}
                      >
                        Updated:{" "}
                        {new Intl.DateTimeFormat("en-IN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(savedOrder.updatedAt))}
                      </div>
                    )}

                    {/* Action Buttons: Update, Cancel, Delete */}
                    <div className="saved-order-actions">
                      <button
                        className="order-action-btn edit"
                        onClick={() => openEditOrderModal(savedOrder)}
                        disabled={orderActionLoading === savedOrder.orderId}
                        title="Update delivery details or item quantities"
                      >
                        <Pencil size={12} /> Update / एडिट
                      </button>

                      {savedOrder.paymentStatus !== "cancelled" && (
                        <button
                          className="order-action-btn cancel"
                          onClick={() => handleCancelOrder(savedOrder.orderId)}
                          disabled={orderActionLoading === savedOrder.orderId}
                          title="Cancel this order"
                        >
                          <Ban size={12} /> Cancel / रद्द करें
                        </button>
                      )}

                      <button
                        className="order-action-btn delete"
                        onClick={() => handleDeleteOrder(savedOrder.orderId)}
                        disabled={orderActionLoading === savedOrder.orderId}
                        title="Remove order from history"
                      >
                        <Trash2 size={12} /> Delete / हटाएं
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Edit Order Modal Dialog */}
      {editingOrder && (
        <div
          className="drawer-backdrop"
          onMouseDown={(e) =>
            e.target === e.currentTarget && setEditingOrder(null)
          }
          style={{ zIndex: 30 }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-order-title"
            style={{
              width: "min(100%, 540px)",
              maxHeight: "90vh",
              overflowY: "auto",
              margin: "auto",
              background: "var(--paper)",
              padding: "26px",
              borderRadius: 8,
              boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: "1px solid var(--line)",
              }}
            >
              <div>
                <p className="eyebrow">UPDATE ORDER DETAILS</p>
                <h3
                  id="edit-order-title"
                  style={{
                    margin: 0,
                    fontFamily: "var(--serif)",
                    fontSize: 24,
                  }}
                >
                  Order #{editingOrder.orderId.slice(0, 8).toUpperCase()}
                </h3>
              </div>
              <button
                className="icon-button"
                onClick={() => setEditingOrder(null)}
                aria-label="Close edit modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveOrderUpdate}>
              <div style={{ display: "grid", gap: 12 }}>
                <label
                  style={{
                    display: "grid",
                    gap: 4,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Receiver Name
                  <input
                    required
                    value={editCustomer.name}
                    onChange={(e) =>
                      setEditCustomer({
                        ...editCustomer,
                        name: e.target.value,
                      })
                    }
                    placeholder="Receiver's name"
                    style={{
                      padding: "8px 12px",
                      borderRadius: 4,
                      border: "1px solid var(--line)",
                      fontSize: 13,
                    }}
                  />
                </label>

                <label
                  style={{
                    display: "grid",
                    gap: 4,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  10-Digit Mobile Number
                  <input
                    required
                    type="tel"
                    pattern="[0-9]{10}"
                    value={editCustomer.phone}
                    onChange={(e) =>
                      setEditCustomer({
                        ...editCustomer,
                        phone: e.target.value,
                      })
                    }
                    placeholder="10-digit mobile number"
                    style={{
                      padding: "8px 12px",
                      borderRadius: 4,
                      border: "1px solid var(--line)",
                      fontSize: 13,
                    }}
                  />
                </label>

                <label
                  style={{
                    display: "grid",
                    gap: 4,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Delivery Address & Preferred Slot
                  <textarea
                    required
                    rows={3}
                    value={editCustomer.address}
                    onChange={(e) =>
                      setEditCustomer({
                        ...editCustomer,
                        address: e.target.value,
                      })
                    }
                    placeholder="House, Street, City, PIN code, Slot preference"
                    style={{
                      padding: "8px 12px",
                      borderRadius: 4,
                      border: "1px solid var(--line)",
                      fontSize: 13,
                    }}
                  />
                </label>
              </div>

              {/* Editable Items List (if order is not cancelled) */}
              {editingOrder.paymentStatus !== "cancelled" && (
                <div style={{ marginTop: 20 }}>
                  <p className="eyebrow" style={{ marginBottom: 8 }}>
                    MODIFY ORDER ITEMS & QUANTITIES
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gap: 8,
                      background: "var(--white)",
                      padding: 12,
                      borderRadius: 6,
                      border: "1px solid var(--line)",
                    }}
                  >
                    {editItems.map((item) => {
                      const product = products.find((p) => p.id === item.id);
                      return (
                        <div
                          key={item.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "6px 0",
                            borderBottom: "1px solid #f0f3eb",
                          }}
                        >
                          <div>
                            <strong style={{ display: "block", fontSize: 12 }}>
                              {product?.name || item.id}
                            </strong>
                            <span
                              style={{ fontSize: 10, color: "var(--muted)" }}
                            >
                              {formatPrice(product?.price || 0)}
                            </span>
                          </div>

                          <div className="quantity-control compact">
                            <button
                              type="button"
                              onClick={() =>
                                changeEditItemQuantity(item.id, -1)
                              }
                              aria-label="Decrease quantity"
                            >
                              <Minus size={13} />
                            </button>
                            <span>{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => changeEditItemQuantity(item.id, 1)}
                              aria-label="Increase quantity"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pricing preview */}
                  {(() => {
                    const previewSubtotal = editItems.reduce((sum, item) => {
                      const prod = products.find((p) => p.id === item.id);
                      return sum + (prod?.price || 0) * item.quantity;
                    }, 0);
                    const previewDelivery =
                      previewSubtotal >= FREE_SHIPPING_THRESHOLD
                        ? 0
                        : STANDARD_SHIPPING_FEE;
                    const previewTotal = previewSubtotal + previewDelivery;

                    return (
                      <div
                        style={{
                          marginTop: 10,
                          fontSize: 11,
                          display: "flex",
                          justifyContent: "space-between",
                          color: "var(--forest)",
                        }}
                      >
                        <span>
                          Subtotal:{" "}
                          <strong>{formatPrice(previewSubtotal)}</strong> +
                          Delivery:{" "}
                          <strong>
                            {previewDelivery === 0
                              ? "FREE"
                              : formatPrice(previewDelivery)}
                          </strong>
                        </span>
                        <span>
                          New Total:{" "}
                          <strong style={{ fontSize: 13 }}>
                            {formatPrice(previewTotal)}
                          </strong>
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}

              {editError && (
                <p
                  className="form-error"
                  role="alert"
                  style={{ marginTop: 12 }}
                >
                  {editError}
                </p>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 20,
                  paddingTop: 14,
                  borderTop: "1px solid var(--line)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 4,
                    border: "1px solid var(--line)",
                    background: "transparent",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="pay-button"
                  style={{
                    padding: "8px 20px",
                    minHeight: "auto",
                    fontSize: 12,
                  }}
                >
                  {isSubmittingEdit
                    ? "Saving Changes..."
                    : "Save Updates / अपडेट करें"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Bottom-Right Cart Notification Popup with Go to Cart Button */}
      {cartToast && (
        <aside className="cart-toast-popup" role="status" aria-live="polite">
          {cartToast.product.image ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={cartToast.product.image}
              alt={cartToast.product.name}
              className="cart-toast-thumb"
            />
          ) : (
            <div className="cart-toast-thumb-fallback">
              <Leaf size={22} />
            </div>
          )}

          <div className="cart-toast-content">
            <p className="cart-toast-status">
              <Check size={13} strokeWidth={3} /> Added to bag!
            </p>
            <p className="cart-toast-title" title={cartToast.product.name}>
              {cartToast.product.name}
            </p>
            <p className="cart-toast-sub">
              {formatPrice(cartToast.product.price)} ·{" "}
              <span key={cartToast.quantity} className="cart-toast-qty-pop">
                {cartToast.quantity} in bag
              </span>
            </p>
          </div>

          <button
            type="button"
            className="cart-toast-btn"
            onClick={() => {
              openCart();
            }}
          >
            Go to Cart <ChevronRight size={14} />
          </button>

          <button
            type="button"
            className="cart-toast-close"
            onClick={() => setCartToast(null)}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </aside>
      )}

      {/* Standalone Login / Sign Up Modal */}
      {isAuthModalOpen && (
        <div
          className="drawer-backdrop"
          style={{
            zIndex: 1200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onMouseDown={(e) =>
            e.target === e.currentTarget && setIsAuthModalOpen(false)
          }
        >
          <div
            className="auth-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
          >
            <div className="auth-modal-header">
              <div className="auth-modal-header-left">
                <div className="auth-modal-icon-badge">
                  <ShieldCheck size={24} aria-hidden="true" />
                </div>
                <div>
                  <h3 id="auth-modal-title">JuiceWala Login / Sign Up</h3>
                  <p className="auth-modal-subtitle">
                    Enter your mobile number to sign in or create an account with OTP
                  </p>
                </div>
              </div>
              <button
                className="icon-button modal-close"
                onClick={() => setIsAuthModalOpen(false)}
                aria-label="Close login dialog"
              >
                <X size={20} />
              </button>
            </div>

            {!otpSent ? (
              <div className="auth-modal-body">
                <label className="checkout-auth-label">
                  10-digit Mobile number
                  <div className="phone-prefix-group">
                    <span className="phone-prefix">+91</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={authPhone}
                      onChange={(e) =>
                        setAuthPhone(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="Enter mobile number"
                      className="auth-input-phone"
                      autoFocus
                    />
                  </div>
                </label>

                {authError && <p className="auth-error-msg">{authError}</p>}
                {authSuccessMsg && (
                  <p className="auth-success-msg">{authSuccessMsg}</p>
                )}

                <button
                  type="button"
                  className="auth-primary-btn"
                  disabled={isSendingOtp || authPhone.length !== 10}
                  onClick={() => handleSendOtp()}
                >
                  {isSendingOtp ? "Sending OTP..." : "Get OTP on Mobile →"}
                </button>
              </div>
            ) : (
              <div className="auth-modal-body">
                <div className="auth-phone-tag">
                  <span>
                    OTP sent to <strong>+91 {authPhone}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setAuthOtp("");
                      setAuthError("");
                      setDemoOtpNotice(null);
                    }}
                    className="auth-change-link"
                  >
                    Change Number
                  </button>
                </div>

                {demoOtpNotice && (
                  <div className="demo-otp-banner">
                    <span>
                      Demo Mode OTP: <strong>{demoOtpNotice}</strong>
                    </span>
                    <button
                      type="button"
                      className="demo-autofill-btn"
                      onClick={() => setAuthOtp(demoOtpNotice)}
                    >
                      Auto-fill OTP
                    </button>
                  </div>
                )}

                <label className="checkout-auth-label">
                  Enter 6-digit OTP
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={authOtp}
                    onChange={(e) =>
                      setAuthOtp(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="Enter 6-digit code"
                    className="auth-input-otp"
                    autoFocus
                  />
                </label>

                {authError && <p className="auth-error-msg">{authError}</p>}
                {authSuccessMsg && (
                  <p className="auth-success-msg">{authSuccessMsg}</p>
                )}

                <div className="auth-actions-row">
                  <button
                    type="button"
                    className="auth-primary-btn"
                    disabled={isVerifyingOtp || authOtp.length !== 6}
                    onClick={() => handleVerifyOtp()}
                  >
                    {isVerifyingOtp ? "Verifying..." : "Verify & Sign In"}
                  </button>

                  <button
                    type="button"
                    className="auth-resend-btn"
                    disabled={otpCooldown > 0 || isSendingOtp}
                    onClick={() => handleSendOtp()}
                  >
                    {otpCooldown > 0
                      ? `Resend in ${otpCooldown}s`
                      : "Resend OTP"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Invisible container for Google Firebase Phone Auth reCAPTCHA */}
      <div id="recaptcha-container" />
    </main>
  );
}
