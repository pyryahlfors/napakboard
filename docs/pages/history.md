# History

## Purpose
Summarize the current user's recorded ascents on the active board.

## Route
`/projects/napakboard/#/history`, key `history`; opened from the shared menu.

## Access
Normally signed in; the implementation directly dereferences `currentUser.uid`. No page-level role or ownership guard is present.

## User Flow
Open History, view total score and climbed-route count, then browse date sections containing grade, route name, ascent type, and score. Return to Board through the footer. There is no edit/export/delete UI on this page.

## UI / Components
`historyContainer` receives a one-time constructed fragment. Each ascent row uses grade and ascent `dsLegend` components plus computed score text. Date headings display counts. The footer performs navigation only.

## Data
Starts a routes query for `napakboard == globals.board`, then separately reads `users/<uid>`. It reverses user ticks, joins each `routeId` to the local route array, and ignores missing/other-board routes. Scores come from `eightaNuScore`: numeric grade index, a flash grade bonus, and a small flash point bonus. Dates use browser locale formatting.

## User Actions
Opening the view starts reads/subscription and builds the summary. Return calls `route('board')`. Tick modification is handled by Board's tick dialog, not History.

## API / Backend Dependencies
`onSnapshot(query(routes, where('napakboard','==',board)))` accumulates route data. `getDoc(users/<uid>)` supplies ticks. Output is a rendered local summary, not an API response. Missing user/ticks is logged; the async flow lacks a visible error catch.

## Database
Reads user `ticks` entries `{routeId, type, date, ...}` and corresponding route grade/name/board. No schema-enforced foreign key or snapshot of historic route metadata is used, so current route changes affect the displayed history.

## State & Side Effects
Local arrays/counters hold joined routes and score. The routes listener is not unsubscribed and appends records on successive snapshots. Rendering does not subscribe to or reuse the main route-list cache.

## Validation & Error Handling
History trusts stored tick/route shapes. Route entries without matching documents are omitted. Missing user/tick data does not create a clear empty-history message. SDK/locale failures are not comprehensively handled.

## Permissions & Security
Reads require suitable Auth/Firestore permissions. There is no extra per-user filter in the route query; the user-document target is the current UID. Production rules are unknown.

## Edge Cases
The user read can finish before the routes listener's first snapshot; the history can then be empty/incomplete and does not re-render when routes arrive. Snapshot accumulation can duplicate records. The locale string `us-EN` is nonstandard and browser behavior is not verified here.

## Related Code
[page_history.js](../../js/templates/page_history.js), [eightaNuScore in helpers.js](../../js/shared/helpers.js), [tick writer](../../js/components/system_board/route-ticker.js).

## Notes / Unknowns
The code does not provide reliable live history refresh or a historical-data migration. The meaning of scores is the implemented formula, not a verified external grading standard.
