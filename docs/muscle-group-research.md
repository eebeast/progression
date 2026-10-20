# Muscle groups and exercise categories

Research date: 2026-10-18. This records research and a proposed app organization;
it does not change the implemented taxonomy or historical records.

Current implementation now includes Shoulder as a single-choice app category.
Overhead presses remain Compound, and known shoulder isolations were reclassified
by local migration v5. Use [Dashboard requirements](activity-overview.md) and the
[current PRD](product-requirements.md) for the accepted implementation; the broader
multi-tag proposal below is research context, not an approved next feature.

## What the sources establish

- Mayo Clinic lists shoulders, arms, chest, abdomen, back, hips and legs as major
  muscle groups. A category system that puts all shoulder exercises under Arms
  loses a useful distinction. [Mayo Clinic: Strength training](https://www.mayoclinic.org/healthy-lifestyle/fitness/basics/strength-training/hlv-20049447)
- ACE organizes its library by body region, including Chest, Back, Shoulders,
  Arms, Abs, Butt/Hips, and separate thigh and calf/shin groups. Its muscle
  subdivisions include biceps/triceps, quadriceps/hamstrings, and different
  deltoids. These are different levels of detail, rather than one mandatory
  universal list. [ACE exercise library](https://www.acefitness.org/resources/everyone/exercise-library/)
- Exercises can involve several regions: ACE labels chin-ups with both Arms
  and Back. Mayo describes reverse fly as working upper-back rhomboids and
  the shoulder region. A single dashboard category is therefore a navigation
  choice, not a claim that only that muscle works.
  [ACE exercise library](https://www.acefitness.org/resources/everyone/exercise-library/),
  [Mayo Clinic: Reverse fly](https://www.mayoclinic.org/healthy-lifestyle/fitness/multimedia/reverse-fly/vid-20084679)
- Compound describes an exercise involving multiple joints and muscle groups;
  it is not an anatomical muscle group. ACE includes squats and lunges as
  examples, so compound is broader than full-body lifts such as clean and press.
  [ACE: Compound exercises](https://www.acefitness.org/resources/pros/expert-articles/5811/5-benefits-of-compound-exercises/)
- Dead bug belongs with core exercises; NASM identifies abdominal muscles as
  its primary muscles. [NASM: Dead bug](https://www.nasm.org/resource-center/exercise-library/dead-bug)

## Proposed simple app organization

This is an app design recommendation inferred from the sources, not an anatomy
standard or an implemented migration:

| Main category | Examples from the supplied plan |
| --- | --- |
| Chest | Bench Press, Incline DB Press, Push Up, DB Fly, Weighted Dips |
| Back | Pull-up, Barbell Row, Dumbbell Rows |
| Shoulders | Lateral Raise / Lateral Raises, Reverse Fly, Face Pull |
| Compound | Overhead Press, Barbell Shoulder Press |
| Arms | Barbell Curl, Dumbbell Curl, Hammer Curl, overhead triceps extensions, skull crushers |
| Legs | Squat, Sumo Squats, Lunges, Calf Raise; include hips/glutes here for a compact UI |
| Core | Dead Bugs |

Keep Compound available as a separate movement tag/filter. For example, Bench
Press can be Chest + Compound and Squat can be Legs + Compound. Deadlift and
Romanian Deadlift involve hip/leg and back musculature; a proposed primary Legs
assignment would be a UI convention with secondary associations, not an exclusive
anatomical statement. The app keeps user-selected assignments, with a one-time
migration for catalogued shoulder isolations that previously defaulted to Arms or
Back because the Shoulder category was unavailable.

“Calthenic” does not identify a specific movement. If it means calisthenics, that
describes a style of training; its muscle category needs the actual exercise.
Neither a web lookup nor spelling normalization can reliably infer that movement.

For historical chart coverage, add verified aliases for supplied names while
retaining original exercise IDs, labels and set values. Do not merge different
exercise records or assign ambiguous names based on arbitrary text matching.
