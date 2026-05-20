# NextFlight — Atmospheric Reconstruction Research

*Topic: reconstructing the actual atmospheric state at the time and place of a past paraglider flight, using NWP reanalysis + local observations + the IGC track itself as evidence. Goal: turn every uploaded flight into a contextually-grounded coaching session.*

*Compiled: 2026-05-17. Research notes for the NextFlight product direction. Where I could not retrieve a primary source live (web search was rate-limited mid-session), I flag claims with "verify before quoting" so we don't bake unchecked numbers into a customer-facing product.*

---

## Executive Summary

**Yes, this is viable. It is also genuinely novel.** Nothing on the market today reconstructs the post-hoc atmospheric state for a specific free-flight track and feeds that state into coaching. RASP and Skysight are *forecast* tools (forward-looking, run on operational NWP). XCmet/Burnair/Meteo-Parapente surface weather context, but not a per-flight reanalysis. Academic papers exist on wind estimation from glider/UAV circling, but they have not been packaged into a consumer product, and no one has joined that signal with a public reanalysis like ERA5.

**The most practical path** is a 3-tier pipeline:

1. **Background state from a public reanalysis** — ERA5 (global, 31 km, hourly, free) for everywhere, plus COSMO-REA6 (6 km, hourly, Europe, free via DWD OpenData) where geography overlaps. ERA5 is the only free reanalysis with truly worldwide, decades-long, low-latency-enough coverage to be the default.
2. **Local observations** — DWD/MeteoSwiss/Météo-France SYNOP stations, Wyoming/IGRA radiosondes, Pioupiou for ridge-top wind, optionally Holfuy/Windy webcams and Netatmo PWS.
3. **The IGC track as its own observation** — extract winds from circling drift, BLH from thermal-top envelope, thermal strength from average climb. Use those to *correct* the reanalysis where reanalysis is known to be weak (mountain boundary layer, mesoscale convection, local valley winds).

**Killer feature, in one sentence:** *"Your flight wasn't your fault — the sounding closed at 14:42. Here is the inversion you ran into."* Pilots will pay for the moment a tool tells them something they could not previously know, with the receipts to back it up.

**Effort estimate (solo dev, part-time):** 4–6 months to a usable MVP that's a real moat. Breakdown in §10.

**Big risk:** ERA5's native 31 km resolution is too coarse to resolve Alpine valley meteorology directly. The pipeline is *only as good as the corrections you apply on top*. Without the observation/IGC-derived corrections, the output is "an interesting sounding" — useful but not magical. With them, it's a defensible product.

---

## 1 · Atmospheric reanalysis — what exists today

### 1.1 ERA5 (Copernicus / ECMWF) — the default choice

Confirmed live from ECMWF's CKB and the CDS dataset page:

- **Period:** January 1940 → present, updated daily with ~5-day latency (the recent window is called ERA5T and gets overwritten ~2 months later with the final ERA5).
- **Native resolution:** **31 km horizontal**, **hourly**, **137 hybrid sigma/pressure model levels** up to 0.01 hPa. Also re-interpolated to **37 standard pressure levels**. The CDS-distributed regridded copy is on a 0.25° regular lat/lon grid (≈ 28 km).
- **Ensemble:** a 10-member EDA at coarser resolution, 3-hourly — gives a per-cell uncertainty estimate, which is useful when you want to *show the pilot how confident the reconstruction is*.
- **Assimilation:** 4D-Var, 12-hour windows starting at 09 UTC and 21 UTC. So the analysis nearest a 14:00 local flight uses the 09–21 UTC window: real-time pilots will have to wait ~5 days for the final cell over their flight to land.
- **Variables relevant for soaring** (all available; verify exact names against the ERA5 parameter database before coding):
  - **CAPE** (single-level): convective available potential energy.
  - **CIN**: convective inhibition.
  - **Boundary layer height** (`blh`, single-level): ECMWF's diagnostic for ABL top — very useful as a first-cut ceiling.
  - **Surface sensible/latent heat flux** (`sshf`, `slhf`): the engine of thermals; integrating sshf through the day gives a thermal-budget proxy.
  - **K-index, total totals, LI** — convective indices, single-level.
  - **u, v, w, T, q, geopotential on pressure levels** (50–1000 hPa): full vertical profile for synthetic sounding.
  - **2m temperature**, **2m dew point**, **surface pressure**, **10m wind**, **TCC/LCC/MCC/HCC** cloud cover.
