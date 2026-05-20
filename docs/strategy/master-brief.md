# NextFlight — Master Brief

*Distilled from five research threads. Opinionated. Pick-winners-kill-losers. Walk-in-Monday-morning.*

**Date:** May 17, 2026
**Source docs:** `nextflight-strategy-final.md`, `nextflight-thermal-research.md`, `nextflight-novel-viz-research.md`, `nextflight-novel-viz-research-gpt.md`, `nextflight-weather-reconstruction-research.md`

---

## 1. The Opportunity in One Page

**What NextFlight is.** A privacy-first, conversational, AI-coached post-flight tool for paragliding pilots. Drop an IGC. Get a debrief that actually *judges*. Ask follow-up questions. Watch a 3D replay narrated by an AI coach who knows the atmosphere you flew through, the pilots who flew alongside you, and the habits you've been compounding across the last twenty flights. Nothing leaves your device unless you press a button.

**The actual gap.** 15+ paragliding apps; none of them solve "I landed, what should I do differently?" XContest gives charts. XCviewer gives 79 statistics. SkyViz gives a pretty movie. Parametrics.app gives a generated report but no conversation. Nobody fuses the IGC, the *actual* atmospheric state of that flight, and a multi-session memory into a coach that remembers you.

**The real threat.** Parametrics.app. They are the only competitor on the coaching narrative. If they add a chat interface and a credible privacy mode before NextFlight ships its differentiation, the moat is gone. The race is not feature parity — it's structural differentiation Parametrics can't replicate without re-architecting.

**The defensible position.** Four pillars, in order of moat strength:

1. **Atmospheric reconstruction** — ERA5 + COSMO-REA6 + Pioupiou + radiosondes + the IGC track itself as a sensor, fused into a per-flight Skew-T-with-thermals-overlay. Coaching with receipts. *Nobody does this.*
2. **Multi-session habit detection** — local-first, IndexedDB, structurally impossible for cloud-first competitors to copy without breaking their privacy promise.
3. **Conversational interface over a structured event layer** — chat, not reports. Streaming, timestamp-linked, scrubs the 3D replay.
4. **Privacy as code** — the default mode runs locally; every external call is flagged. The marketing copy ("your data doesn't leave your device") is also the architecture.

If NextFlight ships those four in sequence, Parametrics can't catch up without rebuilding from scratch. If NextFlight ships "AI coaching but nicer," it loses in six months.

---

## 2. The 7 Best Ideas — Ranked

*Scoring axis: novelty × pilot impact × technical feasibility. Mediocre ideas killed on sight.*

### #1 — Per-flight atmospheric reconstruction (the Skew-T moment)
**From:** `weather-reconstruction-research.md`
**Effort:** L (12–14 weeks to v0.5)

**What it is.** Given the IGC, pull ERA5 (or COSMO-REA6 in Europe) for the flight's bounding box and time. Pull the nearest radiosonde. Pull Pioupiou stations inside the box. Extract the pilot's own evidence: wind-from-circle-drift, BLH-from-thermal-tops envelope, climb-rate-as-CAPE-proxy. Inverse-variance-blend all of it into a structured "atmospheric report card." Render it as a Skew-T with the pilot's thermals drawn on as horizontal bars.

**Why it's different from anything that exists.** RASP is *forecast*. Skysight is *forecast*. WeGlide attaches forecasts. Nobody closes the loop between IGC and a reanalysis. Nobody uses the pilot's own flight as observational data to correct the reanalysis. The math is undergraduate; the data is free; the moat is the pipeline plus the dataset that accumulates as users upload.

**What it unlocks strategically.** Coaching with receipts. *"You topped out at 1,380m at 14:42 and gave up. Payerne's 12Z sounding showed a 3K inversion at 1,420m — nobody else made it through that layer all day."* This is the demo that sells the product. It is also the academic moat: 20 years of XContest IGCs treated as an atmospheric observation network is publishable.

---

