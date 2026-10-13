# Signup

## Purpose
Create an email/password account and its initial Firestore user document.

## Route
`/projects/napakboard/#/signup`, route key `signup`. Normally reached through Login; unauthenticated cold hash navigation initially displays Login instead.

## Access
Public in-app view. Firebase determines whether the account can be created. No roles are selected.

## User Flow
Enter email, password, and repeated password; submit. Successful account creation starts a separate user-document write, then shows an alert and reloads the base location. Auth-state events can also trigger navigation.

## UI / Components
Logo, `napak-login` signup form, three inputs, error panel, Create account button, and return-to-login link. Input state is held directly in DOM controls, not a form-state library.

## Data
Firebase Auth returns email and UID. The shared user state receives those values and an `Anonymous` display string; the code does not call `updateProfile` to persist that string to Auth here.

## User Actions
Create account performs Auth signup then `setDoc(users/<uid>, {email})`. Return to login assigns an empty document location and reloads.

## API / Backend Dependencies
`createUserWithEmailAndPassword(auth, email, password)` returns UserCredential or a Firebase auth error. `setDoc(doc(getFirestore(), 'users', uid), {email})` creates/replaces the user document and returns completion, not a custom response body. Auth errors appear inline; the nested asynchronous Firestore operation has no separate visible failure handling.

## Database
Creates `users/<Auth uid>` with `email`. Ticks/TODO arrays are added later by other workflows. Auth signup and document creation are not transactional.

## State & Side Effects
Updates `user.name`, while the global Firebase auth listener also reacts to account creation. The success path alerts and reloads rather than keeping a dedicated account-created view.

## Validation & Error Handling
An explicit password-match check blocks mismatches. Other email/password validation is delegated to Firebase; inputs do not define application password rules. Firebase messages are inserted into the error panel.

## Permissions & Security
No email-verification step or board membership is provisioned. The user document requires appropriate Firestore write permission; actual rules are unknown.

## Edge Cases
Auth creation can succeed while the user document write fails. The shared auth redirect can happen before the signup view's nested work finishes. Existing-email and weak-password errors come from Firebase.

## Related Code
[page_signup.js](../../js/templates/page_signup.js), [user.js](../../js/shared/user.js), [main.js](../../js/main.js).

## Notes / Unknowns
Signup email delivery, allowed account policy, and missing-document recovery are not defined in this repository.
