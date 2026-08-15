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

export const INITIAL_SUBJECTS: Subject[] = [
  { id: 'sub_mat1', name: 'Matemática 1 (Álgebra & Funções)', shortName: 'Mat 1', color: '#2563eb', isHeavy: true, area: 'Exatas' },
  { id: 'sub_mat2', name: 'Matemática 2 (Geometria & Trig.)', shortName: 'Mat 2', color: '#1d4ed8', isHeavy: true, area: 'Exatas' },
  { id: 'sub_fis1', name: 'Física 1 (Mecânica & Ondulatória)', shortName: 'Fís 1', color: '#0891b2', isHeavy: true, area: 'Exatas' },
  { id: 'sub_fis2', name: 'Física 2 (Eletromagnetismo & Termo)', shortName: 'Fís 2', color: '#0284c7', isHeavy: true, area: 'Exatas' },
  { id: 'sub_quim_geral', name: 'Química Geral & Inorgânica', shortName: 'Quím 1', color: '#059669', isHeavy: true, area: 'Biológicas' },
  { id: 'sub_quim_org', name: 'Química Orgânica & Físico-Química', shortName: 'Quím 2', color: '#10b981', isHeavy: true, area: 'Biológicas' },
  { id: 'sub_bio1', name: 'Biologia 1 (Citologia & Genética)', shortName: 'Bio 1', color: '#16a34a', isHeavy: false, area: 'Biológicas' },
  { id: 'sub_bio2', name: 'Biologia 2 (Ecologia & Fisiologia)', shortName: 'Bio 2', color: '#65a30d', isHeavy: false, area: 'Biológicas' },
  { id: 'sub_redacao', name: 'Redação & Produção Textual', shortName: 'Redação', color: '#dc2626', isHeavy: false, area: 'Linguagens' },
  { id: 'sub_gramatica', name: 'Gramática & Interpretação', shortName: 'Português', color: '#e11d48', isHeavy: false, area: 'Linguagens' },
  { id: 'sub_literatura', name: 'Literatura Brasileira & Obras', shortName: 'Literatura', color: '#c026d3', isHeavy: false, area: 'Linguagens' },
  { id: 'sub_historia', name: 'História Geral & do Brasil', shortName: 'História', color: '#d97706', isHeavy: false, area: 'Humanas' },
  { id: 'sub_geografia', name: 'Geografia Geral & Geopolítica', shortName: 'Geografia', color: '#b45309', isHeavy: false, area: 'Humanas' },
  { id: 'sub_filo_socio', name: 'Filosofia & Sociologia', shortName: 'Filo/Sócio', color: '#7c3aed', isHeavy: false, area: 'Humanas' },
];

export const INITIAL_SHARED_ROOMS: SharedRoom[] = [
  { id: 'room_lab', name: 'Laboratório de Ciências / Sala 3D', teacherIds: ['tea_quim_ana', 'tea_fis_marcos'] },
  { id: 'room_smart', name: 'Sala Smart Interativa 1', teacherIds: ['tea_mat_carlos', 'tea_mat_roberto'] },
];

