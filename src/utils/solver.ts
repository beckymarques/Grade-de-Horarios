import {
  ClassGroup,
  DayOfWeek,
  GridCell,
  ScheduleRule,
  Subject,
  SubjectLoad,
  Teacher,
  TimeSlot,
} from '../types';
import { areClassesInSameGroup } from './rulesEngine';

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
  existingGrid: Record<string, GridCell> = {}
): SolverResult {
  const startTime = performance.now();
  const lessonSlots = slots.filter((s) => s.type === 'lesson');
  const totalSlotsPerClass = activeDays.length * lessonSlots.length;

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const classMap = new Map(classes.map((c) => [c.id, c]));

  // Find teachers capable of teaching each subject
  const subjectTeachersMap = new Map<string, Teacher[]>();
  for (const sub of subjects) {
    const capable = teachers.filter((t) => t.subjectIds.includes(sub.id));
    subjectTeachersMap.set(sub.id, capable);
  }

  // Preserve locked cells from existingGrid
  const grid: Record<string, GridCell> = {};
  const lockedAllocationsByClass = new Map<string, number>();

  for (const day of activeDays) {
    for (const slot of lessonSlots) {
      for (const cls of classes) {
        const key = `${day}_${slot.id}_${cls.id}`;
        const existing = existingGrid[key];
        if (existing && existing.isLocked && existing.subjectId) {
          grid[key] = { ...existing };
          lockedAllocationsByClass.set(
            cls.id,
            (lockedAllocationsByClass.get(cls.id) || 0) + 1
          );
        } else {
          grid[key] = {
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

  // Flatten the loads into an allocation backlog per class
  const itemsToAllocate: AllocationItem[] = [];
  let totalTargetCount = 0;

  for (const load of loads) {
    const sub = subjectMap.get(load.subjectId);
    if (!sub) continue;

    // Count how many already locked in grid for this class & subject
    let alreadyLocked = 0;
    for (const day of activeDays) {
      for (const slot of lessonSlots) {
        const key = `${day}_${slot.id}_${load.classId}`;
        const cell = grid[key];
        if (cell && cell.isLocked && cell.subjectId === sub.id) {
          alreadyLocked++;
        }
      }
    }

    const needed = Math.max(0, load.lessonsPerWeek - alreadyLocked);
    totalTargetCount += load.lessonsPerWeek;

    for (let i = 0; i < needed; i++) {
      itemsToAllocate.push({
        id: `item_${load.classId}_${load.subjectId}_${i}`,
        classId: load.classId,
        subjectId: sub.id,
        preferredTeacherId: load.preferredTeacherId,
        isHeavy: sub.isHeavy,
      });
    }
  }

  // Heuristic sort: Heaviest subjects with fewest capable teachers first (MRV - Minimum Remaining Values)
  itemsToAllocate.sort((a, b) => {
    const teachersA = (subjectTeachersMap.get(a.subjectId) || []).length;
    const teachersB = (subjectTeachersMap.get(b.subjectId) || []).length;
    if (teachersA !== teachersB) return teachersA - teachersB;
    if (a.isHeavy !== b.isHeavy) return a.isHeavy ? -1 : 1;
    return 0;
  });

  const mandatoryRules = rules.filter((r) => r.isEnabled && r.isMandatory);
  const preferenceRules = rules.filter((r) => r.isEnabled && !r.isMandatory);

  const noDupSubjectRule = rules.find((r) => r.type === 'no_duplicate_subject_same_day' && r.isEnabled);
  const noConsecHeavyRule = rules.find((r) => r.type === 'no_consecutive_heavy_subjects' && r.isEnabled);
  const maxConsecRule = rules.find((r) => r.type === 'max_consecutive_teacher' && r.isEnabled);
  const maxConsecLimit = maxConsecRule?.parameters?.maxConsecutive || 3;

  // Helper validation function for placing an item
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

    // Already occupied or locked
    if (cell && cell.subjectId !== null) {
      return { valid: false, penalty: 999, reason: 'Célula ocupada' };
    }

    // Physical Law: Teacher cannot be in 2 classes in the same slot
    for (const cls of classes) {
      if (cls.id === item.classId) continue;
      // If classes are part of the same grouped batch, teacher can attend both simultaneously
      if (areClassesInSameGroup(item.classId, cls.id, classes)) continue;

      const otherKey = `${day}_${slot.id}_${cls.id}`;
      const otherCell = currentGrid[otherKey];
      if (otherCell && otherCell.teacherId === teacher.id) {
        return {
          valid: false,
          penalty: 999,
          reason: `Professor ${teacher.shortName} já está em outra turma (${cls.name})`,
        };
      }
    }

    // Shared Room constraint
    if (teacher.sharedRoomId) {
      for (const cls of classes) {
        const otherKey = `${day}_${slot.id}_${cls.id}`;
        const otherCell = currentGrid[otherKey];
        if (otherCell && otherCell.teacherId) {
          const otherTeacher = teacherMap.get(otherCell.teacherId);
          if (otherTeacher && otherTeacher.id !== teacher.id && otherTeacher.sharedRoomId === teacher.sharedRoomId) {
            return {
              valid: false,
              penalty: 999,
              reason: `Sala compartilhada ocupada pelo Prof. ${otherTeacher.shortName}`,
            };
          }
        }
      }
    }

    // Teacher Absence constraint
    if (teacher.absences && teacher.absences.length > 0) {
      const match = teacher.absences.find(
        (a) => a.day === day && (a.allDay || (a.slotIds && a.slotIds.includes(slot.id)))
      );
      if (match) {
        return {
          valid: false,
          penalty: 999,
          reason: `Professor ${teacher.shortName} ausente neste dia/horário`,
        };
      }
    }

    // No Duplicate Subject on Same Day
    // (Considering same subject name: e.g. "Química" twice on the same day is forbidden, but "Química Orgânica" and "Química Inorgânica" are allowed)
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
                penalty: noDupSubjectRule.isMandatory ? 999 : 50,
                reason: `Disciplina "${itemSubject?.name || 'Disciplina'}" já possui aula agendada em ${day} para esta turma`,
              };
            }
          }
        }
      }
    }

    // No Consecutive Heavy Subjects
    if (noConsecHeavyRule && item.isHeavy) {
      const currentSlotIndex = lessonSlots.findIndex((s) => s.id === slot.id);
      const prevSlot = currentSlotIndex > 0 ? lessonSlots[currentSlotIndex - 1] : null;
      const nextSlot = currentSlotIndex < lessonSlots.length - 1 ? lessonSlots[currentSlotIndex + 1] : null;

      if (prevSlot) {
        const prevCell = currentGrid[`${day}_${prevSlot.id}_${item.classId}`];
        if (prevCell && prevCell.subjectId) {
          const prevSub = subjectMap.get(prevCell.subjectId);
          if (prevSub?.isHeavy) {
            if (noConsecHeavyRule.isMandatory || !ignorePreferences) {
              return {
                valid: false,
                penalty: noConsecHeavyRule.isMandatory ? 999 : 40,
                reason: `Disciplina pesada consecutiva com ${prevSub.shortName}`,
              };
            }
          }
        }
      }

      if (nextSlot) {
        const nextCell = currentGrid[`${day}_${nextSlot.id}_${item.classId}`];
        if (nextCell && nextCell.subjectId) {
          const nextSub = subjectMap.get(nextCell.subjectId);
          if (nextSub?.isHeavy) {
            if (noConsecHeavyRule.isMandatory || !ignorePreferences) {
              return {
                valid: false,
                penalty: noConsecHeavyRule.isMandatory ? 999 : 40,
                reason: `Disciplina pesada consecutiva com ${nextSub.shortName}`,
              };
            }
          }
        }
      }
    }

    // Forbidden slot rules
    for (const rule of mandatoryRules.concat(ignorePreferences ? [] : preferenceRules)) {
      if (rule.type === 'forbidden_slot') {
        const { subjectId, teacherId, classId, slotId: ruleSlotId, day: ruleDay } = rule.parameters;
        if (
          (!ruleDay || ruleDay === day) &&
          (!ruleSlotId || ruleSlotId === slot.id) &&
          (!classId || classId === item.classId)
        ) {
          if (subjectId && subjectId === item.subjectId) {
            return {
              valid: false,
              penalty: rule.isMandatory ? 999 : 60,
              reason: `Disciplina proibida neste horário pela regra "${rule.name}"`,
            };
          }
          if (teacherId && teacherId === teacher.id) {
            return {
              valid: false,
              penalty: rule.isMandatory ? 999 : 60,
              reason: `Professor com restrição de horário pela regra "${rule.name}"`,
            };
          }
        }
      }
    }

    // Check Max Consecutive Lessons for Teacher
    const currentSlotIndex = lessonSlots.findIndex((s) => s.id === slot.id);
    let consecutiveBefore = 0;
    for (let i = currentSlotIndex - 1; i >= 0; i--) {
      const s = lessonSlots[i];
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
    for (let i = currentSlotIndex + 1; i < lessonSlots.length; i++) {
      const s = lessonSlots[i];
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
          penalty: maxConsecRule?.isMandatory ? 999 : 30,
          reason: `Excede limite de ${teacher.maxConsecutiveLessons || maxConsecLimit} tempos seguidos do Prof. ${teacher.shortName}`,
        };
      }
    }

    return { valid: true, penalty: 0 };
  }

  // Backtracking / Greedy CSP Solver
  let allocatedCount = 0;
  const unallocatedItems: { item: AllocationItem; reasons: string[] }[] = [];

  // Group items by class to balance day distribution
  const classItems = new Map<string, AllocationItem[]>();
  for (const item of itemsToAllocate) {
    const list = classItems.get(item.classId) || [];
    list.push(item);
    classItems.set(item.classId, list);
  }

  // Iterate classes and allocate slots
  for (const cls of classes) {
    const items = classItems.get(cls.id) || [];
    
    // Find all empty/unlocked slots for this class
    const availableSlots: { day: DayOfWeek; slot: TimeSlot }[] = [];
    for (const day of activeDays) {
      for (const slot of lessonSlots) {
        const key = `${day}_${slot.id}_${cls.id}`;
        if (!grid[key] || (!grid[key].isLocked && grid[key].subjectId === null)) {
          availableSlots.push({ day, slot });
        }
      }
    }

    // Shuffle slots slightly across days to prevent clumping on Mondays
    availableSlots.sort((a, b) => {
      // Prioritize days with fewer lessons in this class
      const countDayA = lessonSlots.filter((s) => grid[`${a.day}_${s.id}_${cls.id}`]?.subjectId).length;
      const countDayB = lessonSlots.filter((s) => grid[`${b.day}_${s.id}_${cls.id}`]?.subjectId).length;
      return countDayA - countDayB;
    });

    for (const item of items) {
      const capableTeachers = subjectTeachersMap.get(item.subjectId) || [];
      if (capableTeachers.length === 0) {
        unallocatedItems.push({
          item,
          reasons: [`Nenhum professor cadastrado para lecionar ${subjectMap.get(item.subjectId)?.name}`],
        });
        continue;
      }

      // Sort teachers: preferred first
      const sortedTeachers = [...capableTeachers].sort((t1, t2) => {
        if (t1.id === item.preferredTeacherId) return -1;
        if (t2.id === item.preferredTeacherId) return 1;
        return 0;
      });

      let placed = false;
      const failReasons: string[] = [];

      // Attempt 1: Strict rules
      for (const slotCandidate of availableSlots) {
        const key = `${slotCandidate.day}_${slotCandidate.slot.id}_${cls.id}`;
        if (grid[key]?.subjectId !== null) continue;

        for (const teacher of sortedTeachers) {
          const check = canPlace(item, teacher, slotCandidate.day, slotCandidate.slot, grid, false);
          if (check.valid) {
            grid[key] = {
              id: `cell_${slotCandidate.day}_${slotCandidate.slot.id}_${cls.id}`,
              day: slotCandidate.day,
              slotId: slotCandidate.slot.id,
              classId: cls.id,
              subjectId: item.subjectId,
              teacherId: teacher.id,
              isLocked: false,
            };
            placed = true;
            allocatedCount++;
            break;
          } else if (check.reason) {
            failReasons.push(check.reason);
          }
        }
        if (placed) break;
      }

      // Attempt 2: Relax soft preferences if not placed
      if (!placed) {
        for (const slotCandidate of availableSlots) {
          const key = `${slotCandidate.day}_${slotCandidate.slot.id}_${cls.id}`;
          if (grid[key]?.subjectId !== null) continue;

          for (const teacher of sortedTeachers) {
            const check = canPlace(item, teacher, slotCandidate.day, slotCandidate.slot, grid, true);
            if (check.valid) {
              grid[key] = {
                id: `cell_${slotCandidate.day}_${slotCandidate.slot.id}_${cls.id}`,
                day: slotCandidate.day,
                slotId: slotCandidate.slot.id,
                classId: cls.id,
                subjectId: item.subjectId,
                teacherId: teacher.id,
                isLocked: false,
                note: 'Alocado com relaxamento de preferência',
              };
              placed = true;
              allocatedCount++;
              break;
            }
          }
          if (placed) break;
        }
      }

      if (!placed) {
        unallocatedItems.push({
          item,
          reasons: Array.from(new Set(failReasons)).slice(0, 3),
        });
      }
    }
  }

  const durationMs = Math.round(performance.now() - startTime);

  // Grouped classes synchronization (e.g. MACC01/MACC02)
  for (const group of classes.filter((c) => c.isGrouped && c.groupedClassIds && c.groupedClassIds.length > 0)) {
    // Sync cells from primary class to other grouped classes
    const primaryId = group.groupedClassIds[0];
    if (primaryId) {
      for (const day of activeDays) {
        for (const slot of lessonSlots) {
          const sourceKey = `${day}_${slot.id}_${primaryId}`;
          const targetKey = `${day}_${slot.id}_${group.id}`;
          const sourceCell = grid[sourceKey];
          if (sourceCell) {
            grid[targetKey] = {
              ...sourceCell,
              id: `cell_${day}_${slot.id}_${group.id}`,
              classId: group.id,
            };
          }
        }
      }
    }
  }

  // Generate Diagnostics & Actionable Relaxation Suggestions
  const diagnostics: string[] = [];
  const suggestedRelaxations: string[] = [];

  if (unallocatedItems.length > 0) {
    // Summarize bottlenecks
    const unallocatedBySubClass = new Map<string, { count: number; reasons: Set<string>; subName: string; clsName: string }>();
    for (const u of unallocatedItems) {
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
        `Faltam ${val.count} aula(s) de ${val.subName} na turma ${val.clsName}. Motivo principal: ${reasonList || 'Indisponibilidade de horários compatíveis'}.`
      );
    });

    // Smart relaxation recommendations
    if (noConsecHeavyRule && noConsecHeavyRule.isEnabled && noConsecHeavyRule.isMandatory) {
      suggestedRelaxations.push(
        'Mudar a regra "Disciplinas Pesadas Consecutivas" de Obrigatória para Preferência para liberar mais combinações.'
      );
    }
    if (noDupSubjectRule && noDupSubjectRule.isEnabled && noDupSubjectRule.isMandatory) {
      suggestedRelaxations.push(
        'Permitir dobradinha (2 aulas da mesma matéria no mesmo dia) mudando a regra "Sem repetição no mesmo dia" para Preferência.'
      );
    }
    if (maxConsecRule && maxConsecRule.isMandatory) {
      suggestedRelaxations.push(
        'Aumentar o limite de tempos seguidos dos professores de 2 para 3 tempos.'
      );
    }
    suggestedRelaxations.push(
      'Verificar se há faltas cadastradas em dias com alta demanda ou cadastrar professores substitutos/suporte para as matérias em falta.'
    );
  }

  const success = unallocatedItems.length === 0;

  return {
    success,
    grid,
    allocatedCount,
    totalTargetCount,
    violations: diagnostics,
    diagnostics,
    suggestedRelaxations,
    durationMs,
  };
}
