# NextFlight Product Brief

## Product Vision

NextFlight turns every paragliding flight into a useful coaching session: immediate enough to help after landing, deep enough to explain what actually happened in the air, and personal enough to improve the next flight.

The product should start as a post-flight debrief tool, not an in-flight instrument. The first job is to translate an IGC file into understandable events, decisions, missed opportunities, and next-flight actions.

## Target Users

### Beginner / New Solo Pilot

Needs reassurance, simple visuals, and one or two concrete things to try next time. The product must avoid overwhelming them with meteorological machinery wearing a fake moustache.

### Intermediate / Weekend XC Pilot

Wants to understand inconsistent thermalling, glide choices, low-save decisions, wind strategy, and route selection. This user can handle deeper analysis if the first screen stays clear.

### Instructor / Mentor

Wants structured feedback for students, shared flight review, annotations, recurring-error detection, and progress tracking. This may be the strongest paid workflow to validate early.

## Core Product Loop

1. Pilot uploads an IGC or GPX file.
2. NextFlight parses and cleans the track.
3. The system extracts structured flight events: launch, climb, glide, thermal, ridge-soaring, low save, decision point, landing.
4. The pilot gets a quick debrief with:
   - What went well
   - What to improve
   - Safety or mindset note
   - One next-flight action
5. The pilot can ask follow-up questions in plain language.
6. The system stores key patterns for long-term progress and habit detection.

## Current Best Product Bet

Build a structured event layer plus conversational debrief first.

The chat itself is not the product moat. The moat is the structured interpretation of a flight: the system knows what a thermal, glide, low save, early exit, ridge band, inversion cap, or wind-drift pattern is before the LLM starts talking.

## Merged Feature Pillars

### 1. Structured Flight Debrief

Source: legacy concept docs plus strategy synthesis.

- Flight overview: duration, distance, max altitude, launch/landing, phases, data quality.
- Thermal analysis: climb rates, centering quality, direction changes, early exits, top-out behavior.
- Glide analysis: sink/lift lines, wind strategy, speedbar opportunities, alternative line hints.
- Decision points: leaving lift, pushing into wind, following others, low-save choices.
- Safety analysis: low-altitude turns, bank proxies, terrain clearance, airspace proximity.
- Mindset layer: turbulence discomfort, hesitation, social pressure, fatigue, confidence.

### 2. Chat With Your Flight

Source: master brief and strategy synthesis.

The user should be able to ask:

- Why did I sink out here?
- Did I leave that thermal too early?
- Was the glide line bad or was the air just bad?
- Where was the better line?
- What should I practice next flight?

The assistant should answer from structured events and metrics, not vibes wearing a lab coat.

### 3. Atmospheric Reconstruction

Source: atmospheric reconstruction research and counter-brief.

This is the strongest technical moat:

- Reconstruct wind, boundary layer, inversion, cloudbase, thermal-top envelope, and regional conditions from ERA5/COSMO-REA6/ICON-D2/AROME/radiosondes/local observations.
- Use the pilot's own circling drift and climb data as atmospheric observations.
- Explain whether a decision failed because of pilot technique, line choice, or the air mass.

This should shape the data model early, even if a full reconstruction pipeline ships later.

### 4. Visual Replay and Translation

Source: legacy UX docs, visualization translation research, novel visualization research.

The product should make difficult air concepts visible:

- 2D track colored by lift/sink.
- Altitude chart with pinned events.
- 3D replay with thermals, cloudbase, inversion layers, wind stacks, and ghost tracks.
- Pilot-friendly translations of Skew-T, hodograph, BLH evolution, McCready/speed-to-fly, glide cone, terrain clearance, and airspace timelines.

### 5. Multi-Flight Coaching

Source: legacy progression tracking plus master brief.

Across flights, NextFlight should detect:

- Early thermal exits.
- Improving or worsening centering.
- Low-save risk habits.
- Conservative vs aggressive glide behavior.
- Site-specific weaknesses.
- Thermal finding speed and climb progression.

This becomes the personal coaching layer: "your flight DNA."

### 6. Coach / Instructor Workflow

Source: legacy concept docs and counter-brief.

Potential early paid workflow:

- Share flight with coach.
- Coach comments at specific timepoints.
- Voice note annotations.
- Student progress dashboard.
- Recurring error patterns across a student or cohort.
- Rating-readiness checklist.

This is worth validating before assuming a purely consumer-first subscription path.

## MVP Scope

### Must Have

- IGC upload and validation.
- Flight metadata extraction.
- Phase/event segmentation.
- Thermal and glide detection.
- Quick debrief with three cards and one next-flight action.
- Basic map and altitude chart with event pins.
- Local/private-by-default data handling.

### Should Have

- Follow-up chat over detected events.
- Low-save and safety heuristics.
- Shareable debrief link.
- Manual pilot notes after flight.
- Coach review link with comments.

### Later

- Atmospheric reconstruction v0.5.
- 3D narrated replay.
- Same-day public ghost tracks.
- Conditional thermal maps.
- Wing polar estimation.
- Longitudinal habit detection.

## Build Sequence

1. **Event layer:** parse IGC, smooth data, detect thermals/glides/low events, store structured timeline.
2. **Quick debrief:** produce reliable summary cards and one action.
3. **Question answering:** chat over the event timeline and metrics.
4. **Share and coach review:** make debriefs useful beyond solo reflection.
5. **Visual replay:** enrich event timeline with 3D and explanatory atmospheric visuals.
6. **Weather reconstruction:** add model/observation fusion and atmospheric context.
7. **Habit detection:** compare flights over time and generate personalized progression.

## Architecture Principles

- Keep raw track data, derived samples, event timeline, annotations, and LLM narrative separate.
- Store evidence for each coaching claim: timestamp, event id, metric, threshold, or external data source.
- Make privacy choices explicit and reversible.
- Design comparison features as opt-in from the start.
- Avoid locking the product to one LLM behavior; the durable asset is the structured flight model.

## Open Product Questions

- Is the first paid wedge consumer subscription, coach-assisted sharing, or instructor dashboards?
- How much atmospheric context is necessary before the first public demo feels meaningfully different?
- Which pilot segment has the strongest pain: fresh solo pilots, XC aspirants, or instructors?
- Can same-day public-track comparison be implemented legally and reliably enough to depend on?
- How much analysis can run locally before weather enrichment requires server-side processing?

## Primary Source Docs

- [../strategy/master-brief.md](../strategy/master-brief.md)
- [../strategy/counter-brief-gpt.md](../strategy/counter-brief-gpt.md)
- [../strategy/strategy-synthesis.md](../strategy/strategy-synthesis.md)
- [../archive/legacy-full-concept-pack.md](../archive/legacy-full-concept-pack.md)
- [../archive/legacy-concept-and-questions.md](../archive/legacy-concept-and-questions.md)
- [../research/atmospheric-reconstruction.md](../research/atmospheric-reconstruction.md)
- [../research/visualization-translation.md](../research/visualization-translation.md)
- [../research/thermal-maps.md](../research/thermal-maps.md)
