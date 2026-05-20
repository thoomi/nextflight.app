# NextFlight – Thermal Maps & Flight-Path Analysis: State of the Art and Most Promising Directions

_Research brief, May 2026. Compiled by Elli for the NextFlight product conversation._

---

## 0. Executive Summary

### What "k8n" almost certainly refers to

"**k8n**" is not a published algorithm, model, or library. After targeted searching of the paragliding/soaring literature and tooling ecosystem, the only credible referent is **kk7** — i.e. **thermal.kk7.ch**, the de-facto canonical thermal-map / skyways service in the free-flight world, built by **Michael ("Michi") von Känel** at ETH Zürich. The "k8n" rendering looks like a number-style abbreviation of the operator handle "**kk7**" (mistyped as "k8n" — qwerty 8 is adjacent to k7, "n" is right of "k"), or a half-remembered numeronym in the style of k8s/i18n. There is no Kubernetes-style algorithm called "k8n" in this domain.

> If the user really meant something else by "k8n" (e.g. a private/internal name), the next likeliest candidates are: K8s-style abbreviation of a long German term, a specific kernel/convective scheme (no match found), or a tool from a small dev community. None show up in search. **High-confidence answer: k8n ≈ kk7.**

kk7 (`thermal.kk7.ch`) is the closest thing the sport has to a "default thermal-map standard." It:

- Aggregates IGC tracks from XContest and Leonardo-based servers (DHV-XC, paraglidingforum etc.).
- Filters to XC flights only and removes pure soaring.
- Produces four layers: **Skyways** (stacked tracks), **Certainty** (data-density mask), **Thermals** (probability heatmap of "you'll find lift here, given you can reach it"), and **Hotspots** (vectorised peaks of the thermal layer, exportable to flight computers as CUP/GPX/WPT).
- Allows filtering by **time of year** (sliding 3-month windows) and **time of day** (hours since sunrise: morning 0–6, midday 6–10, evening later).
- Originated from a Master's thesis "**ParaglidingNet – A Sensor Network for Thermal Research**" and the academic paper "**Ikarus: large-scale participatory sensing at high altitudes**" (ETH/TIK).
- Is licensed **CC BY-NC-SA 4.0** — meaning NextFlight cannot simply rehost the tiles commercially, but can build directly comparable layers from raw IGC data.

### Three most promising directions for NextFlight

1. **A "kk7 done properly for the LLM/coaching era"** — re-derive thermal probability layers from IGC tracks yourself (you control the data + can produce *conditional* layers: by wind direction, cloud base height, day type, season, time-since-sunrise), then expose them as a structured grid that the coaching LLM can *read and reason about*. This is the gap kk7 leaves wide open: the data exists but is locked in CC BY-NC-SA raster tiles with no machine-readable conditional slicing. WeGlide has done a glider-only version (25 maps = 5 time × 5 wind dirs) — but only for Central Europe and only for gliders. **Nobody has shipped this for paragliding with a coaching LLM in the loop.**

2. **Pilot-track-conditioned NWP correction** — train a small model on (NWP forecast features, terrain features, time-of-day) → (observed thermal density / strength from IGC tracks). This is the most under-explored ML angle: NWP models (AROME 1.25 km, ICON-D2 2.2 km) systematically over- or under-predict thermals in specific terrain pockets, and pilot tracks are the ground truth. A small XGBoost / gradient-boosted residual model on top of AROME/ICON-D2 is a 2–3 month project that would beat both raw NWP and pure climatology.

