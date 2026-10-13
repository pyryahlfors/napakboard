# Reset Password

## Purpose
Request Firebase's password-reset email for an account.

## Route
`/projects/napakboard/#/resetPassword`, route key `resetPassword`. Reached from Login; cold unauthenticated hash navigation initially returns to Login.

## Access
Public in-app view. No route ownership or role requirement.

## User Flow
Enter an email, submit Reset, and follow the instructions delivered by Firebase. The return link calls `route('login')`.

## UI / Components
Logo, `napak-login` reset form, email input, success/error panels, Reset button, and Login link. DOM inputs manage the request data; panels receive the SDK result.

## Data
Only the email input and Firebase Auth result are used. No routes or user documents are read.

## User Actions
Reset calls `sendPasswordResetEmail`; returning to Login replaces the current page without clearing the existing hash.

## API / Backend Dependencies
`sendPasswordResetEmail(getAuth(), email)` returns a promise indicating the request result. Success displays an email-instructions message; errors display Firebase code and message. There is no custom mail API or reset-token endpoint in this codebase.

## Database
No direct Firestore operation or application token model.

## State & Side Effects
The request can send external email. Success and error DOM containers are not explicitly cleared between repeated submissions. The shared router manages navigation.

## Validation & Error Handling
No explicit local email-format rule is implemented. Firebase handles account/email validation and delivery errors.

## Permissions & Security
The page does not reveal or set a password. Actual account-enumeration protections and email templates are Firebase settings that cannot be verified here.

## Edge Cases
The Login anchor has a legacy hash value, but its click handler explicitly invokes the router. A requested reset email does not prove delivery to the inbox.

## Related Code
[page_reset-password.js](../../js/templates/page_reset-password.js), [page_login.js](../../js/templates/page_login.js), [route.js](../../js/shared/route.js).

## Notes / Unknowns
The reset-link landing page, action URL, token expiry, and mail template are not implemented or configured in checked-in files.
