// Canonicalise browser-visible text before privacy scans or log masking.
// Use the complete HTML entity table, including named whitespace and format
// references. Formatting characters and spacing cannot disguise an amount.
import { decodeHTML } from "entities";
import { parseFragment } from "parse5";
import { stripVTControlCharacters } from "node:util";

const INVISIBLE = /[\p{Cf}\p{Default_Ignorable_Code_Point}]/gu;
const SPACED_AMOUNT = /[£€$](?:\p{White_Space}*[\p{Nd},.])+/gu;

function literalText(text) {
  const decoded = decodeHTML(stripVTControlCharacters(text)).normalize("NFKC").replace(INVISIBLE, "");
  return decoded.replace(SPACED_AMOUNT, (amount) => amount.replace(/\p{White_Space}+/gu, ""));
}

function markupText(text) {
  const stack = [parseFragment(text)];
  const parts = [];
  while (stack.length) {
    const node = stack.pop();
    if (node.nodeName === "#text") parts.push(node.value);
    // Template content is stored separately; include it conservatively too.
    const children = node.content ? [node.content] : (node.childNodes ?? []);
    for (let index = children.length - 1; index >= 0; index--) stack.push(children[index]);
  }
  return parts.join("");
}

/** Canonical text for safe log output: no tags, comments or hidden attribute values. */
export function decodePriceEntities(text) {
  let current = literalText(text);
  // Repeat for encoded/nested markup and markup held in raw-text script/template elements.
  while (/<[!?/A-Za-z]/.test(current)) {
    const next = literalText(markupText(current));
    if (next === current) break;
    current = next;
  }
  return current;
}

/** Scan both literal input (including attributes/comments) and joined markup text. */
export function priceScanText(text) {
  const literal = literalText(text);
  const visible = decodePriceEntities(text);
  return literal === visible ? literal : `${literal}\n[markup text]\n${visible}`;
}
