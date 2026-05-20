# NextFlight — Visualization Translation Research

*"Show the real data, but annotated, contextualized, and explained."*

The thesis in one line: a huge amount of the information a paragliding pilot actually needs is already produced by atmospheric science, flight mechanics, and GIS — but it's locked behind charts only meteorologists, engineers, and air-traffic specialists can read. NextFlight's opportunity is to be the *translation layer*. Not dumbing down. Not replacing the chart with a smiley face. Showing the real plot, annotated for a pilot's decisions, with an AI layer that explains what the chart means *for this specific pilot's flying*.

---

## Executive Summary — Top 5 Opportunities Ranked by Impact

| # | Translation target | Pilot value | Effort | Why it ranks |
|---|--------------------|-------------|--------|--------------|
| **1** | **Skew-T → "Pilot-readable atmospheric profile"** | Predicts cloudbase, thermal strength, inversion ceiling, overdevelopment risk, blue-day vs. cu-day, and *what time it will all happen* — the four numbers pilots actually want. | Medium (data is free; the work is annotation + LLM explanation) | Highest information density of any single chart in aviation. 99% of pilots can't read it. Every other forecast tool is a downstream simplification of this. Own this and you own the forecast conversation. |
| **2** | **Boundary Layer Height (BLH) × time evolution chart** | "When can I fly today and when does it cap?" — the most-asked question, currently answered with a scalar number per day. | Low–medium (ERA5 + GFS/ICON have BLH; renderer is straightforward) | Cleanest UX win. BLH evolution is a single 2D chart that answers timing, ceiling, and pulse strength simultaneously. Skysight does a version of this but for sailplane pilots; paragliders have nothing comparable. |
| **3** | **Personal polar from IGC + overlay on manufacturer polar** | "Here's your wing as you actually fly it." Quantifies progress, identifies trim/weight/technique issues, validates new wings. Nothing on the market does this credibly. | Medium–high (IGC parsing + air-mass correction is the hard part; needs wind/lift filtering) | Unique to a *coaching* product. Every pilot has years of IGC files and no idea what's in them at the airframe level. Direct line to "AI coach" value prop. |
| **4** | **Terrain-clearance (AGL) profile with annotated risk moments** | Cheap to compute, hugely revealing post-flight. Surfaces low passes pilots don't remember being low. The safety equivalent of a Strava heart-rate zone chart. | Low (IGC altitude − DEM; SRTM/Copernicus DEM is free) | Underrated. Builds trust *fast* because the AI is showing the pilot something true they didn't see. Direct safety value, very shareable, and a great launch surface for the "AI says…" voice. |
| **5** | **Hodograph → "Wind-stack" view** | Detects shear layers, dangerous gradient mismatch, foehn-cap structure, sea-breeze convergence — currently invisible to pilots until they fly into it. | Medium | High value but more niche than #1–#4. Most pilots have never seen one. A simplified "wind ribbon" view is the natural pilot-readable form. |

**The strategic claim:** Skew-T is the showpiece. BLH is the daily-use workhorse. Polar and AGL are what make a coaching app feel like a coach. Hodograph is the safety/airmanship credibility piece. Together they let NextFlight occupy ground that Windy, Burnair, Paraglidable, and Skysight all leave open: *pilot-readable depth* instead of pilot-readable shallowness.

---

# Thread 1 — The Skew-T Diagram

## 1.1 What it actually shows

A Skew-T log-P is a single chart with:

- **Vertical axis**: pressure (log-scale), millibars — i.e. altitude.
- **Horizontal axis**: temperature, but skewed ~45° so isotherms run diagonally (which gives the chart its name and lets the temperature and dewpoint curves stay near-vertical).
- **Two jagged curves**: the **environmental temperature** profile (right) and the **dewpoint** profile (left), both from a radiosonde balloon (or model column).
- **Wind barbs** along the right side: wind speed and direction at each height.
- **Background grid** of dry adiabats, moist adiabats, and saturation mixing-ratio lines — the thermodynamic "rulers" you measure against.

From these elements you can derive, in seconds if you know how:

| Quantity | What it means for a paraglider pilot |
|---|---|
| **LCL** (Lifted Condensation Level) | Cloudbase if you're flying dry thermals into cu. The single most useful altitude on the chart. |
| **CCL** (Convective Condensation Level) | Cloudbase once surface heating triggers convection. Often close to LCL but shifts during the day. |
| **LFC** (Level of Free Convection) | Above this, a thermal accelerates on its own. Below it, the thermal needs to be *pushed* (trigger temp, slope lift, convergence). |
| **EL** (Equilibrium Level) | Top of the thermal column. Above this, parcels are no longer buoyant — your absolute thermal ceiling. |
| **CAPE** | Total buoyant energy available. For pilots: a rough proxy for thermal strength and storm risk. |
| **CIN** | "Cap" — how much trigger energy is needed before convection starts. High CIN = late start or no thermals at all. |
| **Inversion(s)** | Any layer where temperature *increases* with height. Caps thermals. Often invisible in 2D forecasts. |
| **Trigger temperature** | The surface temp at which the dry adiabat from the surface intersects the environmental temperature — i.e., when thermals start. |
| **Wind shear with height** | Where the wind direction or speed changes abruptly — risk of broken thermals, dangerous transitions, or turbulence below the inversion. |
| **Mid-level humidity** | Whether cumulus will spread out, overdevelop, or stay nicely separated. |

