# NapakBoard Documentation

NapakBoard is a mobile-oriented climbing-wall application for saving routes, recording ascents, managing training sequences, and controlling an optional Raspberry Pi LED board.

## Scope and Source of Truth

This documentation covers the NapakBoard repository, not the surrounding kiinto.com portfolio or its other projects. It describes the checked-in implementation. Production Firestore rules, indexes, Firebase settings, and Raspberry service installation are not included in this repository and cannot be verified here.

The browser application uses native JavaScript ES modules, DOM components, Firebase Authentication, and Cloud Firestore. The optional Raspberry controller is a separate Node process using Firebase Admin and `rpi-ws281x`; the browser does not directly connect to the Raspberry over HTTP.

## Starting Points

- Browser entry point and route registry: [js/main.js](../js/main.js).
- Hash navigation and view replacement: [js/shared/route.js](../js/shared/route.js).
- Raspberry controller and Firestore listeners: [js/raspberry/index.js](../js/raspberry/index.js).
- LED rendering, timing, and screensavers: [js/raspberry/js/systemboard.js](../js/raspberry/js/systemboard.js).

## Reading Guide

| Document | What to use it for |
| --- | --- |
| [Architecture](architecture.md) | Runtime boundaries, routing/state/data flow, and known technical debt |
| [Page index](pages/README.md) | All ten registered browser views plus the standalone animation tester |
| [API / SDK reference](api.md) | Actual Firebase operations and normal/training command contracts; no custom REST API |
| [Database](database.md) | Code-observed Firestore fields, relationships, dates, and ownership assumptions |
| [Authentication](authentication.md) | Auth flow, UI-only owner checks, and unverified server permissions |
| [Configuration](configuration.md) | Browser Firebase fields, all Pi environment variables, and hosting assumptions |
| [Integrations](integrations.md) | Firebase, LED hardware, static assets, caching, and read-cost boundaries |
| [Development](development.md) | Verified local serving/check commands and missing installation/deployment tooling |

## Important Onboarding Facts

- Serve the browser under its expected `/projects/napakboard/` asset path. Its JSON fallback uses a different root path and needs separate attention.
- Phone and Pi are different deployments. Updating browser assets cannot update the running Node controller.
- Match board ID and Firebase project across both runtimes. Command/status document IDs use different prefixes; see the API reference.
- Stored coordinates are top-down; displayed hold row numbers are bottom-up. Do not rewrite IDs to fix presentation.
- The route modal cache is live and memory-only. Other pages still perform their own reads, and reloads/reconnects can be billable.
- Firestore permissions are not specified by checked-in deployed rules. Owner-only UI is not authorization.
- The Pi dependency manifest is absent and its lockfile empty. Its embedded certificate is incomplete; no working production installation can be reconstructed from these files alone.
- There is no committed automated test suite or build pipeline. The animation tester is a visual simulator, not a hardware test.

Documentation reflects the inspected checkout, not an idealized design. Unknowns are recorded alongside relevant pages/references. Application files were not changed as part of documenting them.
