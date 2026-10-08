# AGENTS.md

Static, single-page p5.js sketch ("bouncing ball"). No package manager, bundler,
build, test, lint, or CI — do not look for npm/build scripts.

## Run / verify
- Open `index.html` in a browser, or `python3 -m http.server` and load it.
- There is no build step; edits to `sketch.js` show up on reload.
- Global-mode `setup()` / `draw()` live in `sketch.js` (no `new p5()`).

## Libraries / CDN quirks
- `index.html` loads three scripts in order: `p5@2.3.4`, then
  `p5.sound@0.4.1`, then `sketch.js`. Keep that order.
- p5 2.x does **not** ship `p5.sound` under `p5/lib/addons/`; the sound library
  is a separate npm package, pinned to `p5.sound@0.4.1` on jsDelivr.
- That `p5.sound` is a Tone.js wrapper with a different API from the legacy
  library: e.g. `new p5.Oscillator(type)`, `osc.connect(env)`, and
  `new p5.Envelope(attack, decay, sustain, release)` + `env.play()`. Older
  classes (`p5.PolySynth`, `p5.Filter`, `p5.Compressor`, etc.) are now
  deprecation stubs that only warn.

## Behavior notes
- The ball moves in 2D with random impulses; it bounces on all four edges and
  each bounce applies a random restitution, so it sometimes bounces hard and
  sometimes softly.
- Each bounce also gives the ball a new random color and regenerates the
  background with a different random pattern. `dibujarPatron()` renders 6 pattern
  types; `generarPatron()` forces the new type to differ from the previous one.
  Pattern colors come from the warm palette helper `colorCalido()` (bright,
  saturated: high red, variable green, low blue) over a vivid terracotta
  background.
- Each bounce triggers a short tone (`p5.Oscillator` + `p5.Envelope`).
- Pressing the mouse button (`mousePressed`) makes the ball explode into several
  small glass balls. `explotar()` fills `pelotitas`; `actualizarPelotitas()`
  moves them (gravity + wall bounces) and, after `DURACION_PELOTITAS` (10 s,
  measured with `millis()`), clears them and calls `reaparecer()` to respawn the
  main ball at a random spot away from the cursor. The main ball and the small
  balls are both drawn by the shared `dibujarCristal(x, y, r, col)` helper.
- A separate mouse particle system (`Chispa` class + `chispas` array) emits
  particles from the cursor in `emitirChispas()` and ages them in
  `actualizarChispas()`. Each particle has a random lifetime (50-90 frames) and
  fades/shrinks as it dies; the array is capped at `MAX_CHISPAS` (400).
- Audio cannot start without a user gesture. `osc.start()` is deliberately
  **not** called in `setup()`: the first `mousePressed` resumes the
  `AudioContext` (`getAudioContext().resume()`) and starts the oscillator only
  after the click. Until then `audioListo` is false, a hint is drawn, and
  `sonar()` returns early — otherwise Chrome logs autoplay warnings.
- `windowResized()` re-fits the canvas and clamps the ball back inside.
- The ball is drawn by `dibujarPelota()` as a translucent "glass" sphere: a raw
  `drawingContext.createRadialGradient` for the body plus a rim light and two
  specular highlights. It uses logical canvas coordinates (p5 already scales
  `drawingContext` by `pixelDensity`), so do not pre-multiply by pixel density.
- The `<h1>` is a fixed HTML overlay centered at the top, not in flow, so the
  canvas fills the viewport with no scroll. It must keep `pointer-events: none`,
  otherwise it swallows cursor events and breaks hover-stop / click-to-enable-audio.
- Comments and UI text are in Spanish; keep that style.

## Repo quirks
- `pelota-que-rebota` is an empty, accidental tracked file, not an entrypoint.
- `.DS_Store` is tracked; ignore spurious changes to it.
