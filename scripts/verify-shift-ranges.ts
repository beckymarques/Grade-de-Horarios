import { getSlotShift, isShiftAllowedForTeacher } from '../src/utils/timeCalculator';
import { generateScheduleWithSolver } from '../src/utils/solver';
import { validateSchedule } from '../src/utils/rulesEngine';
import {
  DEFAULT_SHIFT_RANGES,
  ShiftRanges,
  TimeSlot,
  Teacher,
  Subject,
  ClassGroup,
  SubjectLoad,
  ScheduleRule,
  GridCell,
} from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

console.log('--- TEST SUITE: Teacher Shift Constraints Verification ---\n');

// 1. SCENARIO A: Default Institution Cutoffs (12:30 and 18:00)
console.log('1. Testing Scenario A (Default limits: 12:30 and 18:00):');
{
  const slotMorning: TimeSlot = { id: 's1', slotNumber: 1, type: 'lesson', name: '1º Tempo', startTime: '07:30', endTime: '08:20', durationMinutes: 50 };
  const slotLateMorning: TimeSlot = { id: 's2', slotNumber: 5, type: 'lesson', name: '5º Tempo', startTime: '11:40', endTime: '12:30', durationMinutes: 50 };
  const slotAfternoon: TimeSlot = { id: 's3', slotNumber: 6, type: 'lesson', name: '6º Tempo', startTime: '13:00', endTime: '13:50', durationMinutes: 50 };
  const slotLateAfternoon: TimeSlot = { id: 's4', slotNumber: 9, type: 'lesson', name: '9º Tempo', startTime: '17:10', endTime: '18:00', durationMinutes: 50 };
  const slotNight: TimeSlot = { id: 's5', slotNumber: 10, type: 'lesson', name: '10º Tempo', startTime: '18:30', endTime: '19:20', durationMinutes: 50 };

  assert(getSlotShift(slotMorning, DEFAULT_SHIFT_RANGES) === 'morning', '07:30 classified as morning');
  assert(getSlotShift(slotLateMorning, DEFAULT_SHIFT_RANGES) === 'morning', '11:40 classified as morning (< 12:30)');
  assert(getSlotShift(slotAfternoon, DEFAULT_SHIFT_RANGES) === 'afternoon', '13:00 classified as afternoon (>= 12:30 and < 18:00)');
  assert(getSlotShift(slotLateAfternoon, DEFAULT_SHIFT_RANGES) === 'afternoon', '17:10 classified as afternoon (< 18:00)');
  assert(getSlotShift(slotNight, DEFAULT_SHIFT_RANGES) === 'night', '18:30 classified as night (>= 18:00)');
}

// 2. SCENARIO B: Custom Institution Cutoffs (11:30 and 17:30)
console.log('\n2. Testing Scenario B (Custom limits: 11:30 and 17:30):');
{
  const customRanges: ShiftRanges = {
    morningStart: '06:00',
    morningEnd: '11:30',
    afternoonStart: '11:30',
    afternoonEnd: '17:30',
    nightStart: '17:30',
    nightEnd: '23:00',
  };

  const slot1140: TimeSlot = { id: 's_1140', slotNumber: 1, type: 'lesson', name: 'Tempo 11:40', startTime: '11:40', endTime: '12:30', durationMinutes: 50 };
  const slot1740: TimeSlot = { id: 's_1740', slotNumber: 2, type: 'lesson', name: 'Tempo 17:40', startTime: '17:40', endTime: '18:30', durationMinutes: 50 };

  // Under default limits, 11:40 is morning and 17:40 is afternoon.
  // Under custom limits (11:30 / 17:30), 11:40 is AFTERNOON and 17:40 is NIGHT.
  assert(getSlotShift(slot1140, customRanges) === 'afternoon', '11:40 classified as afternoon with custom 11:30 cutoff');
  assert(getSlotShift(slot1740, customRanges) === 'night', '17:40 classified as night with custom 17:30 cutoff');
}

