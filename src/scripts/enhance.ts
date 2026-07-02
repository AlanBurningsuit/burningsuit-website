/**
 * Progressive enhancement for the burningsuit site.
 *
 * Everything here is an enhancement on top of a page that is already complete
 * and readable without JS: scroll reveals, the fixed-footer basement height,
 * the live clock, and the auto-hiding header. (The v3 instrument skin is flat,
 * so the old whole-page ground-morph observer is gone; the typewriter is pure
 * CSS.)
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

/* ---- a hello for anyone reading the source (engineers, mostly) ---- */
console.log(
  "%cif you're poking around in here — hello.\nhand-built: self-hosted fonts, no trackers, no cookies, a strict CSP.\nthe rest of the story → /colophon",
  "color:#e69875",
);

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

/* ---- live local time in the footer (degrades to the static "gmt" label) ---- */
const fmt = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
});
const tick = () =>
  ["clock2"].forEach((id) => {
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

/* ---- /ai-fit hero: the rolling "questions in the room" readout (type/delete).
   Enhancement only — the static first question is server-rendered and the
   accessible name is a separate sr-only line, so screen readers, no-JS, and
   reduced-motion all get one stable, readable question. ---- */
const askText = document.querySelector("[data-ask-rotate] .ask-text");
if (askText && motionOK) {
  const qs = [
    "who's checking the dax?",
    "is anyone actually faster?",
    "is your data going where it shouldn't?",
    "are the outputs any better?",
  ];
  let qi = 0;
  let ci = qs[0].length; // start fully typed, matching the server-rendered text
  let mode: "hold" | "deleting" | "typing" = "hold";
  const step = () => {
    let delay = 70;
    if (mode === "hold") {
      mode = "deleting";
      delay = 2400; // dwell on the finished question
    } else if (mode === "deleting") {
      askText.textContent = qs[qi].slice(0, --ci);
      delay = 38;
      if (ci <= 0) {
        mode = "typing";
        qi = (qi + 1) % qs.length;
        delay = 320; // beat before the next question
      }
    } else {
      askText.textContent = qs[qi].slice(0, ++ci);
      if (ci >= qs[qi].length) mode = "hold";
    }
    setTimeout(step, delay);
  };
  setTimeout(step, 2400);
}