### #2 — "Chat with Your Flight" over a structured event layer
**From:** `strategy-final.md` (recommendation #1)
**Effort:** M (2–3 weeks)

**What it is.** A right-panel chat next to the 3D globe. Pilot types "why was I low at 14:30?", LLM responds in streaming text with clickable timestamp markers that scrub the CesiumJS replay. The LLM is fed the structured `{flight_summary, thermals[], glides[], events[], decisions[]}` JSON — not raw GPS — so responses are fast, cheap, and grounded.

**Why it's different.** No paragliding tool ships a conversational interface. Every competitor ships *reports* (Parametrics) or *dashboards* (XC Analytics, XCviewer). The chat removes the cognitive translation step: pilots land with a question, not a desire to study statistics.

**What it unlocks strategically.** Everything else plugs into this layer. Habit detection, atmospheric reconstruction, ghost tracks, narration — all consume the same structured event JSON. The chat *is* the platform; every other feature is a view on top. Highest impact-to-effort ratio in the entire space.

---

### #3 — Multi-session habit detection ("Your flight DNA")
**From:** `strategy-final.md` (recommendation #2)
**Effort:** M (3–5 weeks; depends on #2)

**What it is.** After 5+ flights, surface patterns across the corpus. *"You consistently over-stay morning thermals and under-stay afternoon ones. In your last 6 flights you've left accelerating thermals early in the 13:30 window — this is a habit, not a one-off."* All storage in IndexedDB; no server.

**Why it's different.** Single-flight coaching is impressive once. A coach who remembers your last 20 flights and identifies the same mistake compounding since March is irreplaceable. Parametrics structurally cannot do this without breaking its cloud privacy promise.

**What it unlocks strategically.** The deepest retention hook in the space. Shifts the product narrative from "AI debrief tool" to "AI coach that learns your tendencies" — different category, higher willingness to pay, harder to displace. Also: this is the feature pilots renew Pro for.

---

### #4 — Same-day ghost tracks with comparative coaching
**From:** `strategy-final.md` (rec #5) + `novel-viz-research-gpt.md` (4b: behavioral cloning)
**Effort:** M (2–4 weeks for ghost tracks; +M for the behavioral cloning upgrade)

**What it is.** Pull public XContest flights from the same day and 5–10km radius. Render as semi-transparent ghost tracks on the globe. The LLM gets the comparison data: *"You and the pilot who flew 35km further made the same decision at the first thermal. The divergence happened at 13:50, when she committed east at 1,520m and you went west."* Upgrade path: filter ghost tracks to top-10 XContest pilots only ("fly alongside the world champion").

**Why it's different.** Nobody fuses same-day ghost-track replay with AI narration of the divergence points. XContest shows other pilots' flights as static replays; nobody contextualizes them in *your* flight's decision tree.

**What it unlocks strategically.** Comparative coaching without breaking the privacy promise (the comparison data is already public; your flight stays local). The path from analytical coaching ("you left this thermal at 1,350m") to comparative coaching ("you left at 1,350m; the pilot who flew further left at 1,550m"). And it's the foundation for the eventual ML-based imitation-learning model.

---

### #5 — Conditional thermal map (kk7 done properly for the LLM era)
**From:** `thermal-research.md` (items 1, 3, 5 — the killer combo)
**Effort:** L (3–4 months end-to-end: extraction → H3 grid → NWP-residual model → LLM tool)

**What it is.** Re-derive thermal probability layers from IGC at H3 resolution 9–10, sliced by (month × hour-since-sunrise × wind-direction × wind-speed). Train a gradient-boosted residual model that takes ICON-D2 / AROME forecast features + terrain features and predicts thermal density/strength corrections vs. the climatology. Expose to the LLM coach as a tool: `get_thermals_near(lat, lon, radius, conditions)`.

**Why it's different.** kk7 ships a single unconditional layer in raster tiles under CC BY-NC-SA. WeGlide ships 25 conditional layers but for gliders only and Europe only. *Nobody* ships a conditional, LLM-queryable, NWP-corrected paragliding thermal model. The NWP-residual model is publishable — no paper exists doing this with paraglider IGCs as ground truth.

**What it unlocks strategically.** Two things. (a) The coach can say *"You missed a reliable 2.3 m/s thermal at the south-facing spur 400m to your west, which historically works between 11:00 and 15:00 in NW flow."* That's not analysis — that's local knowledge. (b) It generalizes the product beyond the Alps: a trigger-prediction model trained on densely-flown regions can extrapolate to under-flown ones using terrain + landcover features, opening every site on Earth.

---

### #6 — 3D atmospheric rendering (the thermal column + cloud ceiling + wind layer)
**From:** `thermal-research.md` (3E, Tier 1 #2 and Tier 2 #6) + `novel-viz-research.md` (1.1 LCS) + `novel-viz-research-gpt.md` (3a Condor-style)
**Effort:** M (Condor-style thermal columns + cloud ceiling: 2–4 weeks); XL if going full FTLE/LCS

**What it is.** CesiumJS doesn't just replay the *track* — it renders the *atmosphere*. Translucent thermal column cylinders at hotspots (Condor-style, with bubble tops at BLH). Cloud base as a translucent ceiling. Inversion layers as horizontal planes. Wind layers as animated particle flow fields. The reachable glide cone from the current altitude. *Stretch goal:* FTLE/LCS rendered as translucent membranes — the "wind anatomy" of the site.

**Why it's different.** Every paragliding 3D tool today (SkyViz, Ayvri-rip, Flightline, replay.flights, kk7 KMZ in Google Earth) renders the *track* in 3D. None render the *atmosphere*. The closest analog is MSFS 2024's visible thermals (Meteoblue-driven) — but it's a simulator, not an analysis tool. CesiumJS + custom shaders + particle systems gets you there with no fundamental tech blockers.

**What it unlocks strategically.** Demo gold. This is the visualization that gets screen-recorded and shared on Twitter. It also makes the atmospheric reconstruction (#1) *legible*: the Skew-T is for nerds; the cloud ceiling visibly capping the pilot's track is for everyone.

---

### #7 — Wing polar estimation from GPS alone
**From:** `novel-viz-research-gpt.md` (1a)
**Effort:** S–M (2–4 weeks for MVP)

**What it is.** Two-phase: (1) wind from circling drift (already solved — port from XCSoar). (2) During straight glides with wind now known, true airspeed = groundspeed − wind. Plot airspeed vs. sink rate from baro altitude → the wing's actual polar curve from any flight, no pitot, no instrumentation. After 30 flights you have a per-pilot polar that beats any manufacturer spec sheet.

**Why it's different.** Pilots have complained for decades that manufacturer polar data is fiction. Nobody has shipped a "your actual glide ratio in real conditions, estimated from your own flights" feature. It's also the foundation of a wing-comparison product nobody else can build: a crowdsourced polar database for every wing model from XContest flights.

**What it unlocks strategically.** Three things. (a) Detect wing degradation across a season ("your polar dropped 8% since June — possible line damage"). (b) Counterfactual coaching: "if you'd flown your A-wing instead of your B today, you'd have made the LZ." (c) The wing-manufacturer co-marketing play (mentioned in monetization) becomes concrete: Ozone/Advance/Nova want this data for their R&D.

---

### Explicitly killed
- **Sonification of flight data** (novel-viz-gpt 5a): cute, low-impact, won't drive a subscription.
- **Generative art from IGC tracks** (novel-viz-gpt 5d): one-off Instagram moment, not a moat.
- **Social proof in launch timing** (novel-viz-gpt 2c): interesting research question, no product wedge.
- **Federated learning for privacy-preserving aggregation** (strategy section 5D): complexity-to-value ratio is wrong for a solo dev. Aggressive aggregation + opt-in does the same job at 5% the engineering cost.
- **Full POMDP / RL flight planner**: the academic angle is real but the product angle is "a good MacCready planner with the conditional thermal map as the field" — same value, 10% the effort.
- **On-device LLM (WebLLM)**: blog post, not a default. Privacy Mode toggle for v2.
- **School dashboards as v1 B2B**: wrong order — coach-pilot Loom-style sharing is the real bridge.

---

## 3. The "Holy Shit" Demo Sequence

*Five minutes, scripted moment-by-moment. If a developer demoed this at a tech conference, it should land.*

**Setup:** browser tab open, NextFlight loaded, no login screen, just a drop zone. A real IGC file from a flight in the Dolomites pre-loaded on the desktop.

---

**0:00 — The drop.**
Drag the IGC into the browser. Within 3 seconds: the 3D globe renders the flight track, terrain rotates into view, and a one-paragraph debrief slides into the right panel ending with a single concrete action: *"You left thermal #4 at 14:42 with 80m less margin than the optimal exit. Next time: leave 200m earlier when the next trigger is >4km away."* **No upload screen. No account.** "Yes — it really just ran. Locally."

**0:30 — The chat.**
Type into the right panel: *"Why was I low at 14:30?"* Streaming response: *"At 14:30 you were at 1,124m — your lowest point in the last hour. Two reasons: you left La Loma at 1,280m when it was still climbing (circle 6 of 8 showed acceleration), and your glide was 18% below polar — wind picked up at altitude. Flag 14:18 →"*. Click the timestamp. The 3D replay scrubs to 14:18. The thermal at La Loma highlights on the globe.

**1:15 — The atmospheric reveal.**
Hit the "Atmosphere" toggle. The 3D scene transforms: a translucent ceiling appears at 1,800m (cloud base). A faint red plane materializes at 1,820m (inversion). The pilot's track suddenly *visibly* bonks against the inversion at every thermal top. Click "Skew-T". A diagram opens. The day's atmospheric profile — reconstructed from ERA5 + the Payerne radiosonde + 14 thermals from this flight — renders with the pilot's thermals drawn as horizontal bars across it. *"This is reconstructed from ERA5 + COSMO-REA6 + Payerne 12Z sounding + your own 14 thermals. Confidence 0.81."* The audience leans forward.

**2:30 — The ghost tracks.**
Click "Show me other pilots from this day." Four semi-transparent ghost tracks materialize on the globe, each labeled with XC distance. The pilot's track is 22km; the top track is 67km. The chat speaks unprompted: *"Of 12 pilots who flew this site today, the median XC was 38km. Your divergence from the top track was at 13:50 — she committed east at 1,520m, you went west. Her altitude budget at that decision point was 200m higher than yours."* The exact divergence point pulses red on the globe.

**3:30 — The voice narration.**
Hit "Play" on the 3D replay. A coach voice (ElevenLabs) begins narrating in sync with the track: *"Eleven forty-seven, you're entering your first thermal off the south face. Good entry — heading straight for the core. Eleven fifty-one, centered. Average climb one-point-eight meters per second, time-to-core forty-five seconds — that's competitive. Watch what happens at thirteen-fifty."* The camera tilts. The audience watches a flight being commentated like a sports broadcast.

**4:15 — The habit DNA.**
Click "Your flight DNA." A view of all 20+ uploaded flights opens. A pattern card surfaces: *"In your last 6 flights, you've consistently left accelerating thermals 90 seconds early in the 13:30–14:30 window. Your other thermal phases are 12% above average. This is a single habit, not a skill problem. Set a rule: any thermal showing climb-rate growth in the last 4 circles gets at least 90 more seconds."* The pattern includes a button: "Practice this on next flight" — which adds it to the in-flight reminder list on the pilot's phone.

**5:00 — The close.**
"All of that ran locally. Nothing left this browser. The atmospheric data, the ghost tracks, the coaching — everything's on the device. The pilot owns it." Walk away.

---

**Why this demo lands:** It's the entire product spine in five minutes. It hits the three angles every research thread converged on — atmospheric reconstruction (the "receipts" moment), conversational interface (the chat), and visualization that goes beyond track-replay (the atmosphere overlay). Each beat earns the next. The audience leaves understanding *exactly* what's structurally different.

---

## 4. The Data Moat

*Ranked by moat strength. Strength = (how hard to replicate) × (how much it improves coaching).*

### Strongest moat: the IGC-as-instrument archive
Every uploaded flight is an atmospheric observation: wind at altitude (from circle drift), BLH (from thermal-top envelope), CAPE proxy (from climb rates), turbulence (from baro noise + heading perturbation). Aggregate across a few thousand users over a year and you have a hyper-local atmospheric observation network at altitudes (1,500–3,500m AGL) where official meteorology has nothing. **Replication cost for a competitor: 2+ years of building both the product and the user base.**

### Tier 1: kk7-conditioned thermal layers (your own)
H3 spatial grid at resolution 9–10. Conditional aggregation by (month × hour-since-sunrise × wind-direction × wind-speed). Built from your own users' IGCs first, then expanded via XContest partnership. *Why this beats kk7:* conditional slicing, LLM-queryable, your own data instead of CC BY-NC-SA raster tiles. **Replication cost: 6+ months and a data partnership.**

### Tier 2: ERA5 + COSMO-REA6 + Pioupiou + radiosonde fusion pipeline
The pipeline itself is engineering, not a moat. But the *caching layer* — flights that have been reconstructed before share grid cells and time windows with new flights — compounds with every upload. After 100k flights, 80%+ of cache hits are warm. **Replication cost: ~3 months engineering + ongoing cloud spend a competitor wouldn't justify without users.**

### Tier 3: XContest ghost tracks (consumed-public, not collected)
Public data; the moat is in the *matching logic* (same-site, same-day, similar-conditions filter) and the LLM-driven divergence analysis. Replicable, but the integration story matters: a clean ToS-respecting API partnership with XContest is a meaningful asset. **Replication cost: low for the data, medium for the legal partnership.**

### Tier 4: NWP-residual model (ICON-D2/AROME + terrain + IGC)
The model itself is a single GBM — anyone with the data can retrain. The moat is the *training set*: your IGC archive + your NWP feature cache. **Replication cost: as long as it takes a competitor to build the IGC corpus.**

### Tier 5: crowd-sourced wind field from circling drift
Same logic as the IGC archive but specifically for the wind dataset. Pioupiou + XCTrack's existing wind extraction + your aggregation = a 3D wind field nobody can match. *XCTrack already does the wind computation on millions of phones; nobody has built the backend to aggregate it.* **Replication cost: build the same product, win the same users.**

### Tier 6: wing polar database
After enough users on enough wing models, you have a crowd-sourced polar database that beats every manufacturer spec sheet. This is a Trojan horse for the wing-manufacturer co-marketing play. **Replication cost: same as the IGC corpus.**

---

## 5. The Research Agenda (What Nobody Has Built)

*5 open research questions. Publishable. These are the blog posts, papers, and conference talks that attract serious engineers to the project. They are also the technical reasons the moat is real.*

### R1 — IGC tracks as a paragliding atmospheric reanalysis dataset
**The question:** can a population of paraglider tracks reconstruct the planetary boundary layer's actual structure (wind, BLH, instability) at 1500–3500m AGL with sufficient accuracy to *correct* ERA5 in mountain terrain?
**Why nobody has done it:** the techniques exist in pieces (Daley/Kahn wind-from-circle, Reddy/Vergassola RL soaring) but nobody has industrially fused them at population scale against a public reanalysis.
**The deliverable:** an arXiv paper "*The IGC Archive: 20 Years of Paragliders as Distributed Atmospheric Sensors*" with code + a public dataset of reconstructed conditions for X million historical flights. Massive credibility play.

### R2 — Transformer-based thermal segmentation (post-Viterbi)
**The question:** does a transformer encoder over fixed-stride GPS sequences + terrain crops beat the Viterbi heuristic in igc_lib on noisy/edge thermals, AND produce useful embeddings for downstream tasks (route similarity, pilot fingerprinting)?
**Why nobody has done it:** no labelled paragliding thermal dataset exists. Build one.
**The deliverable:** a paper benchmarking against igc_lib on a curated set, with the embeddings released. Foundation model for paragliding flights.

### R3 — NWP-residual learning on pilot-track ground truth
**The question:** can a gradient-boosted residual on top of ICON-D2/AROME features systematically correct convection-permitting NWP for the spatial smearing of thermals in mountain pockets?
**Why nobody has done it:** the data is hard to assemble, and the closest existing work (Regtherm) is hand-coded physics, not ML.
**The deliverable:** a publishable result that directly improves NextFlight's tomorrow-forecast and adds 3D atmospheric overlays to every replay.

### R4 — FTLE / Lagrangian Coherent Structures from sparse paraglider tracks
**The question:** can you solve the inverse problem of reconstructing atmospheric LCS from opportunistic, sparse, multi-day paraglider tracks at a single site? The "albatross-LCS" hypothesis says yes; nobody has tested it for free-flight.
**Why nobody has done it:** the inverse problem is hard, the visualization is unfamiliar, the academic audience is split between fluid-dynamics and movement-ecology and there's no bridge.
**The deliverable:** an interactive demo + paper that does for paragliding what oceanographers did for chlorophyll: render the invisible flow skeleton of the air. Demo gold. Defensible IP.

### R5 — Plan continuation bias measured from GPS
**The question:** can the GPS signature of plan-continuation bias (decreasing glide cone + sustained groundspeed-to-goal + reduced exploration radius + late-day timing) be quantified, and does it correlate with DHV/SHV incident reports?
**Why nobody has done it:** the human-factors literature is qualitative; the GPS data is in a separate community.
**The deliverable:** a paper that makes a well-documented cognitive trap measurable, plus a per-flight "commitment bias index" that becomes a safety differentiator. The B2B school market loves this.

---

## 6. Prioritized Build Sequence

*Six months. Sprint-by-sprint. Each sprint deliverable unlocks the next.*

### Sprint 1 (weeks 1–3) — The structured event layer + chat
**Goal:** the foundation that everything else plugs into.
**Build:**
- Canonical flight JSON schema: `{flight_summary, thermals[], glides[], events[], decisions[]}` emitted by the Python backend.
- LLM chat endpoint (stateless POST, streaming response, structured timestamp markers).
- Chat UI on the right of the CesiumJS globe; clicking a timestamp scrubs the replay.
**Deliverable:** Demo #1 from the holy-shit sequence. The product feels different in 90 seconds.
**Unlocks:** every subsequent feature reads from the same JSON. No coupling drift.

### Sprint 2 (weeks 4–5) — Shareable debrief + Coach link
**Goal:** virality engine + B2B bridge with zero new product surface.
**Build:**
- Shareable read-only URL with the debrief + simplified 3D viz + social card PNG.
- "Share with Coach" variant (same infra, no social card, debrief + replay focused).
- Privacy-clear opt-in per share.
**Deliverable:** every shared link is free marketing; every coach who clicks is a future paying user.
**Unlocks:** the B2B coach-pilot data signal (when 5%+ of users start sending coach links, build the coach-side tool).

### Sprint 3 (weeks 6–8) — Pre-generated 3D replay narration
**Goal:** the demo feature that gets screen-recorded.
**Build:**
- Extend the coaching pass to emit a timestamped narration script with camera hints.
- ElevenLabs TTS synthesis once per flight, cached as audio.
- CesiumJS timeline triggers audio playback + optional camera angle adjustments.
**Deliverable:** Demo #2. Recruiters lean forward.
**Unlocks:** the "AI portfolio" narrative + accessibility angle.

### Sprint 4 (weeks 9–12) — Atmospheric reconstruction v0.5
**Goal:** the unique moat. The thing nobody else does.
**Build:**
- IGC analytics: phase segmentation, thermal extraction, drift-wind extraction, BL-top envelope (probably reuse a lot from Sprint 1).
- ARCO-ERA5 Zarr fetcher with per-cell caching layer (Parquet).
- Pioupiou + DWD SYNOP + Wyoming/IGRA observation fetchers, unified `Observation(time, lat, lon, z, var, value, σ)` schema.
- Inverse-variance fusion for BLH + wind aloft.
- Structured atmospheric report card (YAML/JSON).
- Skew-T-with-thermals-overlay visual.
- LLM coaching layer consumes the report card and emits "coaching with receipts."
**Deliverable:** Demo #3 — the atmospheric reveal moment. "Your flight wasn't your fault — the sounding closed at 14:42."
**Unlocks:** the moat. Also: every flight uploaded after this date becomes part of the IGC-as-instrument archive (R1).

### Sprint 5 (weeks 13–16) — Multi-session habit detection ("Your flight DNA")
**Goal:** the retention layer. The reason pilots renew Pro.
**Build:**
- IndexedDB schema for flight summaries (indexed by date, site, key metrics).
- Habit detection job — runs locally on summary update; surfaces patterns when ≥4 flights show the pattern.
- "Your flight DNA" dashboard view with trend lines and evolving habits.
**Deliverable:** the product shifts category from "debrief tool" to "coach that learns your tendencies."
**Unlocks:** Pro→Pro+ upgrade path; the structural moat against Parametrics.

### Sprint 6 (weeks 17–20) — Same-day ghost tracks + comparative coaching
**Goal:** the demo close + the path to imitation learning.
**Build:**
- XContest data access (API partnership preferred; scraping only if ToS-clean).
- Same-day, same-site, similar-condition flight matching.
- Ghost track rendering on the globe with divergence-point computation.
- Comparative coaching prompts in the LLM context.
- **Stretch:** filter ghost tracks to top-10 XContest pilots ("fly alongside the world champion") — the simplest version of imitation learning.
**Deliverable:** Demo #4 from the holy-shit sequence. The product is now demo-complete.
**Unlocks:** the path to the full behavioral-cloning model (sprint 7+); the wedge for the wing-manufacturer co-marketing pitch.

### Beyond month 6 — directional bets
- **Sprint 7+ paths (pick based on traction):**
  - **A. 3D atmospheric layer in Cesium** (cloud ceiling, wind particles, eventually FTLE) — best demo upgrade.
  - **B. Conditional thermal map (kk7 done properly) + NWP-residual model** — best moat expansion.
  - **C. Wing polar estimation + crowd-sourced polar database** — best wing-manufacturer wedge.
  - **D. Coach-side annotation tool** — best B2B move once coach-link usage signals demand.
- **Sprint 9+:** plan continuation bias detector (R5) for the safety/school market.
- **Sprint 12+:** transformer-based thermal segmenter (R2) once the labelled dataset is big enough.

---

## Engineering principles to encode now

- **Privacy as code, not policy.** Every off-device call requires an explicit flag, surfaces in a user-visible audit log, defaults to off. Enforce with a `requires_network` capability flag on every backend module.
- **Structured event layer is the contract.** Every feature reads from the same JSON. The chat layer must not reach back into the IGC parser.
- **Cache everything.** ERA5 grid cells, wind, terrain, airspace, ghost tracks. Solo dev economics depend on it. Cache hit rate for atmospheric reconstruction will be >80% after enough flights — design for it from day one.
- **IGC edge cases are the unsexy work that determines whether the product is trusted.** Build a robust test suite of real-world IGCs (Flarm, LXNAV, XCTracer, Kobo, Flymaster, SkyTraxx) early. Thermal detection that breaks on Flymaster files is a product that loses trust quickly.
- **The atmospheric reconstruction pipeline is async by default.** A cache-cold cell can take 30s+. Set the UX expectation early — "your reconstruction is ready in ~60s, here's a notification" — rather than fighting the latency.

---

## TL;DR

Build Sprint 1 (chat). Then Sprint 4 (atmospheric reconstruction). The first sells the product in 90 seconds; the second is the moat that takes Parametrics two years to replicate. Everything else is sequence.

If you could only do one thing: **per-flight atmospheric reconstruction with a Skew-T-and-thermals-overlay**. Twelve weeks to a demo that sells itself.

If you could only do two: add **multi-session habit detection** as the retention layer.

If you could only do three: add **same-day ghost tracks** for comparative coaching.

The other four ranked ideas (chat, atmospheric 3D rendering, conditional thermal maps, wing polar) all compound on those three. Ship in that order, you have a product. Ship out of order, you have a Parametrics clone with extra steps.

---

*Master brief synthesized from five research threads, May 17 2026. Built to be opinionated, not encyclopedic. Designed to walk into a Monday product conversation and decide what to build first.*
