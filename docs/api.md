# APIs and SDK Operations

## Transport

There are no custom HTTP API endpoints or server actions in this repository. Browser operations use Firebase JS `9.10.0`; the Pi uses Firebase Admin. The functions below are the application's integration surface, not invented REST URLs. Firebase errors are SDK rejections/listener error callbacks, not application HTTP response codes. Actual permission enforcement depends on deployed rules, which are not checked in.

## Authentication Operations

| Function | Input | Result | Error handling | Page |
| --- | --- | --- | --- | --- |
| `signInWithEmailAndPassword(auth, email, password)` | Email/password fields | User credential; auth-state event | Wrong-password special message; otherwise Firebase message | Login |
| `createUserWithEmailAndPassword(auth, email, password)` | Matching password fields | Auth user, then `users/<uid>` creation | Firebase auth error shown; nested Firestore write lacks a separate UI catch | Signup |
| `sendPasswordResetEmail(auth, email)` | Email field | Reset email request resolves | Error code/message shown | Reset password |
| `updateProfile(currentUser, {displayName})` | Username field; signed-in Auth user | Updates Firebase Auth profile | Error panel attempted; typo prevents intended text assignment | Profile |
| `getAuth().signOut()` | Current Firebase session | Auth-state change and login navigation | Rejection callback has no visible message | Shared off-canvas menu |

## Firestore Workflows

| Operation / owning function | Input and target | Output / side effect | Failure behavior |
| --- | --- | --- | --- |
| `systemBoard.loadBoardSetup()` | `getDoc(boardSetup/<board>)` | Nested `boardSetup` rendered; missing doc falls back to `/hold_setup.json` | Main board displays load error; setup implementation has weaker catch handling |
| `systemBoard.loadRoute(routeId)` | `getDoc(routes/<routeId>)` | Updates selected state, route cache, display, optionally lighting command | Missing doc has no dedicated UI error; async path lacks catch |
| `RouteListManager.ensureRouteCache()` | Live query `routes where napakboard == board` | Shared sorted in-memory route list | Logs and clears cache on listener failure |
| `RouteListManager.loadUserTodos()` | Live document `users/<uid>` | Shared TODO IDs; refresh notification | Logs and clears TODO cache |
| TODO button | `setDoc(users/<uid>, {todos: arrayUnion(...) or arrayRemove(...)}, {merge:true})` | Adds `{routeId, date}` or removes matching cached entries | Logs; no read-before-write; requires loaded user cache |
| `RouteEditor.validateAndSave(params)` | Name, setter/UID, grade index, angle, selected hold types | `addDoc(routes, {...})`; optional mirrored second route | Client alerts on missing fields/holds; asynchronous writes lack catch |
| Route-list Archive | `updateDoc(routes/<id>, {archived:true})` | Soft archive; listener removes visible route | Owner-only UI; no dedicated write error panel |
| `RouteTicker.open()` and confirmation | Route/user IDs; ascent type, votes, comment | Updates `routes/<id>` ticks/approvals/tickLog and `users/<uid>` ticks/TODOs | Catch reports tick update failed and re-enables buttons; multiple reads/writes, no transaction |
| Board setup Save | `updateDoc(boardSetup/<board>, {boardSetup: globals.boardSetup})` | Persists visual hold layout | Requires existing doc; alert is not confirmation of completed write |
| Board setup Nuke | All `routes` documents, filtered locally by board | `archived:true` on matching docs | Reads all boards; updates are not collectively awaited |
| Training editor Save | Selected existing route and complete groups | `updateDoc(routes/<id>, {training:true, lightingOrder:[{holds}], trainingUpdatedAt:Date})` | Inline error; controls restored |
| Training editor Remove | Selected route; explicit confirmation | `training:false`; deletes sequence/timestamp; removes training tags only | Preserves route/other tags; inline error; controls restored |
| Profile TODO load | `users/<uid>` then unique referenced `routes/<id>` | Names grouped by board | Missing refs display missing-route text; catch displays load failure |
| History load | Current-board routes listener and `getDoc(users/<uid>)` | Date-grouped ascent history and score | Missing ticks only logged; route-loading race exists |

All browser Firestore operations rely on the Firebase session and deployed rules. There is no server-side validation layer in these workflows. Fields and relationships are defined in [database.md](database.md).

## Normal Lighting Command

`systemBoard.updateBoardData()` writes `current/currentRoute_<boardId>` using `setDoc` when `globals.lightsOn` is true.

| Field | Input |
| --- | --- |
| `routeData.holdSetup` | Map of selected stored hold IDs to `intermediate`, `foot`, `start`, or `top` |
| `routeName` | Selected name or unsaved-route label |
| `routeId` | Selected route ID or the code's sentinel string |
| `boardId` | `globals.board` |

No direct response from the Pi is returned to this call. The Pi's `routeDoc.onSnapshot` reads the payload, updates status, interrupts active training if applicable, and calls `lit(routeData)`. Setup hold clicks use the same document to light one intermediate hold. Pi listener/status errors are logged.

## Training Command and Status

The session view's `writeSessionState(nextState)` merges `trainingSessions/<boardId>`:

- `boardId`, `mode: 'training'`, generated `sessionId`, `updatedBy: 'client'`, and `status`.
- `startDelaySeconds: 5`, `holdIntervalSeconds`, `restSeconds`.
- `routeIds` and full route snapshots in `routes`: `routeId`, `routeName`, `holdSetup`, `lightingOrder: [{holds: [...]}]`. START companions are retained in the command even though excluded from phone timed steps.
- `currentRouteIndex`, `currentStepIndex`, `updatedAt: serverTimestamp()`.

Accepted client status values are `countdown`, `running`, `resting`, `paused`, `stopped`, and `complete`. `handleTrainingSession()` ignores non-training mode. New sessions load missing route snapshots if necessary; same-session updates resume a paused run or leave its timers intact. The Pi uses a hardcoded five-second countdown, not the command's delay field.

The Pi's `syncBoardStatus(extra)` merges `boardStatus/boardStatus_<boardId>` with board/route/saver metadata, `lastSeenAt: Date.now()`, and training status fields. The phone filters acknowledgment by `trainingSessionId`. Preparation errors include `invalid-training-session` and `training-route-load-failed`; completion is reported as `training-complete`, while client Stop/Complete and route interruption produce their corresponding reason strings. Status writes return no application-level response object.

Normal-route interruption also merges the training command with `status:'stopped'`, `updatedBy:'raspberry'`, `stopReason`, and a timestamp. The phone handles that event without writing Stop back. Status reads/listeners can fail independently of successful LED rendering.

## Related Code

- [Route/tick/list SDK operations](../js/components/system_board/route-ticker.js), [route editor](../js/components/system_board/route-editor.js), [route cache](../js/components/system_board/route-list.js).
- [Normal lighting writer](../js/components/system_board/system_board.js), [setup writer](../js/components/board_setup/board_setup.js).
- [Training command writer](../js/templates/page_training-session.js), [sequence persistence](../js/templates/page_training-route.js), [Pi command handlers](../js/raspberry/index.js).