- **APIs:**
  - **CDS API** (`cdsapi` Python package) — the standard route. Free, account-based, queue-based, can be slow under load (minutes to hours). Rate limits are per-user and historically generous but not formally published; assume ~tens of concurrent jobs per user.
  - **MARS** — for ECMWF member-state users; faster, not for us.
  - **Herbie** (Python, `herbie-data`) — confirmed live: clean abstraction over GRIB2 archives for HRRR, GFS, ECMWF Open Data, and more. Doesn't natively wrap ERA5 (ERA5 lives on CDS, not on the NOAA NODD archives Herbie was built for), but it's the right pattern to copy for your in-app fetcher.
  - **Pangeo cloud copy** — ERA5 mirrored to AWS S3 (`s3://era5-pds`, NOAA partner) and Google Cloud (`gcp-public-data-arco-era5` — the ARCO-ERA5 Zarr store from Google/ECMWF). This is the big unlock: **you can do random-access reads on a single grid cell × time step in milliseconds via Zarr/xarray, no queue, no GRIB**. For NextFlight this is the right substrate.
- **Cost:** the data is free under Copernicus open licence. Compute/egress is your cost. ARCO-ERA5 on GCS is *requester-pays* on some buckets — verify before pointing production traffic at it.

**Limitations for soaring analysis (be honest with users):**

- 31 km grid does not resolve individual Alpine valleys. A flight at Chamonix and one at Bovec might sit in the same ERA5 cell. The vertical profile and BLH will be a regional average, not a local one.
- Convection is *parameterised*, not resolved. ERA5's BLH and CAPE timing in mountain terrain can be hours off. Cu development specifically is unreliable.
- Topography is smoothed — the model "Mont Blanc" is a 31 km blob ~3000 m tall. Lee/foehn/anabatic patterns survive only in aggregate.
- For ridge soaring or thermalling at a single launch, ERA5 is a *background field*, not a truth.

### 1.2 MERRA-2 (NASA)

- 0.5° × 0.625° (≈ 50 km), hourly, 72 model levels, 1980→present.
- Similar to ERA5 but slightly coarser and with a less-refined model in convective regimes. NASA's strength is aerosols and radiation; ECMWF's is dynamics and moisture.
- **For soaring use cases: ERA5 dominates.** MERRA-2 is worth pulling only as a cross-check or in regions where ECMWF's observational network is sparse (which is not our use case in Europe).

### 1.3 Regional reanalyses — the real upgrade for Europe

- **COSMO-REA6 (DWD).** Confirmed live: hosted on DWD OpenData at `opendata.dwd.de/climate_environment/REA/COSMO_REA6/` with `hourly/`, `daily/`, `monthly/`, `constant/` subdirectories plus parameter-table PDFs. **6 km horizontal, hourly, ~40 model levels, covering the European CORDEX domain (~Atlantic to Black Sea, Mediterranean to Scandinavia). Period: 1995–2019** (some products extended, verify the parameter you need). Free under DWD's CC-BY-equivalent terms (since the 2017 DWD-Gesetz change the open data licence is essentially free reuse with attribution — confirm GeoNutzV terms before commercial production use).
- **COSMO-REA2.** 2 km over Germany only, hourly. Same source. Period roughly 2007–2013 (limited). Not enough coverage for a pan-Alpine product, but useful for training/validating downscaling models in flat-Germany flights.
- **UERRA / MESCAN-SURFEX.** European regional reanalysis distributed via the CDS at ~5.5 km, 6-hourly, 1961–2019. Lower temporal resolution than ICON-D2 archive, but pan-European and on the same CDS access path as ERA5 — easy to integrate.
- **CERRA** (Copernicus European Regional ReAnalysis, the successor to UERRA): **5.5 km, 3-hourly, 1984–2021** on CDS, with hourly downscaled outputs for some surface variables. *This is probably the best Europe-wide reanalysis you can use today without paid feeds.*
- **HRES (operational ECMWF)** — the deterministic operational forecast is ~9 km, not a reanalysis. Historical HRES is archived on MARS but the public-facing archive via the CDS is limited. Treat HRES as a *forecast* (initialised twice daily, valid forward), not a reconstruction.

### 1.4 Operational NWP archives — usable as a hindcast?

- **ICON-D2 (DWD).** 2.2 km, 65 model levels, hourly output, covers Germany + Alps + Benelux + much of Central Europe. Runs 8×/day. **Archive policy:** DWD OpenData keeps only the most recent runs publicly accessible (typically the last ~24–48 hours). There is *no rolling multi-year ICON-D2 public archive* — you'd have to start archiving it yourself today. For a *future* fleet of flights this is brilliant; for back-cataloguing 2024 flights uploaded next week, it's already gone unless you have a deal with DWD or a research partner who archived it.
  - Possible workaround: DWD's research-grade ICON-EU archive (7 km) extends further back in some research collaborations. Worth an email to DWD if Alpine 2.2 km is core to the product.
