# Board Setup

## Purpose
Configure the wall's visual hold shapes/transforms and archive its existing routes.

## Route
`/projects/napakboard/#/setup`, key `setup`; exact `?setup` also chooses this page during signed-in startup. This query override remains until the URL is changed; it is not a general query-parameter parser.

## Access
The shared menu exposes Setup when Auth UID equals `globals.boardSetup.owner`. The page and its write functions do not independently enforce ownership. Normally requires a signed-in Firebase session and suitable database permissions.

## User Flow
Load board setup, click a grid cell, choose an SVG hold and adjust its transform/color/mirror flag. Set accepts the local edit, Cancel restores a cloned local setup, and Remove removes the configured hold. Save persists the full nested setup. Console logs the current object. Nuke asks confirmation, then soft-archives all matching routes.

## UI / Components
The setup-specific `systemBoard` renders a grid and Canvas 2D hold artwork. Each cell opens a modal with hold selection plus rotation, X/Y offsets, X/Y scales, color input, and mirrored-counterpart checkbox. Modal state includes a temporary setup clone and `holdTransform`; the footer triggers Save, Console, Nuke, or return to Board.

## Data
Reads `boardSetup/<board>.boardSetup`; missing setup fetches `/hold_setup.json`. Hold shapes come from `/projects/napakboard/images/holds.svg`. The view edits `globals.boardSetup.holdSetup` visual objects, not route hold-type maps. Grid IDs are top-down; row headings are bottom-up, while the hold-modal title uses the raw ID.

## User Actions
- Edit/Set/Remove update browser setup and redraw; they do not individually persist the layout.
- Clicking a hold also writes a one-hold normal lighting command, even before Save.
- Save calls `updateDoc` with the whole nested setup.
- Nuke queries every route document, filters `napakboard` locally, and writes `archived:true`; no routes are deleted.

## API / Backend Dependencies
| Operation | Input -> output | Important errors |
| --- | --- | --- |
| `getHoldSetup` / static GET | SVG path -> hold definitions and redraw | Logs fetch errors; may leave incomplete artwork |
| `loadBoardSetup` / Firestore GET | Board ID -> setup, or JSON fallback | No comprehensive page error recovery |
| `updateSetup` / `updateDoc` | Global nested setup -> existing board doc update | Alert shown before confirmed completion; missing doc can fail |
| Cell preview / `setDoc` | One stored ID with intermediate type -> `current` command | Can interrupt physical training; no direct Pi result |
| `nukeRoutes` / query + updates | Active board -> archive matching routes | Whole collection read; updates not collectively awaited |

## Database
Mutates `boardSetup/<board>.boardSetup`, `current/currentRoute_<board>`, and matching `routes.archived`. Board creation, owner changes, and dimension/mirror-column mapping provisioning are not implemented by this form.

## State & Side Effects
Uses shared setup, replaces `window.mySystemBoard`, fetches SVGs, redraws the grid/canvas, and loads setup documents again during redraw paths. Cancel restores local data, but cannot undo the already-sent LED preview. A global board observer reloads setup.

## Validation & Error Handling
Rotation slider is 0-395 with step 5; offsets -100 to 100 with step 5; scales -200 to 200 with step 10; color and mirror controls supply values directly. No server-side geometry validation or save transaction is inspected.

## Permissions & Security
Treat setup and bulk archive as privileged operations requiring real Firestore rules. Owner-only navigation visibility is insufficient. Console intentionally prints the board object; do not put credentials into it.

## Edge Cases
The document must exist for `updateDoc`. The characteristics-only local JSON is not a complete configured wall. Setup mutation/redraw paths may trigger repeated reads. Bulk archive's success alert does not prove all writes succeeded.

## Related Code
[page_setup.js](../../js/templates/page_setup.js), [board_setup.js](../../js/components/board_setup/board_setup.js), [owner navigation](../../js/templates/partials/section_otc.js), [hold_setup.json](../../hold_setup.json), [hold_setup_example.json](../../hold_setup_example.json).

## Notes / Unknowns
Actual setup-write permissions, board provisioning, dimensions, and deployment fallback routing are unknown. The legacy name `nukeRoutes` is misleading: it archives rather than deletes.
