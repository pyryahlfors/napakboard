# Board Selection

## Purpose
Choose the active climbing board used by the rest of the browser application.

## Route
`/projects/napakboard/#/boardSelect`, route key `boardSelect`; opened from the shared menu.

## Access
Normally signed in. No membership or owner filtering is performed by this page; database visibility depends on Firestore rules.

## User Flow
Wait for the live board list, select a board-ID button, then return automatically to Board. The current board receives the preferred-button style. The footer also returns to Board without changing selection.

## UI / Components
Board buttons are created from `boardSetup` document IDs. The component keeps a local `boards` array; button actions change global state and storage. There is no board creation, metadata editor, search, or delete control.

## Data
Queries the entire `boardSetup` collection. It uses document IDs only, not board metadata, owner, or dimensions. Names are not explicitly alphabetically sorted.

## User Actions
Selection assigns `globals.board`, persists it as `localStorage.board`, and calls `route('board')`. Global board observers reload setup/status and invalidate the previous board's route-list cache.

## API / Backend Dependencies
`onSnapshot(query(collection(getFirestore(), 'boardSetup')), callback)` supplies document snapshots. No HTTP endpoint or write is used. The callback does not provide a UI error handler.

## Database
Reads `boardSetup/<boardId>` document identities. That ID becomes the routes' `napakboard` filter and command/status document suffix, but it does not change the Pi's configured `BOARD_ID`.

## State & Side Effects
Uses local board-name accumulation, global board state, localStorage, and a live Firestore subscription. The view does not retain the unsubscribe function.

## Validation & Error Handling
No additional validation is applied to selected IDs. There is no dedicated empty/error state for an inaccessible or empty collection.

## Permissions & Security
No client-side board-access checks exist. Displaying a board in this selector is not proof of permission to modify its routes or control its LEDs.

## Edge Cases
Repeated snapshots append IDs to the existing array and append new buttons without clearing old ones. This can create duplicates and stale board entries. Navigating away does not unsubscribe.

## Related Code
[page_board-select.js](../../js/templates/page_board-select.js), [globals.js](../../js/shared/globals.js), [board observer](../../js/components/system_board/system_board.js), [status subscription](../../js/templates/partials/section_otc.js).

## Notes / Unknowns
The source does not define board provisioning or membership permissions. Production-visible boards and their authorization must be checked in Firebase.