export const INITIAL_TEACHERS: Teacher[] = [
  {
    id: 'tea_mat_carlos',
    name: 'Prof. Carlos Eduardo',
    shortName: 'Carlos (Mat)',
    subjectIds: ['sub_mat1', 'sub_mat2'],
    sharedRoomId: 'room_smart',
    absences: [{ day: 'SEX', allDay: true, reason: 'Reunião de Coordenação Externa' }],
    maxConsecutiveLessons: 3,
    email: 'carlos.mat@cursinho.com.br',
  },
  {
    id: 'tea_mat_roberto',
    name: 'Prof. Roberto Silva',
    shortName: 'Roberto (Mat)',
    subjectIds: ['sub_mat1', 'sub_mat2'],
    sharedRoomId: 'room_smart',
    absences: [],
    maxConsecutiveLessons: 3,
    email: 'roberto.mat@cursinho.com.br',
  },
  {
    id: 'tea_fis_marcos',
    name: 'Prof. Marcos Rocha',
    shortName: 'Marcos (Fís)',
    subjectIds: ['sub_fis1', 'sub_fis2'],
    sharedRoomId: 'room_lab',
    absences: [{ day: 'QUA', allDay: false, slotIds: ['lesson_5', 'lesson_6'], reason: 'Plantão de Dúvidas' }],
    maxConsecutiveLessons: 3,
    email: 'marcos.fis@cursinho.com.br',
  },
  {
    id: 'tea_fis_julio',
    name: 'Prof. Júlio Mendes',
    shortName: 'Júlio (Fís)',
    subjectIds: ['sub_fis1', 'sub_fis2'],
    absences: [],
    maxConsecutiveLessons: 2,
    email: 'julio.fis@cursinho.com.br',
  },
  {
    id: 'tea_quim_ana',
    name: 'Profa. Ana Carolina',
    shortName: 'Ana (Quím)',
    subjectIds: ['sub_quim_geral', 'sub_quim_org'],
    sharedRoomId: 'room_lab',
    absences: [{ day: 'SEG', allDay: false, slotIds: ['lesson_1', 'lesson_2'], reason: 'Mestrado USP' }],
    maxConsecutiveLessons: 3,
    email: 'ana.quim@cursinho.com.br',
  },
  {
    id: 'tea_quim_renato',
    name: 'Prof. Renato Gusmão',
    shortName: 'Renato (Quím)',
    subjectIds: ['sub_quim_geral', 'sub_quim_org'],
    absences: [],
    maxConsecutiveLessons: 3,
    email: 'renato.quim@cursinho.com.br',
  },
  {
    id: 'tea_bio_patricia',
    name: 'Profa. Patrícia Lima',
    shortName: 'Patrícia (Bio)',
    subjectIds: ['sub_bio1', 'sub_bio2'],
    absences: [],
    maxConsecutiveLessons: 3,
    email: 'patricia.bio@cursinho.com.br',
  },
  {
    id: 'tea_bio_bruno',
    name: 'Prof. Bruno Albuquerque',
    shortName: 'Bruno (Bio)',
    subjectIds: ['sub_bio1', 'sub_bio2'],
    absences: [{ day: 'QUI', allDay: true, reason: 'Congresso de Genética' }],
    maxConsecutiveLessons: 3,
    email: 'bruno.bio@cursinho.com.br',
  },
  {
    id: 'tea_red_fernanda',
    name: 'Profa. Fernanda Castro',
    shortName: 'Fernanda (Red)',
    subjectIds: ['sub_redacao'],
    absences: [],
    maxConsecutiveLessons: 3,
    email: 'fernanda.red@cursinho.com.br',
  },
  {
    id: 'tea_port_luciana',
    name: 'Profa. Luciana Meirelles',
    shortName: 'Luciana (Port/Lit)',
    subjectIds: ['sub_gramatica', 'sub_literatura'],
    absences: [],
    maxConsecutiveLessons: 3,
    email: 'luciana.port@cursinho.com.br',
  },
  {
    id: 'tea_hist_sergio',
    name: 'Prof. Sérgio Nogueira',
    shortName: 'Sérgio (Hist)',
    subjectIds: ['sub_historia'],
    absences: [],
    maxConsecutiveLessons: 3,
    email: 'sergio.hist@cursinho.com.br',
  },
  {
    id: 'tea_geo_tiago',
    name: 'Prof. Tiago Ferreira',
    shortName: 'Tiago (Geo)',
    subjectIds: ['sub_geografia'],
    absences: [],
    maxConsecutiveLessons: 3,
    email: 'tiago.geo@cursinho.com.br',
  },
  {
    id: 'tea_socio_camila',
    name: 'Profa. Camila Dias',
    shortName: 'Camila (Filo/Soc)',
    subjectIds: ['sub_filo_socio'],
    absences: [],
    maxConsecutiveLessons: 3,
    email: 'camila.socio@cursinho.com.br',
  },
];

export const INITIAL_CLASSES: ClassGroup[] = [
  { id: 'cls_macc01', name: 'MACC01 (Medicina)', color: '#2563eb', isGrouped: false, defaultRoom: 'Sala 101' },
  { id: 'cls_macc02', name: 'MACC02 (Medicina)', color: '#0284c7', isGrouped: false, defaultRoom: 'Sala 102' },
  { id: 'cls_ext01', name: 'EXT01 (Extensivo Geral)', color: '#059669', isGrouped: false, defaultRoom: 'Sala 201' },
  { id: 'cls_ita_ime', name: 'ITA / IME (Engenharias)', color: '#7c3aed', isGrouped: false, defaultRoom: 'Auditório Alpha' },
  {
    id: 'cls_macc_agrupada',
    name: 'MACC01/02 (Auditório)',
    color: '#0d9488',
    isGrouped: true,
    groupedClassIds: ['cls_macc01', 'cls_macc02'],
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
    { id: 'evt_1', name: 'Orientação Acadêmica', afterLessonNumber: 6, durationMinutes: 50 },
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
    id: 'rule_no_mat_last_slot',
    name: 'Proibido Matemática no 6º Tempo da Sexta-Feira',
    type: 'forbidden_slot',
    isMandatory: false,
    isEnabled: true,
    description: 'Turmas não devem ter aula pesada de Matemática no último tempo da sexta-feira.',
    parameters: { subjectId: 'sub_mat1', day: 'SEX', slotId: 'lesson_6' },
  },
  {
    id: 'rule_redacao_fixa',
    name: 'Redação Fixa na Quarta-feira (MACC01)',
    type: 'fixed_slot',
    isMandatory: true,
    isEnabled: true,
    description: 'Fixa o horário de produção de Redação no 1º tempo de Quarta para MACC01.',
    parameters: { classId: 'cls_macc01', subjectId: 'sub_redacao', teacherId: 'tea_red_fernanda', day: 'QUA', slotId: 'lesson_1' },
  },
];

