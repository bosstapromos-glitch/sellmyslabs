export const SLAB_INSPECTION_HOURS = 14 * 24;
export const STANDARD_INSPECTION_HOURS = 72;
export const SLAB_INSPECTION_NOTICE =
  "Due to extreme demand, please allow 1–2 weeks after delivery to our shop for slab inspection.";

// The accepted offer, not today's policy, determines an existing purchase's deadline.
export function inspectionHours(value) {
  return Number(value) === SLAB_INSPECTION_HOURS
    ? SLAB_INSPECTION_HOURS
    : STANDARD_INSPECTION_HOURS;
}
