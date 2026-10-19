# Sensitivity Lab

An English-language, static field-of-view and Uniform Soldier Aiming simulator. WebGL 1 renders a 3D shooting range with analytic ray tracing in a fragment shader. No libraries, backend, or API keys are required.

## Run locally

```sh
python3 -m http.server 8080 --directory dist --bind 127.0.0.1
```

Open http://localhost:8080. Run `npm test` with Node 18 or later to check the geometry, sensitivity model, movement, settings validation, and timed trials.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` tests and publishes `dist/` whenever `master` changes. It can also be started manually from the Actions tab.

In the repository's **Settings → Pages**, select **GitHub Actions** as the publishing source. Once enabled, run **Deploy to GitHub Pages** from the Actions tab. The expected public address is https://iasdev.github.io/sensitivity-web/.

GitHub Pages requires an eligible plan for private repositories. On GitHub Free, the repository must be public. Enabling a public website does not require making an eligible private repository public.

## Controls

- Horizontal and vertical FOV use a fixed 16:9 reference. Both settings stay unchanged when the resolution changes. The camera preserves vertical FOV and expands the actual horizontal FOV on wider displays without stretching the image. Numeric fields and sliders stay synchronized.
- Choose a preset resolution, custom dimensions, or Fit available space. The Fullscreen button uses the browser's fullscreen mode.
- Red represents the field of view, and green represents the USA matching distance. Outlines only removes the green fill and uses a neutral scene palette while retaining red and green borders. This preference is saved.
- Settings, metrics, and mouse controls are translucent scene overlays. Settings start collapsed on mobile.
- Optical zoom ranges from 1× to 8×. ADS FOV can be relative to the player's FOV or a fixed 55° vertical reference.
- USA can be enabled or disabled, with a coefficient from 0% to 300% and presets for 0, 4:3, 16:9, and 21:9.
- Sensitivity accepts integers from 0 to 200, with 7 as the default.
- Choose 1–24 targets and a target speed from 0× to 4×. Targets move by default on separate sideways and forward/backward paths. Changing speed or pausing preserves their movement phase.
- Start/Stop or Space toggles mouse capture. Dragging with the left button does not move the camera. Hold right-click to aim and release it to return to hip fire, with or without capture. Esc releases the mouse.
- Scroll over the scene to change zoom in 0.25× steps. This also works while the mouse is captured.
- While captured, left-click to shoot and use WASD to move. Player speed ranges from 0 to 12 m/s, with 4 as the default.

## Shooting and statistics

Each left-click while captured fires a ray from the crosshair. Hit detection uses the camera position, orientation, target count, and animation time of the last displayed frame. Target board, body, and head geometry is shared by the shader and hit detector. Ground, posts, and rails block shots. The nearest surface determines the result, and each shot counts once.

The entire target board and silhouette count as a hit. Only the visible head sphere counts as a headshot. The top-left overlay shows hits, misses, accuracy (hits/shots), and headshot percentage (headshots/hits). Releasing capture preserves the counters. The overlay's reset button clears them outside an active trial.

No hit markers or shot messages appear on the crosshair. Web Audio synthesizes one short tone for a hit and two higher tones for a headshot. Misses are silent. Audio is unlocked by starting mouse capture.

## Target movement

Targets occupy three columns separated by 5 units and rows separated by 6 units. Each follows an ellipse with a maximum sideways displacement of 1.1 and a maximum depth displacement of 2. Even at opposite phases, neighboring paths remain farther apart than the target geometry, preventing collisions. The maximum of 24 targets keeps all rows in front of the back wall. Perspective overlap and occlusion between rows can still occur.

The animation clock advances at the selected speed. Disabling movement or selecting 0× freezes it without resetting the phase. Reset settings restores 9 targets, movement enabled, and speed 1×.

## Player movement and saved settings

WASD moves the player horizontally relative to camera yaw while the mouse is captured. Diagonal movement is normalized. Movement is bounded by the range edges. Releasing capture, losing focus, or hiding the tab clears held movement keys to prevent stuck movement. Rendering and hit detection use the same camera position.

