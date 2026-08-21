import {
  ClassGroup,
  DayTimeConfig,
  GridCell,
  ScheduleRule,
  SharedRoom,
  Subject,
  SubjectLoad,
  Teacher,
  WeekSchedule,
} from '../types';
import { calculateTimeSlots } from '../utils/timeCalculator';

// Exactly the 10 most common subjects requested:
// Português, Matemática, Física, Química, Biologia, História, Geografia, Redação, Inglês e Educação Física
export const INITIAL_SUBJECTS: Subject[] = [
  { id: 'sub_port', name: 'Português', shortName: 'Português', color: '#e11d48', isHeavy: false, area: 'Linguagens' },
  { id: 'sub_mat', name: 'Matemática', shortName: 'Matemática', color: '#2563eb', isHeavy: true, area: 'Exatas' },
  { id: 'sub_fis', name: 'Física', shortName: 'Física', color: '#0891b2', isHeavy: true, area: 'Exatas' },
  { id: 'sub_quim', name: 'Química', shortName: 'Química', color: '#059669', isHeavy: true, area: 'Biológicas' },
  { id: 'sub_bio', name: 'Biologia', shortName: 'Biologia', color: '#16a34a', isHeavy: false, area: 'Biológicas' },
  { id: 'sub_hist', name: 'História', shortName: 'História', color: '#d97706', isHeavy: false, area: 'Humanas' },
  { id: 'sub_geo', name: 'Geografia', shortName: 'Geografia', color: '#b45309', isHeavy: false, area: 'Humanas' },
  { id: 'sub_red', name: 'Redação', shortName: 'Redação', color: '#dc2626', isHeavy: false, area: 'Linguagens' },
  { id: 'sub_ing', name: 'Inglês', shortName: 'Inglês', color: '#8b5cf6', isHeavy: false, area: 'Linguagens' },
  { id: 'sub_edfis', name: 'Educação Física', shortName: 'Ed. Física', color: '#ea580c', isHeavy: false, area: 'Diversas' },
];

export const INITIAL_SHARED_ROOMS: SharedRoom[] = [
  { id: 'room_lab', name: 'Laboratório de Ciências', teacherIds: ['tea_quim_ana', 'tea_fis_marcos'] },
  { id: 'room_smart', name: 'Sala Multimídia / Smart 1', teacherIds: ['tea_mat_carlos', 'tea_ing_daniel'] },
];

export const INITIAL_TEACHERS: Teacher[] = [
  {
    id: 'tea_port_luciana',
    name: 'Profa. Luciana Meirelles',
    shortName: 'Luciana (Port)',
    subjectIds: ['sub_port'],
    absences: [],
    maxConsecutiveLessons: 3,
    email: 'luciana.port@cursinho.com.br',
  },
  {
    id: 'tea_mat_carlos',
    name: 'Prof. Carlos Eduardo',
    shortName: 'Carlos (Mat)',
    subjectIds: ['sub_mat'],
    sharedRoomId: 'room_smart',
    absences: [{ day: 'SEX', allDay: true, reason: 'Reunião de Coordenação Externa' }],
    maxConsecutiveLessons: 3,
    email: 'carlos.mat@cursinho.com.br',
  },
  {
    id: 'tea_mat_roberto',
    name: 'Prof. Roberto Silva',
    shortName: 'Roberto (Mat)',
    subjectIds: ['sub_mat'],
    absences: [],
    maxConsecutiveLessons: 3,
    email: 'roberto.mat@cursinho.com.br',
  },
  {
    id: 'tea_fis_marcos',
    name: 'Prof. Marcos Rocha',
    shortName: 'Marcos (Fís)',
    subjectIds: ['sub_fis'],
    sharedRoomId: 'room_lab',
    absences: [{ day: 'QUA', allDay: false, slotIds: ['lesson_5', 'lesson_6'], reason: 'Plantão de Dúvidas' }],
    maxConsecutiveLessons: 3,
    email: 'marcos.fis@cursinho.com.br',
  },
  {
    id: 'tea_quim_ana',
    name: 'Profa. Ana Carolina',
    shortName: 'Ana (Quím)',
    subjectIds: ['sub_quim'],
    sharedRoomId: 'room_lab',
    absences: [{ day: 'SEG', allDay: false, slotIds: ['lesson_1', 'lesson_2'], reason: 'Mestrado USP' }],
    maxConsecutiveLessons: 3,
    email: 'ana.quim@cursinho.com.br',
  },
  {
    id: 'tea_bio_patricia',
    name: 'Profa. Patrícia Lima',
    shortName: 'Patrícia (Bio)',
    subjectIds: ['sub_bio'],
    absences: [],
    maxConsecutiveLessons: 3,
    email: 'patricia.bio@cursinho.com.br',
  },
  {
    id: 'tea_hist_sergio',
    name: 'Prof. Sérgio Nogueira',
    shortName: 'Sérgio (Hist)',
    subjectIds: ['sub_hist'],
    absences: [],
    maxConsecutiveLessons: 3,
    email: 'sergio.hist@cursinho.com.br',
  },
  {
    id: 'tea_geo_tiago',
    name: 'Prof. Tiago Ferreira',
    shortName: 'Tiago (Geo)',
    subjectIds: ['sub_geo'],
    absences: [],
    maxConsecutiveLessons: 3,
    email: 'tiago.geo@cursinho.com.br',
  },
  {
    id: 'tea_red_fernanda',
    name: 'Profa. Fernanda Castro',
    shortName: 'Fernanda (Red)',
    subjectIds: ['sub_red'],
    absences: [],
    maxConsecutiveLessons: 3,
    email: 'fernanda.red@cursinho.com.br',
  },
  {
    id: 'tea_ing_daniel',
    name: 'Prof. Daniel Vieira',
    shortName: 'Daniel (Ing)',
    subjectIds: ['sub_ing'],
    sharedRoomId: 'room_smart',
    absences: [],
    maxConsecutiveLessons: 3,
    email: 'daniel.ing@cursinho.com.br',
  },
  {
    id: 'tea_edfis_rodrigo',
    name: 'Prof. Rodrigo Santos',
    shortName: 'Rodrigo (Ed.Fís)',
    subjectIds: ['sub_edfis'],
    absences: [],
    maxConsecutiveLessons: 3,
    email: 'rodrigo.edfis@cursinho.com.br',
  },
];