- **AROME (Météo-France).** 1.3 km over France including the French Alps, hourly. Historical access via `meteo.data.gouv.fr` (open data portal launched 2024). Verify the historical depth before scoping — open access here is younger and less complete than DWD's.
- **WRF hindcasts.** No coordinated public European Alpine WRF reanalysis exists at consumer scale. CHELSA-W5E5, COSMO-REA6, and CERRA fill that role. Running your own WRF over a flight is *technically possible* (4–6 hour run for a 24 h window over a 200 km domain on a modest GPU box) but operationally insane for a consumer product. Skip.
- **DWD OpenData more generally:** confirmed at `opendata.dwd.de`. Has ICON-D2, ICON-EU, ICON global, COSMO-REA6, SYNOP station data, radar, satellite. Best Europe-wide free firehose you'll find.

---

## 2 · Data assimilation — combining model + observations

The honest answer: **for a solo dev, don't try to do real DA**. 4D-Var is a multi-year engineering project even for national met services. Even EnKF needs an ensemble of model runs.

What you *should* do is **simple Bayesian fusion** or **optimal interpolation (OI)** — both are buildable in a few hundred lines of NumPy.

### 2.1 The techniques, ranked by buildability

| Technique | Buildable solo? | What it gets you |
|---|---|---|
| **Weighted blend (inverse-variance)** | ✅ Trivial. NumPy. | "ERA5 says 1450 m BLH ± 300 m; thermal tops topped at 1380 m (±50 m). Posterior: 1395 m." Honest, defensible. |
| **Optimal Interpolation (OI)** | ✅ Possible. ~1 week of work for a 2D wind field. | A wind map over the flight area that smoothly interpolates between SYNOP stations + IGC-derived winds, weighted by spatial covariance. This is what oceanographers do. |
| **3D-Var** | ⚠️ Months of work. Need adjoint operators. | A vertically-consistent atmospheric column blending model background + soundings + surface obs. PyDA / DAPPER libraries exist as research code, not production. |
| **EnKF** | ⚠️ Need an ensemble. Hard without WRF runs. | DAPPER (Python), pyDA. Useful for research, not your product. |
| **4D-Var** | ❌ Out of scope. | The real thing. Not your fight. |

**Recommended:** start with weighted blend per-variable. Move to OI for the 2D wind field only if it visibly improves output. Don't promise pilots a "real DA" — promise them "best-estimate blend of the official ECMWF reanalysis with all the local sensors and your own flight as evidence."

### 2.2 What observations you can pull

- **Pioupiou** — confirmed APIs at `api.pioupiou.fr/v1/live/{id}`, `api.pioupiou.fr/v1/live/all`, `api.pioupiou.fr/v1/archive/{id}?start=…&stop=…&format=json|csv|txt`. **Up to 31 days per archive request.** Free, attribution-required licence. Network coverage: hundreds of stations, dense in French/Swiss Alps and Pyrenees, sparser elsewhere. *This is the single best ridge-wind observation source for paragliding worldwide.*
- **Holfuy** — competing/complementary wind-sensor network, especially dense in Slovenia / Italian Alps / parts of Austria. They have a documented API for station owners and historical CSV downloads; check current terms.
- **DWD/MeteoSwiss/Météo-France SYNOP** — surface obs every 10–60 min depending on station. DWD's stations are on the open data server (`opendata.dwd.de/weather/weather_reports/`, `opendata.dwd.de/climate_environment/CDC/observations_germany/climate/`). MeteoSwiss has IDAweb (free for research) and the new GeoAdmin open-data feed. Météo-France stations on `meteo.data.gouv.fr`.
- **Radiosondes — actual balloon profiles.** Two-a-day from operational stations. For the Alps, useful upper-air stations include Payerne (CH, twice daily), Munich-Oberschleißheim (DE), Milan-Linate (IT), Stuttgart, Innsbruck (less reliable), Cuneo (IT). Archives:
  - **University of Wyoming** sounding archive (`weather.uwyo.edu/upperair/sounding.shtml`) — the de-facto pilot tool. CSV export now available on the new page.
  - **NOAA IGRA v2** — global, machine-readable, the cleanest historical archive for programmatic use.
  - **ECMWF MARS** has assimilated soundings but is not public.