## 1.2 What a paragliding pilot should actually care about

Reframe the meteorologist's chart as a *pilot decision support*:

**"Good soaring day" signature on a Skew-T:**
- Dry-adiabatic lapse rate up to ~2,000–3,500 m AGL (the planetary boundary layer is "well-mixed").
- Trigger temp reached by mid-morning.
- LCL between 1,500 and 3,000 m above launch — high enough to be useful, low enough to mark thermals.
- CAPE positive but moderate (~200–1,500 J/kg).
- CIN small (< 50 J/kg) so thermals trigger easily.
- A clean inversion *above* the LCL puts a lid on overdevelopment.
- Light, near-uniform wind through the boundary layer; no shear at thermal-top.

**"Blue day" signature:**
- Same lapse rate / instability *but dewpoint depression too large* — the parcel never saturates within the boundary layer. No cumulus markers. Pilots have to find thermals blind.
- Often shows up as the temperature and dewpoint curves staying far apart all the way up.

**"Overdevelopment risk" signature:**
- High CAPE (> 1,500 J/kg).
- Deep moist layer (T and Td curves close together over a thick layer).
- No capping inversion above LCL.
- Surface heating that crosses the LFC easily.
- Pilots should expect cumulus → towering cu → cumulonimbus by early afternoon.

**"Capped / stable" signature:**
- Sharp inversion in the lowest 1,500 m. Dewpoint depression high above. Thermals die at the cap.
- Sometimes the only flyable layer is below the inversion, in restituted soaring conditions.

**"Foehn / lee-side risk":**
- Strong wind aloft with veering through the boundary layer; dry layer above moist; cold pool below warm. Classic rotor signature.

## 1.3 Data sources & APIs

| Source | Coverage | Access | Notes |
|---|---|---|---|
| **University of Wyoming Sounding Archive** | Global radiosondes, 00Z & 12Z | HTTP query `weather.uwyo.edu/upperair/sounding.shtml` — returns raw text or CSV | Authoritative observed soundings. Twice-daily only. Free. |
| **NOAA RUC/RAP "GWT" soundings** | CONUS only, model-derived | `rucsoundings.noaa.gov/gwt/` | Hourly model soundings, virtual radiosondes anywhere. CONUS-only is the catch. |
| **ERA5 pressure-level reanalysis** (Copernicus / CDS) | Global, hourly, 1940→present, 37 pressure levels | CDS API (Python `cdsapi`) | The workhorse for historical "what was the sounding above launch on the day of this flight?" Allows you to reconstruct Skew-Ts for every IGC file you have. Free tier with quotas. |
| **ERA5-Land** | Surface variables only (not soundings) | CDS API | Useful for surface temp / dewpoint at launch. |
| **GFS / ICON / AROME / HRRR forecast soundings** | Global / regional | Various — NOAA NOMADS for GFS; DWD OpenData for ICON; Météo-France for AROME | The forecast Skew-T. Pull a virtual sounding at the launch coord, every 3h forecast horizon. ICON-D2 / AROME are the right choice for Alpine sites (2 km resolution). |
| **Meteoblue (historical & forecast soundings)** | Global | Paid commercial API | Convenient, but expensive if you scale. |
| **Open-Meteo "ensemble" + pressure-level endpoints** | Global, free | Public API | Underused. Returns hourly multi-level forecasts — enough to draw a Skew-T directly. **Probably the cheapest production path.** |
| **MetPy** (Python) | — | `pip install metpy` | Plots Skew-Ts, computes CAPE/CIN/LCL/LFC/EL/LI/SI. The standard scientific library; use it on the backend to derive every parameter consistently. |
| **SHARPpy** | — | Open-source NOAA library | More severe-weather oriented but excellent for derived indices, hodographs, supercell composites. |

## 1.4 A pilot-friendly Skew-T

The native Skew-T is doing too many jobs at once. The pilot-friendly version preserves the chart but adds three *layers* on top of it.

**Layer 1 — Annotation overlay (deterministic, no AI required):**

- Big horizontal band marking **launch altitude** ("you take off here").
- Shaded **flyable layer**: from launch altitude up to min(EL, capping inversion). Color-code green (good lift) to amber (weak) to red (no go).
- **Cloudbase line** drawn explicitly with an icon and altitude in m or ft, in the pilot's units.
- **Inversion bands** highlighted in a contrasting color with a "cap" symbol.
- **Wind ribbon** on the right replacing wind barbs: a vertically stacked color band where color = direction (compass-rose colored) and width = speed. Pilots can read direction-rotation-with-height at a glance.
- Trigger-temp annotation: "Surface needs to reach **23°C** for thermals — forecast peak is **27°C**, expected trigger ~10:40."

