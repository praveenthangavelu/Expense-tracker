import { parsePersonalEmail } from "../services/emailParsers/personalEmailParser.js";

const body = "Food bill - Chapathi = 500 Idly = 100 Total = 600";

// Let's copy preProcessBillText to trace it
const preProcessBillText = (text) => {
  if (!text) return "";
  let cleanText = text;
  let previous = "";

  console.log("Original:", text);

  // 1. Replace with separators (= : - / etc.)
  const separatorRegex = /(\d+(?:\.\d+)?)[^\S\r\n]+([A-Za-z][A-Za-z0-9 ]{1,30})[^\S\r\n]*([=:\-–—])[^\S\r\n]*₹?[^\S\r\n]*(\d+\.?\d*)/g;
  do {
    previous = cleanText;
    cleanText = cleanText.replace(separatorRegex, (match, val1, name, sep, val2) => {
      console.log("Matched separatorRegex:", { match, val1, name, sep, val2 });
      return `${val1}\n${name}${sep}${val2}`;
    });
  } while (cleanText !== previous);

  console.log("After separatorRegex:", cleanText);

  // 2. Replace with space
  const spaceRegex = /(\d+(?:\.\d+)?)[^\S\r\n]+([A-Za-z][A-Za-z0-9 ]{1,30})[^\S\r\n]+(\d{2,5})/g;
  do {
    previous = cleanText;
    cleanText = cleanText.replace(spaceRegex, (match, val1, name, val2) => {
      console.log("Matched spaceRegex:", { match, val1, name, val2 });
      return `${val1}\n${name}  ${val2}`;
    });
  } while (cleanText !== previous);

  console.log("After spaceRegex:", cleanText);
  return cleanText;
};

preProcessBillText(body);
