/**
 * Progressive enhancement for the burningsuit site.
 *
 * Everything here is an enhancement on top of a page that is already complete
 * and readable without JS: scroll reveals, the auto-hiding header and footer.
 * Nothing idles or loops — the 2026-07 warmth
 * delta retired the clock, the console greeting and the /ai-fit rotation.
 *
 * NOTE on CSP: the build keeps this bundle external under script-src 'self'.
 * Visibility is controlled by CSS classes; there are no inline-style writes.
 */
/* ---- arm the reveal gate FIRST, only if the observer is supported:
   reveal-hidden states exist only while this module is actually running.
   The class used to be added by a separate inline
   head script; arming it here instead keeps it inside the external
   bundle and makes the failure mode safe — if this module never loads or
   executes (dropped connection, bad deploy), no .js class is added, the
   html:not(.js) fallbacks hold, and the page stays fully visible. Cost: a
   possible one-frame reveal flash on slow connections. A browser without
   IntersectionObserver uses the same complete, immediate CSS fallback. ---- */
if ("IntersectionObserver" in window) document.documentElement.classList.add("js");

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
   page; without JS the tracker never runs. localStorage can throw in locked-down browsers — the button then
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

/* ---- conversion-intent tracking: one delegated listener covers every
   mailto (footer, CTAs, /privacy) and every Cal.com booking link. Booking
   clicks carry the link's own utm_content as the placement (bookingHref in
   site.ts builds it), because Cal.com only shows UTMs per completed booking
   — clicks that never become bookings (the zero-slots incident's signal)
   are visible only here. New-tab links, so no navigation race. ---- */
document.addEventListener("click", (e) => {
  const el = e.target as Element | null;
  if (el?.closest?.('a[href^="mailto:"]')) {
    track("Email click");
  }
  const book = el?.closest?.('a[href^="https://cal.com/"]');
  if (book) {
    const placement = new URL((book as HTMLAnchorElement).href).searchParams.get("utm_content");
    track("Booking click", placement ? { placement } : undefined);
  }
});

/* ---- study-read tracking: a case study counts as READ when its closing
   "working together" door (data-track-study-end, CaseStudyLayout) enters the
   viewport — the one engagement question pageviews can't answer: do openers
   reach the ask? Fires once per pageview; no IntersectionObserver support
   simply means no event. ---- */
const studyEnd = document.querySelector("[data-track-study-end]");
if (studyEnd && "IntersectionObserver" in window) {
  const seen = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      track("Study read", { study: location.pathname });
      seen.disconnect();
    }
  });
  seen.observe(studyEnd);
}

const motionOK = matchMedia("(prefers-reduced-motion: no-preference)").matches;

/* ---- scroll reveals: fire once at ~85% viewport, never un-reveal ---- */
const targets = document.querySelectorAll(
  "[data-reveal],[data-reveal-raw],[data-reveal-lines],[data-reveal-fig]",
);
if (motionOK && "IntersectionObserver" in window) {
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

/* ---- header: hides scrolling down, returns scrolling up ---- */
if (motionOK) {
  const hd = document.getElementById("hd");
  if (hd) {
    let last = scrollY;
    hd.addEventListener("focusin", () => hd.classList.remove("hh"));
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

/* ---- sticky footer: keyboard focus returns it to its document position ---- */
/* CSS unpins on :focus-within before this event runs. Scrolling the specific
   target (not the page end) also works when the footer is taller than the
   viewport. Instant scrolling never leaves a focused action hidden while a
   smooth scroll catches up. Reduced motion and no-JS keep a static footer. */
document.querySelector("footer")?.addEventListener("focusin", (event) => {
  if (!matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
  const target = event.target;
  if (target instanceof HTMLElement) {
    target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
  }
});