**Layer 2 — AI natural-language summary, displayed side-by-side:**

> "**Strong but capped day.** Cloudbase around **2,700 m**, base of the inversion at **3,100 m** — you'll bump the top of climbs but won't get drilled into cloud. Thermals trigger around **10:45**, peak strength **12:30–15:00**, dying after **17:00**. Wind in the working layer is **W 12 km/h**, no shear up to base — good for clean cores. No overdevelopment risk: dry layer at 5,000 m. **Comparable to your 2024-06-12 flight from the same site (75 km FAI).**"

**Layer 3 — Progressive disclosure / "chat over the chart":**

- Tap any line and it explains itself ("This dashed line is the dry adiabat from the surface…").
- Tap the cloudbase number and get the math ("Surface dewpoint 12°C + temp 27°C → LCL ≈ 1,900 m AGL").
- Free chat: *"Why is today worse than yesterday?"* → diff the two soundings, narrate the difference.

## 1.5 Prior art for accessible Skew-T

There is essentially **no consumer-grade pilot-readable Skew-T product**. What exists:

- **Wyoming archive**: raw scientific chart, no annotation.
- **Meteoblue / Windy "Meteogram"**: extracts a *few* numbers (cloudbase, CAPE) from the underlying sounding but doesn't show the chart.
- **XCSkies, RASP, BLIPMAP**: SOG-community tools that derive thermal forecasts from sounding-style data but present heatmaps, not the sounding itself.
- **Skysight**: glider-pilot-focused; presents many derived indices and 2D maps. Closest to what we want but priced for sailplane operators (~$199/yr) and the visual grammar is still "engineer chart."
- **Paraglidable**: ML black-box. Outputs a "can I fly / can I XC" probability, no explainability of the underlying atmosphere.
- **Burnair**: excellent map UI with model winds at altitudes; no sounding view.

Academic work on simplification: a small literature on "perceptually-driven sounding visualizations" exists in atmospheric viz (e.g. visualization at NCAR), but applied to forecasters, not pilots. The pilot-readable Skew-T is essentially **unclaimed territory.**

---

# Thread 2 — Other Atmospheric Visualizations Worth Translating

## 2.1 Hodograph

**What it is:** A polar plot of the wind vector at each altitude. The line connects the tips of successive wind vectors going up. Direction = compass heading from center; distance from center = wind speed.

**Why it matters to a paraglider pilot:**

- **Veering vs backing** (clockwise vs counter-clockwise rotation with height) tells you about warm/cold advection — i.e., whether the air mass is *getting better or worse* during the day, even if the surface stays calm.
- **Sharp kinks** = wind shear layers. Crossing them in a thermal can collapse a wing or pop you out the side of a core.
- **Long straight-line hodograph** = uniform flow, mechanical turbulence on lee sides, predictable convergence.
- **Loopy hodograph** = strong directional shear, dangerous for XC transitions.
- **Foehn / cross-wind cap detection** = a hodograph where surface and ridge winds disagree by >90° is a classic foehn-flushing warning.

**Current state:** Hodographs are produced by every NWP center but **not exposed in any paragliding tool I'm aware of.** Glider pilots occasionally look at them via SkewT-SKEWT viewers; XC paraglider pilots essentially never do.

**Pilot-readable form — the "wind stack":**

Instead of a polar plot, render a **vertical stacked-ribbon view**:
- Y-axis: altitude.
- X-axis position: wind direction (centered, with compass labels).
- Width / color intensity: wind speed.
- A wind-rose-style marker every 200 m.
- Highlighted bands at: launch altitude, expected thermal top, cloudbase.

The hodograph itself can be a "pro view" tab. The wind stack should be the default — it answers *"will the wind change as I climb out?"* in one glance.

**Data:** Same ERA5 / GFS / ICON pressure-level data used for Skew-T. No new infrastructure.

## 2.2 CAPE / CIN maps

**What they are:**
- **CAPE (Convective Available Potential Energy)**: integrated buoyant energy in J/kg. Bigger = stronger thermals (and stronger storms).
- **CIN (Convective Inhibition)**: J/kg of negative buoyancy that has to be overcome before convection starts. Bigger = harder to trigger.

**Pilot-relevant ranges:**

| CAPE (J/kg) | What it means for paragliding |
|---|---|
| 0–200 | Weak/no thermals; soarable mostly via mechanical lift. |
| 200–800 | Pleasant thermal day. |
| 800–1500 | Strong day. Aggressive cores. Late-summer XC weather. |
| 1500–2500 | Overdevelopment likely. Cumulonimbus by afternoon. Risky. |
| 2500+ | Storm day. Don't fly. |

| CIN (J/kg) | What it means |
|---|---|
| 0–25 | Triggers easily. Thermals start early. |
| 25–100 | Need decent surface heating. Late start. |
| 100+ | Strong cap. May not break at all. |

