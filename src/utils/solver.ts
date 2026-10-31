import {
  ClassGroup,
  DayOfWeek,
  DEFAULT_SHIFT_RANGES,
  GridCell,
  ScheduleRule,
  ShiftRanges,
  Subject,
  SubjectLoad,
  Teacher,
  TimeSlot,
} from '../types';
import { areClassesInSameGroup } from './rulesEngine';
import { getSlotShift, isShiftAllowedForTeacher } from './timeCalculator';

export interface SolverResult {
  success: boolean;
  grid: Record<string, GridCell>;
  allocatedCount: number;
  totalTargetCount: number;
  violations: string[];
  diagnostics: string[];
  suggestedRelaxations: string[];
  durationMs: number;
}

interface AllocationItem {
  id: string;
  classId: string;
  subjectId: string;
  preferredTeacherId?: string;
  isHeavy: boolean;
}

export function generateScheduleWithSolver(
  activeDays: DayOfWeek[],
  slots: TimeSlot[],
  classes: ClassGroup[],
  subjects: Subject[],
  teachers: Teacher[],
  rules: ScheduleRule[],
  loads: SubjectLoad[],
  existingGrid: Record<string, GridCell> = {},
  shiftRanges?: ShiftRanges
): SolverResult {
  const effectiveShiftRanges = shiftRanges || DEFAULT_SHIFT_RANGES;
  const startTime = performance.now();
  const lessonSlots = slots.filter((s) => s.type === 'lesson');

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const classMap = new Map(classes.map((c) => [c.id, c]));

  // Build subject -> capable teachers map
  const subjectTeachersMap = new Map<string, Teacher[]>();
  for (const sub of subjects) {
    const capable = teachers.filter((t) => t.subjectIds.includes(sub.id));
    subjectTeachersMap.set(sub.id, capable);
  }

  // 1. Initialize Base Grid: Preserve user-locked cells & Pre-populate Enabled Fixed Slot Rules
  const initialLockedGrid: Record<string, GridCell> = {};
  for (const day of activeDays) {
    for (const slot of lessonSlots) {
      for (const cls of classes) {
        const key = `${day}_${slot.id}_${cls.id}`;
        const existing = existingGrid[key];
        if (existing && existing.isLocked && existing.subjectId) {
          initialLockedGrid[key] = { ...existing, isLocked: true };
        } else {
          initialLockedGrid[key] = {
            id: `cell_${day}_${slot.id}_${cls.id}`,
            day,
            slotId: slot.id,
            classId: cls.id,
            subjectId: null,
            teacherId: null,
            isLocked: false,
          };
        }
      }
    }
  }

  // Ensure locked cells in grouped classes or member classes are locked across related classes
  for (const group of classes.filter((c) => c.isGrouped && c.groupedClassIds && c.groupedClassIds.length > 0)) {
    for (const day of activeDays) {
      for (const slot of lessonSlots) {
        const groupKey = `${day}_${slot.id}_${group.id}`;
        const groupCell = existingGrid[groupKey];

        let masterLockedCell: GridCell | null = null;
        if (groupCell && groupCell.isLocked && groupCell.subjectId) {
          masterLockedCell = groupCell;
        } else {
          for (const memberId of group.groupedClassIds) {
            const mKey = `${day}_${slot.id}_${memberId}`;
            const mCell = existingGrid[mKey];
            if (mCell && mCell.isLocked && mCell.subjectId) {
              masterLockedCell = mCell;
              break;
            }
          }
        }

        if (masterLockedCell) {
          initialLockedGrid[groupKey] = {
            ...masterLockedCell,
            id: `cell_${day}_${slot.id}_${group.id}`,
            classId: group.id,
            isLocked: true,
          };
          for (const memberId of group.groupedClassIds) {
            const mKey = `${day}_${slot.id}_${memberId}`;
            initialLockedGrid[mKey] = {
              ...masterLockedCell,
              id: `cell_${day}_${slot.id}_${memberId}`,
              classId: memberId,
              isLocked: true,
            };
          }
        }
      }
    }
  }

  // Pre-populate and lock fixed_slot rules
  const fixedSlotRules = rules.filter((r) => r.type === 'fixed_slot' && r.isEnabled);
  for (const rule of fixedSlotRules) {
    const { day, slotId, classId, subjectId, teacherId } = rule.parameters;
    if (day && slotId && classId && activeDays.includes(day)) {
      const key = `${day}_${slotId}_${classId}`;
      let assignedTeacherId = teacherId || null;
      if (!assignedTeacherId && subjectId) {
        // Pick preferred teacher or first capable
        const capable = subjectTeachersMap.get(subjectId) || [];
        if (capable.length > 0) {
          assignedTeacherId = capable[0].id;
        }
      }

      const cellToLock: GridCell = {
        id: `cell_${day}_${slotId}_${classId}`,
        day,
        slotId,
        classId,
        subjectId: subjectId || null,
        teacherId: assignedTeacherId,
        isLocked: true,
        note: `Fixado por regra: ${rule.name}`,
      };

      initialLockedGrid[key] = cellToLock;

      // Also lock across grouped / member classes
      const targetCls = classes.find((c) => c.id === classId);
      if (targetCls?.isGrouped && targetCls.groupedClassIds) {
        for (const mId of targetCls.groupedClassIds) {
          initialLockedGrid[`${day}_${slotId}_${mId}`] = {
            ...cellToLock,
            id: `cell_${day}_${slotId}_${mId}`,
            classId: mId,
          };
        }
      } else {
        for (const g of classes.filter((c) => c.isGrouped && c.groupedClassIds?.includes(classId))) {
          initialLockedGrid[`${day}_${slotId}_${g.id}`] = {
            ...cellToLock,
            id: `cell_${day}_${slotId}_${g.id}`,
            classId: g.id,
          };
          for (const mId of g.groupedClassIds || []) {
            initialLockedGrid[`${day}_${slotId}_${mId}`] = {
              ...cellToLock,
              id: `cell_${day}_${slotId}_${mId}`,
              classId: mId,
            };
          }
        }
      }
    }
  }

  // 2. Calculate remaining items to allocate per load
  const baseItemsToAllocate: AllocationItem[] = [];
  let totalTargetCount = 0;

  for (const load of loads) {
    const sub = subjectMap.get(load.subjectId);
    if (!sub) continue;

    // Count already locked cells in initial grid for this class or linked grouped class
    let alreadyLocked = 0;
    const targetCls = classMap.get(load.classId);
    const relatedClassIds = new Set<string>([load.classId]);
    if (targetCls?.isGrouped && targetCls.groupedClassIds) {
      targetCls.groupedClassIds.forEach((id) => relatedClassIds.add(id));
    }
    for (const g of classes.filter((c) => c.isGrouped && c.groupedClassIds?.includes(load.classId))) {
      relatedClassIds.add(g.id);
      g.groupedClassIds?.forEach((id) => relatedClassIds.add(id));
    }

    for (const day of activeDays) {
      for (const slot of lessonSlots) {
        let hasLockedSubject = false;
        for (const rId of relatedClassIds) {
          const key = `${day}_${slot.id}_${rId}`;
          const cell = initialLockedGrid[key];
          if (cell && cell.isLocked && cell.subjectId === sub.id) {
            hasLockedSubject = true;
            break;
          }
        }
        if (hasLockedSubject) {
          alreadyLocked++;
        }
      }
    }

    const needed = Math.max(0, load.lessonsPerWeek - alreadyLocked);
    totalTargetCount += load.lessonsPerWeek;

    for (let i = 0; i < needed; i++) {
      baseItemsToAllocate.push({
        id: `item_${load.classId}_${load.subjectId}_${i}`,
        classId: load.classId,
        subjectId: sub.id,
        preferredTeacherId: load.preferredTeacherId,
        isHeavy: sub.isHeavy,
      });
    }
  }

  const mandatoryRules = rules.filter((r) => r.isEnabled && r.isMandatory);
  const preferenceRules = rules.filter((r) => r.isEnabled && !r.isMandatory);

  const noDupSubjectRule = rules.find((r) => r.type === 'no_duplicate_subject_same_day' && r.isEnabled);
  const noConsecHeavyRule = rules.find((r) => r.type === 'no_consecutive_heavy_subjects' && r.isEnabled);
  const maxConsecRule = rules.find((r) => r.type === 'max_consecutive_teacher' && r.isEnabled);
  const maxConsecLimit = maxConsecRule?.parameters?.maxConsecutive || 3;

  // Placement check helper (STRICT: Physical laws & Absences are NEVER violated)
  function canPlace(
    item: AllocationItem,
    teacher: Teacher,
    day: DayOfWeek,
    slot: TimeSlot,
    currentGrid: Record<string, GridCell>,
    ignorePreferences: boolean = false
  ): { valid: boolean; penalty: number; reason?: string } {
    const key = `${day}_${slot.id}_${item.classId}`;
    const cell = currentGrid[key];

    // Already occupied
    if (cell && cell.subjectId !== null) {
      return { valid: false, penalty: 99999, reason: 'Célula já ocupada' };
    }

    // 1. HARD PHYSICAL LAW: Teacher Absence / Indisponibilidade (NEVER RELAXED)
    if (teacher.absences && teacher.absences.length > 0) {
      const match = teacher.absences.find(
        (a) => a.day === day && (a.allDay || !a.slotIds || a.slotIds.length === 0 || a.slotIds.includes(slot.id))
      );
      if (match) {
        return {
          valid: false,
          penalty: 99999,
          reason: `Professor ${teacher.shortName || teacher.name} ausente em ${day}${match.allDay ? ' (dia todo)' : ` no ${slot.name}`}`,
        };
      }
    }

    // 1.1 HARD PHYSICAL LAW: Teacher Shift Limitation (NEVER RELAXED)
    if (teacher.allowedShift && teacher.allowedShift !== 'all') {
      const slotShift = getSlotShift(slot, effectiveShiftRanges);
      if (!isShiftAllowedForTeacher(slotShift, teacher.allowedShift)) {
        return {
          valid: false,
          penalty: 99999,
          reason: `Turno ${slotShift === 'morning' ? 'da Manhã' : slotShift === 'afternoon' ? 'da Tarde' : 'da Noite'} não permitido para o professor ${teacher.shortName || teacher.name}`,
        };
      }
    }

    // 2. HARD PHYSICAL LAW: Teacher cannot teach 2 classes in the same slot
    for (const cls of classes) {
      if (cls.id === item.classId) continue;
      if (areClassesInSameGroup(item.classId, cls.id, classes)) continue;

      const otherKey = `${day}_${slot.id}_${cls.id}`;
      const otherCell = currentGrid[otherKey];
      if (otherCell && otherCell.teacherId === teacher.id) {
        return {
          valid: false,
          penalty: 99999,
          reason: `Professor ${teacher.shortName || teacher.name} já está na turma ${cls.name}`,
        };
      }
    }

    // 3. HARD PHYSICAL LAW: Shared Room / Laboratório constraint
    if (teacher.sharedRoomId) {
      for (const cls of classes) {
        const otherKey = `${day}_${slot.id}_${cls.id}`;
        const otherCell = currentGrid[otherKey];
        if (otherCell && otherCell.teacherId) {
          const otherTeacher = teacherMap.get(otherCell.teacherId);
          if (otherTeacher && otherTeacher.id !== teacher.id && otherTeacher.sharedRoomId === teacher.sharedRoomId) {
            return {
              valid: false,
              penalty: 99999,
              reason: `Espaço compartilhado ocupado pelo Prof. ${otherTeacher.shortName || otherTeacher.name}`,
            };
          }
        }
      }
    }

    // 4. Forbidden Slot Rules (supporting slotIds array and single slotId)
    const forbiddenRules = rules.filter((r) => r.type === 'forbidden_slot' && r.isEnabled);
    for (const rule of forbiddenRules) {
      const { subjectId, teacherId, classId, slotId: ruleSlotId, slotIds: ruleSlotIds, day: ruleDay, days: ruleDays } = rule.parameters;
      const isClassMatch = !classId || classId === item.classId || areClassesInSameGroup(classId, item.classId, classes);
      const isDayMatch = (!ruleDay && (!ruleDays || ruleDays.length === 0)) || (ruleDay && ruleDay === day) || (ruleDays && ruleDays.includes(day));
      const isSlotMatch =
        (!ruleSlotId && (!ruleSlotIds || ruleSlotIds.length === 0)) ||
        (ruleSlotId && ruleSlotId === slot.id) ||
        (ruleSlotIds && ruleSlotIds.includes(slot.id));

      if (isDayMatch && isSlotMatch && isClassMatch) {
        if (subjectId && subjectId === item.subjectId) {
          if (rule.isMandatory || !ignorePreferences) {
            return {
              valid: false,
              penalty: rule.isMandatory ? 99999 : 60,
              reason: `Disciplina proibida neste horário pela regra "${rule.name}"`,
            };
          }
        }
        if (teacherId && teacherId === teacher.id) {
          if (rule.isMandatory || !ignorePreferences) {
            return {
              valid: false,
              penalty: rule.isMandatory ? 99999 : 60,
              reason: `Professor com restrição pela regra "${rule.name}"`,
            };
          }
        }
      }
    }

    // 5. No Duplicate Subject on Same Day (Pedagogical Rule)
    const isSingleDayWeek = activeDays.length === 1;
    const itemSubject = subjectMap.get(item.subjectId);
    const itemSubName = itemSubject?.name.trim().toLowerCase();

    const doubleLessonRule = rules.find(
      (r) =>
        r.type === 'double_lesson_substitution' &&
        r.isEnabled &&
        (!r.parameters.subjectId || r.parameters.subjectId === item.subjectId) &&
        (!r.parameters.classId || r.parameters.classId === item.classId) &&
        (!r.parameters.day || r.parameters.day === day)
    );

    if (noDupSubjectRule && !isSingleDayWeek && !doubleLessonRule) {
      for (const s of lessonSlots) {
        if (s.id === slot.id) continue;
        const otherKey = `${day}_${s.id}_${item.classId}`;
        const otherCell = currentGrid[otherKey];
        if (otherCell && otherCell.subjectId) {
          const otherSubject = subjectMap.get(otherCell.subjectId);
          const otherSubName = otherSubject?.name.trim().toLowerCase();
          const isSameSubject =
            otherCell.subjectId === item.subjectId ||
            (itemSubName && otherSubName && itemSubName === otherSubName);

          if (isSameSubject) {
            if (noDupSubjectRule.isMandatory || !ignorePreferences) {
              return {
                valid: false,
                penalty: noDupSubjectRule.isMandatory ? 99999 : 50,
                reason: `Disciplina "${itemSubject?.name}" já agendada em ${day} para esta turma`,
              };
            }
          }
        }
      }
    }

    // 6. No Consecutive Heavy Subjects (Intervals reset consecutive count)
    if (noConsecHeavyRule && item.isHeavy) {
      const fullSlotIdx = slots.findIndex((s) => s.id === slot.id);

      if (fullSlotIdx > 0) {
        const prevFullSlot = slots[fullSlotIdx - 1];
        if (prevFullSlot.type === 'lesson') {
          const prevCell = currentGrid[`${day}_${prevFullSlot.id}_${item.classId}`];
          if (prevCell && prevCell.subjectId) {
            const prevSub = subjectMap.get(prevCell.subjectId);
            if (prevSub?.isHeavy) {
              if (noConsecHeavyRule.isMandatory || !ignorePreferences) {
                return {
                  valid: false,
                  penalty: noConsecHeavyRule.isMandatory ? 99999 : 40,
                  reason: `Disciplina pesada consecutiva com ${prevSub.shortName}`,
                };
              }
            }
          }
        }
      }

      if (fullSlotIdx < slots.length - 1) {
        const nextFullSlot = slots[fullSlotIdx + 1];
        if (nextFullSlot.type === 'lesson') {
          const nextCell = currentGrid[`${day}_${nextFullSlot.id}_${item.classId}`];
          if (nextCell && nextCell.subjectId) {
            const nextSub = subjectMap.get(nextCell.subjectId);
            if (nextSub?.isHeavy) {
              if (noConsecHeavyRule.isMandatory || !ignorePreferences) {
                return {
                  valid: false,
                  penalty: noConsecHeavyRule.isMandatory ? 99999 : 40,
                  reason: `Disciplina pesada consecutiva com ${nextSub.shortName}`,
                };
              }
            }
          }
        }
      }
    }

    // 7. Max Consecutive Lessons for Teacher
    const fullCurrentIndex = slots.findIndex((s) => s.id === slot.id);
    let consecutiveBefore = 0;
    for (let i = fullCurrentIndex - 1; i >= 0; i--) {
      const s = slots[i];
      if (s.type === 'interval' || s.type === 'event') break;
      let taught = false;
      for (const cls of classes) {
        const cKey = `${day}_${s.id}_${cls.id}`;
        if (currentGrid[cKey]?.teacherId === teacher.id) {
          taught = true;
          break;
        }
      }
      if (taught) consecutiveBefore++;
      else break;
    }

    let consecutiveAfter = 0;
    for (let i = fullCurrentIndex + 1; i < slots.length; i++) {
      const s = slots[i];
      if (s.type === 'interval' || s.type === 'event') break;
      let taught = false;
      for (const cls of classes) {
        const cKey = `${day}_${s.id}_${cls.id}`;
        if (currentGrid[cKey]?.teacherId === teacher.id) {
          taught = true;
          break;
        }
      }
      if (taught) consecutiveAfter++;
      else break;
    }

    const totalConsecutive = consecutiveBefore + 1 + consecutiveAfter;
    if (totalConsecutive > (teacher.maxConsecutiveLessons || maxConsecLimit)) {
      if (maxConsecRule?.isMandatory || !ignorePreferences) {
        return {
          valid: false,
          penalty: maxConsecRule?.isMandatory ? 99999 : 30,
          reason: `Excede limite de ${teacher.maxConsecutiveLessons || maxConsecLimit} tempos seguidos do Prof. ${teacher.shortName}`,
        };
      }
    }

    return { valid: true, penalty: 0 };
  }

  // --- SOLVER ENGINE: Multi-Pass with Local Search / Swapping ---
  let bestGrid: Record<string, GridCell> = { ...initialLockedGrid };
  let bestAllocatedCount = -1;
  let bestUnallocated: { item: AllocationItem; reasons: string[] }[] = [];

  const maxAttempts = 8;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Clone starting grid for this attempt
    const workingGrid: Record<string, GridCell> = {};
    for (const [k, v] of Object.entries(initialLockedGrid)) {
      workingGrid[k] = { ...v };
    }

    // Sort items to allocate: Most constrained subjects and classes first
    const items = [...baseItemsToAllocate];
    items.sort((a, b) => {
      const teachersA = (subjectTeachersMap.get(a.subjectId) || []).length;
      const teachersB = (subjectTeachersMap.get(b.subjectId) || []).length;
      if (teachersA !== teachersB) return teachersA - teachersB;
      if (a.isHeavy !== b.isHeavy) return a.isHeavy ? -1 : 1;
      return attempt === 0 ? 0 : Math.random() - 0.5;
    });

    let currentAllocated = 0;
    const currentUnallocated: { item: AllocationItem; reasons: string[] }[] = [];

    for (const item of items) {
      const capableTeachers = subjectTeachersMap.get(item.subjectId) || [];
      if (capableTeachers.length === 0) {
        currentUnallocated.push({
          item,
          reasons: [`Nenhum professor habilitado para ${subjectMap.get(item.subjectId)?.name}`],
        });
        continue;
      }

      // Sort teachers: preferred teacher first, then teachers with fewer absences
      const sortedTeachers = [...capableTeachers].sort((t1, t2) => {
        if (t1.id === item.preferredTeacherId) return -1;
        if (t2.id === item.preferredTeacherId) return 1;
        return (t1.absences?.length || 0) - (t2.absences?.length || 0);
      });

      // Build available slots for this class
      const slotCandidates: { day: DayOfWeek; slot: TimeSlot }[] = [];
      for (const day of activeDays) {
        for (const slot of lessonSlots) {
          slotCandidates.push({ day, slot });
        }
      }

      // Balance slots across active days
      slotCandidates.sort((a, b) => {
        const countA = lessonSlots.filter(
          (s) => workingGrid[`${a.day}_${s.id}_${item.classId}`]?.subjectId
        ).length;
        const countB = lessonSlots.filter(
          (s) => workingGrid[`${b.day}_${s.id}_${item.classId}`]?.subjectId
        ).length;
        if (countA !== countB) return countA - countB;
        return attempt === 0 ? 0 : Math.random() - 0.5;
      });

      let placed = false;
      const failReasons: string[] = [];

      // PHASE 1: Direct placement in empty slot (Strict Rules)
      for (const cand of slotCandidates) {
        const key = `${cand.day}_${cand.slot.id}_${item.classId}`;
        if (workingGrid[key]?.subjectId !== null) continue;

        for (const teacher of sortedTeachers) {
          const check = canPlace(item, teacher, cand.day, cand.slot, workingGrid, false);
          if (check.valid) {
            workingGrid[key] = {
              id: `cell_${cand.day}_${cand.slot.id}_${item.classId}`,
              day: cand.day,
              slotId: cand.slot.id,
              classId: item.classId,
              subjectId: item.subjectId,
              teacherId: teacher.id,
              isLocked: false,
            };
            placed = true;
            currentAllocated++;
            break;
          } else if (check.reason) {
            failReasons.push(check.reason);
          }
        }
        if (placed) break;
      }

      // PHASE 2: 1-Step Swap / Relocation Repair
      if (!placed) {
        for (const cand of slotCandidates) {
          const targetKey = `${cand.day}_${cand.slot.id}_${item.classId}`;
          const existingCell = workingGrid[targetKey];

          // Only displace unlocked cells (locked cells and fixed rules are never touched!)
          if (existingCell && !existingCell.isLocked && existingCell.subjectId && existingCell.teacherId) {
            const incumbentSub = subjectMap.get(existingCell.subjectId);
            const incumbentTeacher = teacherMap.get(existingCell.teacherId);
            if (!incumbentSub || !incumbentTeacher) continue;

            const incumbentItem: AllocationItem = {
              id: `incumbent_${existingCell.id}`,
              classId: item.classId,
              subjectId: incumbentSub.id,
              isHeavy: incumbentSub.isHeavy,
            };

            // Temporarily vacate target slot
            workingGrid[targetKey] = {
              ...existingCell,
              subjectId: null,
              teacherId: null,
            };

            let canPlaceNewItem = false;
            let chosenTeacherForNew: Teacher | null = null;
            for (const teacher of sortedTeachers) {
              const checkNew = canPlace(item, teacher, cand.day, cand.slot, workingGrid, false);
              if (checkNew.valid) {
                canPlaceNewItem = true;
                chosenTeacherForNew = teacher;
                break;
              }
            }

            if (canPlaceNewItem && chosenTeacherForNew) {
              workingGrid[targetKey] = {
                id: `cell_${cand.day}_${cand.slot.id}_${item.classId}`,
                day: cand.day,
                slotId: cand.slot.id,
                classId: item.classId,
                subjectId: item.subjectId,
                teacherId: chosenTeacherForNew.id,
                isLocked: false,
              };

              let relocatedIncumbent = false;
              for (const altCand of slotCandidates) {
                const altKey = `${altCand.day}_${altCand.slot.id}_${item.classId}`;
                if (workingGrid[altKey]?.subjectId !== null) continue;

                const checkIncumbent = canPlace(
                  incumbentItem,
                  incumbentTeacher,
                  altCand.day,
                  altCand.slot,
                  workingGrid,
                  false
                );
                if (checkIncumbent.valid) {
                  workingGrid[altKey] = {
                    id: `cell_${altCand.day}_${altCand.slot.id}_${item.classId}`,
                    day: altCand.day,
                    slotId: altCand.slot.id,
                    classId: item.classId,
                    subjectId: incumbentItem.subjectId,
                    teacherId: incumbentTeacher.id,
                    isLocked: false,
                  };
                  relocatedIncumbent = true;
                  break;
                }
              }

              if (relocatedIncumbent) {
                placed = true;
                currentAllocated++;
                break;
              } else {
                // Revert
                workingGrid[targetKey] = existingCell;
              }
            } else {
              // Revert
              workingGrid[targetKey] = existingCell;
            }
          }
        }
      }

      // PHASE 3: Soft Preference Relaxation (Absences & Physical Laws remain strictly enforced)
      if (!placed) {
        for (const cand of slotCandidates) {
          const key = `${cand.day}_${cand.slot.id}_${item.classId}`;
          if (workingGrid[key]?.subjectId !== null) continue;

          for (const teacher of sortedTeachers) {
            const check = canPlace(item, teacher, cand.day, cand.slot, workingGrid, true);
            if (check.valid) {
              workingGrid[key] = {
                id: `cell_${cand.day}_${cand.slot.id}_${item.classId}`,
                day: cand.day,
                slotId: cand.slot.id,
                classId: item.classId,
                subjectId: item.subjectId,
                teacherId: teacher.id,
                isLocked: false,
                note: 'Alocado com relaxamento de preferência',
              };
              placed = true;
              currentAllocated++;
              break;
            }
          }
          if (placed) break;
        }
      }

      if (!placed) {
        currentUnallocated.push({
          item,
          reasons: Array.from(new Set(failReasons)).slice(0, 3),
        });
      }
    }

    if (currentAllocated > bestAllocatedCount) {
      bestAllocatedCount = currentAllocated;
      bestGrid = workingGrid;
      bestUnallocated = currentUnallocated;
    }

    if (currentUnallocated.length === 0) {
      break;
    }
  }

  const durationMs = Math.round(performance.now() - startTime);

  // Grouped classes synchronization & locked cells preservation
  // 1. Re-apply all initially locked cells to guarantee nothing unlocked was lost
  for (const [key, cell] of Object.entries(initialLockedGrid)) {
    if (cell && cell.isLocked && cell.subjectId) {
      bestGrid[key] = { ...cell };
    }
  }

  // 2. Bidirectional sync for grouped classes
  for (const group of classes.filter((c) => c.isGrouped && c.groupedClassIds && c.groupedClassIds.length > 0)) {
    for (const day of activeDays) {
      for (const slot of lessonSlots) {
        const groupKey = `${day}_${slot.id}_${group.id}`;
        let masterCell = bestGrid[groupKey];

        if (!masterCell || !masterCell.subjectId) {
          for (const memberId of group.groupedClassIds) {
            const mKey = `${day}_${slot.id}_${memberId}`;
            const mCell = bestGrid[mKey];
            if (mCell && mCell.subjectId) {
              masterCell = mCell;
              break;
            }
          }
        }

        if (masterCell && masterCell.subjectId) {
          bestGrid[groupKey] = {
            ...masterCell,
            id: `cell_${day}_${slot.id}_${group.id}`,
            classId: group.id,
          };
          for (const memberId of group.groupedClassIds) {
            const mKey = `${day}_${slot.id}_${memberId}`;
            bestGrid[mKey] = {
              ...masterCell,
              id: `cell_${day}_${slot.id}_${memberId}`,
              classId: memberId,
            };
          }
        }
      }
    }
  }

  // Diagnostics & relaxation suggestions
  const diagnostics: string[] = [];
  const suggestedRelaxations: string[] = [];

  if (bestUnallocated.length > 0) {
    const unallocatedBySubClass = new Map<
      string,
      { count: number; reasons: Set<string>; subName: string; clsName: string }
    >();
    for (const u of bestUnallocated) {
      const sub = subjectMap.get(u.item.subjectId);
      const cls = classMap.get(u.item.classId);
      const k = `${u.item.classId}_${u.item.subjectId}`;
      const existing = unallocatedBySubClass.get(k) || {
        count: 0,
        reasons: new Set<string>(),
        subName: sub?.name || u.item.subjectId,
        clsName: cls?.name || u.item.classId,
      };
      existing.count++;
      u.reasons.forEach((r) => existing.reasons.add(r));
      unallocatedBySubClass.set(k, existing);
    }

    unallocatedBySubClass.forEach((val) => {
      const reasonList = Array.from(val.reasons).join('; ');
      diagnostics.push(
        `Faltam ${val.count} aula(s) de ${val.subName} na turma ${val.clsName}. Motivo: ${reasonList || 'Conflito de horários de professores'}.`
      );
    });

    if (noConsecHeavyRule?.isEnabled && noConsecHeavyRule.isMandatory) {
      suggestedRelaxations.push(
        'Mudar a regra "Disciplinas Pesadas Consecutivas" para Preferência.'
      );
    }
    if (noDupSubjectRule?.isEnabled && noDupSubjectRule.isMandatory) {
      suggestedRelaxations.push(
        'Permitir dobra de aula mudando a regra "Sem repetição no mesmo dia" para Preferência.'
      );
    }
    if (maxConsecRule?.isMandatory) {
      suggestedRelaxations.push(
        'Aumentar o limite de tempos seguidos dos professores de 2 para 3 tempos.'
      );
    }
    suggestedRelaxations.push(
      'Verificar se há faltas cadastradas em dias com alta demanda ou adicionar mais professores habilitados para a matéria.'
    );
  }

  const success = bestUnallocated.length === 0;

  return {
    success,
    grid: bestGrid,
    allocatedCount: bestAllocatedCount,
    totalTargetCount,
    violations: diagnostics,
    diagnostics,
    suggestedRelaxations,
    durationMs,
  };
}
