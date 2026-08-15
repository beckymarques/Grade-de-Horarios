import {
  DayOfWeek,
  GridCell,
  ScheduleConflict,
  ScheduleRule,
  Subject,
  Teacher,
  TimeSlot,
  WindowTutor,
  ClassGroup,
  SubjectLoad,
  getDisplayClasses,
} from '../types';

export function areClassesInSameGroup(classId1: string, classId2: string, classes: ClassGroup[]): boolean {
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

  // 1. Group grid cells by day and slot for cross-class checks
  for (const day of activeDays) {
    for (const slot of lessonSlots) {
      const slotCells: GridCell[] = [];
      for (const cls of displayClasses) {
        const key = `${day}_${slot.id}_${cls.id}`;
        const cell = grid[key];
        if (cell && cell.subjectId && cell.teacherId) {
          slotCells.push(cell);
        }
      }

      // CHECK: Teacher Double Booking (Native physical law)
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
          const allSameGroup = cells.every((c) => areClassesInSameGroup(firstClassId, c.classId, classes));

          if (!allSameGroup) {
            const teacher = teacherMap.get(teacherId);
            const teacherName = teacher ? teacher.name : 'Professor';
            const classNames = cells.map((c) => classMap.get(c.classId)?.name || c.classId).join(', ');

            for (const cell of cells) {
              const currentClass = classMap.get(cell.classId)?.name || cell.classId;
              const otherClasses = cells
                .filter((c) => c.classId !== cell.classId)
                .map((c) => classMap.get(c.classId)?.name || c.classId)
                .join(', ');

              conflicts.push({
                id: `double_${cell.id}`,
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

      // CHECK: Shared Rooms (Salas Compartilhadas)
      const sharedRoomRule = rules.find((r) => r.type === 'shared_room' && r.isEnabled);
      if (sharedRoomRule || true) {
        // Check shared room conflicts
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
            const names = items.map((i) => i.teacher.name).join(' e ');
            for (const item of items) {
              conflicts.push({
                id: `shared_room_${item.cell.id}`,
                cellId: item.cell.id,
                day,
                slotId: slot.id,
                classId: item.cell.classId,
                type: 'shared_room',
                ruleName: 'Sala Compartilhada em Conflito',
                message: `Conflito de espaço físico: ${names} utilizam a mesma sala/laboratório e estão escalados simultaneamente no ${slot.name}.`,
                suggestion: 'Como corrigir: Realinhe o horário de um dos professores para que não utilizem o mesmo espaço ao mesmo tempo.',
                severity: isMandatory ? 'error' : 'warning',
                teacherId: item.teacher.id,
              });
            }
          }
        });
      }

      // CHECK: Teacher Absences (Faltas/Indisponibilidades)
      for (const cell of slotCells) {
        if (!cell.teacherId) continue;
        const teacher = teacherMap.get(cell.teacherId);
        if (teacher && teacher.absences) {
          const matchingAbsence = teacher.absences.find(
            (a) => a.day === day && (a.allDay || (a.slotIds && a.slotIds.includes(slot.id)))
          );
          if (matchingAbsence) {
            const reason = matchingAbsence.reason ? ` Motivo: "${matchingAbsence.reason}".` : '';
            conflicts.push({
              id: `absent_${cell.id}`,
              cellId: cell.id,
              day,
              slotId: slot.id,
              classId: cell.classId,
              type: 'teacher_absence',
              ruleName: 'Professor Ausente',
              message: `${teacher.name} possui indisponibilidade/falta cadastrada em ${day} no ${slot.name}.${reason}`,
              suggestion: `Como corrigir: Remova ${teacher.name} deste tempo, atribua outro docente ou edite as ausências do professor na aba Professores.`,
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
      const dayCells: { slot: TimeSlot; cell?: GridCell }[] = [];
      for (const slot of lessonSlots) {
        const key = `${day}_${slot.id}_${cls.id}`;
        dayCells.push({ slot, cell: grid[key] });
      }

      // CHECK: Duplicate Subject on same day
      // (Considering same subject name: e.g. "Química" twice is NOT allowed, but "Química Orgânica" + "Química Inorgânica" are different subjects and allowed)
      const noDupSubjectRule = rules.find((r) => r.type === 'no_duplicate_subject_same_day' && r.isEnabled);
      const doubleLessonRules = rules.filter((r) => r.type === 'double_lesson_substitution' && r.isEnabled);

      if (noDupSubjectRule) {
        // Group by normalized subject name AND subjectId
        const subjectOccurrencesByName = new Map<string, { slots: TimeSlot[]; subjectIds: string[]; displayName: string }>();
        
        for (const item of dayCells) {
          if (item.cell && item.cell.subjectId) {
            const sub = subjectMap.get(item.cell.subjectId);
            if (sub) {
              const normName = sub.name.trim().toLowerCase();
              const existing = subjectOccurrencesByName.get(normName) || {
                slots: [],
                subjectIds: [],
                displayName: sub.name,
              };
              existing.slots.push(item.slot);
              if (!existing.subjectIds.includes(sub.id)) {
                existing.subjectIds.push(sub.id);
              }
              subjectOccurrencesByName.set(normName, existing);
            }
          }
        }

        subjectOccurrencesByName.forEach((group, normName) => {
          if (group.slots.length > 1) {
            // Check if there is an active double lesson exception for this subject / class / day
            const hasDoubleLessonException = doubleLessonRules.some(
              (dr) =>
                (!dr.parameters.subjectId || group.subjectIds.includes(dr.parameters.subjectId)) &&
                (!dr.parameters.classId || dr.parameters.classId === cls.id) &&
                (!dr.parameters.day || dr.parameters.day === day)
            );

            // If it's a 1-day/week schedule, doubling is naturally expected for multi-hour subjects
            const isSingleDaySchedule = activeDays.length === 1;

            if (!hasDoubleLessonException && !isSingleDaySchedule) {
              const slotTimes = group.slots.map((s) => `${s.name} (${s.startTime})`).join(' e ');
              for (const s of group.slots) {
                const cell = grid[`${day}_${s.id}_${cls.id}`];
                conflicts.push({
                  id: `dup_sub_${cls.id}_${day}_${s.id}_${normName}`,
                  cellId: cell?.id,
                  day,
                  slotId: s.id,
                  classId: cls.id,
                  type: 'no_duplicate_subject_same_day',
                  ruleName: noDupSubjectRule.name || 'Disciplina Duplicada no Mesmo Dia',
                  message: `A disciplina "${group.displayName}" foi alocada ${group.slots.length} vezes para a turma ${cls.name} na ${day} (${slotTimes}).`,
                  suggestion: `Como corrigir: Mova uma das aulas para outro dia da semana ou crie uma exceção na aba Regras ("⚡ Exceção: Dobrar Aula") autorizando aulas dobradas desta matéria.`,
                  severity: noDupSubjectRule.isMandatory ? 'error' : 'warning',
                  subjectId: cell?.subjectId || undefined,
                });
              }
            }
          }
        });
      }

      // CHECK: No Consecutive Heavy Subjects (Disciplinas Pesadas Consecutivas)
      const noConsecHeavyRule = rules.find((r) => r.type === 'no_consecutive_heavy_subjects' && r.isEnabled);
      if (noConsecHeavyRule) {
        for (let i = 0; i < dayCells.length - 1; i++) {
          const current = dayCells[i];
          const next = dayCells[i + 1];
          if (current.cell?.subjectId && next.cell?.subjectId) {
            const sub1 = subjectMap.get(current.cell.subjectId);
            const sub2 = subjectMap.get(next.cell.subjectId);
            if (sub1?.isHeavy && sub2?.isHeavy) {
              // Both heavy in consecutive slots
              conflicts.push({
                id: `heavy_${cls.id}_${day}_${current.slot.id}_${next.slot.id}`,
                cellId: current.cell.id,
                day,
                slotId: current.slot.id,
                classId: cls.id,
                type: 'no_consecutive_heavy_subjects',
                ruleName: noConsecHeavyRule.name || 'Disciplinas Pesadas Consecutivas',
                message: `Sobrecarga cognitiva: ${sub1.name} e ${sub2.name} são matérias de alta densidade e estão em tempos seguidos na turma ${cls.name}.`,
                suggestion: `Como corrigir: Intercale uma disciplina mais leve ou um intervalo entre ${sub1.shortName} e ${sub2.shortName}.`,
                severity: noConsecHeavyRule.isMandatory ? 'error' : 'warning',
                subjectId: sub1.id,
              });
            }
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
      let streakSlots: TimeSlot[] = [];

      for (const slot of lessonSlots) {
        // Check if teacher has any class in this slot
        let isTeachingInSlot = false;
        let activeCell: GridCell | null = null;
        for (const cls of classes) {
          const key = `${day}_${slot.id}_${cls.id}`;
          const cell = grid[key];
          if (cell && cell.teacherId === teacher.id && cell.subjectId) {
            isTeachingInSlot = true;
            activeCell = cell;
            break;
          }
        }

        if (isTeachingInSlot) {
          consecutiveCount++;
          streakSlots.push(slot);
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
              suggestion: `Como corrigir: Aloque um tempo livre/intervalo para ${teacher.name} descansar entre as aulas.`,
              severity: maxConsecRule?.isMandatory ? 'error' : 'warning',
              teacherId: teacher.id,
            });
          }
        } else {
          consecutiveCount = 0;
          streakSlots = [];
        }
      }
    }
  }

  // 4. Custom Parametric Rules (Fixed slots, Forbidden slots, Lunch start/end limits)
  for (const rule of rules.filter((r) => r.isEnabled)) {
    // Lunch Max Start Time Rule
    if (rule.type === 'lunch_max_start_time') {
      const maxStart = rule.parameters.maxStartTime || rule.parameters.targetTime || '12:30';
      const lunchSlot = slots.find(
        (s) => s.type === 'event' && (s.id.includes('lunch') || s.name.toLowerCase().includes('almoço'))
      );

      if (lunchSlot) {
        if (lunchSlot.startTime > maxStart) {
          conflicts.push({
            id: `lunch_start_${rule.id}`,
            day: activeDays[0] || 'SEG',
            slotId: lunchSlot.id,
            type: 'lunch_max_start_time',
            ruleName: rule.name || 'Limite de Horário de Início do Almoço',
            message: `O almoço está iniciando às ${lunchSlot.startTime}, ultrapassando o horário limite de ${maxStart} definido na regra "${rule.name}".`,
            suggestion: `Como corrigir: Na aba "Tempos do Dia", posicione o evento Almoço para após uma aula anterior (ex: após a 3ª ou 4ª aula) ou reduza a duração das primeiras aulas.`,
            severity: rule.isMandatory ? 'error' : 'warning',
          });
        }
      }
    }

    // Lunch Max End Time Rule
    if (rule.type === 'lunch_max_end_time') {
      const maxEnd = rule.parameters.maxEndTime || rule.parameters.targetTime || '13:30';
      const lunchSlot = slots.find(
        (s) => s.type === 'event' && (s.id.includes('lunch') || s.name.toLowerCase().includes('almoço'))
      );

      if (lunchSlot) {
        if (lunchSlot.endTime > maxEnd) {
          conflicts.push({
            id: `lunch_end_${rule.id}`,
            day: activeDays[0] || 'SEG',
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

    // Forbidden slot rule
    if (rule.type === 'forbidden_slot') {
      const { subjectId, teacherId, classId, slotId, day } = rule.parameters;
      for (const d of activeDays) {
        if (day && day !== d) continue;
        for (const s of lessonSlots) {
          if (slotId && slotId !== s.id) continue;
          for (const c of classes) {
            if (classId && classId !== c.id) continue;
            const cell = grid[`${d}_${s.id}_${c.id}`];
            if (cell) {
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
      const { subjectId, teacherId, classId, slotId, day } = rule.parameters;
      if (day && slotId && classId) {
        const cell = grid[`${day}_${slotId}_${classId}`];
        const isMatched =
          cell &&
          (!subjectId || cell.subjectId === subjectId) &&
          (!teacherId || cell.teacherId === teacherId);

        if (!isMatched) {
          const sub = subjectId ? subjectMap.get(subjectId)?.shortName : '';
          const tea = teacherId ? teacherMap.get(teacherId)?.shortName : '';
          const cls = classMap.get(classId)?.name;
          const slotName = slots.find((s) => s.id === slotId)?.name || slotId;
          conflicts.push({
            id: `fixed_missing_${rule.id}`,
            day,
            slotId,
            classId,
            type: 'fixed_slot',
            ruleName: rule.name,
            message: `Alocação fixa pendente: ${sub || 'Disciplina'} ${tea ? `(${tea})` : ''} deve estar obrigatoriamente alocada em ${cls || ''} na ${day} no ${slotName}.`,
            suggestion: `Como corrigir: Clique na célula correspondente (${day}, ${slotName}, ${cls}) e atribua a disciplina e professor fixados.`,
            severity: rule.isMandatory ? 'error' : 'warning',
            subjectId,
            teacherId,
          });
        }
      }
    }
  }

  // 5. Compute "Tutores em Janela" (Window Tutors / Available Teachers) per day and slot
  // In any given slot of a day, all registered teachers who are NOT absent on that day/slot AND are NOT currently teaching a class in this slot are available!
  // Example: If 6 teachers are registered and 2 are teaching in this slot, the other 4 are free / in window for tutoring.
  const windowTutors: WindowTutor[] = [];

  for (const day of activeDays) {
    for (const slot of lessonSlots) {
      // Find all teachers teaching in this slot on this day
      const teachingTeacherIds = new Set<string>();
      for (const cls of classes) {
        const key = `${day}_${slot.id}_${cls.id}`;
        const cell = grid[key];
        if (cell && cell.teacherId && cell.subjectId) {
          teachingTeacherIds.add(cell.teacherId);
        }
      }

      // Check each teacher in the school
      for (const teacher of teachers) {
        // If teacher is absent on this day / slot, they are not available
        const isAbsent = teacher.absences?.some(
          (a) => a.day === day && (a.allDay || (a.slotIds && a.slotIds.includes(slot.id)))
        );
        if (isAbsent) continue;

        // If not teaching in this slot, they are in window / available for tutoring
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

  // 6. Compute Load Summary & Missing Loads
  const loadSummary: ValidationReport['loadSummary'] = [];
  for (const load of loads) {
    const cls = classMap.get(load.classId);
    const sub = subjectMap.get(load.subjectId);
    if (!cls || !sub) continue;

    let actual = 0;
    for (const day of activeDays) {
      for (const slot of lessonSlots) {
        const key = `${day}_${slot.id}_${cls.id}`;
        const cell = grid[key];
        if (cell && cell.subjectId === sub.id) {
          actual++;
        }
      }
    }

    const difference = actual - load.lessonsPerWeek;
    loadSummary.push({
      classId: cls.id,
      className: cls.name,
      subjectId: sub.id,
      subjectName: sub.name,
      target: load.lessonsPerWeek,
      actual,
      difference,
    });

    if (difference !== 0) {
      const exactRule = rules.find((r) => r.type === 'exact_load_match' && r.isEnabled);
      if (exactRule) {
        const isDeficit = difference < 0;
        conflicts.push({
          id: `load_${load.id}`,
          day: activeDays[0],
          slotId: lessonSlots[0]?.id || '',
          classId: cls.id,
          type: 'exact_load_match',
          ruleName: 'Carga Horária Semanal',
          message: `${cls.name} possui ${actual}/${load.lessonsPerWeek} aulas de ${sub.shortName} (${isDeficit ? `faltam ${Math.abs(difference)}` : `excesso de ${difference}`}).`,
          severity: exactRule.isMandatory ? 'warning' : 'warning',
          subjectId: sub.id,
        });
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
