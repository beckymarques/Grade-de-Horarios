import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  ClassGroup,
  DayOfWeek,
  DayTimeConfig,
  GridCell,
  ScheduleRule,
  Subject,
  SubjectLoad,
  Teacher,
  UserSession,
  WeekSchedule,
  TimetableLayoutTheme,
  DuplicateWeekOptions,
} from '../types';
import {
  createInitialSampleWeek,
  createSecondarySampleWeek,
  createEmptySampleWeek,
  INITIAL_RULES,
} from '../data/mockInitialData';
import { calculateTimeSlots } from '../utils/timeCalculator';
import { generateScheduleWithSolver, SolverResult } from '../utils/solver';
import { validateSchedule, ValidationReport, resolveCellForClass } from '../utils/rulesEngine';
import { validateBackupJSON } from '../utils/backupValidator';

export type ActiveTab = 'grade' | 'tempos' | 'turmas' | 'professores' | 'cargas' | 'regras' | 'semanas';

interface DragItemState {
  day: DayOfWeek;
  slotId: string;
  classId: string;
  cell: GridCell;
}

interface ScheduleContextType {
  user: UserSession | null;
  login: (email: string, name?: string) => void;
  logout: () => void;

  weeks: WeekSchedule[];
  activeWeek: WeekSchedule | null;
  activeWeekId: string;
  setActiveWeekId: (id: string) => void;

  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  layoutTheme: TimetableLayoutTheme;
  setLayoutTheme: (theme: TimetableLayoutTheme) => void;

  selectedDay: DayOfWeek | 'ALL';
  setSelectedDay: (day: DayOfWeek | 'ALL') => void;

  validation: ValidationReport;

  // Grid editing
  updateCell: (
    day: DayOfWeek,
    slotId: string,
    classId: string,
    subjectId: string | null,
    teacherId: string | null,
    isLocked?: boolean
  ) => void;
  clearCell: (day: DayOfWeek, slotId: string, classId: string) => void;
  toggleLockCell: (day: DayOfWeek, slotId: string, classId: string) => void;
  swapCells: (
    source: { day: DayOfWeek; slotId: string; classId: string },
    target: { day: DayOfWeek; slotId: string; classId: string }
  ) => void;
  moveCell: (
    source: { day: DayOfWeek; slotId: string; classId: string },
    target: { day: DayOfWeek; slotId: string; classId: string }
  ) => void;

  // Drag & drop state
  draggingCell: DragItemState | null;
  setDraggingCell: (item: DragItemState | null) => void;

  // Solver
  generateGrid: () => SolverResult;
  lastSolverResult: SolverResult | null;
  setLastSolverResult: (res: SolverResult | null) => void;

  // Week CRUD
  createNewWeek: (
    title: string,
    dateRange: string,
    mode?: 'placeholder' | 'empty',
    modality?: 'presencial' | 'remoto' | 'hibrido',
    remotePlatform?: string
  ) => WeekSchedule;
  duplicateWeek: (sourceWeekId: string, newTitle: string, newDateRange: string) => WeekSchedule;
  duplicateWeekWithOptions: (
    sourceWeekId: string,
    newTitle: string,
    newDateRange: string,
    options: DuplicateWeekOptions
  ) => WeekSchedule;
  updateActiveWeek: (updated: Partial<WeekSchedule>) => void;
  updateWeek: (weekId: string, updated: Partial<WeekSchedule>) => void;
  deleteWeek: (weekId: string) => void;
  resetToSampleSchool: () => void;
  resetToEmptySchool: () => void;

  // Config helpers
  updateTimeConfig: (config: DayTimeConfig) => void;
  addClassGroup: (cls: ClassGroup) => void;
  updateClassGroup: (cls: ClassGroup) => void;
  deleteClassGroup: (classId: string) => void;
  reorderClasses: (classes: ClassGroup[]) => void;

  addTeacher: (teacher: Teacher) => void;
  updateTeacher: (teacher: Teacher) => void;
  deleteTeacher: (teacherId: string) => void;

  addSubject: (subject: Subject) => void;
  updateSubject: (subject: Subject) => void;
  deleteSubject: (subjectId: string) => void;

  updateLoad: (
    classId: string,
    subjectId: string,
    lessonsPerWeek: number,
    preferredTeacherId?: string
  ) => void;

  addRule: (rule: ScheduleRule) => void;
  updateRule: (rule: ScheduleRule) => void;
  deleteRule: (ruleId: string) => void;
  toggleRule: (ruleId: string) => void;

  // Undo / Redo
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;

  // Unsaved changes guard for Tempos do Dia
  hasUnsavedTimesChanges: boolean;
  setHasUnsavedTimesChanges: (val: boolean) => void;
  pendingTabChange: ActiveTab | null;
  setPendingTabChange: (tab: ActiveTab | null) => void;
  confirmTabChange: (action: 'save' | 'discard' | 'cancel') => void;
  registerSaveTimesCallback: (cb: (() => void) | null) => void;
  registerDiscardTimesCallback: (cb: (() => void) | null) => void;