// 3. SCENARIOS C, D, E, F: Teacher Allowed Shifts
console.log('\n3. Testing Scenarios C, D, E, F (Teacher Shift Permissions):');
{
  // Scenario C: Morning-only
  assert(isShiftAllowedForTeacher('morning', 'morning') === true, 'C: Morning teacher allowed in morning');
  assert(isShiftAllowedForTeacher('afternoon', 'morning') === false, 'C: Morning teacher blocked in afternoon');
  assert(isShiftAllowedForTeacher('night', 'morning') === false, 'C: Morning teacher blocked in night');

  // Scenario D: Afternoon-only
  assert(isShiftAllowedForTeacher('morning', 'afternoon') === false, 'D: Afternoon teacher blocked in morning');
  assert(isShiftAllowedForTeacher('afternoon', 'afternoon') === true, 'D: Afternoon teacher allowed in afternoon');
  assert(isShiftAllowedForTeacher('night', 'afternoon') === false, 'D: Afternoon teacher blocked in night');

  // Scenario E: Night-only
  assert(isShiftAllowedForTeacher('morning', 'night') === false, 'E: Night teacher blocked in morning');
  assert(isShiftAllowedForTeacher('afternoon', 'night') === false, 'E: Night teacher blocked in afternoon');
  assert(isShiftAllowedForTeacher('night', 'night') === true, 'E: Night teacher allowed in night');

  // Scenario F: Combination shifts
  assert(isShiftAllowedForTeacher('morning', 'morning_afternoon') === true, 'F: morning_afternoon allows morning');
  assert(isShiftAllowedForTeacher('afternoon', 'morning_afternoon') === true, 'F: morning_afternoon allows afternoon');
  assert(isShiftAllowedForTeacher('night', 'morning_afternoon') === false, 'F: morning_afternoon blocks night');

  assert(isShiftAllowedForTeacher('morning', 'morning_night') === true, 'F: morning_night allows morning');
  assert(isShiftAllowedForTeacher('afternoon', 'morning_night') === false, 'F: morning_night blocks afternoon');
  assert(isShiftAllowedForTeacher('night', 'morning_night') === true, 'F: morning_night allows night');

  assert(isShiftAllowedForTeacher('morning', 'afternoon_night') === false, 'F: afternoon_night blocks morning');
  assert(isShiftAllowedForTeacher('afternoon', 'afternoon_night') === true, 'F: afternoon_night allows afternoon');
  assert(isShiftAllowedForTeacher('night', 'afternoon_night') === true, 'F: afternoon_night allows night');

  assert(isShiftAllowedForTeacher('morning', 'all') === true, 'F: "all" allows morning');
  assert(isShiftAllowedForTeacher('afternoon', 'all') === true, 'F: "all" allows afternoon');
  assert(isShiftAllowedForTeacher('night', 'all') === true, 'F: "all" allows night');
}

// 4. SCENARIO G: Legacy week without explicit shiftRanges
console.log('\n4. Testing Scenario G (Legacy week with undefined shiftRanges fallback):');
{
  const slotEarly: TimeSlot = { id: 's1', slotNumber: 1, type: 'lesson', name: '1º Tempo', startTime: '08:00', endTime: '08:50', durationMinutes: 50 };
  const slotMid: TimeSlot = { id: 's2', slotNumber: 2, type: 'lesson', name: '2º Tempo', startTime: '14:00', endTime: '14:50', durationMinutes: 50 };
  const slotLate: TimeSlot = { id: 's3', slotNumber: 3, type: 'lesson', name: '3º Tempo', startTime: '19:00', endTime: '19:50', durationMinutes: 50 };

  // Undefined shiftRanges passed -> should fallback to DEFAULT_SHIFT_RANGES (12:30 and 18:00)
  assert(getSlotShift(slotEarly, undefined) === 'morning', 'Fallback to default: 08:00 is morning');
  assert(getSlotShift(slotMid, undefined) === 'afternoon', 'Fallback to default: 14:00 is afternoon');
  assert(getSlotShift(slotLate, undefined) === 'night', 'Fallback to default: 19:00 is night');
}

