
export const parseAmazon = ({ body, subject, date }) => {
  const result = { source: 'Amazon', type: 'expense', category: 'Shopping' };

  if (subject.match(/your.*order|order.*placed|order.*confirmed/i)) {
    const amountMatch = body.match(/(?:grand total|order total|total|amount)\s*[:\-]?\s*(?:₹|rs\.?|inr)\s*([\d,]+\.?\d*)/i)
      || body.match(/(?:₹|rs\.?|inr)\s*([\d,]+\.?\d*)\s*(?:total|charged|debited)/i);

    const orderIdMatch = body.match(/(?:order\s*#?\s*|order\s*id\s*[:\-]?\s*)([\d\-]+)/i);

    const itemMatches = [...body.matchAll(/(?:^|\n)\s*(\d+)\s*x\s+(.+?)(?:\s+₹|$)/gm)];
    const items = itemMatches.map(m => ({ qty: parseInt(m[1]), name: m[2].trim() }));

    if (items.length > 0) {
      const itemText = items.map(i => i.name).join(' ').toLowerCase();
      if (itemText.match(/grocery|food|rice|oil|atta|dal|milk|fruit|vegetable/)) {
        result.category = 'Food';
        result.subCategory = 'Groceries';
      } else if (itemText.match(/medicine|tablet|vitamin|supplement|health/)) {
        result.category = 'Health';
      } else if (itemText.match(/book|notebook|pen|stationery|course/)) {
        result.category = 'Education';
      } else if (itemText.match(/phone|laptop|charger|cable|electronics|headphone|earphone/)) {
        result.category = 'Shopping';
        result.subCategory = 'Electronics';
      } else if (itemText.match(/shirt|pant|dress|shoe|clothing|fashion/)) {
        result.category = 'Shopping';
        result.subCategory = 'Clothing';
      }
    }

    result.amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null;
    result.referenceId = orderIdMatch ? orderIdMatch[1] : null;
    result.items = items;
    result.date = date;
    result.merchant = 'Amazon';
    result.confidence = result.amount ? 90 : 40;
  }
  else if (subject.match(/delivered|shipped|out for delivery/i)) {
    return null;
  }
  else if (subject.match(/refund/i)) {
    const amountMatch = body.match(/(?:₹|rs\.?|inr)\s*([\d,]+\.?\d*)\s*(?:refund|credited|returned)/i);
    result.type = 'income';
    result.amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null;
    result.merchant = 'Amazon Refund';
    result.category = 'Other';
    result.note = 'Refund';
    result.confidence = result.amount ? 85 : 30;
  }
  else {
    return null;
  }

  return result;
};
