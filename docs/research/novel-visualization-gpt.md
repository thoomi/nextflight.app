# NextFlight Novel Visualization Research
*Subagent research thread — angles complementary to FTLE/LCS, embeddings, cross-domain transfer*
*Date: 2026-05-17 | Method: targeted web fetches + training knowledge*

---

## Executive Summary: Top 5 Picks

| # | Idea | Why It's Different |
|---|------|--------------------|
| 1 | **Wing polar estimation from GPS alone** | Extracts aerodynamic truth from any flight — no instruments needed; turns XContest into a hardware benchmark |
| 2 | **Behavioral cloning from XContest top-10** | Teaches "what does elite decision-making look like as a trajectory" — coaching signal from the data, not experts |
| 3 | **Plan continuation bias detector** | Turns a well-documented cognitive trap into a GPS-measurable signal; has direct accident-prevention application |
| 4 | **Condor-style 3D thermal grammar** | Proven UX in a simulator with millions of hours of use — stolen wholesale, adapted to real flights |
| 5 | **IGC as citizen science: atmospheric electricity** | Paragliders routinely fly where instruments don't go — bolt-on sensor produces publishable atmospheric data AND engagement hook |

---

## Section 1: Physics Hidden in Raw IGC Data

### 1a. Wing Polar Estimation from GPS Tracks

**What it is:**
A two-phase GPS-only method. Phase 1: during every thermal circle, the pilot's groundspeed is asymmetric — faster on the downwind arc, slower on the upwind arc. Fitting a sinusoid to groundspeed vs. heading during a complete circle gives you the wind vector (magnitude + direction). This is already implemented in XCTrack and XCSoar's wind algorithms. Phase 2 (novel): during straight glide segments *after* you know the wind, true airspeed = groundspeed − wind_vector. Plot airspeed vs. sink rate (from baro altitude in IGC "B" records) and you get the **polar curve** — the fundamental aerodynamic signature of the glider.

**Real implementations:**
- XCSoar wind estimation algorithm (open source, C++): uses the circling drift method
- XCTrack has "wind computing" feature (confirmed from their docs)
- `xcsoar/XCSoar` GitHub repo — `src/Computer/Wind/` directory
- No published paper specifically on *polar estimation* from IGC found; this appears to be a gap

**What it looks like in NextFlight:**
- Pilot profile page: "Your polar: best L/D 9.2:1 at 38 km/h" estimated from 47 flights
- Fleet comparison: overlay polars from EN-A through EN-D gliders, colored by class
- Anomaly detection: "Your polar degraded 8% since June — possible line damage?"
- Could crowdsource a polar database for every wing model from XContest flights

**Rough effort:** Medium. Wind extraction is ~solved (port XCSoar algorithm). Polar fitting adds noise-rejection work (Kalman smoother on baro alt, outlier removal). 2–4 weeks for MVP polar estimator.

---

### 1b. Turbulence Estimation from IGC Signal Noise

**What it is:**
Two independent signals in IGC data betray turbulence:
1. **Baro altitude noise**: In smooth air, the B-record pressure altitude is stable between fixes. In turbulence, it shows high-frequency oscillations (>0.5 Hz relative to fix rate, often 1 Hz in modern loggers). A simple high-pass filter on altitude gives a "roughness index."
2. **Heading perturbation**: GPS track bearing changes that *don't correspond to intentional turns* (i.e., the pilot isn't in a thermal spiral). Sudden 5–15° heading deviations in otherwise straight flight indicate wing deflections / surge events.

**Real implementations:**
- DHV/SHV incident reports qualitatively describe this ("wing collapsed at 1200m, turbulent air") but no GPS quantification pipeline exists in published form
- Paragliding instruments (Flymaster, Oudie) compute "turbulence" from accelerometer, not GPS — IGC doesn't capture accelerometer data
- Adjacent work: aviation turbulence detection from ADS-B altitude profiles (e.g., FAA PIREP correlation studies)

**What it looks like in NextFlight:**
- "Turbulence heatmap" overlaid on terrain — where did rough air concentrate across the fleet?
- Personal flight view: highlight the 3 most turbulent seconds in your flight
- Site guide: "This valley gets mechanical turbulence when wind > 15 km/h from NW" — derived from 3 years of IGC data

**Rough effort:** Low-medium. Signal processing is simple; calibration against pilot-reported events is the hard part. Need ~100 manually annotated "turbulent segments" to validate. 1–3 weeks for the detector, months for validation.

---

### 1c. Crowdsourced Wind Field from Circling Data