// 5. SOLVER & VALIDATOR INTEGRATION: Custom Boundaries Consistency
console.log('\n5. Testing Solver & Validator consistency with custom shiftRanges:');
{
  const customRanges: ShiftRanges = {
    morningStart: '06:00',
    morningEnd: '11:30', // Earlier morning end
    afternoonStart: '11:30',
    afternoonEnd: '17:30',
    nightStart: '17:30',
    nightEnd: '23:00',
  };

  const slots: TimeSlot[] = [
    { id: 'slot_morning', slotNumber: 1, type: 'lesson', name: 'Manhã', startTime: '08:00', endTime: '08:50', durationMinutes: 50 },
    { id: 'slot_boundary', slotNumber: 2, type: 'lesson', name: 'Limite', startTime: '11:40', endTime: '12:30', durationMinutes: 50 },
    { id: 'slot_afternoon', slotNumber: 3, type: 'lesson', name: 'Tarde', startTime: '14:00', endTime: '14:50', durationMinutes: 50 },
  ];

  const classes: ClassGroup[] = [
    { id: 'c1', name: 'Turma 1', color: '#000', isGrouped: false },
  ];

  const subjects: Subject[] = [
    { id: 'sub1', name: 'Matemática', shortName: 'Mat', color: '#000', isHeavy: true },
    { id: 'sub2', name: 'História', shortName: 'Hist', color: '#000', isHeavy: false },
  ];

  // Teacher 1 is strictly morning only
  // Under custom ranges, slot_boundary (11:40) is afternoon, so Teacher 1 CANNOT be allocated there!
  const teachers: Teacher[] = [
    {
      id: 't_morning',
      name: 'Prof. Manhã',
      shortName: 'Manhã',
      subjectIds: ['sub1'],
      allowedShift: 'morning',
      absences: [],
    },
    {
      id: 't_afternoon',
      name: 'Prof. Tarde',
      shortName: 'Tarde',
      subjectIds: ['sub2'],
      allowedShift: 'afternoon',
      absences: [],
    },
  ];

  const loads: SubjectLoad[] = [
    { id: 'l1', classId: 'c1', subjectId: 'sub1', lessonsPerWeek: 1 },
    { id: 'l2', classId: 'c1', subjectId: 'sub2', lessonsPerWeek: 1 },
  ];

  const rules: ScheduleRule[] = [];

  // Run solver with custom ranges
  const solverRes = generateScheduleWithSolver(
    ['SEG'],
    slots,
    classes,
    subjects,
    teachers,
    rules,
    loads,
    {},
    customRanges
  );

  assert(solverRes.success, 'Solver successfully placed allocations');

  // Verify that t_morning was NEVER placed in slot_boundary (11:40) because 11:40 is afternoon in customRanges
  const boundaryCell = solverRes.grid['SEG_slot_boundary_c1'];
  if (boundaryCell && boundaryCell.teacherId) {
    assert(boundaryCell.teacherId !== 't_morning', 'Solver respected custom 11:30 boundary: t_morning NOT placed at 11:40');
    assert(boundaryCell.teacherId === 't_afternoon', 'Solver correctly placed afternoon teacher at 11:40');
  }

  // Validate the resulting grid with customRanges -> should have 0 shift conflicts
  const validationWithCustom = validateSchedule(
    solverRes.grid,
    ['SEG'],
    slots,
    classes,
    subjects,
    teachers,
    rules,
    loads,
    customRanges
  );
  const shiftConflicts = validationWithCustom.conflicts.filter((c) => c.type === 'teacher_class_shift_limit');
  assert(shiftConflicts.length === 0, 'Validator with custom ranges reports 0 shift conflicts for solver output');

  // Now artificially place t_morning at 11:40 (boundary slot)
  const invalidGrid: Record<string, GridCell> = {
    ...solverRes.grid,
    SEG_slot_boundary_c1: {
      id: 'cell_test',
      day: 'SEG',
      slotId: 'slot_boundary',
      classId: 'c1',
      subjectId: 'sub1',
      teacherId: 't_morning',
      isLocked: false,
    },
  };

  // Under DEFAULT ranges (12:30 boundary), 11:40 is morning -> NO conflict
  const valDefault = validateSchedule(
    invalidGrid,
    ['SEG'],
    slots,
    classes,
    subjects,
    teachers,
    rules,
    loads,
    DEFAULT_SHIFT_RANGES
  );
  const shiftConflictsDefault = valDefault.conflicts.filter((c) => c.type === 'teacher_class_shift_limit');
  assert(shiftConflictsDefault.length === 0, 'Under default ranges (12:30), 11:40 is morning, so no conflict');

  // Under CUSTOM ranges (11:30 boundary), 11:40 is afternoon -> CONFLICT DETECTED!
  const valCustom = validateSchedule(
    invalidGrid,
    ['SEG'],
    slots,
    classes,
    subjects,
    teachers,
    rules,
    loads,
    customRanges
  );
  const shiftConflictsCustom = valCustom.conflicts.filter((c) => c.type === 'teacher_class_shift_limit');
  assert(shiftConflictsCustom.length > 0, 'Under custom ranges (11:30), 11:40 is afternoon, conflict detected as expected!');
  assert(shiftConflictsCustom[0].teacherId === 't_morning', 'Conflict correctly identifies Prof. Manhã');
}

console.log('\n--- ALL SCENARIOS AND TESTS PASSED SUCCESSFULLY! ---');