- **Meteoblue historical soundings** — commercial. Their `dataset_api` is paid (rate-card by call volume); useful only if you also want their downscaled forecast as ground truth.
- **Personal weather stations** — Netatmo's API was deprecated/restricted (the public weathermap API for non-owners has been gated). Weather Underground (`api.weather.com`) is now paid via IBM. CWOP/APRS-WX gives you a free firehose of citizen-science stations, quality varies. For Alpine flying coverage these are sparse compared to Pioupiou/Holfuy — nice-to-have, not core.
- **Webcams as observations.** Foehn-detection from a Holfuy-cam or Roundshot image is a "v3 idea" — VLMs can classify cap clouds / lenticulars / cu-development from a still. Skip for MVP, file for later.

### 2.3 The IGC track as an observation — the unique angle

This is the bit where NextFlight stops being a wrapper around ERA5 and becomes a moat. Detail in §5.

---

## 3 · Practical reconstruction pipeline

A concrete, implementable architecture:

### Step 1 — Parse the IGC

From the B-records you get position (lat, lon, GPS altitude, pressure altitude) at 1–2 Hz. Pre-compute:

- **Flight bounding box** (±5 km buffer, ±500 m altitude buffer).
- **Time window UTC** (start, end, rounded to the nearest hour on each side).
- **Phases** (glide / climb / circling) using standard segmentation: ~20° turn rate sustained ≥ 360° = circling; persistent positive vario in straight flight = lift line.
- **Thermal events**: for each circling phase, compute center (mean lat/lon during the circles), entry alt, exit alt, average climb rate, number of turns, **drift vector of circle centres** between consecutive 360° rotations.
- **Boundary-layer signal**: take the 95th-percentile exit altitude across the day's thermals; that's a strong lower-bound estimate of usable BLH. The single highest thermal is noisy; the 95th percentile is robust.
- **Cross-country wind hints**: glide segments at a known polar give airspeed; ground speed differs by wind. With a known wing polar and a few headings, you can over-determine wind at glide altitude.

### Step 2 — Fetch the model background

For each (lat, lon, time, altitude) in the flight:

- Default: query **ARCO-ERA5 on GCS** via xarray/Zarr. Pull `u`, `v`, `w`, `t`, `q`, `z` on the pressure levels spanning the flight altitude range (typically 1000–500 hPa for Alpine flying). Pull `cape`, `cin`, `blh`, `sshf`, `slhf`, `2t`, `2d`, `sp`, `tcc`, `lcc` on single levels. Restrict to the bounding box + 1° padding, the relevant hour ± 1 h.
- If the flight is in the COSMO-REA6 domain (Europe, 1995–2019) and we want the upgrade: pull the same variables from DWD OpenData's COSMO-REA6 GRIB files. Higher resolution beats ERA5 for mountain terrain. Caveat: COSMO-REA6 stopped at 2019; for newer flights, fall back to ERA5 + CERRA.
- For 2021+ flights in Europe: **CERRA** (5.5 km, 3-hourly) via CDS is the practical regional layer.
- Cache aggressively. ERA5 grid cells are 31 km × 31 km — many flights will share the same cell on the same day. A simple `(round_to_grid(lat), round_to_grid(lon), date_hour)` key gives you huge cache hit rates.

### Step 3 — Fetch local obs

For the bounding box + time window:

- Pioupiou stations inside box: `/v1/archive/{id}?start=…&stop=…` per station.
- DWD SYNOP / MeteoSwiss / Météo-France stations: per-country pull. Build a single normalised "wind at z=2m or 10m, T, RH" record.
- Nearest radiosondes (Wyoming archive or IGRA) for the closest 00 UTC and 12 UTC profiles. Two stations max — Payerne + Milan for Western Alps, Munich + Innsbruck for Eastern Alps, etc.

### Step 4 — Fuse

For each variable that has both model + obs:

- **Surface wind:** OI in 2D over the flight area. Stations + Pioupiou are observations with ~0.5 m/s noise; ERA5 10 m wind is background with ~2 m/s noise in mountains; posterior is a smooth corrected field.
- **Vertical sounding:** anchor the radiosonde where it exists; for layers between radiosonde times, interpolate temporally with ERA5 as the in-between trend.
- **BLH:** posterior = inverse-variance-weighted blend of ERA5 BLH (σ ≈ 300 m in mountains, verify), thermal-top 95th-percentile (σ ≈ 100 m), and any sounding-derived BLH (σ ≈ 150 m).
- **Wind aloft:** IGC-derived wind from circle drift at altitude z is a *direct point measurement* with σ ≈ 1–2 m/s if you have ≥ 3 circles. Use it to correct ERA5 wind at the same level.

### Step 5 — Generate coaching context

Output a structured "atmospheric report card" per flight:

