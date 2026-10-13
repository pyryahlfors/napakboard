# Animation Tester

## Purpose
Preview LED animation modules in a browser without Firebase or Raspberry hardware.

## Route
Standalone `/projects/napakboard/js/raspberry/animation-tester.html`. It is not part of the ten-view router or shared application navigation.

## Access
No authentication, roles, or database permissions are consulted. Availability depends only on the static host exposing the file.

## User Flow
Choose an animation, optionally change dimensions/text, and Start. Switch animations while running or choose Random. Stop clears output and cancels the timer; Clear blanks the current frame but does not stop a running animation.

## UI / Components
Animation selector, numeric width/height inputs, scroll-text input, Start/Stop/Random/Clear controls, board-dimension/status text, and Canvas 2D LED output. `AnimationTester` owns the pixel buffer, board mock, selected animation, running flag, and timeout.

## Data
Imports local `snake`, `matrix`, `sparkle`, `scanner`, `fire`, `balls`, `aurora`, `ripple`, and `textscroll` animation functions. Each receives a board-like object and pixel array. The mock implements the Pi-style serpentine index mapping and supplies scroll text. Pixels are rendered as colored circles.

## User Actions
Start/switch resets animation context and buffer. Random chooses a module. Dimension changes recreate the buffer/canvas/mock. Text changes feed the scrolling animation; Stop resets state and disables itself. Clear will be overwritten by the next frame when running.

## API / Backend Dependencies
Static module GETs load the nine animation files and color helper. There are no Auth calls, Firestore operations, HTTP command endpoints, or GPIO calls. Animation errors are not wrapped in a dedicated recovery UI.

## Database
None. Animation inputs and pixels are local memory only.

## State & Side Effects
An 80ms timeout loop clears the buffer, invokes the selected module, and renders. Width/height changes rebuild context. No storage or app-global state is used.

## Validation & Error Handling
Width is clamped to 1-26; height to 1-64, with invalid parsed inputs falling back to current dimensions. Empty text uses a fallback. Unknown animation names are logged/ignored by Start.

## Permissions & Security
This is a simulator, not a hardware control page. It must not be mistaken for proof of physical strip order or permissions. Publishing adjacent server files containing credentials would be a separate hosting risk.

## Edge Cases
Initial dimensions are 17 by 23, but the constructor initially allocates/reports 399 LEDs rather than 391. A real dimension change recalculates the product. Only five of these nine animations are registered in the actual Pi screensaver map. Clear does not cancel playback.

## Related Code
[animation-tester.html](../../js/raspberry/animation-tester.html), [Pi animation registry](../../js/raspberry/js/systemboard.js), [colorUtils.js](../../js/raspberry/js/animations/colorUtils.js), [textscroll.js](../../js/raspberry/js/animations/textscroll.js).

## Notes / Unknowns
No automated visual/performance assertions are included. Simulator output cannot confirm physical hardware colors, strip behavior, or service installation.
