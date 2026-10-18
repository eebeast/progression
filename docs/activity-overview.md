# Activity overview

The dashboard at `/analytics` uses the existing card, typography and accent tokens.

## Categories

The six selectable categories are Chest, Legs, Back, Core, Arms and Compound.
Common exercises are preconfigured in `src/utils/muscleGroups.ts`, including bench
press and push-ups under Chest, and deadlift and clean and press under Compound.
Shoulder isolation movements are organized under Arms; overhead pressing is under
Compound. These are organizational categories, not muscle-activation estimates.

New exercises require a category in the plan editor and exercise library. Familiar
names receive an editable preselection. `Exercise.category` is optional for older
records; reading falls back to recognized saved muscle labels and configured names.
Recognized legacy spellings (including dumbell/dumbbell and tricep/triceps) and common
curl, triceps and core movements map to the same display categories. This does not
merge their exercise IDs or change historical names. Explicit categories always win.
Unknown exercises are retained in history but do not
create an Unspecified dashboard category. Categorize them in the exercise library.
No schema version bump or destructive data migration is needed.

## Charts

- Workout activity: completed workouts or recorded run distance for the selected
  local calendar week, month, year or custom dates. Years use monthly totals.
- Category load: the heaviest recorded working-set weight per category, using all
  completed history. This is a maximum logged value, not an estimate of strength.
- Category drill-down: each exercise's individual working-set loads in chronological
  order across all completed history. Each point retains its workout date, set number,
  weight and reps or duration. Repeated weights and zero added load remain visible.
  Warm-ups and active workouts are excluded. Unknown/invalid weights are not invented.
- Body weight: the recorded measurements in the selected date period.

Date controls apply to workout activity and body weight. Historical load charts are
explicitly labeled all-history and include every exercise independently of gym filters.
The category detail lists the full configured catalog alongside custom and historical
exercises, with a separate graph for each exercise that has records. Unlogged exercises
have an empty-state card. Weight units follow the app's
existing convention: values display in the active unit without conversion. Chart
values also have accessible data tables and tooltips. Category buttons provide a
keyboard-accessible alternative to clicking chart bars.

## Streaks

The default is consecutive active weeks, starting Monday. A completed workout or
logged run qualifies, and a date counts once even with multiple activities. The
current unfinished week does not break the previous week's streak. A Days switch
is available. Current/best counts, earned personal-best badges and this week's
checkmarks are derived live from all history, independently of dashboard filters.
Future dates do not extend streaks. No goals, projections or estimated advice are added.
