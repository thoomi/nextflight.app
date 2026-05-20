# NextFlight — Novel & Non-Obvious Approaches to Free-Flight Data
**Blue-sky research dossier.** Curated for a product strategy conversation, not a textbook. Where the literature is thin, that's flagged honestly; where it's a wide-open lane, that's flagged too.

> **Method note.** This is a synthesis of web searches (Gemini-routed), targeted reads of papers/blog posts/Wikipedia, and informed inference about what would actually transfer to paragliding. Citations are real and verifiable, but coverage is not encyclopedic — search quota rate-limited mid-research and some threads are intentionally one-source-with-extrapolation rather than fully papered out. Anything marked **[open lane]** means: I looked, nobody has done this for free-flight yet, and that's exactly why it's interesting.

---

## Executive Summary — Top 5 Non-Obvious Ideas

1. **FTLE / Lagrangian Coherent Structures over aggregated track data** — Treat thousands of paraglider tracks as Lagrangian tracers in the unknown atmospheric flow. Compute FTLE fields per site/time-of-day. *Why this is different:* every existing thermal map (thermal.kk7.ch, XCglobe heatmaps) shows **where** thermals happened. FTLE shows the **invisible skeleton** that organizes the air — transport barriers, attracting ridges, convergence lines. It's the conceptual jump from "dots on a map" to "the wind itself, rendered."
2. **Flight2Vec — embedding entire flights as 64-d vectors via contrastive learning** — Borrowing directly from the NBA's Sloan Sports Conference paper on basketball trajectory embeddings (2017+), train an encoder where geometrically/semantically similar flights cluster. *Why this is different:* enables "Find me 10 flights most similar to this one" (across hundreds of thousands of IGC files), one-shot pilot style fingerprinting, and instant XC-route discovery without any hand-engineered features.
3. **The thermal field as a multi-armed bandit / RL environment, replayed against the pilot** — Use the Microsoft Project Frigatebird / POMDSoar formulation backwards: instead of training a glider, **score the pilot's actual decisions** against an optimal-explorer policy. *Why this is different:* current XC-replay shows "what the pilot did vs. straight line." This shows "what the pilot did vs. the Bayes-optimal explorer **with the same information they had at that moment**." Quantifies "luck vs. skill" rigorously.
4. **Microclimate fingerprinting — turn each site into a 128-d vector** — Aggregate every track at a site into a multi-channel signature (thermal trigger density by time-of-day, climb-rate distribution, wind shear profile, convergence frequency, day-type clusters). *Why this is different:* "I've never flown St. André — show me three sites I know well that fly most like it." Currently, this knowledge lives only in pilots' heads and forum posts.
5. **Cognitive-load proxy from track geometry + biometrics** — Heading-change entropy, climb-rate variance, thermal-centering quality, indecision oscillations × HR/HRV from .fit files. *Why this is different:* the whole sport talks about "task saturation" qualitatively. Nobody is *measuring* it from the data we already have. Direct safety angle.

---

## 1. Non-Obvious Visualization Approaches

### 1.1 Flow visualization from fluid dynamics / meteorology

**FTLE & Lagrangian Coherent Structures (LCS)** — The killer concept of this whole document.

- **What it is.** FTLE measures how fast nearby trajectories separate over a finite time window; ridges in the FTLE field are **repelling LCS**, troughs of forward FTLE are **attracting LCS**. They are the "skeleton" of a flow — the invisible surfaces that organize mass transport. Robust to noise and model error, which is why oceanographers love them. (Haller, *Annu. Rev. Fluid Mech.* 2015; Wikipedia, *Lagrangian coherent structure*.)
- **Existing applications.** Ocean drifters, oil-spill forecasting, volcanic ash, surface drifters, chlorophyll patterns. Underwater gliders use LCS for efficient navigation. **Albatrosses are hypothesized to forage along LCS** — that paper alone should excite any free-flight nerd.
- **Free-flight applications: [open lane].** Nobody has, to my knowledge, treated aggregated paraglider tracks as discrete-time tracer particles in an inverse-problem sense to reconstruct atmospheric LCS over a flying site. Adjacent work: ML/RL papers train gliders to soar (Reddy/Vergassola PNAS 2016; Microsoft POMDSoar) and use FTLE conceptually for understanding turbulence cues, but **no public tool renders LCS for paragliders**.
- **What it would look like in NextFlight.**
  - Time-animated 2D ridge map over the terrain: red ridges = repelling structures (avoid — air will eject you), blue troughs = attracting structures (follow — air converges here, including convergence lines and thermal sources).
  - 3D version: ridges as translucent membranes hanging over the valley. The hairs on every XC pilot's neck stand up.
  - Per-site, time-of-day animation: how the FTLE skeleton evolves as the day cooks.
