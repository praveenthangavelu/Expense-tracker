
export const parseGenericPayment = ({ body, subject, sender, date }) => {
  const bodyLower = body.toLowerCase();

  if (!bodyLower.match(/₹|rs\.?|inr|amount|paid|charged|debited|credited|payment|invoice|receipt|bill|transaction/i)) {
    return null;
  }

  if (bodyLower.match(/offer|discount|cashback offer|sale|promo|subscribe|unsubscribe|newsletter|opt.?out/i) && 
      !bodyLower.match(/paid|charged|debited|credited|invoice|receipt/i)) {
    return null;
  }

  const amountMatch = body.match(/(?:₹|rs\.?|inr)\s*([\d,]+\.?\d*)/i);
  if (!amountMatch) return null;

  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  if (amount <= 0 || amount > 10000000) return null;

  let type = 'expense';
  if (bodyLower.match(/credited|received|refund|cashback|salary|income/)) {
    type = 'income';
  }

  const senderName = sender.split('@')[0]
    .replace(/[._\-]/g, ' ')
    .replace(/noreply|no.reply|info|support|notify|alert|transaction/gi, '')
    .trim();

  return {
    source: 'Email',
    type: type,
    amount: amount,
    merchant: senderName || 'Unknown',
    date: date,
    category: 'Other',
    confidence: 40,
    note: `Detected from email: ${subject.substring(0, 50)}`
  };
};
