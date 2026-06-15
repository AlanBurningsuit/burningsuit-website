/**
 * Progressive enhancement for the burningsuit homepage.
 *
 * Ported unchanged in behaviour from the B5 concept. Everything here is an
 * enhancement on top of a page that is already complete and readable without
 * JS: scroll reveals, the whole-page ground morph, the fixed-footer basement
 * height, the live clock, and the auto-hiding header.
 *
 * NOTE on CSP: this script is bundled to an external module (script-src 'self').
 * The only DOM-style writes it makes go through the CSSOM
 * (`documentElement.style.setProperty`), which CSP's style-src does NOT govern,
 * so `style-src 'self'` holds without an inline-style allowance.
 */
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
  targets.forEach((el) => {
    if (el.hasAttribute("data-reveal-lines")) el.classList.add("lines");
    io.observe(el);
  });
} else {
  targets.forEach((el) => el.classList.add("show"));
}

/* ---- whole-page ground morph: section crossing mid-viewport sets the theme ---- */
const grounds = document.querySelectorAll<HTMLElement>("[data-ground]");
if ("IntersectionObserver" in window) {
  const tio = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const ground = (e.target as HTMLElement).dataset.ground;
          if (ground) document.documentElement.dataset.theme = ground;
        }
      }),
    { rootMargin: "-45% 0% -45% 0%" },
  );
  grounds.forEach((s) => tio.observe(s));
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

/* ---- live local time (degrades to the static label without JS) ---- */
const fmt = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
});
const tick = () =>
  ["clock", "clock2"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = fmt.format(new Date());
  });
tick();
setInterval(tick, 30000);

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
