# AI Flight Debrief — Full Concept Pack

*Audience focus: beginners, with value for intermediates. Modality: data + pilot mindset coaching.*

---

## 1) Product Vision & Principles

**Vision:** Turn every paragliding flight into a bite-sized coaching session that builds skills and confidence.

**Core principles**
- **Immediate value:** Fast, plain‑language debrief within seconds of track upload.
- **Actionable coaching:** Always produce 1–3 concrete actions for the *next* flight.
- **Beginner‑first UX:** Simple defaults, progressive disclosure for deeper analytics.
- **Mindset-aware:** Blend technical analysis with psychological insights and safety habits.
- **Privacy & control:** Pilot owns their data; easy to opt out of comparisons or sharing.

**Primary jobs-to-be-done**
1. *“Tell me what mattered in this flight and how to improve.”*
2. *“Show me where I made (or avoided) mistakes, simply.”*
3. *“Help me build confidence with safe, incremental goals.”*

---

## 2) Personas

**P1: New Solo Pilot (Beginner)**
- Needs reassurance, clear next steps, and visual anchors.
- Pain: tracks are confusing; doesn’t know what to look for.

**P2: Weekend XC Aspirant (Intermediate)**
- Wants quick wins plus optional deep dives.
- Pain: inconsistent thermalling, decision-making late day.

**P3: Instructor / Mentor** (secondary)
- Wants structured feedback for students; easy to review common errors.

---

## 3) End-to-End UX / Screen Flow

**A. Onboarding**
1. Welcome screen → value proposition (“Instant debrief. Learn faster. Fly safer.”)
2. Permissions & privacy choices (local-only vs cloud sync; sharing opt-in later)
3. “Upload your first track” (IGC/GPX)

**B. Upload & Auto-Debrief**
1. Upload screen (drag & drop or ‘choose file’)
2. Processing screen (3–6s guidance with microcopy: “Finding thermals… Smoothing variometer… Checking airspace proximity…”)
3. **Quick Debrief screen (MVP)**
   - **Top strip:** Launch site (if detected), date/time, duration, max altitude, wind (if enriched), flight phase badges (launch → first climb → glide → …)
   - **Map widget:** Simple map + color-coded track (lift vs sink). Tap points to see local stats.
   - **Altitude chart:** Key events pinned (first climb, best climb, deepest sink, lowest save).
   - **Three tiles:**
     - **What went well**
     - **What to improve** (1 actionable advice)
     - **Safety/Mindset note** (gentle tone)
   - **CTA:** “Go deeper” (Thermals / Lines / Launch / Landings)

**C. Deep Dive views (progressive disclosure)**
- **Thermals view**
  - List of detected thermals with grade (A–D), avg climb, top-out delta, circle consistency, direction changes.
  - Callouts: *“Left while climbing +2.0 m/s”*, *“Center offset improving after 3 circles”*.
- **Lines (Glides) view**
  - Glide segments with average sink/lift, line choices vs wind, track overlays.
  - Heuristics: *“80m left would have kept you in buoyant air for 5 km”*.
- **Decision Points**
  - Annotated moments: leaving thermal early, pushing into wind low, following others.
  - Each has **technical** + **mindset** note and **micro-drill** for next time.
- **Safety**
  - Low-altitude tight turns, high bank at low speed risk zones, near-airspace alerts.

**D. Coaching Interaction Loop**
- Bot poses **one concise reflection** (multiple-choice + free text):
  - “Why exit Thermal #3 early? A) Turbulence B) Crowding C) Lost core D) Other”
- User responds (text or voice).
- Bot updates **Final Takeaway** card:
  - **One-sentence summary**
  - **Next-flight plan** (e.g., “Commit to 3 full circles before leaving a +1.5 m/s climb.”)
- Optional: Save a **mindset tag** (e.g., “turbulence discomfort”) for trend tracking.

**E. History & Progress**
- Timeline of flights with **streaks** and **milestones** (first +3 m/s sustained, first 1h thermal session, etc.).
- Trend cards: “Thermal exit timing improving”, “Fewer direction changes per thermal”.

---

## 4) Conversational Scripts (Examples)

**Initial Debrief (short)**
> **Takeaway:** You found lift quickly but exited your strongest thermal early.
> **Do next time:** When climb > +1.5 m/s, stay for 2 extra circles before deciding to leave.

**Follow-up question**
> What influenced your exit from Thermal #2?
> A) Turbulence B) Other pilots C) Didn’t trust it D) Something else

**Mindset synthesis**
> Noted the turbulence discomfort. Try widening your turn and slightly reducing bank before leaving the thermal. This preserves climb and comfort.

