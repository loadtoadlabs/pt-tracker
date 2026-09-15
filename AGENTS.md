# LoadToadLabs Air Force PT Tracker

## Project identity

This is the LoadToadLabs Air Force PT Tracker, branded “LoadToad PT” in the app.

GitHub repository: [https://github.com/loadtoadlabs/pt-tracker](https://github.com/loadtoadlabs/pt-tracker)

The app helps users prepare for their physical fitness assessment through personalized training plans, workout logging, and progress tracking.

## Technology and structure

- Expo SDK 57, React Native, React, and TypeScript.
- Expo Router provides file-based navigation.
- Android, iOS, and web are configured targets.
- `src/app/`: setup, dashboard, workout logging, and workout history screens.
- `src/lib/`: training schedules, workout generation, adaptation rules, and local storage.
- `src/types/`: profile and training data models.
- `src/components/`, `src/hooks/`, and `src/constants/`: shared UI and theme utilities.
- `docs/TRAINING_PROGRAM.md`: product-level source of truth for the V1 training engine.
- `assets/`: app icons and other visual assets.

## Training behavior

The home screen must prioritize **Today’s Workout** above analytics and dashboards.

Body composition is a **weekly check-in**, prompted on the user’s final training day of the week; do not encourage daily waist/weight logging.

The setup/profile must capture **mobility limitations or movement restrictions**, and the training engine should substitute exercises while preserving the intended training effect.

Training difficulty should adapt from the user’s baseline and completed sessions.

Equipment availability must affect exercise selection.

Achievements should be approximately **75% legitimate fitness/PFA milestones and 25% LoadToadLabs personality/humor**.

Social features such as friends, leaderboards, squadron/work-center challenges, sharing achievements, and mock-PFA comparisons are **post-V1** unless explicitly requested.

When product behavior is unclear, **preserve existing behavior and ask before inventing a new product requirement**.

Read `docs/TRAINING_PROGRAM.md` before changing training logic.

Preserve the five-day structure: three PFA-focused sessions and two strength-support sessions. Plans account for selected events, baseline performance, equipment, movement restrictions, and the test date.

Routine training is submaximal. Progression is earned through successful sessions. Training adaptations do not diagnose injuries.

Do not invent official Air Force scoring tables or policy requirements. Verify authoritative sources before implementing rules that depend on them.

## Data and implementation status

Profiles and workout history currently use local AsyncStorage. Preserve existing saved-data compatibility when changing data models.

Readiness and progression helpers exist, but their integration into the workout flow is incomplete. Verify actual usage before describing a feature as implemented.

Some Expo starter screens, components, assets, and README content remain. They do not define the intended product.

## Working guidelines

- Keep changes focused on the requested task.
- Follow existing TypeScript and component conventions.
- Avoid unrelated refactoring and dependency changes.
- Consider Android, iOS, and web when changing shared code.
- Never commit secrets or personal workout data.
- Validate changes with appropriate available checks and report what was actually tested.
- Do not claim the app works on a platform without verifying it.

## Expo version requirement

Expo has changed. Read the exact versioned documentation at [https://docs.expo.dev/versions/v57.0.0/](https://docs.expo.dev/versions/v57.0.0/) before writing code.

## Development commands

- `npm install`: install dependencies.
- `npm start`: start Expo.
- `npm run android`: start for Android.
- `npm run ios`: start for iOS.
- `npm run web`: start for web.
- `npm run lint`: invoke Expo lint; configuration may be needed.

There is currently no configured test script. The `reset-project` script resets the starter structure; do not run it as routine setup.
