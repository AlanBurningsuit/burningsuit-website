/**
 * One ask per page (website brief, 29 Oct 2026): every page asks for exactly
 * one thing, and the header and footer follow it so the shell never adds a
 * second ask. Courses and consultancy never share one; Kit sign-ups appear on
 * essays only.
 *
 *   hour      — the free hour (consultancy, /hour/, case studies, About)
 *   book-101  — a seat on the 101 (its landing page, and Home, which leads
 *               with training and the 101 is the way in)
 *   enquire   — an enquiry for a course outline with costs (/training/)
 *   subscribe — the inline Kit form at the end of an essay
 *
 * Each ask carries the Umami event its clicks record (`event`) and a
 * placement-aware href. Elements render `data-track` / `data-placement`, which
 * enhance.ts reads, so an ask's event doesn't depend on where its link points
 * (the 101's booking route is still undecided and may be anywhere).
 */
import { BOOKING_101_URL, CONTACT_EMAIL, bookingHref, mailtoFor } from "./site";
import { course } from "./training";

export type PageAsk = "hour" | "book-101" | "enquire" | "subscribe";

export interface AskLink {
  href: string;
  label: string;
  /** The header's label, when the full one would crowd the bar (the logo and
   *  button share a row down to 320px; see --header-booking-room). */
  short?: string;
  /** Umami event name for clicks; undefined = tracked by href (the free
   *  hour's existing "Booking click", kept for its dashboard history). */
  event?: string;
  external: boolean;
}

/** The in-page anchor of an essay's inline Kit form. */
export const NOTES_FORM_ID = "notes";

const intro = course("agentic-101");

/** Until the 101's booking route exists, its ask is registering interest by
 *  email, so no link ever points at an undecided URL. */
export const has101Booking = BOOKING_101_URL !== undefined;

function book101Href(placement: string): string {
  if (!BOOKING_101_URL) return mailtoFor(`${intro.title} - register interest`);
  const sep = BOOKING_101_URL.includes("?") ? "&" : "?";
  return `${BOOKING_101_URL}${sep}utm_source=burningsuit&utm_content=${encodeURIComponent(placement)}`;
}

/** The course enquiry: an email with the questions an outline with costs
 *  needs, prefilled. */
const enquiryFields = ["Course:", "Roughly how many people:", "What they can already do:", "On site or remote, and where:", "Dates that suit:"];
export const enquiryHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("A course for my team")}&body=${encodeURIComponent(enquiryFields.join("\r\n"))}`;

/** The page's ask, built for one placement (header, footer, hero …). */
export function askLink(ask: PageAsk, placement: string): AskLink {
  switch (ask) {
    case "hour":
      return { href: bookingHref(placement), label: "Book an hour", external: true };
    case "book-101":
      // PLACEHOLDER labels until the voice pass.
      return has101Booking
        ? { href: book101Href(placement), label: "Book a seat", event: "101 booking click", external: true }
        : { href: book101Href(placement), label: "Register interest", event: "101 interest click", external: false };
    case "enquire":
      return { href: enquiryHref, label: "Ask about a course", short: "Enquire", event: "Enquiry click", external: false };
    case "subscribe":
      return { href: `#${NOTES_FORM_ID}`, label: "Get the notes", external: false };
  }
}
