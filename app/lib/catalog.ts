export type CatalogItem = {
  name: string;
  price: number;
};

// Central source of truth for juice names and base prices
export const JUICE_CATALOG: Record<string, CatalogItem> = {
  "sweet-lime": { name: "Pure Sweet Lime (ताज़ा मौसंबी जूस)", price: 50 },
  "ruby-roots": { name: "Beet & Carrot (चुकंदर-गाजर जूस)", price: 30 },
  "pomegranate-pure": {
    name: "Royal Pomegranate Elixir (अनार का जूस)",
    price: 150,
  },
  "sugarcane-pure": { name: "Pure Sugarcane (ताज़ा गन्ने का जूस)", price: 40 },
  "coconut-water": {
    name: "Pure Tender Coconut Water (ताज़ा नारियल पानी)",
    price: 60,
  },
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
  "green-juice": { name: "Herbal Green Vitality", price: 60 },
  "celery-detox": { name: "Celery Deep Cleanse", price: 110 },
  "valencia-orange": { name: "Valencia Sunshine Orange", price: 110 },
  "watermelon-mint": { name: "Crimson Watermelon & Mint", price: 80 },
  "golden-glow": { name: "Golden Carrot & Ginger", price: 90 },
  "coconut-aloe": { name: "Tender Coconut & Aloe Vera", price: 95 },
  "pineapple-digest": { name: "Pineapple Bromelain Digest", price: 100 },
  "ginger-immunity-shot": { name: "Fiery Ginger & Turmeric Tonic", price: 70 },
  "jamun-metabolic": { name: "Wild Jamun & Amla Balance", price: 110 },
};
