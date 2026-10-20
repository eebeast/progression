# Dashboard and Logbook

**Dashboard** (`/activity`) shows charts, a **Keep showing up** streak card, and a
separate activity calendar card. Run and body-weight record lists live only in **Logbook**
(`/history`), where records can be edited or deleted. Dashboard shows body weight
as a chart rather than a record list or latest-weight card. Existing route URLs
remain supported; `/analytics` redirects to `/activity`.

## Recording and finding activity

Today (`/`) has **Add run** and **Add weight** buttons beside the workout entry flow.
Each opens an inline form. Saves await local persistence, reject repeated clicks,
and retain the entered values if a write fails.

Logbook filters are All, Exercises, Runs, Cycles and Body weight. Cycles currently
has an honest empty state because there is no cycling logger/data store yet.
The combined calendar highlights workout/run dates; selecting a date exposes a
**View records** link to `/history?date=YYYY-MM-DD`. Logbook preserves that date
while switching record types and offers **Show all dates** to clear it. The calendar
and streak remain available while correcting invalid chart dates.
The embedded calendar is capped at 336px wide and uses square, responsive date
cells so the month grid keeps its proportions on desktop and mobile.

## Categories

The seven selectable categories are Chest, Legs, Back, Shoulder, Core, Arms and Compound.
Common exercises are preconfigured in `src/utils/muscleGroups.ts`, including bench
press and push-ups under Chest, and deadlift and clean and press under Compound.
Shoulder isolation movements such as lateral raises, reverse flyes and face pulls
are organized under Shoulder; overhead pressing is under Compound. These are
organizational categories, not muscle-activation estimates.

New exercises require a category in the plan editor and exercise library. Familiar
names receive an editable preselection. `Exercise.category` is optional for older
records; reading falls back to recognized saved muscle labels and configured names.
Recognized legacy spellings (including dumbell/dumbbell and tricep/triceps) and common
curl, triceps and core movements map to the same display categories. This does not
merge their exercise IDs or change historical names. Explicit categories always win.
Original program names are also covered: Pull-up maps to Back; Face Pull maps to Shoulder;
Leg Press, Leg Curl and Calf Raise to Legs; Incline DB Press to Chest;
Lateral Raise, Reverse Fly and Face Pull to Shoulder; Skullcrusher to Arms;
Overhead Press to Compound.
Core aliases include Ab Wheel Rollouts, Ab Rollout and Situp. Dexie migration v5 moves
catalogued shoulder-isolation exercises from their previous Arms/Back defaults into
Shoulder while leaving custom categories intact. Keep the original
program-name regression tests when extending the catalog: unrecognized legacy names
otherwise disappear from category charts even though their records remain in Logbook.
The reported four-day personal plan is also a regression fixture
(`src/test/fixtures/userExerciseCategories.ts`), covering Reverse Fly, Dumbbell Rows,
Push Up, Weighted Dips, DB Fly, single-arm triceps variants, shoulder pressing,
barbell/dumbbell skull crushers, Dead Bugs, Lunges and Sumo squats. Distinct movement
variants keep separate catalog entries and logged IDs. Ambiguous custom names such
as Calthenic require an explicit category rather than a guessed movement.
Interchangeable names such as Barbell Row / Barbell Bent-over Row, Bench Press /
Barbell Bench Press and EZ Bar Curl / EZ Bar Biceps Curl share a catalog key.
Category details hide redundant unlogged cards for these aliases. If distinct
saved IDs both have recorded sets, both histories remain visible and no sets are
merged or rewritten. Weighted and unweighted movements remain separate presets.
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
- Adult BMI: beneath the body-weight chart, calculated live from height in Settings
  and the latest dated weight across all history. Weight follows the active app unit;
  pounds are converted to kilograms for BMI only. Missing or invalid inputs link to
  Settings/Today. Edits/deletions update the result; future-dated entries are excluded.
  Uses [CDC adult (20+) categories](https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html):
  underweight <18.5, healthy weight 18.5–<25, overweight 25–<30, obesity ≥30.
  Values outside the reference range have a textual risk indicator. BMI is a
  screening measure, cannot distinguish muscle from fat, and is not a diagnosis.
  This is an explicit user-approved exception to the app's facts-only principle.

Date controls apply to workout activity and body weight. Historical load charts are
explicitly labeled all-history and include every exercise independently of gym filters.
The category detail lists the full configured catalog alongside custom and historical
exercises, with a separate graph for each exercise that has records. Unlogged exercises
have an empty-state card. Weight units follow the app's
existing convention: values display in the active unit without conversion. Chart
values also have accessible data tables and tooltips. Category buttons provide a
keyboard-accessible alternative to clicking chart bars.

On desktop, the rounded frame and sidebar stay fixed while the inner content pane
scrolls. Keep the pane positioned relatively so absolutely positioned chart data
tables cannot enlarge the outer document or move the frame during category scrolling.

## Streaks

The default is consecutive active weeks, starting Monday. A completed workout or
logged run qualifies, and a date counts once even with multiple activities. The
current unfinished week does not break the previous week's streak. A Days switch
is available. Current/best counts, earned personal-best badges and this week's
checkmarks are derived live from all history, independently of dashboard filters.
Future dates do not extend streaks. No goals, projections or estimated advice are added.