- **Effort.** **Medium-high.** Need a 2D wind/lift field reconstruction (Kriging or Gaussian process over track-derived vertical-wind estimates from many flights), then standard FTLE on the resulting time-evolving field. Several Python LCS libraries exist (`lagrangian` on readthedocs, `tracpy`, `parcels`). A first-cut prototype: 2–4 engineer-weeks. Production: months.
- **Risk.** The reconstructed wind field is the hard part. With enough tracks per site, doable; sparse sites will look noisy.

**Line Integral Convolution (LIC).** Classic CFD streamline visualization. Apply to the same reconstructed wind field. **Effort: low** if you already have the field. Outcome: gorgeous "brushed metal" maps showing flow direction at a glance. Pairs well with FTLE underneath.

**Streamlines with seed-from-clicks.** Click anywhere on the map → trace a streamline forward and backward. "If a parcel of air starts here at 14:00, where does it go?" Pure storytelling power for site briefings.

### 1.2 Topological data analysis (TDA) for trajectories

- **Persistent homology** finds topological features (loops, voids, branches) that persist across spatial scales — robust to noise, parameter-free in a useful sense. (Wikipedia: persistent homology; libraries: `gudhi`, `ripser`, `giotto-tda`.)
- **Existing trajectory work.** There's a real body of literature applying TDA to GPS trajectories, e.g. trajectory simplification by persistence (Carrière et al., Chazal et al.), and to time-series via takens-embedding + persistence (Perea, Harer). Some movement-ecology papers (Bhattacharya et al.) use mapper to summarize movement state-space.
- **Free-flight angle.** A pilot's flight has natural topological features: thermal loops (1-cycles), figure-8s around ridges, out-and-return shapes. Mapper algorithm can produce a **graph summary** of a flight or a corpus of flights where nodes = clusters of similar phases, edges = transitions. Imagine a clickable "graph of thermal centering styles" extracted from 100k flights.
- **What it would look like in NextFlight.** A "flight DNA" widget — your flight reduced to its persistence diagram or mapper graph, comparable across pilots. Also: detection of "novel" sites in a corpus by topological distance.
- **Effort: medium.** TDA libraries are mature; mapping the domain (what feature = what topological object) is the actual research.

### 1.3 Uncertainty visualization

Borrow weather-forecasting visual grammar wholesale:

- **Ensemble spaghetti plots** for "where would 100 simulated thermal explorers go from here?" Generate ensemble of synthetic trajectories from the local probabilistic thermal model and over-plot.
- **Probability cones** like hurricane forecasts: "if you bail now and glide, here's the 50/80/95% probability cone of landing positions." Visually intuitive for in-flight decisions.
- **Bivariate choropleth** for thermal map confidence × thermal strength. Today, thermal.kk7.ch shows mean strength but **not confidence**; bivariate maps would solve the "is this site sparse data or actually a thermal desert?" ambiguity in one glance.

**Effort: low-medium.** This is mostly a design + d3/deck.gl exercise on existing aggregated data.

### 1.4 Phase-space / state-space plots

- **Concept.** Plot altitude × climb rate × airspeed (or any 3 IGC-derivable quantities) as a 3D trajectory in state space. Dynamical-systems folks routinely visualize attractors this way; a thermalling phase is a torus-like winding in (alt, vario, heading-rate) space, gliding is a near-straight ray.
- **Free-flight work: [open lane].** Sailplane and HG/PG community basically does not do this. Closest cousin: glider polar curves (single-point operating-condition plots), not full-trajectory phase portraits.
- **Why it matters.** A well-centered thermal is a tight spiral in 3D phase space; a sloppy one is a noisy donut. Visually obvious — and quantifiable as e.g. **fractal dimension of the phase-space attractor** or radius-of-gyration in (vario, heading-rate).
- **Effort: low.** Cheap, immediate. Coolness-per-engineer-hour is enormous.

### 1.5 Information-theoretic flight analysis

- **Shannon entropy of heading changes** over rolling windows: high entropy = searching / confused / scratchy, low entropy = committed glide or clean thermalling.
- **Mutual information** between terrain features (slope, aspect, sun exposure) and "did the pilot find lift here?" — quantifies how much of a pilot's success at a site is explained by terrain alone.
- **Transfer entropy** between two pilots flying together: does pilot A's vertical speed predict pilot B's next decision more than B's own past? Detects following behavior cleanly.
- **Effort: low.** Hundreds of lines of Python. Visualizations: rolling entropy strip below the altitude trace; transfer-entropy network between pilots flying simultaneously.

### 1.6 Geospatial clustering visualization

- **HDBSCAN / OPTICS** for thermal cores from climb-segments. HDBSCAN is the modern choice — handles varying density, doesn't require ε, returns outlier scores.
- **Best implementations** to look at: `hdbscan` library has condensed-tree visualizations that are gorgeous; `pydeck`'s HexagonLayer + cluster overlay is the production pattern.
- **Free-flight beyond the obvious heatmap.** Per-thermal **stability score** = how often does HDBSCAN merge climbs at this location across days vs. fragment? Stable cores = "always works"; unstable = "depends on the day." Show as a single color channel.

