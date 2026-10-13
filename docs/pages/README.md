# Pages

The browser base path below is `/projects/napakboard/`, matching checked-in asset URLs. Registered route keys come from `js/main.js`; routes are not filesystem or server API routes. Normal navigation uses `#/key`, except Login preserves the current hash. Startup sends unauthenticated users to Login regardless of another hash; `?setup` overrides the signed-in initial view. There is no `hashchange` handler or per-route authorization guard.

| Page | Route / key | Purpose | Authentication | Main functionality |
| --- | --- | --- | --- | --- |
| [Board](board.md) | `#/board` (`board`; signed-in default) | Climb and manage normal routes | Normally signed in | Holds, route-list/save/clear/tick modals, TODOs, votes/comments, lighting |
| [Board setup](setup.md) | `#/setup` (`setup`) or exact `?setup` | Configure visual holds | Normally signed in; owner-only menu link, no page guard | Hold geometry/transforms, save, one-hold LED preview, bulk archive |
| [Login](login.md) | Base/login view (`login`; existing hash preserved) | Authenticate | Public entry | Email/password, signup/reset navigation |
| [Profile](profile.md) | `#/profile` (`profile`) | Account display name and TODO summary | Assumes signed-in user | Auth profile update; TODO routes grouped by board |
| [History](history.md) | `#/history` (`history`) | View recorded ascents | Assumes signed-in user | Current-board history, dates, counts, ascent score |
| [Training session](training.md) | `#/training` (`training`) | Run a route queue on LEDs | Normally signed in | Route selection/order, delays, countdown acknowledgment, pause/resume/stop |
| [Training sequence editor](training-route.md) | `#/trainingRoute` (`trainingRoute`) | Define sets of holds | Normally signed in; explicit Auth checks on writes | Sequence editing/grouping, preview, save/remove training metadata |
| [Reset password](reset-password.md) | `#/resetPassword` (`resetPassword`, via Login link) | Request reset email | Public in-app view | Firebase password-reset request |
| [Signup](signup.md) | `#/signup` (`signup`, via Login link) | Create account | Public in-app view | Auth signup and user document creation |
| [Board selection](board-select.md) | `#/boardSelect` (`boardSelect`) | Switch active wall | Normally signed in | Live board list; remember board ID locally |
| [Animation tester](animation-tester.md) | `/projects/napakboard/js/raspberry/animation-tester.html` | Simulate animations | No Auth integration | Canvas LED preview, dimensions, text, start/stop/random/clear |

All registered hash URLs are relative to the base path. The animation tester is standalone and is not registered in `globals.routes`.

Route-list, save, clear, tick, and hold-setup dialogs are documented under their owning pages rather than invented as additional routes. Browser history/deep-link behavior and backend enforcement limitations are described in [architecture](../architecture.md) and [authentication](../authentication.md).