**Current state:** Windy, Skysight, and Meteoblue expose raw numbers or a color heatmap. The pilot has to know the bands by heart. Burnair derives a "thermal strength index" but doesn't show the input.

**Pilot-friendly version:**
- Replace numeric values with a **labeled gauge** ("weak / fun / strong / risky / storm") with the J/kg number underneath for the curious.
- Side-by-side **CAPE × CIN** dual gauge: shows the "fun" zone visually (moderate CAPE, low CIN).
- Time evolution: small sparkline of CAPE through the day; the *shape* (early rise vs late spike) is more informative than the peak.

## 2.3 Tephigram

Same physics as Skew-T but rotated coordinates (isotherms at 45° left, isobars curved). Used by the UK Met Office, Met Éireann, the Canadian Meteorological Service, and the South African/Australian forecast offices.

**For paragliding:** the UK paragliding community (BHPA / RASP-UK) does use tephigrams via RASP, but interpretation is the same as Skew-T. Strategy: parse tephigrams transparently, **render Skew-T regardless of source** (i.e., normalize to one visual grammar so pilots never need to learn two). Users in tephigram countries get the same product as users in Skew-T countries.

## 2.4 Boundary Layer Height (BLH) time series

**What it is:** The top of the well-mixed, convective lower atmosphere. Above the BLH, parcels stop rising. It's the practical ceiling of thermal flying. ERA5 and most NWP models expose it directly as a variable (in m or as a pressure level).

**Why it matters:** This is the single most useful number for *"how high will I get today?"*. Most pilots conflate cloudbase with thermal top. They are not the same: BLH can be well below or above cloudbase depending on humidity and inversion structure.

**Currently:** Buried inside model output. Skysight surfaces it as one of many heatmap layers. No pilot tool exposes the daily evolution well.

**Pilot-readable view — the BLH time-altitude chart:**

- X-axis: hours of day (e.g., 07:00 → 20:00).
- Y-axis: altitude AGL.
- A shaded green "envelope" rising from morning, peaking mid-afternoon, falling at sunset — the BLH evolution.
- Overlay: **cloudbase line** (LCL through the day).
- Overlay: **inversion altitude** as a hard ceiling.
- Overlay: **launch altitude** as a horizontal reference line.
- Time-of-day markers for sunrise/zenith/sunset.

Reading it: "I can launch at 10:00, useful lift from 11:00, ceiling rises to 2,800 m by 14:00, dies by 17:30." One chart, one glance, one decision.

**Error margins:** ERA5 BLH estimates have RMSE typically 200–500 m vs sounding-derived BLH in flat terrain; in complex terrain (the Alps, Pyrenees) it gets worse — easily ±800 m. Solution: blend ERA5 historical climatology with the current model forecast and **calibrate per-site using IGC data**. Pilots' actual top-of-climb altitudes are a ground truth signal the app can learn from. This becomes a defensible per-site model improvement loop.

## 2.5 Wind rose / polar plots by altitude

**The problem:** standard wind roses are surface-only. Paragliders fly at 500–3,000 m AGL. The wind there can be entirely different (and often is — the surface decouples from the gradient wind at night, recouples through the morning).

**Pilot-friendly version:**
- A **set of wind roses per altitude band**: surface, 1000 m, 2000 m, 3000 m. Drawn small and stacked.
- Or: a **single combined plot** with concentric rose-rings per altitude.
- For *historical* climatology: derive from ERA5 a "typical wind by altitude for this month at this site" — useful for planning trips.

## 2.6 CAPE × BLH interaction — the "flyability surface"

**The insight:** flyability isn't a single number. It's roughly a function of (CAPE, BLH, CIN, wind, cloudbase). Existing apps collapse this to a 0–10 score. That's lossy and unexplainable.

**Pilot-friendly version — a 2D phase diagram:**

- X-axis: CAPE (J/kg).
- Y-axis: BLH (m AGL).
- Plot today's forecast as a single point with uncertainty ellipse.
- Background: heatmap of "what kind of day this is" zones — `boring`, `pleasant local`, `XC day`, `epic`, `overdevelopment`, `storm`, `capped`, `blue`.
- Plot last 7 days as a trail of dots for context.
- Plot the pilot's best days as gold stars for personal calibration.

Now the score is *visible* and *defensible*: "We rated today an 8 because it sits in the XC-day zone, near where you flew your 80 km in May."

---

# Thread 3 — Flight-Mechanics Visualizations

## 3.1 Wing polar curve

**What it is:** A curve plotting sink rate (m/s) against horizontal speed (km/h). Each point represents the wing at one position of the speed bar. The tangent from the origin to the curve gives the **best glide** point (max L/D). The bottom of the curve gives **minimum sink** (best thermalling speed).

**Why pilots can't read theirs:**
- Manufacturers publish either a single L/D number or a polar measured in idealized conditions (calm air, single pilot weight). Real polars vary with:
  - Wing loading (heavier pilot → faster, slightly worse L/D).
  - Trim (line shrinkage, wear).
  - Air density (mountain flights vs sea-level).
  - Pilot input (active piloting drag).