  // Bulk teacher and subject creation
  bulkAddTeachersAndSubjects: (items: {
    teacherName: string;
    shortName?: string;
    subjectNames: string[];
    allowedShift?: any;
    maxConsecutive?: number;
    email?: string;
  }[]) => { createdTeachers: number; createdSubjects: number };

  // Global backup
  importData: (rawInput: string | unknown) => { isValid: boolean; error?: string; count?: number };
  resetAllToDefaults: () => void;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

const STORAGE_KEY_USER = 'prevest_schedule_user_v2';
const STORAGE_KEY_WEEKS = 'prevest_schedule_weeks_v2';
const STORAGE_KEY_ACTIVE_WEEK = 'prevest_schedule_active_week_id_v2';

function ensureCoreRules(rules: ScheduleRule[] = []): ScheduleRule[] {
  const hasTeacherNoDouble = rules.some(
    (r) => r.type === 'teacher_no_double_booking' || r.id === 'rule_teacher_no_double'
  );
  const hasSharedRoom = rules.some(
    (r) => r.type === 'shared_room' || r.id === 'rule_shared_room'
  );

  const updated = [...rules];
  if (!hasTeacherNoDouble) {
    updated.unshift({
      id: 'rule_teacher_no_double',
      name: 'Simultaneidade de Professor (Lei Física)',
      type: 'teacher_no_double_booking',
      isMandatory: true,
      isEnabled: true,
      description: 'Nenhum professor pode ministrar aulas em duas turmas diferentes no mesmo horário.',
      parameters: {},
    });
  }
  if (!hasSharedRoom) {
    updated.splice(1, 0, {
      id: 'rule_shared_room',
      name: 'Restrição de Sala Compartilhada',
      type: 'shared_room',
      isMandatory: true,
      isEnabled: true,
      description: 'Professores vinculados ao mesmo laboratório ou sala inteligente não podem ter aulas simultâneas.',
      parameters: {},
    });
  }
  return updated;
}

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // User auth
  const [user, setUser] = useState<UserSession | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USER);
      if (stored) return JSON.parse(stored);
      return {
        id: 'user_coordenador',
        name: 'Coordenação Pedagógica',
        email: 'coordenacao@cursinho.com.br',
        role: 'coordenador',
        loggedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  });

  // Weeks list
  const [weeks, setWeeks] = useState<WeekSchedule[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_WEEKS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((w: WeekSchedule) => ({
            ...w,
            rules: ensureCoreRules(w.rules),
          }));
        }
      }
    } catch (e) {
      console.error('Failed to load weeks from storage', e);
    }
    // Seed with initial sample weeks
    const primary = createInitialSampleWeek();
    const preSolved = generateScheduleWithSolver(
      primary.activeDays,
      primary.generatedSlots,
      primary.classes,
      primary.subjects,
      primary.teachers,
      primary.rules,
      primary.loads,
      {}
    );
    primary.grid = preSolved.grid;

    const secondary = createSecondarySampleWeek();
    secondary.grid = { ...preSolved.grid };

    return [primary, secondary];
  });

  // Active week ID
  const [activeWeekId, setActiveWeekIdState] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ACTIVE_WEEK);
      if (stored && weeks.some((w) => w.id === stored)) return stored;
    } catch {}
    return weeks[0]?.id || 'week_2026_33';
  });

  const setActiveWeekId = (id: string) => {
    setActiveWeekIdState(id);
    localStorage.setItem(STORAGE_KEY_ACTIVE_WEEK, id);
  };

  const [activeTab, setActiveTabRaw] = useState<ActiveTab>('grade');

  // Unsaved changes guard for Tempos do Dia
  const [hasUnsavedTimesChanges, setHasUnsavedTimesChanges] = useState<boolean>(false);
  const [pendingTabChange, setPendingTabChange] = useState<ActiveTab | null>(null);
  const saveTimesCbRef = React.useRef<(() => void) | null>(null);
  const discardTimesCbRef = React.useRef<(() => void) | null>(null);

  const registerSaveTimesCallback = useCallback((cb: (() => void) | null) => {
    saveTimesCbRef.current = cb;
  }, []);

  const registerDiscardTimesCallback = useCallback((cb: (() => void) | null) => {
    discardTimesCbRef.current = cb;
  }, []);

  const setActiveTab = useCallback(
    (tab: ActiveTab) => {
      if (activeTab === 'tempos' && tab !== 'tempos' && hasUnsavedTimesChanges) {
        setPendingTabChange(tab);
        return;
      }
      setActiveTabRaw(tab);
    },
    [activeTab, hasUnsavedTimesChanges]
  );

  const confirmTabChange = useCallback(
    (action: 'save' | 'discard' | 'cancel') => {
      if (action === 'save') {
        if (saveTimesCbRef.current) {
          saveTimesCbRef.current();
        }
        setHasUnsavedTimesChanges(false);
        if (pendingTabChange) {
          setActiveTabRaw(pendingTabChange);
          setPendingTabChange(null);
        }
      } else if (action === 'discard') {
        if (discardTimesCbRef.current) {
          discardTimesCbRef.current();
        }
        setHasUnsavedTimesChanges(false);
        if (pendingTabChange) {
          setActiveTabRaw(pendingTabChange);
          setPendingTabChange(null);
        }
      } else {
        // cancel
        setPendingTabChange(null);
      }
    },
    [pendingTabChange]
  );

  const [layoutTheme, setLayoutThemeState] = useState<TimetableLayoutTheme>(() => {
    return (localStorage.getItem('prevest_layout_theme_v1') as TimetableLayoutTheme) || 'classic_table';
  });

  const setLayoutTheme = (theme: TimetableLayoutTheme) => {
    setLayoutThemeState(theme);
    localStorage.setItem('prevest_layout_theme_v1', theme);
  };

  const [selectedDay, setSelectedDay] = useState<DayOfWeek | 'ALL'>('SEG');
  const [draggingCell, setDraggingCell] = useState<DragItemState | null>(null);
  const [lastSolverResult, setLastSolverResult] = useState<SolverResult | null>(null);

  // Undo / Redo history for active week grid
  const [history, setHistory] = useState<Record<string, GridCell>[]>([{}]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const activeWeek = useMemo(() => {
    return weeks.find((w) => w.id === activeWeekId) || weeks[0] || null;
  }, [weeks, activeWeekId]);

  // Sync history when active week changes
  useEffect(() => {
    if (activeWeek) {
      setHistory([activeWeek.grid || {}]);
      setHistoryIndex(0);
    }
  }, [activeWeekId]);

  // Keep selectedDay in sync
  useEffect(() => {
    if (activeWeek && activeWeek.activeDays && activeWeek.activeDays.length > 0) {
      if (activeWeek.activeDays.length === 1) {
        setSelectedDay(activeWeek.activeDays[0]);
      } else if (selectedDay !== 'ALL' && !activeWeek.activeDays.includes(selectedDay)) {
        setSelectedDay('ALL');
      }
    }
  }, [activeWeek?.activeDays, selectedDay]);

  // Persist to local storage
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  }, [user]);

  useEffect(() => {
    if (weeks && weeks.length > 0) {
      localStorage.setItem(STORAGE_KEY_WEEKS, JSON.stringify(weeks));
    }
  }, [weeks]);

  // Live validation
  const validation = useMemo<ValidationReport>(() => {
    if (!activeWeek) {
      return {
        conflicts: [],
        windowTutors: [],
        loadSummary: [],
        isValid: true,
        totalErrors: 0,
        totalWarnings: 0,
      };
    }
    return validateSchedule(
      activeWeek.grid,
      activeWeek.activeDays,
      activeWeek.generatedSlots,
      activeWeek.classes,
      activeWeek.subjects,
      activeWeek.teachers,
      activeWeek.rules,
      activeWeek.loads
    );
  }, [activeWeek]);

  // Auth actions
  const login = (email: string, name: string = 'Coordenador Pedagógico') => {
    const newUser: UserSession = {
      id: `user_${Date.now()}`,
      name,
      email,
      role: 'coordenador',
      loggedAt: new Date().toISOString(),
    };
    setUser(newUser);
  };

  const logout = () => {
    setUser(null);
  };

  // Week management
  const updateActiveWeek = useCallback(
    (updated: Partial<WeekSchedule>) => {
      setWeeks((prev) =>
        prev.map((w) => {
          if (w.id === activeWeekId) {
            return {
              ...w,
              ...updated,
              updatedAt: new Date().toISOString(),
            };
          }
          return w;
        })
      );
    },
    [activeWeekId]
  );

  const updateWeek = useCallback(
    (weekId: string, updated: Partial<WeekSchedule>) => {
      setWeeks((prev) =>
        prev.map((w) => {
          if (w.id === weekId) {
            return {
              ...w,
              ...updated,
              updatedAt: new Date().toISOString(),
            };
          }
          return w;
        })
      );
    },
    []
  );

  const createNewWeek = (
    title: string,
    dateRange: string,
    mode: 'placeholder' | 'empty' = 'placeholder',
    modality: 'presencial' | 'remoto' | 'hibrido' = 'presencial',
    remotePlatform?: string
  ): WeekSchedule => {
    const newWeek: WeekSchedule =
      mode === 'empty'
        ? {
            ...createEmptySampleWeek(title, dateRange),
            modality,
            remotePlatform,
          }
        : {
            ...createInitialSampleWeek(),
            id: `week_${Date.now()}`,
            title,
            dateRange,
            modality,
            remotePlatform,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            grid: {},
          };

    setWeeks((prev) => [newWeek, ...prev]);
    setActiveWeekId(newWeek.id);
    setActiveTab('grade');
    return newWeek;
  };

  const duplicateWeek = (sourceWeekId: string, newTitle: string, newDateRange: string): WeekSchedule => {
    return duplicateWeekWithOptions(sourceWeekId, newTitle, newDateRange, {
      copyGrid: true,
      copyLocks: true,
      copyClasses: true,
      copyTeachers: true,
      copySubjects: true,
      copyLoads: true,
      copyTimeSlots: true,
      copyRules: true,
      copySharedRooms: true,
    });
  };

  const duplicateWeekWithOptions = (
    sourceWeekId: string,
    newTitle: string,
    newDateRange: string,
    options: DuplicateWeekOptions
  ): WeekSchedule => {
    const source = weeks.find((w) => w.id === sourceWeekId) || activeWeek || createInitialSampleWeek();
    const newId = `week_${Date.now()}`;

    // Construct grid based on options
    let newGrid: Record<string, GridCell> = {};
    if (options.copyGrid) {
      newGrid = JSON.parse(JSON.stringify(source.grid || {}));
      if (!options.copyLocks) {
        Object.keys(newGrid).forEach((k) => {
          if (newGrid[k]) newGrid[k].isLocked = false;
        });
      }
    } else if (options.copyLocks) {
      // Only keep cells that are locked
      Object.entries(source.grid || {}).forEach(([k, cell]) => {
        const gridCell = cell as GridCell | undefined;
        if (gridCell && gridCell.isLocked) {
          newGrid[k] = JSON.parse(JSON.stringify(gridCell));
        }
      });
    }

    const defaultEmpty = createEmptySampleWeek(newTitle, newDateRange);

    const duplicated: WeekSchedule = {
      id: newId,
      title: newTitle,
      dateRange: newDateRange,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      institutionName: source.institutionName,
      shiftRanges: source.shiftRanges ? { ...source.shiftRanges } : undefined,
      activeDays: options.copyTimeSlots ? [...source.activeDays] : ['SEG', 'TER', 'QUA', 'QUI', 'SEX'],
      timeConfig: options.copyTimeSlots
        ? JSON.parse(JSON.stringify(source.timeConfig))
        : JSON.parse(JSON.stringify(defaultEmpty.timeConfig)),
      generatedSlots: options.copyTimeSlots
        ? JSON.parse(JSON.stringify(source.generatedSlots))
        : JSON.parse(JSON.stringify(defaultEmpty.generatedSlots)),
      classes: options.copyClasses ? JSON.parse(JSON.stringify(source.classes)) : [],
      teachers: options.copyTeachers ? JSON.parse(JSON.stringify(source.teachers)) : [],
      subjects: options.copySubjects ? JSON.parse(JSON.stringify(source.subjects)) : [],
      sharedRooms: options.copySharedRooms ? JSON.parse(JSON.stringify(source.sharedRooms)) : [],
      loads: options.copyLoads ? JSON.parse(JSON.stringify(source.loads)) : [],
      rules: options.copyRules ? JSON.parse(JSON.stringify(source.rules)) : [...INITIAL_RULES],
      grid: newGrid,
    };

    setWeeks((prev) => [duplicated, ...prev]);
    setActiveWeekId(newId);
    setActiveTab('grade');
    return duplicated;
  };

  const deleteWeek = (weekId: string) => {
    if (weeks.length <= 1) return;
    const remaining = weeks.filter((w) => w.id !== weekId);
    setWeeks(remaining);
    if (activeWeekId === weekId) {
      setActiveWeekId(remaining[0].id);
    }
  };

  // Grid Cell Operations with Undo/Redo
  const pushGridHistory = (newGrid: Record<string, GridCell>) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, newGrid];
    });
    setHistoryIndex((prev) => prev + 1);
  };

  const getAllRelatedClassIds = (classId: string, classes: ClassGroup[]): string[] => {
    const targetClass = classes.find((c) => c.id === classId);
    const ids = new Set<string>([classId]);
    if (targetClass?.isGrouped && targetClass.groupedClassIds) {
      targetClass.groupedClassIds.forEach((id) => ids.add(id));
    }
    const parentGroup = classes.find((c) => c.isGrouped && c.groupedClassIds?.includes(classId));
    if (parentGroup) {
      ids.add(parentGroup.id);
      parentGroup.groupedClassIds?.forEach((id) => ids.add(id));
    }
    return Array.from(ids);
  };

  const updateCell = (
    day: DayOfWeek,
    slotId: string,
    classId: string,
    subjectId: string | null,
    teacherId: string | null,
    isLocked?: boolean
  ) => {
    if (!activeWeek) return;
    const key = `${day}_${slotId}_${classId}`;
    const currentCell = activeWeek.grid[key];

    // Strict Lock Enforcement: A locked cell cannot have its content modified unless unlocked first
    if (
      currentCell?.isLocked &&
      isLocked === undefined &&
      (currentCell.subjectId !== subjectId || currentCell.teacherId !== teacherId)
    ) {
      console.warn('Operação bloqueada: Célula travada não pode ser modificada.');
      return;
    }

    const newLocked = isLocked !== undefined ? isLocked : currentCell?.isLocked || false;
    const relatedIds = getAllRelatedClassIds(classId, activeWeek.classes);
    const newGrid = { ...activeWeek.grid };

    for (const cId of relatedIds) {
      newGrid[`${day}_${slotId}_${cId}`] = {
        id: `cell_${day}_${slotId}_${cId}`,
        day,
        slotId,
        classId: cId,
        subjectId,
        teacherId,
        isLocked: newLocked,
      };
    }

    pushGridHistory(newGrid);
    updateActiveWeek({ grid: newGrid });
  };

  const clearCell = (day: DayOfWeek, slotId: string, classId: string) => {
    if (!activeWeek) return;
    const key = `${day}_${slotId}_${classId}`;
    const currentCell = activeWeek.grid[key];

    // Strict Lock Enforcement: A locked cell cannot be cleared
    if (currentCell?.isLocked) {
      console.warn('Operação bloqueada: Célula travada não pode ser limpa.');
      return;
    }

    const relatedIds = getAllRelatedClassIds(classId, activeWeek.classes);
    const newGrid = { ...activeWeek.grid };

    for (const cId of relatedIds) {
      const relCell = newGrid[`${day}_${slotId}_${cId}`];
      if (relCell?.isLocked) continue;

      newGrid[`${day}_${slotId}_${cId}`] = {
        id: `cell_${day}_${slotId}_${cId}`,
        day,
        slotId,
        classId: cId,
        subjectId: null,
        teacherId: null,
        isLocked: false,
      };
    }

    pushGridHistory(newGrid);
    updateActiveWeek({ grid: newGrid });
  };

  const toggleLockCell = (day: DayOfWeek, slotId: string, classId: string) => {
    if (!activeWeek) return;
    const key = `${day}_${slotId}_${classId}`;
    const cell = activeWeek.grid[key];
    if (!cell || !cell.subjectId) return;

    const newLocked = !cell.isLocked;
    const relatedIds = getAllRelatedClassIds(classId, activeWeek.classes);
    const newGrid = { ...activeWeek.grid };

    for (const cId of relatedIds) {
      const k = `${day}_${slotId}_${cId}`;
      if (newGrid[k]) {
        newGrid[k] = { ...newGrid[k], isLocked: newLocked };
      }
    }

    updateActiveWeek({ grid: newGrid });
  };

  const swapCells = (
    source: { day: DayOfWeek; slotId: string; classId: string },
    target: { day: DayOfWeek; slotId: string; classId: string }
  ) => {
    if (!activeWeek) return;
    const sourceKey = `${source.day}_${source.slotId}_${source.classId}`;
    const targetKey = `${target.day}_${target.slotId}_${target.classId}`;

    const sourceCell =
      resolveCellForClass(
        activeWeek.grid,
        source.day,
        source.slotId,
        source.classId,
        activeWeek.classes
      ) || activeWeek.grid[sourceKey];

    const targetCell =
      resolveCellForClass(
        activeWeek.grid,
        target.day,
        target.slotId,
        target.classId,
        activeWeek.classes
      ) || activeWeek.grid[targetKey];

    // Strict Lock Enforcement: Locked cells cannot be moved or swapped
    if (sourceCell?.isLocked || targetCell?.isLocked) {
      console.warn('Operação bloqueada: Células travadas não podem ser trocadas.');
      return;
    }

    const sourceRelated = getAllRelatedClassIds(source.classId, activeWeek.classes);
    const targetRelated = getAllRelatedClassIds(target.classId, activeWeek.classes);
    const newGrid = { ...activeWeek.grid };

    for (const sId of sourceRelated) {
      newGrid[`${source.day}_${source.slotId}_${sId}`] = {
        id: `cell_${source.day}_${source.slotId}_${sId}`,
        day: source.day,
        slotId: source.slotId,
        classId: sId,
        subjectId: targetCell?.subjectId || null,
        teacherId: targetCell?.teacherId || null,
        isLocked: targetCell?.isLocked || false,
      };
    }

    for (const tId of targetRelated) {
      newGrid[`${target.day}_${target.slotId}_${tId}`] = {
        id: `cell_${target.day}_${target.slotId}_${tId}`,
        day: target.day,
        slotId: target.slotId,
        classId: tId,
        subjectId: sourceCell?.subjectId || null,
        teacherId: sourceCell?.teacherId || null,
        isLocked: sourceCell?.isLocked || false,
      };
    }

    pushGridHistory(newGrid);
    updateActiveWeek({ grid: newGrid });
  };

  const moveCell = (
    source: { day: DayOfWeek; slotId: string; classId: string },
    target: { day: DayOfWeek; slotId: string; classId: string }
  ) => {
    if (!activeWeek) return;
    const sourceKey = `${source.day}_${source.slotId}_${source.classId}`;
    const targetKey = `${target.day}_${target.slotId}_${target.classId}`;

    const sourceCell =
      resolveCellForClass(
        activeWeek.grid,
        source.day,
        source.slotId,
        source.classId,
        activeWeek.classes
      ) || activeWeek.grid[sourceKey];

    const targetCell =
      resolveCellForClass(
        activeWeek.grid,
        target.day,
        target.slotId,
        target.classId,
        activeWeek.classes
      ) || activeWeek.grid[targetKey];

    // Strict Lock Enforcement: Locked cells cannot be moved or overwritten
    if (sourceCell?.isLocked || targetCell?.isLocked) {
      console.warn('Operação bloqueada: Células travadas não podem ser movidas.');
      return;
    }

    if (!sourceCell || !sourceCell.subjectId) return;

    const sourceRelated = getAllRelatedClassIds(source.classId, activeWeek.classes);
    const targetRelated = getAllRelatedClassIds(target.classId, activeWeek.classes);
    const newGrid = { ...activeWeek.grid };

    for (const sId of sourceRelated) {
      newGrid[`${source.day}_${source.slotId}_${sId}`] = {
        id: `cell_${source.day}_${source.slotId}_${sId}`,
        day: source.day,
        slotId: source.slotId,
        classId: sId,
        subjectId: null,
        teacherId: null,
        isLocked: false,
      };
    }

    for (const tId of targetRelated) {
      newGrid[`${target.day}_${target.slotId}_${tId}`] = {
        id: `cell_${target.day}_${target.slotId}_${tId}`,
        day: target.day,
        slotId: target.slotId,
        classId: tId,
        subjectId: sourceCell.subjectId,
        teacherId: sourceCell.teacherId,
        isLocked: false,
      };
    }

    pushGridHistory(newGrid);
    updateActiveWeek({ grid: newGrid });
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      const prevGrid = history[prevIndex];
      if (prevGrid) {
        updateActiveWeek({ grid: prevGrid });
      }
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      const nextGrid = history[nextIndex];
      if (nextGrid) {
        updateActiveWeek({ grid: nextGrid });
      }
    }
  };

  // Global keyboard shortcuts for Undo / Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          if (historyIndex < history.length - 1) {
            redo();
          }
        } else {
          e.preventDefault();
          if (historyIndex > 0) {
            undo();
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (historyIndex < history.length - 1) {
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  // Solver execution
  const generateGrid = (): SolverResult => {
    if (!activeWeek) {
      return {
        success: false,
        grid: {},
        allocatedCount: 0,
        totalTargetCount: 0,
        violations: ['Sem semana ativa'],
        diagnostics: ['Nenhuma semana selecionada.'],
        suggestedRelaxations: [],
        durationMs: 0,
      };
    }

    if (activeWeek.classes.length === 0) {
      const emptyResult: SolverResult = {
        success: false,
        grid: activeWeek.grid || {},
        allocatedCount: 0,
        totalTargetCount: 0,
        violations: ['Nenhuma turma cadastrada'],
        diagnostics: ['Cadastre ao menos uma turma na aba "Turmas" para poder gerar os horários da semana.'],
        suggestedRelaxations: ['Acesse a aba Turmas para adicionar suas turmas.'],
        durationMs: 0,
      };
      setLastSolverResult(emptyResult);
      return emptyResult;
    }

    // Auto-create balanced default loads if user has classes & subjects but zero loads configured
    let effectiveLoads = activeWeek.loads;
    if (effectiveLoads.length === 0 && activeWeek.subjects.length > 0) {
      const generatedLoads: SubjectLoad[] = [];
      const nonGrouped = activeWeek.classes.filter((c) => !c.isGrouped);
      for (const cls of nonGrouped) {
        for (const sub of activeWeek.subjects) {
          generatedLoads.push({
            id: `load_${cls.id}_${sub.id}`,
            classId: cls.id,
            subjectId: sub.id,
            lessonsPerWeek: sub.isHeavy ? 4 : 3,
          });
        }
      }
      effectiveLoads = generatedLoads;
      updateActiveWeek({ loads: generatedLoads });
    }

    const result = generateScheduleWithSolver(
      activeWeek.activeDays,
      activeWeek.generatedSlots,
      activeWeek.classes,
      activeWeek.subjects,
      activeWeek.teachers,
      activeWeek.rules,
      effectiveLoads,
      activeWeek.grid
    );

    setLastSolverResult(result);
    // Always apply generated timetable allocations
    if (result.success || Object.keys(result.grid).length > 0) {
      pushGridHistory(result.grid);
      updateActiveWeek({ grid: result.grid });
    }

    return result;
  };

  const bulkAddTeachersAndSubjects = (items: {
    teacherName: string;
    shortName?: string;
    subjectNames: string[];
    allowedShift?: any;
    maxConsecutive?: number;
    email?: string;
  }[]): { createdTeachers: number; createdSubjects: number } => {
    if (!activeWeek) return { createdTeachers: 0, createdSubjects: 0 };

    const existingSubjects = [...activeWeek.subjects];
    const existingTeachers = [...activeWeek.teachers];
    let createdSubjectsCount = 0;
    let createdTeachersCount = 0;

    const palette = [
      '#2563eb', '#0891b2', '#059669', '#16a34a', '#d97706',
      '#b45309', '#dc2626', '#8b5cf6', '#ea580c', '#4f46e5',
      '#0d9488', '#0284c7', '#7c3aed', '#c026d3', '#db2777'
    ];

    for (const item of items) {
      if (!item.teacherName.trim()) continue;
      const assignedSubjectIds: string[] = [];

      for (const rawSubName of item.subjectNames) {
        const subName = rawSubName.trim();
        if (!subName) continue;

        let foundSub = existingSubjects.find(
          (s) => s.name.trim().toLowerCase() === subName.toLowerCase()
        );

        if (!foundSub) {
          const color = palette[existingSubjects.length % palette.length];
          const isHeavy = /matem[áa]tica|f[íi]sica|qu[íi]mica/i.test(subName);
          const newSub: Subject = {
            id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: subName,
            shortName: subName.length > 8 ? subName.slice(0, 8) : subName,
            color,
            isHeavy,
            area: isHeavy ? 'Exatas' : 'Geral',
          };
          existingSubjects.push(newSub);
          foundSub = newSub;
          createdSubjectsCount++;
        }

        if (foundSub && !assignedSubjectIds.includes(foundSub.id)) {
          assignedSubjectIds.push(foundSub.id);
        }
      }

      const newTeacher: Teacher = {
        id: `tea_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: item.teacherName.trim(),
        shortName: item.shortName?.trim() || item.teacherName.trim().split(' ')[0],
        subjectIds: assignedSubjectIds,
        allowedShift: item.allowedShift || 'all',
        maxConsecutiveLessons: item.maxConsecutive || 3,
        absences: [],
        email: item.email?.trim(),
      };

      existingTeachers.push(newTeacher);
      createdTeachersCount++;
    }

    updateActiveWeek({
      subjects: existingSubjects,
      teachers: existingTeachers,
    });

    return { createdTeachers: createdTeachersCount, createdSubjects: createdSubjectsCount };
  };

  // Configuration helper functions
  const updateTimeConfig = (config: DayTimeConfig) => {
    if (!activeWeek) return;
    const timeCalc = calculateTimeSlots(config);
    updateActiveWeek({
      timeConfig: config,
      generatedSlots: timeCalc.slots,
    });
  };

  const addClassGroup = (cls: ClassGroup) => {
    if (!activeWeek) return;
    let newLoads = [...activeWeek.loads];
    if (cls.isGrouped && cls.groupedClassIds && cls.groupedClassIds.length > 0) {
      // Check if group already has loads
      const existingGroupLoads = activeWeek.loads.filter((l) => l.classId === cls.id);
      if (existingGroupLoads.length === 0) {
        // Clone loads from the first member class
        const firstMemberLoads = activeWeek.loads.filter((l) => l.classId === cls.groupedClassIds![0]);
        const cloned = firstMemberLoads.map((l) => ({
          ...l,
          id: `load_${cls.id}_${l.subjectId}`,
          classId: cls.id,
        }));
        newLoads = [...newLoads, ...cloned];
      }
    }

    updateActiveWeek({
      classes: [...activeWeek.classes, cls],
      loads: newLoads,
    });
  };

  const updateClassGroup = (cls: ClassGroup) => {
    if (!activeWeek) return;
    updateActiveWeek({
      classes: activeWeek.classes.map((c) => (c.id === cls.id ? cls : c)),
    });
  };

  const deleteClassGroup = (classId: string) => {
    if (!activeWeek) return;
    updateActiveWeek({
      classes: activeWeek.classes.filter((c) => c.id !== classId),
      loads: activeWeek.loads.filter((l) => l.classId !== classId),
    });
  };

  const reorderClasses = (reordered: ClassGroup[]) => {
    if (!activeWeek) return;
    updateActiveWeek({
      classes: reordered,
    });
  };

  const addTeacher = (teacher: Teacher) => {
    if (!activeWeek) return;
    updateActiveWeek({
      teachers: [...activeWeek.teachers, teacher],
    });
  };

  const updateTeacher = (teacher: Teacher) => {
    if (!activeWeek) return;
    updateActiveWeek({
      teachers: activeWeek.teachers.map((t) => (t.id === teacher.id ? teacher : t)),
    });
  };

  const deleteTeacher = (teacherId: string) => {
    if (!activeWeek) return;
    updateActiveWeek({
      teachers: activeWeek.teachers.filter((t) => t.id !== teacherId),
    });
  };

  const addSubject = (subject: Subject) => {
    if (!activeWeek) return;
    updateActiveWeek({
      subjects: [...activeWeek.subjects, subject],
    });
  };

  const updateSubject = (subject: Subject) => {
    if (!activeWeek) return;
    updateActiveWeek({
      subjects: activeWeek.subjects.map((s) => (s.id === subject.id ? subject : s)),
    });
  };

  const deleteSubject = (subjectId: string) => {
    if (!activeWeek) return;
    updateActiveWeek({
      subjects: activeWeek.subjects.filter((s) => s.id !== subjectId),
      loads: activeWeek.loads.filter((l) => l.subjectId !== subjectId),
    });
  };

  const updateLoad = (
    classId: string,
    subjectId: string,
    lessonsPerWeek: number,
    preferredTeacherId?: string
  ) => {
    if (!activeWeek) return;
    const existing = activeWeek.loads.find((l) => l.classId === classId && l.subjectId === subjectId);
    let newLoads: SubjectLoad[];

    if (existing) {
      if (lessonsPerWeek <= 0) {
        newLoads = activeWeek.loads.filter((l) => l.id !== existing.id);
      } else {
        newLoads = activeWeek.loads.map((l) =>
          l.id === existing.id ? { ...l, lessonsPerWeek, preferredTeacherId } : l
        );
      }
    } else if (lessonsPerWeek > 0) {
      newLoads = [
        ...activeWeek.loads,
        {
          id: `load_${classId}_${subjectId}`,
          classId,
          subjectId,
          lessonsPerWeek,
          preferredTeacherId,
        },
      ];
    } else {
      newLoads = activeWeek.loads;
    }

    updateActiveWeek({ loads: newLoads });
  };

  const addRule = (rule: ScheduleRule) => {
    if (!activeWeek) return;
    updateActiveWeek({
      rules: [...activeWeek.rules, rule],
    });
  };

  const updateRule = (rule: ScheduleRule) => {
    if (!activeWeek) return;
    updateActiveWeek({
      rules: activeWeek.rules.map((r) => (r.id === rule.id ? rule : r)),
    });
  };

  const deleteRule = (ruleId: string) => {
    if (!activeWeek) return;
    updateActiveWeek({
      rules: activeWeek.rules.filter((r) => r.id !== ruleId),
    });
  };

  const toggleRule = (ruleId: string) => {
    if (!activeWeek) return;
    updateActiveWeek({
      rules: activeWeek.rules.map((r) => (r.id === ruleId ? { ...r, isEnabled: !r.isEnabled } : r)),
    });
  };

  const importData = (rawInput: string | unknown) => {
    const val = validateBackupJSON(rawInput);
    if (val.isValid && val.weeks && val.weeks.length > 0) {
      setWeeks(val.weeks);
      setActiveWeekId(val.weeks[0].id);
      setHistory([]);
      setHistoryIndex(-1);
      return { isValid: true, count: val.weeks.length };
    }
    return { isValid: false, error: val.error || 'Arquivo de backup inválido.' };
  };

  const resetToSampleSchool = () => {
    const sample = createInitialSampleWeek();
    const preSolved = generateScheduleWithSolver(
      sample.activeDays,
      sample.generatedSlots,
      sample.classes,
      sample.subjects,
      sample.teachers,
      sample.rules,
      sample.loads,
      {}
    );
    sample.grid = preSolved.grid;
    const secondary = createSecondarySampleWeek();
    secondary.grid = { ...preSolved.grid };

    setWeeks([sample, secondary]);
    setActiveWeekId(sample.id);
    setActiveTab('grade');
    setHistory([]);
    setHistoryIndex(-1);
  };

  const resetToEmptySchool = () => {
    const emptyWeek = createEmptySampleWeek('Minha Grade Escolar', 'Semana Inicial');
    setWeeks([emptyWeek]);
    setActiveWeekId(emptyWeek.id);
    setActiveTab('grade');
    setHistory([]);
    setHistoryIndex(-1);
  };

  const resetAllToDefaults = () => {
    resetToSampleSchool();
  };

  return (
    <ScheduleContext.Provider
      value={{
        user,
        login,
        logout,
        weeks,
        activeWeek,
        activeWeekId,
        setActiveWeekId,
        activeTab,
        setActiveTab,
        layoutTheme,
        setLayoutTheme,
        selectedDay,
        setSelectedDay,
        validation,
        updateCell,
        clearCell,
        toggleLockCell,
        swapCells,
        moveCell,
        draggingCell,
        setDraggingCell,
        generateGrid,
        lastSolverResult,
        setLastSolverResult,
        createNewWeek,
        duplicateWeek,
        duplicateWeekWithOptions,
        updateActiveWeek,
        updateWeek,
        deleteWeek,
        resetToSampleSchool,
        resetToEmptySchool,
        updateTimeConfig,
        addClassGroup,
        updateClassGroup,
        deleteClassGroup,
        reorderClasses,
        addTeacher,
        updateTeacher,
        deleteTeacher,
        addSubject,
        updateSubject,
        deleteSubject,
        updateLoad,
        addRule,
        updateRule,
        deleteRule,
        toggleRule,
        canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1,
        undo,
        redo,
        hasUnsavedTimesChanges,
        setHasUnsavedTimesChanges,
        pendingTabChange,
        setPendingTabChange,
        confirmTabChange,
        registerSaveTimesCallback,
        registerDiscardTimesCallback,
        bulkAddTeachersAndSubjects,
        importData,
        resetAllToDefaults,
      }}
    >
      {children}
    </ScheduleContext.Provider>
  );
};

export const useSchedule = () => {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
};