**Deep-dive prompt**
> Want a deeper look at your glides or thermals? I can show where a minor line shift would have found buoyant air.

---

## 5) Architecture & Tech Sketch

**High-level components**
1. **Frontend (Web initially)**
   - React/Next.js (or SvelteKit) with map (MapLibre/Leaflet) + charts (e.g., Recharts/D3)
   - File upload, session storage, offline-friendly (PWA later)
2. **Backend API**
   - FastAPI/Node for ingestion, validation, and orchestration
   - Async workers (Celery/Cloud Tasks) for analysis pipeline
3. **Analysis Engine**
   - Python pipeline on IGC/GPX + (optional) weather enrichment
   - Feature extraction (segments, thermals, lines)
   - Heuristic + ML scoring (thermalling efficiency, decision quality)
   - Prompted LLM layer for narrative debrief & mindset mapping
4. **Data Stores**
   - Object storage for raw tracks (S3/GCS)
   - Relational DB (Postgres) for flights, segments, annotations, coaching items
   - Optional vector store for similar-flight retrieval (future coaching)
5. **Integrations** (later)
   - Day-of public tracks via XCTrack / DHV-XC / XContest scraping/API (if permitted)
   - Weather sources (Meteoblue, ICON/DWD, NOAA, etc., licensed where needed)

**Data flow (MVP)**
1. Upload IGC → parse → resample & denoise vario → detect segments
2. Detect thermals (circle detection + climb threshold + temporal grouping)
3. Compute metrics (avg climb, top-out delta, center offset proxy, direction swaps)
4. Detect glides → compute avg sink/lift; derive “better line” suggestions using local lift field estimation from own track (Kriging or IDW over vario samples)
5. Safety heuristics (bank angle proxy from turn rate + ground speed; low-altitude turns; near-airspace proximity if data available)
6. Generate **Quick Debrief** (rules + LLM templating)
7. Solicit mindset input → merge into **Final Takeaway**

**Scalability & cost**
- Batch workers scale with uploads; LLM calls minimized by caching feature-level summaries.
- Privacy-first: process locally in browser for basic metrics (future), server-only for heavier analytics.

---

## 6) Data Model (sketch)

**Pilot**(pilot_id, prefs, privacy_flags)

**Flight**(flight_id, pilot_id, datetime, launch_guess, duration, max_alt, wind_estimate, summary)

**Segment**(segment_id, flight_id, type[thermal|glide|other], start_t, end_t, stats_json)

**Annotation**(annotation_id, flight_id, segment_id?, kind[good|issue|safety|mindset], text, severity)

**MindsetLog**(log_id, flight_id, tags[], note, response_raw)

**CoachingAction**(action_id, flight_id, priority, text, category[thermal|line|safety|mindset])

---

## 7) Core Algorithms (MVP)

**Thermal detection**
- Identify circling via heading change rate > threshold and lateral acceleration proxy.
- Positive vertical speed (smoothed vario) above min climb rate for ≥ N seconds.
- Merge adjacent circles if pause < M seconds.

**Circling efficiency**
- Direction change count; variance of turn rate; climb continuity.
- Centering proxy: compare inner vs outer circle climb over successive revolutions.

**Glide line quality**
- Segment glides between thermals; compute moving-average vario along track.
- Build a sparse “lift field” from track samples; suggest local alternative line by sampling lateral offsets (±50–150 m) and comparing integrated vario.

**Safety heuristics**
- Low-altitude high-bank zones: (alt AGL estimate if terrain model available; otherwise AMSL + DEM lookup later stage).
- Rapid sink events; gust fronts (variance spikes); proximity to airspace if integrated.

**Mindset mapping**
- Simple taxonomy (turbulence discomfort, social influence, uncertainty).
- LLM prompt combines detected issues with user’s short answer to produce a gentle, specific coaching step.

---

## 8) Privacy, Safety & Ethics
- **Default private.** Flights are visible only to the pilot unless explicitly shared.
- **Opt-in comparisons.** Regional or day-of comparisons disabled by default.
- **Explainability.** Every strong suggestion is paired with the metric that triggered it.
- **No risky encouragement.** Coaching emphasizes conservative, skills-building actions.
- **Data retention controls.** Easy delete of flights and all derived analytics.

---

## 9) Metrics & Success Criteria
- **Activation:** % of users who upload at least 1 track in first session.
- **Time-to-debrief:** median seconds from upload → quick debrief.
- **Coaching adoption:** % who view deep-dive; % who accept one suggested drill.
- **Retention:** 30/90-day return to upload new flights.
- **Learning signals:** reduction in early-thermal exits; fewer direction switches.
- **NPS / satisfaction:** “Did this debrief help you learn?”

---

## 10) MVP Feature Backlog (Tickets / User Stories)

