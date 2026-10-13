# Authentication and Authorization

## Authentication

`js/shared/user.js` initializes Firebase from a literal `firebaseConfig`. Browser pages import Firebase Authentication `9.10.0` directly from the Google CDN. Implemented flows are email/password signup and login, password-reset email, display-name updates, and logout. No OAuth providers, email-verification workflow, MFA, custom session endpoint, or application-issued JWT is implemented here.

Firebase owns token/session persistence; no explicit browser auth-persistence mode is configured. `localStorage.napak_auth_hint` is only a fast UI hint. Startup can initially render a signed-in view from that hint before `onAuthStateChanged` confirms a real user, so it must not be treated as a permission boundary.

Signup creates the Firebase Auth user and then writes `users/<uid>` with email. These are separate operations. Profile changes update Auth `displayName`, not a Firestore username field. Reset email content/delivery and the actual reset-password action page are Firebase configuration, not checked-in application code.

## Routing and Access

`main.js` handles initial/auth-event redirects. Without a signed-in state it chooses Login; with one it chooses the hash route or Board, with `?setup` overriding the route. `route(name)` itself has no authentication or role check. Signup and reset views are normally reached through Login links rather than unauthenticated cold hash URLs.

Most data pages assume `getAuth().currentUser` is present. The profile constructor, history flow, and some sidebar/list callbacks dereference it directly. The training editor explicitly checks the current user for Save and Remove; the training session relies on the normal navigation flow and Firestore permissions.

## Ownership and UI Permissions

The code identifies a board owner by comparing `currentUser.uid` to `globals.boardSetup.owner`. This controls the sidebar Board Setup link, archive controls in the route list, and extra status details. No role table, global admin flag, server middleware, or inspected backend role-enforcement layer exists. `setterID` identifies the route setter but is not used as a general route-edit permission guard.

Setup can also be invoked through routing/query state. Its mutation functions do not repeat a board-owner authorization check. Sequence editing/removal similarly does not inspect setter/owner IDs. These operations are safe only to the extent deployed Firestore rules enforce appropriate permissions.

## Firestore and Raspberry Trust Boundary

The README includes illustrative rules allowing reads/writes when `request.auth != null` for every document. There is no actual `firestore.rules` or Firebase deployment configuration to prove these are the production rules. Do not assume user-document isolation, board ownership, or training-command authorization is enforced.

The Pi initializes Firebase Admin with `cert(this.fssa)` from embedded service-account fields. Its checked-in private-key value is incomplete; credentials in a working deployment cannot be determined here. Admin SDK access uses service-account privileges rather than browser security rules. `applicationDefault` is imported but not the selected credential mechanism.

## Security Considerations

- Never serve a deployed controller file containing a real private key from the static site. Browser Firebase configuration is different from a service-account private credential, but no actual values are reproduced in these docs.
- Treat route/status/profile strings rendered with `innerHTML` as potential injection inputs; not all rendering uses the safer `dce()` text-node path.
- Normal/training board control is a shared Firestore document with no client command lock or per-user authorization check in the Pi handler.
- Logout clears the route/TODO cache through its auth observer. Other views have less consistent listener cleanup.
- Actual authorized domains, password policy, email templates, security rules, service-account permissions, and App Check configuration are unknown.

## Related Code

[User/session state](../js/shared/user.js), [startup redirects](../js/main.js), [router](../js/shared/route.js), [off-canvas owner controls](../js/templates/partials/section_otc.js), [route archive UI](../js/components/system_board/route-list.js), [Admin credentials](../js/raspberry/js/firestore.js).
