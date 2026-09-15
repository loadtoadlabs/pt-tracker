# Foundation branch reconciliation

Reviewed `origin/v1-foundation` through `7d0dcb1` against the tested project-setup checkpoint `352ef1a`.

## Decisions

- `0d71956`, `11500d4`: retain the current active-workout implementation and its single route registration. It applies readiness to saved prescriptions, requires outcomes, and supports progression and achievements.
- `d0efa9a`: retain current actual-work and session notes. Defer the alternative per-block substitution and notes controls; substitutions need explicit progression exclusions and history support before adoption.
- `62328ed`: retain the existing Today navigation and combined workout history. The alternative dashboard reads a separate session key and would hide sessions saved by this branch.
- `39748bd`: retain visually blank inputs and automatic PFA date hyphens. Numeric helper examples in the alternative setup conflict with the user's subsequent request to remove example numbers.
- `7d0dcb1`: include the SQLite schema as inactive groundwork. No database initialization or storage migration is enabled.

## Follow-up boundaries

AsyncStorage remains the source of saved app data. The alternative branch wrote sessions to `loadtoad.training-sessions.v1`; this branch uses `workouts`. If supporting users of that alternative build, add a validated compatibility reader/import with visible history before switching them over. Do not treat imported sessions without prescription snapshots and clean-completion evidence as earned progression.

Before activating SQLite, design and test migrations for profiles, both session formats, manual results, and weekly measurements. Preserve planned/performed workout snapshots and progression metadata, which the initial SQL schema does not yet fully represent. Achievements currently derive from saved evidence; activating a permanent achievements table would require a separate behavior decision.

This merge records the branch comparison and preserves the tested app behavior. It does not claim that the deferred alternative features are implemented.
