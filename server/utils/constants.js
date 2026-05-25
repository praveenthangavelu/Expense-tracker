// DEFAULT_CATEGORIES stores the starter categories new users can receive.
// Keeping these values in one constants file makes them easy to reuse in seed scripts or controllers.
export const DEFAULT_CATEGORIES = {
  // Expense categories are used when the transaction type is "expense".
  expense: [
    // Each item has a name for the database and an icon for the user interface.
    { name: "Food", icon: "🍔" },
    { name: "Transport", icon: "🚗" },
    { name: "Shopping", icon: "🛒" },
    { name: "Entertainment", icon: "🎬" },
    { name: "Health", icon: "💊" },
    { name: "Education", icon: "📚" },
    { name: "Rent", icon: "🏠" },
    { name: "Bills", icon: "📄" },
    { name: "Other", icon: "📌" },
  ],

  // Income categories are used when the transaction type is "income".
  income: [
    { name: "Salary", icon: "💰" },
    { name: "Freelance", icon: "💻" },
    { name: "Investment", icon: "📈" },
    { name: "Gift", icon: "🎁" },
    { name: "Other", icon: "📌" },
  ],
};

export const FOOD_SUBCATEGORIES = [
  { name: "Home Cooked", icon: "🏠" },
  { name: "Restaurant / Dine-in", icon: "🍽️" },
  { name: "Street Food", icon: "🛒" },
  { name: "Fast Food", icon: "🍟" },
  { name: "Cafe / Coffee", icon: "☕" },
  { name: "Sweets / Desserts", icon: "🍰" },
  { name: "Groceries", icon: "🥬" },
  { name: "Online Food Delivery", icon: "📱" },
  { name: "Snacks / Packaged", icon: "🍪" },
  { name: "Beverages", icon: "🧃" },
  { name: "Fruits", icon: "🍎" },
  { name: "Non-Veg / Meat", icon: "🍗" },
  { name: "Tiffin / Mess", icon: "🍱" },
  { name: "Other Food", icon: "🍔" },
];