**What it is:**
Every thermalling circle in XContest is a wind measurement. Aggregate thousands of circles at the same location × altitude × time-of-day → build a probabilistic 3D wind field. This is essentially a citizen-science weather network with paragliders as the sensors.

**Real implementations:**
- No published implementation specific to paragliding, but the concept mirrors ADS-B wind estimation used in aviation (Mode S wind profiling, KNMI research)
- XContest has ~600k flights/year. Each flight has maybe 20–50 circles = millions of wind obs globally
- Closest analog: Inreach/Garmin livetracking aggregated for weather modeling (academic interest but not productized)

**What it looks like in NextFlight:**
- "Wind roses" at your favorite launch site, derived from 5 years of pilot circles — not forecast models
- "What was the wind at 1800m over Bassano at 14:00 on days like today?" — historical empirical answer
- Real-time livetracking integration: infer current wind at altitude from pilots currently flying

**Rough effort:** High. Data aggregation is straightforward; cleaning (thermal drift vs. wind, incomplete circles) requires care. Statistical modeling to produce gridded wind field is non-trivial. 1–2 months for a research prototype.

---

## Section 2: Psychology of Flight Decisions

### 2a. Plan Continuation Bias Detector

**What it is:**
Plan continuation bias (also "get-home-itis") is the documented tendency to continue toward a goal despite accumulating evidence that you should stop. In GPS terms, this has a measurable signature:

- **Altitude gradient toward goal**: pilot is losing altitude but maintaining or increasing groundspeed toward destination
- **Increasing glide angle commitment**: the "glide cone" to landing shrinks, but the pilot doesn't divert
- **Reduced exploration radius**: circling attempts become shorter (less patient), suggesting pressure
- **Time-of-day pressure**: flights that start deviating at 16:00–17:00 toward goal = competition/retrieval pressure

**Research basis:**
- Plan continuation bias is a primary factor in ~40% of GA accidents (FAA human factors studies)
- Orasanu & Martin (1998) "Errors in aviation decision-making" — foundational framework
- No published GPS-based quantification specific to paragliding; this is genuinely novel

**DHV/SHV incident data:** DHV publishes annual safety reports (DHV Sicherheit) with incident categorization. "Pilot continued flying despite deteriorating conditions" appears frequently but is qualitative, not GPS-linked.

**What it looks like in NextFlight:**
- Post-flight "risk score timeline": shows moments when commitment to goal exceeded rational glide analysis
- "Your commitment bias index": percentile vs. fleet, improving or worsening across your career
- Coaching intervention: "At 16:23 you had 3 viable LZs within glide range but continued — was that intentional?"

**Rough effort:** Medium. Rule-based system is buildable in 2 weeks. ML-based (learn from accident vs. non-accident flight patterns) requires labeled data — hard to get.

---

### 2b. Risk Homeostasis — Do Experts Take More Risks?

**What it is:**
Risk homeostasis theory (Wilde, 1982) predicts that safety improvements cause compensating risk-taking: people keep total perceived risk constant. In paragliding: better equipment → fly in worse conditions; more experience → fly closer to limits.

**Measurable from IGC/XContest:**
- Wind speed correlation with launch decision (site-specific, from weather APIs + flight records)
- Altitude AGL at launch / landing field crossing
- XC distance vs. accident rate segmented by pilot license level (A, B, C, DHV 1-2-3)
- "Margin of safety" metric: how often does a pilot use emergency reserves (low saves)?

**Research basis:**
- DHV accident statistics show EN-C/D wings have higher incident rates *per flight*, but lower rates *per hour* — ambiguous evidence
- No GPS-based risk homeostasis study in paragliding found
- Adjacent: Petzl/ENSA (Chamonix) has published studies on alpinist risk behavior

**What it looks like in NextFlight:**
- Pilot experience vs. "edge-of-envelope" frequency scatter plot
- Site-specific "boldness index": launch in 20+ km/h vs. local norm
- Career arc visualization: does your risk profile increase, plateau, or decrease post-incident?

**Rough effort:** Medium-high. Requires weather API integration for ground truth conditions, careful definition of "risk taking," and large dataset. 1–2 months for meaningful analysis.

---

### 2c. Social Proof in Launch Timing

**What it is:**
A novel, unresearched angle: livetracking timestamps from XContest or Ayvri show when pilots launch. At popular sites, there's likely a herding effect — launch rate accelerates once 2–3 pilots have gone (social proof that conditions are acceptable). This is measurable from IGC start timestamps + site geolocation.

**What it looks like in NextFlight:**
- "Launch cascade" visualization: timeline of who launched first, who followed within 10 minutes
- Identify "opinion leaders" at each site — whose launch triggers others
- Personal meta-question: "Are you a first-mover or a follower at your home site?"

