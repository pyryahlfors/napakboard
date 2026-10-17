# Board

## Purpose
Display the wall, create/load normal climbing routes, record ascents, and optionally send hold selections to the physical LED board.

## Route
`/projects/napakboard/#/board`, route key `board`; default signed-in page. The route-list/save/clear/tick dialogs are modals within this page, not separate URL routes.

## Access
Normally signed in. There is no independent page guard. Archive controls are shown for the board owner; route creation/ticking/lighting otherwise rely on the current Auth user and deployed Firestore rules.

## User Flow
Load the board layout, open the route list from the ticker/menu, filter and choose a route, and Load it. Alternatively clear the selected route, select hold types, and Save a new route. Tick a loaded route to record a flash/redpoint, votes, and optional comment. Swipe/scroll to route statistics/comments. The light toggle enables writing selections to the Pi command document.

## UI / Components
| Component | Data and state | Actions |
| --- | --- | --- |
| `BoardRenderer` | Board dimensions/visual holds; DOM hold classes; cached SVG promise | Draw grid/canvas; cycle hold types on short press; remove on long press or context menu; notify board change |
| `RouteListManager` | Shared board route/user TODO caches; selected modal route; global filters | Search, sort, angle/tick/TODO filtering, TODO toggle, owner archive, Load |
| `RouteEditor` | Current selected DOM holds; save-form values | Confirm Clear; validate and add route; create optional mirrored route |
| `RouteTicker` | Fresh route tick state; Auth user; ascent/vote/comment form | Add/remove tick and related route/user arrays |
| Ticker and footer | Selected route/grade, light state, save/tick disabled state | Open list, move through filtered routes, Save/Tick/Clear/light toggle |
| Comments panel | Cached selected route, `tickLog`, approvals | Render ascent percentages, consensus, and newest comments |

## Data
Reads `boardSetup/<board>`, selected `routes/<id>`, route-list query `napakboard == board`, and the signed-in user document for TODOs/ticks. Fallback board JSON and SVG/icon assets are static GETs. Grade indices become labels; vote/grade consensus comes from `route-utils.js`. Stored coordinates remain top-down while board row labels are bottom-up.

## User Actions
- Short presses cycle `intermediate -> foot -> start -> top -> removed`; long press/context menu removes. Normal editing is blocked while a saved route name is selected.
- Save requires name, setter, selected holds, START and top holds. It adds a route document and optionally a mapped mirrored counterpart, then loads the new route.
- List filters/sorts run in memory; archived routes are hidden. TODOs use `arrayUnion`/`arrayRemove`; owner Archive sets `archived:true`.
- Tick reads current route state, then mutates route and user records; removing a tick removes the user's associated records.
- Clear resets browser selection/hold classes. It is not an explicit Pi-off command.
- With light enabled, loading/editing calls `updateBoardData()` to write a hold snapshot to `current/currentRoute_<board>`.

## API / Backend Dependencies
| Function / type | Input -> output | Important errors |
| --- | --- | --- |
| `loadBoardSetup`, Firestore GET/static GET | Board ID -> visual setup/render | Missing document falls back to root JSON; catches main load errors |
| `loadRoute`, Firestore GET | Route ID -> selected state/display/cache | Missing doc or rejected read has weak UI handling |
| Shared `onSnapshot` queries | Board/user IDs -> route and TODO cache changes | Cache cleared/logged on listener errors |
| `validateAndSave`, Firestore `addDoc` | Valid form + hold map -> route ID(s) | Client alerts; async write errors not caught |
| Tick mutations / `updateBoardData` | Ascent form / hold map -> writes, no custom body | Tick errors re-enable controls; lighting failures lack a dedicated UI acknowledgment |

See [API reference](../api.md) for exact payloads. No application HTTP endpoint is called.

## Database
Uses `boardSetup`, `routes`, `users`, and `current`. `setterID`, tick UIDs, and user tick/TODO route IDs are unenforced document relationships. Normal route `holdSetup` values are type strings; physical hold geometry comes from the board document.

## State & Side Effects
`window.mySystemBoard` is replaced on view construction. Proxy globals include selected route/name/ID, board, lights, route cache, filtered routes, sorting, and message queues. The route modal retains one shared routes listener and one user listener across closes; only modal observers disconnect. Each explicit route load still performs a document read. Board setup and hold SVG loading are separate from the list cache.

## Validation & Error Handling
Save checks non-empty name/setter, selected holds, and START/top presence. Tick form defaults to flash/neutral votes, trims comments, and catches mutations. Owner archive and normal lighting are less consistently caught. Setup-load failure has a status message.

## Permissions & Security
Owner-based archive visibility is a client UI check, not a verified server rule. No route-setter edit permission boundary is enforced here. Shared board commands can affect other users' training. The shared ticker/sidebar inserts some route/status/profile strings through `innerHTML`; the comments panel instead uses text-node rendering and shows at most ten newest comments.

## Edge Cases
Disabling the light toggle does not explicitly clear LEDs. Normal commands can interrupt training. Tick writes span multiple documents without a transaction. Missing `mirrorCols` can break automatic mirroring. Filters and sorting mutate shared arrays in place. Board setup fallback path/data may not match the host.

## Related Code
[page_board.js](../../js/templates/page_board.js), [system_board.js](../../js/components/system_board/system_board.js), [board-renderer.js](../../js/components/system_board/board-renderer.js), [route-list.js](../../js/components/system_board/route-list.js), [route-editor.js](../../js/components/system_board/route-editor.js), [route-ticker.js](../../js/components/system_board/route-ticker.js), [route-utils.js](../../js/components/system_board/route-utils.js).

## Notes / Unknowns
Actual owner permissions, Firebase costs, hardware acknowledgment, and static fallback availability depend on deployment. The modal's memory cache does not persist across full reloads or cover all other pages' reads.