### 1.7 Temporal heatmaps

- **Calendar heatmaps** (GitHub-style) of personal flying — which days flew, color = duration or distance. Obvious but criminally absent from most pilot tools.
- **Time-of-day × day-of-year** heatmap per site, color = mean climb rate found. Lets you see "this site cooks from 13:30 May-August, marginal otherwise."
- **Polar / radial** plots of takeoff/landing hours by season per site. Site-personality at a glance.

### 1.8 Sankey / flow diagrams for XC routes

- **Where do pilots go from key turnpoints?** At Annecy Forclaz, after the first thermal, pilots branch toward Talloires, Sulens, or push to the Aravis. A Sankey diagram with branch widths proportional to flight count makes the implicit "tribal knowledge" of a site visible to a first-time visitor.
- **Decision-point Sankeys** by skill level: how do top-10% pilots branch vs. median? Reveals where the time/distance gets made.
- **[Open lane].** XContest has heatmaps and individual track replay but nothing like this aggregate decision-flow visualization. **High product impact.**

---

## 2. Novel Aggregation Approaches

### 2.1 Trajectory clustering — DTW, Fréchet, DBA

- **State of the art.** DTW with HDBSCAN/k-medoids on the distance matrix is the standard recipe; `tslearn` and `dtaidistance` handle it at scale. **Discrete Fréchet distance** is geometrically more rigorous for trajectories (cares about path shape, not just point matching). For routes-with-altitude, Fréchet is arguably better than DTW because pilot speed varies wildly during a flight.
- **Soft-DTW** is differentiable → enables learning embeddings end-to-end (Cuturi & Blondel 2017).
- **Paragliding-specific work:** I found none in the academic record. Aviation/air-traffic-control literature is rich (Purdue thesis on vectored-airspace arrival clustering; NASA DASHlink trajectory clustering for ATC). All techniques transfer cleanly.
- **NextFlight angle.** "Find similar flights to this one" feature; auto-generated "route archetypes" per site ("the classic Forclaz–Tournette–Sulens triangle," etc.).

### 2.2 Flight embedding spaces — the Flight2Vec / similar-possessions-finder play

This is one of the highest-leverage ideas in this entire document.

- **Direct precedent.** The Sloan Sports Conference paper *"Using Deep Learning to Understand Patterns of Player Movement in the NBA"* — they trained a 32-d trajectory embedding for individual player movements and built the **Similar Possessions Finder**: a queryable database of 3 million NBA possessions where Euclidean distance in embedding space ≈ visual similarity. (sloansportsconference.com/research-papers/using-deep-learning-to-understand-patterns-of-player-movement-in-the-nba)
- **General academic backing.** Traj2Vec (Yao et al. 2017) — trajectories as sentences, locations as words; t2vec (Li et al. 2018) — sequence-to-sequence on noisy GPS; modern contrastive-learning approaches (e.g. arXiv:2207.14539, 2501.09327) with Transformer encoders produce fixed-dimensional embeddings that beat hand-crafted features on retrieval/clustering.
- **Free-flight design.**
  - Tokenize each flight into a sequence of (Δhdg, climb-rate-bin, altitude-band, time-of-day, terrain-context-token).
  - Train contrastively: positive pairs = same flight under augmentation (downsample, rotate, time-shift); negatives = random other flights.
  - 64–128-d vector per flight.