3. **3D *atmospheric* visualisation in CesiumJS, not just track replay** — every existing tool (SkyViz, Ayvri-rip, Flightline, kk7's GE export) replays the *track* in 3D. None render the **atmosphere itself** — thermal columns as semi-transparent volumes, wind layers as flow fields, cloud base as a translucent ceiling, BL height as a horizon. CesiumJS supports all of this (`Cesium3DTileset`, `Primitive` with custom shaders, particle systems for wind). Pair it with a coaching LLM that says "see the missed thermal at minute 47? it was 200 m to your west, off the south-facing spur" — and you have something nobody is shipping.

The rest of this document substantiates these claims and gives effort estimates at the end.

---

## 1. What is k8n in this context?

### Search results

Searches for `"k8n" paragliding`, `k8n thermal map`, `k8n soaring`, and variants returned no direct hits. The closest semantic match across all reasonable substitutions:

| Candidate | Plausibility | Notes |
|---|---|---|
| **kk7 → kk7 thermal maps** | **Very high** | Operator handle of Michael von Känel; runs thermal.kk7.ch; mistype "kk7" → "k8n" is one-key drift on QWERTY (k–k→k–8, 7→n is adjacent on numpad). Aligns with "thermal map for paragliding" framing exactly. |
| K8 / Ka-8 glider | Low | A real sailplane (Schleicher K 8), but not a model/algorithm; doesn't fit "map" framing. |
| K2 paramotor wing | Low | A wing name, not analysis software. |
| Numeronym for German term (e.g. "Konvektion") | Low | No matching numeronym convention in DACH paragliding press. |
| Kain–Fritsch convective scheme (KF) | Worth flagging | Standard cumulus-parameterisation scheme in NWP. Not "k8n", but is directly relevant to thermal forecasting (see §3B). |

**Working assumption for the rest of this document: k8n = kk7 (thermal.kk7.ch).** All recommendations are written so they still apply if "k8n" turns out to mean something more exotic — because the right roadmap for NextFlight is "do better than kk7," regardless of what the abbreviation was.

### kk7 in one paragraph

`thermal.kk7.ch` is a single-author research-grade project that scrapes IGC tracks from public XC contest sites, filters them, runs a heuristic thermal-detection pass (Viterbi-smoothed bearing-rate + ground-speed), bins thermals into a spatial grid, computes a probability layer relative to *reachability* (not raw count), masks low-density cells transparent, and serves the result as raster map tiles + downloadable CUP/GPX hotspot files. It is used inside **XCTrack Pro**, **SeeYou Navigator**, **LK8000**, **XCSoar**, **FlightVario**, and most other serious flight computers, usually under the "kk7 layer" or "thermal layer" label.

**This is the baseline NextFlight has to beat — or at minimum integrate with intelligence on top.**

Sources: <https://thermal.kk7.ch/> (about/help page) · <https://tik-db.ee.ethz.ch/file/96a1f747a188c88b46ab12ed719db18c/hotmobile11_220.pdf> ("Ikarus" paper) · ParaglidingNet thesis (linked from thermal.kk7.ch).

---

## 2. Current state of thermal mapping

### 2.1 kk7 (the standard)

Already covered above. Key technical notes:

- **Density requirement**: ~20 flights per 100 m² cell minimum to be meaningful. Outside this, the layer is hidden.
- **Reachability conditioning**: the probability is "P(thermal | you can fly there)", which is why valley floors usually appear thermal-poor even though triggers exist — pilots can't reach them and recover.
- **Bias**: thermals near popular launches are over-represented (because pilots only upload when they catch the first thermal). This is a *known* artifact.
- **Topology dependence**: works much better in mountains than in flatlands — because Alpine thermals are driven by static surface features (ridges, spurs, sun-facing rock), whereas flatland thermals follow moving cumulus shadows + ploughed fields. Coverage in Brandenburg/Flachland is intentionally sparse.

### 2.2 WeGlide Hotspots (state of the art for sailplanes)

WeGlide (a German glider OLC competitor to SeeYou's WeGlide-precursor) shipped **25-layer conditional hotspots** in 2024:

- 5 time-of-day buckets × 5 wind-direction buckets = 25 distinct maps.
- Built from "over 10 million thermals" extracted from glider IGC tracks.
- Central Europe only (Alps + flatlands), explicitly because density elsewhere is too low.
- Currently behind Copilot Pro subscription, free maps coming to the planner page.

This is the most advanced *production* conditional thermal map shipping today, but it is **glider-only**, and gliders use thermals very differently from paragliders (faster transitions, much higher BL altitudes, much wider thermal cores at altitude, very different climb-rate distributions). Their hotspots are misleading for free-flight pilots in many situations.

Source: <https://magazine.weglide.org/thermal-hotspots-gliding-copilot-weglide/>

### 2.3 Paraglidable.com (flyability, not thermals)

Paraglidable predicts, per site per day:

- P(any flight is reported today)
- P(an XC flight ≥ 60 PWC points is reported today)
- A wind sub-score
- A humidity sub-score

…all conditioned on "the full weather vector of the day, assuming a given paraglider's local population." In effect, a logistic/GBM model on NWP features, trained against flight-report-or-not labels from public XC databases.

This is **complementary** to kk7, not competitive: kk7 says *where* thermals are; Paraglidable says *whether the day is on at all*. Both are needed for serious XC planning.

Source: <https://paraglidable.com/>

### 2.4 Thermal Information Map (TIM, thermalmap.info)

By Richard & Tim Stuhler (German). Uses **OGN (Open Glider Network)** FLARM transmissions — i.e. live altitude trails from gliders carrying FLARM beacons — to detect circling and infer thermal hotspots. Differentiator: not bound to IGC uploads, more real-time, but limited to areas with FLARM coverage (mostly Alps + western Europe). Useful as a near-realtime feed nobody is leveraging in the paraglider app world.

Source: <https://thermalmap.info/>

### 2.5 RASP / BLIPMAP family (drjack.info)

RASP = **Regional Atmospheric Soaring Prediction**, built by Dr. John W. ("Dr Jack") Glendening. It runs a customised WRF (Weather Research & Forecasting) model with **soaring-specific post-processing**, producing BLIPMAPs ("Boundary Layer Information Prediction Maps"): thermal updraft strength, BL depth, BL top wind, cloud base, "B/S ratio" (thermal-strength / sink), Cu potential, OD potential (over-development), etc.

**Strengths:** physics-based, deterministic, free, run by volunteer regions worldwide, gives forecast for *tomorrow* (kk7 can't — it's pure climatology).
**Known limitations:**
- Resolution is whatever the local volunteer can afford to run (often 4–12 km), often too coarse for paragliding terrain.
- Convection parameterisation is approximate; thermal *locations* are smeared.
- Output is static images on a website, not an API. Hard to integrate.
- Requires the user to interpret the maps; no plain-language coaching layer.

Modern replacements include **Regtherm** (uses ICON-EU / ICON-D2 + thermal post-processing) and **Meteoblue's thermal/aviation page** (uses MULTIMODEL ensemble + their own convection diagnostics). XCSkies bundles many.

Source: <https://drjack.info/RASP/> (intermittently up) · <https://xctherm.com/en/regtherm> · <https://content.meteoblue.com/en/private-customers/website-help/aviation/thermal-forecast>

### 2.6 Aggregator tools (igc_lib, Ulrich Scheller, etc.)

The open-source pipeline most hobbyists use:

- **`igc_lib`** (marcin-osowski/igc_lib on GitHub, formerly xiadz) — Python library. Detects flight phases using **Viterbi-smoothed ground-speed and bearing rate-of-change** to segment thermals vs glides. Battle-tested on hundreds of thousands of IGC files. *This is the algorithm you would extend.*
- Ulrich Scheller / Maximilian Koch's 2021 work (`ulrich-scheller.de/paragliding-data-gems/`) — scrapes DHV-XC, runs igc_lib, produces time-of-day heatmaps that exactly reproduce the kk7 morning-vs-evening pattern (east faces light up first, west faces light up last). Confirms the approach is replicable in a weekend with the right data access.

Sources: <https://github.com/marcin-osowski/igc_lib> · <https://www.ulrich-scheller.de/paragliding-data-gems/>

---

## 3. The most promising advancements

### 3.A — ML/AI for thermal detection from flight tracks

**Published academic work specifically on "ML from paragliding IGC tracks" is thin.** What exists:

- **Reddy, Wong-Ng, Celani, Sejnowski, Vergassola (2018, Nature)** — "Glider soaring via reinforcement learning in the field." Trained autonomous gliders to soar real thermals using RL with vertical-wind acceleration and roll torque as sensorimotor cues. Reached ~700 m AGL. This is the *gold-standard* RL-soaring paper. Precursor in PNAS 2016.
  Source: <https://www.pnas.org/doi/10.1073/pnas.1606075113>, <https://reddylab.physics.princeton.edu/publications/glider-soaring-reinforcement-learning-field-0>
- **Various MDPI/Aerospace papers** apply CNNs and LSTMs to UAV soaring trajectory data — but these are simulation studies on synthetic thermal fields, not retrospective analysis of pilot IGC tracks.
- **`igc_lib`** is essentially the only widely used heuristic detector. It uses a 2-state HMM-style Viterbi smoothing of speed + turn rate. **There is no published transformer/CNN model that beats it on thermal segmentation of real IGC tracks** — this is a publishable result waiting to happen.

**State of the art on the questions you asked:**

| Task | Best current method | Realistic accuracy |
|---|---|---|
| Identify thermal core (center) | Mean of GPS positions during circling phase, weighted by vario (when available) | Within ~30–60 m horizontally, OK for visualisation, poor for live in-flight centering guidance |
| Estimate thermal strength | Mean climb rate over the circling segment from GPS altitude derivative | ±20% vs IMU-vario; biased low for short thermals due to GPS lag |
| Predict thermal location from terrain alone | Climatology (kk7 style) + simple terrain features (slope, aspect, NDVI) → GBM or random forest | Modest. Captures "south faces at midday" but misses subtleties |
| Predict thermal location from NWP + terrain | Almost nobody does this with ML on top of NWP. Regtherm comes closest but is hand-coded physics. | **Wide open opportunity.** |

**Datasets**: there is **no curated, public, labelled paragliding-thermal dataset** in the ML/aerospace literature. XContest IGCs are available with scraping; WeGlide has an API for gliders; DHV-XC allows download but with rate-limiting. Building a clean labelled dataset (IGC → terrain features → NWP features → thermal segments → strength) would itself be a contribution.

**Recommended architecture if you build one**: a per-track sequence model (transformer encoder over fixed-stride GPS positions: lat/lon/alt/heading/turnrate/groundspeed at 1 Hz, plus terrain rasters cropped around each position) → token-level head predicting `{ground, glide, thermal, ridge-soar, other}`. Beats Viterbi heuristics on noisy/edge cases, and the embeddings become useful for many downstream tasks (route similarity, pilot-style fingerprinting, etc.).

### 3.B — Physics-informed models

| Model | Resolution | Domain | Convection scheme | Useful for paragliding? |
|---|---|---|---|---|
| **ECMWF IFS** | ~9 km | Global | Tiedtke (parameterised) | Too coarse for thermal locations. Synoptic guide only. |
| **GFS** | ~13 km | Global | Simplified Arakawa–Schubert | Same. |
| **ICON-EU** | 6.5 km | Europe | Tiedtke–Bechtold | Borderline; OK for "is the day on?" |
| **ICON-D2** | 2.2 km | DACH + Alps | **Convection-permitting** (no scheme, resolves it) | Yes — good thermal proxies (W at 850 hPa, CAPE, LCL, BL height) |
| **AROME** | 1.25 km | France + adjacent | **Convection-permitting** | Yes — best resolution publicly available in EU |
| **HRRR** | 3 km | CONUS | Convection-permitting (Thompson) | Used by US RASP replacements |
| **WRF (custom)** | 1–4 km | Wherever you run it | **Kain–Fritsch** at >4 km, explicit below | Backbone of RASP/BLIPMAP |

**Kain–Fritsch** is a convection parameterisation scheme used in WRF and many regional models. It triggers convection based on instability + a vertical-velocity threshold and is the source of much of the spatial smearing of forecast thermals — once a model goes convection-permitting (≲3 km), KF is turned off and updraft cells are resolved directly. **Relevance to NextFlight: irrelevant if you use ICON-D2 or AROME directly. Important to understand if you ever try to interpret RASP/BLIPMAP output.**

**The gap between NWP thermal prediction and real pilot experience:** NWP gives you a continuous field of "updraft potential" averaged over a 1–3 km cell. A paraglider thermal core is 50–200 m wide. The gap is therefore:

1. *Spatial smearing* — NWP doesn't know which ridge in the cell will trigger.
2. *Temporal sharpness* — NWP gives hourly averages; thermals have a ~5–20 min lifecycle.
3. *Trigger thresholds* — local triggers (a dark field, a road junction, a quarry wall) are below NWP resolution.
4. *Inversion handling* — capping inversions in stable air masses are routinely under- or over-mixed by NWP, so the BL-top forecast is often off by 200–500 m on the days pilots care about most.

**Closing the gap is the most under-served opportunity in the entire space.** kk7-style climatology answers #1 implicitly (it knows which ridge tends to trigger). Combining the two — NWP for the day + climatology for the trigger — is what *experienced pilots do in their heads*. No tool ships this.

### 3.C — Track aggregation to thermal intelligence

If you had millions of IGC tracks (and XContest/DHV-XC together get you there), the current pipeline is:

1. **Parse IGC** → GPS points at 1–5 Hz with pressure altitude. (`igc_lib`, `pyigc`, `pgnotos`/Skylines `skylines-igc`)
2. **Smooth & segment** → thermal vs glide vs ridge-soar vs ground. (Viterbi on turn rate + speed; or your ML model.)
3. **Extract per-thermal record**: center (lat/lon), entry alt, exit alt, mean climb, duration, wind at altitude (estimated from circle drift), date/time, pilot's takeoff site.
4. **Spatial binning**: H3 hex grid (Uber's, freely available, perfect for this) at resolution 9 or 10 (~150 m or ~50 m). **H3 is the right primitive** — kk7 uses a custom grid, but H3 gives you free neighbour queries, easy aggregation up/down, and works in Cesium.
5. **Conditional aggregation**: per (H3 cell × month-bin × hour-since-sunrise-bin × wind-dir-bin × wind-speed-bin) → P(thermal), mean strength, mean entry altitude, sample count.
6. **Density mask**: cells below N samples → null.
7. **Serve**: vector tiles (Mapbox/MVT) or 3D tilesets for Cesium.

**Noise-handling (thermaling vs airspace-avoidance circling)**: this is the dirty secret of all these maps. Heuristics that help:
- Reject circling segments with positive net vertical velocity below a threshold (e.g. avg climb < 0.3 m/s — pilot probably wasn't actually thermalling).
- Reject circling near airspace boundaries (load airspace from openaip.net).
- Reject "wagga" patterns — short fast S-turns are not thermalling.
- Filter by *thermal coherence*: require ≥ 2 full circles within a 100 m horizontal cylinder.
- Cross-reference with FLARM/OGN data where available to confirm independent climbers.

**Spatial/temporal clustering**: DBSCAN on (lat, lon, alt-band, hour) with the right `eps` works well for fixed-ridge thermals. **HDBSCAN** is better for flatland thermals because cluster density varies. For really tight cores, you can fit a 2D Gaussian per cluster and report (μ, Σ) — gives you a "core size" estimate that nobody else publishes.

**Implementation references**:
- `igc_lib` (Python) — thermal extraction
- `h3-py` (Uber) — spatial indexing
- `hdbscan` (sklearn-contrib) — clustering
- `OpenAIP` (free airspace data) — for noise filtering
- `Skylines` (open source flight tracking, on GitHub) — for inspiration on infra
- WeGlide's blog post is the best public description of how a modern hotspot pipeline actually works in production.

### 3.D — Flight-path optimization

The state of the art splits into two:

**Optimal route under known thermal field (offline):**
- Classical: MacCready theory + thermal field as a graph; Dijkstra on a thermal-to-thermal graph with edge weights from glide ratio + sink rate. Standard since the 1960s in sailplane racing.
- **TopMeteo / SeeYou Task Planner** does this for sailplanes against forecast NWP.
- For paragliders nobody ships this — paragliding has weaker performance, narrower thermals, and very different topology dependence; the model assumptions break.

**Optimal route under uncertainty (online):**
- **POMDPs / MCTS**: tractable in simulation, not yet in production.
- **RL**: Reddy/Vergassola (2018) on UAVs is the relevant work. Nothing analogous for human pilots.
- **Condor 2 (soaring simulator)**: uses a hand-tuned deterministic thermal field with simple stochastic perturbations. The AI in Condor is *good*, but the underlying model is not open and is tuned for sailplanes.

**Realistic NextFlight angle:** rather than try to solve the full POMDP, ship a *good-enough* MacCready-style planner that uses your conditional kk7-replacement as the thermal field, weighted by NWP-day-quality, and exposes "if you take route A, you'll need 4 climbs averaging 1.8 m/s; route B needs 3 climbs averaging 2.4 m/s but crosses an airspace boundary." The LLM coach turns that into prose. **Done well, this is more valuable than any RL paper because it makes a hard decision legible to a pilot.**

### 3.E — 3D visualisation improvements

**Current production:**
- **SkyViz** (web, CesiumJS) — best polished IGC replay product. Pretty cameras, cinematic export. Static atmosphere. Pro tier ~€7/mo.
- **Ayvri** — historically the best, shutting down.
- **Doarama / Flightline** — older, similar style.
- **Google Earth + kk7 KMZ** — surprisingly powerful for terrain + thermal layer + track overlay; ugly UI, but the *only* mainstream option that overlays climatology on the 3D terrain.
- **SeeYou Cloud** — track replay + airspace, weak on atmosphere.

**What none of them render:**
- **The thermal column itself as a 3D volume** (a stretched cylinder/cone from the trigger to BL top, with strength encoded in transparency/colour).
- **Wind layers as flow fields** (animated particles at multiple altitudes).
- **Cloud base as a translucent ceiling** (with cumulus puffs at predicted trigger points).
- **Inversion layers as horizontal planes**.
- **The pilot's reachable cone** (glide cone from current alt, with sink penalty).
- **Counterfactual tracks**: "you took the left ridge; the right ridge had +1 m/s extra average climb, here's what that flight would have looked like."

**Where the simulators are ahead:**
- **Condor 2** renders thermal columns visually (debug mode) and has the best wind-shear modelling in any soaring product.
- **DCS / X-Plane** render wind fields and turbulence but no thermal columns (thermals are not modelled).
- **MSFS 2024** added real-time weather including thermals (driven by Meteoblue) — and renders them as visible "boiling air" effects under cumulus. **This is closer to what NextFlight 3D should look like than anything in the paragliding app world.**

**The build:** all of the above is achievable in CesiumJS today. `Cesium3DTileset` for terrain + buildings (you already have this). `ParticleSystem` for wind animation. Custom `Primitive` with a vertex shader for thermal volumes. `Entity` with a translucent disk for cloud base. There are no fundamental tech blockers — only design and content-pipeline work.

---

## 4. What's actually buildable for NextFlight?

You said: web app, CesiumJS frontend, Python backend, LLM coaching. Here's what is realistically in reach.

### Tier 1 — 1–3 months, low risk, big visible win

1. **IGC → thermal extraction pipeline.** Reuse `igc_lib`. Add `h3-py` aggregation. Batch process whatever IGC corpus you can legally get (your own pilots' uploads first; XContest scraping is grey-zone; DHV-XC API exists but requires care). Outcome: your own conditional thermal grid, queryable by `(lat, lon, month, hour, wind_dir, wind_speed)`.
2. **Cesium thermal-column rendering.** Vertical translucent cylinders at each strong hotspot, color-coded by mean climb, height = mean BL top. Toggle layer in your existing 3D viewer.
3. **LLM-readable thermal context.** Add a tool to your coaching agent: `get_thermals_near(lat, lon, radius_m, conditions)` returning a structured list. Now the LLM can say "you missed a reliable 2.3 m/s thermal at the south-facing spur 400 m to your west, which historically works between 11:00 and 15:00."

### Tier 2 — 3–6 months, medium risk, meaningful differentiation

4. **NWP-conditioned thermal forecast (the residual-on-NWP model).** Ingest ICON-D2 (free DWD open-data) + AROME (free Météo-France open-data). Build features per H3 cell × forecast hour. Train GBM to predict observed thermal density/strength from your historical IGC corpus. Serve as a daily "what to expect tomorrow" overlay. **This is your 'kk7 + Paraglidable + RASP' killer combo, with no equivalent on the market.**
5. **Counterfactual route analysis.** After flight upload: compute the MacCready-optimal path through your historical-thermal-field for that day's NWP conditions, compare to actual track, highlight key divergences with the LLM. Coaching gold.
6. **3D atmospheric layer.** Cloud base, BL height, wind layers from NWP, rendered in Cesium during replay. Animated wind particles. This is what makes the product *feel* different from SkyViz.

### Tier 3 — 6–12 months, higher risk, novel

7. **Transformer-based thermal segmenter.** Replace Viterbi heuristic with a learned model on your IGC corpus. Side-effect: usable embeddings for pilot-style clustering, "find similar flights," etc.
8. **Real-time OGN integration.** Ingest live FLARM positions from `ognrange.onglide.com` API or directly. Show *live* climbing aircraft on the map alongside historical hotspots. "Three pilots are circling at 1.8 m/s 5 km north of you right now." No paraglider product ships this.
9. **Cross-pilot inference layer.** Given your pilot population's tracks, learn a coaching model: "pilots who took route B on days like this averaged 35 km further." This requires enough users to be statistically meaningful — defer until you have them.

### Data pipelines you'll need

```
IGC source ──► igc parser ──► thermal segmenter ──► H3 binning ──► Parquet store
                                                            │
                                                            ▼
NWP source (ICON-D2/AROME) ──► gridded features ──► per-cell features ──► GBM
                                                            │
                                                            ▼
                                                  Vector tiles + 3D tilesets
                                                            │
                                                            ▼
                                       Cesium frontend + LLM tool layer (Python)
```

Realistic infra: PostgreSQL + PostGIS for source data, DuckDB + Parquet for the analytics layer (it is *very* good at exactly this workload), Tippecanoe for vector tile generation, a small S3 bucket for tiles, and a FastAPI endpoint exposing structured queries to the LLM.

---

## 5. Novel angles nobody has explored yet

In rough order of "would make people on r/freeflight and DHV forums talk":

1. **Conditional thermal maps queried by the LLM, not just looked at on a map.** The visual map exists (kk7, WeGlide). The LLM-as-pilot-coach reading it does not. This is your single highest-leverage feature.

2. **Counterfactual flight replays.** "Your actual flight" vs "the optimal flight given that day's conditions and your skill level." Rendered side-by-side in 3D, with LLM narration of the key decision points. No tool ships this for paragliding.

3. **Thermal *lifecycle* visualisation, not just locations.** Animate over the day: ridges lighting up in sequence as the sun rotates. Use the time-of-day binning you already have. Nobody renders this even though the data supports it.

4. **NWP-residual learning on pilot data.** Quietly the biggest scientific win: a publishable result if you write it up, and it directly improves your forecasts. *No published paper does this with paraglider IGC tracks as ground truth.*

5. **OGN-driven live thermal map.** Realtime is the killer feature that climatology can never deliver. Build a "live lift" overlay using OGN data. Even 30-second-delayed thermal positions inferred from FLARM-equipped gliders are gold for paragliders sharing the same airmass.

6. **Pilot-style fingerprinting from track embeddings.** "Pilots who fly like you typically take this route on a day like this." More social/coaching than analytical, but very sticky.

7. **3D atmospheric rendering in Cesium beyond track replay.** Already covered. The combination of (your thermal grid) × (NWP wind/cloud-base) × (Cesium 3D) is a category nobody owns.

8. **Trigger-point modelling from terrain + landcover (Copernicus / Sentinel) + climatology**. Predict triggers in *under-flown* regions where kk7 has no data. ML model: terrain features + landcover + sun angle → P(trigger). Train on well-flown regions, generalise. **This is how you make NextFlight useful outside the Alps.**

9. **Inversion/BL-top probabilistic forecasting.** Train on radiosonde climatology + NWP + observed pilot max altitudes. Output: "BL top is forecast 2400 m ± 300 m; pilots have reached 2700 m on 1 in 5 days like this." Pilots desperately want this, no product delivers it cleanly.

10. **The "what if I switched gliders" mode.** Replay any flight with a different polar curve overlaid; show how the optimal decisions would shift. Nothing to do with thermals directly, but a natural extension once you have the planner.

---

## 6. Concrete recommendations + effort estimates

| # | Feature | Effort | Risk | Differentiation |
|---|---|---|---|---|
| 1 | IGC ingest → thermal extraction → H3 grid → conditional aggregation | **3–4 weeks** (1 backend dev) | Low | Foundation for everything |
| 2 | Cesium thermal-column 3D layer | **1–2 weeks** | Low | High visual impact |
| 3 | LLM tool: `get_thermals_near(...)` | **3–5 days** | Low | The first product-defining feature |
| 4 | ICON-D2 + AROME ingestion → per-cell forecast features | **2–3 weeks** | Low (open data, well documented) | Foundation for #5 |
| 5 | GBM residual model: NWP+terrain → thermal strength/density | **3–4 weeks** | Medium (data quality work) | **The killer feature** — no equivalent ships today |
| 6 | Counterfactual route + LLM narration | **4–6 weeks** | Medium | High coaching value |
| 7 | 3D atmospheric layer (clouds, wind, BL top) in Cesium | **3–4 weeks** | Medium (shader work) | High visual differentiation |
| 8 | OGN realtime feed integration | **2 weeks** | Low–medium (rate limits) | Novel for paragliding |
| 9 | Transformer-based thermal segmenter | **6–10 weeks** | High (research project) | Publishable; sets up future ML features |
| 10 | Trigger-point ML model for under-flown regions | **4–8 weeks** | Medium–high | Makes the product globally useful |

**My recommended 6-month roadmap** (one backend dev + part-time ML + part-time frontend):

- **Month 1**: Items 1, 2, 3. Shipped: "your own kk7 layer + LLM that can read it + 3D thermal columns." Already differentiated.
- **Month 2**: Item 4 + start of 7 (cloud-base ceiling). Shipped: a tomorrow forecast overlay sourced from NWP.
- **Month 3**: Item 5. Shipped: an *intelligent* tomorrow-forecast that knows when AROME is over-optimistic for your terrain.
- **Month 4**: Items 6, 7 (finish atmospheric layer).
- **Month 5**: Item 8 (OGN realtime).
- **Month 6**: Begin Item 9 OR Item 10 depending on traction (10 if you want to expand market; 9 if you want a moat).

**Highest-leverage single bet if you can only do one thing:** Item 5 (NWP-residual model). It is the only item on this list that nobody — kk7, WeGlide, RASP, Paraglidable, XCSkies, Meteoblue — actually ships. It directly improves every pilot's planning. It is publishable. It is technically modest (a gradient-boosted model on a few hundred features per cell). And it unlocks every downstream coaching feature.

---

## 7. Sources and references

**Tools and services**
- thermal.kk7.ch — Paragliding Thermal Maps (kk7): <https://thermal.kk7.ch/>
- WeGlide Hotspots: <https://magazine.weglide.org/thermal-hotspots-gliding-copilot-weglide/>
- Paraglidable: <https://paraglidable.com/>
- TIM (Thermal Information Map): <https://thermalmap.info/>
- RASP / Dr Jack: <https://drjack.info/RASP/>
- Regtherm: <https://xctherm.com/en/regtherm>
- Meteoblue Aviation: <https://content.meteoblue.com/en/private-customers/website-help/aviation/thermal-forecast>
- XCSkies: <https://www.xcskies.com/>
- SkyViz: <https://skyviz.io/>
- WeGlide: <https://www.weglide.org/>
- XContest: <https://www.xcontest.org/world/>
- DHV-XC: <https://www.dhv-xc.de/>
- TheFlightVario thermal maps: <https://www.theflightvario.com/thermal-maps>

**Open-source code**
- `igc_lib` (Viterbi thermal segmentation): <https://github.com/marcin-osowski/igc_lib>
- Skylines (open-source flight tracking platform): <https://github.com/skylines-project/skylines>
- Uber H3 (spatial indexing): <https://h3geo.org/>
- OpenAIP (free airspace data): <https://www.openaip.net/>
- OGN (Open Glider Network): <https://www.glidernet.org/>

**Academic / technical**
- M. von Känel, "ParaglidingNet — A Sensor Network for Thermal Research" (MSc thesis, ETH Zürich) — linked from thermal.kk7.ch.
- "Ikarus: large-scale participatory sensing at high altitudes," ETH/TIK, ACM HotMobile 2011: <https://tik-db.ee.ethz.ch/file/96a1f747a188c88b46ab12ed719db18c/hotmobile11_220.pdf>
- Reddy, Celani, Sejnowski, Vergassola, "Learning to soar in turbulent environments," PNAS 2016: <https://www.pnas.org/doi/10.1073/pnas.1606075113>
- Reddy, Wong-Ng, Celani, Sejnowski, Vergassola, "Glider soaring via reinforcement learning in the field," Nature 2018: <https://reddylab.physics.princeton.edu/publications/glider-soaring-reinforcement-learning-field-0>
- Ulrich Scheller, "Paragliding data gems" (2021 write-up of the heatmap pipeline): <https://www.ulrich-scheller.de/paragliding-data-gems/>

**Forum threads (good for "what real pilots actually use")**
- <https://www.paraglidingforum.com/viewtopic.php?t=22356> (kk7 layers in flight computers)
- <https://www.paraglidingforum.com/viewtopic.php?t=114035> (AROME/ICON discussion)
- <https://www.reddit.com/r/freeflight/comments/op2ovw/flightline_database/> (Flightline database)
- <https://www.reddit.com/r/freeflight/comments/1lxah47/3d_map_with_thermals_valley_winds_transitions_and/> (incurrents 3D map discussion)

**NWP open-data endpoints (you'll want these)**
- DWD ICON open data: <https://opendata.dwd.de/weather/nwp/icon-d2/>
- Météo-France AROME open data: <https://www.data.gouv.fr/fr/datasets/donnees-changement-climatique-sim-quotidienne/> (or via Météo-France Public API)
- ECMWF open data: <https://www.ecmwf.int/en/forecasts/datasets/open-data>
- NOAA NOMADS (HRRR for North America): <https://nomads.ncep.noaa.gov/>

---

_End of research brief. Open questions to push back on with Thomi: (1) is "k8n" really kk7, or does it mean something specific to NextFlight's internal vocab? (2) what's the legal posture on scraping XContest/DHV-XC at scale vs. starting with own-user uploads? (3) does NextFlight have any pilot users yet, or is this a pre-launch product conversation? — the right roadmap shifts a lot depending on this._
