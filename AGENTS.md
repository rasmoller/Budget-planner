# Project Instructions

## Development Flow

Follow the development flow in [`docs/development-flow.md`](docs/development-flow.md) for all work in this repository.

Before starting a new session or task:

1. Read `docs/roadmap.md` to see what is being worked on and what is next.
2. Follow the workflow: pick work from the roadmap (ongoing tasks are highest priority), work on a feature branch, write tests, merge into `Staging`, and release `Staging` to `main`.
3. After finishing a feature, update the roadmap accordingly.

## Workflow

When starting a new session, always:

1. Read `docs/roadmap.md` to understand where the project is and what needs work.
2. Cross-reference `docs/test-plan.md` — if there are planned tests for the area you're working on, implement or update those tests.
3. Read `docs/project-plan.md` for the overall goal and feature set.
4. Before implementing anything new, check for unfinished work, potential bugs, or missing tests in the area. Prioritize fixing those over new features.

## Key Documents

- `docs/roadmap.md` — project progress, upcoming features, known gaps
- `docs/project-plan.md` — overall project goal, features, and pages
- `docs/test-plan.md` — test status and next steps
- `docs/charts-rework-plan.md` — future charts page rework
- `docs/development-flow.md` — git workflow for features, tests, and releases
- `TODO.md` — feature backlog

## Priority Order

1. Fix bugs and known gaps (see roadmap)
2. Write missing tests (see test-plan)
3. Implement planned features (see roadmap / TODO.md)
4. Propose new features only after the above is exhausted

## i18n Rules

- All user-visible text must go through `$t.*` from `$lib/i18n` — never hardcode display strings.
- Code identifiers, logs, comments, and internal values can stay in English.
