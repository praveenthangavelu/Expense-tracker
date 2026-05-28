export const JUNK_FOOD_KEYWORDS = [
  "pizza", "burger", "fries", "chips", "coke", "pepsi", "soda", "candy",
  "chocolate", "ice cream", "fried", "maggi", "noodles", "instant",
  "samosa", "pakora", "vada pav", "bhaji", "pani puri", "chaat",
  "biryani", "momos", "roll", "wrap", "shawarma", "kebab",
  "mcdonald", "mcdonalds", "kfc", "dominos", "domino's", "subway",
  "burger king", "pizza hut", "zomato", "swiggy",
  "cake", "pastry", "donut", "brownie", "milkshake", "frappe",
  "energy drink", "redbull", "monster"
];

export const JUNK_SUBCATEGORIES = [
  "Fast Food",
  "Street Food",
  "Online Food Delivery",
  "Sweets / Desserts",
  "Snacks / Packaged"
];

export const HEALTHY_SUBCATEGORIES = [
  "Home Cooked",
  "Groceries",
  "Fruits"
];

/**
 * Classify food subcategory and note into health tiers
 */
export const classifyFood = (subCategory, note) => {
  const normSub = subCategory || "";
  const normNote = (note || "").toLowerCase();

  if (JUNK_SUBCATEGORIES.includes(normSub)) {
    return "junk";
  }
  if (HEALTHY_SUBCATEGORIES.includes(normSub)) {
    return "healthy";
  }

  // Check notes for partial keyword match
  const matchesKeyword = JUNK_FOOD_KEYWORDS.some(kw => normNote.includes(kw));
  if (matchesKeyword) {
    return "junk";
  }

  return "neutral";
};

/**
 * Get healthier alternative suggestions based on food category and notes
 */