- Almost no pilot has ever seen their actual polar.

**The translation:**

Derive a *personal* polar from IGC files. Method (this is the meaty part — it's not trivial):

1. Filter IGC track to **straight-line glides only** (heading change < 5°/s, bank < 10° for ≥ 30 s).
2. Filter to **calm-air segments** — exclude points where vertical velocity has high variance (i.e., inside thermals or sink lines). Use a rolling-window variance threshold.
3. Compute ground speed and vertical speed; correct ground speed to airspeed using wind estimate from drift during thermal turns (well-known glider technique, used in XCSoar/SeeYou).
4. Correct sink rate for air mass: subtract a moving estimate of vertical air motion. (This is where it gets hard. One approach: assume long enough flat-glide samples average out air motion. Another: use ERA5 vertical velocity at the glide altitude as a prior.)
5. Bin by airspeed; take robust median sink per bin.
6. Fit a quadratic or three-parameter polar.

**Visualization:**
- Manufacturer polar drawn in light grey.
- Pilot's personal polar overlaid in color.
- Scatter cloud of valid samples behind.
- Annotations: "**Your best glide: 9.2 at 38 km/h.** Manufacturer claim: 10.0 at 39 km/h. You're ~8% below spec — likely due to active piloting drag or worn lines."
- Time-series of personal polar over months — "Did your new wing actually improve glide?"

**Prior art:** This is a known idea in soaring (FlightAware-style L/D plots, XCSoar's polar-fit feature, SeeYou's quality-of-glide metric), but extremely poorly executed in paragliding. **WeGlide** has started doing wing-statistics aggregation; nothing yet shows a *per-pilot* polar with manufacturer overlay and natural-language commentary.

**Papers worth referencing:** Search for "deriving aircraft polar from GPS track" — work exists for sailplanes (Pieter de Smet's published methodology, also John Cochrane's "Just a Little Faster Please" essays) and is directly portable.

## 3.2 Speed-to-fly / McCready theory

**Theory in one line:** Between thermals, fly the speed at which (additional sink at higher speed) equals (the expected climb rate in the next thermal). The optimal speed maximizes cross-country average speed.

**Current state:** XCSoar, LK8000, SeeYou Mobile, Naviter all compute it in-flight. Post-flight: essentially nothing visualizes it.

**The translation — post-flight McCready overlay:**

For each glide transition in a flight:
- Compute the **realized climb rate** in the previous thermal.
- From the wing's polar and the realized climb rate, compute the **McCready-optimal speed** for that transition.
- Compare to the pilot's **actual average airspeed** during the glide.
- Display per-transition: `Glide #4 (Lavaze → Tonale): McCready said 47 km/h, you flew 41 km/h, cost ~2 minutes / 4 km.`
- Summary at flight level: total time/distance lost to slow flying; identify whether the pilot is systematically too cautious (always slow) or chasing thermals (always too fast).

**AI layer:** "You consistently fly 5 km/h below McCready optimum after a strong climb. This is conservative and may add safety margin — but on transitions over flatland it costs you XC distance. The Niviuk Klimber polar suggests speeding up by ~10% on the bar would have saved you 8 minutes today."

**Existing implementations:** Limited. Some advanced XCSoar analysis, FlySight-style post-flight tools. Nothing aimed at typical XC paragliders.

## 3.3 Glide cone visualization

**What it is:** The reachable area from a point given altitude, glide ratio, and wind. Conceptually a cone projected from the pilot's position, deformed by wind and terrain.

**In-flight:** XCSoar, SeeYou Mobile show "reach" on the map. Pilots know this exists.

**Post-flight gap:** No paragliding tool shows the cone *retrospectively* at key decision moments.

**Translation — the "decision moment" cone:**

For a finished flight:
- Identify key decision points: final glide start, every transition, the moment of lowest AGL.
- For each, render the glide cone at that moment over the actual terrain (3D map).
- Overlay the *actual path taken*.
- Show **margin to landable terrain** at each: green/amber/red.
- AI commentary: "At your final glide start (16:42, 1,250 m AGL, 23 km out), your no-wind glide cone reached goal with **180 m margin**. Wind on glide subtracted **220 m** of altitude over that distance — you crossed goal with about **−40 m**. You landed short because you didn't include wind in the glide calculation."

This turns a vague memory ("yeah it was tight") into a concrete, quantified, learnable moment. Coaching gold.

---

# Thread 4 — Safety Visualizations That Don't Exist Yet

## 4.1 Airspace proximity timeline

**The gap:** Airspace overlays on maps are everywhere. But "how close were you" as a **time series** is not standard.

**Translation:**
- X-axis: time of flight.
- Y-axis: 3D distance to nearest airspace boundary (m).
- Colored bands by airspace class.
- Red marks for "infringement risk" (< 100 m horizontal AND < 100 m vertical).
- AI: "Between 14:32 and 14:38 you were within **40 m vertical** of the floor of CTR Innsbruck while in a thermal climbing **+3.2 m/s**. You stopped climbing at 14:38 — was that intentional?"

**Tools doing this:** XContest does basic airspace flagging on uploaded flights. Burnair shows airspace live. Neither shows a proximity timeline with risk-weighted callouts. **Open.**

**Data:** OpenAIP for airspace polygons (free), OpenAir format widely supported.

## 4.2 Terrain-clearance (AGL) profile

**What it is:** Plot of (altitude − terrain elevation) along the entire flight path.

**Why it's underrated:** Pilots fly to MSL altitudes shown on their vario. They rarely remember AGL. Tight ridge passes feel routine in the moment and shocking in retrospect.

**Translation:**
- X-axis: distance along track (or time).
- Y-axis: AGL (m).
- Light-blue area = AGL.
- Red zone < 100 m AGL.
- Mark each landable LZ projection ("at this point your nearest LZ was 4 km away with 280 m AGL — within glide for a 6:1 wing in nil wind").
- AI summary: "Average AGL **620 m**. Three moments below **80 m**: ridge crossing at 13:14, scratch at 14:42, final approach. Your average margin to nearest LZ was 1.7 glide-ratios — comfortable."

**Data:** SRTM (free, global, 30 m), Copernicus DEM (free, global, 30 m, better in Europe), MapTiler / Mapbox terrain APIs. The math is trivial; the UX is the product.

**Existing tools:** XContest shows AGL as a line on the altitude plot. Doschicom/Doarama renders 3D track. **Nobody narrates it.**

## 4.3 Turbulence risk indicators along the track

**The concept:** Overlay atmospheric stability indices (Bulk Richardson Number Ri_B, wind shear magnitude, TKE if available) at the flight position over time. Flag windows where conditions were turbulent even if the pilot didn't notice.

**Pilot value:** "You felt fine but the air was actually rough — here's why your wing surged at 13:42." Validates and explains intuitions.

**Data:** ERA5 hourly model levels provide u, v, T at fine vertical resolution → derivable shear, Ri_B per layer. AROME/ICON-D2 provide TKE directly.

**Existing tools:** None for paragliding. Skysight has a turbulence layer for sailplane use. **Open.**

**Caveat:** ERA5 is 9 km / 1 hour — too coarse for sub-thermal turbulence. AROME 1.3 km is better. Best paired with the IGC's vario trace (g-loads/heading changes) as ground truth.

---

# Thread 5 — Cross-Domain Lessons

The "expert chart → non-expert action" problem has been solved (partially) in several fields. Patterns that transfer:

## 5.1 Medical imaging AI

- **Layered disclosure**: the radiology AI shows the original scan with a colored heatmap *overlay* (e.g., a suspicious lesion outlined in red). The patient sees the scan, the overlay, and a natural-language explanation. Doctors keep access to the raw image.
- **Confidence visualization**: not a single number but a *region* (e.g., "model is 80% confident this is benign — here's what it's looking at"). This is what Aidoc, Zebra Medical, and Heuron do.
- **Side-by-side comparison**: current scan vs prior scan, with diff highlighted. Direct parallel: today's Skew-T vs yesterday's.

**For NextFlight:** Show the chart. Overlay the AI's "what to look at" highlights. Always provide a natural-language summary beside, never replacing.

## 5.2 Financial data

- **Yield-curve simplification** (e.g., Bloomberg Terminal vs Robinhood): pros get full curve, retail gets "rates are up / down vs last month." But Robinhood-style apps that show the underlying chart with annotations ("here's the inversion") outperformed both for engagement.
- **Order-flow / depth-of-market** charts have been famously inaccessible — until Bookmap and similar tools added time-color-encoding and replay. Lesson: **time animation** is a massively underused tool for atmospheric data. A "play through the day" mode for the Skew-T (or BLH chart, or wind stack) animates the forecast evolution — pilots can scrub it like a video.

## 5.3 Genomics

- **IGV / UCSC Genome Browser** is the equivalent unreadable expert chart. Recent consumer tools (23andMe, Color) use:
  - Strict information hierarchy: headline (your risk), then context, then chart.
  - "Why this matters" panel always present.
  - Glossary tooltips on every term.
  - One concept per screen.

**Lesson:** Don't show the whole Skew-T at once. Lead with "**Cloudbase 2,700 m. Thermals from 10:45. Capped at 3,100 m.**" Then below: the chart. Then below: "**Why?**" → expandable.

## 5.4 Seismology

- **Earthquake reports for the public** translate magnitude into perceived shaking ("did you feel it?") and damage potential ("expect minor cracks in plaster"). The raw seismogram is in the appendix.

**Parallel:** "Today's CAPE/CIN combination feels like a strong day in the Annecy basin — gust front possible by 16:00." Use *pilot-experienced descriptors* not J/kg.

## 5.5 EEG / brain imaging

- **Topographic maps** for clinicians use sparse color, fixed anatomical positions, and a consistent "north" — so the reader doesn't have to re-orient. Lesson for hodograph/wind-stack: always use **compass-fixed** axes, never auto-rotate to the rolling wind.

## 5.6 The common design pattern

| Pattern | Where it appears | Apply to NextFlight as |
|---|---|---|
| **Show the chart + a one-sentence verdict** | Radiology AI | Skew-T + "**Strong, capped, late start**" headline |
| **Color overlay highlights what matters** | Tumor segmentation | Shaded "useful soaring layer" on Skew-T |
| **Side-by-side comparison with reference** | Year-over-year financial reports | "Today's sounding vs your best day from this site" |
| **Confidence visualization** | AI model uncertainty in medicine | Forecast ensemble spread shown as a fuzzy band, not a hard line |
| **Time replay/animation** | Bookmap, weather radar loops | Play-through-the-day animation for Skew-T evolution |
| **Glossary on hover/tap** | Genomics consumer tools | Every meteorological term is a tap-to-explain |
| **Progressive disclosure** | iOS Health "show all data" | Headline → chart → derivation → chat |
| **Natural-language summary** | LLM-augmented dashboards | The AI commentary panel — *not* replacing the chart |
| **Comparison to personal history** | Strava, Whoop | "Looks like your 2024-08-12 flight" — anchored to *this pilot's* memory |
| **Coaching nudge, not raw number** | Whoop strain, Apple coaching rings | "Trigger ~10:45 — plan to launch at 11:00" |

---

# Thread 6 — Design Question, Per Visualization

For each of the major visualizations, here's the minimum-viable annotation, the AI layer's incremental value, and the ideal interaction model.

## Skew-T
- **MVA:** launch-altitude band, flyable-layer shading, cloudbase line, inversion bands, wind ribbon, trigger temp callout.
- **AI adds:** narrative explanation ("strong but capped"), comparison to past flights, day-type classification, follow-up Q&A.
- **Interaction:** scrollable chart, tap any line for explanation, "compare to" picker, animated time-of-day playback, free chat.

## Hodograph / Wind Stack
- **MVA:** vertical wind stack with compass-fixed colors, altitude bands, shear-zone highlighting.
- **AI adds:** "Wind veers 70° between 1,500 and 2,000 m — expect rough thermals breaking up at that altitude."
- **Interaction:** toggle between wind-stack (default) and proper hodograph (pro).

## CAPE / CIN
- **MVA:** dual gauge with pilot-friendly bands; daily evolution sparkline.
- **AI adds:** "By 14:00 CAPE peaks at 1,400 — be off the hill before any cumulus turn dark."
- **Interaction:** tap the gauge for derivation, comparison to baseline.

## BLH evolution
- **MVA:** time-altitude shaded envelope with cloudbase overlay and launch reference.
- **AI adds:** "Useful flying window today: **11:15 to 17:00**. Peak ceiling **2,800 m** between 13:30 and 15:00."
- **Interaction:** drag time cursor to see live state; "what if I launched at 12:30" preview.

## Personal polar
- **MVA:** scatter + fitted curve over manufacturer polar; best-glide and min-sink markers.
- **AI adds:** "Your best glide has improved 6% over the last 12 months — likely the new wing." or "Your min-sink is consistent with the spec, but you sit ~8% below polar at trim speed — try a touch of bar."
- **Interaction:** filter by date range, by wing, by air-density bucket.

## McCready overlay
- **MVA:** per-transition table with realized vs optimal speed and cost.
- **AI adds:** systematic bias detection, "what-if" simulations ("if you'd flown McCready, you'd have arrived at goal 4 minutes earlier").
- **Interaction:** click a transition on the 3D track to see the McCready computation in context.

## Glide cone post-flight
- **MVA:** 3D map with cone polygon at decision moments and actual track overlay.
- **AI adds:** "At your final glide start your no-wind cone reached goal with 180 m margin; wind cost 220 m; you crossed at −40 m."
- **Interaction:** scrub timeline; cone updates live.

## Airspace proximity
- **MVA:** distance-to-airspace timeline with class color bands.
- **AI adds:** "Three near-misses to CTR Innsbruck floor between 14:30 and 14:45 — review your airspace prep next time."
- **Interaction:** tap a near-miss → open the 3D map at that moment.

## AGL profile
- **MVA:** altitude-AGL strip with nearest-LZ overlay.
- **AI adds:** "Three moments below 80 m AGL — review them?"
- **Interaction:** tap any low point → 3D map + AI explanation of the situation.

## Turbulence risk overlay
- **MVA:** Ri_B / shear magnitude color band along the track.
- **AI adds:** "You felt that surge at 13:42 — wind shear was 0.04 s⁻¹ across the inversion you crossed."
- **Interaction:** scrub the track, see the model values vs the IGC vario trace.

---

# The Build Sequence

Ranked by impact × effort × strategic differentiation.

## Tier 1 — Ship first (next 3 months)

### 1. Skew-T translator (forecast, then post-flight)
- **Why first:** Highest information density, most-asked question (cloudbase + thermal strength + risk), zero competition in the pilot-readable space. Defines the brand: *"NextFlight is the app that reads the atmosphere for you."*
- **Path:**
  - Free data via Open-Meteo pressure-level API + MetPy on the backend.
  - Backend computes LCL, LFC, EL, CAPE, CIN, inversions, trigger temp.
  - Frontend: render annotated Skew-T using D3 or a Plotly customization. Don't ship the raw scientific chart — ship the annotated one from day one.
  - LLM call: pass derived parameters + day classification to a model with a system prompt for "explain to a paragliding pilot." Cache per-day-per-location.
  - Comparison feature: pull the user's IGC archive, find matching past soundings via cosine similarity on the parameter vector, surface "looks like your flight on YYYY-MM-DD."

### 2. BLH × time evolution chart
- **Why second:** Cleanest UX. Answers the timing question every pilot has, with one chart. Visually new (no competitor has it for paragliding).
- **Path:**
  - Same data source as Skew-T.
  - Calibrate per-site using IGC top-of-climb data.
  - Render as a time-altitude shaded envelope.

### 3. AGL profile for post-flight
- **Why third:** Trivially cheap, builds AI trust quickly ("the app saw something I didn't"). Direct safety value. Highly shareable in pilot communities.
- **Path:**
  - On IGC upload, sample DEM (SRTM/Copernicus) along the track.
  - Render the AGL strip; tag low moments; route through the LLM for commentary.

## Tier 2 — Within 6 months

### 4. Personal polar from IGC
- **Why:** Unique to a coaching product. Defensible. Builds long-term value as the pilot's IGC archive grows. Direct hook for premium tier.
- **Risk:** The air-mass-correction problem is real. Ship a conservative v1 that filters aggressively and admits uncertainty.

### 5. Wind stack / hodograph
- **Why:** Differentiator for the safety-conscious pilot. Pairs naturally with the Skew-T (same data, just a different projection).

### 6. Airspace proximity timeline
- **Why:** Big safety value, modest effort with OpenAIP. Differentiator from XContest's passive flagging.

## Tier 3 — Within 12 months

### 7. McCready post-flight overlay
- Requires the personal polar to be trustworthy. Pure coaching feature.

### 8. Glide-cone decision-moment view
- Requires solid 3D map infrastructure and DEM integration. Big "wow" moment for coaching demos.

### 9. Turbulence overlay
- Requires AROME/ICON-D2 model-level access (more involved data engineering). Pair with IGC vario as ground truth.

### 10. CAPE × BLH flyability surface
- Bring it in once the individual indicators are polished. Frames the whole "score" conversation.

---

# Why this ordering

- **Skew-T is the flagship.** It's the chart everyone has heard of and no one can read. Owning it positions NextFlight as "the AI that reads the sky," which is exactly the brand a coaching app wants.
- **BLH evolution gives daily-use value.** Pilots check the forecast every flying day. A clean, one-glance BLH chart becomes the thing they open first.
- **AGL profile is the cheapest trust-builder.** It tells pilots something true about their own past flying within seconds of upload. That's a powerful first impression.
- **Personal polar is the long-term moat.** Every IGC the user uploads makes the product better *for them specifically*. Strava-style lock-in via personal history.
- The safety and McCready layers come after, because they all benefit from a calibrated personal polar and a mature IGC pipeline.

The unifying principle: **every chart we ship must show the real data, never replace it with a number**. The AI's job is to be the friend at the launch sitting next to you and saying "see this layer here? That's why thermals will cap at 3,100." Pilots have been waiting for that friend forever. Nobody has built it yet.

---

## Appendix — Data source quick-reference

| Need | Recommended source | License/cost |
|---|---|---|
| Forecast soundings (pressure levels) | **Open-Meteo** | Free, public API |
| Historical soundings (model) | **ERA5** via Copernicus CDS | Free, registration required |
| Observed soundings | **University of Wyoming archive** | Free, scraping-friendly |
| High-res forecast (Europe) | **ICON-D2** (DWD), **AROME** (Météo-France) | Free, OpenData portals |
| High-res forecast (US) | **HRRR** via NOAA NOMADS | Free |
| Sounding-derived indices | **MetPy** (Python) | Free, BSD |
| Severe-weather indices, hodograph | **SHARPpy** | Free, BSD |
| Terrain DEM | **Copernicus DEM 30 m** (Europe-best), **SRTM 30 m** (global) | Free |
| Airspace | **OpenAIP**, **soaringweb.org** (OpenAir) | Free |
| Maps / 3D terrain | **MapTiler**, **Mapbox**, **CesiumJS** | Tiered paid |
| IGC parsing | **igc-parser** (npm), **aerofiles** (Python) | Free, open-source |

---

*End of research document. Built for a real product conversation: data sources are concrete, the design patterns are borrowed from fields that have already solved this problem, and the build sequence is ordered by impact-per-effort, not by what's easiest. The Skew-T case is the single highest-leverage opportunity here — make that chart pilot-readable and the rest follows.*