export const INITIAL_CLASSES: ClassGroup[] = [
  { id: 'cls_1em', name: '1º Ano EM (Turma A)', color: '#2563eb', isGrouped: false, defaultRoom: 'Sala 101' },
  { id: 'cls_2em', name: '2º Ano EM (Turma B)', color: '#0284c7', isGrouped: false, defaultRoom: 'Sala 102' },
  { id: 'cls_3em', name: '3º Ano / Terceirão (Turma C)', color: '#059669', isGrouped: false, defaultRoom: 'Sala 201' },
  {
    id: 'cls_agrupada',
    name: '1º e 2º Ano (Auditório)',
    color: '#0d9488',
    isGrouped: true,
    groupedClassIds: ['cls_1em', 'cls_2em'],
    defaultRoom: 'Auditório Nobre',
  },
];

export const INITIAL_TIME_CONFIG: DayTimeConfig = {
  startHour: '07:00',
  endHour: '13:10',
  targetLessonCount: 6,
  intervals: [
    { id: 'int_1', name: 'Intervalo Principal', afterLessonNumber: 3, durationMinutes: 20 },
  ],
  events: [
    { id: 'evt_lunch_main', name: 'Almoço', afterLessonNumber: 3, durationMinutes: 60, isLunch: true },
    { id: 'evt_1', name: 'Orientação de Estudos', afterLessonNumber: 6, durationMinutes: 50 },
  ],
  roundToFiveMinutes: true,
  useCustomLessonDuration: false,
};

export const INITIAL_RULES: ScheduleRule[] = [
  {
    id: 'rule_teacher_no_double',
    name: 'Simultaneidade de Professor (Lei Física)',
    type: 'teacher_no_double_booking',
    isMandatory: true,
    isEnabled: true,
    description: 'Nenhum professor pode ministrar aulas em duas turmas diferentes no mesmo horário.',
    parameters: {},
  },
  {
    id: 'rule_shared_room',
    name: 'Restrição de Sala Compartilhada',
    type: 'shared_room',
    isMandatory: true,
    isEnabled: true,
    description: 'Professores vinculados ao mesmo laboratório ou sala inteligente não podem ter aulas simultâneas.',
    parameters: {},
  },
  {
    id: 'rule_no_dup_day',
    name: 'Sem Disciplina Duplicada no Mesmo Dia',
    type: 'no_duplicate_subject_same_day',
    isMandatory: true,
    isEnabled: true,
    description: 'A mesma disciplina não deve aparecer mais de 1 vez no mesmo dia para a mesma turma.',
    parameters: {},
  },
  {
    id: 'rule_no_heavy_consec',
    name: 'Sem Disciplinas Pesadas Consecutivas',
    type: 'no_consecutive_heavy_subjects',
    isMandatory: false, // Preference
    isEnabled: true,
    description: 'Evitar que matérias de alta carga cognitiva (Matemática, Física, Química) ocorram em tempos seguidos.',
    parameters: {},
  },
  {
    id: 'rule_max_consec',
    name: 'Máximo de 3 Aulas Seguidas por Professor',
    type: 'max_consecutive_teacher',
    isMandatory: true,
    isEnabled: true,
    description: 'Garante janela de descanso após 3 tempos ininterruptos de docência.',
    parameters: { maxConsecutive: 3 },
  },
  {
    id: 'rule_redacao_fixa',
    name: 'Redação Fixa na Quarta-feira (1º Ano)',
    type: 'fixed_slot',
    isMandatory: true,
    isEnabled: true,
    description: 'Fixa o horário de produção de Redação no 1º tempo de Quarta para o 1º Ano.',
    parameters: { classId: 'cls_1em', subjectId: 'sub_red', teacherId: 'tea_red_fernanda', day: 'QUA', slotId: 'lesson_1' },
  },
];