- **What you get.**
  - "Similar flights" semantic search.
  - Pilot style fingerprinting (centroid of a pilot's flight embeddings = their flying personality).
  - Automatic XC-route discovery (cluster embeddings → name the clusters by hand once → auto-tag all flights).
  - Site discovery — find sites whose flight-corpus distribution looks like a site you love.
- **Effort: medium-high.** Real ML project — 2–3 engineer-months to get to production quality on 100k+ flights. But this is the kind of feature that defines the product.

### 2.3 Collective behavior / swarm analysis

- **Inspiration.** Animal-collective-behavior literature (Couzin et al., Berdahl et al. on schooling fish; Nagy et al. on pigeon flocks) developed methods to detect leadership, alignment, and emergent navigation from multi-agent trajectories.
- **Free-flight angle: [open lane, fascinating].** When 30 pilots are over Forclaz at 14:00, do they collectively explore the thermal field more efficiently than the same 30 flying solo? Can you detect implicit "scouts" who consistently find lift first, and "followers" who arrive 2 minutes later?
- **Methods.** Pairwise leadership via time-delayed correlation of climb events; collective information score (Berdahl 2013) adapted to thermal-discovery.
- **Visualizations.** A directed "who-followed-whom-and-when" graph for a flying day at a site. Heat decay of "lift events" propagating through the pilot swarm.

### 2.4 Skill progression modeling

- **TrueSkill / Glicko-2 / OpenSkill** for multi-pilot, multi-flight ranking. TrueSkill (Herbrich, Minka, Graepel — Microsoft Research 2007; TrueSkill2 in 2018) handles teams and >2 players via Bayesian factor graphs over Gaussian skill posteriors. (Wikipedia: TrueSkill.)
- **Free-flight angle.** Treat "flight at site X on day Y" as a multiplayer "match" — all pilots flying that day are the contenders. Skill update from XC distance / declared-task completion / time-on-task. Result: a **principled, uncertainty-aware skill score** that updates per flight, not the noisy XContest leaderboard.
- **Bayesian skill tracking with progression dynamics.** TrueSkill-Through-Time (Dangauthier et al. 2008) — same idea but the skill is a function of time. Lets you plot "your true skill trajectory" with uncertainty bands.
- **Why this beats current systems.** XContest scores are essentially competition-distance scores; they reward big days, not consistent skill, and they're noisy. A TrueSkill-style estimate is what pilots actually want when they ask "am I getting better?"

### 2.5 Anomaly detection in flight data

- **Isolation Forest, LOF, autoencoders** on per-pilot rolling statistics (climb rate, sink rate, glide ratio, control inputs if available). Flag "this flight is unusually X compared to your normal."
- **Specific safety play.** Detect (a) unstable approaches, (b) collapses (high G + sudden descent), (c) cravats (asymmetric descent + persistent yaw), (d) early-onset SIV-grade incidents that the pilot dismissed.
- **Adjacent literature.** Aircraft anomaly detection (FOQA / NASA's ClusterAD); driving telematics (autoencoder-based driver anomaly papers, e.g. Hu et al. 2020). Transfer is direct.

### 2.6 Counterfactual flight analysis at scale

- **Beyond "what was optimal for this flight."** Build a graph of "junction nodes" at a site (places where ≥N pilots have made a routing decision). For each junction, look at the corpus: pilots who went left vs. right, conditional on similar arrival-state (altitude, wind, time-of-day).
- **Output.** "At the Sulens junction, arriving above 2200m before 14:30, going north scored 1.4× the distance of going south historically (n=247). Below 2200m or after 14:30, south wins."
- **Causal-inference caveat.** This is observational, not interventional, so confounding looms. Propensity-score matching, or just be honest with confidence intervals.
- **Visualization.** Junction overlay on the site map; click → see the decision-outcome distribution.

### 2.7 Network analysis of the thermal field

- **Model.** Thermals = nodes (clustered from real data). Glides between consecutive thermals = directed edges weighted by frequency. Now run graph analytics.
- **Likely findings.**
  - Small-world structure (most thermals have few connections, a few are mega-hubs).
  - Hub thermals = sites every long XC routes through (these tend to be famous waypoints).
  - **Community detection** (Louvain, Leiden) → naturally segments the site into "sub-regions" of connected thermal networks.
  - **Betweenness centrality** → identifies "gateway thermals" without which the route doesn't work.
- **[Open lane].** Truly nobody is doing this for free-flight that I can find. Direct precedent: maritime route-network analyses, air-traffic-route graphs.
- **Visualization.** Force-directed graph next to the geographic map; click a node → highlight its connections + geographic location.

---

## 3. Uncommon Analytical Angles

### 3.1 Cognitive-load estimation from flight tracks

- **Hypothesis.** Cognitive load shows up in the data as:
  - High heading-change entropy in short windows (indecision).
  - Poor thermal centering (large radius-of-gyration, drift relative to climb center).
  - Slow decision latency (time between bad-info signal and action — e.g. losing 200m before committing to leave a dying thermal).
  - Oscillatory bank-angle if you have IMU.
- **Existing HCI/aviation work.** Cognitive load in pilots has been measured via EEG, eye-tracking, pupillometry, and heart-rate variability (Wilson 2002; Causse et al. 2013). Behavioral proxies (control input variability) are validated in driving (steering reversal rate) and aviation. **Translation to paragliding is a clean PhD project waiting to happen.**
- **NextFlight feature.** A "task saturation" timeline below the altitude trace. Red zones = "you were probably overloaded here" — perfect debrief tool.

### 3.2 Pilot biometric correlation

- **Existing data sources.** Garmin / Polar / Apple Watch / Wahoo all export `.fit` files with HR, HRV, sometimes SpO2 and skin temp. Many pilots already wear a watch.
- **Published work in soaring/PG specifically: very thin.** Skydiving HR studies exist (Allison et al.). General-aviation cockpit stress studies exist. Paragliding-specific: a 2019 EEG/HR study (Eržen et al.) on cognitive demand during competitive PG flights — small but a direct precedent.
- **What you can extract.**
  - Baseline HR vs. in-flight HR — stress delta.
  - HRV collapse moments — high acute stress.
  - Correlate stress spikes to **what was happening in the air** (turbulence proxy from altitude-noise spectrum, proximity to terrain, decision points).
- **Compelling visualization.** A second timeline below the flight: HR + RMSSD. Hover-link both ways with the map. "Show me my most stressful moments" → jumps to the right minute on the right thermal.
- **Effort: medium.** Parsing .fit and synchronizing to IGC is fiddly but solved (Garmin SDK, `fitparse` Python lib).

### 3.3 Microclimate fingerprinting

This is one of the top 5 ideas above. Expanding:

- **Per-site signature features (proposed).**
  - Diurnal cycle of mean climb rate.
  - Spatial entropy of thermal locations.
  - Wind-vs-altitude profile (gradient & shear).
  - Convergence frequency (estimated from co-located opposite-direction tracks).
  - Day-type cluster mixture (which synoptic patterns produce flying here, with what frequency).
  - Topographic correlation (where do triggers cluster relative to slope/aspect/aspect-relative-to-sun).
- **Comparison.** L2 distance, cosine similarity, or KL between site-vector distributions → "sites most similar to St. Hilaire" / "sites that fly like Bir-Billing in pre-monsoon."
- **Visualization.** UMAP of sites; color by region; hover for site stats.

### 3.4 Luck vs. skill decomposition

- **The "luck quantification" question.** On a given day, decompose distance into:
  - Day quality (what did the median pilot do today?).
  - Site difficulty (per-site baseline).
  - Pilot skill (TrueSkill estimate, smoothed).
  - **Residual = luck.**
- **Reference.** Mauboussin's *The Success Equation*; baseball sabermetrics (BABIP as luck proxy); poker variance literature.
- **Information-theoretic version.** Compare entropy of pilot's outcomes given (day, site, route choice) vs. entropy given (day, site, route choice, skill estimate). The skill-attributable reduction = "skill explained variance." The rest is luck + unobserved factors.
- **Why this matters.** Pilots violently overestimate skill on good days and underestimate on bad ones. A debrief feature that says "this 180km flight was 60% day, 25% skill, 15% luck — vs. your 80km flight last week was 40% skill, 5% day, 55% you crushed it" is a genuinely new way to think about progression.

### 3.5 Time-of-flight physics buried in IGC noise

IGC records GPS @ 1Hz with barometric altitude. There's more physics in there than people use:

- **Wing polar estimation from real flights.** Fit a parabola of sink rate vs. airspeed over gliding segments. Compare to manufacturer polar — wing wear, harness aero, line tension all show up. Public references: Tomasz Lewandowski's polar-fit tools for sailplanes; nothing equivalent productized for paragliders.
- **Turbulence estimation from altitude-noise spectrum.** Compute the power spectral density of barometric altitude residuals in gliding segments. The high-frequency tail correlates with atmospheric turbulence intensity. No accelerometer needed.
- **Wind triangle in real time.** From ground-track + airspeed (if pitot) or just from ground-track over a thermal circle (circle-drift method), recover wind vector accurately. Used by XCSoar/LK8000 already, but rarely **visualized as wind aloft, animated through the flight**.
- **Effort: low-medium.** Mostly signal-processing on existing data.

### 3.6 Soaring as a search problem — RL / multi-armed bandit connection

- **The mapping is exact.** Decision: "which thermal candidate do I commit to?" Each candidate has unknown reward (climb rate, lifespan). Each decision costs altitude (sampling cost). This **is** the multi-armed bandit problem, with non-stationary arms and a sampling cost — a "Bayesian best-arm-identification with travel cost" variant.
- **Existing soaring RL work.**
  - Reddy, Celani, Sejnowski, Vergassola — *Learning to soar in turbulent environments*, PNAS 2016 (papers.cnl.salk.edu PDF). SARSA-style RL agent learns thermal centering from vertical wind + roll-torque cues.
  - Microsoft Project Frigatebird / POMDSoar (Kochenderfer et al.) — Bayesian RL for thermal exploitation deployed on real sUAVs (RSS 2018, IROS 2018).
  - ArduSoar — open-source thermalling controller.
  - Hierarchical RL for cross-country soaring (Notter et al., RG 2022).
- **The product play.** Run a Bayes-optimal policy *retroactively* against a pilot's flight. At each decision point, given only what the pilot knew at that moment (their thermal observations so far, wind, time), what would the Bayes-optimal explorer do? Score the gap. **This is the rigorous "luck vs. skill" computation per decision.**
- **Effort: high.** But this is genuinely novel and very defensible IP for a product.

### 3.7 Social contagion in flying choices

- **Detect simultaneous-track influence.** With minute-resolution timestamps and N pilots in the air at site X on day Y, test: does pilot A's heading change at t predict pilot B's heading change at t+Δ more than B's own past? Granger causality / transfer entropy in spatial domain.
- **Network effects in thermal discovery.** Did pilot A "discovering" lift at location L change the spatial distribution of subsequent pilot visits to L?
- **[Open lane].** Animal collective-behavior literature gives all the tools; nobody has applied them to paraglider tracks.
- **Privacy note.** Requires consented multi-pilot real-time tracks (LiveTrack24 / FlymasterLive / SeeYou Live data with pilot consent).

### 3.8 The "last 100m" problem — landing safety

- **Most incidents = launch & landing.** What does the data say?
  - Approach geometry quality (final-leg straightness, overshoot/undershoot pattern, base-leg crab angle vs. wind).
  - Sink-rate spikes at < 50m AGL (turbulence in landing pattern).
  - Slope-landing detection — heading vs. terrain-slope alignment, ground-speed at touchdown.
- **Existing work.** General-aviation runway-excursion ML (Puranik & Mavris, Georgia Tech). FOQA / FDM analytics in commercial aviation. PG-specific: essentially nothing public.
- **NextFlight feature.** "Landing analyzer" — every landing scored on a 1-5 quality rubric with explanations. Over a season, watch your landing quality trend up (or be told to take a SIV).

### 3.9 Weather pattern archetypes

- **Cluster synoptic weather** (500hPa geopotential, surface pressure pattern, lapse rate sounding) on flying-days only. Methods: self-organizing maps, k-means on EOF coefficients, or large-pretrained-weather-model embeddings.
- **Per site, label each cluster with the typical flight outcome** (good XC day, soarable but local, gusty/dangerous, blue thermals, classic convergence).
- **Use case.** "Tomorrow's synoptic pattern is cluster #7 — at your home site, this historically produces 60km triangles with cumulus base at 2400m, NE flow." Far more actionable than raw sounding data.
- **Existing analogs.** Lamb weather types (UK), Hess-Brezowsky Grosswetterlagen (DE). Soaring forecasting via SOMs has been done academically (e.g. Mladenov et al. for glider XC forecasting in Bulgaria).

---

## 4. Cross-Domain Inspiration

### 4.1 Maritime AIS analysis

- **What they've built.**
  - KDE-based density maps of sea-lanes (Willems, Scheepens et al.).
  - Trajectory anomaly detection at scale (TREAD, MarNet).
  - Vessel-behavior classification (fishing vs. transit vs. anchored) — directly transfers to "thermalling vs. gliding vs. ridge-soaring vs. landing-approach" classification.
  - Collision-risk metrics (CPA, TCPA) → transfer to mid-air separation in busy airspace.
- **Top transfer.** The **mature anomaly-detection visual analytics** literature for AIS — rank-table linked to map, color-coded score, drill-down workflow — is a templated UX you could lift wholesale for free-flight.

### 4.2 Animal migration / Movebank ecosystem

- **Movebank** (movebank.org) hosts millions of GPS-tagged animal tracks across hundreds of studies; the associated R/Python `move` package + Env-DATA system annotate tracks with environmental covariates on-the-fly. The visualization grammar (timeline brushing, multi-individual overlay, behavioral segmentation via HMM) is sophisticated and battle-tested.
- **Specifically relevant.** Stork migration studies (Flack et al., Nagy et al.) — they explicitly analyze **thermal-soaring behavior of migrating storks**, including thermal radius/strength estimation from track curvature and altitude gain. **This is the closest existing-domain analog to free-flight analytics and almost nobody in the PG world knows about it.**
- **Hidden-state models** for behavioral mode classification (HMMs, state-space models in `momentuHMM`) — direct transfer to flight-phase segmentation.

### 4.3 Sports analytics

- **NBA Sloan paper** (already covered) for trajectory embeddings.
- **Soccer xG / xT models** — expected-threat per pitch location is a probabilistic value function over space. Free-flight analog: **expected-XC-distance per (location, altitude, time-of-day)** — a value function over phase-space. Train from corpus; visualize as a 3D heatmap; use to evaluate decisions in retrospect.
- **Tennis rally analysis** — sequence-modeling of shot types. Free-flight analog: sequence of (climb, glide, decision-point) tokens; HMM or Transformer over flight tokens for style classification.
- **Formula 1 telemetry overlays** — driver-vs-driver lap comparison UI is *the* gold standard for comparing two tracks side-by-side. Steal this UX wholesale for "your flight vs. your training partner's flight."

### 4.4 Driving telematics

- **Insurance scoring** (Progressive Snapshot, Cambridge Mobile Telematics). They build per-driver risk scores from acceleration / braking / cornering / phone-use. Methods transfer directly to "pilot risk score" from harness-IMU + GPS.
- **Uber/Lyft driver quality scoring** uses similar models. Caveat: ethically dicey to use punitively in a recreational sport; framed as a personal-improvement tool, it's fine.

### 4.5 Neuroscience / EEG visualization

- **Topographic head-maps** with interpolated isolines — directly transferable to "altitude/lift contour over terrain" with the same elegant scalar-on-2D-manifold rendering. The MNE-Python visual grammar is exquisite and underused outside neuro.

---

## 5. Emerging Tech Angles

### 5.1 Foundation models for time series

- **State of the field (2024–25).** TimesFM (Google), Chronos (AWS), Moirai (Salesforce), Lag-Llama. Zero-shot forecasting on diverse time series with surprising accuracy; fine-tuneable.
- **Free-flight applications.**
  - **Thermal lifespan prediction** — given the first 30 seconds inside a thermal (climb-rate, position), predict the remaining lifespan + peak strength. Fine-tune Chronos on a corpus of thermal segments.
  - **Sink-rate forecasting** during glides for tactical decisions.
  - **Day-quality prediction** from morning soundings + recent weeks' flight history (multivariate forecast).
- **Effort.** Fine-tuning is days-of-engineering once you have clean labeled data. The data pipeline is the actual work.

### 5.2 Diffusion models for trajectory generation

- **Existing work.** Trajectory diffusion models (Janner et al. — Diffuser, ICML 2022; Jiang et al. — MotionDiffuser, CVPR 2023; Westny et al. for autonomous driving). Generate plausible future trajectories conditioned on past + context.
- **Free-flight play.** "What would an expert have done from here?" Conditional generation: given the pilot's state up to time t and the site/conditions, sample plausible expert continuations. Visualize as a faded "ghost flight" overlay.
- **Effort.** Real ML R&D. 3–6 engineer-months for a first useful version. But it's defensible: this is **counterfactual ghost replay** done right, and nothing like it exists.

### 5.3 Neuro-symbolic / physics-informed

- **Combine** (a) known flight mechanics (wing polar, air density, basic thermal updraft model) with (b) learned residuals from data.
- **Pay-offs:** more interpretable than pure ML, more data-efficient, generalizes to new sites.
- **Specific:** Hamiltonian Neural Networks or Lagrangian Neural Networks for flight dynamics; physics-informed Gaussian processes for thermal field reconstruction with proper uncertainty.

### 5.4 WebGPU for visualization

- **What's newly possible.** Real-time volumetric rendering of large 3D scalar fields (the LCS membranes, the thermal probability cloud). GPU-accelerated KDE on millions of points interactively. WebGPU compute shaders for FTLE recomputation on-the-fly as the user scrubs through time.
- **Libraries.** `regl`, `deck.gl` with WebGPU backend (in progress), `three.js` WebGPU renderer. Babylon.js has the most mature WebGPU support today.
- **NextFlight angle.** This is the difference between "renders 10k tracks at 30fps" (WebGL ceiling on a typical laptop) and "renders 500k tracks with volumetric thermal cloud at 60fps." Massive UX delta.

### 5.5 Gaussian splatting

- **3D Gaussian splatting** (Inria 2023) — represent 3D scenes as millions of anisotropic Gaussians, render in real time. Beat NeRF on speed.
- **Free-flight applications:**
  - **Photo-realistic site replay.** Reconstruct a flying site as a 3DGS scene from drone footage (or aggregate pilot GoPro footage!) and replay flights inside a real-photographic 3D environment, not a cartoon mesh.
  - **Atmospheric volumetric rendering.** Use Gaussians as splatted "thermal cloud" primitives — assign each a density (probability) and color (mean climb rate). The render quality is dramatically better than voxel sampling.
- **Effort.** Medium-high. Tooling is maturing fast (`gsplat`, `splatviz`, `nerfstudio`). 3DGS scene reconstruction of one site: 1–2 weeks per site at first. Splatted thermal-cloud rendering: a custom shader on top of an existing 3DGS rasterizer.

---

## Cross-Domain Picks — Top 3 Transfers

1. **Animal-movement HMM behavioral segmentation (from Movebank ecosystem)** — Drop-in classification of every IGC second into a flight-phase token. Mature R libraries (`momentuHMM`, `crawl`). Cleanest, fastest win. **Effort: low. Payoff: enables every downstream embedding/clustering/analytics feature.**
2. **NBA Similar-Possessions-Finder pattern (sports analytics)** — Trajectory embeddings + similarity search at corpus scale. Defines the product. **Effort: medium-high. Payoff: a defining feature.**
3. **AIS maritime visual-analytics UX (anomaly score table linked to map)** — Battle-tested interaction grammar for "rank, filter, drill down" on track corpora. **Effort: low (UX pattern). Payoff: dramatically better navigation of large flight collections.**

---

## The Weirdest Good Idea

### LCS-FTLE atmospheric skeleton, rendered as translucent volumetric "wind anatomy" of a flying site.

Why this one:

- **It's a genuine paradigm shift, not an incremental dashboard.** Every existing tool answers "where did pilots find lift?" This one answers "what is the *invisible structure* of the air that decides where lift will be?"
- **It has a clean academic basis.** Decades of LCS theory (Haller, Shadden, Lekien). Validated in oceans, atmospheres, and **specifically hypothesized to be exploited by foraging albatrosses** — the marketing copy writes itself.
- **It looks unbelievable.** A 3D scene of your home site with red ridges and blue troughs sculpting the airspace, animating through the day. Demo gold.
- **It's defensible IP.** The inverse problem (reconstruct atmospheric flow field from sparse, opportunistic glider tracks) is non-trivial. The team that does it first will be the team that "owns" this representation in the free-flight world.
- **It's actionable for pilots, not just pretty.** Repelling LCS ridges = "if you cross this line, you'll be ejected and lose 200m." Attracting LCS troughs = "follow this contour, you'll be conveyor-belted." Pilots already feel this in the air. This visualization gives them the map.

**The risk:** the inverse problem is hard, and with insufficient track density per site/time-window, you get a noisy or biased field that looks confident but misleads. Honest uncertainty visualization (per 1.3 above) is the safety net.

**The combined play.** FTLE/LCS rendering + per-cell uncertainty overlay + WebGPU volumetric rendering + Flight2Vec for "find me a flight that successfully exploited this ridge before" = a coherent, defensible, beautiful product spine that nobody else has.

---

## Appendix — High-Value Reference Trail

**Soaring RL / autonomous flight**
- Reddy, Celani, Sejnowski, Vergassola, *Learning to soar in turbulent environments*, PNAS 2016 (papers.cnl.salk.edu/PDFs/Learning to soar in turbulent environments 2016-4488.pdf)
- Microsoft Project Frigatebird / POMDSoar (microsoft.com/en-us/research/blog/autonomous-soaring-ai-on-the-fly/)
- Notter et al., *Hierarchical Reinforcement Learning Approach for Autonomous Cross-Country Soaring* (researchgate 364445041)

**LCS / FTLE**
- Wikipedia: *Lagrangian coherent structure*
- Haller, G., *Lagrangian Coherent Structures*, Annu. Rev. Fluid Mech. 2015 (georgehaller.com)
- `lagrangian` Python package (lagrangian.readthedocs.io)
- Albatross-LCS hypothesis (foraging along LCS): cited in LCS Wikipedia article

**Trajectory embeddings / similarity**
- NBA Similar Possessions Finder (sloansportsconference.com/research-papers/using-deep-learning-to-understand-patterns-of-player-movement-in-the-nba)
- Traj2Vec (Yao et al. 2017, IJCAI 234)
- t2vec (Li et al. 2018, ICDE)
- Modern contrastive trajectory embeddings: arXiv:2207.14539, 2501.09327

**TDA / persistent homology**
- Libraries: `gudhi`, `ripser`, `giotto-tda`
- Carrière, Chazal et al. — TDA for trajectory simplification & summarization

**Skill rating**
- Herbrich, Minka, Graepel — *TrueSkill™: A Bayesian Skill Rating System* (Microsoft Research)
- Minka et al. 2018 — *TrueSkill2*
- Dangauthier et al. 2008 — *TrueSkill Through Time*
- OpenSkill (Python) — open-source TrueSkill alternative

**AIS / maritime trajectory analytics**
- Willems / Scheepens et al. — KDE visualizations of ship traffic
- TREAD (Pallotta et al.) — anomaly detection from AIS

**Animal movement / Movebank**
- movebank.org
- `move`, `momentuHMM`, `crawl` R packages
- Flack, Nagy et al. — stork thermal-soaring migration analyses

**Foundation models for time series**
- TimesFM (Google), Chronos (AWS), Moirai (Salesforce), Lag-Llama

**Diffusion for trajectories**
- Janner et al., *Planning with Diffusion* (Diffuser), ICML 2022
- Jiang et al., *MotionDiffuser*, CVPR 2023

**Gaussian splatting**
- Kerbl et al. 2023 — *3D Gaussian Splatting for Real-Time Radiance Field Rendering*, SIGGRAPH
- Libraries: `gsplat`, `splatviz`, `nerfstudio`

**Existing free-flight aggregation**
- thermal.kk7.ch (Skyways + Thermals + Hotspots + TimeFilter — the current state of the art in aggregate flight visualization; a useful baseline to compare any new viz against)
- XContest (competition database; minimal analytics surface)
- XCglobe, FlightLog, Burnair, Meteoparapente (mostly forecasting, not analytics)

---

*Compiled 2026-05-17 for NextFlight strategy. Subagent research depth pass. Many threads have additional papers worth pulling on; the ones flagged **[open lane]** are where the product can plant a flag with no competition.*
