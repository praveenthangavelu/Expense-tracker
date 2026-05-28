import { parsePersonalEmail } from "../services/emailParsers/personalEmailParser.js";

const VARIATIONS = [
  {
    id: 1,
    name: "Variation 1 — Basic",
    body: "Chapathi = 450\nIdly = 40\nTotal = 490",
    expected: {
      amount: 490,
      category: "Food",
      subCategory: "Tiffin / Mess",
      itemCount: 2,
    }
  },
  {
    id: 2,
    name: "Variation 2 — With rupee symbol",
    body: "Chapathi - ₹450\nIdly - ₹40\nTotal - ₹490",
    expected: {
      amount: 490,
      category: "Food",
      subCategory: "Tiffin / Mess",
      itemCount: 2,
    }
  },
  {
    id: 3,
    name: "Variation 3 — With quantity",
    body: "Chapathi x 3 = 450\nIdly x 2 = 40\nTotal = 490",
    expected: {
      amount: 490,
      category: "Food",
      subCategory: "Tiffin / Mess",
      itemCount: 2,
    }
  },
  {
    id: 4,
    name: "Variation 4 — Restaurant bill with tax",
    body: "Butter Naan   120\nDal Fry       180\nPaneer Tikka  320\nCGST 5%        31\nSGST 5%        31\nTotal         682",
    expected: {
      amount: 682,
      category: "Food",
      subCategory: "Restaurant / Dine-in",
      itemCount: 3,
      hasTax: true,
    }
  },
  {
    id: 5,
    name: "Variation 5 — With per-person split",
    body: "Total = 490\nPer person = 245\nPlease pay your share",
    expected: {
      amount: 245,
      category: "Other",
      note: "Your share of ₹490 total",
    }
  },
  {
    id: 6,
    name: "Variation 6 — Grocery list",
    body: "Rice 5kg - 320\nOil 1L - 180\nEggs 12 - 84\nTotal - 584",
    expected: {
      amount: 584,
      category: "Food",
      subCategory: "Groceries",
      itemCount: 3,
    }
  },
  {
    id: 7,
    name: "Variation 7 — Hinglish",
    body: "Bhai bill aa gaya\nChapathi = 450\nIdly = 40\nTotal = 490\nTera share 245 hai",
    expected: {
      amount: 245,
      category: "Food",
      subCategory: "Tiffin / Mess",
      itemCount: 2,
    }
  },
  {
    id: 8,
    name: "Variation 8 — Medicine",
    body: "Paracetamol - 30\nCough syrup - 120\nVitamin D - 250\nTotal - 400",
    expected: {
      amount: 400,
      category: "Health",
      itemCount: 3,
    }
  },
  {
    id: 9,
    name: "Variation 9 — No explicit total",
    body: "Chapathi = 450\nIdly = 40\nCoffee = 60",
    expected: {
      amount: 550,
      category: "Food",
      subCategory: "Tiffin / Mess",
      itemCount: 3,
      confidence: 60,
    }
  },
  {
    id: 10,
    name: "Variation 10 — Flattened single-line basic",
    body: "Food bill - Chapathi = 500 Idly = 100 Total = 600",
    expected: {
      amount: 600,
      category: "Food",
      subCategory: "Tiffin / Mess",
      itemCount: 2,
    }
  },
  {
    id: 11,
    name: "Variation 11 — Flattened single-line other",
    body: "Food bill - Chapathi = 450 Idly = 40 Total = 490",
    expected: {
      amount: 490,
      category: "Food",
      subCategory: "Tiffin / Mess",
      itemCount: 2,
    }
  }
];

const runTests = () => {
  let passedCount = 0;
  
  for (const v of VARIATIONS) {
    console.log(`Running: ${v.name}`);
    const result = parsePersonalEmail({
      body: v.body,
      subject: "Test Subject",
      sender: "friend@gmail.com",
      date: new Date(),
      userName: "Test User"
    });

    if (!result) {
      console.error(`❌ Failed: Returned null`);
      continue;
    }

    const { amount, category, subCategory, note, confidence, lineItems } = result;
    const exp = v.expected;
    
    let ok = true;
    if (amount !== exp.amount) {
      console.error(`  ❌ Amount mismatch: expected ${exp.amount}, got ${amount}`);
      ok = false;
    }
    if (category !== exp.category) {
      console.error(`  ❌ Category mismatch: expected ${exp.category}, got ${category}`);
      ok = false;
    }
    if (exp.subCategory && subCategory !== exp.subCategory) {
      console.error(`  ❌ SubCategory mismatch: expected ${exp.subCategory}, got ${subCategory}`);
      ok = false;
    }
    if (exp.itemCount && lineItems.length !== exp.itemCount) {
      console.error(`  ❌ Item count mismatch: expected ${exp.itemCount}, got ${lineItems.length}`);
      ok = false;
    }
    if (exp.confidence && confidence !== exp.confidence) {
      console.error(`  ❌ Confidence mismatch: expected ${exp.confidence}, got ${confidence}`);
      ok = false;
    }
    if (exp.note && !note.includes(exp.note)) {
      console.error(`  ❌ Note mismatch: expected to include "${exp.note}", got "${note}"`);
      ok = false;
    }
    
    if (ok) {
      console.log(`  ✅ Passed! Amount: ${amount}, Category: ${category}/${subCategory || 'none'}, Note: "${note}"`);
      passedCount++;
    }
  }

  console.log(`\nResults: ${passedCount}/${VARIATIONS.length} variations passed.`);
  process.exit(passedCount === VARIATIONS.length ? 0 : 1);
};

runTests();