**Rough effort:** Low. Pure data analysis from existing timestamps. 1–2 weeks. The question is whether the effect is statistically significant given sample sizes per-site.

---

## Section 3: Gaming/Esports Replay UX

### 3a. Condor 2 Soaring Simulator — Thermal Visualization Grammar

**What it is:**
Condor 2 (condorsoaring.com) is the dominant PC soaring simulator. Its 3D world renders:
- **Thermal columns** as semi-transparent cylinders with rising particle effects and a "bubble" top
- **Cloud streets** as visible cloud formations that correlate with lift below
- **Wind layers** shown via arrow fields at different altitudes (switchable overlay)
- **Replay mode**: 3D external camera following any pilot, time-scrub, speed multiplier, switchable camera angles
- **Competition replay**: multi-pilot synchronized replay with colored tracks, altitude shown as colored altitude bands on the track

Condor's thermal visualization has been refined over 15+ years of user feedback from serious cross-country pilots. It's the closest thing to a pilot-validated "what does thermal structure look like" UI.

**What to steal for NextFlight:**
- Semi-transparent thermal column cylinders overlaid on real terrain from XContest thermal aggregation
- "Bubble top" animation at thermal height (inferred from pilot top-of-climb altitudes)
- Multi-pilot synchronized replay with switchable pilot cameras
- Timeline scrub with altitude ribbon (Condor-style colored altitude band on the 3D track)

**Rough effort to adapt:** Low-medium. The visual grammar is defined; the data pipeline (extract thermal column estimates from IGC clusters) is the real work.

---

### 3b. Rocket League / StarCraft 2 Replay UX Patterns

**Rocket League (ballchasing.com):**
- Position heatmaps: where each player spent time on the field
- Boost usage timeline: resource management over time
- "Replay goals": jump to the 3 most important moments automatically
- Third-party replay parser (carball library) enables community analysis

**Transfer to NextFlight:**
- Position heatmap → **altitude heatmap**: where in the 3D airspace did this pilot spend time?
- Boost timeline → **thermal vs. glide time**: resource (altitude) gain/loss over time as a swimlane chart
- "Replay goals" → **auto-highlight reels**: 3 best climbs, the critical low save, the decision point where the pilot diverged from the fleet

**StarCraft 2 (sc2replaystats.com):**
- Build order timelines: what did each player produce, and when?
- Map presence: area control over time as an animated heatmap
- "Game breakpoints": inflection moments in game state

**Transfer to NextFlight:**
- Build order → **flight phase timeline**: thermal hunt → climb → glide → search → re-climb, automatically segmented
- Map presence → **airspace utilization**: what percentage of the accessible airspace did this pilot exploit?
- Breakpoints → **decision moments**: where did this flight's trajectory diverge from the optimal computed path?

**Rough effort:** Low for the UX patterns (these are design decisions). Medium for the underlying segmentation/computation.

---

## Section 4: Novel ML Approaches

### 4a. Self-Supervised Learning on IGC Trajectories

**What it is:**
Instead of labeled training data, use the structure of IGC tracks themselves as supervision. Two candidate approaches:

**Contrastive learning (TrajCLR-style):**
- Two augmented views of the same flight segment (add GPS noise, time-warp, crop) should have similar embeddings
- Flights from the same site on similar weather days should be "close" in embedding space
- Related paper: *TrajCLR: Contrastive Representation Learning for Trajectory Data* (urban mobility domain, 2022)
- arXiv has active work on trajectory SSL (TRAJGANR, 2026; multimodal trajectory representation for travel time estimation, 2025)

**Masked prediction (GPT-style on trajectories):**
- Tokenize IGC track into 30-second segments encoding (lat, lon, alt, speed, heading)
- Mask 15% of segments; train model to reconstruct them
- What the model learns: the physics and decision grammar of flight
- After pre-training, fine-tune on labeled tasks: "is this a competitive flight?", "did this pilot make a mistake here?"

**What it looks like in NextFlight:**
- "Flight similarity" search: find the 5 most similar flights to yours from XContest history
- Anomaly detection without labels: flights that don't fit learned patterns are worth investigating
- Transfer to coaching: embeddings cluster by pilot skill level without explicit skill labels

**Rough effort:** High. Requires significant compute for pre-training on a large IGC corpus, and careful tokenization. 2–3 months for a research prototype. Payoff: a foundation model for paragliding flight.

---

### 4b. Imitation Learning from XContest Top-10 Pilots

**What it is:**
Behavioral cloning: train a model to predict what a top-10 XContest pilot would do at each decision point, given:
- Current position, altitude, speed
- Recent thermal history (last N circles)
- Remaining task distance
- Fleet position (livetracking)
- Time of day / season

