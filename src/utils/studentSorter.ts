import { Student, StudentFundStatus } from '../types.js';

/**
 * Custom Student Sorting Logic:
 * 1. Primarily sort by slNo ascending if present on both.
 * 2. Alternatively, if sorting by roll: students whose roll starts with '2022' (re-add batch)
 *    MUST ALWAYS be placed at the very bottom of the roster after all '2023' batch students.
 * 3. Within the same batch prefix, sort by numerical roll order ascending.
 */
export function compareStudents(
  a: Partial<Student> | null | undefined,
  b: Partial<Student> | null | undefined
): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  const rollA = String(a.roll || '').trim();
  const rollB = String(b.roll || '').trim();

  const is2022A = rollA.startsWith('2022');
  const is2022B = rollB.startsWith('2022');

  const slA = a.slNo !== undefined && a.slNo !== null && a.slNo !== '' ? Number(a.slNo) : null;
  const slB = b.slNo !== undefined && b.slNo !== null && b.slNo !== '' ? Number(b.slNo) : null;

  const hasSlA = slA !== null && !isNaN(slA);
  const hasSlB = slB !== null && !isNaN(slB);

  // 1. Primary: Sort by slNo ascending if present on both
  if (hasSlA && hasSlB) {
    if (slA !== slB) {
      return slA - slB;
    }
  }

  // If one has slNo and the other doesn't:
  // If neither or both are 2022, the item with slNo comes first
  if (hasSlA && !hasSlB && is2022A === is2022B) {
    return -1;
  }
  if (!hasSlA && hasSlB && is2022A === is2022B) {
    return 1;
  }

  // 2. Alternatively by roll: students whose roll starts with '2022' (re-add batch)
  // MUST ALWAYS be placed at the very bottom of the roster after all '2023' batch students
  if (!is2022A && is2022B) {
    return -1;
  }
  if (is2022A && !is2022B) {
    return 1;
  }

  // 3. Within the same batch prefix, sort by numerical roll order ascending
  const numA = Number(rollA.replace(/\D/g, ''));
  const numB = Number(rollB.replace(/\D/g, ''));

  if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
    return numA - numB;
  }

  return rollA.localeCompare(rollB, undefined, { numeric: true });
}

export function compareStudentStatuses(
  a: StudentFundStatus | null | undefined,
  b: StudentFundStatus | null | undefined
): number {
  return compareStudents(a?.student, b?.student);
}
