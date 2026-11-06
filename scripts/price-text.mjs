// Canonicalise browser-visible text before privacy scans or log masking.
// Use the complete HTML entity table, including named whitespace and format
// references. Formatting characters and spacing cannot disguise an amount.
import { decodeHTML } from "entities";

const INVISIBLE = /[\p{Cf}\p{Default_Ignorable_Code_Point}]/gu;
const SPACED_AMOUNT = /[£€$](?:\p{White_Space}*[\p{Nd},.])+/gu;

export function decodePriceEntities(text) {
  const decoded = decodeHTML(text).normalize("NFKC").replace(INVISIBLE, "");
  return decoded.replace(SPACED_AMOUNT, (amount) => amount.replace(/\p{White_Space}+/gu, ""));
}
