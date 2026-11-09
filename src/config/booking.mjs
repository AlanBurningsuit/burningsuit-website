// Public booking links. The 101's seat link is a Stripe Payment Link (one seat per payment, 8 payments at most, VAT
// added by Stripe Tax). It shows a price, so pages link to it only in the priced production build; the unpriced build
// and previews keep booking closed alongside "Price on request".
export const SEAT_BOOKING_URL = "https://buy.stripe.com/3cI7sLcDM7cqe4beUSa7C02";
