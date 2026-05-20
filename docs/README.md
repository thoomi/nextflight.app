# NextFlight Product Docs

This folder is the working product knowledge base for NextFlight. It combines the older flight-debrief concept docs with the newer research and strategy corpus from the OpenClaw workspace.

## Start Here

- [product/product-brief.md](product/product-brief.md) — merged current product brief; read this first when deciding what to build.
- [strategy/master-brief.md](strategy/master-brief.md) — strongest current synthesis of the opportunity, ranked ideas, demo path, data moat, and build sequence.
- [strategy/counter-brief-gpt.md](strategy/counter-brief-gpt.md) — devil's advocate perspective; useful for avoiding product tunnel vision.

## Structure

### Product

Current operating docs for product decisions.

- [product/product-brief.md](product/product-brief.md)

### Strategy

Synthesis documents that choose direction, sequencing, and positioning.

- [strategy/master-brief.md](strategy/master-brief.md)
- [strategy/counter-brief-gpt.md](strategy/counter-brief-gpt.md)
- [strategy/strategy-synthesis.md](strategy/strategy-synthesis.md)

### Research

Deep dives that inform future product bets and technical architecture.

- [research/atmospheric-reconstruction.md](research/atmospheric-reconstruction.md)
- [research/thermal-maps.md](research/thermal-maps.md)
- [research/visualization-translation.md](research/visualization-translation.md)
- [research/visualization-translation-gpt.md](research/visualization-translation-gpt.md)
- [research/novel-visualization.md](research/novel-visualization.md)
- [research/novel-visualization-gpt.md](research/novel-visualization-gpt.md)
- [research/market-and-competition.md](research/market-and-competition.md)
- [research/deep-research-gpt5.md](research/deep-research-gpt5.md)

### Archive

Older concept docs and process notes. These are preserved because they contain useful product requirements, UX flows, and analysis questions, but they are no longer the primary operating brief.

- [archive/legacy-concept-and-questions.md](archive/legacy-concept-and-questions.md)
- [archive/legacy-full-concept-pack.md](archive/legacy-full-concept-pack.md)
- [archive/research-orchestrator-log.md](archive/research-orchestrator-log.md)

## Current Product Thesis

NextFlight should be a post-flight AI coach for paragliding: upload an IGC track, get a structured debrief, inspect the flight visually, ask follow-up questions, and build a long-term picture of pilot habits.

The old concept was strongest on beginner-friendly debrief UX, thermal/glide/safety analysis, mindset prompts, and instructor workflows. The newer research adds the more defensible moat: atmospheric reconstruction from IGC + weather data, multi-flight habit detection, same-day comparison tracks, conditional thermal intelligence, and 3D atmosphere-aware replay.

The practical build direction is:

1. Build the structured event layer for IGC flights.
2. Turn events into a clear quick debrief and follow-up chat.
3. Add shareable coach/instructor review workflows.
4. Add narrated 3D replay and atmosphere reconstruction once the event layer is solid.
5. Use accumulated flights for habit detection and personalized coaching.

## Decision Notes

- Chat is useful only if it sits on top of a reliable structured event model. Raw GPS-point chat is a novelty tax.
- Privacy remains a product value, but some of the best features require opt-in comparison or public-track enrichment.
- Instructor-first or coach-assisted GTM deserves serious testing; the old docs already identified instructors as an untapped market, and the counter-brief argues this may be the better entry point.
- Atmospheric reconstruction is the most technically distinctive research direction. It should influence architecture early even if it is not the first shipped feature.


## Follow-up research questions

- What about BurnAir? They have an analysis tool as well how does it compare to our idea?
- Field-Study i need to do: What are my and other pilots questions that pop to my mind right after the flight
- Google Deepmind has a Wehater API: https://deepmind.google/science/weathernext/ . Would that be beneficial or help in some way to distinguish us from others?
- Chat interface or additional visualizations first? Or both at the same time like let the llm explain the skw-t diagram next to your flight at that moment?
- Draw cloud satelite images for the given flight and render them in 3d?
- In BurnAir you can plan an XC flight, now find past flights that are similar to that planned flight or on that route / close by to verify the plan with actual data

## TODO

- Remove that privacy first branding and labeling since i am not sure this will be like that forever. We should look for other things that make us different but not privacy since pilots like to share their flights anyways
- Remove concept.html and put everything on the landing page, this removes friction
- Implement turbulance detection and show it in the 3d viewer
