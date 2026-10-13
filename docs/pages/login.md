# Login

## Purpose
Authenticate an existing user before normal board workflows.

## Route
Logical key `login`. Startup displays this view at `/projects/napakboard/` for unauthenticated users. `route('login')` does not change the hash, so a previously requested `#/board` or another hash can remain visible.

## Access
Public entry view. Already signed-in users normally enter Board or the recognized hash view; the router itself does not prevent rendering Login.

## User Flow
Enter email/password, submit Login, then follow the Auth-driven redirect. Links open Signup or Reset Password in the app.

## UI / Components
Logo and `napak-login` form hold email/password input state. The email field has username autocomplete; password uses current-password autocomplete. The error container displays Firebase failures. Links call the shared router.

## Data
Reads the input fields and Firebase Auth response. It does not read a Firestore user profile during login. User UID/display name are copied into the shared `user` Proxy.

## User Actions
- Submit invokes Firebase email/password sign-in, then updates the login state.
- Create account navigates to `signup`; Forgot password navigates to `resetPassword`.

## API / Backend Dependencies
`signInWithEmailAndPassword(getAuth(app), email, password)` is a Firebase SDK call, not a local HTTP endpoint. Input is the two strings; output is a UserCredential. Wrong-password receives a special message; other errors display Firebase's message. `main.js` also reacts to `onAuthStateChanged`.

## Database
No direct Firestore operation. The signed-in Auth UID later identifies `users/<uid>` and route votes/ticks.

## State & Side Effects
Sets `user.login.isLoggedIn`, `user.name.id`, and display name; touches `user.login` to trigger observers. The shared auth listener persists the local login hint and chooses navigation. Existing hash state may determine the next view.

## Validation & Error Handling
No custom email format or password-length validation is implemented in the form. Firebase validates credentials. Errors are logged and rendered with `innerHTML`.

## Permissions & Security
Login is not a data-permission boundary; Firestore rules must enforce access. The local hint cannot authenticate a user. No MFA/email-verification flow is implemented.

## Edge Cases
Cold unauthenticated `#/signup` or `#/resetPassword` goes to Login first. A stale local login hint can briefly choose an auth-dependent view before Firebase confirms the session.

## Related Code
[page_login.js](../../js/templates/page_login.js), [main.js](../../js/main.js), [user.js](../../js/shared/user.js), [route.js](../../js/shared/route.js).

## Notes / Unknowns
Firebase password policy, authorized domains, persistence settings, and production account controls are not checked in. See [authentication](../authentication.md).