export const getHealthAlternative = (subCategory, note, amount, stats = {}) => {
  const normSub = subCategory || "";
  const normNote = (note || "").toLowerCase();

  const isJunk = classifyFood(subCategory, note) === "junk";
  if (!isJunk) {
    return { isJunk: false, classification: "healthy_or_neutral", tip: null, saving: null };
  }

  // Calculate dynamic savings with safety guards
  const amountDiff = amount > 60 ? Math.round(amount - 60) : Math.round(amount * 0.7);
  const weekSaving = Math.round((amount > 50 ? amount - 50 : amount * 0.6) * 3);
  const monthWaste = stats.monthWaste || Math.round(65 * 6);
  const monthTotal = stats.monthTotal || Math.round(amount * 4);

  // Group by category/keywords
  let categoryKey = "Fast Food";
  let junkEmoji = "🍔";
  let healthyEmoji = "🥗";

  if (normSub === "Street Food" || normNote.includes("samosa") || normNote.includes("pakora") || normNote.includes("chaat") || normNote.includes("vada")) {
    categoryKey = "Street Food";
    junkEmoji = "🍢";
    healthyEmoji = "🌱";
  } else if (normSub === "Online Food Delivery" || normNote.includes("zomato") || normNote.includes("swiggy")) {
    categoryKey = "Online Food Delivery";
    junkEmoji = "🛵";
    healthyEmoji = "🍱";
  } else if (normSub === "Sweets / Desserts" || normNote.includes("cake") || normNote.includes("ice cream") || normNote.includes("chocolate") || normNote.includes("donut")) {
    categoryKey = "Sweets / Desserts";
    junkEmoji = "🍰";
    healthyEmoji = "🍯";
  } else if (normSub === "Snacks / Packaged" || normNote.includes("chips") || normNote.includes("maggi") || normNote.includes("noodles")) {
    categoryKey = "Snacks / Packaged";
    junkEmoji = "🍪";
    healthyEmoji = "🥜";
  } else if (normNote.includes("coke") || normNote.includes("pepsi") || normNote.includes("soda") || normNote.includes("energy drink") || normNote.includes("redbull")) {
    categoryKey = "Beverages";
    junkEmoji = "🥤";
    healthyEmoji = "🥛";
  } else if (normSub === "Cafe / Coffee" || normNote.includes("coffee") || normNote.includes("cafe") || normNote.includes("frappe") || normNote.includes("starbucks")) {
    categoryKey = "Cafe / Coffee";
    junkEmoji = "☕";
    healthyEmoji = "🍵";
  }

  const alternativeMap = {
    "Fast Food": [
      { tip: "A homemade paneer wrap costs ~₹40 and has 3x more protein than a burger 💪", saving: `~₹${Math.max(0, amount - 40)}/meal` },
      { tip: "Try a grilled chicken salad — same satisfaction, half the calories 🥗", saving: null },
      { tip: "Craving burgers? A homemade smash burger costs ₹60 vs ₹200 outside 🏠", saving: `~₹${Math.max(0, amount - 60)}/meal` }
    ],
    "Street Food": [
      { tip: "Roasted makhana (fox nuts) give the same crunch as chips with way less oil 🌰", saving: null },
      { tip: "Try sprout chaat instead — same tangy taste, packed with protein 🌱", saving: null },
      { tip: "Air-fried samosas at home = same taste, 70% less oil 🍳", saving: `~₹${amountDiff}` }
    ],
    "Online Food Delivery": [
      { tip: `That ₹${amount} order could make 3 home meals. Meal prep Sunday saves ₹${weekSaving}/week 📦`, saving: `₹${weekSaving}/week` },
      { tip: `Delivery fees + packaging = ₹50-80 per order. That's ₹${monthWaste}/month on just fees 🛵`, saving: `₹${monthWaste}/month` },
      { tip: "Try batch cooking — 2 hours on Sunday replaces 5 delivery orders 🍱", saving: null }
    ],
    "Sweets / Desserts": [
      { tip: "Frozen banana + cocoa in a blender = guilt-free ice cream at ₹15 🍌", saving: `~₹${Math.max(0, amount - 15)}` },
      { tip: "Dates + nuts make a natural energy bar that's cheaper and healthier 🌴", saving: null },
      { tip: "Greek yogurt + honey + fruits = dessert that actually fuels you 🍯", saving: null }
    ],
    "Snacks / Packaged": [
      { tip: "Roasted chana costs ₹20/pack vs ₹40 for chips — more protein, less guilt 💰", saving: "₹20/pack" },
      { tip: "Trail mix from bulk store: ₹80 for a week's snacks vs ₹40/day on packets 🥜", saving: `~₹${Math.max(0, amount * 7 - 80)}/week` },
      { tip: "Banana + peanut butter = the ultimate ₹15 snack that actually fills you up 🍌", saving: null }
    ],
    "Beverages": [
      { tip: "Lemon water + honey = ₹5 and more energy than a ₹40 coke 🍋", saving: `₹${Math.max(0, amount - 5)}/drink` },
      { tip: "Green tea at home costs ₹3/cup vs ₹150 cafe latte ☕", saving: `₹${Math.max(0, amount - 3)}/cup` },
      { tip: "Buttermilk (chaas) costs ₹10 and is better for digestion than any soda 🥛", saving: null }
    ],
    "Cafe / Coffee": [
      { tip: "A french press at home: ₹15/cup vs ₹250 at a cafe. Pays for itself in a week ☕", saving: `₹${Math.max(0, amount - 15)}/cup` },
      { tip: `You've spent ₹${monthTotal} on cafes this month — that's a month of groceries for some 🤔`, saving: null }
    ]
  };

  const alternatives = alternativeMap[categoryKey] || alternativeMap["Fast Food"];
  const randomAlt = alternatives[Math.floor(Math.random() * alternatives.length)];

  return {
    isJunk: true,
    classification: categoryKey,
    tip: randomAlt.tip,
    saving: randomAlt.saving,
    healthyEmoji,
    junkEmoji
  };
};
