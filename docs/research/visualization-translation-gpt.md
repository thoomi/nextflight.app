# NextFlight: Hard Data, Easy Insight — Research Report
*Research date: 2026-05-17 | Subagent research pass*

---

## Top Picks — 5 "Hard Data, Easy Insight" Opportunities Ranked by Pilot Impact

| Rank | Opportunity | Data Source | Current Gap | Translation Value |
|------|-------------|-------------|-------------|-------------------|
| 1 | **Post-flight McCready analysis** | IGC track + polar | Nothing exists for paragliding | "Here's the km you left on the table" |
| 2 | **Sounding → Plain Language Brief** | Wyoming archive / ERA5 | Pilots look but don't understand | "Today's air in 3 sentences" |
| 3 | **LST Thermal Trigger Map** | MODIS/Sentinel-3 | No pilot tool uses this data | "These ridges fire first, in this order" |
| 4 | **Hodograph → Wind Strategy** | Same sounding data | Never looked at by most pilots | "Your thermal will drift here; fly offset" |
| 5 | **CAPE Map → Overdevelopment Risk** | NWP models / ERA5 | Numbers shown, meanings hidden | "Explosive thermals after 13:00, land by 14:30" |

---

## Section 1: Real Pilot Behavior Around Hard Visualizations

### Skew-T: What Pilots Actually Do

The Skew-T log-P diagram is the gold standard for atmospheric sounding visualization. It shows:
- Temperature profile with altitude (red line)
- Dew point profile (green line) — gap tells you cloud base
- Wind barbs at each level (direction + speed)
- The "area" between temperature and dry adiabat = CAPE (thermal energy available)
- Where the lines converge = cloud base (LCL)
- Where the parcel re-equilibrates = thermal ceiling (thermal top / BLH)
- Inversions (temperature increases with height = thermal killer)

**Why pilots can't read it:** The diagram has 5-7 overlapping line families (isotherms, isobars, dry adiabats, moist adiabats, saturation mixing ratio lines — all at different angles), making pattern recognition extremely non-intuitive. The "skew" in Skew-T was designed to separate isotherms from dry adiabats for meteorologists; this has the side effect of making temperature lines look diagonal when pilots expect vertical.

**What pilots currently do instead:**
- Look at derived *numbers* only: CAPE, thermal top height, cloud base altitude
- Use soaring-specific tools (RASP/BLIPmap, XC Skies, SkySight) that pre-digest the sounding into thermal strength, cloud base, XC potential scores
- Ask more experienced pilots: "Is today a Skew-T day or not?"
- Avoid soundings entirely, relying on local orographic rules of thumb

**The best existing guides:** XC Skies has an interactive Skew-T accessible via single map click. Users can click any location and get the current or forecast sounding. But the interface still shows the raw diagram — no explanation of what you're seeing or what it means for flying.

**What's actually missing:** Not the raw chart access (Wyoming archive goes back to 1973, 2x daily at 00Z and 12Z, ~50+ European stations), but a reliable mapping from:
- Atmospheric profile → pilot-actionable flight brief
- "This temperature inversion at 1800m means you won't get above it until after 13:00"
- "The CAPE area shows moderate instability — good strong thermals, but watch for cumulus development after 15:00"
- "Wind shear at 2200m (see wind barbs) means thermals tilt eastward — fly offset from cumulus"

**Paragliding meteorology courses:** DHV (German Hang and Paragliding Association) and SHV (Swiss equivalent) include sounding interpretation in advanced/license upgrade courses. The content is real but the in-field application is almost zero — no feedback loop between learning and flying.

---

### Hodograph: The Invisible Chart

The hodograph is often embedded in the sounding view (Wyoming archive offers hodograph download separately from Skew-T). It shows wind **vectors** at successive altitudes as a polar diagram — you trace the path of the wind vector as altitude increases.

**What it tells pilots:**
- Wind shear (how fast wind direction/speed changes with altitude) → indicates turbulence risk
- Thermal tilt direction (thermals lean with the wind shear)
- Temperature advection (warm or cold air being transported in)
- Cross-country route optimization (which altitude band has the best wind for your direction)