Settings are saved automatically in localStorage under `sensitivity-lab.settings.v1`, using a versioned schema with field and range validation. Saved preferences include FOV, resolution, USA, sensitivity, target count, movement options, speeds, outlines, and trial duration. Statistics, trial results, mouse capture, held ADS, camera position, and animation time are not saved. Reset settings saves the defaults. The application still works when browser storage is blocked and reports this in the settings panel.

## Timed trials

Trial duration ranges from 0 to 300 seconds, with 60 as the default. Zero means unlimited time. Start trial captures the mouse, then resets the statistics and starts the clock.

Score = max(0, 100 × hits + 50 × headshots − 25 × misses). Headshots are included in hits, so a headshot earns 150 points in total.

The timer uses real monotonic time and keeps running when mouse capture is released or the tab is hidden. The deadline is checked before every shot. At expiry, the result freezes, mouse capture is released, and further shots do not count until a new trial starts or the player returns to free practice. Finish trial ends a run early, including unlimited runs. Counter resets and duration changes are disabled during an active trial. Only the configured duration is persisted; active sessions, scores, and statistics are not saved.

## Mathematical model

For aspect ratio A, H = 2 atan(A tan(V/2)). Optical zoom Z uses V_ads = 2 atan(tan(V_ref/2)/Z). With relative ADS FOV disabled, V_ref = 55°; otherwise V_ref = V_base.

For coefficient c = percentage/100, the ADS/base angular sensitivity ratio is atan(c tan(V_ads/2)) / atan(c tan(V_base/2)). For c = 0, use the limit tan(V_ads/2)/tan(V_base/2).

The horizontal matching distance is c/A of the half-width from the center. The full green band occupies the same fraction of the full image width. References beyond the edge are clipped visually and labeled. For c = 0, only the center line is drawn. The band represents a matching distance, not an activation area: sensitivity affects the entire camera. Different FOVs cannot match every screen-space distance simultaneously.

With USA disabled, the angular sensitivity multiplier is 1. This does not emulate any particular game's legacy aiming mode or per-scope multipliers.

The sensitivity model is calibrated to the user's screenshots: sensitivity 7 gives 79 cm/360° at 800 DPI, 39.5 cm at 1600 DPI, and 19.75 cm (19.8 rounded) at 3200 DPI. The affine model is:

`degrees/count = (360 × 2.54 / (79 × 800)) × ((sensitivity + 4/3) / (7 + 4/3))`

This agrees with the measured model of approximately `0.00173623 × sensitivity + 0.00231498` degrees/count published by [SensitivityMatch](https://sensitivitymatch.com/mouse-sensitivity-converter/cs2-to-battlefield-6/), normalized to the screenshot at sensitivity 7. At sensitivity 100, it reproduces 6.5 / 3.2 / 1.6 cm at 800 / 1600 / 3200 DPI. Calculations retain full precision before display rounding. Sensitivity 0 retains a minimum speed of approximately 493.8 cm/360° at 800 DPI. This is not an officially verified formula; the supplied screenshots validate two points on the scale.

Raw Pointer Lock input is requested when available. Browser or operating system input scaling may affect physical distances. The distance table shows base sensitivity; ADS applies the USA multiplier. The selected resolution defines aspect ratio and framing, while WebGL raster size follows the displayed canvas with a maximum of 1.5× device pixel ratio to limit GPU load.

## References

- [DICE: Uniform Soldier Aiming](https://forums.ea.com/blog/battlefield-game-info-hub-en/dev-notes---uniform-soldier-aiming/7013669)
- [EA: mouse and keyboard settings](https://www.frostbite.com/able/resources/battlefield-2042/pc/mouse-and-keyboard)
- [Unity: camera projection geometry](https://docs.unity.com/en-us/engine/6000.5/manual/cameras/camera-view/frustum-size-at-distance)
- [MDN: Pointer Lock](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API)
