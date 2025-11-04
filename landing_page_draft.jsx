import React from "react";
import { motion } from "framer-motion";

// --- Inline SVG logo (wordmark + subtle glider/arrow hidden in the X) ---
function NextFlightLogo({ className = "w-48 h-auto" }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width="44"
        height="44"
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="NextFlight logo"
      >
        {/* Circle badge */}
        <circle cx="22" cy="22" r="22" className="fill-slate-900" />
        {/* Stylized "X" = glider + climb arrow */}
        <path
          d="M11 29 L20 20"
          className="stroke-white"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M24 24 L33 15"
          className="stroke-white"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Up-arrow (next) */}
        <path
          d="M27 14 L33 15 L32 21"
          className="stroke-orange-400"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
        {/* Subtle wing curve */}
        <path
          d="M12 26 C18 23, 26 23, 32 26"
          className="stroke-white/50"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span className="text-2xl font-semibold tracking-tight text-slate-900">NextFlight</span>
    </div>
  );
}

export default function NextFlightLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-800">
      {/* Nav */}
      <header className="mx-auto max-w-6xl px-4 sm:px-6 py-5 flex items-center justify-between">
        <NextFlightLogo />
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <a href="#features" className="hover:text-slate-900">Features</a>
          <a href="#how" className="hover:text-slate-900">How it works</a>
          <a href="#privacy" className="hover:text-slate-900">Privacy</a>
          <a href="#cta" className="px-4 py-2 rounded-2xl bg-slate-900 text-white shadow hover:shadow-md">Get early access</a>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-16">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900"
            >
              Learn from your flights.<br />
              <span className="text-orange-500">Fly the next one better.</span>
            </motion.h1>
            <p className="mt-5 text-lg text-slate-600">
              Upload your track and get a concise debrief: what went well, what to improve, and one clear action for your next flight.
            </p>
            {/* Email capture */}
            <div id="cta" className="mt-7">
              <form
                className="flex flex-col sm:flex-row gap-3"
                // TODO: Replace action with your form endpoint (e.g., Formspree / Tally / Supabase)
                action="#"
                method="POST"
                onSubmit={(e) => {
                  e.preventDefault();
                  const email = (document.getElementById("email") as HTMLInputElement).value;
                  window.location.href = `mailto:hello@nextflight.app?subject=NextFlight%20Early%20Access&body=Hi!%20I%27d%20like%20early%20access.%20My%20email%3A%20${encodeURIComponent(
                    email
                  )}`;
                }}
              >
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="you@pilot.email"
                  className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <button
                  type="submit"
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-white shadow hover:shadow-md"
                >
                  Request early access
                </button>
              </form>
              <p className="mt-2 text-xs text-slate-500">No spam. We’ll only email you about the beta.</p>
            </div>

            {/* Trust bullets */}
            <ul className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-slate-600">
              <li className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-400"/> Actionable tips</li>
              <li className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-400"/> Beginner‑friendly</li>
              <li className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-400"/> Privacy‑first</li>
            </ul>
          </div>

          {/* Mock UI card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative"
          >
            <div className="rounded-3xl bg-white shadow-xl ring-1 ring-slate-200 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-orange-400"/>
                  <span className="text-xs font-medium text-slate-500">Quick Debrief</span>
                </div>
                <span className="text-[10px] text-slate-400">sample</span>
              </div>
              <div className="mt-4 grid gap-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-medium text-slate-700">Takeaway</div>
                  <div className="text-sm text-slate-600 mt-1">You left your strongest thermal early.</div>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-medium text-slate-700">What went well</div>
                    <div className="text-xs text-slate-600 mt-1">Found lift fast and kept climb consistent.</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-medium text-slate-700">What to improve</div>
                    <div className="text-xs text-slate-600 mt-1">Commit to 2 more circles when ≥ +1.5 m/s.</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-medium text-slate-700">Mindset</div>
                    <div className="text-xs text-slate-600 mt-1">Widen slightly before bailing when it’s rough.</div>
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-medium text-slate-700">Best thermal</div>
                  <div className="text-xs text-slate-600 mt-1">+2.0 m/s at 05:21 — try nudging 30–50 m toward N (347°).</div>
                </div>
              </div>
            </div>
            {/* floating badge */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="absolute -bottom-4 -right-3 rounded-2xl bg-orange-500 px-3 py-2 text-white text-xs shadow-lg"
            >
              "Better next time"
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900">Why NextFlight</h2>
        <div className="mt-6 grid md:grid-cols-3 gap-5">
          {[
            {
              title: "Instant, simple debrief",
              body: "Upload IGC/GPX → get a plain‑language summary in seconds.",
            },
            {
              title: "Actionable next step",
              body: "Always one clear improvement for your next flight.",
            },
            {
              title: "Beginner‑first, with depth",
              body: "Clean defaults now; deeper analytics later when you want them.",
            },
          ].map((f, i) => (
            <div key={i} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="text-sm font-medium text-slate-900">{f.title}</div>
              <div className="text-sm text-slate-600 mt-1">{f.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900">How it works</h2>
        <ol className="mt-6 grid md:grid-cols-3 gap-5 list-decimal list-inside">
          <li className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="text-sm font-medium text-slate-900">Upload your track</div>
            <div className="text-sm text-slate-600 mt-1">IGC / GPX from XCTrack, Flyskyhy, etc.</div>
          </li>
          <li className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="text-sm font-medium text-slate-900">Auto‑analyze</div>
            <div className="text-sm text-slate-600 mt-1">Detect thermals, early exits, and centering tips.</div>
          </li>
          <li className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="text-sm font-medium text-slate-900">Get your takeaway</div>
            <div className="text-sm text-slate-600 mt-1">One actionable step for your next flight.</div>
          </li>
        </ol>
      </section>

      {/* Privacy */}
      <section id="privacy" className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900">Privacy first</h2>
        <div className="mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-600">
            You own your data. We keep uploads private by default and delete them on request.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <NextFlightLogo className="w-40" />
          <div className="text-xs text-slate-500">
            © {new Date().getFullYear()} NextFlight. Learn fast. Fly better next time.
          </div>
        </div>
      </footer>
    </div>
  );
}
