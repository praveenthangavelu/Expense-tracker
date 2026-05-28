export const HINDI_SENT_PATTERNS = [
  /bhej\s*(?:diya|diye|di|raha|rahi)/i,        // "bhej diya" = sent
  /transfer\s*(?:kiya|kar diya|kr diya|krdiya)/i, // "transfer kiya" = transferred
  /de\s*(?:diya|diye|di)/i,                      // "de diya" = gave
  /paisa\s*(?:bheja|bhej diya|send kiya)/i,      // "paisa bheja" = sent money
  /payment\s*(?:kiya|kar diya|kr diya|ho gaya)/i, // "payment kar diya" = payment done
  /(?:₹|rs\.?|inr)\s*\d+\s*(?:bhej|send|transfer)\s*(?:diya|kiya)/i, // "₹500 bhej diya"
];

export const HINDI_REQUEST_PATTERNS = [
  /(?:bhej|send|de)\s*(?:de|do|dena|dona)/i,     // "bhej dena" = please send
  /(?:pay|payment)\s*(?:kar|karo|kardo|kar do)/i, // "pay karo" = please pay
  /(?:mang|bhejo|de do)/i,
];

export const HINDI_RECEIVED_PATTERNS = [
  /mil\s*(?:gaya|gaye|giya|gya)/i,               // "mil gaya" = received
  /aa\s*(?:gaya|gaye|gya)/i,                     // "aa gaya" = came/received
  /paisa\s*(?:mil|aa)\s*(?:gaya|gaye|gya)/i,
];
