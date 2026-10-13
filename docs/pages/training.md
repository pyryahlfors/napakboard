# Training Session

## Purpose
Select and run a queue of saved training routes on the optional physical board.

## Route
`/projects/napakboard/#/training`, key `training`; opened from the shared menu. Footer links exit to Board or open the sequence editor.

## Access
Normally signed in. No board-owner restriction or command lock is checked. Writes require deployed Firestore permissions; a compatible running Pi is required for acknowledgment and physical playback.

## User Flow
Choose training routes, reorder/remove queue entries, set rest and hold delay, then Play. The board displays a five-second progress bar and prepared START holds. The phone stays at Starting until matching board status reports running. Pause/Resume and Stop control the shared session. Completion disables Stop; settings can be changed for another run.

## UI / Components
| Component | Data/state | Action |
| --- | --- | --- |
| Available route list | Current-board routes filtered by training marker and archive state, alphabetized | Toggle membership by route ID |
| Queue rows | Ordered IDs, per-route progress map, active route/step | Move/remove before playback; render progress |
| Settings controls | Rest seconds, decimal hold interval | Validate and persist with command transitions |
| Play/Pause/Stop + status | `sessionState`, saving, timer deadlines, paused phase | Start command, resume/pause, stop/reset, diagnostics |
| Footer/ticker | Navigation/title only | Exit or edit sequences; no physical Stop on navigation |

## Data
Live query reads routes for the board. Training means `training === true` or a case-insensitive training tag; archived routes are excluded. A one-time session read restores valid settings only. Session/status listeners read `trainingSessions/<board>` and `boardStatus/boardStatus_<board>`.

Complete saved groups are serialized into route snapshots. START sets, including companions, are excluded from the phone's timed-step count but retained in the command. Top sets receive a phone duration of at least 3180ms, matching the current 180ms board zoom plus 3000ms fully lit time. Other sets use the configured interval.

## User Actions
- Play generates a unique session ID and merges a complete `countdown` command.
- Matching `running` status starts phone progress. Later phone timers advance local steps/routes/rests and write status transitions.
- Pause stores remaining phase time and writes `paused`; Resume restores deadlines and writes the paused phase.
- Stop clears timers/progress, sets stopped state, and writes a stopped command.
- Queue changes/settings are disabled during active phases or writes. A route ID can occur only once in the queue.

## API / Backend Dependencies
`writeSessionState` uses `setDoc(...,{merge:true})` with board/session IDs, route snapshots, intervals, indexes, and `serverTimestamp`. Success returns a boolean internally; failure displays a connection error. Pi `handleTrainingSession` consumes this document; `syncBoardStatus` supplies acknowledgment/error metadata. No browser-to-Pi HTTP call exists. Exact fields/errors are in [api.md](../api.md).

## Database
Reads `routes` and the board's shared command/status documents. The training session document stores current settings/command snapshots, not a persistent log of completed sessions. `updatedBy:'raspberry'` Stop from normal-route interruption is handled without an echo write.

## State & Side Effects
Local state includes queue IDs, progress map, session ID, route/step indexes, phase durations/deadlines, and paused remaining time. A 100ms clock updates running/rest phases. A 12s diagnostic timer reports no acknowledgment or stalled status. Page removal unsubscribes three listeners and clears the diagnostic timer; the session clock stops when it next sees a disconnected page. It does not send Stop automatically.

## Validation & Error Handling
Rest input accepts 0-3600 seconds. Hold delay must parse as 1-60 seconds, allowing comma or dot decimals. Every selected route needs a non-empty timed sequence. Errors cover route loading, command saving, board-status access, invalid Pi route preparation, and route-load failure. Stop is disabled outside active phases, including completion.

## Permissions & Security
Any client with actual database write permission can overwrite this board's shared session. UID/account is not included as a command owner. Auth navigation and button locks are not an authorization boundary.

## Edge Cases
Leaving/reopening restores settings, not the old queue/run. The Pi can keep training after the page disappears. Multiple phones can overwrite commands. Live route snapshots can remove selected routes while running. The phone only uses board status to start the first route, so later progress can drift. The Pi supplies fallback unordered holds that the phone's saved-order logic does not necessarily count.

## Related Code
[page_training-session.js](../../js/templates/page_training-session.js), [Pi scheduler](../../js/raspberry/index.js), [LED renderer](../../js/raspberry/js/systemboard.js), [sequence editor](../../js/templates/page_training-route.js).

## Notes / Unknowns
Actual running Pi version/network status cannot be established from source. Board IDs/projects must match independently configured browser/Pi settings. The sidebar's status age is not a dedicated heartbeat. Physical timing and deployed permissions require real-device validation.