export function createInitialLoads(): SubjectLoad[] {
  const loads: SubjectLoad[] = [];
  const classes = INITIAL_CLASSES.filter((c) => !c.isGrouped);

  classes.forEach((cls) => {
    // 30 lessons per week distributed across the 10 subjects
    loads.push({ id: `load_${cls.id}_port`, classId: cls.id, subjectId: 'sub_port', lessonsPerWeek: 4 });
    loads.push({ id: `load_${cls.id}_mat`, classId: cls.id, subjectId: 'sub_mat', lessonsPerWeek: 5 });
    loads.push({ id: `load_${cls.id}_fis`, classId: cls.id, subjectId: 'sub_fis', lessonsPerWeek: 3 });
    loads.push({ id: `load_${cls.id}_quim`, classId: cls.id, subjectId: 'sub_quim', lessonsPerWeek: 3 });
    loads.push({ id: `load_${cls.id}_bio`, classId: cls.id, subjectId: 'sub_bio', lessonsPerWeek: 3 });
    loads.push({ id: `load_${cls.id}_hist`, classId: cls.id, subjectId: 'sub_hist', lessonsPerWeek: 3 });
    loads.push({ id: `load_${cls.id}_geo`, classId: cls.id, subjectId: 'sub_geo', lessonsPerWeek: 3 });
    loads.push({ id: `load_${cls.id}_red`, classId: cls.id, subjectId: 'sub_red', lessonsPerWeek: 2 });
    loads.push({ id: `load_${cls.id}_ing`, classId: cls.id, subjectId: 'sub_ing', lessonsPerWeek: 2 });
    loads.push({ id: `load_${cls.id}_edfis`, classId: cls.id, subjectId: 'sub_edfis', lessonsPerWeek: 2 });
  });

  return loads;
}

export function createInitialSampleWeek(): WeekSchedule {
  const timeCalc = calculateTimeSlots(INITIAL_TIME_CONFIG);
  const activeDays = ['SEG', 'TER', 'QUA', 'QUI', 'SEX'] as const;
  const loads = createInitialLoads();

  const sampleWeek: WeekSchedule = {
    id: 'week_2026_33',
    title: 'Grade Semanal — Ensino Médio & Vestibular',
    dateRange: '15/08/2026 a 21/08/2026',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    activeDays: [...activeDays],
    timeConfig: INITIAL_TIME_CONFIG,
    generatedSlots: timeCalc.slots,
    classes: INITIAL_CLASSES,
    subjects: INITIAL_SUBJECTS,
    teachers: INITIAL_TEACHERS,
    sharedRooms: INITIAL_SHARED_ROOMS,
    loads,
    rules: INITIAL_RULES,
    grid: {},
  };

  return sampleWeek;
}

export function createSecondarySampleWeek(): WeekSchedule {
  const sample = createInitialSampleWeek();
  sample.id = 'week_2026_32';
  sample.title = 'Grade Anterior — Semana 32';
  sample.dateRange = '08/08/2026 a 14/08/2026';
  return sample;
}

export function createEmptySampleWeek(title: string = 'Nova Grade em Branco', dateRange: string = 'Próxima Semana'): WeekSchedule {
  const timeCalc = calculateTimeSlots(INITIAL_TIME_CONFIG);
  const activeDays = ['SEG', 'TER', 'QUA', 'QUI', 'SEX'] as const;
  const newId = `week_${Date.now()}`;

  return {
    id: newId,
    title,
    dateRange,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    activeDays: [...activeDays],
    timeConfig: INITIAL_TIME_CONFIG,
    generatedSlots: timeCalc.slots,
    classes: [],
    subjects: [],
    teachers: [],
    sharedRooms: [],
    loads: [],
    rules: INITIAL_RULES,
    grid: {},
  };
}
