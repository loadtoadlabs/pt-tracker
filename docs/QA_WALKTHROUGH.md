# Browser walkthrough — September 15, 2026

Tested the local Expo web app at port 8082 with a fresh, explicitly labeled sample profile. All data entered was synthetic. The profile used a Monday–Friday schedule, bodyweight equipment, and squat, lunge, and wrist-loading restrictions.

## Verified through the UI

- Completed all eight setup steps and reached Today’s Workout.
- Generated equipment-appropriate substitutions for the saved restrictions.
- Readiness required all three answers before proceeding.
- Saving without block outcomes showed a validation error.
- Saved two clean sessions; the next targets increased once and Progress Earned unlocked.
- Saved a reduced session with completed, missed, and skipped blocks. Dashboard totals matched and the progression streak reset.
- High-pain readiness replaced the workout with recovery movement. Saving recovery earned its badge without adding to training-session milestones.
- History retained readiness, prescriptions, actual-work notes, and outcomes.
- A manual result log saved and displayed the shorthand plank input 115 as 1:15. It did not add to achievement session counts.
- The weekly check-in page showed Friday as the check-in day and offered no measurement form on Tuesday.
- Inspected recovery, check-in, and achievement layouts at a 390 × 844 web viewport.
- Reloading preserved the saved profile and history.

## Fixes from the walkthrough

- Empty error strings on active-workout and weekly-check-in screens no longer render as text children of a View, eliminating the observed React Native Web warning.
- Reduced prescriptions use “1 set” instead of “1 sets.” Existing saved prescription snapshots are preserved.

## Limits

- Same-day synthetic sessions exercised progression; no real exercise was performed.
- Check-in saving on the final training day, calendar boundaries, duplicate saves, and storage failures were covered by automated tests, not by changing the browser or system clock.
- Native iOS/Android devices, native screen readers, and workout-history deletion were not tested.
- Sample data remains local to the browser’s localhost:8082 origin. Nothing was uploaded or pushed.
