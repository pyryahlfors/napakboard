# Integrations

## Firebase Authentication

The browser imports the Firebase `9.10.0` Auth SDK from `www.gstatic.com`. It uses email/password accounts, reset email requests, display-name updates, auth-state events, and logout. Configuration is in `js/shared/user.js`. No custom email transport or OAuth provider is implemented. Firebase console policy/delivery settings are unknown.

## Cloud Firestore

The browser accesses routes, board setup, users, command documents, and status directly. The Pi uses Firebase Admin listeners and writes. There is no application HTTP API between phone and board; Firestore is both the database and command/status transport. See [database.md](database.md) for document IDs and [api.md](api.md) for operation contracts.

The route-list modal shares live route/user caches, but other pages create independent listeners or reads. Profile resolves each unique TODO route; tick workflows perform multiple reads and writes; setup's bulk archive reads all routes. Initial queries, changed documents, reloads, and reconnects can incur reads. No budget guard, billing monitor, persistent browser Firestore cache configuration, or request rate limit is implemented here. Cloud budget alerts/limits cannot be inferred from source.

## Raspberry LEDs

`rpi-ws281x` is imported by the hardware renderer and configured with board-specific LED count, GPIO, DMA, and strip type. Pixels are rendered from `Uint32Array` buffers. Coordinates are converted using a serpentine grid mapping. Verify wiring, permissions, strip ordering, and dimensions on the target device; the browser simulator cannot establish physical correctness.

The Pi imports `firebase-admin/app` and `firebase-admin/firestore`, initializes a service-account certificate, and subscribes to the selected board's command documents. Network connectivity to Firebase is required, but the phone does not need to share the Pi's local network.

## Static Media and Browser APIs

- `images/holds.svg` supplies reusable hold geometry for both board renderers and the sequence editor; Canvas 2D paints transformed holds.
- `images/icons.svg` is fetched by the footer. Local board backgrounds and font files supply visual presentation.
- Proxy state, custom elements, CSS animation events, IntersectionObserver, MutationObserver, localStorage, and timers implement interaction; these are browser APIs, not additional hosted services.
- The animation tester imports animation modules locally and simulates pixel output on Canvas. It does not send LED commands or read Firebase.

## Not Present

No payment, analytics, maps, AI, push messaging, third-party route provider, Cloud Storage operation, or custom SMTP integration is found. `storageBucket` appears in Firebase configuration, but no storage upload/download workflow is implemented.

## Related Code

[Browser Firebase setup](../js/shared/user.js), [Pi Firestore adapter](../js/raspberry/js/firestore.js), [LED renderer](../js/raspberry/js/systemboard.js), [hold renderer](../js/components/system_board/board-renderer.js), [footer asset loader](../js/components/bottom_navi/bottom_navi.js), [animation tester](../js/raspberry/animation-tester.html).
