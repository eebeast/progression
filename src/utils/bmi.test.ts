import { expect, it } from 'vitest';
import { adultBmi, latestBodyWeight } from './bmi';

it.each([
  [18.49, 'Underweight'], [18.5, 'Healthy weight'], [24.99, 'Healthy weight'],
  [25, 'Overweight'], [29.99, 'Overweight'], [30, 'Obesity'], [40, 'Obesity'],
])('classifies unrounded adult BMI %s as %s', (bmi, category) => {
  expect(adultBmi(200, Number(bmi) * 4, 'kg')).toMatchObject({ value: bmi, category, outsideReferenceRange: category !== 'Healthy weight' });
});

it('converts pounds for the calculation without changing the recorded weight', () => {
  expect(adultBmi(180, 180, 'lb')?.value).toBeCloseTo(25.1996, 3);
  expect(adultBmi(180, 180 * 0.45359237, 'kg')).toEqual(adultBmi(180, 180, 'lb'));
});

it.each([undefined, 0, -1, NaN, Infinity])('does not calculate for invalid height %s', (height) => {
  expect(adultBmi(height, 75, 'kg')).toBeNull();
});

it.each([0, -1, NaN, Infinity])('does not calculate for invalid weight %s', (weight) => {
  expect(adultBmi(180, weight, 'kg')).toBeNull();
});

it('uses measurement dates, breaking same-date ties by entry time, and excludes future imports', () => {
  const now = new Date(2026, 9, 20, 12).getTime();
  const entries = [
    { id: 'old', date: now - 86_400_000, weight: 90, createdAt: now + 1 },
    { id: 'first', date: now, weight: 80, createdAt: now - 1 },
    { id: 'latest', date: now, weight: 79, createdAt: now },
    { id: 'future', date: now + 86_400_000, weight: 70, createdAt: now + 2 },
    { id: 'invalid', date: NaN, weight: 70, createdAt: now + 3 },
  ];
  expect(latestBodyWeight(entries, now)?.id).toBe('latest');
  expect(entries[0].id).toBe('old');
  expect(latestBodyWeight([], now)).toBeUndefined();
});
