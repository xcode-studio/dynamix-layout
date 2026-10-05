# v1 fixtures

Recorded from the v1 engine (`DynamixLayoutCore`, core 1.x) before it was
removed. They are the reference v2 is checked against and must not be
regenerated.

- `scenario-*.json`: 16 seeded scenarios of 30 UI-reachable operations each
  (moves, splitter drags, fold, maximize, resize), with the canonical tree,
  every tabset and splitter rect, and the saved v1 layout every few steps.
  Recorded by `test/characterization/v1.test.ts` and `v1-driver.ts`
  (commit `dc654bd`).
- `default-layouts.json`: default layouts of 1–9 tabs at five container
  sizes.
- `drop-previews.json`: outputs of the v1 drop-preview helpers for sampled
  pointer positions.

Replayed by `test/characterization/v2.test.ts`, `test/v2/serialize.test.ts`,
`test/v2/geometry.test.ts` and `test/v2/drop.test.ts`.
