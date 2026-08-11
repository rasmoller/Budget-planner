# Development Flow

This document describes how features move from idea to release in this project. It applies to all work done in this repository. Read `ROADMAP.md` before starting a new session.

## 1. Picking work — the roadmap

- All upcoming work lives in [`ROADMAP.md`](../ROADMAP.md).
- Features are picked from the roadmap. **Focus on newer tasks; ongoing tasks are the highest priority.**
- Before picking a new feature, check for unfinished work, known bugs, or missing tests in the area you are working on and fix those first.

## 2. Branches — one branch per feature

- Every feature is developed on its own branch: `feat/<short-description>` (e.g. `feat/delete-budget-items`).
- Some closely-related features may be combined on a single branch if they belong together and are small.
- Work directly on the branch; do not commit to `main` or `Staging` outside of merges.

## 3. Merging — features flow into `Staging`

- When a feature branch is done, it is merged into `Staging` (via pull request).
- **Features should have tests.** A feature is only done when its tests exist and pass.
- Before merging:
  - All tests pass (`npm test`).
  - Type checking passes (`npm run check`).
  - The branch is up to date with `Staging`.

## 4. Release — `Staging` flows into `main`

- On release, `Staging` is merged into `main`.
- A release only happens when:
  - **All tests pass.**
  - **The test deployment passes** (the deployed preview build runs without errors).

## 5. Verification commands

| Command           | Purpose                                  |
| ----------------- | ---------------------------------------- |
| `npm test`        | Run the test suite (Vitest)              |
| `npm run check`   | Type check + Svelte checks               |
| `npm run build`   | Production build via Wrangler/Cloudflare |
| `npm run preview` | Build and preview locally via Wrangler   |

## Definition of done

- [ ] Feature picked from the roadmap (or approved as a new feature)
- [ ] Implemented on a dedicated feature branch
- [ ] No raw text in HTML, there should be i18n inserts
- [ ] Tests added and passing
- [ ] `npm run check` passes
- [ ] Merged into `Staging`
- [ ] Roadmap updated (feature moved out of "Currently working on")
