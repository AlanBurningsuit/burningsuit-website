/**
 * Progressive enhancement for the burningsuit site.
 *
 * Everything here is an enhancement on top of a page that is already complete
 * and readable without JS: scroll reveals, the fixed-footer basement height,
 * and the auto-hiding header. Nothing idles or loops — the 2026-07 warmth
 * delta retired the clock, the console greeting and the /ai-fit rotation.
 *
 * NOTE on CSP: this script is bundled to an external module (script-src 'self').
 * The only DOM-style writes it makes go through the CSSOM
 * (`documentElement.style.setProperty`), which CSP's style-src does NOT govern,
 * so `style-src 'self'` holds without an inline-style allowance.
 */
/* ---- arm the JS gate FIRST: reveal-hidden states exist only while this
   module is actually running. The class used to be added by an inline head
   script; arming it here instead keeps the CSP hash-free (script-src 'self'
   covers the one external module) and makes the failure mode safe — if this
   module never loads or executes (dropped connection, bad deploy), no .js
   class is added, the html:not(.js) fallbacks hold, and the page stays fully
   visible. Cost: a possible one-frame reveal flash on slow connections. ---- */
document.documentElement.classList.add("js");

const motionOK = matchMedia("(prefers-reduced-motion: no-preference)").matches;

/* ---- scroll reveals: fire once at ~85% viewport, never un-reveal ---- */
const targets = document.querySelectorAll(
  "[data-reveal],[data-reveal-raw],[data-reveal-lines],[data-reveal-fig]",
);
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("show");
          io.unobserve(e.target);
        }
      }),
    { rootMargin: "0px 0px -15% 0px" },
  );
  targets.forEach((el) => io.observe(el));
} else {
  targets.forEach((el) => el.classList.add("show"));
}

/* ---- basement: main's bottom margin must equal the footer's real height ---- */
const ft = document.querySelector("footer");
if (ft) {
  const setFh = () =>
    document.documentElement.style.setProperty("--footer-h", ft.offsetHeight + "px");
  setFh();
  addEventListener("resize", setFh, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(setFh);
}

/* ---- header: hides scrolling down, returns scrolling up ---- */
if (motionOK) {
  const hd = document.getElementById("hd");
  if (hd) {
    let last = scrollY;
    addEventListener(
      "scroll",
      () => {
        const y = scrollY;
        hd.classList.toggle("hh", y > 160 && y > last);
        last = y;
      },
      { passive: true },
    );
  }
}