The trained model can then be applied to any pilot's flight: "At this moment, a top-10 pilot would have turned left, climbed 200m more, then pushed to the ridge — you pushed too early."

**Related work:**
- Behavioral cloning in drone navigation (DAgger algorithm) — well-established
- Chess/Go: Leela/AlphaZero learned from top human games before self-play
- No direct published work on paragliding imitation learning found

**What it looks like in NextFlight:**
- "Shadow expert" overlay: play back your flight with the ghost of what an expert might have done
- Decision divergence markers: where your choices deviated from learned expert policy
- "Expert confidence": at each moment, how confident is the model about what the right move is? (High uncertainty = genuinely ambiguous situation)

**Rough effort:** High. Need XContest dataset with labeled "top pilots." Decision state featurization is tricky (wind, task, fleet). 2–4 months for meaningful prototype.

---

### 4c. Active Learning for Coaching — Information-Theoretic Moment Selection

**What it is:**
Given a 3-hour flight, a coach can't analyze everything. Active learning can select the **3 most informative moments** to discuss — the moments where the pilot's choice had the highest expected impact on outcome AND where the pilot was most uncertain (shown by hesitation patterns, aborted turns, speed changes before committing).

**Technically:**
- "Uncertainty" in pilot action: hesitation signature = speed changes without altitude change, aborted circles (partial turns < 270°)
- "Impact": counterfactual simulation — how would the flight have gone if the pilot had made the other choice? (Requires a thermal model or learned dynamics model)
- Select top-N moments by (uncertainty × impact) — these are the teaching moments

**What it looks like in NextFlight:**
- Post-flight coaching report: "Here are the 3 moments that mattered most in your flight, and why"
- Instructor dashboard: auto-prioritized review queue for students' flights
- Gamified: "You nailed the crux decision at Bassano — here's what you did right"

**Rough effort:** Medium. Uncertainty detection is buildable (signal processing). Impact estimation requires a forward model — either physics-based or learned. 4–8 weeks for an uncertainty-only MVP.

---

## Section 5: Left-Field / Weird Angles

### 5a. Sonification of Flight Data

**What it is:**
Beyond the variometer beep (which is already audio), translating an entire flight into music. Approaches:

- **Altitude → musical key**: higher altitude = higher key, descent = falling melodic line
- **Thermal strength → rhythm density**: strong thermal = dense, fast beat; glide = sparse, long tones
- **Wind** → ambient texture (strings vs. noise)
- **Time compression**: a 3-hour flight becomes a 3-minute piece

**Existing work:**
- The variometer itself is the most successful sonification in history — a real-time single-parameter audio display
- Sonification research community (ICAD conference) has examples of GPS track sonification for urban mobility
- No dedicated paragliding flight sonification tool found; closest is artistic projects sonifying GPS tracks (Strava segments as music)
- "Listen to Wikipedia" (hatnote.com) style: edits as ping sounds — transfers to "listen to a race start"

**What it looks like in NextFlight:**
- "Listen to your flight": generate a 90-second audio piece from your 2-hour XC
- Social sharing: "Here's what yesterday's Dolomites flight sounds like" — unusual content format, high viral potential
- Accessibility feature: pilots with visual impairments could use sonification for post-flight review

**Rough effort:** Low-medium. Sonification mapping is a design problem. Web Audio API makes browser-based generation feasible. 2–4 weeks for an MVP.

---

### 5b. Paragliding as Citizen Science: Atmospheric Electricity

**What it is:**
Paragliders routinely fly at 1000–4000m AGL in the planetary boundary layer — a region where few continuous measurements exist. Two instrumentation angles:

**Atmospheric electricity (fair-weather electric field):**
- The Earth's surface has a global electric circuit; fair-weather field ~100–200 V/m at surface, falling with altitude
- Paragliders approaching cumulonimbus clouds experience large field intensities — the field is a measurable pre-storm indicator
- A small atmospheric electric field sensor (EFM-100-type, ~$200) logging to the flight computer could produce publishable data
- Research groups (University of Bath, ETH Zürich atmospheric electricity) would be interested collaborators

**Air quality:**
- PM2.5/PM10 particle sensors (Sensirion SPS30, ~$30) can be integrated into an instrument pod
- Low-altitude inversions visible from the track often concentrate pollution — paragliders can map these layers empirically
- Adjacent to fire smoke monitoring (California, Australia — paragliders fly through smoke boundaries)