**Pilot awareness: near zero.** Hodographs are shown on professional NWP tools but almost never referenced by paragliders. Even guides that explain Skew-T typically skip the hodograph. This is a significant gap because:

- A backed wind profile (clockwise rotation going up in Northern Hemisphere) indicates warm advection = improving conditions
- A veered profile = cold advection = conditions may deteriorate
- Strong shear at 800-1200m (typical thermal height) = thermals will tilt significantly

**Translation opportunity:** "Today's hodograph shows the wind rotating from SW to NW between 500m and 1500m. Expect thermals to drift north — position upwind when entering lift, and your glides should trend 20-30° left of the cumulus."

---

## Section 2: The McCready Speed-to-Fly Gap

### What the Theory Says

MacCready speed-to-fly (STF) theory is mathematically elegant: for a given aircraft polar, expected next thermal strength, and current air mass vertical movement, there is one optimal airspeed that maximizes cross-country distance per unit time.

- Stronger thermals ahead → fly faster between them (you'll lose more height but arrive earlier, recoup quickly)
- Rising air → slow down (spend more time in lift)
- Sinking air → speed up (exit sink faster)

Every paragliding course teaches this. Every pilot nods. Almost no pilot applies it consistently in flight.

### Why Pilots Don't Apply It

**1. No in-flight feedback loop.** XCSoar (the open-source glide computer) has STF, but it's designed for gliders. Very few paragliders run XCSoar. The instruments paragliders actually use (Skytraxx, Flymaster, Flow) show STF as a conceptual indicator but the polar data for paragliders is often wrong or missing.

**2. Paraglider polars are hard to trust.** A glider's polar is precisely measured and stable. A paraglider's polar varies enormously with trim setting, load factor in turbulence, pitch attitude, and weight. Applying McCready math to a badly-specified polar gives misleading results.

**3. Safety override dominates.** The critical and underappreciated issue (documented in detail by Clemens Ceipek on chessintheair.com): in XCSoar and similar tools, the **same MC value is used for two different calculations**:
   - Speed to fly (how fast should I be now)
   - Safety glide distance (which airports are in range)

   When a pilot gets worried and dials MC toward 0 ("be conservative"), the STF logic is correct — slow down. But the glide computer simultaneously shows *more* airports in range (because it assumes you'll glide at 42:1 best L/D). This is exactly backwards for safety: the most dangerous moment is when the pilot "conservatively" sets MC=0 and the flight computer tells them an airport 30km away is safely in glide, when in reality they have 10km in sink. Pilots don't know this behavior.

**4. Real-time STF requires knowing the next thermal strength.** This is a prediction problem. The McCready value you *should* use depends on what you'll find ahead, which is inherently uncertain.

### The Post-Flight McCready Gap

**WeGlide has solved this for gliders.** Their "Coach" feature (documented in detail at docs.weglide.org/premium/coach.html and magazine.weglide.org/weglide-coach/) does the following:

1. For each small interval of the flight, computes: True Airspeed → Indicated Airspeed (correcting for wind) → net air movement (removing aircraft sink)
2. Computes the "expected climb" (McCready) value for each moment based on surrounding thermals
3. Calculates the *optimal* speed for each moment and compares to actual speed
4. Shows a color-coded barogram: green (flying at correct STF), yellow (8-16 km/h too slow), red (>16 km/h too slow or >8 km/h too fast)
5. Additionally shows: weight analysis (would heavier/lighter have been faster?), thermal analysis (did you leave too early or too late?)

**For paragliding: nothing equivalent exists.** XContest and DHV-XC track flights and compute OLC/XC scores, but these are distance-based, not performance-based. The closest thing is manual post-flight analysis with igc_lib.

**What a paragliding post-flight McCready analysis would look like:**

> "On your 8 cruise segments today:
> - Total cruise time: 1h 24min
> - Average actual speed: 38 km/h
> - Average optimal speed: 45 km/h (based on thermal strength you achieved)
> - Result: you left approximately 19km on the table
> - 3 segments were significantly too slow (morning, NW of Reutte, return leg)
> - You flew 12 km/h below optimal on the 4th segment — likely uncertain about the thermal ahead (reasonable)
> - If you had flown STF-optimal, estimated distance: 93km vs actual 74km"

**Why nobody has built this for paragliding:**
1. Polar data availability (most paraglider polars are not machine-readable, or inaccurate)
2. Weight data unavailability (you don't know the pilot's all-up weight from the IGC file alone)
3. Smaller market than gliding
4. Paragliding safety culture discourages "go faster" messaging

**Why this is still worth building:**
- Post-flight analysis doesn't push pilots to fly dangerously — it reveals retrospectively how much efficiency was left
- The safety MC confusion (dual use of MC value) is a real educational gap with safety implications
- Even imperfect analysis with approximate polars provides more feedback than pilots currently get
- **Competition pilots will pay for this.** XC distance scoring means every km matters.

### The McCready Confusion Safety Feature

Separate from performance: NextFlight could build an **educational simulation** showing the dangerous dual-use of MC value:
- Input: typical sinking-out scenario
- Show: what the flight computer "thinks" is in range vs. what actually is at different MC settings
- Result: Pilots understand never to set MC=0 as a "safety" measure

This is a *safety education* feature with no competitor.

---

## Section 3: The Flight Report Card Design Problem

### What WeGlide Has Built

WeGlide provides the most sophisticated post-flight analytics in soaring. Their stats for each flight include:

**General:** Distance, average speed, net air movement (this is key — it's route efficiency independent of glider type), max altitude, takeoff/landing
**Thermal stats:** Number of thermals, time thermalling (%), average climb rate, attempts (enters/exits without useful climb), circling time
**Circling stats:** Bank angle, radius, left vs. right ratio
**Glide stats:** Average glide speed, glide ratio, net air movement per glide (isolates route choice from luck)
**Coach:** STF adherence, weight optimality, thermal quality by height band

**The most interesting metric: net air movement.** This normalizes for aircraft type and speed — it's how much the airmass was lifting (or sinking) during your glides, which is primarily a *route choice* quality indicator. Two pilots in different gliders taking different routes can be compared fairly.

### The Minimum Viable Flight Report for Paragliding

Based on what WeGlide does and what would be meaningful for paragliders:

**7 numbers that would make a pilot say "I understand this flight":**

1. **Total XC distance** (already on XContest)
2. **Average thermal quality** (avg climb rate, bottom-to-exit, ignoring first 15s centering)
3. **Glide efficiency score** (net air movement — how good were your routes between thermals?)
4. **STF adherence** (did you fly fast enough between thermals, or too slow?)
5. **Thermal decision quality** (did you leave too early/late? based on climb rate trend per height band)
6. **Time-in-productive-layer ratio** (what % of flight time was spent in air with >0 net lift? This reveals if you were thermalling in busted air)
7. **Atmospheric potential vs. actual** (what did other pilots in your area achieve? was it a "hard day" or did you underperform the day?)

The last one is possible because XContest aggregates thousands of flights — you can benchmark any individual flight against the day.

### What's Missing from All Current Tools

**No tool correlates:** pre-flight sounding data → pilot decisions → flight outcome.

Specifically:
- "The sounding showed CAPE of 400 J/kg and cloud base at 2200m. You flew to 2100m but the thermal tops in your area were 2400m (per other flights). You left 200m on the table consistently — this may be a confidence issue, not a conditions issue."
- "The hodograph showed wind rotating to NW above 1600m. Your glide times on north legs were 30% longer than expected because you were fighting the thermal drift. Other pilots who flew offset covered the same distance 18% faster."

This synthesis — atmospheric data → flight behavior → outcome — doesn't exist anywhere.

---

## Section 4: Atmospheric Data Pilots Don't Know Exists

### 4.1 Wyoming Radiosonde Archive (Upper-Air Soundings)

**URL:** weather.uwyo.edu/upperair/sounding.shtml

**Coverage:**
- Global, with ~50+ stations in Europe
- Data goes back to **1973** for most stations (some earlier)
- Updated **twice daily** (00Z = midnight UTC, 12Z = noon UTC)
- Free, no authentication required
- CSV download available (machine-readable)
- European stations include: Munich (10868), Vienna (11035), Lyon (07481), Milan (16080), Innsbruck (11120 area), Madrid (08221), and ~40 more

**For NextFlight:** You can query any date's sounding at the nearest station, parse the temperature/dewpoint/wind data, compute CAPE, cloud base, thermal top, inversions, and CIN programmatically. The archive lets you build historical models: "On this date last year, the sounding showed X, and flights in the area averaged Y distance" → learn to predict flight quality from soundings.

**Gap:** Almost no paragliding tool does anything with this archive beyond showing the raw plot.

### 4.2 ECMWF ERA5 Boundary Layer Reanalysis

**URL:** cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels

**Coverage:**
- **Hourly** data from **1940 to present**
- 0.25° resolution (~28km at equator, ~20km in Alps)
- Includes: boundary layer height (ABL height), surface temperature, surface solar radiation, 2m dewpoint, 10m wind
- Free via Copernicus CDS API (registration required)
- Python `cdsapi` library for access

**Key variables for soaring:**
- `boundary_layer_height` (= thermal ceiling approximation)
- `surface_solar_radiation_downwards` (tracks thermal energy input through the day)
- `2m_temperature` and `surface_pressure` → compute surface-based CAPE manually or use pre-computed `cape` variable

**For NextFlight:** ERA5 provides the **historical record** that Wyoming soundings partially miss between stations. You can reconstruct BLH and CAPE for any location in Europe on any day since 1940 at hourly resolution. This is the foundation for a "what was this day like atmospherically" feature.

**Limitation:** 28km resolution misses local terrain effects. Alps-scale detail requires higher-resolution regional models (ICON-D2 at 2.2km, AROME at 2.5km — but these only have short operational archives).

### 4.3 MODIS Land Surface Temperature (LST) — Thermal Trigger Maps

**NASA products:** MOD11 and MOD21 (Terra satellite, ~10:30 local time) and MYD11/MYD21 (Aqua, ~13:30 local time)

**Coverage:**
- 1km spatial resolution
- Daily overpass
- Free via NASA EarthData (registration required, but open data)
- Global coverage

**What it shows:** Surface temperature. Dark bare rock heats up faster than vegetated soil. Snow reflects (high albedo). Water stays cool. This is exactly what generates differential heating → thermal triggers.

**For paragliding:** A pilot planning a flight could see *which specific terrain features* are heating up most, at 1km resolution. This is not weather forecasting — it's terrain characterization.

**Research finding (Researchgate #349814900):** Academic paper "Thermal Detection for Free Flight" specifically used MODIS LST data combined with IGC track data to train ML models predicting thermal locations. The approach works — the main limitation is 1km resolution missing ridge-scale triggers.

**For NextFlight:**
- Overlay MODIS LST map on terrain for the upcoming fly day
- Highlight the "hot zones" (high LST relative to surroundings)
- Cross-reference with known thermal hotspots (kk7.ch database)
- Generate: "These 3 ridges in your planned route are heating up fastest today based on morning satellite pass"

**Effort:** Moderate. MODIS data is freely available via NASA EARTHDATA API. Processing requires cloud-masking (cloudy pixels = invalid), compositing, and terrain normalization. Cloud cover is a major limitation — you lose data on overcast days (when thermals are weak anyway, somewhat useful self-filtering).

### 4.4 Copernicus SARAH-3 Solar Radiation Archive

**The dataset:** Surface Solar Radiation Data Set – Heliosat, edition 3. Available via EUMETSAT/CM SAF.

**Coverage:**
- Europe, Africa, Middle East, Central Asia (MSG satellite coverage)
- **~5km spatial resolution**
- **30-minute temporal resolution**
- Archive from **1983 to present**
- Free for scientific use

**Key variable: SIS (Surface Incoming Shortwave)** — the actual solar irradiance reaching the ground surface (accounting for clouds, aerosols, atmosphere). This is more useful than "potential" insolation because it shows where clouds are blocking heating.

**For soaring:**
- Identify when specific valleys and ridges received solar irradiance through the day
- Build thermal climatology: "The Rhône valley gets 6.5 hours of direct irradiance on average in May; initiation typically around 10:00 local"
- Historical analysis for training ML thermal models

**Current soaring use: none.** This data is used in solar energy forecasting, agricultural forecasting, but no soaring tool integrates it.

### 4.5 Atmospheric Electric Field — Interesting but Probably Niche

**What it is:** The fair-weather atmospheric electric field is about 100 V/m at the surface, maintained by global thunderstorm activity. It varies with:
- Cumulus development (local fair-weather field increases near forming cumuli)
- Approaching fronts
- Aerosol loading

**For soaring:** There's theoretical interest — some pilots report sensing "electric" conditions before good thermal days. Some researchers have measured fair-weather electric field variations near cumulus development.

**Reality check:** No operational instrument, no dataset, no established pilot application. This is a research curiosity rather than an actionable data source. The atmospheric electricity Wikipedia article covers the physics but reveals no practical soaring instrumentation.

**Verdict:** Skip for NextFlight — too early, no data infrastructure.

---

## Section 5: What WeGlide, SkySight, and Burnair Have Built

### WeGlide — Gold Standard in Post-Flight Analytics (Gliders)

**What they've built (confirmed from docs.weglide.org and magazine.weglide.org):**

**Post-flight Coach (premium):**
- Speed-to-fly analysis: per-second actual vs. optimal speed, color-coded barogram, cumulative "speed loss" analysis
- Weight analysis: simulates different pilot weights to find optimal ballast
- Thermal analysis: divides each thermal into 5 height bands, shows climb quality per band, recommends "leave earlier" or "circle tighter"

**Analytics:**
- Phase analysis: identifies each thermal and glide, marks on map and barogram
- Statistics list: compare multiple flights side by side
- Net air movement: per-glide quality metric independent of glider type and speed
- Day Replay: shows all other gliders in area simultaneously (crowd-sourced conditions data)
- Thermal Replay: all thermals found by all pilots that day, on a map

**Real-time Copilot:**
- Live air mass vertical velocity (from other gliders' tracks)
- Real-time thermal positions (other gliders circling)
- SkySight forecast overlay

**Gap for paragliding:** Paragliders have no equivalent. XContest/DHV-XC show distance scores. The mechanics are available, but nobody has built the paraglider-specific version accounting for paraglider polars, lack of in-flight instruments, and different decision patterns.

### SkySight — Best Soaring-Specific Weather Forecasting

**What they've built:**
- Pre-flight: BLH, thermal strength, cloud base, CAPE, XC potential as color-coded maps
- Route analysis: route cross-section tool — shows how conditions change along your planned XC route, hour by hour
- Integration with WeGlide Copilot for in-flight SkySight overlays
- Not specific to paragliding — primarily a glider tool

**Their atmospheric parameters:**
- Thermal top (BLH)
- Thermal updraft velocity (m/s)
- Cloud base
- CAPE
- Buoyancy-to-shear ratio (turbulence indicator)
- XC potential composite score
- Wind at multiple flight levels

**Key limitation for paragliding:** SkySight doesn't adapt to paraglider-specific risk thresholds. "Good soaring conditions" for a glider may be marginal or dangerous for a paraglider (stronger thermals mean more turbulence at lower altitudes where paragliders fly).

### XC Skies — The Accessible SkySight Alternative

From docs.xcskies.com/home/documentation/xc-skies-layers, XC Skies shows:
- **Top of Usable Lift (TOL)**: accounts for glider/paraglider sink rate (~1.2 m/s applied)
- **Thermal Updraft Velocity**: average core strength
- **Buoyancy-to-Shear Ratio**: "Will thermals be organized or broken?"
- **XC Potential**: composite score (red/orange/blue categories)
- **CAPE and Lifted Index**: stability indicators
- **Cumulus cloud base and depth**: cloud formation potential
- **Skew-T on click**: interactive sounding for any point

**Better than raw NWP for pilots** because it pre-digests 10+ atmospheric variables into flyable/not-flyable metrics. But still no natural language explanation — you see a color or a number and must know what it means.

### Burnair — Alpine-Focused, Community-Centered

**What they are:** Swiss-based, focused on the Alps (German-language community hub, training/events, plus the burnair Map weather app).

**burnair.cloud features confirmed:**
- Live tracking with multiple altitude layers (250m AG, 1000m, 1500m, 2000m, 2500m, 3000m, 4000m)
- DWD and Meteo Suisse wind/weather integration
- Thermal overlay from kk7.ch (the world's largest paragliding thermal map database, now with 3.8M flights)
- Landing field database for Alpine regions

**What makes Burnair different from SkySight:**
- Specifically Alpine terrain expertise
- Community-curated landing fields (safety critical in Alps)
- Tighter integration with the Swiss/German paragliding community
- Training and coaching ecosystem (XC camps, courses)

**The gap NextFlight has vs. Burnair:** Burnair is geographic (Alps-focused) and doesn't do post-flight analysis. A tool that does post-flight coaching could complement Burnair's pre-flight planning.

### What the kk7 Thermal Map Database Represents

**thermal.kk7.ch** has 3.8M valid flights, 27.5M thermals catalogued. This is the underlying data layer that burnair, XCSoar, SkySight, and many others use.

Key features:
- Historical thermal probability maps (where are thermals in this area, historically)
- Time-of-day and seasonal filtering
- Hotspot export for GPS devices
- Academic foundation (ETH Zurich master thesis "ParaglidingNet - A Sensor Network for Thermal Research")

**Gap:** kk7 is historical probability — "where did pilots find thermals in the past?" It doesn't explain *why* thermals appear there, or connect to atmospheric data.

---

## Section 6: The "Explain This Chart" AI Pattern

### How AI Chart Explanation Works in Other Domains

**Medical (ECG/EKG):**
- Multiple startups and AI labs have built ECG interpretation AI
- Pattern: raw waveform → detected events (P wave, QRS complex, T wave) → derived features (heart rate, QRS duration, PR interval) → natural language report ("Normal sinus rhythm with left bundle branch block, PR interval 220ms suggesting first degree AV block")
- Key insight: the AI doesn't just "read" the chart — it extracts structured features first, then generates explanation from those features
- Clinical cardiologists still review — AI provides the language framework

**Radiology:**
- Similar pattern: image → feature detection → structured finding → natural language report
- Tools like Nuance PowerScribe generate radiology report drafts from MRI/CT images
- The "explain this image" problem is harder than "explain this chart" because charts have defined semantics

**Finance:**
- Bloomberg and Refinitiv use NLP to generate natural language briefings from financial data
- "The S&P 500 is down 2.3% today, driven primarily by tech sector weakness following..."
- The data is structured (time series), the explanation is templated + NLP

**Climate:**
- NOAA's climate.gov generates plain-language monthly climate summaries from data
- "January 2024 was the warmest January on record globally, with anomalies exceeding +1.5°C across most of the Northern Hemisphere..."

### The Pattern for NextFlight

The successful "explain this chart" AI follows this structure:

```
Raw data → Feature extraction → Structured representation → Natural language explanation
```

For a Skew-T sounding:
1. **Raw data:** Temperature/dewpoint at each pressure level, wind barbs
2. **Feature extraction:** Compute CAPE, CIN, LCL (cloud base), EL (thermal top), inversions, wind shear by level, lifted index
3. **Structured representation:** {cape: 450 J/kg, cloud_base: 2200m, thermal_top: 3400m, inversion_at: 2600m, wind_shear_low: "light", wind_shear_high: "moderate NW"}
4. **Natural language:** "Thermals to 3400m but expect an inversion at 2600m that may cap early flights. Cloud base at 2200m gives a narrow but workable working window. Wind shear above 2600m could drift thermals northward — position accordingly. CAPE of 450 J/kg means thermals will be strong but organized, not explosive."

**What makes the difference between useful and generic:**
- Generic: "CAPE of 450 J/kg indicates moderate instability"
- Useful: "At 450 J/kg CAPE, expect thermals of 2-3 m/s average, capped well below overdevelopment risk"
- The difference is domain-specific interpretation thresholds, not just label→description

**UX patterns that work:**
1. **Chart + annotation overlay**: Annotate the actual chart with markers and labels in plain language ("This is the inversion," "Cloud base here")
2. **Chart + sidebar brief**: Raw chart on left, 3-5 bullet plain language brief on right
3. **Progressive disclosure**: One-sentence summary first ("Good flying day, thermals to 3400m"), click for detail

**The overlay approach is probably best for pilots** because it teaches them to read the chart over time, rather than just giving them a black-box answer. After 50 flights, they can read the chart themselves.

---

## The McCready Gap — Dedicated Section

This deserves special treatment because it's potentially bigger than the "explain complex charts" opportunity.

### Why It's a Gap, Not Just a Missing Feature

The McCready/speed-to-fly framework is:
1. **Mathematically proven** — not a heuristic, not a rule of thumb
2. **Universally taught** — every paragliding course covers it
3. **Never applied** — because there's no feedback loop

This is a textbook case of "known knowledge, no reinforcement mechanism." Pilots learn the theory, have no way to measure whether they're applying it, get no post-flight signal, and the behavior never changes.

**WeGlide proved the market for this.** Their Coach feature (premium) is one of their key differentiators. The glider soaring community has adopted post-flight analysis as normal practice.

### What Makes Paragliding Different (and Harder)

1. **Polar uncertainty:** A glider's polar is measured in a wind tunnel and stable within 5%. A paraglider's polar varies with trim, weight, turbulence-induced deformation, speed bar usage. An "approximate polar" analysis is still useful but you'd need clear caveats.

2. **No airspeed sensor in most flights:** IGC loggers record GPS position. True airspeed must be inferred from groundspeed + wind vector. WeGlide does this for gliders (groundspeed + known wind). Wind data comes from NWP model output, not measurement. Error is ~5-10% — acceptable for directional coaching but not precision metrics.

3. **Safety culture:** The paragliding community is appropriately risk-sensitive. A feature that says "you were flying 15 km/h too slow" could encourage unsafe flying by less skilled pilots. This needs careful UX framing: "In these conditions, flying faster would have been efficient and safe — here's why" rather than just "fly faster."

### The Post-Flight Analysis Design

Minimum viable McCready analysis for paragliding:

**Inputs:**
- IGC track file (GPS position, time, altitude)
- Glider model (pulls approximate polar from database)
- Estimated pilot+gear weight
- NWP wind data for the flight date/location (ERA5 or operational model archive)

**Output:**
- Per-transition (glide segment) analysis:
  - Actual avg speed
  - Optimal speed for conditions (based on surrounding thermal strengths)
  - Speed deviation (flying too slow/fast vs. optimal)
  - Time cost of deviation
- Per-thermal analysis:
  - When you left vs. when you should have (based on climb rate trend)
  - Time/distance cost of leaving too early or too late
- Summary:
  - Estimated distance gain from optimal STF
  - Top 3 specific opportunities for improvement

**The "dangerous MC confusion" education layer (bonus):**
A sidebar explaining: "If you're using an XCSoar or similar glide computer, be aware that the MC value you use for speed-to-fly is also used for safety glide calculations — in the opposite direction. Setting MC=0 when uncertain does NOT make glide calculations conservative."

---

## What WeGlide/SkySight/Burnair Do That NextFlight Should Steal

| Feature | Source | Adaptation for NextFlight |
|---------|--------|--------------------------|
| Post-flight STF analysis with color coding | WeGlide Coach | Build for paragliding polars; add caveats for polar uncertainty |
| Net air movement metric | WeGlide | Normalize for glider type → route choice quality |
| Per-thermal quality analysis (climb rate by height band) | WeGlide | Identical — same physics for paragliders |
| Day Replay with all pilots | WeGlide | Requires critical mass of users; start with XContest data |
| XC Potential composite score | SkySight/XC Skies | Paraglider-specific thresholds (lower wind tolerance, different turbulence risk) |
| Route cross-section analysis | SkySight | Pre-flight route analysis showing conditions along planned XC route, hour by hour |
| Historical thermal heatmaps | kk7.ch | Already a public API; overlay with atmospheric data to explain *why* thermals exist where they do |
| Single-click Skew-T | XC Skies | Add natural language annotation on top of the chart |
| Buoyancy-to-Shear ratio | XC Skies | Rename for pilots: "Thermal organization score" with plain-language description |
| Alpine community focus | Burnair | Build community landing field database for any region |

---

## The One Thing I'd Build First

**Post-flight McCready analysis for paragliding.**

Not the sounding translator. Not the LST thermal map. Not the hodograph decoder.

**The McCready analysis, for this specific reason:** It closes a feedback loop that currently doesn't exist anywhere, it's built on physics that pilots already trust (they learned it in their course), and it creates a daily engagement pattern — every flight produces new data, every analysis makes the next flight potentially faster.

**Why not the sounding translator first?**
The sounding translator is a pre-flight tool. Pilots check it once, maybe improve their go/no-go decision. It's a smarter weather check. That's valuable, but it doesn't create a habit loop.

**Why the McCready analysis creates habit:**
- You fly. You upload your IGC file (you already do this for XContest).
- You get a report: "Today you flew 8.4 km/h below optimal on average. Here are the 3 glides where you cost yourself the most."
- Tomorrow you fly with that in your head.
- Next week you see your STF score improve from 68% to 75%.

This is the Strava moment for paragliding performance. Strava didn't invent cycling — it just showed cyclists a number they could improve, on every ride.

**The build sequence:**
1. MVP: Parse IGC + approximate polar + ERA5 wind → per-segment STF analysis, per-thermal climb rate analysis
2. V2: Add comparative data (how did other pilots in your area fly the same conditions?)
3. V3: Atmospheric correlation (what did the sounding say, and did your flight behavior match what the conditions rewarded?)

The sounding translator becomes layer 3 of a coaching tool, not a standalone feature.

---

## Appendix: Data Source Reference Card

| Data Source | What | Resolution | Depth | Cost | Access |
|-------------|------|------------|-------|------|--------|
| Wyoming Sounding Archive | Radiosonde soundings | ~50 EU stations | 1973–present, 2x/day | Free | weather.uwyo.edu |
| ERA5 (ECMWF) | BLH, CAPE, solar rad, wind | 0.25° (~28km) | 1940–present, hourly | Free | Copernicus CDS API |
| MODIS LST | Land surface temperature | 1km | 2000–present, daily | Free | NASA EarthData |
| Copernicus SARAH-3 | Surface solar irradiance | ~5km | 1983–present, 30min | Free (scientific) | EUMETSAT/CM SAF |
| kk7 thermal maps | Historical thermal probability | ~100m | 15+ years, 3.8M flights | Free API (with src param) | thermal.kk7.ch |
| XContest IGC archive | Flight tracks | GPS precision | ~15 years | Scraped / API | xcontest.org |
| DHV-XC | Flight tracks (Germany) | GPS precision | ~15 years | Scraped | xc.dhv.de |
| ERA5 (pressure levels) | Full atmosphere profile | 0.25°, 37 levels | 1940–present, hourly | Free | Copernicus CDS API |

---

*End of research report. File saved as requested at /home/thomas/.openclaw/workspace/nextflight-viz-translation-gpt.md*
