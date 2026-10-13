# Development and Deployment

## What Is Available

The browser app is checked-in HTML/CSS/JS with CDN Firebase imports. There is no frontend package installation, bundle/build step, package script, automated test suite, lint/typecheck configuration, Dockerfile, CI workflow, Firebase emulator configuration, or migration tool in this repository.

The Raspberry directory has a `package-lock.json` whose `packages` map is empty and no `package.json`. Imports establish the need for `firebase-admin` and `rpi-ws281x`, but versions, install scripts, Node engine, and ES-module configuration are not reproducibly specified. There is no verified `npm install`, `npm test`, `npm run build`, or `npm run lint` project command to document.

## Run the Browser Locally

In the current parent kiinto.com workspace, the validated static-server invocation is:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Run it from the directory that contains `projects/napakboard`, then open `http://127.0.0.1:8000/projects/napakboard/`. This is a Python standard-library server invocation, not a repository package script. The legacy README's `python3 -h http.server` text is not a valid equivalent.

An independently cloned NapakBoard repository needs hosting/path arrangement that serves it under `/projects/napakboard/`; the absolute asset paths do not automatically adapt to a root-mounted clone. The `/hold_setup.json` fallback also requires an appropriate root file/path. Prefer a configured Firestore board with complete hold data rather than assuming the checked-in characteristics-only JSON is sufficient.

Configure the intended Firebase project in `js/shared/user.js`, enable Email/Password Auth and Firestore, and verify actual access rules before testing mutations. The README's permissive sample is not evidence of secure production rules. No emulator mode is configured; ordinary browser use targets the configured real project and can generate reads/writes.

## Hardware Controller

The entry point is `js/raspberry/index.js`, not browser `js/main.js` or `index.html`. It imports `./js/systemboard.js`, the Admin adapter, and animation modules. Preserve those relative paths and place `.env` beside the controller entry point. Match board ID and Firebase project to the browser.

The checked-in certificate is incomplete. Installing dependencies, providing valid credentials securely, enabling ES-module execution on the chosen Node runtime, obtaining hardware permissions, and arranging service restart are required deployment tasks, but this repository does not define their actual commands or supervisor. Do not assume a systemd unit, PM2 app, container, or Node version exists.

The only tracked copy command is the example in `js/raspberry/howto.md`:

```sh
scp -r animations napak@raspberrypi.local:/home/napak/js/
```

It copies an `animations` directory from the command's working directory. It is an example host/account/path, not a complete installation or service-restart procedure. The `/home/napak/index.js` layout used during development discussions is not provisioned by checked-in automation.

## Validation

No runnable project test suite is present. Useful checks actually used while inspecting this checkout include:

```sh
node --input-type=module --check < js/templates/page_training-session.js
node --input-type=module --check < js/templates/page_training-route.js
node --input-type=module --check < js/raspberry/index.js
git diff --check
```

Run these from the NapakBoard root. They check syntax/patch whitespace only, not Firebase permissions, UI correctness, or GPIO behavior; they are toolchain commands, not package scripts. Ad hoc mocked browser/controller tests used during prior changes are not committed as a repeatable suite.

Manual validation should cover login/logout, board selection, normal-route creation/loading/ticking/TODOs, setup save/archive, grouped sequence save/remove, preview completion, and multi-route training pause/rest/stop. The standalone tester is at `/projects/napakboard/js/raspberry/animation-tester.html`; it is a visual simulation, not a hardware integration test.

## Deployment and Keeping Docs Current

Deploy changed browser HTML, JS, CSS, fonts, and images to the static host. Query-string versions in entry points/imports are manual cache busting; changing only a deeply imported module can leave a stale browser module. Do not publish real Admin credentials with browser assets.

Deploy hardware changes separately and restart the actual controller process using the target installation's procedure. A process continues executing its loaded code after files are copied; neither phone asset deployment nor changing `systemboard.js` alone updates the controller entry point.

When routes change, update [pages/README.md](pages/README.md) and the corresponding page documents. For data fields, timing, configuration, and authentication changes, update the matching reference document and cross-check call sites. Treat code as authoritative, distinguish samples from production configuration, and never paste credentials into docs.

## Related Code

[Legacy README](../README.md), [copy example](../js/raspberry/howto.md), [empty lockfile](../js/raspberry/package-lock.json), [browser entry point](../index.html), [Pi entry point](../js/raspberry/index.js), [configuration reference](configuration.md).
