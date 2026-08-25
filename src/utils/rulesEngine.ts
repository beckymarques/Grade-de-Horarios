import {
  DayOfWeek,
  GridCell,
  ScheduleConflict,
  ConflictSeverity,
  ScheduleRule,
  Subject,
  Teacher,
  TimeSlot,
  WindowTutor,
  ClassGroup,
  SubjectLoad,
  getDisplayClasses,
} from '../types';

export function areClassesInSameGroup(
  classId1: string,
  classId2: string,
  classes: ClassGroup[]
): boolean {
  if (classId1 === classId2) return true;
  for (const c of classes) {
    if (c.isGrouped && c.groupedClassIds && c.groupedClassIds.length > 0) {
      const is1InGroup = c.id === classId1 || c.groupedClassIds.includes(classId1);
      const is2InGroup = c.id === classId2 || c.groupedClassIds.includes(classId2);
      if (is1InGroup && is2InGroup) return true;
    }
  }
  return false;
}

/**
 * Resolves the effective grid cell for a given class, taking into account
 * whether the class is an individual member of an active grouped class, or if
 * the class is a grouped container itself.
 */
export function resolveCellForClass(
  grid: Record<string, GridCell>,
  day: DayOfWeek,
  slotId: string,
  classId: string,
  classes: ClassGroup[]
): GridCell | undefined {
  // 1. Direct cell match
  const direct = grid[`${day}_${slotId}_${classId}`];
  if (direct && direct.subjectId) return direct;

  // 2. Check if classId belongs to any active grouped class that has an allocation
  for (const cls of classes) {
    if (cls.isGrouped && cls.groupedClassIds && cls.groupedClassIds.includes(classId)) {
      const groupCell = grid[`${day}_${slotId}_${cls.id}`];
      if (groupCell && groupCell.subjectId) return groupCell;

      for (const memberId of cls.groupedClassIds) {
        const memberCell = grid[`${day}_${slotId}_${memberId}`];
        if (memberCell && memberCell.subjectId) return memberCell;
      }
    }
  }

  // 3. If classId is itself a grouped class, check its constituent members
  const thisCls = classes.find((c) => c.id === classId);
  if (thisCls?.isGrouped && thisCls.groupedClassIds && thisCls.groupedClassIds.length > 0) {
    for (const memberId of thisCls.groupedClassIds) {
      const memberCell = grid[`${day}_${slotId}_${memberId}`];
      if (memberCell && memberCell.subjectId) return memberCell;
    }
  }

  // 4. If any class in the same group has an allocation
  for (const cls of classes) {
    if (areClassesInSameGroup(classId, cls.id, classes)) {
      const otherCell = grid[`${day}_${slotId}_${cls.id}`];
      if (otherCell && otherCell.subjectId) return otherCell;
    }
  }

  return direct;
}

export function timeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return 0;
  const hh = parseInt(parts[0], 10) || 0;
  const mm = parseInt(parts[1], 10) || 0;
  return hh * 60 + mm;
}

export interface ValidationReport {
  conflicts: ScheduleConflict[];
  windowTutors: WindowTutor[];
  loadSummary: {
    classId: string;
    className: string;
    subjectId: string;
    subjectName: string;
    target: number;
    actual: number;
    difference: number;
  }[];
  isValid: boolean;
  totalErrors: number;
  totalWarnings: number;
}

