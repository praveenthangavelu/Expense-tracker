export const classifyByAmountAndTime = (amount, date) => {
  const numericAmount = Number(amount || 0);
  const parsedDate = date ? new Date(date) : new Date();
  if (!numericAmount || Number.isNaN(parsedDate.getTime())) return null;

  const hour = parsedDate.getHours();
  const dayOfWeek = parsedDate.getDay();
  const dayOfMonth = parsedDate.getDate();

  if (hour >= 5 && hour <= 9 && numericAmount <= 100) {
    return { category: "Food", subCategory: "Cafe / Coffee", confidence: "low", reason: "Small morning expense" };
  }

  if (hour >= 11 && hour <= 14 && numericAmount >= 50 && numericAmount <= 500) {
    return { category: "Food", subCategory: null, confidence: "low", reason: "Midday expense in meal range" };
  }

  if (hour >= 19 && hour <= 22 && numericAmount >= 100 && numericAmount <= 2000) {
    return { category: "Food", subCategory: "Restaurant / Dine-in", confidence: "low", reason: "Evening expense in dining range" };
  }

  if ((hour >= 22 || hour <= 2) && numericAmount >= 100 && numericAmount <= 1000) {
    return { category: "Food", subCategory: "Online Food Delivery", confidence: "low", reason: "Late night food-range expense" };
  }

  if (numericAmount >= 1 && numericAmount <= 30) {
    return { category: "Food", subCategory: "Snacks / Packaged", confidence: "low", reason: "Very small amount" };
  }

  if (numericAmount >= 200 && numericAmount % 100 === 0 && numericAmount <= 5000) {
    return null;
  }

  if (dayOfMonth >= 1 && dayOfMonth <= 5 && numericAmount >= 5000) {
    return { category: "Rent", subCategory: null, confidence: "low", reason: "Large payment in first week" };
  }

  if ((dayOfWeek === 0 || dayOfWeek === 6) && numericAmount >= 200 && numericAmount <= 2000) {
    return { category: "Entertainment", subCategory: null, confidence: "low", reason: "Weekend medium expense" };
  }

  return null;
};