**EPIC A: Upload & Parsing**
- A1: As a pilot, I can upload an IGC/GPX file and see basic metadata.
- A2: Validate file integrity; show friendly errors.
- A3: Parse GPS, vario; resample and smooth signals.

**EPIC B: Visualization**
- B1: Map with color-coded lift/sink along track.
- B2: Altitude vs time chart with pinned events.
- B3: Thermal and glide segment overlays with tooltips.

**EPIC C: Quick Debrief**
- C1: Detect first climb, best climb, worst sink.
- C2: Generate 3-card summary (good, improve, safety/mindset).
- C3: Provide 1 actionable “next-flight plan.”

**EPIC D: Deep Dives**
- D1: Thermals list with grades and metrics.
- D2: Glide analysis with alternative-line hints (±100 m sampling).
- D3: Decision points with technical + mindset notes.

**EPIC E: Coaching Loop**
- E1: Prompt user with a single reflection question (MCQ + free text/voice).
- E2: Update final takeaway and store mindset tag.
- E3: History screen with progress badges and trends.

**EPIC F: Infra & Privacy**
- F1: Flight storage + metadata DB tables.
- F2: Delete flight + all derived analytics.
- F3: Opt-in toggle for regional comparisons.

**EPIC G: QA & Beta**
- G1: Sample flights test suite (short ridge, thermic day, windy, sled-ride).
- G2: Accuracy validation against known results.
- G3: On-device anonymization of shared tracks (if any).

---

## 11) Release Plan & Roadmap

**v0 (Internal prototype, Weeks 1–3)**
- Upload → Quick Debrief with simple map & altitude chart.
- Thermal detection + early-exit heuristic.
- Single mindset question → updated takeaway.

**v1 (Closed beta, Weeks 4–8)**
- Deep-dive views (Thermals, Glides, Decisions).
- Coaching micro-drills & history with trends.
- Polished UI & privacy controls.

**v1.5 (Public beta, Weeks 9–12)**
- Optional day-of comparisons (if permitted data available).
- Performance optimizations, caching, error budgets.

**v2**
- Voice-note coaching, richer safety analysis (DEM/AGL), video replay with narration.

---

## 12) Lightweight Pitch (Deck Outline)

**Slide 1 — Title**
AI Flight Debrief: Learn faster. Fly safer.

**Slide 2 — Problem**
Pilots stare at squiggly tracks and learn slowly. Stats ≠ coaching.

**Slide 3 — Solution**
Upload a track → instant, actionable debrief + mindset coaching.

**Slide 4 — Why Now**
Ubiquitous GPS/IGC, growing pilot base, better LLMs for narrative feedback.

**Slide 5 — Product**
Quick debrief (1–3 actions), visual track, deep dives, coaching loop.

**Slide 6 — Secret Sauce**
Blend of robust flight heuristics + mindset taxonomy + simple UX.

**Slide 7 — MVP & Roadmap**
v0 quick debrief → v1 deep dives → v2 voice + replay + comparisons.

**Slide 8 — GTM**
Clubs & schools partnerships; beta with instructors; content marketing (“Flight Debrief of the Week”).

**Slide 9 — Business Model**
Freemium: basic debrief free; Pro (€6–9/mo) unlocks deep dives, trends, and voice coaching. Team plan for schools.

**Slide 10 — Team & Ask**
Looking for pilot-testers, school partners, and seed funding for weather/licensing.

---

## 13) Go-To-Market Ideas
- Partner with local clubs/schools to offer student debrief packages.
- Sponsor community challenges (“Upload your first 5 flights; earn badges”).
- Publish anonymized “Regional Flying Day Summaries” blog.
- Integrate with YouTube creators for narrated debriefs.

---

## 14) Risks & Mitigations
- **Data accuracy:** Start conservative; show confidence bands; allow user corrections.
- **Licensing/data terms:** Use only permitted public data; cache minimal summaries.
- **Over-coaching risks:** Safety-first tone; avoid encouraging low-margin decisions.
- **Complexity creep:** Guardrails via MVP scope; progressive disclosure UI.

---

## 15) Future Enhancements
- 3D replay with voice commentary; AR overlay for lift fields (research).
- Regional day-summary from public tracks and weather reanalysis.
- Personalized drills plan (weekly missions based on recent flights).
- Instructor dashboards; cohort analytics for schools.

---

### Appendix: Copy Snippets (Tone & Style)
- “Nice work finding your first climb quickly — that’s a big win on thermic days.”
- “You left lift early. Next time, try committing to 2–3 more circles when climb is strong.”
- “Turbulence discomfort is normal. Widen the turn, breathe, and reassess before exiting.”

---

**End of Concept Pack**
