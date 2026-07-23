/**
 * Progressive enhancement for the burningsuit site.
 *
 * Everything here is an enhancement on top of a page that is already complete
 * and readable without JS: scroll reveals, the fixed-footer basement height,
 * and the auto-hiding header. Nothing idles or loops — the 2026-07 warmth
 * delta retired the clock, the console greeting and the /ai-fit rotation.
 *
 * NOTE on CSP: the build inlines this bundle as a module script and Astro
 * auto-hashes it into script-src (the hashes are byte-sensitive — LF only).
 * The only DOM-style writes it makes go through the CSSOM
 * (`documentElement.style.setProperty`), which CSP's style-src does NOT govern,
 * so `style-src 'self'` holds without an inline-style allowance.
 */
/* ---- arm the JS gate FIRST: reveal-hidden states exist only while this
   module is actually running. The class used to be added by a separate inline
   head script; arming it here instead keeps it inside the one auto-hashed
   bundle and makes the failure mode safe — if this module never loads or
   executes (dropped connection, bad deploy), no .js class is added, the
   html:not(.js) fallbacks hold, and the page stays fully visible. Cost: a
   possible one-frame reveal flash on slow connections. ---- */
document.documentElement.classList.add("js");

/* ---- Plausible init: the CSP-safe home for the account snippet's inline
   half. The queue stub works in either load order — if the async tracker
   won the race it defined the real plausible/init and these `||` keep it;
   if this module ran first, the stub queues and `plausible.o = {}` tells
   the tracker to start on arrival. ---- */
type PlausibleStub = {
  (...args: unknown[]): void;
  q?: unknown[];
  o?: object;
  init?: (opts?: object) => void;
};
const w = window as { plausible?: PlausibleStub };
w.plausible =
  w.plausible ||
  function (...args: unknown[]) {
    (w.plausible!.q = w.plausible!.q || []).push(args);
  };
w.plausible.init =
  w.plausible.init ||
  function (opts?: object) {
    w.plausible!.o = opts || {};
  };
w.plausible.init();

/* ---- /privacy analytics opt-out: Plausible's supported exclusion is the
   `plausible_ignore` localStorage flag (verified against the deployed
   tracker). The button's two labels live in its data attributes so the copy
   stays in the page; without JS the tracker never runs, so the hidden
   toggle costs nothing. localStorage can throw in locked-down browsers —
   the button then stays inert rather than erroring. ---- */
const optOut = document.querySelector<HTMLButtonElement>("[data-analytics-optout]");
if (optOut) {
  const KEY = "plausible_ignore";
  try {
    const render = () => {
      const off = localStorage.getItem(KEY) === "true";
      optOut.setAttribute("aria-pressed", String(off));
      const label = off ? optOut.dataset.labelOff : optOut.dataset.labelOn;
      if (label) optOut.textContent = label;
    };
    optOut.addEventListener("click", () => {
      if (localStorage.getItem(KEY) === "true") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, "true");
      render();
    });
    render();
  } catch {
    /* storage unavailable — leave the server-rendered label in place */
  }
}

/* ---- 404 tracking: surfaces legacy/broken inbound URLs in the dashboard
   without server logs. GitHub Pages serves 404.html at the REQUESTED path, so
   location.pathname is the missed URL. `interactive: false` because the
   tracker defaults custom events to interactive — without it every 404
   landing would count as engagement and suppress the bounce it really is. ---- */
if (document.querySelector("[data-track-404]")) {
  w.plausible("404", { props: { path: location.pathname }, interactive: false });
}

/* ---- email-intent tracking: one delegated listener covers every mailto
   (footer, CTAs, /privacy). Cal.com clicks already carry per-placement UTMs
   via the outbound-links goal; this closes the other conversion path. ---- */
document.addEventListener("click", (e) => {
  if ((e.target as Element)?.closest?.('a[href^="mailto:"]')) {
    w.plausible!("Email click");
  }
});

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