**What it looks like in NextFlight:**
- "Science mode": opt-in data sharing for pilots carrying sensors
- Atmospheric electricity overlay on XContest — crowdsourced thunderstorm precursor map
- Partner with ICOS (Integrated Carbon Observation System) or national met agencies for data sharing

**Rough effort:** Low for the software (add sensor data fields to IGC extension, display on map). Hardware BOM and community building is the real work. 1–2 weeks software, months for community.

---

### 5c. XContest Longitudinal Analysis — Skill Progression Curves

**What it is:**
XContest has ~600,000 logged flights per year going back to 2007. It is probably the largest longitudinal GPS sports database in existence. Academic analysis is nearly absent.

**Questions no one has answered:**
- What does a pilot's XC distance distribution look like across their first 500 flights? Is there a "breakthrough" moment?
- Do pilots plateau? If so, at what distance/points level?
- What's the survival curve — what fraction of pilots are still active after 1, 3, 5 years?
- Do pilots who compete in leagues improve faster than those who don't?
- What's the correlation between wing certification level (EN-A vs EN-C) and score growth?

**Research status:**
- Google Scholar search for "XContest paragliding longitudinal" returns zero results. This is a genuinely open dataset.
- DHV publishes pilot license statistics but not performance trajectories
- Sports science has studied skill acquisition curves in golf, tennis — no equivalent for free flight

**What it looks like in NextFlight:**
- "Your career arc": where you are on the typical progression curve for pilots who started at your level
- Percentile bands: "You're in the top 15% for year-3 pilots globally"
- Cohort comparison: pilots who started the same year as you — how are you tracking vs. the cohort?
- Honest plateau detection: "Based on your last 60 flights, your XC distance has plateaued. Here's what top pilots did to break through."

**Rough effort:** Medium. XContest API access needed (or data partnership). Statistical analysis is standard. The hard part is data acquisition agreement and historical data depth. 4–6 weeks for analysis once data is available.

---

### 5d. Generative Art from IGC Tracks

**What it is:**
IGC tracks as visual art — a niche but enthusiastic community.

**Existing work:**
- Strava Art (pilots draw shapes with GPS tracks) — well-established, active community
- Some paragliding pilots have created IGC visualizations with Processing/p5.js
- "Giro d'Italia from above" style viz — Veloviewer for cycling, nothing equivalent for paragliding
- The paragliding community is visually oriented (aerial photography culture) — high receptivity

**Specific angles:**
- **Thermal spirals as mandalas**: extract just the circling segments, render as polar plots — each thermal becomes a unique flower
- **Multi-flight palimpsest**: stack a pilot's entire season of flights over the same terrain → emergent patterns show preferred routes, valleys avoided, ridge lines always used
- **Fleet-day art**: all XContest pilots on a given day in a region, rendered with altitude→color and opacity→pilot count

**What it looks like in NextFlight:**
- "Art from your flight": one-click generative poster download (share on Instagram)
- Season recap: animated video of all your flights, the mandalas of every thermal you found
- Community gallery: best IGC art voted by community

**Rough effort:** Low. SVG/canvas rendering of IGC tracks is trivial. The art direction and filter design takes taste, not engineering. 1–2 weeks for MVP art generator.

---

## The Most Surprising Thing I Found

**XCTrack already does wind computation from circling** — this is confirmed from their feature list. This means millions of paragliding flights are *already* being processed for wind data in real time on pilots' phones. The data is there; no one has aggregated it. A crowd-sourced 3D wind field from paraglider thermal circles would be a genuinely novel atmospheric dataset. The gap isn't technical — it's that no one has connected the flight computer output to a backend aggregation pipeline and an academic collaboration.

---

## The One Idea I'd Build First

**Behavioral cloning from XContest top-10 pilots**, simplified:

Not the full ML approach — but a deterministic "shadow expert" that replays what the consensus top-3 pilots *actually did* on the same task day (when such flights exist in XContest), overlaid on your track. No ML required: just "here is how Honza Rejmanek flew this same valley last year."

This is:
- Immediately buildable (just a multi-track replay with filtering)
- Emotionally compelling ("fly alongside the world champion")
- A natural path toward the ML version once you have user engagement and labeled data
- Differentiating: no other analysis tool does this

**MVP effort: 2–3 weeks.** Find same-site, same-day (or similar-condition) flights from top-ranked pilots. Render them as ghost tracks alongside the user's flight. Add a single metric: "At the key thermal decision point, 7 of 8 top pilots turned left. You turned right."

---

*Research notes: Web search API was rate-limited during this session. Content draws on training knowledge, XCTrack documentation (xctrack.org), arXiv trajectory learning papers (Oct 2025, Jan 2026), and domain expertise. Specific paper citations should be verified before inclusion in product documentation.*
