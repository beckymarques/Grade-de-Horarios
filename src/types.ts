export interface ShiftRangeConfig {
  morningStart: string; // "06:00"
  morningEnd: string; // "12:30"
  afternoonStart: string; // "12:30"
  afternoonEnd: string; // "18:30"
  nightStart: string; // "18:30"
  nightEnd: string; // "23:00"
}

export const DEFAULT_SHIFT_RANGES: ShiftRangeConfig = {
  morningStart: '06:00',
  morningEnd: '12:30',
  afternoonStart: '12:30',
  afternoonEnd: '18:30',
  nightStart: '18:30',
  nightEnd: '23:00',
};

export interface DuplicateWeekOptions {
  copyGrid: boolean;
  copyLocks: boolean;
  copyClasses: boolean;
  copyTeachers: boolean;
  copySubjects: boolean;
  copyLoads: boolean;
  copyTimeSlots: boolean;
  copyRules: boolean;
  copySharedRooms: boolean;
}

export interface DayOfWeekItem {
  key: DayOfWeek;
  label: string;
  short: string;
}

export type DayOfWeek = 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM';

export const DAYS_OF_WEEK: { key: DayOfWeek; label: string; short: string }[] = [
  { key: 'SEG', label: 'Segunda-feira', short: 'Seg' },
  { key: 'TER', label: 'Terça-feira', short: 'Ter' },
  { key: 'QUA', label: 'Quarta-feira', short: 'Qua' },
  { key: 'QUI', label: 'Quinta-feira', short: 'Qui' },
  { key: 'SEX', label: 'Sexta-feira', short: 'Sex' },
  { key: 'SAB', label: 'Sábado', short: 'Sáb' },
  { key: 'DOM', label: 'Domingo', short: 'Dom' },
];

export type TimetableLayoutTheme = 'classic_table' | 'modern_cards' | 'school_board' | 'compact_density';

export type SlotType = 'lesson' | 'interval' | 'event';

export interface TimeSlot {
  id: string;
  slotNumber: number; // 1, 2, 3... (only for lessons) or 0 for intervals/events
  type: SlotType;
  name: string; // "1º Tempo", "Intervalo 1", "Almoço", "Orientação Acadêmica"
  startTime: string; // "07:00"
  endTime: string; // "07:50"
  durationMinutes: number;
}

export interface IntervalConfig {
  id: string;
  name: string;
  afterLessonNumber: number; // e.g. after lesson 3
  durationMinutes: number;
}

export interface EventConfig {
  id: string;
  name: string; // "Almoço", "Orientação Acadêmica"
  afterLessonNumber: number; // e.g. after lesson 6
  durationMinutes: number;
  isLunch?: boolean; // Indicates the mandatory lunch event
}

export interface DayTimeConfig {
  startHour: string; // "07:00"
  endHour: string; // "13:10" or "18:00"
  targetLessonCount: number; // e.g. 6 lessons
  intervals: IntervalConfig[];
  events: EventConfig[];
  roundToFiveMinutes: boolean; // true = only :00, :05, :10, etc.
  useCustomLessonDuration?: boolean; // When true, fix lesson duration explicitly
  customLessonDuration?: number; // Custom lesson duration in minutes
}

export interface ClassGroup {
  id: string;
  name: string; // "MACC01", "MACC02", "ITA/IME"
  color: string;
  isGrouped: boolean;
  groupedClassIds?: string[]; // IDs of member classes if grouped
  defaultRoom?: string; // e.g. "Sala 101"
  shift?: 'manhã' | 'tarde' | 'integral' | 'noite';
}

export interface Subject {
  id: string;
  name: string; // "Física 1 (Mecânica)"
  shortName: string; // "Fís 1"
  color: string; // hex or tailwind class
  isHeavy: boolean; // "pesada" for consecutive rule
  area?: 'Exatas' | 'Biológicas' | 'Humanas' | 'Linguagens' | 'Diversas' | 'Geral';
}

export interface SharedRoom {
  id: string;
  name: string; // "Laboratório de Ciências", "Sala Multimídia"
  teacherIds: string[]; // teachers who share this room
}

export interface TeacherAbsence {
  day: DayOfWeek;
  allDay: boolean;
  slotIds?: string[]; // specific slot IDs if not all day
  reason?: string; // e.g. "Reunião de pesquisa", "Consulta"
}

export interface Teacher {
  id: string;
  name: string; // "Prof. Carlos Eduardo"
  shortName: string; // "Carlos"
  subjectIds: string[]; // subjects taught
  sharedRoomId?: string; // if uses a shared physical room
  absences: TeacherAbsence[];
  maxConsecutiveLessons?: number; // e.g. 2 or 3
  allowedShift?: 'morning' | 'afternoon' | 'all';
  email?: string;
}

export interface SubjectLoad {
  id: string;
  classId: string;
  subjectId: string;
  lessonsPerWeek: number; // target lessons
  preferredTeacherId?: string;
}

