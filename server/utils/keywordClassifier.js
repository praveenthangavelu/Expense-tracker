const KEYWORD_MAP = {
  food: [
    { keywords: ["breakfast", "lunch", "dinner", "brunch", "tiffin", "meal", "thali", "buffet"], subCategory: null },
    { keywords: ["samosa", "pakora", "pani puri", "golgappa", "chaat", "vada pav", "bhaji", "pav bhaji", "dosa", "idli", "momos", "roll", "shawarma", "kebab", "tikka", "tandoori"], subCategory: "Street Food" },
    { keywords: ["pizza", "burger", "fries", "fried chicken", "nuggets", "hotdog", "wrap", "noodles", "maggi", "instant"], subCategory: "Fast Food" },
    { keywords: ["coffee", "chai", "tea", "latte", "cappuccino", "espresso", "cafe", "cafeteria"], subCategory: "Cafe / Coffee" },
    { keywords: ["grocery", "vegetables", "fruits", "rice", "atta", "dal", "oil", "milk", "eggs", "bread", "butter", "cheese", "supermarket", "kirana"], subCategory: "Groceries" },
    { keywords: ["ice cream", "cake", "pastry", "brownie", "donut", "sweet", "mithai", "gulab jamun", "rasgulla", "jalebi", "chocolate", "candy"], subCategory: "Sweets / Desserts" },
    { keywords: ["coke", "pepsi", "soda", "juice", "smoothie", "milkshake", "lassi", "buttermilk", "chaas", "energy drink", "redbull", "monster", "beer", "wine", "whisky", "vodka", "rum"], subCategory: "Beverages" },
    { keywords: ["delivery", "order online", "home delivery", "food order"], subCategory: "Online Food Delivery" },
    { keywords: ["home cooked", "homemade", "cooking", "ingredients"], subCategory: "Home Cooked" },
    { keywords: ["restaurant", "hotel", "dine in", "dining", "dine-in", "eat out", "eating out", "canteen", "mess", "dhaba", "food", "foods", "eats", "eatery", "bites", "kitchen", "bakery", "bakehouse"], subCategory: "Restaurant / Dine-in" },
    { keywords: ["tiffin", "tiffin service", "dabba", "mess food"], subCategory: "Tiffin / Mess" },
    { keywords: ["apple", "banana", "mango", "orange", "grapes", "watermelon", "papaya", "pomegranate", "fruit"], subCategory: "Fruits" },
    { keywords: ["chicken", "mutton", "fish", "egg", "meat", "prawn", "crab", "biryani", "non-veg", "nonveg"], subCategory: "Non-Veg / Meat" },
    { keywords: ["chips", "biscuits", "cookies", "namkeen", "mixture", "snack", "munchies", "popcorn"], subCategory: "Snacks / Packaged" },
  ],
  transport: [
    { keywords: ["cab", "taxi", "auto", "rickshaw", "ride", "uber", "ola", "rapido"], subCategory: null },
    { keywords: ["petrol", "diesel", "fuel", "cng", "gas station", "filling station", "ev charging"], subCategory: null },
    { keywords: ["bus", "train", "metro", "flight", "airport", "railway", "ticket", "fare", "pass", "toll"], subCategory: null },
    { keywords: ["parking", "valet", "garage"], subCategory: null },
    { keywords: ["repair", "service", "mechanic", "tyre", "tire", "oil change", "car wash"], subCategory: null },
  ],
  shopping: [
    { keywords: ["shopping", "clothes", "clothing", "shoes", "shirt", "pant", "jeans", "dress", "kurta", "saree", "garments", "apparels", "accessories", "textiles", "fashion", "boutique", "tailor", "stitching", "fabric", "readymade", "bag", "watch", "jewellery", "jewelry"], subCategory: null },
    { keywords: ["electronics", "phone", "laptop", "tablet", "headphones", "earbuds", "charger", "cable", "gadget", "camera"], subCategory: null },
    { keywords: ["furniture", "sofa", "table", "chair", "bed", "mattress", "home decor", "curtains"], subCategory: null },
    { keywords: ["gift", "present", "birthday gift", "anniversary"], subCategory: null },
  ],
  entertainment: [
    { keywords: ["movie", "film", "cinema", "theater", "theatre", "imax"], subCategory: null },
    { keywords: ["subscription", "netflix", "prime", "hotstar", "spotify", "youtube", "streaming"], subCategory: null },
    { keywords: ["game", "gaming", "playstation", "xbox", "steam", "play store"], subCategory: null },
    { keywords: ["concert", "event", "show", "comedy", "standup", "club", "pub", "bar", "party", "outing", "picnic", "trip", "vacation", "holiday"], subCategory: null },
  ],
  health: [
    { keywords: ["medicine", "medical", "pharmacy", "tablet", "syrup", "ointment", "bandage", "first aid"], subCategory: null },
    { keywords: ["doctor", "hospital", "clinic", "consultation", "checkup", "test", "lab", "blood test", "x-ray", "scan", "mri"], subCategory: null },
    { keywords: ["gym", "fitness", "yoga", "exercise", "workout", "protein", "supplement", "vitamin"], subCategory: null },
    { keywords: ["dental", "dentist", "eye", "optician", "glasses", "lens", "spectacles"], subCategory: null },
    { keywords: ["insurance", "health insurance", "mediclaim"], subCategory: null },
  ],
  education: [
    { keywords: ["course", "class", "tuition", "tutorial", "coaching", "training", "workshop", "seminar", "webinar"], subCategory: null },
    { keywords: ["book", "textbook", "notebook", "stationery", "pen", "pencil"], subCategory: null },
    { keywords: ["school", "college", "university", "exam", "admission", "fee", "fees"], subCategory: null },
    { keywords: ["certificate", "certification", "diploma", "degree"], subCategory: null },
  ],
  bills: [
    { keywords: ["electricity", "electric", "power", "eb bill", "current bill"], subCategory: null },
    { keywords: ["water", "water bill", "water tax"], subCategory: null },
    { keywords: ["gas", "piped gas", "cylinder", "lpg"], subCategory: null },
    { keywords: ["internet", "wifi", "broadband", "fiber", "data pack", "recharge", "prepaid", "postpaid", "mobile bill"], subCategory: null },
    { keywords: ["dth", "cable", "dish tv", "tata sky", "tata play"], subCategory: null },
    { keywords: ["emi", "loan", "credit card", "credit card bill", "emi payment"], subCategory: null },
    { keywords: ["maintenance", "society", "association", "flat maintenance"], subCategory: null },
  ],
  rent: [
    { keywords: ["rent", "house rent", "flat rent", "room rent", "pg", "paying guest", "hostel", "deposit", "security deposit", "advance"], subCategory: null },
  ],
};

export const classifyByKeywords = (text) => {
  if (!text) return null;
  const lower = String(text).toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const [category, groups] of Object.entries(KEYWORD_MAP)) {
    for (const group of groups) {
      for (const keyword of group.keywords) {
        if (lower.includes(keyword)) {
          const score = keyword.length;
          if (score > bestScore) {
            bestScore = score;
            bestMatch = {
              category: category.charAt(0).toUpperCase() + category.slice(1),
              subCategory: group.subCategory,
              confidence: score > 6 ? "high" : "medium",
              matchedKeyword: keyword,
            };
          }
        }
      }
    }
  }

  return bestMatch;
};
