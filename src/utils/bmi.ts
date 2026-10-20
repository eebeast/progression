import type { BodyWeightEntry, Unit } from '@/types';

export type BmiCategory = 'Underweight' | 'Healthy weight' | 'Overweight' | 'Obesity';

/** CDC adult (20+) screening categories; classify before display rounding. */
export function adultBmi(heightCm: number | undefined, weight: number, unit: Unit) {
  if (!heightCm || !Number.isFinite(heightCm) || heightCm <= 0 || !Number.isFinite(weight) || weight <= 0) return null;
  const kilograms = unit === 'lb' ? weight * 0.45359237 : weight;
  const value = kilograms / (heightCm / 100) ** 2;
  if (!Number.isFinite(value) || value <= 0) return null;
  const category: BmiCategory = value < 18.5 ? 'Underweight' : value < 25 ? 'Healthy weight' : value < 30 ? 'Overweight' : 'Obesity';
  return { value, category, outsideReferenceRange: category !== 'Healthy weight' };
}

/** Latest measurement date, then entry time; future-dated imports aren't current measurements. */
export function latestBodyWeight(entries: BodyWeightEntry[], now = Date.now()): BodyWeightEntry | undefined {
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);
  return entries.reduce<BodyWeightEntry | undefined>((latest, entry) => {
    if (!Number.isFinite(entry.date) || entry.date >= tomorrow.getTime()) return latest;
    if (!latest || entry.date > latest.date || entry.date === latest.date && entry.createdAt > latest.createdAt) return entry;
    return latest;
  }, undefined);
}
