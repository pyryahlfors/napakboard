# Profile

## Purpose
Change the user's display name and view TODO routes grouped by board.

## Route
`/projects/napakboard/#/profile`, route key `profile`; opened from the shared menu.

## Access
Normally signed in. The constructor immediately uses `currentUser.displayName`; there is no independent page guard or role restriction.

## User Flow
Edit the display name and submit Update, or return to Board. The TODO section loads the user document, resolves referenced routes, and displays names under sorted board headings.

## UI / Components
The profile form owns a username DOM input and success/error containers. The TODO section receives grouped route-name strings, not clickable route controls. A footer navigates to Board. Opening Profile closes the off-canvas menu.

## Data
Initial name comes from Firebase Auth. `users/<uid>.todos` supplies route IDs; unique IDs are fetched from `routes`, then original TODO entries are grouped by `napakboard`. Board headings are alphabetical. Missing routes show a fallback name and unknown board.

## User Actions
- Update calls Firebase `updateProfile` and updates shared display-name state.
- Cancel, success link, and footer navigate back to Board.
- Viewing TODOs performs reads only; this page has no TODO delete/load action.

## API / Backend Dependencies
`updateProfile(currentUser, {displayName})` resolves with the updated Auth profile; failure appends an error panel, but a property typo prevents the intended error text. `getDoc(users/<uid>)` followed by `Promise.all(getDoc(routes/<id>))` returns snapshots; load failures become an inline TODO error.

## Database
Reads `users.todos` and route names/board IDs. Display-name mutation does not write `users` or retroactively update stored route setter/comment names.

## State & Side Effects
Updates `user.name.displayName` and assigns `user.name` again to notify the menu. TODO data is loaded once per page construction and is not subscribed to the route-list modal's shared TODO cache.

## Validation & Error Handling
No username length/content constraint is implemented. Empty TODOs and missing routes have explicit display states. The no-user check exists in TODO loading, not the profile constructor.

## Permissions & Security
Auth restricts profile updates to the current user. Firestore user/route reads depend on unknown deployed rules. There are no administrative profile actions.

## Edge Cases
Duplicate TODO references are fetched once but can still appear more than once because rendering walks the original TODO array. A removed route remains a visible missing reference.

## Related Code
[page_profile.js](../../js/templates/page_profile.js), [user.js](../../js/shared/user.js), [off-canvas menu](../../js/templates/partials/section_otc.js).

## Notes / Unknowns
`errorMessage.innerHMTL` is a typo; Cancel has no explicit button type in the form. Actual Firestore authorization and profile-update policy are external configuration.