```yaml
flight_id: 2024-08-14_dolomiti_xyz
reconstruction:
  source_chain: [ERA5 0.25°, COSMO-REA6 6km, Pioupiou (3 stations), Payerne 12Z sounding, this flight's circling drift × 18 thermals]
  confidence: 0.78
  sounding_at_thermal_peak:
    t_surface: 27.4 C
    t_1500m: 14.2 C
    lapse_rate_0_3km: 7.1 K/km   # near dry-adiabatic, strong instability
    blh_estimated: 2350 m AGL
    blh_source: "thermal-tops 95p (2280m) + ERA5 (2510m) blended, σ=110m"
    inversion_top: 2400 m  (Δθ = +3.2 K)
    cape: 410 J/kg
  wind_profile:
    z=launch (1450m): 6 m/s @ 290°  (Pioupiou direct)
    z=2000m: 11 m/s @ 285°  (IGC drift, 7 thermals)
    z=3000m: 18 m/s @ 280°  (ERA5)
  notable_events:
    - "BLH dropped from 2500m to 1900m between 16:00 and 17:00 (ERA5)"
    - "Inversion at 2400m was capped — no thermal reached 2500m all day across all flights in box"
    - "Wind shear: 8 m/s @ launch vs 18 m/s @ 3000m → potential turbulence on glide if you pushed high"
```

Hand this YAML (or richer JSON) to the LLM with the flight summary. The LLM doesn't reason about meteorology — it just translates a structured atmospheric truth into a personalised story.

---

## 4 · What others have built (and what they don't do)

