# Configuration

## Browser Firebase Configuration

`js/shared/user.js` contains a literal `firebaseConfig` with `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, and `appId`. There is no frontend environment-variable loader or development/production switch. Configure these fields for the intended Firebase project; no checked-in values are copied here. The legacy README describes enabling Email/Password Authentication and Firestore, but production console settings are unknown.

## Browser Runtime Settings

| Setting | Source | Behavior |
| --- | --- | --- |
| Active board | `localStorage.board`, otherwise code default | Used in Firestore document/query targets and board styling |
| Login hint | `localStorage.napak_auth_hint` | UI startup hint confirmed by Firebase Auth |
| Setup mode | Exact query text `setup` | `?setup` chooses setup at signed-in startup; extra query parameters are not parsed |
| Route | URL hash and `globals.route` | Registered view name; ordinary navigation writes `#/name` |
| Grades | `globals.grades.font` | Grade-index labels and scoring input |
| Board appearance | `boardSetup/<boardId>.boardSetup`, local CSS/assets | Dimensions, hold shapes/transforms, owner, mirroring, background |
| Training defaults | Session view | 30s rest, 1s hold interval; existing session document can override valid settings |

Browser and Pi must target the same Firebase project and exactly matching board ID. Document names are case-sensitive. Browser board selection and Pi `BOARD_ID` are independent; one does not automatically configure the other.

## Raspberry Environment

`loadBoardEnv()` reads `js/raspberry/.env` relative to the controller module, not the process working directory. Existing process environment values win. The parser trims lines, skips blanks/comments, splits at the first `=`, and strips surrounding quote characters. Missing/unreadable `.env` silently uses defaults. Numeric values use `Number.parseInt` with fallback; there is no range/wiring validation.

| Variable | Code default | Use |
| --- | --- | --- |
| `BOARD_ID` | `PCB` | Firestore command/status document identity |
| `BOARD_WIDTH` | 17 | Number of columns |
| `BOARD_HEIGHT` | 23 | Number of rows |
| `BOARD_LED_COUNT` | width * height | LED pixel-buffer size |
| `BOARD_GPIO` | 18 | `rpi-ws281x` GPIO configuration |
| `BOARD_DMA` | 10 | DMA channel |
| `BOARD_STRIP_TYPE` | `grb` | Lowercased strip-type option |
| `BOARD_SCROLL_TEXT` | Literal fallback in source | Text-scroll animation input; do not infer a production value |
| `BOARD_SCREENSAVER_IDLE` | 600000ms | Idle time before animations |
| `BOARD_SCREENSAVER_DURATION` | 30000ms | Animation run duration |
| `BOARD_SCREENSAVER_BREAK` | 30000ms | Break after an animation |

The tracked `.env` defines the board/LED variables, but not all optional animation settings. Consult the actual deployment for effective values; these docs intentionally do not reproduce the tracked environment values.

## Admin Credentials

`js/raspberry/js/firestore.js` embeds service-account fields including `type`, `project_id`, `private_key_id`, `private_key`, `client_email`, `client_id`, and authentication/token URLs. It calls `cert(this.fssa)`; no environment-variable substitution, secret-file loader, or `GOOGLE_APPLICATION_CREDENTIALS` workflow is selected by this code. The private-key field is not a complete PEM key in the inspected checkout. Do not copy deployment secrets into this file on a public static server or into documentation.

## Hosting and Assets

The browser uses absolute `/projects/napakboard/...` paths for its entry script, CSS, icons, and holds. Its board setup fallback instead requests `/hold_setup.json`. Hosting must account for both paths; simply serving the NapakBoard directory at `/` does not satisfy the application's asset paths. The local `hold_setup.json` contains characteristics only, and does not provision a Firestore board or a complete hold layout.

Query suffixes on JS/CSS imports are manual cache-busting versions, not feature flags. Update the relevant import chain when deploying changed modules. There is no application service worker, build-time configuration pipeline, feature-flag service, or checked-in hosting rewrite configuration.

## Unknown Configuration

Firestore rules/indexes, database region, authorized domains, emulator setup, service-account privileges, hardware permissions, Node version/ESM mode, GPIO wiring, process supervisor, deployment automation, and production static hosting are not determined by this repository.

## Related Code

[Browser Firebase initialization](../js/shared/user.js), [browser defaults](../js/shared/globals.js), [hardware/env loading](../js/raspberry/js/systemboard.js), [Admin initialization](../js/raspberry/js/firestore.js), [entry asset URLs](../index.html).
