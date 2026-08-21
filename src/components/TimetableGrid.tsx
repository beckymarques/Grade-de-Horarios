import React, { useState } from 'react';
import {
  DayOfWeek,
  DAYS_OF_WEEK,
  GridCell,
  TimeSlot,
  Subject,
  Teacher,
  TimetableLayoutTheme,
  getDisplayClasses,
} from '../types';
import { useSchedule } from '../context/ScheduleContext';
import { CellEditModal } from './CellEditModal';
import { resolveCellForClass } from '../utils/rulesEngine';
import {
  Lock,
  Unlock,
  AlertTriangle,
  RotateCcw,
  RotateCw,
  Search,
  Filter,
  UserCheck,
  Sparkles,
  GripVertical,
  CheckCircle2,
  Info,
  Table,
  LayoutGrid,
  Columns3,
  SlidersHorizontal,
  Palette,
} from 'lucide-react';

interface TimetableGridProps {
  onOpenSolver?: () => void;
  onOpenExport?: () => void;
  onOpenLayoutModal?: () => void;
  onOpenConflicts?: () => void;
}

export const TimetableGrid: React.FC<TimetableGridProps> = ({
  onOpenSolver,
  onOpenExport,
  onOpenLayoutModal,
  onOpenConflicts,
}) => {
  const {
    activeWeek,
    selectedDay,
    setSelectedDay,
    validation,
    layoutTheme,
    setLayoutTheme,
    toggleLockCell,
    swapCells,
    moveCell,
    draggingCell,
    setDraggingCell,
    canUndo,
    canRedo,
    undo,
    redo,
    generateGrid,
  } = useSchedule();

  const [filterQuery, setFilterQuery] = useState('');
  const [selectedCellToEdit, setSelectedCellToEdit] = useState<{
    day: DayOfWeek;
    slotId: string;
    classId: string;
  } | null>(null);

  const [dragOverCellKey, setDragOverCellKey] = useState<string | null>(null);

  if (!activeWeek) return null;

  const activeDaysToRender: DayOfWeek[] =
    selectedDay === 'ALL' ? activeWeek.activeDays : [selectedDay];

  const displayClasses = getDisplayClasses(activeWeek.classes);

  const subjectMap = new Map<string, Subject>(activeWeek.subjects.map((s) => [s.id, s]));
  const teacherMap = new Map<string, Teacher>(activeWeek.teachers.map((t) => [t.id, t]));

  // Drag and Drop handlers
  const handleDragStart = (
    e: React.DragEvent,
    day: DayOfWeek,
    slotId: string,
    classId: string,
    cell: GridCell
  ) => {
    e.dataTransfer.setData('text/plain', `${day}_${slotId}_${classId}`);
    setDraggingCell({ day, slotId, classId, cell });
  };

  const handleDragOver = (e: React.DragEvent, cellKey: string) => {
    e.preventDefault();
    if (dragOverCellKey !== cellKey) {
      setDragOverCellKey(cellKey);
    }
  };

  const handleDragLeave = () => {
    setDragOverCellKey(null);
  };

  const handleDrop = (
    e: React.DragEvent,
    targetDay: DayOfWeek,
    targetSlotId: string,
    targetClassId: string
  ) => {
    e.preventDefault();
    setDragOverCellKey(null);
    if (!draggingCell) return;

    const source = {
      day: draggingCell.day,
      slotId: draggingCell.slotId,
      classId: draggingCell.classId,
    };
    const target = {
      day: targetDay,
      slotId: targetSlotId,
      classId: targetClassId,
    };

    if (
      source.day === target.day &&
      source.slotId === target.slotId &&
      source.classId === target.classId
    ) {
      setDraggingCell(null);
      return;
    }

    // If target has a subject, swap; otherwise move
    const targetCell = resolveCellForClass(
      activeWeek.grid,
      targetDay,
      targetSlotId,
      targetClassId,
      activeWeek.classes
    );

    if (targetCell && targetCell.subjectId) {
      swapCells(source, target);
    } else {
      moveCell(source, target);
    }

    setDraggingCell(null);
  };

  // Helper for teacher initials avatar
  const getInitials = (name?: string) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar: Day Selector Tabs, Quick Layout Switcher, Search & Filters, Undo/Redo */}
      <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3">
        
        {/* Left Side: Day Selector Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto w-full lg:w-auto scrollbar-none pb-1 lg:pb-0">
          {activeWeek.activeDays.map((dayKey) => {
            const dayMeta = DAYS_OF_WEEK.find((d) => d.key === dayKey);
            const isSelected = selectedDay === dayKey;
            
            // Count conflicts on this day
            const dayConflicts = validation.conflicts.filter((c) => c.day === dayKey);
            const hasError = dayConflicts.some((c) => c.severity === 'error');
            const hasWarning = dayConflicts.some((c) => c.severity === 'warning');

            return (
              <button
                key={dayKey}
                id={`btn_day_${dayKey}`}
                onClick={() => setSelectedDay(dayKey)}
                className={`relative px-3.5 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{dayMeta?.short || dayKey}</span>
                {hasError && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
                )}
                {!hasError && hasWarning && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-white" />
                )}
              </button>
            );
          })}

          {/* All Days View */}
          <button
            id="btn_day_all"
            onClick={() => setSelectedDay('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
              selectedDay === 'ALL'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Semana Toda
          </button>
        </div>

        {/* Center/Right: Quick Theme Switcher & Search & Undo/Redo */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end">
          
          {/* Layout Selector Quick Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setLayoutTheme('classic_table')}
              title="Planilha Clássica / Tabela Executiva"
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                layoutTheme === 'classic_table'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clássico</span>
            </button>
            <button
              onClick={() => setLayoutTheme('modern_cards')}
              title="Cartões Modernos (Visual Cards)"
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                layoutTheme === 'modern_cards'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cartões</span>
            </button>
            <button
              onClick={() => setLayoutTheme('school_board')}
              title="Mural Escolar / Quadro de Horários"
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                layoutTheme === 'school_board'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mural</span>
            </button>
            <button
              onClick={() => setLayoutTheme('compact_density')}
              title="Alta Densidade / Visão Panorâmica"
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                layoutTheme === 'compact_density'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Compacto</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative flex-1 sm:w-52">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Buscar professor, matéria..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50"
            />
            {filterQuery && (
              <button
                onClick={() => setFilterQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>

          {/* Undo / Redo */}
          <div className="flex items-center gap-1">
            <button
              onClick={undo}
              disabled={!canUndo}
              title="Desfazer última alteração"
              className="p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg border border-slate-200"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              title="Refazer alteração"
              className="p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg border border-slate-200"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid View according to Layout Theme */}
      <div id="exportable_grid_view" className="space-y-6">
        {activeDaysToRender.map((dayKey) => {
          const dayMeta = DAYS_OF_WEEK.find((d) => d.key === dayKey);

          // Render based on selected layoutTheme
          return (
            <div
              key={dayKey}
              className={`transition-all duration-200 ${
                layoutTheme === 'modern_cards'
                  ? 'bg-slate-100/70 p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-4'
                  : layoutTheme === 'school_board'
                  ? 'bg-slate-950 p-4 sm:p-5 rounded-3xl border-4 border-slate-700 shadow-2xl space-y-4'
                  : layoutTheme === 'compact_density'
                  ? 'bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden'
                  : 'bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden'
              }`}
            >
              {/* Day Header */}
              <div
                className={`flex items-center justify-between transition ${
                  layoutTheme === 'modern_cards'
                    ? 'bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 text-white px-5 py-3 rounded-2xl shadow-sm'
                    : layoutTheme === 'school_board'
                    ? 'bg-slate-900 text-amber-300 font-mono tracking-widest uppercase text-sm border-b-2 border-amber-400/40 p-3 rounded-xl'
                    : layoutTheme === 'compact_density'
                    ? 'bg-slate-800 text-white px-3 py-1.5 text-xs'
                    : 'bg-slate-800 text-white px-4 py-2.5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm tracking-wide">
                    {dayMeta?.label.toUpperCase() || dayKey}
                  </span>
                  <span className="text-xs text-slate-300 font-medium">
                    • {activeWeek.title}
                  </span>
                </div>
                <div className="text-xs text-slate-300 flex items-center gap-3">
                  <span>{displayClasses.length} Turmas</span>
                  <span>•</span>
                  <span>{activeWeek.generatedSlots.length} Tempos</span>
                </div>
              </div>

              {/* Table Spreadsheet / Board */}
              <div className="overflow-x-auto">
                <table
                  className={`w-full border-collapse text-left ${
                    layoutTheme === 'school_board' ? 'bg-slate-900 text-white' : ''
                  }`}
                >
                  <thead>
                    <tr
                      className={`text-[11px] font-bold uppercase tracking-wider ${
                        layoutTheme === 'modern_cards'
                          ? 'bg-transparent text-slate-600'
                          : layoutTheme === 'school_board'
                          ? 'bg-slate-900 text-amber-200 border-b-2 border-slate-700'
                          : layoutTheme === 'compact_density'
                          ? 'bg-slate-100 text-slate-700 border-b border-slate-200 text-[10px]'
                          : 'bg-slate-50 border-b border-slate-200 text-slate-600'
                      }`}
                    >
                      <th
                        className={`w-32 border-r ${
                          layoutTheme === 'school_board'
                            ? 'border-slate-700 p-2.5 font-mono text-amber-300'
                            : layoutTheme === 'compact_density'
                            ? 'border-slate-200 p-1.5 w-24'
                            : 'border-slate-200 p-3'
                        }`}
                      >
                        Horário / Tempo
                      </th>

                      {displayClasses.map((cls) => (
                        <th
                          key={cls.id}
                          className={`border-r ${
                            layoutTheme === 'modern_cards'
                              ? 'min-w-[210px] p-2.5 border-slate-200/60'
                              : layoutTheme === 'school_board'
                              ? 'min-w-[200px] p-3 border-slate-700 bg-slate-800/80 text-white'
                              : layoutTheme === 'compact_density'
                              ? 'min-w-[150px] p-1.5 border-slate-200'
                              : 'min-w-[190px] p-3 border-slate-200'
                          }`}
                          style={{
                            borderTop:
                              layoutTheme === 'school_board'
                                ? `4px solid ${cls.color || '#fbbf24'}`
                                : `3px solid ${cls.color || '#6366f1'}`,
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`font-black ${
                                layoutTheme === 'school_board'
                                  ? 'text-white text-xs tracking-wider'
                                  : layoutTheme === 'compact_density'
                                  ? 'text-slate-900 text-[11px]'
                                  : 'text-slate-900 text-xs'
                              }`}
                            >
                              {cls.name}
                            </span>
                            {cls.isGrouped && (
                              <span className="text-[9px] bg-teal-100 text-teal-800 font-bold px-1.5 py-0.5 rounded">
                                Agrupada
                              </span>
                            )}
                          </div>
                          {cls.defaultRoom && (
                            <div className="text-[10px] text-slate-400 font-normal lowercase">
                              {cls.defaultRoom}
                            </div>
                          )}
                        </th>
                      ))}

                      {/* Tutores em Janela Header */}
                      <th
                        className={`min-w-[200px] border-r ${
                          layoutTheme === 'school_board'
                            ? 'border-slate-700 p-2.5 bg-amber-950/40 text-amber-300'
                            : layoutTheme === 'compact_density'
                            ? 'border-slate-200 p-1.5 bg-amber-50/50 min-w-[160px]'
                            : 'border-slate-200 p-3 bg-amber-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-amber-900">
                          <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                          <span
                            className={
                              layoutTheme === 'school_board'
                                ? 'text-amber-300 font-bold font-mono'
                                : 'text-amber-900'
                            }
                          >
                            Tutores em Janela
                          </span>
                        </div>
                      </th>

                      {/* Validation Column Header */}
                      <th
                        className={`min-w-[240px] max-w-[320px] text-left hide-on-export ${
                          layoutTheme === 'school_board'
                            ? 'p-2.5 text-amber-300 font-mono text-xs'
                            : layoutTheme === 'compact_density'
                            ? 'p-1.5 text-slate-600 text-[10px]'
                            : 'p-3 text-slate-600 text-xs'
                        }`}
                      >
                        Validação em Tempo Real
                      </th>
                    </tr>
                  </thead>

                  <tbody
                    className={`${
                      layoutTheme === 'school_board'
                        ? 'divide-y-2 divide-slate-800 text-xs'
                        : layoutTheme === 'compact_density'
                        ? 'divide-y divide-slate-100 text-[11px]'
                        : 'divide-y divide-slate-200 text-xs'
                    }`}
                  >
                    {activeWeek.generatedSlots.map((slot) => {
                      const isIntervalOrEvent = slot.type === 'interval' || slot.type === 'event';

                      // Find window tutors for this slot
                      const slotWindowTutors = validation.windowTutors.filter(
                        (w) => w.day === dayKey && w.slotId === slot.id
                      );

                      // Find conflicts for this slot
                      const slotConflicts = validation.conflicts.filter(
                        (c) => c.day === dayKey && c.slotId === slot.id
                      );
                      const hasSlotError = slotConflicts.some((c) => c.severity === 'error');
                      const hasSlotWarning = slotConflicts.some((c) => c.severity === 'warning');

                      // 1. INTERVAL & EVENT ROWS
                      if (isIntervalOrEvent) {
                        return (
                          <tr
                            key={slot.id}
                            className={`font-semibold ${
                              layoutTheme === 'school_board'
                                ? 'bg-amber-400 text-slate-950 font-black tracking-wider uppercase'
                                : layoutTheme === 'modern_cards'
                                ? 'bg-amber-100/70 text-amber-950 font-bold'
                                : layoutTheme === 'compact_density'
                                ? 'bg-amber-50 text-amber-900 text-[10px]'
                                : slot.type === 'interval'
                                ? 'bg-amber-50/60 text-amber-900 border-y-2 border-slate-200'
                                : 'bg-blue-50/70 text-blue-900 border-y-2 border-slate-200'
                            }`}
                          >
                            <td
                              className={`whitespace-nowrap border-r ${
                                layoutTheme === 'school_board'
                                  ? 'border-slate-800 p-2 font-mono'
                                  : layoutTheme === 'compact_density'
                                  ? 'border-slate-200 p-1'
                                  : 'border-slate-200 p-2.5'
                              }`}
                            >
                              <div className="font-bold">
                                {slot.startTime} - {slot.endTime}
                              </div>
                              <div className="text-[10px] opacity-75">{slot.durationMinutes} min</div>
                            </td>
                            <td
                              colSpan={displayClasses.length}
                              className={`text-center border-r uppercase tracking-wider ${
                                layoutTheme === 'school_board'
                                  ? 'border-slate-800 p-2 text-xs font-black'
                                  : layoutTheme === 'compact_density'
                                  ? 'border-slate-200 p-1 text-[10px]'
                                  : 'border-slate-200 p-2.5 text-xs'
                              }`}
                            >
                              ✨ {slot.name} ({slot.durationMinutes} minutos) ✨
                            </td>
                            <td
                              className={`border-r text-center italic ${
                                layoutTheme === 'school_board'
                                  ? 'border-slate-800 p-2 text-[11px] text-slate-900 font-bold'
                                  : layoutTheme === 'compact_density'
                                  ? 'border-slate-200 p-1 text-[10px] text-slate-500'
                                  : 'border-slate-200 p-2.5 bg-amber-50/30 text-[11px] text-slate-500'
                              }`}
                            >
                              Intervalo Geral
                            </td>
                            <td className="p-2 align-top text-left hide-on-export">
                              {slotConflicts.length > 0 ? (
                                <div className="space-y-1.5">
                                  {slotConflicts.map((c, i) => (
                                    <div
                                      key={i}
                                      className={`p-1.5 rounded-lg text-[11px] leading-tight font-medium ${
                                        c.severity === 'error'
                                          ? 'bg-rose-100 text-rose-900 border border-rose-300'
                                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                                      }`}
                                    >
                                      <div className="font-bold flex items-center gap-1">
                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                        <span>{c.ruleName}</span>
                                      </div>
                                      <div className="text-[10px] mt-0.5">{c.message}</div>
                                      {c.suggestion && (
                                        <div className="text-[9px] opacity-80 mt-0.5 italic">
                                          {c.suggestion}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                  OK (Horário regular)
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      }

                      // 2. STANDARD LESSON ROWS
                      return (
                        <tr
                          key={slot.id}
                          className={`transition ${
                            layoutTheme === 'school_board'
                              ? 'hover:bg-slate-800/60'
                              : 'hover:bg-slate-50/50'
                          }`}
                        >
                          {/* Time & Slot Name Column */}
                          <td
                            className={`border-r font-medium ${
                              layoutTheme === 'school_board'
                                ? 'p-2.5 border-slate-700 bg-slate-900 text-slate-200 font-mono'
                                : layoutTheme === 'compact_density'
                                ? 'p-1.5 border-slate-200 bg-slate-50/50 text-[10px]'
                                : 'p-2.5 border-slate-200 bg-slate-50/50 text-slate-700'
                            }`}
                          >
                            <div
                              className={`font-bold ${
                                layoutTheme === 'school_board'
                                  ? 'text-amber-300 text-xs'
                                  : 'text-slate-900 text-xs'
                              }`}
                            >
                              {slot.name}
                            </div>
                            <div
                              className={
                                layoutTheme === 'school_board'
                                  ? 'text-slate-400 text-[11px]'
                                  : 'text-slate-500 text-[11px]'
                              }
                            >
                              {slot.startTime} – {slot.endTime}
                            </div>
                            <div className="text-[10px] text-slate-400">{slot.durationMinutes} min</div>
                          </td>

                          {/* Class Schedule Cells */}
                          {displayClasses.map((cls) => {
                            const cellKey = `${dayKey}_${slot.id}_${cls.id}`;
                            const cell = resolveCellForClass(
                              activeWeek.grid,
                              dayKey,
                              slot.id,
                              cls.id,
                              activeWeek.classes
                            );
                            const subject = cell?.subjectId ? subjectMap.get(cell.subjectId) : null;
                            const teacher = cell?.teacherId ? teacherMap.get(cell.teacherId) : null;

                            // Conflicts on this cell
                            const cellConflicts = validation.conflicts.filter(
                              (c) => c.day === dayKey && c.slotId === slot.id && c.classId === cls.id
                            );
                            const hasCellError = cellConflicts.some((c) => c.severity === 'error');
                            const hasCellWarning = cellConflicts.some((c) => c.severity === 'warning');

                            // Filter query
                            const isMatch = filterQuery
                              ? subject?.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
                                subject?.shortName.toLowerCase().includes(filterQuery.toLowerCase()) ||
                                teacher?.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
                                teacher?.shortName.toLowerCase().includes(filterQuery.toLowerCase())
                              : true;

                            const isDragOver = dragOverCellKey === cellKey;

                            return (
                              <td
                                key={cls.id}
                                onDragOver={(e) => handleDragOver(e, cellKey)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, dayKey, slot.id, cls.id)}
                                className={`border-r align-top transition relative group h-full ${
                                  layoutTheme === 'modern_cards'
                                    ? 'p-2.5 border-slate-200/50'
                                    : layoutTheme === 'school_board'
                                    ? 'p-2 border-slate-800'
                                    : layoutTheme === 'compact_density'
                                    ? 'p-1 border-slate-200'
                                    : 'p-2 border-slate-200'
                                } ${
                                  isDragOver
                                    ? 'bg-indigo-100 ring-2 ring-indigo-500'
                                    : hasCellError
                                    ? layoutTheme === 'school_board'
                                      ? 'bg-rose-950/80'
                                      : 'bg-rose-50/80'
                                    : hasCellWarning
                                    ? layoutTheme === 'school_board'
                                      ? 'bg-amber-950/70'
                                      : 'bg-amber-50/70'
                                    : layoutTheme === 'school_board'
                                    ? 'bg-slate-900'
                                    : 'bg-white'
                                } ${!isMatch && filterQuery ? 'opacity-25' : ''}`}
                              >
                                <div className="h-full flex flex-col">
                                  {cell && cell.subjectId ? (
                                    /* FILLED CELL CONTENT */
                                    <div
                                      draggable
                                      onDragStart={(e) =>
                                        handleDragStart(e, dayKey, slot.id, cls.id, cell)
                                      }
                                      onClick={() =>
                                        setSelectedCellToEdit({
                                          day: dayKey,
                                          slotId: slot.id,
                                          classId: cls.id,
                                        })
                                      }
                                      style={{
                                        backgroundColor:
                                          layoutTheme === 'school_board'
                                            ? subject?.color || '#3e70d6'
                                            : undefined,
                                      }}
                                      className={`transition select-none flex-1 flex flex-col justify-between cursor-grab active:cursor-grabbing ${
                                        // 1. MODERN CARDS THEME
                                        layoutTheme === 'modern_cards'
                                          ? `p-3 rounded-2xl border shadow-xs hover:shadow-md hover:-translate-y-0.5 min-h-[5.5rem] bg-white ${
                                              hasCellError
                                                ? 'border-rose-300 ring-1 ring-rose-200 text-rose-950'
                                                : hasCellWarning
                                                ? 'border-amber-300 ring-1 ring-amber-200 text-amber-950'
                                                : 'border-slate-200/90 hover:border-indigo-300'
                                            }`
                                          : // 2. SCHOOL BOARD THEME
                                          layoutTheme === 'school_board'
                                          ? `p-2.5 rounded-xl border-2 shadow-md min-h-[5rem] text-white ${
                                              hasCellError
                                                ? 'border-rose-400 ring-2 ring-rose-500'
                                                : hasCellWarning
                                                ? 'border-amber-400 ring-2 ring-amber-400'
                                                : 'border-white/25 hover:border-white'
                                            }`
                                          : // 3. COMPACT DENSITY THEME
                                          layoutTheme === 'compact_density'
                                          ? `p-1 rounded-md border text-[10px] min-h-[2.8rem] bg-white ${
                                              hasCellError
                                                ? 'border-rose-300 bg-rose-50 text-rose-950'
                                                : hasCellWarning
                                                ? 'border-amber-300 bg-amber-50 text-amber-950'
                                                : 'border-slate-200 hover:border-indigo-300'
                                            }`
                                          : // 4. CLASSIC TABLE THEME
                                            `p-2.5 rounded-xl border shadow-2xs hover:shadow-xs min-h-[5rem] bg-white ${
                                              hasCellError
                                                ? 'border-rose-300 bg-rose-50 text-rose-950'
                                                : hasCellWarning
                                                ? 'border-amber-300 bg-amber-50 text-amber-950'
                                                : 'border-slate-200 hover:border-indigo-300'
                                            }`
                                      }`}
                                    >
                                      <div>
                                        {/* Top Bar inside cell: Subject Badge + Lock */}
                                        <div className="flex items-center justify-between gap-1 mb-1">
                                          {layoutTheme === 'modern_cards' ? (
                                            /* Modern Cards Subject Badge */
                                            <span
                                              className="text-xs font-extrabold px-2.5 py-0.5 rounded-full text-white truncate max-w-[130px] shadow-2xs"
                                              style={{ backgroundColor: subject?.color || '#3e70d6' }}
                                              title={subject?.name}
                                            >
                                              {subject?.shortName || subject?.name}
                                            </span>
                                          ) : layoutTheme === 'school_board' ? (
                                            /* School Board Subject Title */
                                            <span className="text-xs font-black tracking-wide text-white uppercase drop-shadow-xs truncate max-w-[130px]">
                                              {subject?.shortName || subject?.name}
                                            </span>
                                          ) : layoutTheme === 'compact_density' ? (
                                            /* Compact Mini Tag */
                                            <span
                                              className="text-[9px] font-extrabold px-1.5 py-0.2 rounded text-white truncate max-w-[80px]"
                                              style={{ backgroundColor: subject?.color || '#3e70d6' }}
                                            >
                                              {subject?.shortName || subject?.name}
                                            </span>
                                          ) : (
                                            /* Classic Table Badge */
                                            <span
                                              className="text-xs font-bold px-2 py-0.5 rounded-md text-white truncate max-w-[130px]"
                                              style={{ backgroundColor: subject?.color || '#3e70d6' }}
                                              title={subject?.name}
                                            >
                                              {subject?.shortName || subject?.name}
                                            </span>
                                          )}

                                          <div className="flex items-center gap-1">
                                            {cell.isLocked && (
                                              <span title="Horário fixado/travado">
                                                <Lock
                                                  className={`w-3.5 h-3.5 ${
                                                    layoutTheme === 'school_board'
                                                      ? 'text-amber-300'
                                                      : 'text-amber-600'
                                                  }`}
                                                />
                                              </span>
                                            )}
                                            <GripVertical
                                              className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition ${
                                                layoutTheme === 'school_board'
                                                  ? 'text-white/60'
                                                  : 'text-slate-300 group-hover:text-slate-500'
                                              }`}
                                            />
                                          </div>
                                        </div>

                                        {/* Teacher Info */}
                                        {layoutTheme === 'modern_cards' ? (
                                          /* Modern Cards Teacher with Avatar Initials */
                                          <div className="flex items-center gap-1.5 mt-1.5">
                                            <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[9px] flex items-center justify-center shrink-0 border border-indigo-200">
                                              {getInitials(teacher?.name)}
                                            </div>
                                            <span className="text-xs font-bold text-slate-800 truncate">
                                              {teacher?.shortName || teacher?.name || 'Prof. Não Definido'}
                                            </span>
                                            {subject?.isHeavy && (
                                              <span className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-mono font-bold ml-auto shrink-0">
                                                P
                                              </span>
                                            )}
                                          </div>
                                        ) : layoutTheme === 'school_board' ? (
                                          /* School Board High-Contrast Teacher Pill */
                                          <div className="mt-1 flex items-center justify-between">
                                            <span className="text-[11px] font-bold text-white uppercase bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-xs truncate">
                                              {teacher?.shortName || teacher?.name || 'Prof. N/D'}
                                            </span>
                                            {subject?.isHeavy && (
                                              <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1 rounded ml-1 font-mono">
                                                PESADA
                                              </span>
                                            )}
                                          </div>
                                        ) : layoutTheme === 'compact_density' ? (
                                          /* Compact Density Inline */
                                          <div className="text-[10px] font-semibold text-slate-700 truncate mt-0.5">
                                            {teacher?.shortName || teacher?.name || 'N/D'}
                                          </div>
                                        ) : (
                                          /* Classic Table Teacher */
                                          <div className="text-xs font-medium text-slate-800 flex items-center justify-between mt-1">
                                            <span className="truncate">
                                              {teacher?.shortName || teacher?.name || 'Prof. Não Definido'}
                                            </span>
                                            {subject?.isHeavy && (
                                              <span
                                                className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-mono font-bold"
                                                title="Disciplina Pesada"
                                              >
                                                P
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>

                                      {/* Conflict Notification Bar */}
                                      {cellConflicts.length > 0 && (
                                        <div
                                          className={`mt-1.5 text-[10px] font-semibold p-1 rounded-md flex items-center gap-1 ${
                                            layoutTheme === 'school_board'
                                              ? 'bg-black/60 text-amber-200 border border-amber-400/50'
                                              : hasCellError
                                              ? 'bg-rose-200/80 text-rose-900'
                                              : 'bg-amber-200/80 text-amber-900'
                                          }`}
                                        >
                                          <AlertTriangle className="w-3 h-3 shrink-0" />
                                          <span className="truncate" title={cellConflicts[0].message}>
                                            {cellConflicts[0].ruleName}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    /* EMPTY CELL / DROP TARGET */
                                    <div
                                      onClick={() =>
                                        setSelectedCellToEdit({
                                          day: dayKey,
                                          slotId: slot.id,
                                          classId: cls.id,
                                        })
                                      }
                                      className={`flex-1 flex items-center justify-center cursor-pointer transition ${
                                        layoutTheme === 'modern_cards'
                                          ? 'min-h-[5.5rem] rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-white/80 text-slate-400 text-xs font-semibold'
                                          : layoutTheme === 'school_board'
                                          ? 'min-h-[5rem] rounded-xl border-2 border-dashed border-slate-700 hover:border-amber-400 hover:bg-slate-800 text-slate-400 text-xs font-mono'
                                          : layoutTheme === 'compact_density'
                                          ? 'min-h-[2.8rem] rounded-md border border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 text-slate-300 text-[10px]'
                                          : 'min-h-[5rem] rounded-xl border border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 text-slate-400 text-[11px]'
                                      }`}
                                    >
                                      <span>+ Atribuir</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          })}

                          {/* Tutores em Janela Column */}
                          <td
                            className={`border-r align-top ${
                              layoutTheme === 'school_board'
                                ? 'p-2.5 border-slate-700 bg-slate-900/90'
                                : layoutTheme === 'compact_density'
                                ? 'p-1.5 border-slate-200 bg-amber-50/20'
                                : 'p-2.5 border-slate-200 bg-amber-50/20'
                            }`}
                          >
                            {slotWindowTutors.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {slotWindowTutors.map((tutor) => (
                                  <div
                                    key={tutor.teacherId}
                                    className={`inline-flex items-center gap-1 font-semibold rounded-md shadow-2xs ${
                                      layoutTheme === 'school_board'
                                        ? 'bg-amber-400 text-slate-950 px-2 py-0.5 text-[10px] font-black uppercase'
                                        : layoutTheme === 'compact_density'
                                        ? 'bg-amber-100 text-amber-900 px-1.5 py-0.2 text-[10px] border border-amber-200'
                                        : 'bg-amber-100 text-amber-900 px-2 py-0.5 text-[11px] border border-amber-200'
                                    }`}
                                    title={tutor.reason}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
                                    <span className="truncate">{tutor.teacherName}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span
                                className={`italic ${
                                  layoutTheme === 'school_board'
                                    ? 'text-slate-500 text-[11px] font-mono'
                                    : 'text-slate-400 text-[11px]'
                                }`}
                              >
                                Nenhum tutor livre
                              </span>
                            )}
                          </td>

                          {/* Live Slot Validation Status */}
                          <td className="p-2 text-left align-top hide-on-export">
                            {slotConflicts.length > 0 ? (
                              <div className="space-y-1.5">
                                {slotConflicts.map((conflict, idx) => (
                                  <div
                                    key={idx}
                                    className={`p-1.5 rounded-lg text-[11px] leading-tight font-medium ${
                                      conflict.severity === 'error'
                                        ? 'bg-rose-100 text-rose-900 border border-rose-300'
                                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                                    }`}
                                  >
                                    <div className="font-bold flex items-center gap-1">
                                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                      <span>{conflict.ruleName}</span>
                                    </div>
                                    <div className="text-[10px] mt-0.5 text-slate-800">
                                      {conflict.message}
                                    </div>
                                    {conflict.suggestion && (
                                      <div className="text-[9px] text-slate-600 mt-0.5 italic">
                                        {conflict.suggestion}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                ✨ OK (Sem conflitos)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Single Cell Modal */}
      {selectedCellToEdit && (
        <CellEditModal
          day={selectedCellToEdit.day}
          slotId={selectedCellToEdit.slotId}
          classId={selectedCellToEdit.classId}
          onClose={() => setSelectedCellToEdit(null)}
        />
      )}
    </div>
  );
};

