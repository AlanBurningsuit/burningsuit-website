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

/* ---- Umami custom events: the tracker (a defer script in <head>) auto-
   tracks pageviews and normally defines window.umami before this end-of-body
   module runs. The guard covers the exceptions — adblock or a provider
   outage drops the event silently, and if this module somehow wins the race
   the event fires from the tag's load event instead. ---- */
type Umami = { track: (name: string, data?: Record<string, unknown>) => void };
const track = (name: string, data?: Record<string, unknown>) => {
  const w = window as { umami?: Umami };
  if (w.umami) w.umami.track(name, data);
  else
    document
      .querySelector<HTMLScriptElement>("script[data-website-id]")
      ?.addEventListener(
        "load",
        () => (window as { umami?: Umami }).umami?.track(name, data),
        { once: true },
      );
};

/* ---- /privacy analytics opt-out: Umami's supported exclusion is the
   `umami.disabled` localStorage flag (value "1", per docs.umami.is). The
   button's two labels live in its data attributes so the copy stays in the
   page; without JS the tracker never runs, so the hidden toggle costs
   nothing. localStorage can throw in locked-down browsers — the button then
   stays inert rather than erroring. ---- */
const optOut = document.querySelector<HTMLButtonElement>("[data-analytics-optout]");
if (optOut) {
  const KEY = "umami.disabled";
  try {
    const render = () => {
      const off = localStorage.getItem(KEY) === "1";
      optOut.setAttribute("aria-pressed", String(off));
      const label = off ? optOut.dataset.labelOff : optOut.dataset.labelOn;
      if (label) optOut.textContent = label;
    };
    optOut.addEventListener("click", () => {
      if (localStorage.getItem(KEY) === "1") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, "1");
      render();
    });
    render();
  } catch {
    /* storage unavailable — leave the server-rendered label in place */
  }
}

/* ---- 404 tracking: surfaces legacy/broken inbound URLs in the dashboard
   without server logs. GitHub Pages serves 404.html at the REQUESTED path, so
   location.pathname is the missed URL. Event name + `path` prop are the
   contract the redirect-sweep pipeline reads — keep both stable. ---- */
if (document.querySelector("[data-track-404]")) {
  track("404", { path: location.pathname });
}

/* ---- email-intent tracking: one delegated listener covers every mailto
   (footer, CTAs, /privacy). Cal.com clicks already carry per-placement UTMs
   via booking-record UTM params; this closes the other conversion path. ---- */
document.addEventListener("click", (e) => {
  if ((e.target as Element)?.closest?.('a[href^="mailto:"]')) {
    track("Email click");
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