export function validateSchedule(
  grid: Record<string, GridCell>,
  activeDays: DayOfWeek[],
  slots: TimeSlot[],
  classes: ClassGroup[],
  subjects: Subject[],
  teachers: Teacher[],
  rules: ScheduleRule[],
  loads: SubjectLoad[]
): ValidationReport {
  const conflicts: ScheduleConflict[] = [];
  const lessonSlots = slots.filter((s) => s.type === 'lesson');
  const displayClasses = getDisplayClasses(classes);

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const classMap = new Map(classes.map((c) => [c.id, c]));

  // 1. Double Booking & Grouped Class Concurrency Check
  for (const day of activeDays) {
    for (const slot of lessonSlots) {
      const slotCells: GridCell[] = [];
      for (const cls of displayClasses) {
        const cell = resolveCellForClass(grid, day, slot.id, cls.id, classes);
        if (cell && cell.subjectId && cell.teacherId) {
          slotCells.push(cell);
        }
      }

      // CHECK: Teacher Double Booking (Native physical constraint)
      const teacherCounts = new Map<string, GridCell[]>();
      for (const cell of slotCells) {
        if (!cell.teacherId) continue;
        const list = teacherCounts.get(cell.teacherId) || [];
        list.push(cell);
        teacherCounts.set(cell.teacherId, list);
      }

      teacherCounts.forEach((cells, teacherId) => {
        if (cells.length > 1) {
          // Check if all these classes are part of the same grouped batch
          const firstClassId = cells[0].classId;
          const allSameGroup = cells.every((c) =>
            areClassesInSameGroup(firstClassId, c.classId, classes)
          );

          if (!allSameGroup) {
            const teacher = teacherMap.get(teacherId);
            const teacherName = teacher ? (teacher.shortName || teacher.name) : 'Professor';

            for (const cell of cells) {
              const currentClass = classMap.get(cell.classId)?.name || cell.classId;
              const otherClasses = cells
                .filter((c) => c.classId !== cell.classId)
                .map((c) => classMap.get(c.classId)?.name || c.classId)
                .join(', ');

              conflicts.push({
                id: `double_${cell.id}_${day}_${slot.id}`,
                cellId: cell.id,
                day,
                slotId: slot.id,
                classId: cell.classId,
                type: 'teacher_no_double_booking',
                ruleName: 'Simultaneidade de Professor',
                message: `${teacherName} está alocado simultaneamente na ${currentClass} e ${otherClasses} no ${slot.name} (${slot.startTime}–${slot.endTime}).`,
                suggestion: `Como corrigir: Mova a aula de ${teacherName} em uma das turmas para outro tempo/dia ou substitua o professor.`,
                severity: 'error',
                teacherId,
              });
            }
          }
        }
      });

      // CHECK: Shared Rooms (Salas Compartilhadas) - only executed if the rule is enabled
      const sharedRoomRule = rules.find((r) => r.type === 'shared_room' && r.isEnabled);
      if (sharedRoomRule) {
        const roomTeachers = new Map<string, { cell: GridCell; teacher: Teacher }[]>();
        for (const cell of slotCells) {
          if (!cell.teacherId) continue;
          const teacher = teacherMap.get(cell.teacherId);
          if (teacher && teacher.sharedRoomId) {
            const list = roomTeachers.get(teacher.sharedRoomId) || [];
            list.push({ cell, teacher });
            roomTeachers.set(teacher.sharedRoomId, list);
          }
        }

        roomTeachers.forEach((items, roomId) => {
          if (items.length > 1) {
            const isMandatory = sharedRoomRule ? sharedRoomRule.isMandatory : true;
            const names = items.map((i) => i.teacher.shortName || i.teacher.name).join(' e ');
            for (const item of items) {
              conflicts.push({
                id: `shared_room_${item.cell.id}_${day}_${slot.id}`,
                cellId: item.cell.id,
                day,
                slotId: slot.id,
                classId: item.cell.classId,
                type: 'shared_room',
                ruleName: 'Sala Compartilhada em Conflito',
                message: `Conflito de espaço físico: ${names} utilizam o mesmo ambiente compartilhado e estão escalados simultaneamente no ${slot.name}.`,
                suggestion:
                  'Como corrigir: Realinhe o horário de um dos professores para que não utilizem o mesmo espaço ao mesmo tempo.',
                severity: isMandatory ? 'error' : 'warning',
                teacherId: item.teacher.id,
              });
            }
          }
        });
      }

      // CHECK: Teacher Absences (Faltas / Indisponibilidades)
      for (const cell of slotCells) {
        if (!cell.teacherId) continue;
        const teacher = teacherMap.get(cell.teacherId);
        if (teacher && teacher.absences && teacher.absences.length > 0) {
          const matchingAbsence = teacher.absences.find(
            (a) => a.day === day && (a.allDay || !a.slotIds || a.slotIds.length === 0 || a.slotIds.includes(slot.id))
          );
          if (matchingAbsence) {
            const reason = matchingAbsence.reason ? ` (Motivo: "${matchingAbsence.reason}")` : '';
            conflicts.push({
              id: `absent_${cell.id}_${day}_${slot.id}`,
              cellId: cell.id,
              day,
              slotId: slot.id,
              classId: cell.classId,
              type: 'teacher_absence',
              ruleName: 'Professor Ausente / Indisponível',
              message: `${teacher.name} possui ausência/indisponibilidade cadastrada em ${day} no ${slot.name}.${reason}`,
              suggestion: `Como corrigir: Remova ${teacher.shortName || teacher.name} deste tempo, atribua outro docente ou edite as ausências do professor na aba Professores.`,
              severity: 'error',
              teacherId: teacher.id,
            });
          }
        }
      }
    }
  }

  // 2. Class-specific sequential checks (per class, per day)
  for (const day of activeDays) {
    for (const cls of classes) {
      // CHECK: Duplicate Subject on same day
      const noDupSubjectRule = rules.find(
        (r) => r.type === 'no_duplicate_subject_same_day' && r.isEnabled
      );
      const doubleLessonRules = rules.filter(
        (r) => r.type === 'double_lesson_substitution' && r.isEnabled
      );

      if (noDupSubjectRule) {
        const subjectOccurrencesByName = new Map<
          string,
          { slots: TimeSlot[]; subjectIds: string[]; displayName: string }
        >();

        for (const slot of lessonSlots) {
          const cell = resolveCellForClass(grid, day, slot.id, cls.id, classes);
          if (cell && cell.subjectId) {
            const sub = subjectMap.get(cell.subjectId);
            if (sub) {
              const normName = sub.name.trim().toLowerCase();
              const existing = subjectOccurrencesByName.get(normName) || {
                slots: [],
                subjectIds: [],
                displayName: sub.name,
              };
              existing.slots.push(slot);
              if (!existing.subjectIds.includes(sub.id)) {
                existing.subjectIds.push(sub.id);
              }
              subjectOccurrencesByName.set(normName, existing);
            }
          }
        }

        subjectOccurrencesByName.forEach((group, normName) => {
          if (group.slots.length > 1) {
            const hasDoubleLessonException = doubleLessonRules.some(
              (dr) =>
                (!dr.parameters.subjectId || group.subjectIds.includes(dr.parameters.subjectId)) &&
                (!dr.parameters.classId || dr.parameters.classId === cls.id) &&
                (!dr.parameters.day || dr.parameters.day === day)
            );

            const isSingleDaySchedule = activeDays.length === 1;

            if (!hasDoubleLessonException && !isSingleDaySchedule) {
              const slotTimes = group.slots
                .map((s) => `${s.name} (${s.startTime})`)
                .join(' e ');
              for (const s of group.slots) {
                const cell = resolveCellForClass(grid, day, s.id, cls.id, classes);
                conflicts.push({
                  id: `dup_sub_${cls.id}_${day}_${s.id}_${normName}`,
                  cellId: cell?.id,
                  day,
                  slotId: s.id,
                  classId: cls.id,
                  type: 'no_duplicate_subject_same_day',
                  ruleName: noDupSubjectRule.name || 'Disciplina Duplicada no Mesmo Dia',
                  message: `A disciplina "${group.displayName}" foi alocada ${group.slots.length} vezes para a turma ${cls.name} na ${day} (${slotTimes}).`,
                  suggestion: `Como corrigir: Mova uma das aulas para outro dia da semana ou crie uma exceção na aba Regras autorizando aulas dobradas desta matéria.`,
                  severity: noDupSubjectRule.isMandatory ? 'error' : 'warning',
                  subjectId: cell?.subjectId || undefined,
                });
              }
            }
          }
        });
      }

      // CHECK: No Consecutive Heavy Subjects (Disciplinas Pesadas Consecutivas)
      const noConsecHeavyRule = rules.find(
        (r) => r.type === 'no_consecutive_heavy_subjects' && r.isEnabled
      );
      if (noConsecHeavyRule) {
        let previousHeavySlot: TimeSlot | null = null;
        let previousHeavySubject: Subject | null = null;
        let previousHeavyCell: GridCell | null = null;

        for (const slot of slots) {
          if (slot.type === 'interval' || slot.type === 'event') {
            previousHeavySlot = null;
            previousHeavySubject = null;
            previousHeavyCell = null;
            continue;
          }

          const cell = resolveCellForClass(grid, day, slot.id, cls.id, classes);
          const sub = cell?.subjectId ? subjectMap.get(cell.subjectId) : null;

          if (sub?.isHeavy) {
            if (previousHeavySlot && previousHeavySubject && previousHeavyCell) {
              conflicts.push({
                id: `heavy_${cls.id}_${day}_${previousHeavySlot.id}_${slot.id}`,
                cellId: cell?.id || previousHeavyCell.id,
                day,
                slotId: slot.id,
                classId: cls.id,
                type: 'no_consecutive_heavy_subjects',
                ruleName: noConsecHeavyRule.name || 'Disciplinas Pesadas Consecutivas',
                message: `Sobrecarga cognitiva: ${previousHeavySubject.name} (${previousHeavySlot.name}) e ${sub.name} (${slot.name}) são matérias de alta densidade e estão em tempos seguidos na turma ${cls.name}.`,
                suggestion: `Como corrigir: Intercale uma disciplina mais leve ou um intervalo entre ${previousHeavySubject.shortName} e ${sub.shortName}.`,
                severity: noConsecHeavyRule.isMandatory ? 'error' : 'warning',
                subjectId: sub.id,
              });
            }
            previousHeavySlot = slot;
            previousHeavySubject = sub;
            previousHeavyCell = cell || null;
          } else {
            previousHeavySlot = null;
            previousHeavySubject = null;
            previousHeavyCell = null;
          }
        }
      }
    }
  }

  // 3. Teacher-specific sequential checks (Max consecutive lessons)
  const maxConsecRule = rules.find((r) => r.type === 'max_consecutive_teacher' && r.isEnabled);
  const globalMaxConsecutive = maxConsecRule?.parameters?.maxConsecutive || 3;

  for (const day of activeDays) {
    for (const teacher of teachers) {
      const maxAllowed = teacher.maxConsecutiveLessons || globalMaxConsecutive;
      let consecutiveCount = 0;

      for (const slot of slots) {
        if (slot.type === 'interval' || slot.type === 'event') {
          consecutiveCount = 0;
          continue;
        }

        let isTeachingInSlot = false;
        let activeCell: GridCell | null = null;
        for (const cls of classes) {
          const cell = resolveCellForClass(grid, day, slot.id, cls.id, classes);
          if (cell && cell.teacherId === teacher.id && cell.subjectId) {
            isTeachingInSlot = true;
            activeCell = cell;
            break;
          }
        }

        if (isTeachingInSlot) {
          consecutiveCount++;
          if (consecutiveCount > maxAllowed && activeCell) {
            conflicts.push({
              id: `max_consec_${teacher.id}_${day}_${slot.id}`,
              cellId: activeCell.id,
              day,
              slotId: slot.id,
              classId: activeCell.classId,
              type: 'max_consecutive_teacher',
              ruleName: 'Excesso de Aulas Consecutivas',
              message: `${teacher.name} atingiu ${consecutiveCount} tempos seguidos sem intervalo em ${day} (o limite configurado é de no máximo ${maxAllowed} aulas seguidas).`,
              suggestion: `Como corrigir: Aloque um tempo livre/intervalo para ${teacher.shortName || teacher.name} descansar entre as aulas.`,
              severity: maxConsecRule?.isMandatory ? 'error' : 'warning',
              teacherId: teacher.id,
            });
          }
        } else {
          consecutiveCount = 0;
        }
      }
    }
  }

  // 4. Custom Parametric Rules (Fixed slots, Forbidden slots, Lunch start/end limits)
  for (const rule of rules.filter((r) => r.isEnabled)) {
    // Lunch Max Start Time Rule
    if (rule.type === 'lunch_max_start_time') {
      const maxStart = rule.parameters.maxStartTime || rule.parameters.targetTime || '12:30';
      const maxStartMin = timeToMinutes(maxStart);

      const lunchSlot = slots.find(
        (s) =>
          (s.type === 'event' || s.type === 'interval') &&
          (s.id.toLowerCase().includes('lunch') ||
            s.id.toLowerCase().includes('almoc') ||
            s.name.toLowerCase().includes('almoç') ||
            s.name.toLowerCase().includes('almoc') ||
            s.name.toLowerCase().includes('lunch'))
      );

      if (lunchSlot) {
        const lunchStartMin = timeToMinutes(lunchSlot.startTime);
        if (lunchStartMin > maxStartMin) {
          for (const d of activeDays) {
            conflicts.push({
              id: `lunch_start_${rule.id}_${d}`,
              day: d,
              slotId: lunchSlot.id,
              type: 'lunch_max_start_time',
              ruleName: rule.name || 'Limite de Horário de Início do Almoço',
              message: `O almoço está iniciando às ${lunchSlot.startTime}, ultrapassando o horário limite de ${maxStart} definido na regra "${rule.name}".`,
              suggestion: `Como corrigir: Na aba "Tempos do Dia", posicione o evento Almoço para após uma aula anterior ou reduza a duração das primeiras aulas.`,
              severity: rule.isMandatory ? 'error' : 'warning',
            });
          }
        }
      }
    }

    // Lunch Max End Time Rule
    if (rule.type === 'lunch_max_end_time') {
      const maxEnd = rule.parameters.maxEndTime || rule.parameters.targetTime || '13:30';
      const maxEndMin = timeToMinutes(maxEnd);

      const lunchSlot = slots.find(
        (s) =>
          (s.type === 'event' || s.type === 'interval') &&
          (s.id.toLowerCase().includes('lunch') ||
            s.id.toLowerCase().includes('almoc') ||
            s.name.toLowerCase().includes('almoç') ||
            s.name.toLowerCase().includes('almoc') ||
            s.name.toLowerCase().includes('lunch'))
      );

      if (lunchSlot) {
        const lunchEndMin = timeToMinutes(lunchSlot.endTime);
        if (lunchEndMin > maxEndMin) {
          for (const d of activeDays) {
            conflicts.push({
              id: `lunch_end_${rule.id}_${d}`,
              day: d,
              slotId: lunchSlot.id,
              type: 'lunch_max_end_time',
              ruleName: rule.name || 'Limite de Horário de Término do Almoço',
              message: `O almoço está terminando às ${lunchSlot.endTime}, ultrapassando o horário limite de término de ${maxEnd} definido na regra "${rule.name}".`,
              suggestion: `Como corrigir: Na aba "Tempos do Dia", reduza a duração em minutos do Almoço ou posicione o Almoço mais cedo no dia.`,
              severity: rule.isMandatory ? 'error' : 'warning',
            });
          }
        }
      }
    }

    // Forbidden slot rule (supporting multi-slots slotIds and single slotId)
    if (rule.type === 'forbidden_slot') {
      const { subjectId, teacherId, classId, slotId, slotIds, day, days } = rule.parameters;
      for (const d of activeDays) {
        if (day && day !== d) continue;
        if (days && days.length > 0 && !days.includes(d)) continue;
        for (const s of lessonSlots) {
          const isSlotRestricted =
            (!slotId && (!slotIds || slotIds.length === 0)) ||
            (slotId && slotId === s.id) ||
            (slotIds && slotIds.includes(s.id));
          if (!isSlotRestricted) continue;

          for (const c of classes) {
            if (classId && classId !== c.id && !areClassesInSameGroup(classId, c.id, classes)) continue;
            const cell = resolveCellForClass(grid, d, s.id, c.id, classes);
            if (cell && cell.subjectId) {
              if (subjectId && cell.subjectId === subjectId) {
                const sub = subjectMap.get(subjectId);
                conflicts.push({
                  id: `forbidden_sub_${rule.id}_${d}_${s.id}_${c.id}`,
                  cellId: cell.id,
                  day: d,
                  slotId: s.id,
                  classId: c.id,
                  type: 'forbidden_slot',
                  ruleName: rule.name,
                  message: `A disciplina ${sub?.name || ''} é proibida no ${s.name} para a turma ${c.name} conforme a regra "${rule.name}".`,
                  suggestion: `Como corrigir: Mova a aula de ${sub?.shortName || 'disciplina'} para outro tempo que não possua restrição.`,
                  severity: rule.isMandatory ? 'error' : 'warning',
                  subjectId,
                });
              }
              if (teacherId && cell.teacherId === teacherId) {
                const tea = teacherMap.get(teacherId);
                conflicts.push({
                  id: `forbidden_tea_${rule.id}_${d}_${s.id}_${c.id}`,
                  cellId: cell.id,
                  day: d,
                  slotId: s.id,
                  classId: c.id,
                  type: 'forbidden_slot',
                  ruleName: rule.name,
                  message: `O professor ${tea?.name || 'Professor'} possui restrição para lecionar no ${s.name} (${d}) pela regra "${rule.name}".`,
                  suggestion: `Como corrigir: Troque o professor deste horário ou realoque a aula para um horário liberado.`,
                  severity: rule.isMandatory ? 'error' : 'warning',
                  teacherId,
                });
              }
            }
          }
        }
      }
    } else if (rule.type === 'fixed_slot') {
      // Fixed slot rule (recognizing grouped classes)
      const { subjectId, teacherId, classId, slotId, day } = rule.parameters;
      if (day && slotId && classId) {
        const cell = resolveCellForClass(grid, day, slotId, classId, classes);
        const isMatched =
          cell &&
          cell.subjectId &&
          (!subjectId || cell.subjectId === subjectId) &&
          (!teacherId || cell.teacherId === teacherId);

        if (!isMatched) {
          const sub = subjectId ? subjectMap.get(subjectId)?.shortName : '';
          const tea = teacherId ? teacherMap.get(teacherId)?.shortName : '';
          const cls = classMap.get(classId)?.name || classId;
          const slotName = slots.find((s) => s.id === slotId)?.name || slotId;
          conflicts.push({
            id: `fixed_missing_${rule.id}_${day}_${slotId}_${classId}`,
            day,
            slotId,
            classId,
            type: 'fixed_slot',
            ruleName: rule.name || 'Horário Fixo Obrigatório',
            message: `Alocação fixa pendente: ${sub || 'Disciplina'} ${tea ? `(${tea})` : ''} deve estar obrigatoriamente alocada em ${cls} na ${day} no ${slotName}.`,
            suggestion: `Como corrigir: Clique na célula correspondente (${day}, ${slotName}, ${cls}) e atribua a disciplina e professor fixados, ou execute "Gerar Grade".`,
            severity: rule.isMandatory ? 'error' : 'warning',
            subjectId,
            teacherId,
          });
        }
      }
    }
  }

  // 5. Compute "Tutores em Janela" (Window Tutors / Available Teachers) per day and slot
  const windowTutors: WindowTutor[] = [];

  for (const day of activeDays) {
    for (const slot of lessonSlots) {
      const teachingTeacherIds = new Set<string>();

      // Scan resolved cells for all active display classes
      for (const cls of displayClasses) {
        const cell = resolveCellForClass(grid, day, slot.id, cls.id, classes);
        if (cell && cell.teacherId && cell.subjectId) {
          teachingTeacherIds.add(cell.teacherId);
        }
      }

      for (const teacher of teachers) {
        const isAbsent = teacher.absences?.some(
          (a) => a.day === day && (a.allDay || !a.slotIds || a.slotIds.length === 0 || a.slotIds.includes(slot.id))
        );
        if (isAbsent) continue;

        if (!teachingTeacherIds.has(teacher.id)) {
          windowTutors.push({
            day,
            slotId: slot.id,
            teacherId: teacher.id,
            teacherName: teacher.shortName || teacher.name,
            reason: `Disponível para tutoria/plantão no ${slot.name} (${slot.startTime}–${slot.endTime})`,
          });
        }
      }
    }
  }

  // 6. Compute Load Summary & Workload Discrepancy Warnings/Errors
  const exactRule = rules.find((r) => r.type === 'exact_load_match' && r.isEnabled);
  const loadSummary: ValidationReport['loadSummary'] = [];

  // Iterate over display classes to treat grouped classes as one unified class
  for (const cls of displayClasses) {
    let classLoads = loads.filter((l) => l.classId === cls.id);

    // Fallback: If no direct loads exist for the group class container yet, read from first member
    if (classLoads.length === 0 && cls.isGrouped && cls.groupedClassIds && cls.groupedClassIds.length > 0) {
      classLoads = loads.filter((l) => l.classId === cls.groupedClassIds![0]);
    }

    // Consolidate loads per subject for this display class
    const subjectLoadsMap = new Map<string, { target: number; loadId: string }>();
    for (const cl of classLoads) {
      subjectLoadsMap.set(cl.subjectId, {
        target: cl.lessonsPerWeek,
        loadId: cl.id,
      });
    }

    for (const [subjectId, { target, loadId }] of subjectLoadsMap.entries()) {
      const sub = subjectMap.get(subjectId);
      if (!sub) continue;

      let actual = 0;
      const allocatedSlots: { day: DayOfWeek; slotId: string; cellId: string }[] = [];

      for (const day of activeDays) {
        for (const slot of lessonSlots) {
          const cell = resolveCellForClass(grid, day, slot.id, cls.id, classes);
          if (cell && cell.subjectId === sub.id) {
            actual++;
            allocatedSlots.push({ day, slotId: slot.id, cellId: cell.id });
          }
        }
      }

      const difference = actual - target;
      loadSummary.push({
        classId: cls.id,
        className: cls.name,
        subjectId: sub.id,
        subjectName: sub.name,
        target,
        actual,
        difference,
      });

      // ALWAYS emit a validation notice if load is not fulfilled or exceeds target (Severity: ERROR)
      if (difference !== 0) {
        const isDeficit = difference < 0;
        const severity: ConflictSeverity = 'error';

        // 1. If subject is allocated in some slots, attach workload status to EVERY slot where it appears
        if (allocatedSlots.length > 0) {
          for (const alloc of allocatedSlots) {
            conflicts.push({
              id: `load_mismatch_${loadId}_${alloc.day}_${alloc.slotId}_${cls.id}`,
              cellId: alloc.cellId,
              day: alloc.day,
              slotId: alloc.slotId,
              classId: cls.id,
              type: 'exact_load_match',
              ruleName: isDeficit
                ? `Carga Horária Incompleta (${sub.shortName || sub.name})`
                : `Excesso de Carga Horária (${sub.shortName || sub.name})`,
              message: `${cls.name}: ${actual} de ${target} aulas alocadas para ${sub.name} (${
                isDeficit ? `faltam ${Math.abs(difference)} aula(s)` : `excesso de ${difference} aula(s)`
              }).`,
              suggestion: isDeficit
                ? `Como corrigir: Aloque as ${Math.abs(difference)} aula(s) restante(s) de ${sub.shortName} na turma ${cls.name} ou clique em "Gerar Grade".`
                : `Como corrigir: Remova ${difference} aula(s) excedente(s) de ${sub.shortName} na turma ${cls.name}.`,
              severity,
              subjectId: sub.id,
            });
          }
        } else if (target > 0) {
          // If 0 lessons allocated, attach notice to all active days in the first lesson slot so it appears in the live validation column
          for (const day of activeDays) {
            conflicts.push({
              id: `load_zero_${loadId}_${day}_${cls.id}`,
              day,
              slotId: lessonSlots[0]?.id || 'lesson_1',
              classId: cls.id,
              type: 'exact_load_match',
              ruleName: `Carga Horária Pendente (${sub.shortName || sub.name})`,
              message: `${cls.name}: 0 de ${target} aulas alocadas para ${sub.name} (faltam ${target} aulas).`,
              suggestion: `Como corrigir: Aloque as aulas de ${sub.name} para a turma ${cls.name} ou utilize o gerador automático.`,
              severity,
              subjectId: sub.id,
            });
          }
        }
      }
    }
  }

  const totalErrors = conflicts.filter((c) => c.severity === 'error').length;
  const totalWarnings = conflicts.filter((c) => c.severity === 'warning').length;

  return {
    conflicts,
    windowTutors,
    loadSummary,
    isValid: totalErrors === 0,
    totalErrors,
    totalWarnings,
  };
}
