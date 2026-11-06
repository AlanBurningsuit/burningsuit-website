// Decode browser-visible character references before privacy scans or log masking.
// Numeric references include digits and punctuation as well as currency symbols,
// so encoding the whole amount cannot evade the same checks as literal text.
const named = {
  pound: "£", euro: "€", dollar: "$", nbsp: " ",
  comma: ",", period: ".", tab: "\t", newline: "\n",
};

export function decodePriceEntities(text) {
  return text.replace(/&#(?:x([\da-f]+)|(\d+));?|&(pound|euro|dollar|nbsp|comma|period|tab|newline);?/gi,
    (original, hex, decimal, name) => {
      if (name) return named[name.toLowerCase()];
      const code = Number.parseInt(hex ?? decimal, hex ? 16 : 10);
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
        ? String.fromCodePoint(code) : original;
    });
}