- **RASP / BLIPMAPS (Dr Jack Glendening, 2000s–present).** Confirmed live: it's **forecast** software based on locally-run WRF. Volunteer pilots run WRF on PCs and host BLIPMAP forecasts for their region. There are dozens of regional sites listed at `drjack.info/RASP/` — South Africa, Santa Barbara, central Europe (rasp.linta.de), Pemberton BC, NZ (rasp.nz), and many more. *No reanalysis version exists.* RASP is the right intellectual ancestor for the *forecast* side of NextFlight, but the post-flight angle is open.
- **Skysight.io.** Confirmed live: commercial soaring forecast, "most of Europe, US, Canada, Australia, NZ, Japan, Argentina, Brazil". Web-only, no app. Runs proprietary high-res forecasts at ~2–4 km. Does *not* do post-flight reconstruction. Pilots use it the night before and the morning of a flight.
- **TopMeteo, Meteo-Parapente (France), Burnair (CH), XCmet.** All forecast products. Some have "yesterday's actual" tiles (often just ERA5 BLH or their own model's analysis time-step), but none do per-flight atmospheric reconstruction joined to the IGC.
- **XContest, Flymaster Cloud, ParaglidingForum.** Archive XC flights. No weather context layer.
- **WeGlide / FlightAnalyzer.** WeGlide attaches some weather context to flights (forecast snapshots, station obs) — *worth a deeper look as the closest competitor on this axis.* Verify how much of it is reanalysis vs. cached forecast.
- **Academic papers worth grepping for** (titles I'd want to confirm — web search was rate-limited, so verify the exact citation before quoting):
  - Work on **glider thermal wind estimation** from circling — there is a body of literature on UAV thermal soaring (Edwards et al., Allen, Reddy et al.) and on sailplane wind estimation from polar + drift. The Daley/Kahn approach for autonomous soaring estimates ambient wind from variometer + GPS in real time; the math is directly applicable.
  - "Glider Pilot–Inferred Boundary Layer Heights" — there's at least one MWR-era paper using soaring flight tops as a BL diagnostic; verify exact reference.
  - "ERA5 evaluation in complex terrain" (multiple, from Innsbruck and ETH Zürich groups) — these will give you the priors for σ to use in the fusion step.

**The clear market gap:** nobody is closing the loop between *"here is your flight"* and *"here is what the atmosphere was actually doing, reconciled with what you observed."* RASP/Skysight stop at the forecast. WeGlide attaches forecasts. NextFlight would deliver an *analysis*, with the pilot's own flight as evidence.

---

## 5 · The "flight as atmospheric sensor" concept — the moat

This is the bit no competitor is doing systematically, and it's where the technical novelty lives.

### 5.1 Wind field from circling drift

When a paraglider circles in a thermal, the centre of each circle drifts with the wind in the air mass (subject to the small correction that the thermal itself may also drift, but for short averages and unsheared columns those are equivalent). Algorithm:

1. Segment circles (turn rate ≥ 20°/s sustained ≥ 360°).
2. For each circle, compute the geometric centre (mean lat/lon of the points in that 360°).
3. The vector from circle *n*'s centre to circle *n+1*'s centre, divided by the time between them, is a wind sample at the average altitude of those circles.
4. Average ≥ 3 such samples per thermal to suppress noise. Typical σ at that point: 1–2 m/s, 10–20°.

With 10+ pilots flying the same site on the same day, you get a **3D wind field at altitudes you cannot easily observe** — between 1500 m and 3500 m AGL, exactly where ERA5 is averaging over a 31 km cell. That's a hyper-local observation network no met office has.

References to chase: the "Kalman filter wind estimation from circling" line of papers; UAV soaring literature (Daley, Edwards, Allen — NASA Dryden, NRL). The IGC community has dabbled (e.g., LK8000 / XCSoar both implement live drift-based wind estimation in software). The novelty here is not the technique, it's *applying it at population scale across XContest's archive*.

### 5.2 Boundary-layer height from thermal-top envelope

Per pilot the highest thermal of the day is noisy (sky conditions vary, pilot may not have pushed). Per *population*, the 95th percentile of thermal-top altitudes across all flights in a box × day is a strong lower bound on the usable BLH. Combine with ERA5 BLH as prior; posterior tracks the diurnal cycle of the actual BL.

Bonus: **collapse detection.** If thermal tops drop 600 m between 15:00 and 17:00 (statistically across multiple flights), you have detected a real-time BL collapse. The forecast might not have predicted it; the population of flights *measured* it.

### 5.3 CAPE / instability proxy from climb statistics

Average climb rate per thermal correlates with effective CAPE in the lowest 3 km. A site-by-site, day-by-day regression of climb-rate-vs-ERA5-CAPE gives you a *calibrated CAPE proxy from flight data alone* — useful for sites/regions where ERA5 is known to mis-time convection.

### 5.4 The IGC archive as a re-analysis dataset

20 years of XContest = millions of flights = a vast, never-systematically-used atmospheric measurement archive at altitudes and locations that no official network covers. A scientifically defensible paper exists in this. A patent might too, if you got there first.

For the product: even the *threat* of building this dataset is a moat. Once you have it, you can offer "site fingerprints" — "this launch has typical BLH 2300 m in NW flow, only 1800 m in SW flow" — that nobody else can match without your data.

---

## 6 · Coaching context examples (what the LLM gets to say)

Once you have the reconstructed atmospheric state, the LLM can ground its narrative in physics:

- **Inversion sob story:** *"You topped out at 1,380 m at 14:42 and gave up. Payerne's 12Z sounding showed a 3 K inversion at 1,420 m — you were 40 m from a brick wall. Nobody else made it through that layer all day."*
- **BLH collapse:** *"Your last climb died at 16:35. Across all 23 flights in this 50 km box today, average thermal-top dropped from 2,500 m at 15:00 to 1,800 m by 17:00 — the BL was actively collapsing as you flew. The decision to push north at 16:00 was correct; staying out another hour was not."*
- **Wind shear awareness:** *"At your launch the wind was 6 m/s W. By the time you climbed to 3,000 m it was 18 m/s W — that's a hard shear layer at 2,400 m. Your 'rough air' at the top of the climb was the shear, not turbulence in the thermal."*
- **Site fingerprint:** *"At Dolomites Pass, in SW flow (today's pattern), BLH typically averages 1,900 m vs 2,400 m in NW flow. Today you flew a SW-flow day expecting NW-flow ceilings."*
- **Safety:** *"You crossed the ridge at 2,200 m. Reanalysis + Pioupiou show a leeward rotor zone with estimated TKE > 2 m²/s² in that lee. Next time, plan +400 m clearance."*

This is **coaching with receipts**. That's the holy-shit moment.

---

## 7 · Recommended architecture (concrete)

```
┌──────────────────────────────────────────────────────────────┐
│ IGC upload                                                   │
└──────────────┬───────────────────────────────────────────────┘
               │
       ┌───────▼────────┐
       │ Track parser   │  → bbox, time, phases, thermals,
       │ (Python)       │     drift winds, BL-top estimate
       └───────┬────────┘
               │
       ┌───────▼─────────────────────────────────────────┐
       │ Background fetcher                              │
       │  - xarray + Zarr against ARCO-ERA5 (GCS)        │
       │  - DWD OpenData GRIB for COSMO-REA6 (EU pre-2020)│
       │  - CDS API for CERRA (EU 2021+)                 │
       │  - cache: (grid_cell, hour) → parquet/arrow     │
       └───────┬─────────────────────────────────────────┘
               │
       ┌───────▼─────────────────────────────────────────┐
       │ Observation fetcher (parallel)                  │
       │  - Pioupiou archive API                         │
       │  - DWD/MeteoSwiss/Météo-France SYNOP            │
       │  - Wyoming / IGRA sounding archive              │
       └───────┬─────────────────────────────────────────┘
               │
       ┌───────▼─────────────────────────────────────────┐
       │ Fusion engine                                   │
       │  - 2D OI for surface wind                       │
       │  - Inverse-variance blend for BLH               │
       │  - Sounding-anchored vertical profile           │
       │  - IGC drift corrections at flight altitudes    │
       │  → emits structured "atmospheric report card"   │
       └───────┬─────────────────────────────────────────┘
               │
       ┌───────▼─────────────────────────────────────────┐
       │ LLM coaching layer                              │
       │  prompt = (flight summary) + (atmo report card) │
       │  → grounded coaching narrative                  │
       └─────────────────────────────────────────────────┘
```

**Tech stack suggestions:**

- Python 3.11+, `xarray`, `zarr`, `cfgrib`, `cdsapi`, `metpy`, `pandas`, `pyproj`, `igc-parser` (or roll your own — IGC is trivial), `requests`.
- Storage: Parquet for cached observations, Zarr-on-S3 for any precomputed tile cache, Postgres for flight metadata + structured report cards.
- Compute: a single mid-tier VM is enough for MVP. The math is light; the I/O is the cost. Push fetching to async workers (Celery, Arq, RQ).
- Deployment: report-card generation should be async-by-default ("your reconstruction will be ready in ~60s, we'll email you"). Don't promise sync — ERA5 cold-cache pulls via CDS can take minutes.

**Latency budget (rough, MVP):**

- Track parse: < 1 s
- ERA5 (ARCO-Zarr, cached cell): < 2 s
- ERA5 (cold cell, ARCO-Zarr first read): 5–15 s
- ERA5 (cold via CDS API): 30 s – 10 min (queue dependent — avoid for sync UX)
- Observations: 2–5 s (parallel pulls)
- Fusion: < 1 s
- LLM coaching: 5–20 s

**Total for a cache-warm flight:** ~10 s. **For a cache-cold flight on ARCO:** ~30 s. **CDS path:** async only.

**Cost estimate (rough):**

- ERA5/CERRA data: free.
- COSMO-REA6: free.
- Pioupiou: free.
- SYNOP / sounding archives: free.
- Cloud egress + storage: cents per flight at MVP scale; tens of cents per flight if you start hoarding ICON-D2 yourself.
- LLM coaching call: ~$0.01–0.05 per flight depending on context size and model.

So per-flight marginal cost is **negligible**. The cost is engineering time.

---

## 8 · Privacy and licensing

- **ERA5, CERRA, COSMO-REA6, ICON, SYNOP from DWD:** open, free, attribution required (Copernicus / DWD GeoNutzV / equivalent). Safe for commercial use.
- **Pioupiou:** open with attribution. Safe.
- **IGRA / NOAA / NCEI:** US federal, public domain, safe.
- **Wyoming sounding archive:** academic, free for use, attribution polite.
- **Meteoblue / TopMeteo / Skysight:** commercial. Cannot scrape; can integrate via paid API if needed. Skip for MVP.
- **MeteoSwiss IDAweb / GeoAdmin:** historically free for research, recently moved to true open data. Verify the licence on the current portal before commercial production.
- **Météo-France `meteo.data.gouv.fr`:** open data, Licence Ouverte 2.0.
- **No PII concerns** from any reanalysis source. The privacy story is entirely about the IGC track itself, which is the pilot's own data.

---

## 9 · The one thing that will make pilots say "holy shit"

**A per-flight Skew-T diagram** showing the atmospheric profile *the day you flew*, with **your thermals drawn on top as horizontal bars** (entry alt ↔ exit alt, colour = average climb rate, width = duration), with the BLH and any inversions marked, with a tiny annotation: *"This is reconstructed from ERA5 + COSMO-REA6 + Payerne 12Z + your own 14 thermals. Confidence 0.81."*

Pilots have been buying paper Skew-Ts and squinting at them since before paragliding existed. Showing them their own flight inside one — with proof that the atmosphere they fought is the atmosphere reanalysis confirms — collapses an explanation gap that pilots have lived with their entire careers.

Second-tier "holy shit" moments:

- **Population overlay:** "Of 47 flights in this box today, 89% topped out within 100 m of 2,350 m. The BLH was the wall, not your skill."
- **Inversion overlay on a glide segment:** the moment the pilot crossed the inversion (visible in the audio variometer as the climb stopping) drawn at the exact altitude where the lapse rate flips from dry-adiabatic to isothermal.
- **Site fingerprint after 50 flights:** "At this launch, in this synoptic pattern, here's the historical BLH distribution. You flew at the 30th percentile day." Pilots will pay for that.

---

## 10 · Effort estimate — solo dev, part-time, 4–6 months

Assumes ~10–15 focused hours/week. Halve the timeline if full-time.

| Phase | Weeks | Deliverable |
|---|---|---|
| **0. Spike** | 1 | Standalone Python script: given lat/lon/time, return ERA5 sounding + BLH + CAPE via ARCO-ERA5 Zarr. Plot a Skew-T. |
| **1. IGC analytics** | 2 | Parser, phase segmentation, thermal extraction, drift-wind extraction, BL-top estimate. Unit-tested. |
| **2. Observation fetchers** | 3 | Pioupiou + DWD SYNOP + Wyoming/IGRA radiosondes, with a unified `Observation(time, lat, lon, z, variable, value, σ)` schema. Caching layer. |
| **3. Fusion v1** | 3 | Inverse-variance blend for BLH and wind-at-altitude. Output the structured atmospheric report card. |
| **4. COSMO-REA6 + CERRA integration** | 2 | DWD OpenData GRIB pulls, CDS API for CERRA. Conditional cascade: use regional where available, fall back to ERA5. |
| **5. Skew-T + thermals overlay** | 2 | The visual. Probably the bit that sells the product. |
| **6. LLM coaching layer** | 2 | Prompt engineering, evaluation harness, "ground in receipts" rules. |
| **7. Fusion v2: 2D OI surface wind** | 3 | Optional but high-leverage upgrade. |
| **8. Polish, caching, async, deploy** | 3 | Production-shape it. |

**Total:** 21 weeks at the slow end. Cut #7 to ship faster. A v0.5 (phases 0–3 + 5 + 6) is shippable in **~12–14 weeks** and is already differentiated.

---

## 11 · Open questions / verify-before-shipping

1. **ICON-D2 archive depth.** Does DWD have a research-grade archive of ICON-D2 going back >2 years? Worth an email to `klima.vertrieb@dwd.de` or `opendata@dwd.de`. If yes, this is the European Alps upgrade path beyond COSMO-REA6 (which stops in 2019).
2. **ARCO-ERA5 egress costs** on GCS for production traffic. Verify whether it's truly free or requester-pays once you exceed a threshold.
3. **CERRA hourly vs 3-hourly** for surface variables — confirm which subset is hourly (some are, some aren't) before relying on it for sub-hour event reconstruction.
4. **Meteoblue commercial terms** for historical soundings if you want them as a paid backstop.
5. **WeGlide's actual weather integration** — closest existing competitor on this axis; do a deep dive on their product before publishing claims of novelty.
6. **Sigma values for the inverse-variance fusion** — pull from the literature on ERA5 evaluation in complex terrain (Innsbruck + ETH groups) rather than guessing. Don't ship with made-up numbers.
7. **Sounding station coverage gaps** for the Eastern Alps / Pyrenees — figure out the substitution logic when no station is within 100 km.

---

## 12 · Confirmed-live sources used in this document

- ECMWF / Copernicus Confluence: ERA5 data documentation (`confluence.ecmwf.int/display/CKB/ERA5%3A+data+documentation`)
- Copernicus CDS dataset page: ERA5 hourly single levels 1940–present (`cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels`)
- Herbie project documentation (`herbie.readthedocs.io`)
- DWD OpenData server root (`opendata.dwd.de`) and COSMO-REA6 directory (`opendata.dwd.de/climate_environment/REA/COSMO_REA6/`)
- DWD ICON-D2 directory (`opendata.dwd.de/weather/nwp/icon-d2/`)
- University of Wyoming radiosonde archive (`weather.uwyo.edu/upperair/sounding.shtml`)
- Pioupiou developer docs: live API and archive API (`developers.pioupiou.fr/api/live/`, `developers.pioupiou.fr/api/archive/`)
- RASP / Dr Jack landing page (`drjack.info/RASP/`)
- Skysight overview (`skysight.io`)
- Météo-France open data portal (`meteo.data.gouv.fr`)

Items not directly re-verified in this session (web search was rate-limited mid-research; verify before quoting in customer-facing material): exact ARCO-ERA5 bucket paths and pricing, IGRA v2 exact archive URL, MeteoSwiss IDAweb current open-data terms, specific academic citations on glider-derived wind/BLH, current Holfuy historical-data API terms.

---

## 13 · TL;DR for Thomi

Build it. The data exists, the APIs are open, the math is undergraduate-level, and **nobody else is closing the loop between IGC and reanalysis**. The only real engineering risk is being honest about ERA5's 31 km blur in mountain terrain — and the fix for that risk *is* the moat: you treat every flight as another atmospheric observation, and over time your product knows the actual sky better than any forecast does.

Twelve weeks to a Skew-T-with-thermals-overlaid demo. That demo alone will sell.
