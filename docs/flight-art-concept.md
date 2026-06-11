# Flight Art Concept & Roadmap

> Recovered 2026-06-11 from the Codex session of 2026-06-04 (`rollout-2026-06-04T18-16-26-019e936b`).
> The original brainstorm and plans were only ever in the conversation, never saved as a doc.
> Status notes added during recovery: the v0 and v1 plans below are already implemented on `main`.

## Core Idea

Treat this as a separate "flight art mode", not as coaching. Same IGC input, different emotional job: "make this flight worth hanging, sharing, gifting, or remembering."

**What people would use it for**

1. **Flight keepsake:** first high flight, first XC, first top landing, first 100 km.
2. **Social share:** a clean image/video that looks better than a track screenshot.
3. **Gift:** pilot-to-pilot print, instructor/student milestone, club awards.
4. **Site memory:** "my classic Schauinsland line" or "Lijak spring XC".
5. **Identity:** a personal visual style from your season, not just one flight.

Existing products validate this demand (Outdoor Art Print's GPX/Strava poster workflow, TerrainSculpt's GPX-to-3D-terrain objects), but those are mostly ground-sport route memories. The gap is flying-specific altitude/air/thermal art.

## Art Concepts (ranked brainstorm)

1. **Minimal Line Poster** — white paper, one elegant track line, tiny launch/landing dots, title, date, max altitude. Fastest shippable. *(✅ shipped as v0/v1 presets)*
2. **Altitude Sculpture** — track as a 3D ribbon: horizontal shape is the GPS path, vertical height is altitude. Camera at 30–45°. No realistic map needed at first. "Floating calligraphy made from a flight."
3. **Thermal Ink** — straight glides are thin pale lines; thermals become denser circular ink blooms; better climbs get darker/larger. Makes paragliding visually distinct.
4. **Terrain Relief Poster** — simplified terrain mesh under the flight, rendered like paper-cut contour layers or soft clay. Track floats slightly above terrain. Matches the existing Cesium usage.
5. **Season Constellation** — all flights from a season as a gallery: each track normalized into the same frame, like botanical specimens. Great for "my 2026 season" exports.
6. **Flight Fingerprint** — compress the track into abstract marks: altitude profile, thermal circles, glide segments, wind drift, turn direction. More art object than map.

## Where Generative AI Fits

Use AI as a **style layer**, not as the source of truth. The track geometry should remain exact.

Good AI uses:

- Generate background textures: watercolor paper, ink wash, risograph, vintage topo, alpine sketch.
- Generate style presets from plain language: "Japanese ink wash", "Swiss topo poster", "minimal gallery print".
- Turn metadata into titles/captions: "Evening climb above Schauinsland", "Four thermals and a low save".
- Produce share copy: Instagram caption, club post, print certificate.
- Optional image-to-image pass over a deterministic base render, with constraints to preserve the track.

Bad AI use:

- Letting AI redraw the route freely — it will distort the actual flight.
- Creating fake mountains/trees as if they are real data, unless clearly labeled artistic.

Pattern proven by tools like postermap.art: deterministic SVG/map render first, AI transformation second.

## Build Sequence

Recommendation from the session: start with **minimal 2D art export** (done), then add **3D altitude sculpture** next. The paragliding-specific magic is the combination of track shape, altitude, thermal circles, and the emotional story of "this is the line I flew through invisible air." For richer custom 3D rendering later, deck.gl supports 3D tiles and terrain-aware camera controls as an alternative to Cesium.

### v0 — standalone art page *(✅ implemented)*

Standalone `/art.html` that turns IGC/GPX tracks into printable A-series portrait PNG posters. Deterministic, local-only. `art-renderer.js` (pure canvas poster renderer) + `art-page.js` (page state, sample gallery, upload, controls, PNG export). Styles: Gallery White, Thermal Ink, Altitude Ribbon. High-res export at 2480×3508.

### v1 — premium minimal poster maker *(✅ implemented)*

Guided 4-step flow (choose flight → choose look → personalize → download). Three preset cards: `Gallery White`, `Noir`, `Warm Paper`. Curated controls: title/subtitle (with show/hide toggles), start/end markers, stats row, line weight (Fine/Classic/Bold), 4 fixed accent swatches. Single `posterOptions` object shared by preview and export. MapDreamer-style full-height canvas layout with collapsible sidebar steps. Market references: MapDreamer, urmappu, PathPosters, Outdoor Art Print, Trailo — these sell "meaningful memory", live preview, theme selection, title/stat editing, privacy/local processing, print-ready 300 DPI output.

### Not yet built (the "how to continue" part)

- 3D Altitude Sculpture render style (next recommended step).
- Thermal Ink and Flight Fingerprint as distinct presets in the new preset-card system.
- Terrain Relief Poster (Cesium/deck.gl-based).
- Season Constellation / multi-flight exports.
- AI style layer (textures, natural-language presets, caption generation).
- SVG/PDF export, watermarking, payments, print fulfillment, saved designs.

## Monetization (from the same session)

Two buckets: **software value** and **physical fulfillment**.

1. **Free preview, paid export** — free upload + watermarked/low-res preview; paid high-res PNG/SVG/PDF. E.g. €3–8 per export or 10 for €29.
2. **Subscription** — art as one feature inside a broader NextFlight subscription (debriefs, flight library, seasonal posters, advanced styles, share links, high-res exports). Works better if art is one feature in a larger product.
3. **Print fulfillment** — A4/A3/A2, framed, canvas, metal, club award prints. Probably the most natural monetization: the user wants the object, not the file.
4. **Milestone products** — first solo, first XC, first 50/100/200 km, season recap, instructor certificates, competition task posters. Emotional purchases, can be priced higher.
5. **Club / instructor packages** — e.g. €99/year club dashboard plus discounted prints.
6. **Premium style packs** — base styles free; paid packs (Swiss topo, Japanese ink, alpine relief, thermal bloom, vintage expedition, black gallery, season constellation).

**Image protection:** you cannot DRM an image the user can see. Rely on value, convenience, and tiering instead: watermark free previews, limit preview resolution, gate print-ready files behind payment, make fulfillment easier than theft, add authenticity/certificate value (date, stats, QR link, "Generated by NextFlight"), keep account/order history valuable, and run premium AI styles server-side after payment.

**Recommended model for v0/v1:** free low-res watermarked preview + paid high-res export + print fulfillment. Long-term, art should be an emotional add-on inside the larger coaching product, not the whole business by itself.
