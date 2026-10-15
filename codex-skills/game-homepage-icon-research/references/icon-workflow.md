# Icon workflow

## Prompt construction

Produce and report an English prompt using this structure:

~~~text
Use case: logo-brand
Asset type: square favicon master for a GAME NAME fan-made strategy guide website, target 512 x 512 PNG
Primary request: create one original, highly recognizable emblem informed by the game's genre and signature mechanic, not a copy of the official logo
Subject: one simple central symbol with at most two supporting motifs
Style/medium: clean premium game UI icon, crisp vector-like raster rendering, simplified silhouette
Composition/framing: centered emblem, about 75–80 percent of the square, thick readable shapes, safe transparent padding, legible at 16 x 16 pixels
Lighting/mood: derived from verified official visual tone
Color palette: derived from the homepage palette
Text: no words, captions, initials requiring tiny strokes, or small lettering
Constraints: genuine transparent background, one isolated emblem, strong contrast, square canvas, no border touching the canvas, original fan-site identity
Avoid: official logo imitation, copyrighted character likeness, complex scenery, tiny details, watermark, mockup, rectangular background
~~~

Use an initial only when it remains readable and does not resemble an official logo. Prefer a symbolic mark tied to a mechanic, class, resource, map, weapon category, creature type, or world motif.

## Image validation

Before upload, confirm:

- PNG
- Exactly 512 by 512
- RGBA or equivalent alpha channel
- Transparent corners
- No canvas-edge contact
- Strong 16-pixel silhouette
- No accidental text or watermark

If visual inspection reveals excessive detail, regenerate once with fewer shapes rather than trusting automatic downscaling.

## favicon.io browser flow

1. Open https://favicon.io/favicon-converter/.
2. Select the actual image file input, not an advertisement.
3. Upload the verified 512 PNG.
4. Confirm Loaded: filename is visible.
5. Confirm 64, 48, 32, and 16 pixel previews appear.
6. Start waiting for a browser download before clicking Download favicon package.
7. Use the returned download path; never guess it.
8. Rename the archive only after the download completes.
9. Validate all seven expected members and CRC integrity.

## Packaging rules

The final archive name is {filename-safe game name}图标.zip.

Do not add the master PNG to the favicon.io ZIP unless the user asks. The converter's android-chrome-512x512.png is the required 512 member.

Calculate SHA-256 after the archive reaches the user's destination. A matching source/destination hash is required when the file crosses environments.