export type RuleType =
  | 'teacher_absence' // Professor ausente
  | 'teacher_no_double_booking' // Professor não pode estar em 2 lugares
  | 'shared_room' // Professores que compartilham sala não podem no mesmo tempo
  | 'no_duplicate_subject_same_day' // Disciplina não repete no mesmo dia para mesma turma
  | 'lunch_max_start_time' // O almoço deve começar no máximo em determinado horário
  | 'lunch_max_end_time' // O almoço deve terminar no máximo em determinado horário
  | 'double_lesson_substitution' // Exceção: Dobrar aulas de disciplina específica por falta de professor / intensivo
  | 'no_consecutive_heavy_subjects' // Duas disciplinas pesadas não podem ficar seguidas
  | 'fixed_slot' // Disciplina/Prof fixo em um tempo/turma específico
  | 'forbidden_slot' // Disciplina proibida em determinado tempo (ex: sem Mat no último tempo)
  | 'max_consecutive_teacher' // Máximo de aulas seguidas do mesmo professor
  | 'teacher_class_shift_limit' // Professor limitado a certas turmas ou turnos
  | 'grouped_classes_same_lesson' // Turmas agrupadas recebem a mesma aula
  | 'exact_load_match' // Quantidade exata de aulas por disciplina/turma
  | 'custom_rule'; // Regra customizada livre

export interface ScheduleRule {
  id: string;
  name: string; // "Prof. Ana só de manhã", "Sem Física + Química seguidas"
  type: RuleType;
  isMandatory: boolean; // true = Hard constraint (nunca viola), false = Preferência (avisa se violar)
  isEnabled: boolean;
  description?: string;
  parameters: {
    teacherId?: string;
    teacherIds?: string[];
    substituteTeacherId?: string; // Professor substituto caso cubra aula dobrada
    subjectId?: string;
    subjectIds?: string[];
    classId?: string;
    classIds?: string[];
    day?: DayOfWeek;
    days?: DayOfWeek[];
    slotId?: string;
    slotIds?: string[];
    maxConsecutive?: number;
    targetConsecutiveLessons?: number; // ex: 2 tempos seguidos
    maxStartTime?: string; // e.g. "12:30" para lunch_max_start_time
    maxEndTime?: string; // e.g. "13:30" para lunch_max_end_time
    targetTime?: string; // horário alvo para regras de tempo
    isWeeklyException?: boolean; // Badge de Exceção da Semana
    reason?: string; // Ex: "Falta do Prof. de Química"
    roomName?: string;
    customNote?: string;
  };
}

/**
 * Retorna as turmas a serem exibidas na grade:
 * Se houver turmas agrupadas ativas, as turmas membros são ocultadas e exibidas sob o agrupamento.
 * Se a turma agrupada for excluída, as turmas individuais voltam automaticamente a ser exibidas na grade.
 */
export function getDisplayClasses(classes: ClassGroup[]): ClassGroup[] {
  const groupedChildIds = new Set<string>();
  classes.forEach((c) => {
    if (c.isGrouped && c.groupedClassIds && c.groupedClassIds.length > 0) {
      c.groupedClassIds.forEach((id) => groupedChildIds.add(id));
    }
  });
  return classes.filter((c) => !groupedChildIds.has(c.id));
}

export interface GridCell {
  id: string;
  day: DayOfWeek;
  slotId: string; // TimeSlot id
  classId: string; // ClassGroup id
  subjectId: string | null;
  teacherId: string | null;
  isLocked: boolean; // Pin/Trava manual
  customRoom?: string;
  note?: string;
}

export type ConflictSeverity = 'error' | 'warning';

export interface ScheduleConflict {
  id: string;
  cellId?: string;
  day: DayOfWeek;
  slotId: string;
  classId?: string;
  type: RuleType | string;
  ruleName: string;
  message: string;
  suggestion?: string; // Como corrigir / Ação sugerida
  severity: ConflictSeverity;
  teacherId?: string;
  subjectId?: string;
}

export interface WindowTutor {
  day: DayOfWeek;
  slotId: string;
  teacherId: string;
  teacherName: string;
  reason: string; // "Janela entre aulas das 07:50 e 09:50"
}

export interface WeekSchedule {
  id: string;
  title: string; // e.g. "Grade 15/08/26 - Semana 33"
  dateRange: string; // e.g. "15/08/2026 a 21/08/2026"
  createdAt: string;
  updatedAt: string;
  activeDays: DayOfWeek[];
  timeConfig: DayTimeConfig;
  generatedSlots: TimeSlot[];
  classes: ClassGroup[];
  subjects: Subject[];
  teachers: Teacher[];
  sharedRooms: SharedRoom[];
  loads: SubjectLoad[];
  rules: ScheduleRule[];
  grid: Record<string, GridCell>; // key = `${day}_${slotId}_${classId}`
  institutionName?: string; // Nome da Escola / Cursinho / Projeto
  shiftRanges?: ShiftRangeConfig; // Faixas de turnos (manhã, tarde, noite)
  notes?: string;
}

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'coordenador';
  loggedAt: string;
}