export function createInitialLoads(): SubjectLoad[] {
  const loads: SubjectLoad[] = [];
  const classes = INITIAL_CLASSES.filter((c) => !c.isGrouped);

  classes.forEach((cls) => {
    if (cls.id === 'cls_ita_ime') {
      // High focus on math, physics, chemistry
      loads.push({ id: `load_${cls.id}_mat1`, classId: cls.id, subjectId: 'sub_mat1', lessonsPerWeek: 5 });
      loads.push({ id: `load_${cls.id}_mat2`, classId: cls.id, subjectId: 'sub_mat2', lessonsPerWeek: 4 });
      loads.push({ id: `load_${cls.id}_fis1`, classId: cls.id, subjectId: 'sub_fis1', lessonsPerWeek: 5 });
      loads.push({ id: `load_${cls.id}_fis2`, classId: cls.id, subjectId: 'sub_fis2', lessonsPerWeek: 4 });
      loads.push({ id: `load_${cls.id}_quim1`, classId: cls.id, subjectId: 'sub_quim_geral', lessonsPerWeek: 4 });
      loads.push({ id: `load_${cls.id}_quim2`, classId: cls.id, subjectId: 'sub_quim_org', lessonsPerWeek: 3 });
      loads.push({ id: `load_${cls.id}_red`, classId: cls.id, subjectId: 'sub_redacao', lessonsPerWeek: 2 });
      loads.push({ id: `load_${cls.id}_port`, classId: cls.id, subjectId: 'sub_gramatica', lessonsPerWeek: 2 });
    } else {
      // Balanced pré-vestibular curriculum (30 lessons / week)
      loads.push({ id: `load_${cls.id}_mat1`, classId: cls.id, subjectId: 'sub_mat1', lessonsPerWeek: 3 });
      loads.push({ id: `load_${cls.id}_mat2`, classId: cls.id, subjectId: 'sub_mat2', lessonsPerWeek: 2 });
      loads.push({ id: `load_${cls.id}_fis1`, classId: cls.id, subjectId: 'sub_fis1', lessonsPerWeek: 3 });
      loads.push({ id: `load_${cls.id}_fis2`, classId: cls.id, subjectId: 'sub_fis2', lessonsPerWeek: 2 });
      loads.push({ id: `load_${cls.id}_quim1`, classId: cls.id, subjectId: 'sub_quim_geral', lessonsPerWeek: 3 });
      loads.push({ id: `load_${cls.id}_quim2`, classId: cls.id, subjectId: 'sub_quim_org', lessonsPerWeek: 2 });
      loads.push({ id: `load_${cls.id}_bio1`, classId: cls.id, subjectId: 'sub_bio1', lessonsPerWeek: 3 });
      loads.push({ id: `load_${cls.id}_bio2`, classId: cls.id, subjectId: 'sub_bio2', lessonsPerWeek: 2 });
      loads.push({ id: `load_${cls.id}_red`, classId: cls.id, subjectId: 'sub_redacao', lessonsPerWeek: 2 });
      loads.push({ id: `load_${cls.id}_port`, classId: cls.id, subjectId: 'sub_gramatica', lessonsPerWeek: 2 });
      loads.push({ id: `load_${cls.id}_lit`, classId: cls.id, subjectId: 'sub_literatura', lessonsPerWeek: 2 });
      loads.push({ id: `load_${cls.id}_hist`, classId: cls.id, subjectId: 'sub_historia', lessonsPerWeek: 2 });
      loads.push({ id: `load_${cls.id}_geo`, classId: cls.id, subjectId: 'sub_geografia', lessonsPerWeek: 2 });
    }
  });

  return loads;
}

export function createInitialSampleWeek(): WeekSchedule {
  const timeCalc = calculateTimeSlots(INITIAL_TIME_CONFIG);
  const activeDays = ['SEG', 'TER', 'QUA', 'QUI', 'SEX'] as const;
  const loads = createInitialLoads();

  const sampleWeek: WeekSchedule = {
    id: 'week_2026_33',
    title: 'Grade 15/08/26 — Semana 33 (Medicina & ITA)',
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
  sample.title = 'Grade 08/08/26 — Semana 32 (Anterior)';
  sample.dateRange = '08/08/2026 a 14/08/2026';
  return sample;
}
