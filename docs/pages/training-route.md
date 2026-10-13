# Training Sequence Editor

## Purpose
Add/edit/remove a lighting sequence on an existing climbing route without deleting the climbing route itself.

## Route
`/projects/napakboard/#/trainingRoute`, key `trainingRoute`; opened from Training's Create route footer action. Despite the label, this view selects existing routes; it does not create new route documents.

## Access
Normally signed in. Save and Remove explicitly require a current Firebase user; no board-owner or route-setter authorization check is implemented in this page.

## User Flow
Choose an existing route, add/remove its non-fixed holds from the order, move/group sets, and preview. Save becomes enabled when every route hold is sequenced. Training routes appear first in the selector, alphabetical within that group, followed by alphabetized normal routes. Remove training sequence asks confirmation and clears training metadata while keeping the route.

## UI / Components
- `BoardRenderer` receives Firestore board setup plus only the selected route's interactive IDs. Click/keyboard actions toggle sequencing; stored IDs do not change.
- Order list renders START, timed middle sets, and END. Linked holds are nested under one set and share a visual boundary. Display coordinates are converted to bottom-up row numbering.
- Move/group/ungroup controls mutate local `lightingGroups`, then update grid order markers and labels. START/top sets cannot move or lose their fixed holds.
- Preview owns its sequence/index/deadline/timer and temporarily hides future holds. Save/Remove own saving/disabled state and selected-route metadata.

## Data
Reads current-board routes through a live query and `boardSetup/<board>` through a one-time document read; loads SVG artwork with the renderer's cached promise. Normalization collects all START holds into the first set and all top holds into the final set, preserving saved companions. Saved missing middle holds remain unsequenced rather than being automatically added.

## User Actions
- Clicking a middle/foot hold adds it before END or removes it from its existing set. Fixed start/top holds cannot be toggled out.
- Group with previous merges compatible adjacent sets. A first middle set can join START; END can join the preceding middle set. START cannot merge directly with END.
- Ungroup splits ordinary sets; for pinned sets it detaches companions while preserving fixed holds together at the correct boundary.
- Play sequence is browser-only visual playback: ordinary sets last 1s, top-containing sets 3s. Stop restores all holds. Completion restores the view and disables Stop.
- Save updates training marker/order/date. Remove deletes sequence/date, clears the marker and case-insensitive training tags, and preserves all other route fields/tags.

## API / Backend Dependencies
| Function / SDK call | Input -> output | Errors |
| --- | --- | --- |
| Routes `onSnapshot` | Board-ID query -> selector route objects | Inline route-load error |
| Setup `getDoc` + SVG GET | Board ID/assets -> board layout | Missing setup and artwork failures reported |
| Save `updateDoc(routes/<id>)` | `training:true`, complete `[{holds}]`, Date -> completion | Inline error; controls restored |
| Remove `updateDoc(routes/<id>)` | `training:false`, field deletions, filtered tags -> completion | Sign-in check, confirmation cancellation, inline failure |

Preview does not invoke the Pi. Actual training playback is handled by the session page and [API command channel](../api.md).

## Database
Mutates `routes.training`, `routes.lightingOrder`, `routes.trainingUpdatedAt`, and training entries in `routes.tags`. No new document, ascent record, or hardware command is created here. Coordinate relationships come from route `holdSetup` and visual board setup.

## State & Side Effects
Uses local selected route, board data/artwork readiness, groups, saving flag, preview state and 100ms preview checks. Grid IDs, order datasets, ARIA labels, CSS classes, and preview scrolling are updated. Route selector is locked during saves. Page removal stops preview and unsubscribes its route listener. New route snapshots refresh selector/selected metadata but do not always rebuild unsaved groups.

## Validation & Error Handling
Save/preview require a selected route, holds, and no missing hold IDs. Save checks Auth. Remove requires an existing sequence/marker, Auth, and native confirmation. Completion disables preview Stop. There is no server schema enforcing these checks in the inspected checkout.

## Permissions & Security
All route mutation permission depends on deployed Firestore rules. Selecting a route is not proof of ownership. Remove is intentionally a metadata edit, not route deletion. Preview is safe from hardware mutations.

## Edge Cases
All fixed holds of each type are grouped even when saved individually. Presentation labels initially lack board height until setup loads, then are rebuilt. Training uses object-type holds too, but the underlying board visual code sometimes treats object types as intermediate. Live remote edits and local unsaved sequence changes can diverge.

## Related Code
[page_training-route.js](../../js/templates/page_training-route.js), [board-renderer.js](../../js/components/system_board/board-renderer.js), [training styles](../../css/training.css), [session serialization](../../js/templates/page_training-session.js), [Pi normalization](../../js/raspberry/index.js).

## Notes / Unknowns
The editor, session, and Pi have separate grouping/timing implementations. A successful visual preview does not verify hardware wiring or deployed controller compatibility.
