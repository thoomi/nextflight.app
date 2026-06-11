# Backend Architecture: Auth, Payments & Storage for Flight Art

> Researched 2026-06-11. Pricing and product status verified against vendor pages at that date — re-check before Phase 2 launch.
> Scope decisions: account model must be able to span the whole product later, but Flight Art is the focus now. One-off purchases first; subscription later. Privacy promise ("local by default") must survive.

## Recommended Stack

| Layer | Pick | Why |
|---|---|---|
| Auth | **Supabase Auth** (project in `eu-central-1` Frankfurt) | 50,000 free MAU; magic link + Google/Apple OAuth + passkeys (beta); works from vanilla ES modules via `@supabase/supabase-js`; bundled with the DB/storage we need anyway. [Pricing](https://supabase.com/pricing), [passkeys beta](https://supabase.com/changelog/46458-passkeys-for-supabase-auth-beta) |
| Payments | **Polar.sh** (Merchant of Record) | MoR takes the entire VAT/OSS/UK-registration problem off a German solo seller; developer-grade API/webhooks; one-time products + checkout links; pays out to Germany via Stripe Connect Express; 5% + $0.50/transaction, no fixed fee on Starter. [Fees](https://polar.sh/docs/merchant-of-record/fees), [countries](https://polar.sh/docs/merchant-of-record/supported-countries) |
| Database | **Supabase Postgres** (included) | Tiny relational data (users, designs, ledger). Row Level Security lets the client read/write its own designs with zero API code. |
| Storage | **Supabase Storage** (included) | Signed upload/download URLs out of the box, same SDK and RLS model. 100 GB + 250 GB egress on Pro dwarfs the need (~1 MB/poster). |
| Compute | **Supabase Edge Functions** | Only two server jobs exist (payment webhook, entitlement/checkout endpoints); 500K free invocations; deployed by CLI from GitHub Actions. [Pricing](https://supabase.com/docs/guides/functions/pricing) |
| Static hosting | **Vercel Hobby now → revisit at Phase 2** | Vercel Hobby prohibits commercial use, so selling posters forces Pro ($20/mo) for a plain static site; Cloudflare serves static assets free with commercial use allowed. Decide at payment launch. [Vercel Hobby terms](https://vercel.com/docs/plans/hobby), [Cloudflare plans](https://www.cloudflare.com/plans/developer-platform/) |

### Runners-up and why they lost

- **Auth — WorkOS AuthKit**: free to 1M MAU, hosted UI works without a framework, but custom domain costs $99/mo and it brings no DB/storage — we'd still need Supabase or Neon ([pricing](https://workos.com/pricing)). **Clerk** (50K free MAU since Feb 2026, [pricing](https://clerk.com/pricing)) is React-first; vanilla ClerkJS is second-class. **better-auth** must be hosted, patched, and wired to an email provider — wrong trade for a low-maintenance solo product. **Auth.js/NextAuth** assumes a framework server; this site has none.
- **Payments — Stripe Managed Payments**: the post-Lemon-Squeezy MoR, public preview since Feb 2026; effective EU cost ≈ 5% + €0.25 — marginally cheaper than Polar ([docs](https://docs.stripe.com/payments/managed-payments), [pricing](https://stripe.com/pricing)). Lost on maturity (still preview, limited rollout) but is the natural migration target in 12–18 months. **Lemon Squeezy** is being folded into Stripe Managed Payments — don't onboard onto a sunsetting product ([announcement](https://www.lemonsqueezy.com/blog/2026-update)). **Paddle** (5% + $0.50, [pricing](https://www.paddle.com/pricing)) has a documented pattern of rejecting small indie sellers in opaque reviews. **Stripe direct + Stripe Tax** is cheapest per transaction (1.5% + €0.25 EU cards + 0.5% tax calc) but Stripe Tax only *calculates* — we would still file OSS returns, and a single B2C digital sale to a UK customer creates a UK VAT registration obligation (no threshold for non-established sellers). At 100 sales/mo, ~€40 in extra MoR fees buys total tax-compliance freedom. Decisive.
- **Storage — Cloudflare R2**: zero egress and 10 GB free ([pricing](https://developers.cloudflare.com/r2/pricing/)) is objectively the best raw deal, but adds a second vendor + credential plumbing for a workload measured in single-digit GB. Escape hatch if egress ever matters.
- **DB — Neon**: absorbed into Databricks Lakebase; strategic focus moved to enterprise AI workloads — uncertainty an indie shouldn't carry ([announcement](https://www.databricks.com/blog/databricks-neon)). **D1/Turso** only make sense in an all-Cloudflare stack.

## Cost Estimate (monthly)

Assumes €5 average sale, poster ~1 MB, IGC ~200 KB.

| Item | ~0 users | ~100 paying/mo (€500 rev) | ~1,000 paying/mo (€5,000 rev) |
|---|---|---|---|
| Supabase | $0 (Free tier; keepalive ping needed to avoid pausing) | $25 Pro (no pausing, backups, 100 GB storage) | $25–30 |
| Static hosting | $0 (Vercel Hobby, pre-commercial) | $0 (Cloudflare) or $20 (Vercel Pro) | same |
| Polar fees (variable) | $0 | ~€75 (5% + €0.46 × 100) + ~€3.50 payout fees | ~€750 Starter → ~€420 on Polar Pro ($20/mo, 3.8% + 40¢) |
| **Fixed total** | **$0** | **~$25** | **~$45** |
| **All-in incl. payment fees** | $0 | ~$25 + ~15% of revenue | ~$45 + ~8.5–15% of revenue |

Note: Polar's Starter rate for orgs created after 2026-05-27 is 5% + 50¢ (+1.5% international cards, $15/chargeback, ~$2/mo + 0.25% payout fees). Polar has repriced once already — entitlements live in our own DB precisely so the MoR is swappable.

## Data Model (Postgres, all tables RLS-protected)

```
profiles        id (uuid, = auth.users.id PK), display_name, created_at
designs         id uuid PK, user_id FK, name, config jsonb,        -- style/layout/colors/text
                track_id FK nullable, preview_path text nullable, created_at, updated_at
tracks          id uuid PK, user_id FK, storage_path, filename, size_bytes,
                sha256, created_at                                  -- uploaded ONLY on explicit opt-in
orders          id uuid PK, user_id FK, polar_order_id unique, product_key,
                amount_cents int, currency, status, credits_granted int, raw jsonb, created_at
credits_ledger  id bigserial PK, user_id FK, delta int,            -- +N purchase, -1 export
                reason enum(purchase|export|refund|grant), order_id FK null,
                export_id FK null, created_at
exports         id uuid PK, user_id FK, design_id FK, width, height,
                storage_path nullable, created_at                   -- re-download record
```

Entitlement = `sum(credits_ledger.delta) > 0`. A ledger (not a counter) keeps refunds auditable and is subscription-ready later. Webhook idempotency comes free from the unique constraint on `orders.polar_order_id`. Credits from day one: a single export is just a 1-credit pack, so per-design purchase and packs are the same machinery.

## End-to-End Flow

1. **Login**: "Sign in" on `/art` → modal → `supabase.auth.signInWithOtp({email})` (magic link) or Google/Apple OAuth → redirect back, session in localStorage. Everything on the page keeps working logged-out.
2. **Design**: track parsed and rendered 100% locally as today. "Save design" (logged-in) inserts `designs.config` via supabase-js. A labelled checkbox "also store my track for re-opening on other devices" controls the `tracks` upload (signed upload URL, private bucket).
3. **Buy**: "Get print file (€5)" → Edge Function `create-checkout` → Polar API creates checkout session with `metadata: {user_id, design_id}` → redirect to Polar-hosted checkout (Polar is the seller; handles VAT and consumer invoice) → success redirect back to `/art?order=pending`.
4. **Webhook**: Polar `order.paid` → Edge Function `polar-webhook` verifies signature (standard-webhooks), inserts `orders` row, inserts `credits_ledger +N`.
5. **Export**: client refetches credit balance → "Download high-res" calls Edge Function `redeem-export` (service role: checks balance, inserts `exports` + `ledger -1`, returns OK + signed upload URL) → client renders the un-watermarked 2480×3508 PNG locally with the existing renderer → triggers download AND uploads the PNG so "My exports" offers re-download via signed URLs.

## Export Gating (pragmatic, no DRM)

Accept client-side gating. The renderer is client canvas; duplicating it server-side (node-canvas/resvg) means maintaining two renderers that drift — disproportionate for a €5 poster.

- Free, always, no account: on-screen preview + watermarked or ~1200 px export (still Instagram-friendly — it doubles as marketing).
- Paid: the un-watermarked full-res code path runs only after `redeem-export` succeeds.
- A dev-tools user can flip the flag locally; that person was never a customer. No server rendering, no canvas fingerprinting. Revisit only if piracy becomes measurable.

## Privacy Promise

- Default stays exactly as advertised: parsing, analysis, art rendering, normal exports — all local, no account needed. The analyzer ships no cloud calls at all in this plan.
- Nothing is uploaded except (a) design JSON on explicit "Save to account", (b) the track file only if the labelled checkbox is ticked, (c) the purchased PNG for re-download. Each is a deliberate user action.
- Landing page wording changes from "Your tracks never leave your device" to e.g.: "Local by default. Your tracks are processed entirely in your browser — no upload, no account required. An optional account lets you save poster designs and purchases to the cloud, only when you choose to."
- Legal updates at Phase 2: Privacy Policy/Impressum list Supabase (processor, EU Frankfurt, DPA) and Polar (US merchant of record for purchases); AGB/withdrawal-right text for digital goods.

## Integration with the Existing Vanilla-JS Site

No rewrite, no framework. Additions:

- `frontend/js/cloud/supabase-client.js` — singleton client; add `@supabase/supabase-js` as the first real npm dependency and let Vite bundle it (~30 KB gz). Anon key + URL in config (anon key is public by design; RLS is the security boundary).
- `frontend/js/cloud/auth-ui.js` — login modal + header account chip, plain DOM like the rest of the codebase; handles the magic-link/OAuth redirect hash on page load.
- `frontend/js/cloud/designs-api.js`, `purchases-api.js` — thin wrappers (CRUD designs, credit balance, Edge Function calls with the session JWT).
- `frontend/js/art-page.js` gains save/load design panel, buy button, and an export-gating hook into the exporter in `frontend/js/art/art-renderer.js`.
- New repo dir `supabase/` (config, migrations, `functions/create-checkout`, `functions/polar-webhook`, `functions/redeem-export`), deployed by a new GitHub Actions job (`supabase db push` + `supabase functions deploy`) alongside the existing static deploy.
- The cloud module is lazy-imported only when the user interacts with account features, keeping the privacy-clean default code path.

## Phased Rollout

- **Phase 1 — Auth + saved designs (1–2 weeks)**: Supabase project (Frankfurt), magic link + Google (Apple later — needs the $99/yr Apple Developer account), `profiles/designs/tracks` tables + RLS, save/load UI on `/art`. Stay on Vercel Hobby (still non-commercial) and Supabase free tier, with a keepalive ping from GitHub Actions cron to dodge the 1-week pause.
- **Phase 2 — Payments + export gating (1–2 weeks)**: Polar org + products ("1 export €5", "5-pack €15"), the three Edge Functions, ledger tables, gated exporter, "My exports" re-download. Flip Supabase to Pro ($25); move static hosting to Cloudflare or accept Vercel Pro ($20). Update landing copy + Privacy Policy + AGB. One short Steuerberater consult: MoR sales are B2B services to Polar (US) — outside German VAT scope, but revenue counts toward income tax / Kleinunternehmer limits (€25k/€100k since 2025).
- **Phase 3 — sketch only**: analyzer cloud library = `flights` table + same `tracks` bucket + same opt-in pattern; subscription = Polar subscriptions writing `credits_ledger` grants or an `entitlements` table. The auth/user/ledger spine from Phases 1–2 carries over unchanged. If Stripe Managed Payments exits preview with good EU terms, migration is low-risk because all entitlements live in our own DB.

## What NOT to Build

Own auth/password storage; own VAT/invoice/OSS handling (that's the entire point of the MoR); subscription machinery now; server-side poster rendering or any DRM; native apps; a framework rewrite; an own webhook queue/retry system (Polar retries; idempotency via unique constraint); Kubernetes/VPS/containers; multi-region anything; a second renderer; an admin panel (Supabase Studio + Polar dashboard are the admin panel).

## Risks & Open Questions

1. **Supabase free-tier pausing** before Phase 2 revenue — mitigated by keepalive cron; budget the $25 from first real users.
2. **Polar repricing risk** (already went 4%+40¢ → 5%+50¢ for new orgs in May 2026) — mitigated by own-DB entitlements making MoR migration a checkout-URL swap.
3. **Supabase passkeys are beta** — ship magic link + Google as primary; passkeys are an enhancement, not a dependency.
4. **Client-side gating is bypassable** — accepted consciously; revisit only if measurable.
5. **Open**: store the purchased full-res PNG (re-download convenience, ~1 MB/order) vs only design+track (re-render on demand, maximal privacy)? Recommended: store it, with a delete button — purchases should survive device loss.
6. **Open**: exact products/pricing (€5 single vs €15 five-pack is a placeholder).
